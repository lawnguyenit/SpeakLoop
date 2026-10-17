# SpeakLoop frontend

React/TypeScript client for the local FastAPI application. Initial UI delivered by Antigravity through direct app coordination; Codex owns integration and subsequent fixes.

```powershell
npm ci
npm run dev
```

Vite serves port 5178 and proxies `/api` to the backend at `127.0.0.1:8765`. Run `npm run build` to generate `dist/`, which the backend serves at its root. Build output and dependencies are ignored by Git.

The backend is the source of truth for session progression, listening scores and production advance eligibility. Browser storage contains language/session pointers; recordings stay in memory for replay and are sent only to localhost for analysis. Leaving a prompt stops recording resources and releases its recording URL.

All pronunciation outcomes currently abstain or request another take. Neutral word highlighting identifies the target only. Reference audio is unreviewed preview material. See `../docs/alpha-runbook.md` and `../docs/frontend-contract.md` for limits and the API contract.
