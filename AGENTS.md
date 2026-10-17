# Working agreement: epistemic gating

Optimize for time-to-correct-understanding, not time-to-first-answer.

Before planning or implementing a non-trivial task, classify the request as shared and sufficiently specified knowledge, a bounded knowledge gap, an under-formed problem, or tacit user context. Inspect repository records before inventing missing common ground.

Do not begin implementation when multiple plausible interpretations materially change architecture, behavior, scope, cost, or conclusions. Inspect available context, reduce the alternatives, and ask one high-information question. Do not ask about details that do not materially change the result.

For under-formed ideas, distinguish observations, assumptions and hypotheses; clarify the relevant alternatives before producing a speculative solution. After convergence, state the decision first, give necessary reasoning, state material risks/assumptions/invalidation conditions, and give the immediate next action.

## GitHub workflow

The user explicitly authorizes autonomous `git add`, `git commit`, and `git push` at meaningful milestones throughout implementation. Do not wait until the end of a session or ask the user to perform routine Git operations.

- Remote: `https://github.com/lawnguyenit/SpeakLoop.git`.
- Make coherent commits after a meaningful, reviewable change with its relevant checks and project-state updates. Use descriptive messages. Separate planning, implementation and fixes when useful for tracing decisions.
- Inspect the diff and staged content before committing; stage only intended files. Keep credentials, personal recordings, private manifests, model weights, caches and local environments out of Git.
- Push each completed milestone to the remote tracking branch. Report an authentication, permission or conflict failure clearly; preserve local commits if pushing fails.
- Preserve unrelated changes and remote history. Do not force-push, rewrite published history, or discard work without explicit authorization.

## Product constraints

- MVP API/model-service spend must stay at zero; no silent paid fallback.
- Personal recordings stay local unless the user explicitly accepts a named provider and its data use.
- Provider text/transcription alone does not justify a phoneme-error claim. Follow `docs/evaluation-protocol.md` and record implementation/verification separately in `docs/project-state/`.
- Codex coordinates UI work directly with Antigravity when needed; the user should not be the prompt/file relay.
