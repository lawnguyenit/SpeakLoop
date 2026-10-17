import math
import struct
import wave

import pytest

from speakloop.local_asr import (
    AsrEvidence,
    LocalAsrConfig,
    LocalWhisper,
    WordEvidence,
    analyze_wav,
)


def write_signal(path, silence=False):
    samples = [
        0 if silence else int(8000 * math.sin(2 * math.pi * 440 * i / 16000)) for i in range(16000)
    ]
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(16000)
        output.writeframes(struct.pack(f"<{len(samples)}h", *samples))


class FakeCollector:
    def __init__(self, fail=False):
        self.calls = 0
        self.fail = fail

    def collect(self, path):
        self.calls += 1
        if self.fail:
            raise RuntimeError("private transcript must not appear in safe result")
        return AsrEvidence(
            provider_version="fixture-only",
            model_revision="a" * 40,
            model_sha256="b" * 64,
            transcript="ship",
            words=[
                WordEvidence(
                    text="ship", start_seconds=0, end_seconds=0.5, raw_asr_probability=0.9999
                )
            ],
            model_load_ms=0,
            inference_ms=1,
        )


def test_invalid_audio_does_not_reach_provider(tmp_path):
    path = tmp_path / "silence.wav"
    write_signal(path, silence=True)
    collector = FakeCollector()
    result = analyze_wav(path, collector)
    assert result["decision"] == "invalid_audio"
    assert result["evidence"] is None
    assert collector.calls == 0


def test_high_asr_probability_cannot_become_pronunciation_confidence(tmp_path):
    path = tmp_path / "tone.wav"
    write_signal(path)
    result = analyze_wav(path, FakeCollector())
    assert result["decision"] == "abstain"
    assert result["calibrated_confidence"] is None
    assert result["evidence"]["calibrated_confidence"] is None
    assert result["evidence"]["words"][0]["raw_asr_probability"] > 0.99
    assert not result["diagnosis_ready"]
    assert result["audio_quality"]["status"] == "needs_speech_check"


def test_provider_failure_is_explicit_and_does_not_expose_exception_text(tmp_path):
    path = tmp_path / "tone.wav"
    write_signal(path)
    result = analyze_wav(path, FakeCollector(fail=True))
    assert result["decision"] == "abstain"
    assert result["reason"] == "local_provider_error"
    assert result["technical_error_type"] == "RuntimeError"
    assert "private transcript" not in str(result)


def test_missing_or_changed_local_weights_fail_without_downloading(tmp_path):
    config = LocalAsrConfig(
        model_directory=str(tmp_path), model_revision="a" * 40, expected_model_sha256="b" * 64
    )
    with pytest.raises(ValueError, match="local_model_missing"):
        LocalWhisper(config)
    for name in ("model.bin", "config.json", "tokenizer.json", "vocabulary.txt"):
        (tmp_path / name).write_bytes(b"not-a-real-model")
    with pytest.raises(ValueError, match="digest_mismatch"):
        LocalWhisper(config)


def test_optional_asr_decoder_can_read_wav_with_locked_av_version(tmp_path):
    pytest.importorskip("faster_whisper")
    from faster_whisper.audio import decode_audio

    path = tmp_path / "silence.wav"
    write_signal(path, silence=True)
    decoded = decode_audio(str(path), sampling_rate=16000)
    assert len(decoded) == 16000
    assert float(abs(decoded).max()) == 0
