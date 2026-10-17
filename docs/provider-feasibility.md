# Provider feasibility: initial scan

**Checked:** 2026-10-17. **Phase:** 1B preparation; no provider inference comparison has been completed.

## Observed workstation

- Intel Core i9-14900HX, 32 logical processors.
- Approximately 31.7 GiB system RAM.
- NVIDIA RTX 4060 Laptop GPU, 8188 MiB VRAM; NVIDIA driver 616.92.
- Project environment: CPython 3.13.5 managed by uv 0.10.6. System Python is 3.13.9; Node is 22.17.0.

This makes local experiments plausible; it is not evidence of inference speed, compatible CUDA dependencies, or diagnostic accuracy. No GPU model has been loaded yet. Dependencies are isolated in `.venv/`.

## Candidate roles

| Candidate | Evidence it may provide | What remains unproven | Current execution status |
|---|---|---|---|
| Gemini free-tier transcription/audio understanding | Transcript, available timestamps, auxiliary audio reasoning | Phoneme-specific error diagnosis, calibrated confidence, account quota | Not called; no credentials requested or personal audio sent |
| Gemini free-tier TTS | Candidate reference audio from reviewed text | Contrast/dialect consistency and lesson suitability | Not called |
| `facebook/wav2vec2-lv-60-espeak-cv-ft` locally | Predicted phonetic labels and acoustic logits | Localization and calibration on Vietnamese beginner speech; valid-variant behavior | Candidate only; not installed or downloaded |
| `faster-whisper` locally | ASR transcript and optional word timing | A transcript is not pronunciation diagnosis | Optional dependency group declared, not installed or run |

Google documents free access for selected model paths, model/project rate limits, and product-improvement data use on free-tier content. Actual account access and quotas must be checked before calls. Avoid any billing-enabled fallback. [Official pricing](https://ai.google.dev/gemini-api/docs/pricing), [audio capabilities](https://ai.google.dev/gemini-api/docs/audio), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Meta's model card lists Apache-2.0, 16 kHz speech input, and phonetic-label output. That supports an acoustic-evidence experiment; it is not a validated pronunciation assessor. [Official model card](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft).

Faster-whisper documents local CTranslate2 inference, CPU/GPU quantization, and MIT licensing. CPU int8 is a possible starting setup before resolving CUDA dependencies. [Maintainer repository](https://github.com/SYSTRAN/faster-whisper).

## Benchmark data access

L2-ARCTIC includes Vietnamese speakers and a manually annotated subset; its full access flow requests registration and CC BY-NC 4.0 agreement. It is a candidate for noncommercial evaluation, not an unrestricted lesson-audio source. No registration was submitted and no corpus/audio was downloaded. [Corpus owner](https://psi.engr.tamu.edu/l2-arctic-corpus/).

## Next experiment

Acquire appropriately licensed human examples, identify independently reviewed contrast-specific labels, and reserve speaker-disjoint calibration/held-out splits. A small public example may test local inference, but cannot pass the diagnosis gate. Freeze the protocol/manifest/model settings before comparing candidates. Until then the selected diagnostic provider is **none**, and learner-facing specific claims stay disabled.
