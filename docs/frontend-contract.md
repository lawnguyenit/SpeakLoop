# SpeakLoop private-alpha API/UI contract

Status: implementation contract for the local listening/self-comparison alpha. Pronunciation diagnosis stays disabled until independent validation. This allows the learning loop to proceed while research continues.

## Runtime and ownership

- Backend: `http://127.0.0.1:8765`, FastAPI, SQLite under `.local/`.
- Frontend: React/TypeScript + Vite in `frontend/`. Dev proxy `/api` to backend; dev port 5178. Production build served by FastAPI at `/`.
- Antigravity owns only `frontend/**`; Codex owns backend, content, contracts, tests and Git. Do not run Git mutations or edit shared/backend files from Antigravity.
- A single local user; no signup/payment flow. No voice upload to third-party services and no stored raw recording. On stopping a take, the browser sends it to the local backend for physical checks and optional local ASR, and retains a memory-only copy for playback until leaving the prompt.

## Endpoints and shapes

### GET /api/health

`{status:"ok", diagnosis_ready:false, reference_audio_ready:boolean, reference_audio_reviewed:false, local_asr_available:boolean}`. Preview/reference-review status must be visible without implying acoustic validation.

### GET /api/lesson

`{id:"ih-ee-v1", title:{vi,en}, contrast:["/ɪ/","/iː/"], reference_accent:"en-US", pairs:[{id,words:[{id,text,ipa,meaning_vi,meaning_en}]}], explanation:{vi,en}, production_guidance:{vi,en}, audio_reviewed:false}`. Word glosses follow the selected explanation language.

### GET /api/settings; PUT /api/settings

`{language:"vi"|"en"}`. PUT accepts the same field. Language is user-controlled throughout.

### POST /api/sessions

Body `{mode:"baseline"|"practice"|"review",language:"vi"|"en"}`. Returns a session view (below). New session has 8 listening trials, 2 word prompts and 2 sentence prompts. These short alpha activities do not replace the research protocol's longer evaluation forms.

### GET /api/sessions/{id}

```json
{
  "id":"uuid",
  "mode":"practice",
  "language":"vi",
  "phase":"perception",
  "current":1,
  "total":8,
  "trial":{"id":"opaque-id","audio_url":"/api/audio/token.wav","options":[{"id":"ship","text":"ship","ipa":"/ʃɪp/"},{"id":"sheep","text":"sheep","ipa":"/ʃiːp/"}]},
  "prompt":null,
  "perception":{"correct":0,"total":0,"accuracy":null},
  "production_attempts":0,
  "can_advance":false,
  "review_due_at":null
}
```

Phases: `perception`, `word`, `sentence`, `complete`. `trial` is present only for perception; `prompt` only for word/sentence. Prompt shape: `{id,text,target_word,target_ipa,segment_start,segment_end,audio_url,guidance:{vi,en}}`. Offsets are Unicode code-point offsets; current English prompts use ASCII spelling. Current/total are per phase, 1-based; complete returns 0/0. Per-session `perception.correct` is `number|null`: baseline/review scores stay null until session completion, including in progress-history responses. Aggregate progress counts only visible scores.

### POST /api/sessions/{id}/answers

Body `{trial_id,option_id}`. Returns `{correct:boolean|null,correct_option_id:string|null,session:<updated view>}`. Practice reveals immediate correctness; baseline/review hide it until the final score. Repeating the same trial/choice is idempotent; different answer to an already answered trial returns 409. Unrecognized/stale IDs must not advance the session. Show feedback for the previous question before continuing the updated session view, including playback of the prior example if desired.

### POST /api/sessions/{id}/recordings

Multipart `file` = PCM16 mono WAV, 16 kHz (up to 15 s / 10 MiB), `prompt_id`, `attempt_id` = browser-generated UUID. Return `{attempt_id,decision:"abstain"|"invalid_audio",reason,feedback:{vi,en},audio_quality:{...},transcript:string|null,latency_ms,diagnosis_ready:false}`. A physical check failure returns a safe retry explanation; no phoneme verdict. Valid recordings may return a local ASR transcript, which must be labeled approximate. Never turn transcript mismatch into red/green pronunciation highlighting. Repeated same attempt/prompt/audio returns the cached safe result; differing content under the same ID returns 409. Audio is discarded after processing; only safe attempt metadata persists.

Use Web Audio recording and resample/encode locally to 16 kHz PCM16 WAV; do not depend on native MediaRecorder WebM being accepted by the backend. Provide mic permission denied/unsupported feedback and a stop limit. Keep a local Blob/object URL for self-playback; revoke URLs and stop microphone tracks when leaving the activity. No auto-recording on page load.

Production session views include `can_advance:boolean`, derived from previously stored non-invalid attempts for the current prompt. Use it to keep Next available after a reload/resume; it does not imply a correct pronunciation. It is false outside production phases.

### POST /api/sessions/{id}/advance

Body `{prompt_id}`; returns updated session view. Advances production to the next prompt/phase. Requires at least one non-invalid recording on this prompt. Label it as moving on after practice, never “pronunciation passed.” Invalid/missing prompt returns 409; no progress mutation. Complete session schedules revisit 7 days later.

### GET /api/progress

`{sessions_started,sessions_completed,perception:{correct,total,accuracy},production:{attempts,diagnosis_ready:false},reviews_due,next_review_at,sessions:[{id,mode,phase,created_at,completed_at,review_due_at,perception:{correct,total,accuracy}}]}`. Show listening score separately from production attempt counts; no total pronunciation score. Link resumable sessions using GET session.

### GET /api/audio/{token_id}.wav

Serves only registered lesson assets. No arbitrary filesystem paths. Unavailable assets: 503 with safe error; unknown token: 404. Reference clips are generated offline and marked preview until reviewed.

## Errors

All application errors: `{error:{code,message:{vi,en},request_id}}`. Expected statuses: 400 malformed activity request, 404 missing session/asset, 409 activity conflict, 413 recording too large, 422 body validation, 503 unavailable audio. Keep prior progress on network error and offer retry. Use relative `/api` URLs; do not place keys in frontend code.

## Screen flow

1. Home: contrast overview, short explanation, baseline/practice/review start, recent/resumable sessions and language toggle.
2. Listening: large replay button, two answer choices, per-phase progress, practice-only feedback. Do not display an answer before response.
3. Word: target word/IPA, reference playback, one practical general instruction, record/stop, waveform/level if feasible, self-playback, optional local transcript, uncertainty message and next-prompt action.
4. Sentence: same interaction, target word emphasized neutrally; explain preserving the contrast in context.
5. Completion: listening score, number of recorded practices, revisit date, return home. Production accuracy remains unavailable.

Design for Vietnamese beginners, desktop and phone, keyboard access, understandable mic states, and readable contrast. Use a focused study workspace rather than a chat transcript. No account, billing, grammar/writing or arbitrary lesson generator in this alpha.
