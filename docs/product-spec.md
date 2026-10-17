# SpeakLoop — Product & MVP Specification

**Status:** MVP starting scope authorized; detailed evaluation governed by the implementation plan/protocol
**Last updated:** 2026-10-17
**Product stage:** Phase 1A evaluation infrastructure in progress; no learner-facing app yet.

**Budget constraint:** The MVP must not incur API or model-service charges. Use a free tier, a time-limited free trial, or locally run open-source software only. Do not silently switch to a paid tier when a quota is reached.

## 1. Product direction

SpeakLoop is a self-study app for a Vietnamese-speaking English beginner. It helps the learner hear and produce English sound contrasts, then carry those sounds into words and sentences. Its central unit is a learning target practiced through several layers: perception, controlled production, contextual use, and eventually natural communication.

The app should not treat pronunciation as one overall score. It should distinguish what the learner can hear, what they can produce, and how well the sound carries into connected speech. A learner should see what sound or word portion needs attention, what the target is, and how certain the system is about its diagnosis.

## 2. User and need

### Primary user

- A Vietnamese-speaking adult at beginner English level, initially the founder/author.
- May know IPA symbols but needs help connecting them to actual listening and articulation.
- Wants to build listening and speaking foundations first, then add writing and sentence structure, with a longer-term goal of balanced English skills.

### Problem to solve

The learner may know a spelling or approximate meaning but not reliably hear a sound contrast, pronounce it, or use the word naturally in a sentence. Existing practice that only plays a model and asks for repetition does not necessarily reveal what the learner heard or produced incorrectly.

### Product outcome

For a selected English sound contrast, the learner can progress from distinguishing the sounds in examples to producing the contrast in words and carrying it into a sentence. The app gives actionable, appropriately cautious feedback and revisits the target later to check retention.

## 3. Product principles

1. **Separate perception from production.** Train listening discrimination and speech production as related but distinct skills. A listening gain is not assumed to prove a production gain.
2. **Use a progression, not a single score.** Sound → word → phrase/sentence → connected speech → meaningful communication. The early MVP stops before open-ended communication.
3. **Make feedback local and explanatory.** Mark the affected part of a word, explain the target and the learner's likely production, and give a practical next attempt.
4. **Represent uncertainty honestly.** A speech model's output is a hypothesis about acoustic evidence, not an unquestionable fact. If the system is unsure, it asks for another attempt or offers a less specific observation instead of asserting an error.
5. **Teach words through use.** A short Vietnamese gloss can bootstrap understanding, but the learning path should connect English form, sound, examples, repeated encounters, retrieval, and productive use. It should not require translating every sentence into Vietnamese and back.
6. **Let the learner choose the explanation language.** Provide Vietnamese or English explanations as a user setting, switchable at any time. Do not switch automatically based on a guessed proficiency level.
7. **Treat accent and intelligibility separately.** The goal is clear communication and preservation of meaningful sound contrasts, not imitation of a single native accent.
8. **Zero-spend MVP.** Keep API/model use within a currently free allowance or run models locally. A paid fallback requires a separate later decision.

## 4. Learning-target and context model

The learner can eventually start from a sound, word, phrase/sentence, or grammar construction. A topic such as travel or work is a context for examples, not the same kind of target as a phoneme or sentence pattern.

| Concept | Examples | Role |
|---|---|---|
| Learning target | Sound contrast /ɪ/–/iː/, word `ship`, sentence `I bought a ship`, question pattern | What skill or language item the lesson trains |
| Context | Travel, work, university, daily life | Constraints for selecting or generating examples |
| Lesson items | Audio tokens, words, phrases, sentences, prompts | Activities that train the target in the selected context |

**MVP proposal:** support one selected sound contrast as the learning target and a small, reviewed set of real words/sentences as lesson items. Context selection and arbitrary topic generation are later scope unless needed to supply safe, useful sentence examples.

## 5. Proposed learning architecture

### Stage A — Perception: hear and distinguish

- Present a target contrast in words (for example, /ɪ/ vs /iː/ using an appropriate minimal pair).
- Ask the learner to identify what they heard; do not begin with listen-and-repeat alone.
- Vary speakers and phonetic contexts across practice to reduce dependence on one voice or one word.
- Give immediate corrective feedback and replay options.
- Track accuracy by target and distinguish trained examples from transfer to new examples.

### Stage B — Controlled production: produce the contrast

- Prompt a known sound, word, or short phrase so the expected target is clear.
- Start with a sound or syllable if useful, then move to a word.
- Show target IPA as optional reference, alongside an accessible explanation and audio model.
- Localize the issue (for example, underline the relevant segment in red and show the target in green), but only when evidence supports that localization.
- Explain the difference in learner-facing terms, such as likely vowel length/quality contrast. Avoid inventing mouth or tongue claims without a validated acoustic/articulatory basis.

### Stage C — Contextual production: carry the contrast into a sentence

- Move from clearly articulated word practice to a sentence containing the word.
- First confirm the target sound remains distinguishable in a sentence prompt.
- Later lessons can teach lexical stress, sentence stress, rhythm, reduction, linking, and chunking as separate dimensions.
- Do not score naturalness with a single pronunciation number.

