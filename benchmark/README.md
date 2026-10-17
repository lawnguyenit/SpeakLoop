# Pronunciation benchmark

The benchmark is intentionally empty. No labeled learner data has been collected or fabricated.

- Protocol: [evaluation-protocol.md](../docs/evaluation-protocol.md).
- Live manifest: `manifest.jsonl` (UTF-8 JSON Lines; use one record per target).
- Generated schema: `schemas/clip.json` (authoritative source: `src/speakloop/contracts.py`).
- Local audio: `audio/`, excluded from Git. Paths in a manifest are relative to this directory's parent (`benchmark/`); traversal and absolute paths are rejected.
- Private manifests/annotations: `private/`, excluded from Git. Do not commit personal audio or identification.
- Example records under `examples/` are explicitly fixtures and cannot pass the human benchmark gate.

Use `uv run speakloop validate benchmark/manifest.jsonl` to check metadata and split leakage, or add `--check-audio` to require files. Use `uv run speakloop evaluate MANIFEST PREDICTIONS` to produce a report. Exit 0 means diagnostic numeric/data gates passed; exit 3 means failed or insufficient evidence; exit 2 means invalid input. Human review is still required even with exit 0.

Provider predictions are app-policy decisions, not unreviewed model prose. The prediction schema records a policy version and evidence reference; evaluation compares the decision with independent human labels.
