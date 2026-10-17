"""Repeat the prepared public sample locally; this is not diagnostic evaluation."""

import json
import platform
import subprocess
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path

from speakloop.local_asr import LocalAsrConfig, LocalWhisper, analyze_wav, file_digest


def main() -> None:
    root = Path(".local/feasibility")
    source = json.loads((root / "source.json").read_text("utf-8"))
    if file_digest(root / "jfk.flac") != source["sha256"]:
        raise ValueError("public_source_digest_mismatch")
    config = LocalAsrConfig.model_validate_json((root / "local-asr.json").read_text("utf-8"))
    collector = LocalWhisper(config)
    runs = [analyze_wav(root / "jfk.pcm16.wav", collector) for _ in range(3)]
    if any(run["evidence"] is None for run in runs):
        raise RuntimeError("local_inference_failed; inspect CLI output before reporting success")
    report = {
        "purpose": "local_public_audio_smoke_only",
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "code_base_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True
        ).strip(),
        "analysis_source_sha256": file_digest(Path("src/speakloop/local_asr.py")),
        "python": platform.python_version(),
        "platform": platform.platform(),
        "versions": {name: version(name) for name in ("faster-whisper", "ctranslate2", "av")},
        "source": source,
        "normalized_audio_sha256": file_digest(root / "jfk.pcm16.wav"),
        "config": config.model_dump(mode="json"),
        "runs": runs,
        "diagnosis_gate_passed": False,
        "api_service_spend_usd": 0,
        "personal_audio_used": False,
    }
    destination = Path(".local/reports/local-asr-smoke.json")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "report": str(destination),
                "audio_duration_seconds": runs[0]["audio_quality"]["duration_seconds"],
                "runs": [
                    {
                        "latency_ms": round(run["latency_ms"], 1),
                        "model_load_ms": round(run["evidence"]["model_load_ms"], 1),
                        "inference_ms": round(run["evidence"]["inference_ms"], 1),
                        "word_timing_count": len(run["evidence"]["words"]),
                        "decision": run["decision"],
                    }
                    for run in runs
                ],
                "diagnosis_gate_passed": False,
            }
        )
    )


if __name__ == "__main__":
    main()
