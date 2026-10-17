# Impact map

**Last updated:** 2026-10-17

Evaluation infrastructure and the local lesson API live in `src/speakloop/`; the integrated learner application lives in `frontend/`. Codex coordinates integration and Git. Antigravity completed the initial frontend implementation and relinquished editing ownership before Codex integration fixes.

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
| Frontend | Antigravity initial delivery; Codex integration: `frontend/**` | Learner browser, local API | Relative `/api`, localized safe errors, memory-only recording Blob, localStorage language/session ID | Production build passed; selected Edge interaction paths observed |

| Capability | UI owner | API/domain owner | Data | Audio/model | Errors/logging | Tests/deploy |
|---|---|---|---|---|---|---|
| Lesson/mode entry | `HomeView.tsx`, `styles.css` | `lesson.py`, `server.py` | Fixed contrast/word bank; arbitrary target/context deferred | 52 local unreviewed clips | Safe missing-reference error | Build/Edge; human review pending |
| Perception | `ListeningPhase.tsx` | answers route, `store.py` | Hidden baseline/review scores, idempotent answers | Local two-voice reference bank | Replay errors; stale activity resync | Earlier API tests; Edge playback/feedback/resume; efficacy unverified |
| Production self-comparison | `ProductionPhase.tsx`, `wavRecorder.ts` | recordings/advance routes, `audio.py`, `local_asr.py` | Safe attempt metadata, persisted `can_advance`; raw take removed | Web Audio PCM16, optional local ASR; diagnosis off | Permission/cancellation cleanup, retry/abstention | Earlier API smoke; recorder source/build review; physical mic unverified |
| Progress/revisit | `HomeView.tsx`, `CompletionPhase.tsx` | progress route, `store.py` | SQLite session/attempt/settings tables; 7-day revisit | No additional model | Safe localized request errors | Earlier API checks; browser resume; retention unverified |
| Explanation language | `App.tsx`, `i18n.ts`, `HomeView.tsx` | settings route, `lesson.py` | vi/en preference and word glosses | None | Browser storage fallback, settings retry | Build and Edge toggle/gloss inspection |
| Specific phoneme correction | Deferred learner display | `evaluation.py`, research adapters | Human contrast labels/calibration absent | Local phonetic experiment unvalidated | Must abstain until evidence gates pass | Held-out human benchmark required |

## Tooling and budget constraints

- **MVP spend ceiling:** USD 0 for model/API usage. Runtime must stop at a free-tier quota rather than fall through to paid usage.
- **Credential ownership:** API keys are not in the repository or chat. A local environment secret or user-managed secret store is required before any integration can run.
- **UI collaboration:** Codex submitted the scoped UI task and follow-ups directly through Antigravity's installed app. Frontend delivery is integrated; the user did not shuttle prompts or files. This is development coordination, not application runtime behavior.
- **Coordination boundary:** Antigravity and Codex do not have a direct agent-to-agent channel in this setup. Coordinate through the shared workspace, explicit file/API contracts, and reviewed diffs; assign non-overlapping ownership while parallel work is active.
