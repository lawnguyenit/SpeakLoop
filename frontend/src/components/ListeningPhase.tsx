import React, { useEffect, useRef, useState } from 'react';
import { api, SpeakLoopApiError } from '../api';
import { formatModeName, pickText, UI_COPY } from '../i18n';
import { AnswerResponse, Language, SessionView, TrialOption } from '../types';

interface ListeningPhaseProps {
  session: SessionView;
  lang: Language;
  onSessionUpdated: (nextSession: SessionView) => void;
  onError: (err: SpeakLoopApiError, retryFn?: () => void) => void;
  onClearError: () => void;
}

interface PendingFeedbackState {
  trialId: string;
  trialNumber: number;
  trialTotal: number;
  audioUrl: string;
  options: TrialOption[];
  selectedOptionId: string;
  correct: boolean | null;
  correctOptionId: string | null;
  nextSession: SessionView;
}

export const ListeningPhase: React.FC<ListeningPhaseProps> = ({
  session,
  lang,
  onSessionUpdated,
  onError,
  onClearError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedCurrent, setHasPlayedCurrent] = useState(false);
  const [submittingOptionId, setSubmittingOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<PendingFeedbackState | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrial = session.trial;
  const displayedAudioUrl = feedbackState ? feedbackState.audioUrl : activeTrial?.audio_url ?? '';
  const displayedCurrent = feedbackState ? feedbackState.trialNumber : session.current;
  const displayedTotal = feedbackState ? feedbackState.trialTotal : session.total;

  // Stop audio when trial or phase changes
  useEffect(() => {
    setIsPlaying(false);
    setHasPlayedCurrent(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [activeTrial?.id, feedbackState?.trialId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayAudio = async (urlToPlay?: string) => {
    const targetUrl = urlToPlay || displayedAudioUrl;
    if (!targetUrl) return;
    onClearError();

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.pause();
      audio.src = targetUrl;
      audio.currentTime = 0;

      audio.onplay = () => {
        setIsPlaying(true);
        setHasPlayedCurrent(true);
      };
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onerror = async () => {
        setIsPlaying(false);
        const apiErr = await api.checkAudioEndpointError(targetUrl);
        onError(apiErr, () => void handlePlayAudio(targetUrl));
      };

      await audio.play();
    } catch {
      setIsPlaying(false);
      const apiErr = await api.checkAudioEndpointError(targetUrl);
      onError(apiErr, () => void handlePlayAudio(targetUrl));
    }
  };

  const handleSelectOption = async (optionId: string) => {
    if (!activeTrial || submittingOptionId || feedbackState) return;
    onClearError();
    setSubmittingOptionId(optionId);

    const trialSnapshot = activeTrial;
    const currentNumber = session.current;
    const totalNumber = session.total;

    try {
      const res: AnswerResponse = await api.submitAnswer(session.id, trialSnapshot.id, optionId);
      setSubmittingOptionId(null);
      setFeedbackState({
        trialId: trialSnapshot.id,
        trialNumber: currentNumber,
        trialTotal: totalNumber,
        audioUrl: trialSnapshot.audio_url,
        options: trialSnapshot.options,
        selectedOptionId: optionId,
        correct: res.correct,
        correctOptionId: res.correct_option_id,
        nextSession: res.session,
      });
    } catch (err) {
      setSubmittingOptionId(null);
      if (err instanceof SpeakLoopApiError) {
        if (err.status === 409) {
          // Resync session on conflict without blindly advancing on unrecognized IDs
          onError(err, async () => {
            try {
              const refreshed = await api.getSession(session.id);
              onSessionUpdated(refreshed);
              onClearError();
            } catch (syncErr) {
              if (syncErr instanceof SpeakLoopApiError) {
                onError(syncErr);
              }
            }
          });
        } else {
          onError(err, () => void handleSelectOption(optionId));
        }
      }
    }
  };

  const handleContinueAfterFeedback = () => {
    if (!feedbackState) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const next = feedbackState.nextSession;
    setFeedbackState(null);
    onSessionUpdated(next);
  };

  // Keyboard shortcuts: 1 / 2 to pick option, R to replay, Enter to continue after feedback
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (feedbackState) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleContinueAfterFeedback();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          void handlePlayAudio(feedbackState.audioUrl);
        }
        return;
      }
      if (!activeTrial || submittingOptionId) return;
      if (e.key === '1' && activeTrial.options[0]) {
        e.preventDefault();
        void handleSelectOption(activeTrial.options[0].id);
      } else if (e.key === '2' && activeTrial.options[1]) {
        e.preventDefault();
        void handleSelectOption(activeTrial.options[1].id);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void handlePlayAudio(activeTrial.audio_url);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!activeTrial && !feedbackState) {
    return null;
  }

  const optionsToRender = feedbackState ? feedbackState.options : activeTrial?.options ?? [];
  const progressPct = displayedTotal > 0 ? Math.min(100, Math.round((displayedCurrent / displayedTotal) * 100)) : 0;
  const isPracticeMode = session.mode === 'practice';

  return (
    <section className="study-card" aria-labelledby="listening-stage-heading">
      <div className="phase-header">
        <div>
          <div className="phase-badges">
            <span className="badge badge-teal">{pickText(UI_COPY.phases.perception, lang)}</span>
            <span className="badge badge-neutral">{formatModeName(session.mode, lang)}</span>
            <span className="badge badge-amber">
              {session.perception.correct !== null
                ? lang === 'vi'
                  ? `Đúng: ${session.perception.correct}/${session.perception.total}`
                  : `Correct: ${session.perception.correct}/${session.perception.total}`
                : lang === 'vi'
                ? `Điểm ẩn tới cuối phiên (${session.perception.total} đã chọn)`
                : `Score hidden until end (${session.perception.total} answered)`}
            </span>
          </div>
          <h2 id="listening-stage-heading" className="phase-title">
            {isPracticeMode
              ? pickText(UI_COPY.listening.instructionPractice, lang)
              : pickText(UI_COPY.listening.instructionBlind, lang)}
          </h2>
        </div>
        <div className="phase-counter" aria-live="polite">
          <span className="counter-num">
            {displayedCurrent} / {displayedTotal}
          </span>
        </div>
      </div>

      <div className="progress-track" role="progressbar" aria-valuenow={displayedCurrent} aria-valuemin={1} aria-valuemax={displayedTotal}>
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Large audio listen / replay area */}
      <div className="audio-hero-box">
        <button
          type="button"
          className={`btn-audio-hero ${isPlaying ? 'is-playing' : ''}`}
          onClick={() => void handlePlayAudio(displayedAudioUrl)}
        >
          <span className="audio-icon" aria-hidden="true">
            {isPlaying ? '🔊' : '▶️'}
          </span>
          <span className="audio-btn-text">
            {isPlaying
              ? pickText(UI_COPY.listening.playingButton, lang)
              : hasPlayedCurrent || feedbackState
              ? pickText(UI_COPY.listening.replayButton, lang)
              : pickText(UI_COPY.listening.playButton, lang)}
          </span>
        </button>
        <div className="audio-preview-caption">
          <span>{pickText(UI_COPY.production.previewAudioTag, lang)}</span>
          <span className="dot-sep">•</span>
          <span>{lang === 'vi' ? 'Phím tắt: R để nghe lại' : 'Shortcut: R to replay'}</span>
        </div>
      </div>

      {/* Answer Options */}
      <div className="options-section">
        <p className="options-prompt-label">{pickText(UI_COPY.listening.choosePrompt, lang)}</p>
        <div className="options-grid">
          {optionsToRender.map((opt, idx) => {
            const isSelected = feedbackState?.selectedOptionId === opt.id;
            const isSubmittingThis = submittingOptionId === opt.id;
            const isPracticeCorrectOption =
              feedbackState && feedbackState.correct !== null && feedbackState.correctOptionId === opt.id;
            const isPracticeWrongSelected =
              feedbackState && feedbackState.correct === false && isSelected;

            let cardStateClass = '';
            if (isPracticeCorrectOption) {
              cardStateClass = 'option-card-correct';
            } else if (isPracticeWrongSelected) {
              cardStateClass = 'option-card-wrong';
            } else if (isSelected) {
              cardStateClass = 'option-card-selected';
            }

            return (
              <button
                key={opt.id}
                type="button"
                className={`option-choice-card ${cardStateClass}`}
                disabled={Boolean(submittingOptionId) || Boolean(feedbackState)}
                onClick={() => void handleSelectOption(opt.id)}
              >
                <span className="option-key-hint" aria-hidden="true">
                  {idx + 1}
                </span>
                <span className="option-word-text">{opt.text}</span>
                <span className="option-word-ipa">{opt.ipa}</span>
                {isSubmittingThis && (
                  <span className="option-status-tag">{pickText(UI_COPY.listening.submitting, lang)}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Banner before advancing to updated session view */}
      {feedbackState && (
        <div
          className={`listening-feedback-panel ${
            feedbackState.correct === true
              ? 'feedback-correct'
              : feedbackState.correct === false
              ? 'feedback-incorrect'
              : 'feedback-neutral'
          }`}
          role="region"
          aria-live="polite"
        >
          <div className="feedback-header-row">
            <h3 className="feedback-title">
              {feedbackState.correct === true
                ? pickText(UI_COPY.listening.feedbackCorrectTitle, lang)
                : feedbackState.correct === false
                ? pickText(UI_COPY.listening.feedbackIncorrectTitle, lang)
                : pickText(UI_COPY.listening.feedbackBlindTitle, lang)}
            </h3>
          </div>

          {feedbackState.correct !== null ? (
            <div className="feedback-details-row">
              {(() => {
                const chosen = feedbackState.options.find((o) => o.id === feedbackState.selectedOptionId);
                const target = feedbackState.options.find((o) => o.id === feedbackState.correctOptionId);
                return (
                  <>
                    <p>
                      <strong>{pickText(UI_COPY.listening.youChose, lang)}</strong>{' '}
                      <span className="inline-word-pill">
                        {chosen ? `${chosen.text} (${chosen.ipa})` : feedbackState.selectedOptionId}
                      </span>
                    </p>
                    {target && (
                      <p>
                        <strong>{pickText(UI_COPY.listening.correctAnswerIs, lang)}</strong>{' '}
                        <span className="inline-word-pill">
                          {target.text} ({target.ipa})
                        </span>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="feedback-blind-note">{pickText(UI_COPY.listening.feedbackBlindBody, lang)}</p>
          )}

          <div className="feedback-actions-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handlePlayAudio(feedbackState.audioUrl)}
            >
              🔊 {pickText(UI_COPY.listening.replayPriorExample, lang)}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinueAfterFeedback}
            >
              {pickText(UI_COPY.listening.nextTrialButton, lang)} →
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
