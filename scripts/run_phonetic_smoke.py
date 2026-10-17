"""Pinned public-model experiment; use --prepare to explicitly download weights."""

import argparse
import json
import os
from pathlib import Path
from time import perf_counter

from speakloop.local_asr import file_digest
from speakloop.phonetics import collapse_ctc

MODEL = "facebook/wav2vec2-lv-60-espeak-cv-ft"
REVISION = "ae45363bf3413b374fecd9dc8bc1df0e24c3b7f4"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prepare", action="store_true")
    args = parser.parse_args()
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    root = Path(".local/models/wav2vec2-phoneme")
    if args.prepare:
        from huggingface_hub import snapshot_download

        snapshot_download(
            MODEL,
            revision=REVISION,
            local_dir=root,
            token=False,
            allow_patterns=[
                "config.json",
                "preprocessor_config.json",
                "pytorch_model.bin",
                "special_tokens_map.json",
                "tokenizer_config.json",
                "vocab.json",
            ],
        )
    os.environ["HF_HUB_OFFLINE"] = "1"
    import torch
    from faster_whisper.audio import decode_audio
    from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

    torch.set_num_threads(4)
    start = perf_counter()
    extractor = Wav2Vec2FeatureExtractor.from_pretrained(root, local_files_only=True)
    model = Wav2Vec2ForCTC.from_pretrained(root, local_files_only=True, weights_only=True).eval()
    load_ms = (perf_counter() - start) * 1000
    vocab = {v: k for k, v in json.loads((root / "vocab.json").read_text("utf-8")).items()}
    results = []
    for path in (
        Path(".local/feasibility/jfk.pcm16.wav"),
        Path(".local/research/l2-arctic/lxc_arctic_a0018.wav"),
    ):
        if not path.is_file():
            continue
        signal = decode_audio(str(path), sampling_rate=16000)
        inputs = extractor(signal, sampling_rate=16000, return_tensors="pt")
        start = perf_counter()
        with torch.inference_mode():
            logits = model(**inputs).logits[0]
        labels = collapse_ctc(logits.argmax(-1).tolist(), vocab)
        results.append(
            {
                "sample": path.name,
                "sample_sha256": file_digest(path),
                "duration_seconds": len(signal) / 16000,
                "inference_ms": round((perf_counter() - start) * 1000, 2),
                "labels": labels,
                "decision": "abstain",
                "reason": "phonetic_evidence_not_calibrated",
            }
        )
    report = {
        "purpose": "public_phonetic_smoke_not_diagnostic_validation",
        "model": MODEL,
        "revision": REVISION,
        "weights_sha256": file_digest(root / "pytorch_model.bin"),
        "torch_version": torch.__version__,
        "device": "cpu",
        "load_ms": load_ms,
        "cuda_tested": False,
        "runs": results,
        "diagnosis_ready": False,
    }
    output = Path(".local/reports/phonetic-smoke.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=True))


if __name__ == "__main__":
    main()
