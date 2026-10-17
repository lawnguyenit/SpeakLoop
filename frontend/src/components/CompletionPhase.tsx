import React from 'react';
import { formatAccuracy, formatDateTime, formatModeName, pickText, UI_COPY } from '../i18n';
import { Language, SessionMode, SessionView } from '../types';

interface CompletionPhaseProps {
  session: SessionView;
  lang: Language;
  onReturnHome: () => void;
  onStartNewSession: (mode: SessionMode) => void;
}

export const CompletionPhase: React.FC<CompletionPhaseProps> = ({
  session,
  lang,
  onReturnHome,
  onStartNewSession,
}) => {
  const accuracyStr = formatAccuracy(
    session.perception.accuracy,
    session.perception.correct,
    session.perception.total
  );

  return (
    <section className="study-card completion-card" aria-labelledby="completion-heading">
      <div className="phase-badges">
        <span className="badge badge-teal">{pickText(UI_COPY.completion.badge, lang)}</span>
        <span className="badge badge-neutral">{formatModeName(session.mode, lang)}</span>
      </div>

      <h2 id="completion-heading" className="completion-title">
        {pickText(UI_COPY.completion.heading, lang)}
      </h2>
      <p className="completion-subtext">{pickText(UI_COPY.completion.subtext, lang)}</p>

      <div className="completion-metrics-grid">
        {/* Listening Score Card */}
        <div className="metric-card">
          <h3 className="metric-card-title">{pickText(UI_COPY.completion.listeningCardTitle, lang)}</h3>
          <div className="metric-big-value">{accuracyStr}</div>
          <p className="metric-detail">
            {session.perception.correct ?? 0} / {session.perception.total}{' '}
            {pickText(UI_COPY.home.listeningTrialsCount, lang)}
          </p>
        </div>

        {/* Speaking Practice Count Card (Separate from listening; no pronunciation accuracy score) */}
        <div className="metric-card">
          <h3 className="metric-card-title">{pickText(UI_COPY.completion.speakingCardTitle, lang)}</h3>
          <div className="metric-big-value">{session.production_attempts}</div>
          <p className="metric-detail">{pickText(UI_COPY.completion.speakingAttemptsUnit, lang)}</p>
          <p className="metric-honesty-note">
            {pickText(UI_COPY.completion.speakingAccuracyUnavailable, lang)}
          </p>
        </div>
      </div>

      {/* Scheduled Revisit Card */}
      <div className="revisit-schedule-box">
        <div className="revisit-icon" aria-hidden="true">
          📅
        </div>
        <div>
          <h3 className="revisit-title">{pickText(UI_COPY.completion.revisitCardTitle, lang)}</h3>
          <p className="revisit-date-line">
            <span>{pickText(UI_COPY.completion.revisitScheduledFor, lang)}</span>{' '}
            <strong>{formatDateTime(session.review_due_at, lang)}</strong>
          </p>
        </div>
      </div>

      <div className="completion-actions-row">
        <button type="button" className="btn btn-primary" onClick={onReturnHome}>
          ← {pickText(UI_COPY.completion.returnHomeBtn, lang)}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onStartNewSession('practice')}
        >
          {pickText(UI_COPY.completion.startAnotherPracticeBtn, lang)}
        </button>
      </div>
    </section>
  );
};
