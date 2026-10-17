# Impact map

**Last updated:** 2026-10-17

Evaluation infrastructure is starting in `src/speakloop/`. No learner-facing UI/API exists yet. The table below is a capability map for the MVP; remaining TBD entries are not implemented.

| Capability | UI owner | API/domain owner | Data | Audio/model | Errors/logging | Tests/deploy |
|---|---|---|---|---|---|---|
| Learning target and lesson selection | TBD | TBD | Learning target, context, lesson item — proposed | Curated audio/item source — TBD | Invalid/unsupported target behavior — TBD | TBD |
| Perception activities | TBD | TBD | Trial, answer, response time/progress — proposed | Multi-speaker token bank — TBD | Replay/recording failure — TBD | Perception gain/transfer evaluation — TBD |
| Controlled production diagnosis | TBD | TBD | Recording, target alignment, diagnosis, confidence — proposed | Speech analysis/model — unselected | Abstention and retry behavior required | Human-reviewed Vietnamese learner audio required before pilot |
| Progress and delayed revisit | TBD | TBD | Perception/production progress and revisit schedule — proposed | None specified | Missing/failed progress persistence — TBD | Retention check — TBD |
| Explanation language | TBD | TBD | User preference — proposed | None | Preference fallback — TBD | Language switch behavior — TBD |

## Tooling and budget constraints

- **MVP spend ceiling:** USD 0 for model/API usage. Runtime must stop at a free-tier quota rather than fall through to paid usage.
- **Credential ownership:** API keys are not in the repository or chat. A local environment secret or user-managed secret store is required before any integration can run.
- **UI collaboration:** Antigravity is installed on the workstation. Codex can use Windows app automation to open it and submit a scoped UI task when implementation needs it; this is a proposed work method, not application runtime behavior. The user should not need to manually shuttle prompts or files.
- **Coordination boundary:** Antigravity and Codex do not have a direct agent-to-agent channel in this setup. Coordinate through the shared workspace, explicit file/API contracts, and reviewed diffs; assign non-overlapping ownership while parallel work is active.