### Stage D — Meaningful production and review (later)

- Add short learner-generated sentences or responses after controlled practice is reliable.
- Revisit the target after a delay and use new speakers/items to check retention and generalization.
- Add optional sentence-structure and writing activities in a later product phase.

## 6. Feedback contract

When production diagnosis is available, each result should distinguish:

- **Target:** the intended sound/word segment.
- **Observed evidence:** what the system can support from the recording (for example, “closer to /iː/ than /ɪ/”).
- **Confidence:** high, medium, or insufficient. The meaning of these levels must be calibrated on Vietnamese learner speech before release.
- **Next attempt:** one concrete adjustment or a replay/contrast exercise.

If confidence is insufficient, the UI should say the system could not diagnose the attempt reliably and invite a retry. It should not claim “you said phoneme X” merely because a speech recognizer transcribed a different word.

The visual convention requested by the user is: target/correct segment in green; likely error in red with an underline. This styling must not imply certainty when the diagnostic confidence is low.

## 6A. Model and service strategy under the zero-spend constraint

Use each model only for the task its documented output supports:

| Task | First option to evaluate | What it can support | Limit / guardrail |
|---|---|---|---|
| Generate sample voice audio | Gemini 3.8 Flash-Lite TTS free tier | Turn a reviewed text item into audio; the current Google pricing page lists free input/output for this model | It generates reference audio; it does not assess the learner's pronunciation. Free-tier audio may be used by Google to improve products. Prefer reviewed/pre-generated clips and obtain consent before sending learner recordings to a service. |
| Transcribe learner recording | Gemini 3.5 Transcribe free tier, or Google Cloud Speech-to-Text free allowance | Produce text, word timestamps, language/speaker information where supported | A transcript or word timestamp does not prove which phoneme the learner produced. Google Cloud Speech-to-Text currently lists 60 minutes/month free, then charges by processed audio; enforce a local no-overage cap. |
| General audio analysis / lesson help | Gemini audio understanding on a model with an active free tier | Ask questions about audio, transcribe/summarize, and return text | Treat phoneme diagnosis from a prompted general model as an experiment, not a production truth. Validate against human labels first. |
| Contextual sentence drafts and explanations | Gemini API free tier | Draft examples and explanations subject to the model's active free-tier rate limits | Review or constrain generated content; do not assume the user's Gemini app subscription automatically provides API quota. |
| Detailed phoneme diagnosis without a suitable free hosted API | Local open-source speech/phonetic models as an experiment | Avoid per-call API charges; allow repeatable local evaluation | Requires compatible hardware and technical evaluation. ASR/forced alignment alone is not a pronunciation judge. |

Current references indicate Gemini API free-tier availability is model-specific, with per-project/per-model RPM, TPM, and daily limits; quota exhaustion returns errors rather than guaranteeing service availability. Google's free Gemini tier states submitted content may be used to improve products. The app should meter requests locally, avoid retries that create request storms, and stop at the free allowance. ChatGPT Plus is not API credit; OpenAI bills API usage separately.

**Decision:** Use free models and services for prototyping only. For the learner-facing MVP, prefer a simple perception task that can be graded deterministically plus a production-analysis experiment behind a replaceable adapter. Ship phoneme-level red/green error claims only after validation on Vietnamese beginner speech. Do not add paid Azure or other paid assessment services to the MVP.

## 7. MVP definition

### MVP question

Can the app help a Vietnamese-speaking beginner move from “I cannot reliably hear this contrast” to “I can distinguish it, produce it in controlled words, and preserve it in a prompted sentence,” with measurable retention or transfer?

### Proposed MVP scope

- One carefully selected English sound contrast; `/ɪ/`–`/iː/` is a candidate based on the user's examples, not a final choice.
- A short baseline perception activity.
- Perception training with multiple recorded examples and speakers, varied word contexts, and trial feedback.
- Controlled production prompts for known words and a small sentence set.
- Confidence-aware, localized production feedback; abstain when diagnosis is uncertain.
- API/model usage constrained to free-tier quotas, trials, or local open-source runtime; no paid-tier fallback.
- Simple learner progress by perception and production, without a combined pronunciation score.
- Vietnamese/English explanation-language setting.
- A delayed revisit or follow-up check for the trained contrast.

### Out of scope for MVP

- Free-form speech diagnosis or open conversation.
- A general-purpose course builder for arbitrary topics, words, sentences, and grammar targets.
- Grammar instruction, writing correction, or all four skills.
- Full sentence prosody scoring, native-accent imitation, or a single overall pronunciation score.
- Automatic claims about tongue/lip placement based only on an ASR transcript.

These exclusions are proposed MVP boundaries, not yet user-confirmed product decisions.

## 8. MVP success measures and acceptance criteria

Thresholds require a pilot and should not be invented before testing. The MVP should report at least:

1. **Perception gain:** baseline-to-post-training change on held-out tokens and, where feasible, an unfamiliar speaker.
2. **Production contrast:** whether trained productions preserve the target contrast, assessed independently of the app's own feedback model during validation.
3. **Transfer:** whether the learner can produce the contrast in prompted sentence reading, not only isolated trained words.
4. **Retention:** whether the gain remains at a delayed revisit.
5. **Feedback trustworthiness:** error localization/confidence calibration on Vietnamese learner recordings, including how often the app abstains when uncertain.

