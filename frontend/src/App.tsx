import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, SpeakLoopApiError } from './api';
import { CompletionPhase } from './components/CompletionPhase';
import { HomeView } from './components/HomeView';
import { ListeningPhase } from './components/ListeningPhase';
import { ProductionPhase } from './components/ProductionPhase';
import { pickText, UI_COPY } from './i18n';
import {
  HealthResponse,
  Language,
  LessonResponse,
  ProgressResponse,
  SessionMode,
  SessionPhase,
  SessionView,
} from './types';

const STORAGE_LANG_KEY = 'speakloop.language';
const STORAGE_SESSION_KEY = 'speakloop.activeSessionId';

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_LANG_KEY);
    if (saved === 'vi' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'vi';
}

function getSavedSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_SESSION_KEY);
  } catch {
    return null;
  }
}

function setSavedSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(getInitialLanguage);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lesson, setLesson] = useState<LessonResponse | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [activeSession, setActiveSession] = useState<SessionView | null>(null);
  const [lastLocalSessionId, setLastLocalSessionId] = useState<string | null>(getSavedSessionId);

  const [isBooting, setIsBooting] = useState<boolean>(true);
  const [startingMode, setStartingMode] = useState<SessionMode | null>(null);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(null);

  const [apiError, setApiError] = useState<SpeakLoopApiError | null>(null);
  const retryFnRef = useRef<(() => void) | undefined>(undefined);
  const userToggledLangRef = useRef<boolean>(false);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleError = useCallback((err: SpeakLoopApiError, retryFn?: () => void) => {
    retryFnRef.current = retryFn;
    setApiError(err);
  }, []);

  const clearError = useCallback(() => {
    retryFnRef.current = undefined;
    setApiError(null);
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    clearError();
    setIsBooting(true);

    const results = await Promise.allSettled([
      api.getHealth(),
      api.getLesson(),
      api.getSettings(),
      api.getProgress(),
    ]);

    const [healthRes, lessonRes, settingsRes, progressRes] = results;

    if (healthRes.status === 'fulfilled') {
      setHealth(healthRes.value);
    }
    if (lessonRes.status === 'fulfilled') {
      setLesson(lessonRes.value);
    }
    if (settingsRes.status === 'fulfilled' && !userToggledLangRef.current) {
      const serverLang = settingsRes.value.language;
      if (serverLang === 'vi' || serverLang === 'en') {
        let hasLocalPref = false;
        try {
          hasLocalPref = Boolean(localStorage.getItem(STORAGE_LANG_KEY));
        } catch {
          // Continue with the server preference when browser storage is unavailable.
        }
        if (!hasLocalPref) {
          setLang(serverLang);
          try {
            localStorage.setItem(STORAGE_LANG_KEY, serverLang);
          } catch {
            // ignore
          }
        }
      }
    }
    if (progressRes.status === 'fulfilled') {
      setProgress(progressRes.value);
    }

    // Surface error if core lesson/progress calls failed
    const rejected = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (rejected && rejected.reason instanceof SpeakLoopApiError) {
      handleError(rejected.reason, () => void loadWorkspaceData());
    }

    setIsBooting(false);
  }, [clearError, handleError]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleToggleLanguage = async (nextLang: Language) => {
    userToggledLangRef.current = true;
    setLang(nextLang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, nextLang);
    } catch {
      // ignore
    }

    try {
      await api.putSettings(nextLang);
    } catch (err) {
      if (err instanceof SpeakLoopApiError) {
        handleError(err, () => void handleToggleLanguage(nextLang));
      }
    }
  };

  const handleSessionUpdated = useCallback((nextSession: SessionView) => {
    setActiveSession(nextSession);
    if (nextSession.phase === 'complete') {
      setSavedSessionId(null);
      setLastLocalSessionId(null);
      void api.getProgress().then(setProgress).catch(() => {});
    } else {
      setSavedSessionId(nextSession.id);
      setLastLocalSessionId(nextSession.id);
    }
  }, []);

  const handleStartSession = async (mode: SessionMode) => {
    if (startingMode) return;
    clearError();
    setStartingMode(mode);

    try {
      const session = await api.createSession(mode, lang);
      setStartingMode(null);
      handleSessionUpdated(session);
    } catch (err) {
      setStartingMode(null);
      if (err instanceof SpeakLoopApiError) {
        handleError(err, () => void handleStartSession(mode));
      }
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    if (resumingSessionId) return;
    clearError();
    setResumingSessionId(sessionId);

    try {
      const session = await api.getSession(sessionId);
      setResumingSessionId(null);
      handleSessionUpdated(session);
    } catch (err) {
      setResumingSessionId(null);
      if (err instanceof SpeakLoopApiError) {
        if (err.status === 404 && sessionId === lastLocalSessionId) {
          setSavedSessionId(null);
          setLastLocalSessionId(null);
        }
        handleError(err, () => void handleResumeSession(sessionId));
      }
    }
  };

  const handleReturnHome = () => {
    clearError();
    setActiveSession(null);
    void api.getProgress().then(setProgress).catch(() => {});
  };

  const phaseSteps: SessionPhase[] = ['perception', 'word', 'sentence', 'complete'];

  return (
    <div className="app-shell">
      {/* Top Navigation & Persistent Controls */}
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="brand-group">
            <button
              type="button"
              className="brand-logo-btn"
              onClick={handleReturnHome}
              title={pickText(UI_COPY.nav.returnHome, lang)}
            >
              <span className="brand-mark" aria-hidden="true">
                SL
              </span>
              <span className="brand-name">{UI_COPY.appName}</span>
            </button>
            <span className="privacy-pill">{pickText(UI_COPY.privacyBadge, lang)}</span>
          </div>

          <div className="top-bar-controls">
            {activeSession && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleReturnHome}>
                ← {pickText(UI_COPY.nav.returnHome, lang)}
              </button>
            )}

            <div
              className="lang-segmented"
              role="group"
              aria-label={pickText(UI_COPY.langToggleLabel, lang)}
            >
              <button
                type="button"
                className={`lang-btn ${lang === 'vi' ? 'is-active' : ''}`}
                aria-pressed={lang === 'vi'}
                onClick={() => void handleToggleLanguage('vi')}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'en' ? 'is-active' : ''}`}
                aria-pressed={lang === 'en'}
                onClick={() => void handleToggleLanguage('en')}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alpha Transparency & Health Strip */}
      <div className="alpha-honesty-strip">
        <div className="alpha-honesty-inner">
          <span className="honesty-item">
            <span className="status-dot dot-amber" aria-hidden="true" />
            {pickText(UI_COPY.statusBanner.diagnosisDisabled, lang)}
          </span>
          {(!health || !health.reference_audio_reviewed) && (
            <span className="honesty-item">
              <span className="status-dot dot-amber" aria-hidden="true" />
              {pickText(UI_COPY.statusBanner.previewAudioNotReviewed, lang)}
            </span>
          )}
          {health && (
            <span className="honesty-item">
              <span
                className={`status-dot ${health.local_asr_available ? 'dot-teal' : 'dot-neutral'}`}
                aria-hidden="true"
              />
              {pickText(
                health.local_asr_available
                  ? UI_COPY.statusBanner.localAsrReady
                  : UI_COPY.statusBanner.localAsrUnavailable,
                lang
              )}
            </span>
          )}
          {health && !health.reference_audio_ready && (
            <span className="honesty-item honesty-warn">
              ⚠️ {pickText(UI_COPY.statusBanner.refAudioMissing, lang)}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <main className="main-container">
        {/* Global Safe Error Banner */}
        {apiError && (
          <div className="error-banner" role="alert">
            <div className="error-banner-body">
              <span className="error-message-text">
                {pickText(apiError.localizedMessage, lang)}
              </span>
            </div>
            <div className="error-banner-actions">
              {retryFnRef.current && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const fn = retryFnRef.current;
                    if (fn) fn();
                  }}
                >
                  ↻ {pickText(UI_COPY.errors.retryBtn, lang)}
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearError}>
                {pickText(UI_COPY.errors.dismissBtn, lang)}
              </button>
            </div>
          </div>
        )}

        {/* Active Session Stage Stepper */}
        {activeSession && (
          <nav className="session-stepper" aria-label="Session stage progress">
            {phaseSteps.map((step, index) => {
              const currentIndex = phaseSteps.indexOf(activeSession.phase);
              const isCurrent = step === activeSession.phase;
              const isDone = index < currentIndex;
              return (
                <div
                  key={step}
                  className={`stepper-item ${isCurrent ? 'is-current' : ''} ${
                    isDone ? 'is-done' : ''
                  }`}
                >
                  <span className="stepper-circle">{isDone ? '✓' : index + 1}</span>
                  <span className="stepper-label">{pickText(UI_COPY.phases[step], lang)}</span>
                </div>
              );
            })}
          </nav>
        )}

        {/* Screen Router */}
        {!activeSession ? (
          isBooting && !lesson && !progress ? (
            <div className="study-card loading-skeleton" aria-busy="true">
              <p>
                {lang === 'vi'
                  ? 'Đang tải bài học và tiến độ từ máy chủ cục bộ...'
                  : 'Loading lesson and progress from local server...'}
              </p>
            </div>
          ) : (
            <HomeView
              lesson={lesson}
              progress={progress}
              health={health}
              lang={lang}
              startingMode={startingMode}
              resumingSessionId={resumingSessionId}
              lastLocalSessionId={lastLocalSessionId}
              onStartSession={(mode) => void handleStartSession(mode)}
              onResumeSession={(id) => void handleResumeSession(id)}
            />
          )
        ) : activeSession.phase === 'perception' ? (
          <ListeningPhase
            session={activeSession}
            lang={lang}
            onSessionUpdated={handleSessionUpdated}
            onError={handleError}
            onClearError={clearError}
          />
        ) : activeSession.phase === 'word' || activeSession.phase === 'sentence' ? (
          <ProductionPhase
            session={activeSession}
            lang={lang}
            onSessionUpdated={handleSessionUpdated}
            onError={handleError}
            onClearError={clearError}
          />
        ) : (
          <CompletionPhase
            session={activeSession}
            lang={lang}
            onReturnHome={handleReturnHome}
            onStartNewSession={(mode) => void handleStartSession(mode)}
          />
        )}
      </main>
    </div>
  );
};
