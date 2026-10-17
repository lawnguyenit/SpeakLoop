# SpeakLoop — Implementation Plan

**Status:** Authorized starting plan; Phase 1A evaluation infrastructure is in progress.
**Date:** 2026-10-17
**Depends on:** [Product/MVP specification](product-spec.md)

## 1. Intended result

Build a zero-spend, single-learner MVP that tests a specific learning loop for one English sound contrast:

1. Baseline listening discrimination.
2. Listening practice with controlled feedback.
3. Clearly articulated word production.
4. Prompted sentence production, followed by a check that the contrast survives in context.
5. Delayed test with unseen items.

The MVP must answer three separate questions:

- **Q1 — Learning:** Can the learner improve at hearing the contrast and retain it on delayed, unseen items?
- **Q2 — Diagnosis:** Can the system identify likely production problems accurately enough to justify corrective claims, while abstaining when uncertain?
- **Q3 — Transfer:** Once the learner produces the contrast at word level, does it remain distinguishable in a sentence?

These hypotheses can fail independently. If Q1 succeeds while Q2 fails, perception training and self-comparison can still be useful. Q2 must pass its evidence gate before the product claims to diagnose a phoneme. Q3 is a prerequisite for expanding into stress, rhythm, and connected speech.

The MVP is a feasibility study for a learning loop and free/local speech analysis. It is not a full English course, open conversation coach, grammar tutor, or writing assistant.

## 2. Guardrails and learning principles

- No paid API/model usage in the MVP. Use currently free quotas or local/open-source models. Never silently switch to a paid tier.
- Listening/perception and speaking/production are separate skills and need separate activities and progress measures.
- Teach a clearly articulated word before natural sentence delivery.
- A model/provider supplies evidence; app-owned policy decides which learner-facing claims that evidence permits.
- Prioritize precision over coverage: fewer trustworthy corrections are better than frequent false diagnoses.
- If recording quality or analysis confidence is insufficient, abstain and offer a retry or self-comparison.
- Reference accent describes lesson audio and pronunciation convention. Accepted pronunciation policy should accept valid, intelligible variants that preserve the target contrast; deviation from the reference recording is not automatically an error.
- Explanation language is user-selectable (Vietnamese or English).
- Raw learner audio is ephemeral by default. Do not send it to a third party without a provider/data-use decision and explicit opt-in.
- Keep provider/model choice outside the lesson engine so the app remains useful with fixtures or local analysis when quota is exhausted.

## 3. Starting technical shape

### Product form

**Recommendation:** responsive web app first, installable as a PWA later if useful. This keeps mic capture, playback, deployment, and single-learner iteration simple before committing to native packaging.

### Stack recommendation

- **Frontend:** React + TypeScript.
- **Backend:** Python + FastAPI for lesson logic, audio validation/preprocessing, provider adapters, quotas, and future local acoustic models.
- **Persistence:** SQLite for one learner's target progress and attempt metadata. Keep raw recordings ephemeral by default.
- **Lesson audio:** reviewed and versioned lesson items. Generated TTS is only a candidate until reviewed for target pronunciation, dialect, and quality.
- **Provider boundary:** provider adapters return structured evidence. The lesson engine and feedback decision policy remain provider-neutral.

The user authorized proceeding with these defaults after reviewing this plan. Keep personal-audio cloud upload disabled until a named provider and data-use decision are accepted.

### Product-analysis pipeline

```text
learner recording
  ↓
audio validity gate
  ↓
alignment / acoustic / provider evidence
  ↓
evidence normalization
  ↓
confidence calibration
  ↓
app-owned decision policy
  ↓
feedback renderer or abstention
```

The audio validity gate checks that a recording exists, duration is valid, speech is present, level is sufficient, clipping is not excessive, and noise does not make analysis unreliable. Invalid audio produces a recording-quality message, never a pronunciation-error claim.

Example internal result:

```json
{
  "target": "/ɪ/",
  "segment": "i",
  "evidence": {
    "asr_word": "ship",
    "alignment": null,
    "acoustic_score": null,
    "source": "provider-or-local-model"
  },
  "hypothesis": "/iː/",
  "confidence": 0.82,
  "decision": "likely_error",
  "abstain_reason": null
}
```

