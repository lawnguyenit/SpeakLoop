# Execution stages

**Updated:** 2026-10-17. Codex decides routine implementation details within the authorized plan and reports each coherent milestone. User acceptance remains separate from automated checks.

| Work chunk | Purpose | Current status | Completion evidence |
|---|---|---|---|
| 1A: Evaluation toolkit | Define claims, benchmark labels/splits and numeric gates before choosing a model | Completed as initial infrastructure | 28 tests and CLI fixture run; pushed in `5f0d802`; no real benchmark pass |
| 1B.1: Local ASR feasibility | Verify a free local model can process public example audio and return evidence | Completed for the CPU smoke path | Pinned tiny.en processed 11 s public audio in 3 runs; offline-mode CLI passed; 33 tests passed; details in `docs/evidence/local-asr-smoke.json` |
| 1B.2: Phonetic-evidence experiment | Try a local phonetic model and determine what evidence can actually be extracted | Initial CPU experiment completed | Pinned Wav2vec phonetic model processed two public clips; multilingual L2 output is not calibrated/English-aligned; specific claims remain disabled |
| 1B.3: Diagnostic reliability | Compare evidence against independent human labels and calibrate claims | Pending data/annotation | No eligible held-out benchmark yet; specific pronunciation claims remain disabled |
| 2: Reviewed lesson design | Build the `/ɪ/`–`/iː/` lesson, separate baseline/training/revisit items and word/sentence prompts | Alpha content in progress | Fixed pairs and offline voice assets being prepared; audio remains marked unreviewed |
| 3: Backend learning loop | Run lesson progression, deterministic listening grading and progress persistence with analysis fallback | Implementing | Local FastAPI/SQLite endpoints are being checked against `docs/frontend-contract.md` |
| 4: Diagnosis integration | Enable only claims supported by the evaluation gates | Pending 1B.2 | Free/local adapters and abstention required |
| 5: Antigravity UI | Implement frontend from a stable API contract | Running concurrently | Scoped task directly sent to Antigravity, frontend-only ownership; API contract in docs |
| 6: Private alpha | Integrate and evaluate the learner experience | Pending | Recording privacy, quota behavior and known limitations included |

A failure to validate diagnosis does not stop independent lesson/backend work: the fallback is listening training, local recording and self-comparison with explicit uncertainty. It does stop red/green phoneme diagnoses until the evidence gate passes.

## Latest technical decision

Use local CPU/int8 tiny.en as an ASR evidence baseline, not a pronunciation judge. Three observed end-to-end times were 1097.7, 407.7 and 412.4 ms; these are one-file observations, not a population latency benchmark. PyAV 19.0.1 caused a real decoder failure; the optional dependency group now locks a compatible PyAV 16.1.0 resolution. No user recording or hosted inference was used; API/model-service spend remains USD 0.
