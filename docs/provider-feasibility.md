# Provider feasibility: initial scan

**Checked:** 2026-10-17. **Phase:** 1B.1 CPU ASR smoke completed; diagnostic provider comparison remains pending.

## Observed workstation

- Intel Core i9-14900HX, 32 logical processors.
- Approximately 31.7 GiB system RAM.
- NVIDIA RTX 4060 Laptop GPU, 8188 MiB VRAM; NVIDIA driver 616.92.
- Project environment: CPython 3.13.5 managed by uv 0.10.6. System Python is 3.13.9; Node is 22.17.0.

CPU inference has now been exercised; CUDA/GPU inference and diagnostic accuracy remain unverified. Dependencies are isolated in `.venv/`.

## Candidate roles

| Candidate | Evidence it may provide | What remains unproven | Current execution status |
|---|---|---|---|
| Gemini free-tier transcription/audio understanding | Transcript, available timestamps, auxiliary audio reasoning | Phoneme-specific error diagnosis, calibrated confidence, account quota | Not called; no credentials requested or personal audio sent |
| Gemini free-tier TTS | Candidate reference audio from reviewed text | Contrast/dialect consistency and lesson suitability | Not called |
| `facebook/wav2vec2-lv-60-espeak-cv-ft` locally | Predicted phonetic labels and acoustic logits | Localization and calibration on Vietnamese beginner speech; valid-variant behavior | Pinned CPU snapshot ran on two public clips; not eligible for learner diagnosis |
| `faster-whisper` locally | ASR transcript and optional word timing | A transcript is not pronunciation diagnosis | tiny.en CPU/int8 snapshot tested, including offline mode; app decision remains abstain |

Google documents free access for selected model paths, model/project rate limits, and product-improvement data use on free-tier content. Actual account access and quotas must be checked before calls. Avoid any billing-enabled fallback. [Official pricing](https://ai.google.dev/gemini-api/docs/pricing), [audio capabilities](https://ai.google.dev/gemini-api/docs/audio), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

Meta's model card lists Apache-2.0, 16 kHz speech input, and phonetic-label output. That supports an acoustic-evidence experiment; it is not a validated pronunciation assessor. [Official model card](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft).

Faster-whisper documents local CTranslate2 inference, CPU/GPU quantization, and MIT licensing. CPU int8 is a possible starting setup before resolving CUDA dependencies. [Maintainer repository](https://github.com/SYSTRAN/faster-whisper).

## Benchmark data access

L2-ARCTIC includes Vietnamese speakers and a manually annotated subset; its full access flow requests registration and CC BY-NC 4.0 agreement. It is a candidate for noncommercial evaluation, not an unrestricted lesson-audio source. No registration was submitted and no corpus/audio was downloaded. [Corpus owner](https://psi.engr.tamu.edu/l2-arctic-corpus/).

Direct retrieval of the corpus page from the workstation returned HTTP 403. The library-maintained `jfk.flac` public example was used instead for local ASR smoke only. Its source/normalized digests and model revision are recorded in [smoke evidence](evidence/local-asr-smoke.json); it has no diagnostic vowel labels and does not enter the live benchmark.

## Observed local results

Pinned `Systran/faster-whisper-tiny.en` revision `0d3d19a32d3338f10357c0889762bd8d64bbdeba` produced transcript and 22 word timings from an 11 s sample. Three CPU/int8 runs took 1097.7, 407.7 and 412.4 ms including the app's physical checks, hashing and initial model load where applicable. Do not treat three runs on one native sample as a representative p95, validated alignment or L2 diagnosis result. Offline mode (`HF_HUB_OFFLINE=1`, `uv run --offline`) also returned evidence successfully.

An actual run failed with PyAV 19.0.1 because faster-whisper 1.2.1 passes `metadata_errors`, removed in the newer PyAV API. We constrained the optional ASR group to a tested PyAV 16.1.0 resolution and added a decoder regression test. [PyAV maintainer release notes](https://github.com/PyAV-Org/PyAV/releases).

## Next experiment

The phonetic-label candidate has now run on the public native and L2 examples. See [phonetic smoke evidence](evidence/phonetic-smoke.json). The L2 clip produced multilingual labels (including digit-bearing labels), without a validated English target alignment. Do not mask these outputs into an apparently certain English diagnosis. This snapshot is suitable for further evidence experiments, not corrective claims.

The next research requirement is eligible, independently labeled human contrast data and a speaker-disjoint calibration/held-out split. This is separate from shipping the local listening/self-comparison alpha. The selected diagnostic provider remains **none**.
