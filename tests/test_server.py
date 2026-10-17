import io
import json
import math
import sqlite3
import struct
import wave
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from speakloop.server import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(data_dir=tmp_path)) as value:
        yield value


def wav_bytes(silent=False):
    output = io.BytesIO()
    samples = [
        0 if silent else int(8000 * math.sin(2 * math.pi * 440 * i / 16000)) for i in range(16000)
    ]
    with wave.open(output, "wb") as recording:
        recording.setnchannels(1)
        recording.setsampwidth(2)
        recording.setframerate(16000)
        recording.writeframes(struct.pack("<16000h", *samples))
    return output.getvalue()


def get_answer(client, session_id, index):
    store = client.app.state.runtime.store
    with store.transaction() as db:
        row = db.execute("SELECT trials_json FROM sessions WHERE id=?", (session_id,)).fetchone()
        return json.loads(row[0])[index]["correct_option_id"]


def finish_listening(client, mode="practice"):
    session = client.post("/api/sessions", json={"mode": mode, "language": "vi"}).json()
    for index in range(8):
        response = client.post(
            f"/api/sessions/{session['id']}/answers",
            json={
                "trial_id": session["trial"]["id"],
                "option_id": get_answer(client, session["id"], index),
            },
        )
        assert response.status_code == 200
        session = response.json()["session"]
    return session


def submit_recording(client, session, audio=None, attempt_id=None):
    return client.post(
        f"/api/sessions/{session['id']}/recordings",
        data={"prompt_id": session["prompt"]["id"], "attempt_id": attempt_id or str(uuid4())},
        files={"file": ("recording.wav", wav_bytes() if audio is None else audio, "audio/wav")},
    )


def test_full_session_persists_and_schedules_review_without_claiming_production_success(client):
    session = finish_listening(client)
    assert session["phase"] == "word"
    assert session["perception"]["correct"] == 8
    for expected_phase in ["word", "word", "sentence", "sentence"]:
        assert session["phase"] == expected_phase
        attempt = submit_recording(client, session)
        assert attempt.status_code == 200
        assert attempt.json()["decision"] == "abstain"
        assert not attempt.json()["diagnosis_ready"]
        response = client.post(
            f"/api/sessions/{session['id']}/advance", json={"prompt_id": session["prompt"]["id"]}
        )
        assert response.status_code == 200
        session = response.json()
    assert session["phase"] == "complete"
    due = datetime.fromisoformat(session["review_due_at"])
    assert 6.9 < (due - datetime.now(timezone.utc)).total_seconds() / 86400 < 7.1
    assert client.get(f"/api/sessions/{session['id']}").json() == session
    progress = client.get("/api/progress").json()
    assert progress["sessions_completed"] == 1
    assert progress["production"]["attempts"] == 4
    assert not progress["production"]["diagnosis_ready"]
    assert list(client.app.state.runtime.temp_dir.iterdir()) == []


def test_baseline_scores_are_hidden_until_completion_and_not_leaked_via_progress(client):
    session = finish_listening(client, "baseline")
    assert session["perception"]["correct"] is None
    progress = client.get("/api/progress").json()
    assert progress["perception"]["total"] == 0
    assert progress["sessions"][0]["perception"]["correct"] is None


def test_answer_retry_is_idempotent_and_conflicts_do_not_advance(client):
    session = client.post("/api/sessions", json={"mode": "practice"}).json()
    url = f"/api/sessions/{session['id']}/answers"
    body = {"trial_id": session["trial"]["id"], "option_id": session["trial"]["options"][0]["id"]}
    first = client.post(url, json=body).json()
    assert client.post(url, json=body).json() == first
    assert first["session"]["current"] == 2
    body["option_id"] = session["trial"]["options"][1]["id"]
    assert client.post(url, json=body).status_code == 409
    assert client.get(f"/api/sessions/{session['id']}").json()["current"] == 2


def test_invalid_audio_does_not_unlock_advance_and_temp_files_are_removed(client):
    session = finish_listening(client)
    invalid = submit_recording(client, session, audio=wav_bytes(silent=True))
    assert invalid.json()["decision"] == "invalid_audio"
    assert (
        client.post(
            f"/api/sessions/{session['id']}/advance", json={"prompt_id": session["prompt"]["id"]}
        ).status_code
        == 409
    )
    assert list(client.app.state.runtime.temp_dir.iterdir()) == []


def test_attempt_identity_is_checked_and_safe_result_can_be_retried_after_advance(client):
    session = finish_listening(client)
    attempt_id = str(uuid4())
    first = submit_recording(client, session, attempt_id=attempt_id)
    assert first.status_code == 200
    client.post(
        f"/api/sessions/{session['id']}/advance", json={"prompt_id": session["prompt"]["id"]}
    )
    assert submit_recording(client, session, attempt_id=attempt_id).status_code == 200
    assert (
        submit_recording(client, session, audio=b"different", attempt_id=attempt_id).status_code
        == 409
    )


def test_raw_transcript_is_not_persisted(client, monkeypatch):
    session = finish_listening(client)
    runtime = client.app.state.runtime
    monkeypatch.setattr(
        runtime,
        "analyze",
        lambda path: {
            "decision": "abstain",
            "reason": "test",
            "feedback": {"vi": "test", "en": "test"},
            "audio_quality": {},
            "transcript": "PRIVATE TEST TEXT",
            "latency_ms": 1,
            "diagnosis_ready": False,
        },
    )
    assert submit_recording(client, session).json()["transcript"] == "PRIVATE TEST TEXT"
    with sqlite3.connect(runtime.store.path) as db:
        saved = db.execute("SELECT result_json FROM attempts").fetchone()[0]
    assert "PRIVATE TEST TEXT" not in saved


def test_preferences_persist_across_app_restarts(tmp_path):
    with TestClient(create_app(data_dir=tmp_path)) as first:
        assert first.put("/api/settings", json={"language": "en"}).json() == {"language": "en"}
    with TestClient(create_app(data_dir=tmp_path)) as second:
        assert second.get("/api/settings").json() == {"language": "en"}


def test_production_resume_preserves_advance_eligibility_without_storing_audio(client):
    session = finish_listening(client)
    assert not session["can_advance"]
    assert submit_recording(client, session).status_code == 200
    root = client.app.state.runtime.store.path.parent
    with TestClient(create_app(data_dir=root)) as resumed:
        current = resumed.get(f"/api/sessions/{session['id']}").json()
        assert current["can_advance"]
        response = resumed.post(
            f"/api/sessions/{session['id']}/advance", json={"prompt_id": current["prompt"]["id"]}
        )
        assert response.status_code == 200
        assert not response.json()["can_advance"]
    assert list(client.app.state.runtime.temp_dir.iterdir()) == []


def test_invalid_inputs_origins_and_unknown_assets_return_safe_errors(client):
    assert client.post("/api/sessions", json={"mode": "other"}).status_code == 422
    assert (
        client.post(
            "/api/sessions",
            json={"mode": "practice"},
            headers={"Origin": "https://unrelated.example"},
        ).status_code
        == 403
    )
    assert client.get(f"/api/sessions/{uuid4()}").status_code == 404
    assert client.get("/api/audio/nonexistent.wav").status_code == 404
    assert client.get("/api/audio/zira-ship.wav").status_code == 503
    assert client.get("/api/unknown").json()["error"]["request_id"]


def test_oversized_upload_rejected_before_parsing(client):
    result = client.post(
        "/api/sessions", content=b"x", headers={"Content-Length": str(11 * 1024 * 1024)}
    )
    assert result.status_code == 413