The MVP is not ready for a learner pilot until the feedback has been checked against human-reviewed recordings. Passing the app's own score is not sufficient evidence of pronunciation improvement.

## 9. Risks, assumptions, and open decisions

| Item | Status | Why it matters / next action |
|---|---|---|
| Zero API/model spend for MVP | User-approved constraint | Only use free-tier allowances, free trials, or locally run open-source tools; block paid fallback. |
| Reliable phoneme-level error localization | Unknown / high risk | Validate against Vietnamese beginner recordings and human ratings; allow abstention. |
| First target sound contrast | Proposed | Select a useful contrast with appropriate words, audio, and evaluation materials. |
| Multiple speakers and phonetic contexts | Proposed for MVP | Research supports perceptual HVPT, but exact task design should be piloted for this learner and target. |
| Confidence labels and thresholds | Proposed | Define calibration method before presenting confidence as meaningful. |
| Context selection or sentence generation | Later scope / unresolved | Curated examples may be safer initially; decide whether and how user-selected topics enter lessons. |
| Natural sentence rhythm and reduction | Later phase | Define target dimensions and appropriate evaluation before scoring connected speech. |
| Success thresholds | Unresolved | Set after a baseline and small pilot, not from a generic score. |
| Language of explanation | User-approved | User chooses Vietnamese or English and can switch at any time. |

## 10. Research notes

These sources support the learning design, but do not prove that SpeakLoop's implementation will work:

- A 2025 meta-analysis of 79 HVPT studies reports medium-to-large average effects on L2 speech perception, with variation across studies. It supports testing multi-talker, varied-context perception practice; it does not prescribe this exact app flow. [Uchihara, Karas & Thomson (2025)](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6)
- A 2024 meta-analysis of 31 studies found small-to-medium production gains from perception-based HVPT, and a negligible perception/production gain correlation at the participant level. This supports tracking and training perception and production separately rather than assuming one guarantees the other. [Uchihara, Karas & Thomson (2024)](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/does-perceptual-high-variability-phonetic-training-improve-l2-speech-production-a-metaanalysis-of-perceptionproduction-connection/E38D8F5CE65DC708137B0E95F97C6BC7)
- A 2025 systematic review of CAPT research reports that studies have focused more on segmental production and listen-and-repeat/read-aloud than on suprasegmentals and global intelligibility/comprehensibility. This is a gap worth considering later, not a reason to include every dimension in MVP. [Neri, Cucchiarini & Strik (2025)](https://www.cambridge.org/core/journals/recall/article/computerassisted-pronunciation-training-a-systematic-review/71E786F7DFC99727837909FDED7A2320)
- A study comparing translation and context-based vocabulary learning found advantages for translations in quantity of recalled words, while learners with lower proficiency had difficulty transferring that knowledge into L2 contexts. A separate study found contextual diversity improved recall and recognition. This supports using a Vietnamese gloss as optional scaffolding while teaching words through examples and retrieval. [Prince (1996)](https://onlinelibrary.wiley.com/doi/10.1111/j.1540-4781.1996.tb05468.x) · [Frances et al. (2020)](https://www.nature.com/articles/s41598-020-70922-1)

### Current free-tier capability scan (checked 2026-10-17)

- Google lists Gemini 3.8 Flash-Lite TTS with free input/output pricing. It produces spoken audio from text; it is not a pronunciation-assessment result. [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) · [Gemini speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- Gemini audio understanding can answer questions about audio and transcribe speech; Gemini 3.5 Transcribe provides word timestamps and speaker diarization in supported modes. The documented outputs do not include phoneme-level pronunciation assessment. [Audio understanding](https://ai.google.dev/gemini-api/docs/audio) · [Audio transcription](https://ai.google.dev/gemini-api/docs/transcribe)
- Google Cloud Speech-to-Text lists 60 free audio minutes monthly, then paid per-minute processing. Do not call beyond a local monthly cap. [Speech-to-Text pricing](https://cloud.google.com/speech-to-text/pricing)
- Gemini API free access is model-dependent and has rate limits by requests/tokens/time. The current free tier may use submitted content to improve Google products. [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [Free-tier pricing and data use](https://ai.google.dev/gemini-api/docs/pricing)
- ChatGPT Plus does not include API calls; those are billed separately. [OpenAI Help Center](https://help.openai.com/en/articles/6950777-what-is-chatgpt-plus)

## 11. Next product decisions

Before implementation, confirm:

1. The first target contrast and whether the first release should be `/ɪ/` vs `/iː/`.
2. Whether the MVP may use reviewed fixed lesson items and audio, or must accept arbitrary user-entered targets immediately.
3. The evaluation plan and acceptable diagnosis/abstention rate for production feedback.
4. Whether the proposed MVP boundary (one contrast, perception + controlled production + prompted sentence, no grammar/writing) is approved.
5. Which free/local speech-analysis candidates to benchmark first and what data may be sent to them.
