"""Explicit, zero-fee download of a public test sample and a pinned local model.

No personal recordings or credentials are read. This is preparation, not inference.
Run from the repository root with: uv run --group asr python scripts/prepare_local_asr.py
"""

import json
import os
import wave
from pathlib import Path
from urllib.request import urlopen

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

from huggingface_hub import snapshot_download  # noqa: E402

from speakloop.local_asr import LocalAsrConfig, file_digest  # noqa: E402

SAMPLE_URL = "https://raw.githubusercontent.com/SYSTRAN/faster-whisper/master/tests/data/jfk.flac"
SAMPLE_SHA256 = "63a4b1e4c1dc655ac70961ffbf518acd249df237e5a0152faae9a4a836949715"
MODEL = "Systran/faster-whisper-tiny.en"
REVISION = "0d3d19a32d3338f10357c0889762bd8d64bbdeba"


def main() -> None:
    from faster_whisper.audio import decode_audio

    root = Path(".local/feasibility")
    root.mkdir(parents=True, exist_ok=True)
    sample = root / "jfk.flac"
    if not sample.is_file() or file_digest(sample) != SAMPLE_SHA256:
        with urlopen(SAMPLE_URL, timeout=30) as response:
            data = response.read(2 * 1024 * 1024 + 1)
        if len(data) > 2 * 1024 * 1024:
            raise ValueError("unexpected_public_sample_size")
        import hashlib

        if hashlib.sha256(data).hexdigest() != SAMPLE_SHA256:
            raise ValueError("public_sample_digest_changed; review source before updating")
        sample.write_bytes(data)
    snapshot_download(
        MODEL,
        revision=REVISION,
        local_dir=".local/models/whisper-tiny.en",
        allow_patterns=["config.json", "model.bin", "tokenizer.json", "vocabulary.txt"],
        token=False,
        max_workers=2,
    )
    config = LocalAsrConfig(
        model_directory=".local/models/whisper-tiny.en",
        model_revision=REVISION,
        expected_model_sha256=file_digest(Path(".local/models/whisper-tiny.en/model.bin")),
    )
    (root / "local-asr.json").write_text(config.model_dump_json(indent=2) + "\n", encoding="utf-8")
    signal = decode_audio(str(sample), sampling_rate=16000)
    with wave.open(str(root / "jfk.pcm16.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes((signal.clip(-1, 0.999969) * 32768).astype("<i2").tobytes())
    (root / "source.json").write_text(
        json.dumps(
            {
                "purpose": "public ASR smoke test; no diagnostic labels",
                "url": SAMPLE_URL,
                "sha256": SAMPLE_SHA256,
                "repository_license": "MIT; see SYSTRAN/faster-whisper/LICENSE",
                "model": MODEL,
                "revision": REVISION,
                "cloud_audio_upload": False,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("Prepared pinned local model, public sample and .local/feasibility/local-asr.json")


if __name__ == "__main__":
    main()
