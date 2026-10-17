"""Physical WAV checks only. Passing them does not prove that speech is valid."""

import math
import sys
import wave
from array import array
from pathlib import Path


def inspect_wav(path: Path) -> dict:
    result: dict = {"status": "invalid", "reason": None, "speech_detected": None, "snr_db": None}
    try:
        if path.stat().st_size > 10 * 1024 * 1024:
            return result | {"reason": "file_too_large"}
        with wave.open(str(path), "rb") as recording:
            if recording.getsampwidth() != 2 or recording.getnchannels() != 1:
                return result | {"reason": "require_pcm16_mono"}
            if recording.getcomptype() != "NONE":
                return result | {"reason": "compressed_wav_unsupported"}
            rate = recording.getframerate()
            if rate < 16000 or rate > 48000:
                return result | {"reason": "unsupported_sample_rate"}
            frames = recording.getnframes()
            duration = frames / rate
            result["duration_seconds"] = duration
            if duration < 0.25 or duration > 15:
                return result | {"reason": "invalid_duration"}
            raw = recording.readframes(frames)
            if len(raw) != frames * 2:
                return result | {"reason": "truncated_audio"}
    except (OSError, EOFError, wave.Error, ValueError):
        return result | {"reason": "unreadable_wav"}
    samples = array("h", raw)
    if sys.byteorder != "little":
        samples.byteswap()
    rms = math.sqrt(sum(sample * sample for sample in samples) / len(samples)) / 32768
    clipped = sum(abs(sample) >= 32604 for sample in samples) / len(samples)
    # Null represents digital silence; avoid non-standard JSON -Infinity.
    result["rms_dbfs"] = 20 * math.log10(rms) if rms else None
    result["clipped_fraction"] = clipped
    if rms < 10 ** (-45 / 20):
        return result | {"reason": "too_quiet_or_silent"}
    if clipped > 0.02:
        return result | {"reason": "excessive_clipping"}
    return result | {"status": "needs_speech_check", "reason": "speech_and_noise_not_assessed"}
