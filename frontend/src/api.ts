import {
  AnswerResponse,
  ApiErrorEnvelope,
  HealthResponse,
  Language,
  LessonResponse,
  LocalizedText,
  ProgressResponse,
  RecordingResponse,
  SessionMode,
  SessionView,
  SettingsPayload,
} from './types';
import { ERROR_CODE_HINTS, UI_COPY } from './i18n';

export class SpeakLoopApiError extends Error {
  status: number;
  code: string;
  localizedMessage: LocalizedText;
  requestId?: string;

  constructor(status: number, code: string, localizedMessage: LocalizedText, requestId?: string) {
    super(localizedMessage.en || localizedMessage.vi || `HTTP ${status}`);
    this.name = 'SpeakLoopApiError';
    this.status = status;
    this.code = code;
    this.localizedMessage = localizedMessage;
    this.requestId = requestId;
  }
}

async function parseErrorResponse(res: Response): Promise<SpeakLoopApiError> {
  try {
    const data = (await res.json()) as Partial<ApiErrorEnvelope> & {
      detail?: unknown;
    };
    if (data?.error && typeof data.error === 'object') {
      const code = data.error.code || `http_${res.status}`;
      const hint = ERROR_CODE_HINTS[code];
      const msg = hint || data.error.message || {
        vi: `Lỗi máy chủ (${res.status}).`,
        en: `Server error (${res.status}).`,
      };
      return new SpeakLoopApiError(res.status, code, msg, data.error.request_id);
    }
    if (typeof data?.detail === 'string') {
      return new SpeakLoopApiError(res.status, `http_${res.status}`, {
        vi: data.detail,
        en: data.detail,
      });
    }
  } catch {
    // fallback below
  }

  const statusMessages: Record<number, LocalizedText> = {
    400: {
      vi: 'Yêu cầu không hợp lệ (400). Hãy kiểm tra lại thao tác và thử lại.',
      en: 'Malformed activity request (400). Please check and try again.',
    },
    404: {
      vi: 'Không tìm thấy phiên học hoặc tệp âm thanh (404).',
      en: 'Session or audio asset not found (404).',
    },
    409: {
      vi: 'Xung đột trạng thái phiên học (409). Đang đồng bộ lại trạng thái phiên.',
      en: 'Activity state conflict (409). Please synchronize the session state.',
    },
    413: {
      vi: 'Bản thu âm quá lớn (413). Giới hạn tối đa là 15 giây / 10 MiB.',
      en: 'Recording file too large (413). Maximum allowed is 15 seconds / 10 MiB.',
    },
    422: {
      vi: 'Dữ liệu gửi lên không đúng định dạng yêu cầu (422).',
      en: 'Request validation failed (422).',
    },
    503: {
      vi: 'Tài nguyên âm thanh hoặc dịch vụ cục bộ hiện chưa sẵn sàng (503).',
      en: 'Audio asset or local service is currently unavailable (503).',
    },
  };

  const fallback = statusMessages[res.status] ?? {
    vi: `Yêu cầu thất bại với mã trạng thái HTTP ${res.status}.`,
    en: `Request failed with HTTP status ${res.status}.`,
  };

  return new SpeakLoopApiError(res.status, `http_${res.status}`, fallback);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new SpeakLoopApiError(0, 'network_error', UI_COPY.errors.networkFallback);
  }

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as T;
}

export const api = {
  getHealth(): Promise<HealthResponse> {
    return requestJson<HealthResponse>('/api/health');
  },

  getLesson(): Promise<LessonResponse> {
    return requestJson<LessonResponse>('/api/lesson');
  },

  getSettings(): Promise<SettingsPayload> {
    return requestJson<SettingsPayload>('/api/settings');
  },

  putSettings(language: Language): Promise<SettingsPayload> {
    return requestJson<SettingsPayload>('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
  },

  getProgress(): Promise<ProgressResponse> {
    return requestJson<ProgressResponse>('/api/progress');
  },

  createSession(mode: SessionMode, language: Language): Promise<SessionView> {
    return requestJson<SessionView>('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, language }),
    });
  },

  getSession(sessionId: string): Promise<SessionView> {
    return requestJson<SessionView>(`/api/sessions/${encodeURIComponent(sessionId)}`);
  },

  submitAnswer(sessionId: string, trialId: string, optionId: string): Promise<AnswerResponse> {
    return requestJson<AnswerResponse>(`/api/sessions/${encodeURIComponent(sessionId)}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trial_id: trialId,
        option_id: optionId,
      }),
    });
  },

  submitRecording(
    sessionId: string,
    promptId: string,
    attemptId: string,
    wavBlob: Blob
  ): Promise<RecordingResponse> {
    const form = new FormData();
    form.append('file', wavBlob, `${attemptId}.wav`);
    form.append('prompt_id', promptId);
    form.append('attempt_id', attemptId);

    return requestJson<RecordingResponse>(
      `/api/sessions/${encodeURIComponent(sessionId)}/recordings`,
      {
        method: 'POST',
        body: form,
      }
    );
  },

  advanceSession(sessionId: string, promptId: string): Promise<SessionView> {
    return requestJson<SessionView>(`/api/sessions/${encodeURIComponent(sessionId)}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId }),
    });
  },

  /**
   * Probes or fetches an audio URL when playback fails so we can surface structured 503/404 API errors.
   */
  async checkAudioEndpointError(audioUrl: string): Promise<SpeakLoopApiError> {
    try {
      const res = await fetch(audioUrl, { method: 'GET' });
      if (!res.ok) {
        return await parseErrorResponse(res);
      }
    } catch {
      return new SpeakLoopApiError(0, 'network_error', UI_COPY.errors.networkFallback);
    }
    return new SpeakLoopApiError(503, 'audio_playback_failed', UI_COPY.errors.audioLoadError);
  },
};