This is a schema example, not a promise that a chosen provider supplies these fields. Unsupported or absent evidence remains null; it must not be invented by an LLM.

## 4. Work phases and evidence gates

| Phase | Work | Deliverable | Gate before next phase |
|---|---|---|---|
| 0. Review and lock MVP | Review this plan; choose target contrast, reference accent, accepted-variant policy, platform, and audio-data policy | Approved MVP decision record | User confirms or edits open decisions in section 9 |
| 1A. Define evaluation protocol | Define correct/error/ambiguous/unusable labels, claims the app may make, benchmark splits, annotation process, metrics, and provisional thresholds before selecting a provider | Evaluation protocol and benchmark manifest | Every claim has an observable label/metric; synthetic audio is explicitly limited to pipeline smoke tests |
| 1B. Build benchmark and free/local feasibility spike | Assemble reviewed examples across correct, contrast substitution, intermediate, valid accent variants, noise, device, and speaker conditions. Compare eligible Gemini and local/open-source options against the same benchmark. Gemini is a candidate, not the default pronunciation engine. | Benchmark results and zero-spend go/no-go recommendation | At least one path meets provisional evidence gates, or diagnosis is excluded from MVP; never upload user clips without explicit opt-in |
| 2. Design the lesson | Select contrast, minimal pairs, word/sentence items, reference audio, baseline/post/delayed forms, and learner-facing feedback | Reviewed lesson manifest and scoring rubric | Items are linguistically reviewed; perception and production are measured separately |
| 3. Backend vertical slice | Implement typed lesson data, progression, deterministic perception grading, attempt/progress records, audio-validity result, provider-neutral evidence schema, and mock provider | Logic-only local service with fixtures | A complete sample lesson runs without paid services or a real UI |
| 4. Controlled diagnosis experiment | Connect only a provider/local model that passed Phase 1B; implement quota caps, cooldown, confidence calibration, decision policy, abstention, and error mapping | Auditable production-analysis result object | Held-out evaluation meets precision/false-claim gates; no paid fallback |
| 5. UI implementation | Codex provides Antigravity a scoped UI task, screen behavior, and API schema; UI ownership is limited to agreed frontend files | Mic permission, lesson, listen/choose, record, feedback, progress, and language-toggle screens | Review UI diff and integration contract; one writer per file during parallel changes |
| 6. Integration and opt-in alpha | Connect UI/backend; exercise fixtures, quota exhaustion, invalid audio, and abstention. Invite the user to an explicitly described recording trial only if cloud use is selected | Private single-learner alpha with known limitations | User can complete the loop; cost stays at zero; limitations are visible |
| 7. Review hypotheses and decide expansion | Review Q1, Q2, Q3 separately, plus error patterns, retention, usefulness, and quota behavior | Continue/change/stop decision | Add targets or skills only when the relevant evidence supports it |

### Benchmark design

The benchmark is a first-class artifact, separate from lesson content. Suggested structure:

```text
benchmark/
  correct/
  clear_substitution/
  intermediate_or_ambiguous/
  valid_accent_variants/
  noisy_or_invalid_audio/
  speaker_and_device_variation/
```

Each example should include, where applicable:

```text
expected_text
target_phoneme
expected_class
human_label
speaker_id (pseudonymous)
speaker_background (only if volunteered and relevant)
device
noise_condition
recording_quality_label
split (development / held-out)
```

Use synthetic or properly licensed public audio to smoke-test playback, upload/parsing, and pipeline behavior. It is not sufficient to evaluate learner pronunciation diagnosis. Diagnosis evaluation needs human-produced examples, including correct production, clear substitution to the contrast sound, ambiguous/intermediate production, valid accent variants, and recording/device variation. Learner recordings stay local unless the user explicitly opts into sending them to a named provider after reviewing applicable data-use terms. Keep speaker-separated held-out examples to reduce leakage. Ambiguous examples should be independently reviewed; disagreement is a reason to mark uncertain, not force a binary truth.

