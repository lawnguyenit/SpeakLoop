# Verification and gaps

**Last updated:** 2026-10-17

| ID | Claim/check | Result | Evidence | Gap / next action | Owner |
|---|---|---|---|---|---|
| CHK-01 | Initial workspace had no application implementation | historical | Initial inspection; scaffold creation has now begun | See current implementation-state record | Codex |
| CHK-02 | Product/MVP spec reflects the conversation and pasted proposal | not-run | Draft created at `docs/product-spec.md` | User review and correction required | user + assistant |
| CHK-03 | Current API options and Antigravity capabilities researched | pass | Official Google Gemini API audio, TTS, pricing/rate-limit docs; Google Cloud STT pricing; OpenAI Plus billing docs; official Antigravity docs; local app inventory | Free-tier quotas and availability can change; recheck before implementation | unassigned |
| CHK-04 | Revised plan authorized for execution | pass | User “bắt đầu đi”; initial Git repo and evaluation scaffold created | Complete Phase 1A before model comparison | Codex |
| CHK-05 | Evaluation plan is defined before provider selection | pass (document-level) | Revised plan orders evaluation protocol and benchmark before provider feasibility; includes provisional gates and Q1/Q2/Q3 hypotheses | User review; finalize thresholds and benchmark sample plan before provider comparison | user + assistant |
| CHK-06 | First GitHub checkpoint | pass | Commit `7a53d63` pushed to `origin/main`; remote ref matched local commit | Continue incremental commits/pushes at coherent milestones | Codex |
| CHK-07 | Toolkit dependencies and CLI | pass | `uv sync`; `uv run speakloop schemas`; `uv run speakloop validate benchmark/manifest.jsonl` | Empty manifest is structurally valid but not diagnostic evidence | Codex |
| CHK-08 | Evaluation and WAV guardrails | pass (unit-level only) | `uv run pytest -q`: 28 passed under CPython 3.13.5; `uv run ruff check .` and `uv run ruff format --check .` passed | No human acoustic/model or learner efficacy verification | Codex |
| CHK-09 | Real fixture CLI reports insufficient evidence | pass | Subprocess `python -m speakloop evaluate benchmark/examples/clip.fixture.jsonl benchmark/examples/prediction.fixture.jsonl --metadata-only`: exit 3, `insufficient_evidence`, empty stderr | Report at `.local/reports/fixture-evaluation.json` is local/ignored | Codex |
| FIX-01 | Windows terminal could not print IPA in JSON | fixed and regression checked | Initial CLI execution raised a charmap error; stdout now uses JSON Unicode escapes and saved files remain UTF-8; legacy-encoding regression test passed | None known for this path | Codex |
| CHK-10 | Local ASR CPU evidence path | pass (smoke only) | `uv run --group asr python scripts/prepare_local_asr.py` and `scripts/run_local_asr_smoke.py`; pinned snapshot, 11 s public sample, 3 runs; summary in `docs/evidence/local-asr-smoke.json` | No diagnostic labels, word timing ground truth or L2 accuracy measured | Codex |
| CHK-11 | Inference with offline mode | pass | `HF_HUB_OFFLINE=1` + `uv run --offline --group asr python ... -m speakloop asr`: exit 0, ASR-only evidence, abstain, diagnosis_ready=false, empty stderr | Does not evaluate hosted quotas or speech/noise gate | Codex |
| CHK-12 | Updated unit and formatting checks | pass | `uv run --group asr pytest -q`: 33 passed; Ruff check and format check passed | Unit fixtures do not count as human pronunciation evidence | Codex |
| FIX-02 | PyAV/faster-whisper decoder compatibility | fixed and checked | First real run failed on PyAV 19.0.1 `metadata_errors`; optional ASR group constrained to tested PyAV 16.1.0, `uv.lock` updated; actual decoder regression passed | Recheck compatibility before relaxing the constraint | Codex |
| GAP-01 | First target contrast is selected | closed (decision) | Authorized plan defaults: `/ɪ/`–`/iː/` | Training examples still require review | Codex |
| GAP-02 | Production feedback is reliable for Vietnamese beginner speech | not-run | No recordings, model, or validation study available | Finalize benchmark labels/sample plan; evaluate held-out human-produced clips and calibrate abstention before learner-facing diagnosis | unassigned |
| GAP-03 | MVP boundary is approved | closed (decision) | User authorized revised plan; DEC-06/07 | No learner-facing implementation accepted yet | Codex |
| GAP-04 | User acceptance of implementation | not accepted | No learner-facing app exists | Review after implementation and verification | user |
| GAP-05 | No-overage free-tier enforcement | not-run | No app/API integration exists | Implement an explicit app-side monthly/request cap and never silently use a paid fallback | unassigned |
| GAP-06 | Antigravity direct task handoff in this environment | not-run | Antigravity is installed but was not launched or sent a task | On first scoped UI task, open the app, send the task through its UI, and verify results via shared workspace | unassigned |

CPU ASR has processed a public human recording; the diagnostic benchmark remains empty. No UI/browser, GPU inference, cloud API or human pronunciation-diagnosis evaluation has run. Passing unit tests and the public ASR smoke are not diagnostic benchmark success. Qualified human annotation, speech/noise assessment and speaker-disjoint diagnostic evaluation remain required for specific learner feedback.
