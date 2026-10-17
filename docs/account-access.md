# Service access checks

Checked 2026-10-17 using the user's requested Microsoft Edge profile. No private account identifier, credential, session cookie or token is stored in this repository.

- **Google AI Studio:** an existing Google session opened successfully, and the Projects page showed an existing project labeled Free tier. The API-key listing did not finish loading reliably. No new project/key was created, no existing secret was copied, and billing was not enabled. The current local path does not require a Gemini key.
- **L2-ARCTIC:** the corpus page exposes an email/name/affiliation form with license acceptance, not Google sign-in. The public example WAV downloaded through Edge successfully despite the workstation's direct HTTP 403. Full corpus registration has not been submitted. Its noncommercial-license constraints and annotation coverage still apply.
- **Public Hugging Face models:** pinned snapshots downloaded without an account or token. ASR and phonetic inference run locally. Authentication does not supply missing human validation labels.
- **Antigravity:** Codex opened the SpeakLoop project, submitted the frontend task and sent integration corrections directly in the conversation titled `SpeakLoop Frontend Implementation`. Antigravity delivered `frontend/**` and confirmed it had stopped editing. Codex then reviewed and integrated the changes, including the production build and Edge walkthrough. Codex owns backend/integration and Git; no user prompt relay was needed.

Future credentials, if actually needed, belong in local ignored configuration or an appropriate OS secret store. The user's authorization to use Google/Edge does not alter the zero-paid-service constraint or permit sending learner voice data to a third-party provider without the agreed data-use decision.
