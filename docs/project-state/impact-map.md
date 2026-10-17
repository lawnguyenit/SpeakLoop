# Impact map

**Last updated:** 2026-10-17

Offline evaluation infrastructure exists in `src/speakloop/`. No learner-facing UI/API exists yet. Implemented infrastructure owners are listed below; the MVP table still describes future app capabilities.

| Implemented capability | Owner/source | Consumers | Data/errors | Verification |
|---|---|---|---|---|
| Benchmark/prediction/config contracts | Codex: `contracts.py` | CLI and exported `benchmark/schemas/` | Pydantic validation; human-source metadata does not prove annotation truth | Contract/path/unsupported-claim tests |
| Manifest integrity and split checks | Codex: `benchmark.py` | `speakloop validate` and `evaluate` | Duplicate IDs/paths/digests, speaker leakage, permission/digest/file checks | Leakage/missing-data tests |
| Diagnostic metrics and numeric/data gates | Codex: `evaluation.py` | `speakloop evaluate` | Precision/Wilson, unsafe claims, abstention, coverage, latency; insufficient/fail/pass | Simulated report tests; no real pronunciation evidence |
| WAV physical validity | Codex: `audio.py` | `speakloop audio` | Invalid or needs-speech-check result; never approves pronunciation | Generated signal/malformed-audio tests |
| Offline CLI and packaging | Codex: `cli.py`, `pyproject.toml`, `uv.lock` | Local developer commands | Exit 0/2/3; UTF-8 saved JSON and ASCII-safe stdout | Installed CLI smoke and legacy-terminal regression |
| Local ASR evidence and abstention | Codex: `local_asr.py` | `speakloop asr`, smoke runner | Existing local model only; weights digest, raw transcript/word timings; invalid audio stops; no phoneme verdict | Real CPU/offline run and provider-failure/abstention tests |
| Explicit public asset preparation | Codex: `scripts/prepare_local_asr.py` | Local ASR smoke | Pinned model revision and public-sample digest; downloads only in preparation; ignored `.local/` | Actual preparation and decoder run; no private data used |
| Local lesson HTTP contract | Codex: `server.py`, `docs/frontend-contract.md` | Antigravity React client at relative `/api` | Request validation, safe error envelope/request ID, origin/size guards, loopback binding | FastAPI TestClient and full public-audio smoke |
| Session/progress persistence | Codex: `store.py` | Session, answers, recordings, advance, progress and preferences routes | SQLite `sessions`, `attempts`, `settings`; transactional answers, retry identity and advance requirements | Idempotency, resumption, hidden baseline scores, review schedule and preference tests |
| Lesson/reference bank | Codex: `lesson.py`, `scripts/prepare_lesson_audio.ps1` | Lesson/audio routes and React playback | 12 pairs, 52 registered local WAV assets; explicit unreviewed status | Generation run and health readiness; human audio review pending |
| Frontend | Antigravity: `frontend/**` | Learner browser, local API | UI is being implemented against the contract | Build and integration review pending |

| Capability | UI owner | API/domain owner | Data | Audio/model | Errors/logging | Tests/deploy |
|---|---|---|---|---|---|---|
| Learning target and lesson selection | TBD | TBD | Learning target, context, lesson item — proposed | Curated audio/item source — TBD | Invalid/unsupported target behavior — TBD | TBD |
| Perception activities | TBD | TBD | Trial, answer, response time/progress — proposed | Multi-speaker token bank — TBD | Replay/recording failure — TBD | Perception gain/transfer evaluation — TBD |
| Controlled production diagnosis | TBD | TBD | Recording, target alignment, diagnosis, confidence — proposed | Speech analysis/model — unselected | Abstention and retry behavior required | Human-reviewed Vietnamese learner audio required before pilot |
| Progress and delayed revisit | TBD | TBD | Perception/production progress and revisit schedule — proposed | None specified | Missing/failed progress persistence — TBD | Retention check — TBD |
| Explanation language | TBD | TBD | User preference — proposed | None | Preference fallback — TBD | Language switch behavior — TBD |

## Tooling and budget constraints

- **MVP spend ceiling:** USD 0 for model/API usage. Runtime must stop at a free-tier quota rather than fall through to paid usage.
- **Credential ownership:** API keys are not in the repository or chat. A local environment secret or user-managed secret store is required before any integration can run.
- **UI collaboration:** Antigravity is installed on the workstation. Codex can use Windows app automation to open it and submit a scoped UI task when implementation needs it; this is a proposed work method, not application runtime behavior. The user should not need to manually shuttle prompts or files.
- **Coordination boundary:** Antigravity and Codex do not have a direct agent-to-agent channel in this setup. Coordinate through the shared workspace, explicit file/API contracts, and reviewed diffs; assign non-overlapping ownership while parallel work is active.
