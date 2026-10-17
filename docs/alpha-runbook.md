# Local alpha runbook

This alpha supports listening practice, word/sentence recording, replay, optional local ASR, persistent progress and a 7-day revisit schedule. No production pronunciation score or phoneme diagnosis is enabled. Reference clips are generated offline and remain marked unreviewed. The app is for one local user; do not expose its port publicly.

## Start on this workstation

From the project root:

```powershell
.\scripts\start_speakloop.ps1
```

Open `http://127.0.0.1:8765`. Stop with Ctrl+C. The launcher builds frontend assets if missing and prepares offline reference voices when needed. Progress is in `.local/speakloop.sqlite3`; raw takes and ASR transcripts are not stored there. Microphone recording starts only when the learner presses Record and permits it in the browser.

## Set up another Windows checkout

Requirements: Python 3.11+, uv, Node/npm, and the Microsoft David/Zira Desktop English SAPI voices available on this workstation.

```powershell
uv sync --group asr
.\scripts\prepare_lesson_audio.ps1
cd frontend
npm ci
npm run build
cd ..
.\scripts\start_speakloop.ps1
```

ASR is optional. To explicitly prepare the pinned public ASR snapshot and its public smoke sample:

```powershell
uv run --group asr python scripts/prepare_local_asr.py
```

Without an available model/config the app still supports listening and recording/self-comparison. No hosted model, API key or subscription is required for this alpha. Google/Edge access checks are recorded in `docs/account-access.md`.

## Checks and experiments

```powershell
uv run --group asr pytest -q
uv run ruff check .
uv run ruff format --check .
uv run --group asr python scripts/run_backend_smoke.py
```

The backend smoke uses public off-prompt speech and an isolated temporary database. Completing that flow does not mean pronunciation passed. To reproduce the separate phonetic research experiment, install the `phonetic` group and run `scripts/run_phonetic_smoke.py --prepare` with both `asr` and `phonetic` groups. Model weights and raw research samples remain under ignored `.local/`.

## Limits requiring further work

- Independently reviewed contrast-specific learner data and confidence calibration are absent.
- Physical audio checks do not yet prove speech/noise validity.
- Reference audio needs pronunciation review before it becomes an approved learning asset.
- The 8-item alpha listening activities are shorter than the research evaluation protocol and do not establish efficacy.
- No cloud deployment, native packaging, arbitrary-topic generation or grammar/writing module is included.
