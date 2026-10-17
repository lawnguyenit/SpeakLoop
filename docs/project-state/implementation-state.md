# Implementation state

**Last checked:** 2026-10-17

| ID | Behavior | Status | User accepted? | Source evidence | Runtime/test evidence |
|---|---|---|---|---|---|
| IMP-00 | Application implementation | initial scaffold in progress | no | `pyproject.toml`, `src/speakloop/`; evaluation CLI is not implemented yet | No application runtime exists yet |
| IMP-01 | Version control | initialized | workflow approved | Local `main` created by `git init -b main`; user supplied GitHub remote | Initial planning checkpoint is being prepared; no push verified yet |
| IMP-02 | Implementation plan | authorized starting plan | yes, plan only | `docs/implementation-plan.md`; user “bắt đầu đi” | Defaults recorded in DEC-06/07; implementation acceptance remains separate |
| IMP-03 | Evaluation protocol | documented, not experimentally validated | no | `docs/evaluation-protocol.md`, `benchmark/README.md`; live manifest is empty | No diagnostic model or human benchmark evaluated |

Implementation has begun with evaluation infrastructure. The revised plan is authorized, but no learner-facing behavior is implemented or accepted. The protocol declares initial evaluation gates; no dataset or provider has passed them. GitHub milestone commits/pushes are explicitly authorized and the standing workflow is recorded in root `AGENTS.md`.
