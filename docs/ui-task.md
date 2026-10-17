# Antigravity task: SpeakLoop frontend

Build the complete React + TypeScript + Vite frontend for SpeakLoop in `D:\Project\SpeakLoop\frontend`.

Read `D:\Project\SpeakLoop\docs\frontend-contract.md` for exact API and screen behavior. Read root AGENTS.md for project constraints. You own **frontend/** only; Codex is implementing the backend concurrently. Do not edit backend/docs/root files, create commits, push, deploy, subscribe or enable paid services. Use only the current app's included model quota.

Implement all described screens, a persistent Vietnamese/English toggle, accessible audio/listening interactions, Web Audio microphone capture with local 16 kHz PCM16 WAV encoding, local recording replay, safe errors/retries and session resumption. No cloud voice upload; requests go to relative `/api` only. Invalid audio and uncertain analysis must be clear. Production results are currently abstentions; never invent scores or paint the target red/green from a transcript. Reference lesson audio is preview material, not human-reviewed.

Choose a polished calm visual design: warm paper background, deep navy typography, restrained teal accents, large readable learning cards, simple progress and generous spacing. Make it responsive and avoid an admin-dashboard look. Use Vietnamese by default. Keep the main learning actions obvious.

Use Vite dev port 5178 with `/api` proxy to `http://127.0.0.1:8765`; `npm run build` should type-check and produce `frontend/dist`. Backend will serve the production build. Avoid external UI dependencies unless needed. Check the production build, resolve errors, then report the files changed, commands run and any integration assumptions in this Antigravity conversation.

Start now. You may create frontend files and install reputable npm dependencies in frontend. Ask only if genuinely blocked; Codex will inspect and integrate your work directly.
