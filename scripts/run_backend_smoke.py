"""Exercise localhost API with off-prompt public speech; no diagnostic/learning claim."""

import json
import tempfile
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from speakloop.server import ROOT, create_app


def main():
    audio = (ROOT / ".local/feasibility/jfk.pcm16.wav").read_bytes()
    with tempfile.TemporaryDirectory(prefix="speakloop-api-smoke-") as directory:
        app = create_app(
            data_dir=Path(directory),
            audio_dir=ROOT / ".local/lesson-audio",
            asr_config=ROOT / ".local/feasibility/local-asr.json",
        )
        with TestClient(app) as client:
            health = client.get("/api/health").json()
            session = client.post("/api/sessions", json={"mode": "practice"}).json()
            for _ in range(8):
                response = client.post(
                    f"/api/sessions/{session['id']}/answers",
                    json={
                        "trial_id": session["trial"]["id"],
                        "option_id": session["trial"]["options"][0]["id"],
                    },
                )
                response.raise_for_status()
                session = response.json()["session"]
            results = []
            for _ in range(4):
                response = client.post(
                    f"/api/sessions/{session['id']}/recordings",
                    data={
                        "prompt_id": session["prompt"]["id"],
                        "attempt_id": str(uuid4()),
                    },
                    files={"file": ("public-smoke.wav", audio, "audio/wav")},
                )
                response.raise_for_status()
                result = response.json()
                results.append(
                    {
                        "decision": result["decision"],
                        "transcript_present": bool(result["transcript"]),
                        "latency_ms": round(result["latency_ms"], 2),
                    }
                )
                response = client.post(
                    f"/api/sessions/{session['id']}/advance",
                    json={"prompt_id": session["prompt"]["id"]},
                )
                response.raise_for_status()
                session = response.json()
            report = {
                "purpose": "public_off_prompt_audio_API_plumbing_only",
                "health": health,
                "listening_trials": 8,
                "production_requests": results,
                "final_phase": session["phase"],
                "review_scheduled": bool(session["review_due_at"]),
                "temporary_audio_cleaned": not list(app.state.runtime.temp_dir.iterdir()),
                "api_service_spend_usd": 0,
                "personal_audio_used": False,
                "limitations": [
                    "Not evidence of pronunciation accuracy or learning efficacy",
                    "Reference clips are machine-generated and unreviewed",
                ],
            }
    destination = ROOT / "docs/evidence/backend-smoke.json"
    destination.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
