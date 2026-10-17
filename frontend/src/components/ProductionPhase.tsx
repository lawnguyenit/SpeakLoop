import React, { useEffect, useRef, useState } from 'react';
import { api, SpeakLoopApiError } from '../api';
import { formatModeName, pickText, UI_COPY } from '../i18n';
import { Language, ProductionPrompt, RecordingResponse, SessionView } from '../types';
import {
  EncodedWavTake,
  generateUuid,
  MAX_RECORDING_SECONDS,
  RecorderErrorKind,
  WebAudioWavRecorder,
} from '../utils/wavRecorder';

interface ProductionPhaseProps {
  session: SessionView;
  lang: Language;
  onSessionUpdated: (nextSession: SessionView) => void;
  onError: (err: SpeakLoopApiError, retryFn?: () => void) => void;
  onClearError: () => void;
}

/**
 * Splits prompt text by Unicode code-point offsets (`segment_start`, `segment_end`)
 * so the target word can be emphasized neutrally in context.
 */
function splitByCodePoints(
  text: string,
  start: number,
  end: number
): {
  before: string;
  target: string;
  after: string;
} {
  const chars = Array.from(text);
  const safeStart = Math.max(0, Math.min(chars.length, start));
  const safeEnd = Math.max(safeStart, Math.min(chars.length, end));
  return {
    before: chars.slice(0, safeStart).join(''),
    target: chars.slice(safeStart, safeEnd).join(''),
    after: chars.slice(safeEnd).join(''),
  };
}

