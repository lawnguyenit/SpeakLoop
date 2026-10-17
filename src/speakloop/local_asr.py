"""Local ASR evidence and an app-owned abstention policy, without hosted inference."""

import hashlib
from importlib.metadata import version
from pathlib import Path
from time import perf_counter
from typing import Annotated, Literal, Protocol

from pydantic import Field

from speakloop.audio import inspect_wav
from speakloop.contracts import Contract, Probability, Text

Digest = Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


class LocalAsrConfig(Contract):
    model_directory: Text
    model_revision: Annotated[str, Field(pattern=r"^[0-9a-f]{40}$")]
    expected_model_sha256: Digest
    device: Literal["cpu"] = "cpu"
    compute_type: Literal["int8"] = "int8"
    cpu_threads: Annotated[int, Field(ge=1, le=16)] = 4


class WordEvidence(Contract):
    text: Text
    start_seconds: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    end_seconds: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    raw_asr_probability: Probability


class AsrEvidence(Contract):
    evidence_kind: Literal["asr_only"] = "asr_only"
    provider_version: Text
    model_revision: Text
    model_sha256: Digest
    transcript: str
    words: list[WordEvidence]
    calibrated_confidence: None = None
    model_load_ms: Annotated[float, Field(ge=0, allow_inf_nan=False)]
    inference_ms: Annotated[float, Field(ge=0, allow_inf_nan=False)]


class EvidenceCollector(Protocol):
    def collect(self, path: Path) -> AsrEvidence: ...


class LocalWhisper:
    """Read an explicitly prepared snapshot; never download in an analysis call."""

    def __init__(self, config: LocalAsrConfig):
        self.config = config
        directory = Path(config.model_directory).resolve()
        for filename in ("model.bin", "config.json", "tokenizer.json", "vocabulary.txt"):
            if not (directory / filename).is_file():
                raise ValueError("local_model_missing: run scripts/prepare_local_asr.py first")
        if file_digest(directory / "model.bin") != config.expected_model_sha256:
            raise ValueError("local_model_digest_mismatch")
        self.directory = directory
        self._model = None

    def collect(self, path: Path) -> AsrEvidence:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise ValueError("local_asr_not_installed: run uv sync --group asr") from None
        load_ms = 0.0
        if self._model is None:
            start = perf_counter()
            self._model = WhisperModel(
                str(self.directory),
                device=self.config.device,
                compute_type=self.config.compute_type,
                cpu_threads=self.config.cpu_threads,
                num_workers=1,
                local_files_only=True,
            )
            load_ms = (perf_counter() - start) * 1000
        start = perf_counter()
        segments, _ = self._model.transcribe(
            str(path),
            language="en",
            beam_size=1,
            temperature=0,
            word_timestamps=True,
            vad_filter=False,
            condition_on_previous_text=False,
        )
        segments = list(segments)  # Inference is lazy; timing must include iteration.
        words = [
            WordEvidence(
                text=word.word.strip(),
                start_seconds=word.start,
                end_seconds=word.end,
                raw_asr_probability=word.probability,
            )
            for segment in segments
            for word in segment.words or []
            if word.word.strip()
        ]
        return AsrEvidence(
            provider_version=f"faster-whisper/{version('faster-whisper')}:tiny.en",
            model_revision=self.config.model_revision,
            model_sha256=self.config.expected_model_sha256,
            transcript="".join(s.text for s in segments).strip(),
            words=words,
            model_load_ms=load_ms,
            inference_ms=(perf_counter() - start) * 1000,
        )


def analyze_wav(path: Path, collector: EvidenceCollector) -> dict:
    """App policy: physically bad audio retries; ASR evidence never diagnoses a vowel."""
    start = perf_counter()
    quality = inspect_wav(path)
    result = {
        "policy_version": "asr-abstention-v1",
        "audio_quality": quality,
        "evidence": None,
        "decision": "invalid_audio" if quality["status"] == "invalid" else "abstain",
        "reason": quality["reason"],
        "calibrated_confidence": None,
        "diagnosis_ready": False,
    }
    if quality["status"] != "invalid":
        result["audio_sha256"] = file_digest(path)
        try:
            result["evidence"] = collector.collect(path).model_dump(mode="json")
            result["reason"] = "asr_is_not_pronunciation_assessment"
        except Exception as exc:
            # Local developer result contains a type, not raw speech/private text.
            result["reason"] = "local_provider_error"
            result["technical_error_type"] = type(exc).__name__
    result["latency_ms"] = (perf_counter() - start) * 1000
    return result