### Provisional success criteria

These are initial engineering gates for discussion, not validated learning-science thresholds. Phase 1A must finalize them with the available benchmark size and annotation quality before any provider comparison. Report sample counts and confidence intervals; do not present a small single-user pilot as general proof.

| Capability | Metric | Provisional MVP gate |
|---|---|---|
| Perception grading | Correctness against lesson answer key | Deterministic 100% on all lesson fixtures |
| Audio validity | Invalid/no-speech clips rejected before diagnosis | At least 95% of benchmark invalid clips rejected; false rejection on clean clips reported and kept at or below 10% |
| High-confidence diagnosis | Precision among claims shown as likely error | At least 90%, with held-out examples and confidence interval reported |
| False confident claims | Incorrect diagnosis shown without abstention | At most 5% of all held-out attempts; ambiguous and valid-variant cases included |
| Abstention behavior | Uncertain/ambiguous examples that lead to abstention | At least 90% on labeled ambiguous examples |
| Coverage | Share of valid attempts receiving specific feedback | Report by class and condition; no minimum gate at MVP, because precision has priority |
| Interaction latency | Record completion to displayed result | Target p95 under 8 seconds on the selected test setup; report provider/network separately |
| Retention/perception learning | Delayed accuracy on unseen items compared with baseline | Measure after a predeclared delay (initial proposal: 7 days); report raw change, do not infer broad efficacy from one learner |
| Word-to-sentence transfer | Contrast discrimination/diagnosis at word vs prompted-sentence level | Report separately; do not gate MVP expansion on a single learner's result |

If the benchmark is too small to support a credible precision estimate, the result is “insufficient evidence,” not a pass. A model that fails Q2 may remain out of the diagnosis path while Q1 is explored independently.

## 5. MVP behavior

### Learning input and lesson flow

- MVP supports one reviewed sound contrast as the target; `/ɪ/` vs `/iː/` (for example, `ship`/`sheep`) is a candidate, not approved.
- Use a small reviewed lesson bank rather than arbitrary topic/word generation at first.
- Context is metadata and example selection, not a substitute for a phoneme target.
- The proposed flow is baseline perception → perception practice → clear word → prompted sentence → delayed unseen-item revisit.
- A later iteration may accept a user-entered word, sentence, or topic and map it to supported targets.

### Perception

- Play short, reviewed examples in randomized order.
- Ask the learner to identify the sound/word heard.
- Grade against the known answer key; do not send perception responses to an LLM for grading.
- Track trained and held-out item accuracy separately.

### Production and feedback

- Record a known word first, then a prompted sentence.
- Run the audio-validity gate before any pronunciation analysis.
- Provide target, reference audio, supported evidence, and confidence only when available and benchmarked.
- Do not convert ASR transcript differences into a phoneme-error claim.
- Show a red-underlined likely issue and green target only when the evidence policy permits it.
- Give one concise correction and one next action per attempt; otherwise explain recording quality or uncertainty and offer retry/self-comparison.
- Keep perception and production progress separate; use delayed unseen items to check retention.
- No account/social features, stored cloud audio library, or free-form conversation in MVP.

## 6. Zero-spend, privacy, and provider policy

1. Maintain a provider registry with model/version, task capability, free quota, reset period, terms/data use, limits, and last-checked date.
2. Apply a local usage cap below the published free limit; stop at the cap rather than relying only on billing alerts.
3. Handle quota errors with cooldown and fixture/local fallback. Never switch to a paid model automatically.
4. Keep keys out of source control and chat; use local environment secrets.
5. No learner recording is sent to a third-party model until the named provider, data use, and opt-in are explicit.
6. Avoid retaining raw learner recordings by default; retain only the minimum attempt metadata needed for progress and debugging.
7. Recheck provider free-tier terms before integration because names, quotas, and data practices can change.
8. Treat Gemini transcription, timestamps, audio understanding, and TTS as separate capabilities. Do not infer phoneme-level pronunciation assessment unless a specific model path passes the benchmark.

