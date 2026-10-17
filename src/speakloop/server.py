"""Loopback-only private alpha: listening scores, ephemeral audio and honest abstention."""

import hashlib
import importlib.util
import os
import tempfile
import threading
from pathlib import Path
from time import perf_counter
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware

from speakloop.audio import inspect_wav
from speakloop.contracts import Contract, Text
from speakloop.lesson import audio_registry, lesson_view
from speakloop.store import ActivityError, Store

ROOT = Path(__file__).resolve().parents[2]
MAX_AUDIO_BYTES = 10 * 1024 * 1024
ORIGINS = {
    "http://127.0.0.1:8765",
    "http://localhost:8765",
    "http://127.0.0.1:5178",
    "http://localhost:5178",
}


class StartSession(Contract):
    mode: Literal["baseline", "practice", "review"]
    language: Literal["vi", "en"] = "vi"


class Settings(Contract):
    language: Literal["vi", "en"]


class Answer(Contract):
    trial_id: Text
    option_id: Text


class Advance(Contract):
    prompt_id: Text


class Runtime:
    def __init__(self, data_dir: Path, audio_dir: Path, asr_config: Path | None):
        self.store = Store(data_dir / "speakloop.sqlite3")
        self.audio_dir = audio_dir
        self.temp_dir = data_dir / "tmp"
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.asr_config = asr_config
        self.collector = None
        self.analysis_lock = threading.Lock()

    def asr_available(self):
        return bool(
            self.asr_config
            and self.asr_config.is_file()
            and importlib.util.find_spec("faster_whisper")
        )

    def analyze(self, path: Path) -> dict:
        start = perf_counter()
        quality = inspect_wav(path)
        result = {
            "decision": "invalid_audio" if quality["status"] == "invalid" else "abstain",
            "reason": quality["reason"],
            "audio_quality": quality,
            "transcript": None,
            "diagnosis_ready": False,
        }
        if quality["status"] != "invalid":
            result["reason"] = "self_comparison_only"
            if self.asr_available():
                try:
                    from speakloop.local_asr import LocalAsrConfig, LocalWhisper, analyze_wav

                    with self.analysis_lock:
                        if self.collector is None:
                            config = LocalAsrConfig.model_validate_json(
                                self.asr_config.read_text("utf-8")
                            )
                            self.collector = LocalWhisper(config)
                        analysis = analyze_wav(path, self.collector)
                    result["reason"] = analysis["reason"]
                    if analysis["evidence"]:
                        result["transcript"] = analysis["evidence"]["transcript"]
                except Exception:
                    result["reason"] = "local_provider_error"
        invalid = result["decision"] == "invalid_audio"
        result["feedback"] = {
            "vi": (
                "Bản thu chưa đủ rõ. Kiểm tra micro, nói gần hơn và thử lại."
                if invalid
                else (
                    "Đã nhận bản thu. Hãy nghe lại và so sánh với mẫu; "
                    "hệ thống chưa đủ bằng chứng để kết luận âm đúng hay sai."
                )
            ),
            "en": (
                "The recording could not be assessed. Check your microphone and try again."
                if invalid
                else (
                    "Recording received. Replay and compare with the model; "
                    "there is not enough evidence to judge this vowel."
                )
            ),
        }
        result["latency_ms"] = (perf_counter() - start) * 1000
        return result