export const ProductionPhase: React.FC<ProductionPhaseProps> = ({
  session,
  lang,
  onSessionUpdated,
  onError,
  onClearError,
}) => {
  const prompt: ProductionPrompt | null = session.prompt;
  const isSentencePhase = session.phase === 'sentence';

  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [isPlayingSelf, setIsPlayingSelf] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [levelBars, setLevelBars] = useState<number[]>(() => Array(16).fill(0.06));
  const [micErrorKind, setMicErrorKind] = useState<RecorderErrorKind | null>(null);

  const [localTake, setLocalTake] = useState<EncodedWavTake | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingResult, setRecordingResult] = useState<RecordingResponse | null>(null);
  const [hasValidRecordingForPrompt, setHasValidRecordingForPrompt] = useState<boolean>(
    Boolean(session.can_advance)
  );
  const [isAdvancing, setIsAdvancing] = useState(false);

  const recorderRef = useRef<WebAudioWavRecorder | null>(null);
  const refAudioEl = useRef<HTMLAudioElement | null>(null);
  const selfAudioEl = useRef<HTMLAudioElement | null>(null);
  const takeUrlRef = useRef<string | null>(null);
  const mountedPromptRef = useRef<string | null>(prompt?.id ?? null);

  // Sync server-persisted can_advance when session reloads or updates for the same prompt
  useEffect(() => {
    if (session.can_advance) {
      setHasValidRecordingForPrompt(true);
    }
  }, [session.can_advance]);

  // Clean up microphone and object URLs when changing prompt or unmounting
  useEffect(() => {
    mountedPromptRef.current = prompt?.id ?? null;
    setIsPlayingRef(false);
    setIsPlayingSelf(false);
    setIsRequestingMic(false);
    setIsRecording(false);
    setElapsedSec(0);
    setLevelBars(Array(16).fill(0.06));
    setMicErrorKind(null);
    setCurrentAttemptId(null);
    setIsAnalyzing(false);
    setRecordingResult(null);

    let savedValid = Boolean(session.can_advance);
    try {
      if (!savedValid && prompt?.id) {
        savedValid = sessionStorage.getItem(`speakloop.valid.${session.id}.${prompt.id}`) === '1';
      }
    } catch {
      // ignore
    }
    setHasValidRecordingForPrompt(savedValid);
    setIsAdvancing(false);

    if (recorderRef.current) {
      recorderRef.current.cleanupHardware();
    }
    if (refAudioEl.current) {
      refAudioEl.current.pause();
    }
    if (selfAudioEl.current) {
      selfAudioEl.current.pause();
    }
    if (takeUrlRef.current) {
      URL.revokeObjectURL(takeUrlRef.current);
      takeUrlRef.current = null;
    }
    setLocalTake(null);

    return () => {
      mountedPromptRef.current = null;
      if (recorderRef.current) {
        recorderRef.current.cleanupHardware();
      }
      if (refAudioEl.current) {
        refAudioEl.current.pause();
      }
      if (selfAudioEl.current) {
        selfAudioEl.current.pause();
      }
      if (takeUrlRef.current) {
        URL.revokeObjectURL(takeUrlRef.current);
        takeUrlRef.current = null;
      }
    };
  }, [prompt?.id, session.phase, session.id]);

  if (!prompt) {
    return null;
  }

  const handlePlayReference = async () => {
    onClearError();
    if (selfAudioEl.current) {
      selfAudioEl.current.pause();
      setIsPlayingSelf(false);
    }

    try {
      if (!refAudioEl.current) {
        refAudioEl.current = new Audio();
      }
      const audio = refAudioEl.current;
      audio.pause();
      audio.src = prompt.audio_url;
      audio.currentTime = 0;

      audio.onplay = () => setIsPlayingRef(true);
      audio.onended = () => setIsPlayingRef(false);
      audio.onpause = () => setIsPlayingRef(false);
      audio.onerror = async () => {
        setIsPlayingRef(false);
        const apiErr = await api.checkAudioEndpointError(prompt.audio_url);
        onError(apiErr, () => void handlePlayReference());
      };

      await audio.play();
    } catch {
      setIsPlayingRef(false);
      const apiErr = await api.checkAudioEndpointError(prompt.audio_url);
      onError(apiErr, () => void handlePlayReference());
    }
  };

  const handlePlaySelfTake = async () => {
    if (!localTake) return;
    if (refAudioEl.current) {
      refAudioEl.current.pause();
      setIsPlayingRef(false);
    }

    try {
      if (!selfAudioEl.current) {
        selfAudioEl.current = new Audio();
      }
      const audio = selfAudioEl.current;
      audio.pause();
      audio.src = localTake.objectUrl;
      audio.currentTime = 0;

      audio.onplay = () => setIsPlayingSelf(true);
      audio.onended = () => setIsPlayingSelf(false);
      audio.onpause = () => setIsPlayingSelf(false);
      audio.onerror = () => setIsPlayingSelf(false);

      await audio.play();
    } catch {
      setIsPlayingSelf(false);
    }
  };

  const submitWavToLocalhost = async (take: EncodedWavTake, attemptId: string, promptId: string) => {
    setIsAnalyzing(true);
    onClearError();

    try {
      const res = await api.submitRecording(session.id, promptId, attemptId, take.blob);
      if (mountedPromptRef.current !== promptId) return;
      setIsAnalyzing(false);
      setRecordingResult(res);
      if (res.decision !== 'invalid_audio') {
        setHasValidRecordingForPrompt(true);
        try {
          sessionStorage.setItem(`speakloop.valid.${session.id}.${promptId}`, '1');
        } catch {
          // ignore
        }
      }
    } catch (err) {
      if (mountedPromptRef.current !== promptId) return;
      setIsAnalyzing(false);
      if (err instanceof SpeakLoopApiError) {
        onError(err, () => void submitWavToLocalhost(take, attemptId, promptId));
      }
    }
  };

  const finishRecordingWithTake = (take: EncodedWavTake, targetPromptId: string) => {
    if (mountedPromptRef.current !== targetPromptId) {
      URL.revokeObjectURL(take.objectUrl);
      return;
    }
    if (takeUrlRef.current) {
      URL.revokeObjectURL(takeUrlRef.current);
    }
    takeUrlRef.current = take.objectUrl;
    setLocalTake(take);
    setIsRequestingMic(false);
    setIsRecording(false);

    const newAttemptId = generateUuid();
    setCurrentAttemptId(newAttemptId);
    setRecordingResult(null);
    void submitWavToLocalhost(take, newAttemptId, targetPromptId);
  };

  const handleStartRecording = async () => {
    if (isRequestingMic || isRecording || isAnalyzing) return;
    if (recorderRef.current?.isPendingOrRecording()) return;

    onClearError();
    setMicErrorKind(null);

    if (refAudioEl.current) {
      refAudioEl.current.pause();
      setIsPlayingRef(false);
    }
    if (selfAudioEl.current) {
      selfAudioEl.current.pause();
      setIsPlayingSelf(false);
    }

    if (!recorderRef.current) {
      recorderRef.current = new WebAudioWavRecorder();
    }

    const activePromptId = prompt.id;
    setIsRequestingMic(true);
    setElapsedSec(0);
    setLevelBars(Array(16).fill(0.08));

    try {
      await recorderRef.current.start({
        onLevel: (rms, peak, elapsed) => {
          if (mountedPromptRef.current !== activePromptId) return;
          setElapsedSec(elapsed);
          const normalized = Math.min(1, Math.max(0.06, Math.sqrt(rms * 6 + peak * 0.35)));
          setLevelBars((prev) => [...prev.slice(1), normalized]);
        },
        onAutoStop: (take) => {
          finishRecordingWithTake(take, activePromptId);
        },
        onError: (kind) => {
          if (mountedPromptRef.current !== activePromptId) return;
          setIsRequestingMic(false);
          setIsRecording(false);
          setMicErrorKind(kind);
        },
      });
      if (mountedPromptRef.current === activePromptId) {
        setIsRequestingMic(false);
        setIsRecording(true);
      }
    } catch {
      if (mountedPromptRef.current === activePromptId) {
        setIsRequestingMic(false);
        setIsRecording(false);
      }
    }
  };

  const handleStopRecording = () => {
    if (!recorderRef.current) return;
    const take = recorderRef.current.stop();
    if (take) {
      finishRecordingWithTake(take, prompt.id);
    } else {
      setIsRequestingMic(false);
      setIsRecording(false);
    }
  };

  const handleAdvancePrompt = async () => {
    if (isAdvancing || isRecording || isRequestingMic) return;
    onClearError();
    setIsAdvancing(true);

    try {
      const updated = await api.advanceSession(session.id, prompt.id);
      setIsAdvancing(false);
      onSessionUpdated(updated);
    } catch (err) {
      setIsAdvancing(false);
      if (err instanceof SpeakLoopApiError) {
        if (err.status === 409) {
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
          onError(err, () => void handleAdvancePrompt());
        }
      }
    }
  };

  const segments = splitByCodePoints(prompt.text, prompt.segment_start, prompt.segment_end);
  const progressPct =
    session.total > 0 ? Math.min(100, Math.round((session.current / session.total) * 100)) : 0;
  const canAdvancePrompt = Boolean(session.can_advance) || hasValidRecordingForPrompt;

  return (
    <section className="study-card" aria-labelledby="production-stage-heading">
      <div className="phase-header">
        <div>
          <div className="phase-badges">
            <span className="badge badge-teal">
              {pickText(isSentencePhase ? UI_COPY.phases.sentence : UI_COPY.phases.word, lang)}
            </span>
            <span className="badge badge-neutral">{formatModeName(session.mode, lang)}</span>
          </div>
          <h2 id="production-stage-heading" className="phase-title">
            {pickText(
              isSentencePhase
                ? UI_COPY.production.sentenceStageHeader
                : UI_COPY.production.wordStageHeader,
              lang
            )}
          </h2>
        </div>
        <div className="phase-counter" aria-live="polite">
          <span className="counter-num">
            {session.current} / {session.total}
          </span>
        </div>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={session.current}
        aria-valuemin={1}
        aria-valuemax={session.total}
      >
        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Prompt Display Card (Word or Sentence with neutral target highlight) */}
      <div className="prompt-showcase-card">
        {isSentencePhase ? (
          <>
            <p className="sentence-display" aria-label={prompt.text}>
              <span>{segments.before}</span>
              <mark className="neutral-target-highlight">
                {segments.target || prompt.target_word}
              </mark>
              <span>{segments.after}</span>
            </p>
            <div className="target-meta-row">
              <span className="target-meta-label">
                {pickText(UI_COPY.production.targetFocusLabel, lang)}
              </span>
              <span className="target-word-badge">{prompt.target_word}</span>
              <span className="target-ipa-badge">{prompt.target_ipa}</span>
            </div>
            <p className="sentence-context-caption">
              {pickText(UI_COPY.production.sentenceContextNote, lang)}
            </p>
          </>
        ) : (
          <div className="word-display-block">
            <div className="word-hero-text">
              <span>{segments.before}</span>
              <mark className="neutral-target-highlight">{segments.target || prompt.text}</mark>
              <span>{segments.after}</span>
            </div>
            <div className="word-hero-ipa">{prompt.target_ipa}</div>
          </div>
        )}

        <div className="guidance-callout">
          <div className="guidance-callout-title">
            {pickText(UI_COPY.production.guidanceBoxTitle, lang)}
          </div>
          <p className="guidance-callout-body">{pickText(prompt.guidance, lang)}</p>
        </div>
      </div>

      {/* Step 1 & Step 2 Grid */}
      <div className="production-steps-grid">
        {/* Step 1: Listen to Reference */}
        <div className="step-box">
          <h3 className="step-box-title">{pickText(UI_COPY.production.step1ListenModel, lang)}</h3>
          <button
            type="button"
            className={`btn btn-secondary btn-full ${isPlayingRef ? 'is-active-audio' : ''}`}
            onClick={() => void handlePlayReference()}
            disabled={isRecording || isRequestingMic}
          >
            {isPlayingRef
              ? '🔊 ' + pickText(UI_COPY.listening.playingButton, lang)
              : '▶️ ' + pickText(UI_COPY.production.playReferenceBtn, lang)}
          </button>
          <p className="step-box-caption">{pickText(UI_COPY.production.previewAudioTag, lang)}</p>
        </div>

        {/* Step 2: Record Local Voice */}
        <div className="step-box">
          <h3 className="step-box-title">{pickText(UI_COPY.production.step2RecordSelf, lang)}</h3>
          {!isRecording ? (
            <button
              type="button"
              className="btn btn-record btn-full"
              onClick={() => void handleStartRecording()}
              disabled={isRequestingMic || isAnalyzing}
            >
              🎙️{' '}
              {isRequestingMic
                ? pickText(UI_COPY.production.openingMicBtn, lang)
                : localTake
                ? pickText(UI_COPY.production.recordAgainBtn, lang)
                : pickText(UI_COPY.production.startRecordBtn, lang)}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-stop-record btn-full"
              onClick={handleStopRecording}
            >
              ⏹️ {pickText(UI_COPY.production.stopRecordBtn, lang)} ({elapsedSec.toFixed(1)}s / 15s)
            </button>
          )}

          {/* Waveform / Level meter while recording */}
          {isRecording && (
            <div className="live-meter-wrapper" aria-live="off">
              <div className="live-waveform-bars">
                {levelBars.map((val, idx) => (
                  <span
                    key={idx}
                    className="waveform-bar"
                    style={{ height: `${Math.round(val * 100)}%` }}
                  />
                ))}
              </div>
              <div className="recording-timer-bar">
                <div
                  className="recording-timer-fill"
                  style={{
                    width: `${Math.min(100, (elapsedSec / MAX_RECORDING_SECONDS) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="step-box-caption">{pickText(UI_COPY.production.recordingLimitHint, lang)}</p>
        </div>
      </div>

      {/* Microphone Permission / Unsupported Alert */}
      {micErrorKind && (
        <div className="alert-box alert-warning" role="alert">
          <p>
            {micErrorKind === 'permission_denied'
              ? pickText(UI_COPY.production.micPermissionDenied, lang)
              : pickText(UI_COPY.production.micUnsupported, lang)}
          </p>
        </div>
      )}

      {/* Step 3: Self-Playback & Local Analysis Result */}
      {localTake && (
        <div className="self-compare-panel" role="region" aria-live="polite">
          <div className="self-compare-header">
            <h3 className="step-box-title">{pickText(UI_COPY.production.step3SelfCompare, lang)}</h3>
            <span className="wav-tech-badge">
              {lang === 'vi'
                ? `Thời lượng bản thu: ${localTake.durationSeconds.toFixed(1)} giây`
                : `Recording length: ${localTake.durationSeconds.toFixed(1)}s`}
            </span>
          </div>

          <div className="compare-buttons-row">
            <button
              type="button"
              className={`btn btn-primary ${isPlayingSelf ? 'is-active-audio' : ''}`}
              onClick={() => void handlePlaySelfTake()}
              disabled={isRecording || isRequestingMic}
            >
              🎧 {pickText(UI_COPY.production.playMyTakeBtn, lang)}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handlePlayReference()}
              disabled={isRecording || isRequestingMic}
            >
              🔊 {pickText(UI_COPY.production.replayModelSideBySideBtn, lang)}
            </button>
            {!isAnalyzing && !recordingResult && currentAttemptId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void submitWavToLocalhost(localTake, currentAttemptId, prompt.id)}
              >
                ↻ {pickText(UI_COPY.production.retryLocalCheckBtn, lang)}
              </button>
            )}
          </div>

          {isAnalyzing && (
            <div className="analysis-status-box analysis-loading">
              <span>⏳ {pickText(UI_COPY.production.analyzingLocally, lang)}</span>
            </div>
          )}

          {recordingResult && (
            <div
              className={`analysis-status-box ${
                recordingResult.decision === 'invalid_audio' ? 'analysis-invalid' : 'analysis-abstain'
              }`}
            >
              <div className="analysis-header-line">
                <strong>
                  {recordingResult.decision === 'invalid_audio'
                    ? pickText(UI_COPY.production.invalidAudioTitle, lang)
                    : pickText(UI_COPY.production.abstainTitle, lang)}
                </strong>
                <span className="decision-code-pill">
                  {recordingResult.decision === 'invalid_audio'
                    ? pickText(UI_COPY.production.invalidAudioBadge, lang)
                    : pickText(UI_COPY.production.abstainBadge, lang)}
                </span>
              </div>

              <p className="analysis-feedback-text">{pickText(recordingResult.feedback, lang)}</p>

              {/* Optional Local ASR Transcript (strictly labeled approximate, never colors target red/green) */}
              {recordingResult.transcript !== null && recordingResult.transcript !== undefined && (
                <div className="approximate-transcript-box">
                  <div className="transcript-label">
                    {pickText(UI_COPY.production.approximateTranscriptLabel, lang)}
                  </div>
                  <div className="transcript-content">“{recordingResult.transcript || '—'}”</div>
                  <p className="transcript-disclaimer">
                    {pickText(UI_COPY.production.transcriptDisclaimer, lang)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next Prompt Action */}
      <div className="production-footer-bar">
        <p className="advance-hint-text">
          {canAdvancePrompt
            ? pickText(UI_COPY.production.advanceReadyHint, lang)
            : pickText(UI_COPY.production.advanceLockedHint, lang)}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-advance"
          disabled={!canAdvancePrompt || isAdvancing || isRecording || isRequestingMic || isAnalyzing}
          onClick={() => void handleAdvancePrompt()}
        >
          {isAdvancing
            ? pickText(UI_COPY.production.advancingButton, lang)
            : pickText(UI_COPY.production.advanceButton, lang)}{' '}
          →
        </button>
      </div>
    </section>
  );
};
