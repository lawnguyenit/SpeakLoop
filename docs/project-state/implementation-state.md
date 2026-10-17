# Implementation state

**Last checked:** 2026-10-17

| ID | Behavior | Status | User accepted? | Source evidence | Runtime/test evidence |
|---|---|---|---|---|---|
| IMP-00 | Evaluation and local ASR toolkit | implemented and checked | no | `pyproject.toml`, `uv.lock`, `src/speakloop/`; CLI supports validate/evaluate/audio/schemas/asr | 33 tests with ASR group, Ruff, actual public-audio inference and offline CLI passed; no learner-facing application exists yet |
| IMP-01 | Version control and GitHub | initialized, initial milestone pushed | workflow approved | `origin` points to `https://github.com/lawnguyenit/SpeakLoop.git`; `main` tracks `origin/main` | Initial planning commit `7a53d63` was pushed; `git ls-remote` matched local HEAD at that checkpoint |
| IMP-02 | Implementation plan | authorized starting plan | yes, plan only | `docs/implementation-plan.md`; user “bắt đầu đi” | Defaults recorded in DEC-06/07; implementation acceptance remains separate |
| IMP-03 | Evaluation protocol | documented, not experimentally validated | no | `docs/evaluation-protocol.md`, `benchmark/README.md`; live manifest is empty | No diagnostic model or human benchmark evaluated |
| IMP-04 | Benchmark contracts and evaluation report | implemented and checked on simulated test data | no | `src/speakloop/contracts.py`, `benchmark.py`, `evaluation.py`; exported schemas and `configs/evaluation.v1.json` | Tests cover split leakage, missing/duplicate predictions, unsafe claims, synthetic-data exclusion and insufficient-evidence gating; no real model accuracy measured |
| IMP-05 | Physical audio checks | partial capability implemented and checked | no | `src/speakloop/audio.py` | Silence, clipping, malformed/truncated WAV, duration and format covered; passing levels return `needs_speech_check`; VAD/noise assessment is absent |
| IMP-06 | Local ASR evidence path | implemented, CPU smoke checked | no | `local_asr.py`, `scripts/prepare_local_asr.py`, `scripts/run_local_asr_smoke.py`, `docs/evidence/local-asr-smoke.json` | Pinned tiny.en with public sample; 3 local runs and offline mode returned evidence; all abstain; no corpus acquired or hosted API called |

The offline evaluation toolkit and CPU ASR evidence path run locally. The live benchmark is empty; no provider has passed diagnosis gates. The optional ASR group is installed on this workstation; model/sample/config/full reports stay in ignored `.local/`. No personal recording has been collected or uploaded. Public evidence summary contains neither audio nor transcript. Current work chunks are tracked in `docs/execution-status.md`; GitHub milestone commits/pushes remain authorized in root `AGENTS.md`.