## 7. Product architecture vs implementation workflow

The product architecture is provider-neutral and does not depend on a coding agent. The current implementation workflow, which can change independently, is:

- **Codex:** lesson/backend logic, API and evidence contracts, provider evaluation, integration review.
- **Antigravity:** scoped frontend implementation from an English-language task and shared API contract.
- **Coordination:** shared workspace and explicit file ownership; no direct agent-to-agent messaging is assumed. The user should not need to relay prompts or files.

## 8. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Provider transcribes correctly but cannot localize a phoneme error | Separate transcription from diagnosis; require benchmark evidence for every claim; retain abstention |
| Synthetic audio overstates learner performance | Use synthetic clips only for smoke tests; include human-produced L2 and variation examples in diagnostic evaluation |
| Model confidently mislabels accents or intermediate productions | Separate reference accent from accepted variants; include these classes in held-out benchmark; prioritize precision |
| Poor microphone/audio becomes a false pronunciation diagnosis | Put audio-validity checks before analysis; invalid audio returns a retry message |
| Free quota/model/terms change | Provider registry, local caps, adapter boundary, and no paid fallback |
| Generated voice is inconsistent or unnatural | Review generated audio; use fixed reviewed clips when needed |
| User voice data is sensitive | Keep local by default; explicit opt-in before third-party upload; minimal retention |
| Scope expands before learning loop is understood | Treat Q1/Q2/Q3 as separate hypotheses and gate expansion on evidence |
| Codex and Antigravity edit the same files | Assign directory/file ownership and integrate through a stable API contract |

## 9. Decisions for user review

| Decision | Recommended default | Why it matters | Status |
|---|---|---|---|
| MVP hypothesis | One contrast; separately evaluate Q1 learning, Q2 diagnosis, Q3 transfer | Makes results interpretable even when one capability fails | Proposed; not approved |
| First contrast | `/ɪ/` vs `/iː/` (e.g. `ship`/`sheep`) | Comes from the user's examples and is suitable for contrast practice | Candidate only |
| Reference accent | Choose one lesson-audio dialect; `en-US` is one candidate | Supports consistent audio and pronunciation conventions | Open |
| Accepted pronunciation | Accept intelligible valid variants that preserve the target contrast | Prevents reference accent deviation from being mislabeled as error | Proposed; not approved |
| Input scope | Fixed reviewed lesson items first; arbitrary targets later | Avoids unsupported generation before evidence is established | Proposed |
| Client platform | Responsive web app first | Lowest-friction mic/UI iteration | Proposed |
| Backend stack | Python/FastAPI, React/TypeScript, SQLite | Supports audio experiments and a clear UI/API boundary | Proposed |
| Diagnostic benchmark | Human-produced examples plus variation and quality labels; synthetic only for smoke tests | Required to estimate real diagnostic behavior | Proposed; protocol to finalize in Phase 1A |
| Audio sent to cloud | None until provider/data-use review and explicit opt-in | Free APIs may process or use submitted data under provider terms | Open |
| UI workflow | Codex delegates a scoped UI task to Antigravity and reviews its result | Avoids user acting as relay | Approved workflow |
| Paid service use | None for MVP | Protects zero-budget constraint | Approved |

## 10. Implementation readiness checklist

Before the first application-code change, get user approval on:

- MVP hypothesis and scope.
- First sound contrast and reference accent.
- Accepted-variant policy.
- Platform and stack, or explicit approval of the proposed defaults.
- Fixed lesson bank for MVP versus arbitrary user input.
- Audio-data policy and whether a named provider may receive any recording.
- Zero paid service use (already approved).
- Direct Antigravity delegation workflow (already approved).

The user authorized starting on 2026-10-17. Version control is now initialized. The remaining execution order is to finalize the Phase 1A evaluation tooling, assemble eligible benchmark data, and run Phase 1B before selecting a diagnosis engine. DEC-06/07 in `docs/project-state/user-intent.md` supersede the historical proposed statuses in the review table above. The GitHub workflow is recorded in root `AGENTS.md`.
