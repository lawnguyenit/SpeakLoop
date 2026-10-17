# Verification and gaps

**Last updated:** 2026-10-17

| ID | Claim/check | Result | Evidence | Gap / next action | Owner |
|---|---|---|---|---|---|
| CHK-01 | Initial workspace had no application implementation | historical | Initial inspection; scaffold creation has now begun | See current implementation-state record | Codex |
| CHK-02 | Product/MVP spec reflects the conversation and pasted proposal | not-run | Draft created at `docs/product-spec.md` | User review and correction required | user + assistant |
| CHK-03 | Current API options and Antigravity capabilities researched | pass | Official Google Gemini API audio, TTS, pricing/rate-limit docs; Google Cloud STT pricing; OpenAI Plus billing docs; official Antigravity docs; local app inventory | Free-tier quotas and availability can change; recheck before implementation | unassigned |
| CHK-04 | Revised plan authorized for execution | pass | User “bắt đầu đi”; initial Git repo and evaluation scaffold created | Complete Phase 1A before model comparison | Codex |
| CHK-05 | Evaluation plan is defined before provider selection | pass (document-level) | Revised plan orders evaluation protocol and benchmark before provider feasibility; includes provisional gates and Q1/Q2/Q3 hypotheses | User review; finalize thresholds and benchmark sample plan before provider comparison | user + assistant |
| GAP-01 | First target contrast is selected | closed (decision) | Authorized plan defaults: `/ɪ/`–`/iː/` | Training examples still require review | Codex |
| GAP-02 | Production feedback is reliable for Vietnamese beginner speech | not-run | No recordings, model, or validation study available | Finalize benchmark labels/sample plan; evaluate held-out human-produced clips and calibrate abstention before learner-facing diagnosis | unassigned |
| GAP-03 | MVP boundary is approved | closed (decision) | User authorized revised plan; DEC-06/07 | No learner-facing implementation accepted yet | Codex |
| GAP-04 | User acceptance of implementation | not accepted | No learner-facing app exists | Review after implementation and verification | user |
| GAP-05 | No-overage free-tier enforcement | not-run | No app/API integration exists | Implement an explicit app-side monthly/request cap and never silently use a paid fallback | unassigned |
| GAP-06 | Antigravity direct task handoff in this environment | not-run | Antigravity is installed but was not launched or sent a task | On first scoped UI task, open the app, send the task through its UI, and verify results via shared workspace | unassigned |

No code tests, build, browser checks, or runtime checks have passed yet. Evaluation tooling is in progress; no diagnosis or learning-effect claim has been validated.
