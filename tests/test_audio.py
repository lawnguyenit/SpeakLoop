import math
import struct
import wave

from speakloop.audio import inspect_wav


def write_wav(path, samples, rate=16000, channels=1):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(struct.pack(f"<{len(samples)}h", *samples))


def test_silence_clipping_and_short_recordings_are_invalid(tmp_path):
    for name, samples, reason in (
        ("silence", [0] * 16000, "too_quiet_or_silent"),
        ("clipping", [32767] * 16000, "excessive_clipping"),
        ("short", [1000] * 100, "invalid_duration"),
    ):
        path = tmp_path / f"{name}.wav"
        write_wav(path, samples)
        assert inspect_wav(path)["reason"] == reason
        assert inspect_wav(path)["status"] == "invalid"


def test_audible_tone_cannot_be_mistaken_for_valid_speech(tmp_path):
    path = tmp_path / "tone.wav"
    write_wav(path, [int(8000 * math.sin(2 * math.pi * 440 * i / 16000)) for i in range(16000)])
    result = inspect_wav(path)
    assert result["status"] == "needs_speech_check"
    assert result["speech_detected"] is None
    assert result["snr_db"] is None


def test_missing_malformed_truncated_and_stereo_audio(tmp_path):
    path = tmp_path / "bad.wav"
    assert inspect_wav(path)["reason"] == "unreadable_wav"
    path.write_bytes(b"not a wav")
    assert inspect_wav(path)["reason"] == "unreadable_wav"
    write_wav(path, [1000] * 16000)
    path.write_bytes(path.read_bytes()[:-200])
    assert inspect_wav(path)["reason"] == "truncated_audio"
    write_wav(path, [1000] * 32000, channels=2)
    assert inspect_wav(path)["reason"] == "require_pcm16_mono"
