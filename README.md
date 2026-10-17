# SpeakLoop

English sound-contrast practice for a Vietnamese beginner. Initial target: `/ɪ/`–`/iː/`; en-US lesson reference, accepting intelligible variants that preserve the contrast. MVP model/API budget: **USD 0**.

Current milestone: local alpha integration. FastAPI/SQLite now runs listening trials, word/sentence recording, local ASR abstention, progress and revisit scheduling. Antigravity is implementing the frontend. No pronunciation model has passed the diagnostic benchmark; reference audio remains unreviewed.

## Local application

```powershell
.\scripts\start_speakloop.ps1
```

Open `http://127.0.0.1:8765`. See [setup, checks and limitations](docs/alpha-runbook.md). All app analysis is local; no API key or paid model is required. The interface supports self-comparison while diagnostic validation remains pending.

## Run locally

Requirements: Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```powershell
uv sync
uv run speakloop --help
uv run speakloop validate benchmark/manifest.jsonl
uv run speakloop schemas
uv run speakloop evaluate benchmark/examples/clip.fixture.jsonl benchmark/examples/prediction.fixture.jsonl --metadata-only
uv run pytest
uv run ruff check .
```

The fixture evaluation intentionally exits 3 (`insufficient_evidence`). The empty benchmark validates structurally but is not diagnostic evidence. With locally permitted, independently labeled recordings and policy decisions:

```powershell
uv run speakloop validate benchmark/private/manifest.jsonl --check-audio
uv run speakloop evaluate benchmark/private/manifest.jsonl benchmark/private/predictions.jsonl --output .local/reports/evaluation.json
uv run speakloop audio benchmark/private/example.wav
```

Manifest audio paths are relative to the manifest's directory. Exit 2 indicates invalid input, exit 3 a failed/insufficient evaluation (or invalid physical audio), and exit 0 successful command execution. An evaluation pass is not deployment approval. The `audio` command can return `needs_speech_check`: physical checks alone cannot establish speech quality or correct pronunciation.

## Local ASR smoke experiment

Preparation explicitly downloads the pinned public model and the library's public test sample. Inference itself uses existing local files and does not download a model or send audio to an API.

```powershell
uv sync --group asr
uv run --group asr python scripts/prepare_local_asr.py
uv run --group asr python scripts/run_local_asr_smoke.py
uv run --group asr speakloop asr .local/feasibility/jfk.pcm16.wav --config .local/feasibility/local-asr.json --output .local/reports/local-analysis.json
uv run --group asr pytest -q
```

The adapter returns transcript and raw word timestamps/probabilities. The app policy returns `abstain` with `diagnosis_ready=false`: ASR probabilities are not calibrated pronunciation confidence. Silence/invalid physical audio stops before inference. Full local reports may contain transcripts; `.local/` remains excluded from Git. [Recorded smoke evidence](docs/evidence/local-asr-smoke.json) contains only public-source identifiers and summary measurements.

## Project records

- [Implementation plan](docs/implementation-plan.md)
- [Evaluation and benchmark protocol](docs/evaluation-protocol.md)
- [Product specification](docs/product-spec.md)
- [Current state and gaps](docs/project-state/implementation-state.md)
- [Work chunks and current phase](docs/execution-status.md)
- [Standing development/GitHub agreement](AGENTS.md)

Credentials, personal recordings, private manifests, model weights and local reports are excluded from Git. Meaningful verified milestones are committed and pushed to the user's GitHub repository throughout development.
