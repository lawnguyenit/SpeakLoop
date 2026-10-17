# Implementation state

**Last checked:** 2026-10-17

| ID | Behavior | Status | User accepted? | Source evidence | Runtime/test evidence |
|---|---|---|---|---|---|
| IMP-00 | Evaluation toolkit | implemented and checked | no | `pyproject.toml`, `uv.lock`, `src/speakloop/`; CLI supports validate/evaluate/audio/schemas | `uv sync`, 28 unit tests, Ruff and actual CLI fixture run passed; no learner-facing application exists yet |
| IMP-01 | Version control and GitHub | initialized, initial milestone pushed | workflow approved | `origin` points to `https://github.com/lawnguyenit/SpeakLoop.git`; `main` tracks `origin/main` | Initial planning commit `7a53d63` was pushed; `git ls-remote` matched local HEAD at that checkpoint |
| IMP-02 | Implementation plan | authorized starting plan | yes, plan only | `docs/implementation-plan.md`; user “bắt đầu đi” | Defaults recorded in DEC-06/07; implementation acceptance remains separate |
| IMP-03 | Evaluation protocol | documented, not experimentally validated | no | `docs/evaluation-protocol.md`, `benchmark/README.md`; live manifest is empty | No diagnostic model or human benchmark evaluated |
| IMP-04 | Benchmark contracts and evaluation report | implemented and checked on simulated test data | no | `src/speakloop/contracts.py`, `benchmark.py`, `evaluation.py`; exported schemas and `configs/evaluation.v1.json` | Tests cover split leakage, missing/duplicate predictions, unsafe claims, synthetic-data exclusion and insufficient-evidence gating; no real model accuracy measured |
| IMP-05 | Physical audio checks | partial capability implemented and checked | no | `src/speakloop/audio.py` | Silence, clipping, malformed/truncated WAV, duration and format covered; passing levels return `needs_speech_check`; VAD/noise assessment is absent |
| IMP-06 | Free/local provider scan | documented, inference not run | no | `docs/provider-feasibility.md`; workstation inspected | RTX 4060 8 GiB and ~32 GiB RAM observed; no model downloaded, corpus acquired, or API called |

The offline evaluation toolkit runs locally. The revised plan is authorized, but no learner-facing behavior is implemented or accepted. The live benchmark is empty and no dataset/provider has passed diagnosis gates. The optional `asr` dependency group is declared but not installed. No personal recording has been collected or uploaded. GitHub milestone commits/pushes are explicitly authorized in root `AGENTS.md`.
