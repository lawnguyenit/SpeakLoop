# SpeakLoop

English sound-contrast practice for a Vietnamese beginner. Initial target: `/ɪ/`–`/iː/`; en-US lesson reference, accepting intelligible variants that preserve the contrast. MVP model/API budget: **USD 0**.

Current milestone: evaluation tooling. No pronunciation model has passed the benchmark; no learner-facing UI or backend service exists yet.

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

## Project records

- [Implementation plan](docs/implementation-plan.md)
- [Evaluation and benchmark protocol](docs/evaluation-protocol.md)
- [Product specification](docs/product-spec.md)
- [Current state and gaps](docs/project-state/implementation-state.md)
- [Standing development/GitHub agreement](AGENTS.md)

Credentials, personal recordings, private manifests, model weights and local reports are excluded from Git. Meaningful verified milestones are committed and pushed to the user's GitHub repository throughout development.
