export type Language = 'vi' | 'en';

export type SessionMode = 'baseline' | 'practice' | 'review';
export type SessionPhase = 'perception' | 'word' | 'sentence' | 'complete';

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface HealthResponse {
  status: string;
  diagnosis_ready: boolean;
  reference_audio_ready: boolean;
  reference_audio_reviewed: boolean;
  local_asr_available: boolean;
}

export interface LessonWord {
  id: string;
  text: string;
  ipa: string;
  meaning_vi: string;
  meaning_en: string;
  audio_url?: string;
}

export interface LessonPair {
  id: string;
  words: LessonWord[];
}

export interface LessonResponse {
  id: string;
  title: LocalizedText;
  contrast: string[];
  reference_accent: string;
  pairs: LessonPair[];
  explanation: LocalizedText;
  production_guidance: LocalizedText;
  audio_reviewed: boolean;
}

export interface SettingsPayload {
  language: Language;
}

export interface TrialOption {
  id: string;
  text: string;
  ipa: string;
}

export interface PerceptionTrial {
  id: string;
  audio_url: string;
  options: TrialOption[];
}

export interface ProductionPrompt {
  id: string;
  text: string;
  target_word: string;
  target_ipa: string;
  segment_start: number;
  segment_end: number;
  audio_url: string;
  guidance: LocalizedText;
}

export interface PerceptionStats {
  correct: number | null;
  total: number;
  accuracy: number | null;
}

export interface SessionView {
  id: string;
  mode: SessionMode;
  language: Language;
  phase: SessionPhase;
  current: number;
  total: number;
  trial: PerceptionTrial | null;
  prompt: ProductionPrompt | null;
  perception: PerceptionStats;
  production_attempts: number;
  can_advance: boolean;
  review_due_at: string | null;
}

export interface AnswerResponse {
  correct: boolean | null;
  correct_option_id: string | null;
  session: SessionView;
}

export interface AudioQualityInfo {
  valid?: boolean;
  status?: string;
  duration_seconds?: number;
  sample_rate?: number;
  channels?: number;
  rms?: number;
  peak?: number;
  clipping_ratio?: number;
  silence_ratio?: number;
  issues?: string[];
  [key: string]: unknown;
}

export interface RecordingResponse {
  attempt_id: string;
  decision: 'abstain' | 'invalid_audio' | string;
  reason: string;
  feedback: LocalizedText;
  audio_quality: AudioQualityInfo;
  transcript: string | null;
  latency_ms: number;
  diagnosis_ready: boolean;
}

export interface SessionSummary {
  id: string;
  mode: SessionMode;
  phase: SessionPhase;
  created_at: string;
  completed_at: string | null;
  review_due_at: string | null;
  perception: PerceptionStats;
}

export interface ProgressResponse {
  sessions_started: number;
  sessions_completed: number;
  perception: PerceptionStats;
  production: {
    attempts: number;
    diagnosis_ready: boolean;
  };
  reviews_due: number;
  next_review_at: string | null;
  sessions: SessionSummary[];
}

export interface ApiErrorDetail {
  code: string;
  message: LocalizedText;
  request_id?: string;
}

export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
}
