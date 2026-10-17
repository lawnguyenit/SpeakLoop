# Pronunciation evaluation protocol v1

**Status:** Initial operating protocol for Phase 1A. No diagnostic model has passed it.
**Contrast:** `/ɪ/`–`/iː/`. **Reference audio:** en-US. **Accepted production:** intelligible variants preserving the contrast.
**Owner:** Codex; human annotation requires independent qualified reviewers.

## Claims and labels

The unit of evaluation is one known target vowel in a known word/utterance, not an overall accent score. A sentence with multiple targets must be split into separately labeled target examples before evaluation. Character offsets identify the intended written span, not phoneme timestamps. Acoustic time boundaries, when available, are separate evidence.

| Label | Meaning | Safe output |
|---|---|---|
| `correct` | Target contrast is preserved; includes valid accent variants | Supported-correct claim only from validated evidence, otherwise abstain |
| `substitution` | Reviewers hear clear substitution to the other vowel in this contrast | Specific likely-error claim with correct written span and observed vowel, otherwise abstain |
| `ambiguous` | Intermediate production, disagreement, or insufficient certainty despite usable audio | Abstain; offer replay/self-comparison |
| `unusable` | No speech or recording quality prevents reliable assessment | Invalid-audio retry; never a sound-error claim |

Two independent reviewers annotate without seeing model predictions; record pseudonymous reviewer IDs, agreement, acoustic boundary if available, and observed vowel on clear substitutions. Disagreement remains ambiguous unless adjudicated by a third reviewer. Do not turn intended spelling, forced alignment, ASR output, an LLM answer, or deliberate misreading instructions into human ground truth. A single clear target cannot have `substitution` and an observed vowel identical to its target.

## Benchmark population, splits, and provenance

Goal for the initial collection: 300 human examples across at least 10 speakers, with development (4 speakers), calibration (2), and held-out (4) speakers separated. These are collection targets, not claims about available data. The held-out slice must contain at least 120 clips, including at least 30 each of correct/substitution/ambiguous/unusable, at least two Vietnamese-L1 speakers, at least two devices, and at least one valid accent-variant subset. Include both vowels and word/sentence levels; report all slices. Deliberately noisy derivatives keep their original speaker and split. Do not duplicate an original utterance across splits.

Development is for debugging, calibration is for thresholds/probability fitting, and held-out is opened once for a frozen provider/model/policy version. A failed holdout cannot be reused as a fresh final test after tuning. Freeze the manifest SHA-256, code revision, model revision, decoding settings, policy and thresholds before final inference. Separate held-out lesson items from diagnostic clips; do not train and assess retention on the same recordings.

Every clip needs source kind, source URL or local provenance, license/consent reference, speaker ID, L1 when known, device, noise condition, target text/span, expected class and human labels. Synthetic audio may exercise ingestion and inference but never contributes to diagnostic acceptance counts. Public accessibility is not evidence of consent to third-party upload. All cloud processing defaults to false, including public datasets, until terms are checked for that use. No automatic uploader is included in this milestone.

The official L2-ARCTIC corpus is a possible noncommercial research source with Vietnamese speakers and some manually annotated utterances; forced-aligned portions are not equivalent to human labels. Its complete distribution requires registration and agreement to CC BY-NC 4.0. Do not invent an affiliation, submit personal information, or use an unofficial mirror to bypass its access flow. Public examples can support a local illustrative smoke test under the stated license, but cannot substitute for the planned held-out benchmark. [Corpus owner and access/license information](https://psi.engr.tamu.edu/l2-arctic-corpus/).

## Predeclared decision gates

These refine the earlier provisional plan into initial evaluation rules. They can be revised before provider comparison with a new protocol version. They are product risk tolerances, not universal scientific standards.

| Metric | Definition | Gate |
|---|---|---|
| Error precision | Correctly localized/typed error claims ÷ all likely-error claims | Point estimate ≥95%; Wilson 95% lower bound ≥90%; at least 40 error claims |
| Unsafe claim rate | Any incorrect specific claim, including false reassurance on an ambiguous/unusable clip, ÷ all held-out attempts | ≤5%; report Wilson interval |
| Audio invalid detection | Unusable clips yielding invalid-audio ÷ unusable clips | ≥95% |
| False audio rejection | Clean correct/substitution clips yielding invalid-audio ÷ those clean clips | ≤10% |
| Ambiguous abstention | Ambiguous clips yielding abstain ÷ ambiguous clips | ≥90% |
| Coverage | Specific correct/error claims ÷ usable clips | Report only, overall and per class/speaker/device/level; no minimum |
| Latency | p95 of total record-completion-to-feedback time, including retries | ≤8 s on declared hardware/network; cold start separately |

Missing results, duplicate IDs, unknown IDs and provider errors are not silently discarded. A completed result is required for every evaluated clip; a provider failure is represented as abstention with its reason and latency. Null confidence is allowed. Raw provider confidence is not calibrated confidence. A calibration artifact must identify the provider/model revision, development/calibration data and method before application policy can emit specific claims.

Gate status is `insufficient_evidence` until all held-out population minima and all-human/reviewed provenance requirements are met. Zero claims cannot produce perfect precision. Even a benchmark pass is not user acceptance or proof of learning. The CLI evaluator calculates diagnostic gates; a human still reviews licensing, annotation validity and model/policy provenance before deployment.

## Separate learning questions

- **Q1:** A 20-item baseline without teaching feedback; train on separate items; 20 unseen immediate items; 20 unseen delayed items initially scheduled 7 days later. Counterbalance vowel, word and speaker. Report numerator/denominator and uncertainty, not only percent. One learner is exploratory evidence; watch for baseline ceiling effects.
- **Q2:** Use the diagnostic held-out benchmark above, independently of the learner's training score. If it fails, suppress red/green diagnostic claims; retain reference replay and self-comparison.
- **Q3:** Review matched word and sentence attempts independently; report contrast preservation separately at each level. Do not compare raw ASR accuracy as a pronunciation-transfer metric.

## Audio gate limitations

The first implementation checks PCM16 mono WAV structure, duration, RMS level and clipping. It does not estimate true SNR, detect speech, or prove intelligibility. Passing physical checks returns `needs_speech_check`, never `valid`. Production diagnosis stays disabled until a speech/noise component and its benchmark are available. Invalid/unsupported files get a recording-quality response, never a phoneme conclusion.
