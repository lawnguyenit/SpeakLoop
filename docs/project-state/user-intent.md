# User intent and decisions

**Last updated:** 2026-10-17

## User intent

| ID | Request / faithful excerpt | Normalized meaning | Status | Source |
|---|---|---|---|---|
| REQ-01 | “người mới học tiếng Anh”; the author is a beginner with little foundation | Design initially for a Vietnamese-speaking beginner, starting with the author's needs | approved | Conversation, 2026-10-17 |
| REQ-02 | The learner can start from a chosen topic, a word, a sentence, or a sound and receive contextual practice | Support flexible learning targets and contextual lesson items over time | requested | Conversation, 2026-10-17 |
| REQ-03 | Early foundation prioritizes listening and speaking; writing and sentence order follow; long term, balance four skills | Prioritize listening/perception and speaking/production in the initial product direction | approved | Conversation, 2026-10-17 |
| REQ-04 | The learner chooses Vietnamese or English explanations and can switch to English later | User-controlled explanation language, switchable at any time | approved | Conversation, 2026-10-17 |
| REQ-05 | Show where a word is wrong, color/underline the segment, explain what it was read as and how it should be | Localized, contrastive, explanatory pronunciation feedback | approved | Conversation, 2026-10-17 |
| REQ-06 | A word may be read differently in a sentence; explain stress and natural speech | Progress from clear word production to sentence-level stress/reduction and connected speech | approved | Conversation, 2026-10-17 |
| REQ-07 | “Gộp thành đặc tả sản phẩm/MVP” | Consolidate the concept and the attached proposal into a reviewable spec | requested | Conversation, 2026-10-17 |
| REQ-08 | No paid external service for now; use Google AI Studio/free services or free trials, with a very limited budget | MVP model/API spend must stay at zero; paid service is only a later, separately evaluated option | approved | Conversation, 2026-10-17 |
| REQ-09 | When UI work is needed, Codex should ask Antigravity to do it rather than requiring the user to relay prompts/files | Codex owns the coordination and communicates the UI task directly through the installed Antigravity app where feasible | approved | Conversation, 2026-10-17 |
| REQ-10 | “bắt đầu đi”, after reviewing the revised evaluation-first implementation plan | Start executing the revised plan with its proposed defaults; this does not authorize paid service use or uploading personal recordings | approved | Conversation, 2026-10-17 |
| REQ-11 | Automatically add, commit and push important updates throughout implementation; repo `https://github.com/lawnguyenit/SpeakLoop.git` | Maintain meaningful incremental GitHub checkpoints without asking the user to run Git or waiting until the end | approved | Conversation, 2026-10-17 |
| REQ-12 | Execute the workflow in manageable stages; decide routine details and report what was completed, checked, still missing, and what stage comes next | Continue autonomously within approved constraints and keep progress understandable | approved | Conversation, 2026-10-17 |

## Approved decisions

| ID | Decision | Alternatives rejected | Scope | Evidence |
|---|---|---|---|---|
| DEC-01 | Beginner learning starts with listening and speaking foundations | Starting MVP with writing/grammar as the main outcome | Product priority | User answer to outcome question |
| DEC-02 | The explanation language is selected by the user and may be changed | Automatically switching based on assumed proficiency | UX behavior | User answer to language question |
| DEC-03 | Teach clear word pronunciation before natural sentence pronunciation | Presenting both layers as the only initial teaching mode | Lesson sequence | User answer on word-to-sentence progression |
| DEC-04 | No paid external APIs/services in the MVP; only free quotas, free trials, or local open-source models | Automatically falling back to a paid tier | Model and operating budget | User clarification, 2026-10-17 |
| DEC-05 | Codex should coordinate directly with Antigravity for UI work, without making the user the message relay | User manually relaying every prompt/artifact | Collaboration workflow | User clarification, 2026-10-17 |
| DEC-06 | Execute the revised one-contrast MVP plan with its recommended defaults: `/ɪ/`–`/iː/`, en-US reference audio, accepted intelligible variants, fixed reviewed items, responsive web, React/TypeScript + Python/FastAPI + SQLite | Arbitrary generation, grammar/writing, and free conversation in the first release | MVP starting configuration | User “bắt đầu đi” after revised plan; defaults inferred from accepted plan, reversible |
| DEC-07 | Define evaluation/benchmark before selecting a pronunciation provider; use an audio-validity gate and app-owned evidence/abstention policy | Trusting model-written feedback or ASR transcript as phoneme diagnosis | Evaluation and analysis architecture | Attached plan review and user authorization to begin |
| DEC-08 | Autonomously stage, commit and push coherent milestones to the user-provided GitHub repository | One final commit for all changes; user manually running routine Git operations | Development workflow | User's explicit GitHub request, 2026-10-17 |

The implementation-plan defaults are now authorized as the starting configuration. Exact dataset access, annotation availability, provider credentials, and any personal-audio cloud upload remain unresolved. Historical proposals below are retained for traceability; DEC-06/07 supersede their pending status where applicable.

## Proposed decisions requiring confirmation

| ID | Proposal | Status | Source |
|---|---|---|---|
| PROP-01 | MVP proves one sound contrast through perception, controlled production, and prompted sentence production; grammar/writing and free speech are out of scope | proposed | Attached text and product synthesis |
| PROP-02 | Separate `LearningTarget` (sound/word/sentence/grammar) from `Context` (travel/work/etc.) | proposed | Attached text |
| PROP-03 | Use multi-talker, varied-context perception training with corrective feedback | proposed | Attached text and research note in product spec |
| PROP-04 | Production feedback has calibrated confidence levels and abstains when uncertain | proposed | Attached text |
| PROP-05 | `/ɪ/` vs `/iː/` is the first MVP contrast | proposed | User examples only; not yet selected |
