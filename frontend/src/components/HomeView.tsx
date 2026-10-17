import React from 'react';
import {
  formatAccuracy,
  formatDateTime,
  formatModeName,
  formatPhaseName,
  pickText,
  UI_COPY,
} from '../i18n';
import {
  HealthResponse,
  Language,
  LessonResponse,
  ProgressResponse,
  SessionMode,
  SessionSummary,
} from '../types';

interface HomeViewProps {
  lesson: LessonResponse | null;
  progress: ProgressResponse | null;
  health: HealthResponse | null;
  lang: Language;
  startingMode: SessionMode | null;
  resumingSessionId: string | null;
  lastLocalSessionId: string | null;
  onStartSession: (mode: SessionMode) => void;
  onResumeSession: (sessionId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lesson,
  progress,
  health,
  lang,
  startingMode,
  resumingSessionId,
  lastLocalSessionId,
  onStartSession,
  onResumeSession,
}) => {
  const modesOrder: SessionMode[] = ['practice', 'baseline', 'review'];

  const sessionsList: SessionSummary[] = progress?.sessions ?? [];
  const hasUnlistedLocalSession =
    Boolean(lastLocalSessionId) && !sessionsList.some((s) => s.id === lastLocalSessionId);

  return (
    <div className="home-workspace">
      {/* Contrast Overview & Lesson Explanation Card */}
      <section className="study-card lesson-overview-card" aria-labelledby="lesson-title-heading">
        <div className="lesson-top-row">
          <div>
            <span className="eyebrow-label">{pickText(UI_COPY.home.targetContrastHeading, lang)}</span>
            <h1 id="lesson-title-heading" className="lesson-main-title">
              {lesson
                ? pickText(lesson.title, lang)
                : lang === 'vi'
                ? 'Nguyên âm /ɪ/ và /iː/ trong tiếng Anh'
                : 'English Vowel Contrast /ɪ/ vs. /iː/'}
            </h1>
          </div>

          <div className="contrast-pills-group" aria-label="Target IPA symbols">
            {(lesson?.contrast && lesson.contrast.length > 0 ? lesson.contrast : ['/ɪ/', '/iː/']).map(
              (symbol, idx, arr) => (
                <React.Fragment key={symbol}>
                  <span className="ipa-contrast-pill">{symbol}</span>
                  {idx < arr.length - 1 && <span className="contrast-vs">vs</span>}
                </React.Fragment>
              )
            )}
          </div>
        </div>

        <div className="accent-meta-strip">
          <span>
            <strong>{pickText(UI_COPY.home.referenceAccentLabel, lang)}</strong>{' '}
            <code>{lesson?.reference_accent || 'en-US'}</code>
          </span>
          <span className="dot-sep">•</span>
          <span>{pickText(UI_COPY.home.intelligibilityNote, lang)}</span>
        </div>

        {lesson && (
          <div className="explanation-columns">
            <div className="explanation-box">
              <h2 className="subcard-heading">{pickText(UI_COPY.home.explanationTitle, lang)}</h2>
              <p className="subcard-body">{pickText(lesson.explanation, lang)}</p>
            </div>
            <div className="explanation-box">
              <h2 className="subcard-heading">{pickText(UI_COPY.home.productionGuidanceTitle, lang)}</h2>
              <p className="subcard-body">{pickText(lesson.production_guidance, lang)}</p>
            </div>
          </div>
        )}

        {/* Minimal Pairs Grid */}
        {lesson && lesson.pairs && lesson.pairs.length > 0 && (
          <details className="minimal-pairs-section">
            <summary className="subcard-heading">{pickText(UI_COPY.home.minimalPairsTitle, lang)}</summary>
            <div className="pairs-grid">
              {lesson.pairs.map((pair) => (
                <div key={pair.id} className="pair-card">
                  {pair.words.map((w, idx) => (
                    <React.Fragment key={w.id}>
                      <div className="pair-word-col">
                        <div className="pair-word-text">{w.text}</div>
                        <div className="pair-word-ipa">{w.ipa}</div>
                        <div className="pair-word-gloss">
                          {lang === 'vi' ? w.meaning_vi : w.meaning_en}
                        </div>
                      </div>
                      {idx < pair.words.length - 1 && (
                        <div className="pair-divider" aria-hidden="true">
                          ⇄
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Preview audio status notice */}
        {(lesson?.audio_reviewed === false || health?.reference_audio_reviewed === false) && (
          <div className="preview-notice-bar">
            <span aria-hidden="true">ℹ️</span>
            <span>{pickText(UI_COPY.statusBanner.previewAudioNotReviewed, lang)}</span>
          </div>
        )}
      </section>

      {/* Start a Session Mode Selection */}
      <section className="study-card" aria-labelledby="start-session-heading">
        <div className="section-header-line">
          <h2 id="start-session-heading" className="section-title">
            {pickText(UI_COPY.home.chooseModeTitle, lang)}
          </h2>
          <span className="section-hint">{pickText(UI_COPY.home.sessionStructureHint, lang)}</span>
        </div>

        <div className="mode-cards-grid">
          {modesOrder.map((mode) => {
            const copy = UI_COPY.modes[mode];
            const isPrimary = mode === 'practice';
            const isStarting = startingMode === mode;
            const showDueBadge = mode === 'review' && (progress?.reviews_due ?? 0) > 0;

            return (
              <div
                key={mode}
                className={`mode-card ${isPrimary ? 'mode-card-primary' : ''}`}
              >
                <div className="mode-card-top">
                  <div className="mode-card-badges">
                    <span className={`badge ${isPrimary ? 'badge-teal' : 'badge-neutral'}`}>
                      {pickText(copy.badge, lang)}
                    </span>
                    {showDueBadge && (
                      <span className="badge badge-amber">
                        {progress?.reviews_due} {pickText(UI_COPY.home.reviewsDueLabel, lang)}
                      </span>
                    )}
                  </div>
                  <h3 className="mode-card-title">{pickText(copy.title, lang)}</h3>
                  <p className="mode-card-desc">{pickText(copy.desc, lang)}</p>
                </div>

                <button
                  type="button"
                  className={`btn ${isPrimary ? 'btn-primary' : 'btn-secondary'} btn-full`}
                  disabled={Boolean(startingMode) || Boolean(resumingSessionId)}
                  onClick={() => onStartSession(mode)}
                >
                  {isStarting
                    ? lang === 'vi'
                      ? 'Đang khởi tạo phiên...'
                      : 'Starting session...'
                    : pickText(copy.cta, lang)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Separate Listening vs. Speaking Progress */}
      <section className="study-card" aria-labelledby="progress-summary-heading">
        <h2 id="progress-summary-heading" className="section-title">
          {pickText(UI_COPY.home.progressSummaryTitle, lang)}
        </h2>

        <div className="progress-stats-grid">
          {/* Listening Accuracy */}
          <div className="stat-box">
            <span className="stat-label">{pickText(UI_COPY.home.listeningScoreLabel, lang)}</span>
            <strong className="stat-value">
              {progress && progress.perception.total > 0
                ? formatAccuracy(
                    progress.perception.accuracy,
                    progress.perception.correct,
                    progress.perception.total
                  )
                : pickText(UI_COPY.home.noListeningYet, lang)}
            </strong>
            <span className="stat-sub">
              {progress
                ? `${progress.perception.correct ?? 0} / ${progress.perception.total} ${pickText(
                    UI_COPY.home.listeningTrialsCount,
                    lang
                  )}`
                : '0 / 0'}
            </span>
          </div>

          {/* Speaking Attempts (Never combined into a pronunciation score) */}
          <div className="stat-box">
            <span className="stat-label">{pickText(UI_COPY.home.speakingAttemptsLabel, lang)}</span>
            <strong className="stat-value">{progress?.production.attempts ?? 0}</strong>
            <span className="stat-sub">{pickText(UI_COPY.home.speakingAttemptsSub, lang)}</span>
          </div>

          {/* Sessions Completed / Reviews */}
          <div className="stat-box">
            <span className="stat-label">{pickText(UI_COPY.home.sessionsCompletedLabel, lang)}</span>
            <strong className="stat-value">
              {progress ? `${progress.sessions_completed} / ${progress.sessions_started}` : '0 / 0'}
            </strong>
            <span className="stat-sub">
              {pickText(UI_COPY.home.nextReviewAtLabel, lang)}{' '}
              {formatDateTime(progress?.next_review_at, lang)}
            </span>
          </div>
        </div>
      </section>

      {/* Recent & Resumable Sessions */}
      <section className="study-card" aria-labelledby="recent-sessions-heading">
        <h2 id="recent-sessions-heading" className="section-title">
          {pickText(UI_COPY.home.recentSessionsTitle, lang)}
        </h2>

        {hasUnlistedLocalSession && lastLocalSessionId && (
          <div className="local-resume-callout">
            <div>
              <strong>
                {lang === 'vi'
                  ? 'Bạn có một phiên học đang dở dang trên trình duyệt này'
                  : 'You have an unfinished session in this browser'}
              </strong>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={Boolean(resumingSessionId) || Boolean(startingMode)}
              onClick={() => onResumeSession(lastLocalSessionId)}
            >
              {pickText(UI_COPY.home.resumeButton, lang)} →
            </button>
          </div>
        )}

        {sessionsList.length === 0 ? (
          <p className="empty-sessions-text">{pickText(UI_COPY.home.noSessionsYet, lang)}</p>
        ) : (
          <div className="sessions-list">
            {sessionsList.map((s) => {
              const isComplete = s.phase === 'complete' || Boolean(s.completed_at);
              const isResumingThis = resumingSessionId === s.id;
              let accStr = '—';
              if (s.perception.correct !== null && s.perception.total > 0) {
                accStr = `${formatAccuracy(
                  s.perception.accuracy,
                  s.perception.correct,
                  s.perception.total
                )} (${s.perception.correct}/${s.perception.total})`;
              } else if (s.perception.correct === null && s.perception.total > 0) {
                accStr =
                  lang === 'vi'
                    ? `Ẩn tới cuối phiên (${s.perception.total} câu)`
                    : `Hidden until complete (${s.perception.total} answered)`;
              }

              return (
                <div key={s.id} className="session-row-card">
                  <div className="session-row-info">
                    <div className="session-row-badges">
                      <span className="badge badge-neutral">{formatModeName(s.mode, lang)}</span>
                      <span className={`badge ${isComplete ? 'badge-teal' : 'badge-amber'}`}>
                        {isComplete
                          ? pickText(UI_COPY.home.completedBadge, lang)
                          : `${pickText(UI_COPY.home.inProgressBadge, lang)} • ${formatPhaseName(
                              s.phase,
                              lang
                            )}`}
                      </span>
                    </div>
                    <div className="session-row-meta">
                      <span>{formatDateTime(s.created_at, lang)}</span>
                      <span className="dot-sep">•</span>
                      <span>
                        {lang === 'vi' ? 'Nghe:' : 'Listening:'} <strong>{accStr}</strong>
                      </span>
                      {s.review_due_at && (
                        <>
                          <span className="dot-sep">•</span>
                          <span>
                            {lang === 'vi' ? 'Ôn tập:' : 'Revisit:'}{' '}
                            {formatDateTime(s.review_due_at, lang)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn ${isComplete ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    disabled={Boolean(resumingSessionId) || Boolean(startingMode)}
                    onClick={() => onResumeSession(s.id)}
                  >
                    {isResumingThis
                      ? '...'
                      : isComplete
                      ? pickText(UI_COPY.home.viewCompletedButton, lang)
                      : `${pickText(UI_COPY.home.resumeButton, lang)} →`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