def create_app(
    data_dir: Path | None = None,
    audio_dir: Path | None = None,
    asr_config: Path | None = None,
) -> FastAPI:
    data_dir = data_dir or ROOT / ".local"
    runtime = Runtime(data_dir, audio_dir or data_dir / "lesson-audio", asr_config)
    app = FastAPI(title="SpeakLoop local alpha", version="0.2.0", debug=False)
    app.state.runtime = runtime
    app.add_middleware(
        TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"]
    )

    def error(request, status, code):
        messages = {
            "recording_required": {
                "vi": "Hãy ghi âm một lượt đủ rõ trước khi sang bước tiếp theo.",
                "en": "Record one clear attempt before moving on.",
            },
            "activity_changed": {
                "vi": "Bài học đã chuyển bước. Mở lại phiên học để tiếp tục đúng vị trí.",
                "en": "The lesson has moved on. Reopen the session to continue.",
            },
            "reference_audio_unavailable": {
                "vi": "Giọng mẫu chưa sẵn sàng. Hãy thử lại sau.",
                "en": "The reference audio is not available yet. Please try again later.",
            },
            "recording_too_large": {
                "vi": "Bản thu quá lớn. Hãy thu một đoạn ngắn, tối đa 15 giây.",
                "en": "The recording is too large. Please record at most 15 seconds.",
            },
        }
        return JSONResponse(
            status_code=status,
            content={
                "error": {
                    "code": code,
                    "message": messages.get(
                        code,
                        {
                            "vi": "Không thể thực hiện bước này. Thử lại hoặc mở lại bài học.",
                            "en": "This step could not be completed. Retry or reopen the lesson.",
                        },
                    ),
                    "request_id": getattr(request.state, "request_id", uuid4().hex),
                }
            },
        )

    @app.middleware("http")
    async def local_request_guard(request: Request, call_next):
        request.state.request_id = uuid4().hex
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin and origin not in ORIGINS:
                return error(request, 403, "origin_not_allowed")
        try:
            declared = int(request.headers.get("content-length", "0"))
        except ValueError:
            return error(request, 400, "invalid_content_length")
        if declared > MAX_AUDIO_BYTES + 65536:
            return error(request, 413, "recording_too_large")
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(ActivityError)
    async def activity_error(request: Request, exc: ActivityError):
        return error(request, exc.status, exc.code)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        return error(request, 422, "invalid_request")

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return error(request, exc.status_code, f"http_{exc.status_code}")

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        return error(request, 500, "internal_error")

    @app.get("/api/health")
    def health():
        return {
            "status": "ok",
            "diagnosis_ready": False,
            "reference_audio_ready": all(
                (runtime.audio_dir / f"{key}.wav").is_file() for key in audio_registry()
            ),
            "reference_audio_reviewed": False,
            "local_asr_available": runtime.asr_available(),
        }

    @app.get("/api/lesson")
    def lesson():
        return lesson_view()

    @app.get("/api/settings")
    def get_settings():
        return runtime.store.settings()

    @app.put("/api/settings")
    def set_settings(body: Settings):
        return runtime.store.settings(body.language)

    @app.post("/api/sessions")
    def start_session(body: StartSession):
        return runtime.store.start(body.mode, body.language)

    @app.get("/api/sessions/{session_id}")
    def get_session(session_id: UUID):
        return runtime.store.get(str(session_id))

    @app.post("/api/sessions/{session_id}/answers")
    def answer(session_id: UUID, body: Answer):
        return runtime.store.answer(str(session_id), body.trial_id, body.option_id)

    @app.post("/api/sessions/{session_id}/advance")
    def advance(session_id: UUID, body: Advance):
        return runtime.store.advance(str(session_id), body.prompt_id)

    @app.post("/api/sessions/{session_id}/recordings")
    async def recording(
        session_id: UUID,
        file: Annotated[UploadFile, File()],
        prompt_id: Annotated[str, Form(max_length=80)],
        attempt_id: Annotated[UUID, Form()],
    ):
        try:
            audio = await file.read(MAX_AUDIO_BYTES + 1)
        finally:
            await file.close()
        if len(audio) > MAX_AUDIO_BYTES:
            raise ActivityError("recording_too_large", 413)
        session_id, attempt_id = str(session_id), str(attempt_id)
        digest = hashlib.sha256(audio).hexdigest()
        cached = await run_in_threadpool(
            runtime.store.cached_attempt, session_id, attempt_id, prompt_id, digest
        )
        if cached is not None:
            return cached
        await run_in_threadpool(runtime.store.check_prompt, session_id, prompt_id)
        with tempfile.TemporaryDirectory(prefix="take-", dir=runtime.temp_dir) as folder:
            path = Path(folder) / "recording.wav"
            path.write_bytes(audio)
            result = await run_in_threadpool(runtime.analyze, path)
        result["attempt_id"] = attempt_id
        return await run_in_threadpool(
            runtime.store.record, session_id, attempt_id, prompt_id, digest, result
        )

    @app.get("/api/progress")
    def progress():
        return runtime.store.progress()

    @app.get("/api/audio/{token_id}.wav")
    def reference_audio(token_id: str):
        if token_id not in audio_registry():
            raise ActivityError("audio_not_found", 404)
        path = runtime.audio_dir / f"{token_id}.wav"
        if not path.is_file():
            raise ActivityError("reference_audio_unavailable", 503)
        return FileResponse(path, media_type="audio/wav")

    @app.get("/api/{unknown:path}")
    def unknown_api(unknown: str):
        raise ActivityError("endpoint_not_found", 404)

    build = ROOT / "frontend" / "dist"
    if build.is_dir():
        app.mount("/", StaticFiles(directory=build, html=True), name="frontend")
    else:

        @app.get("/")
        def setup_status():
            return {"status": "backend_ready", "frontend": "Run npm run build in frontend/"}

    return app


app = create_app(
    data_dir=Path(os.environ.get("SPEAKLOOP_DATA_DIR", str(ROOT / ".local"))),
    audio_dir=ROOT / ".local/lesson-audio",
    asr_config=ROOT / ".local/feasibility/local-asr.json",
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("speakloop.server:app", host="127.0.0.1", port=8765)
