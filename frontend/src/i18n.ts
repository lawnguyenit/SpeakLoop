import { Language, LocalizedText, SessionMode, SessionPhase } from './types';

export function pickText(text: LocalizedText | undefined | null, lang: Language, fallback = ''): string {
  if (!text) return fallback;
  return text[lang] || text.vi || text.en || fallback;
}

export const UI_COPY = {
  appName: 'SpeakLoop',
  subtitle: {
    vi: 'Luyện nghe phân biệt & thực hành phát âm tiếng Anh trên máy của bạn',
    en: 'Local English sound-contrast listening & speaking practice',
  },
  privacyBadge: {
    vi: 'Riêng tư trên máy • Không tải giọng nói lên mạng',
    en: 'Local privacy • No cloud voice upload',
  },
  langToggleLabel: {
    vi: 'Ngôn ngữ hướng dẫn',
    en: 'Explanation language',
  },
  statusBanner: {
    previewAudioNotReviewed: {
      vi: 'Âm thanh mẫu hiện là bản nghe thử tạo sẵn ngoại tuyến (chưa qua kiểm duyệt con người).',
      en: 'Reference lesson audio is offline preview material (not yet human-reviewed).',
    },
    diagnosisDisabled: {
      vi: 'Chức năng chấm lỗi phát âm tự động đang tắt — hãy tự nghe lại bản thu và đối chiếu với âm mẫu.',
      en: 'Automatic pronunciation grading is currently off — replay your recording and compare with the model.',
    },
    localAsrReady: {
      vi: 'Nhận diện chữ trên máy: Đang bật (chỉ mang tính tham khảo)',
      en: 'Local word recognition: Available (approximate reference only)',
    },
    localAsrUnavailable: {
      vi: 'Nhận diện chữ trên máy: Đang tắt (vẫn thu âm & tự nghe lại bình thường)',
      en: 'Local word recognition: Off (recording & self-replay active)',
    },
    refAudioMissing: {
      vi: 'Chưa sẵn sàng tệp âm thanh mẫu trên máy.',
      en: 'Reference audio clips are not yet available.',
    },
  },
  nav: {
    returnHome: {
      vi: 'Về trang chính',
      en: 'Back to Home',
    },
    refreshData: {
      vi: 'Làm mới',
      en: 'Refresh',
    },
  },
  modes: {
    baseline: {
      title: {
        vi: 'Kiểm tra đầu vào',
        en: 'Baseline Check',
      },
      badge: {
        vi: 'Đầu vào',
        en: 'Baseline',
      },
      desc: {
        vi: 'Đo khả năng nghe phân biệt ban đầu (ẩn đáp án từng câu cho tới cuối phiên) kèm luyện nói từ & câu.',
        en: 'Measure initial listening discrimination (per-item answers hidden until completion) plus word & sentence practice.',
      },
      cta: {
        vi: 'Bắt đầu kiểm tra đầu vào',
        en: 'Start Baseline Session',
      },
    },
    practice: {
      title: {
        vi: 'Luyện tập có phản hồi',
        en: 'Guided Practice',
      },
      badge: {
        vi: 'Luyện tập',
        en: 'Practice',
      },
      desc: {
        vi: 'Nghe phân biệt 8 câu với phản hồi đúng/sai ngay lập tức, sau đó luyện phát âm 2 từ và 2 câu có ngữ cảnh.',
        en: '8 listening trials with immediate feedback and replay, followed by 2 word prompts and 2 contextual sentences.',
      },
      cta: {
        vi: 'Bắt đầu phiên luyện tập',
        en: 'Start Practice Session',
      },
    },
    review: {
      title: {
        vi: 'Ôn tập củng cố',
        en: 'Retention Review',
      },
      badge: {
        vi: 'Ôn tập',
        en: 'Review',
      },
      desc: {
        vi: 'Kiểm tra mức độ duy trì khả năng phân biệt âm và giữ độ tương phản âm trong từ/câu sau một khoảng thời gian.',
        en: 'Check retention of sound discrimination and contrast preservation across words and sentences.',
      },
      cta: {
        vi: 'Bắt đầu phiên ôn tập',
        en: 'Start Review Session',
      },
    },
  },
  phases: {
    perception: {
      vi: 'Phần 1: Nghe phân biệt',
      en: 'Stage 1: Listening Discrimination',
    },
    word: {
      vi: 'Phần 2: Luyện từ đơn',
      en: 'Stage 2: Controlled Word Practice',
    },
    sentence: {
      vi: 'Phần 3: Luyện trong câu',
      en: 'Stage 3: Sentence in Context',
    },
    complete: {
      vi: 'Hoàn thành phiên học',
      en: 'Session Complete',
    },
  },
  home: {
    targetContrastHeading: {
      vi: 'Cặp âm mục tiêu',
      en: 'Target Sound Contrast',
    },
    referenceAccentLabel: {
      vi: 'Giọng mẫu tham chiếu:',
      en: 'Reference accent:',
    },
    intelligibilityNote: {
      vi: 'Mục tiêu là giữ rõ sự khác biệt giữa hai âm để người nghe hiểu đúng ý, không đòi hỏi bắt chước tuyệt đối một giọng bản xứ duy nhất.',
      en: 'The goal is preserving a clear contrast for intelligibility, not rigid imitation of a single native accent.',
    },
    explanationTitle: {
      vi: 'Cách phân biệt khi nghe',
      en: 'How to Hear the Difference',
    },
    productionGuidanceTitle: {
      vi: 'Hướng dẫn tạo âm thực tế',
      en: 'Practical Articulation Guidance',
    },
    minimalPairsTitle: {
      vi: 'Các cặp từ đối lập trong bài',
      en: 'Minimal Pairs in This Lesson',
    },
    chooseModeTitle: {
      vi: 'Bắt đầu phiên học mới',
      en: 'Start a Learning Session',
    },
    sessionStructureHint: {
      vi: 'Mỗi phiên học gồm: 8 câu nghe phân biệt → 2 từ đơn → 2 câu ngữ cảnh.',
      en: 'Each session includes: 8 listening questions → 2 words → 2 sentences.',
    },
    progressSummaryTitle: {
      vi: 'Tiến độ học tập (Tách biệt Nghe & Nói)',
      en: 'Learning Progress (Listening & Speaking Separated)',
    },
    listeningScoreLabel: {
      vi: 'Độ chính xác nghe phân biệt',
      en: 'Listening Discrimination Accuracy',
    },
    listeningTrialsCount: {
      vi: 'câu nghe đã hoàn thành',
      en: 'listening questions scored',
    },
    noListeningYet: {
      vi: 'Chưa có dữ liệu',
      en: 'No scores yet',
    },
    speakingAttemptsLabel: {
      vi: 'Lượt thu âm thực hành nói',
      en: 'Recorded Speaking Practice Takes',
    },
    speakingAttemptsSub: {
      vi: 'Không tính điểm phát âm tổng hợp (chức năng chấm tự động đang tắt)',
      en: 'No combined pronunciation score (automatic grading is off)',
    },
    sessionsCompletedLabel: {
      vi: 'Phiên hoàn thành',
      en: 'Sessions Completed',
    },
    reviewsDueLabel: {
      vi: 'Lịch ôn tập đến hạn',
      en: 'Reviews Due',
    },
    nextReviewAtLabel: {
      vi: 'Lịch ôn tập tiếp theo:',
      en: 'Next scheduled revisit:',
    },
    recentSessionsTitle: {
      vi: 'Phiên học gần đây & Tiếp tục phiên dở dang',
      en: 'Recent & Resumable Sessions',
    },
    noSessionsYet: {
      vi: 'Chưa có phiên học nào. Hãy chọn một chế độ ở trên để bắt đầu!',
      en: 'No sessions recorded yet. Choose a mode above to begin!',
    },
    resumeButton: {
      vi: 'Tiếp tục phiên học',
      en: 'Resume Session',
    },
    viewCompletedButton: {
      vi: 'Xem kết quả',
      en: 'View Summary',
    },
    inProgressBadge: {
      vi: 'Đang học dở',
      en: 'In Progress',
    },
    completedBadge: {
      vi: 'Đã hoàn thành',
      en: 'Completed',
    },
  },
  listening: {
    instructionPractice: {
      vi: 'Bấm nghe âm thanh, sau đó chọn từ bạn nghe được. Bạn có thể nghe lại nhiều lần.',
      en: 'Listen to the audio clip, then select the word you heard. You can replay as needed.',
    },
    instructionBlind: {
      vi: 'Chế độ kiểm tra/ôn tập: Chọn từ bạn nghe được. Đáp án đúng/sai từng câu sẽ được giữ kín đến cuối phiên.',
      en: 'Baseline/Review mode: Select the word you heard. Per-question correctness is hidden until session completion.',
    },
    playButton: {
      vi: 'Phát âm thanh câu hỏi',
      en: 'Play Question Audio',
    },
    replayButton: {
      vi: 'Nghe lại âm thanh',
      en: 'Replay Audio',
    },
    playingButton: {
      vi: 'Đang phát...',
      en: 'Playing...',
    },
    choosePrompt: {
      vi: 'Bạn nghe thấy từ nào? (Phím tắt: 1 hoặc 2)',
      en: 'Which word did you hear? (Shortcut: 1 or 2)',
    },
    submitting: {
      vi: 'Đang lưu lựa chọn...',
      en: 'Saving choice...',
    },
    feedbackCorrectTitle: {
      vi: 'Chính xác! Bạn đã phân biệt đúng âm.',
      en: 'Correct! You identified the target sound.',
    },
    feedbackIncorrectTitle: {
      vi: 'Chưa chính xác ở lượt này.',
      en: 'Not quite right on this trial.',
    },
    feedbackBlindTitle: {
      vi: 'Đã ghi nhận lựa chọn của bạn.',
      en: 'Your answer has been recorded.',
    },
    feedbackBlindBody: {
      vi: 'Trong chế độ Kiểm tra đầu vào / Ôn tập, kết quả tổng hợp sẽ hiển thị khi hoàn thành phiên học.',
      en: 'In Baseline / Review mode, overall accuracy is shown at the end of the session.',
    },
    youChose: {
      vi: 'Bạn đã chọn:',
      en: 'You selected:',
    },
    correctAnswerIs: {
      vi: 'Đáp án của đoạn âm:',
      en: 'Target word played:',
    },
    replayPriorExample: {
      vi: 'Nghe lại câu vừa rồi để so sánh',
      en: 'Replay this clip to compare',
    },
    nextTrialButton: {
      vi: 'Tiếp tục câu tiếp theo',
      en: 'Continue to Next Item',
    },
  },
  production: {
    wordStageHeader: {
      vi: 'Luyện phát âm từ đơn có kiểm soát',
      en: 'Controlled Word Practice',
    },
    sentenceStageHeader: {
      vi: 'Giữ độ tương phản âm trong ngữ cảnh câu',
      en: 'Preserve the Sound Contrast in a Sentence',
    },
    sentenceContextNote: {
      vi: 'Chú ý từ được gạch chân màu xanh cổ vịt: hãy giữ nguyên độ rõ của nguyên âm mục tiêu khi đọc liền cả câu.',
      en: 'Focus on the neutrally highlighted target word: keep its vowel contrast distinct even inside connected speech.',
    },
    targetFocusLabel: {
      vi: 'Từ mục tiêu & phiên âm IPA:',
      en: 'Target word & IPA:',
    },
    guidanceBoxTitle: {
      vi: 'Hướng dẫn thực hành (1 điều chỉnh trọng tâm)',
      en: 'Practical Adjustment Tip',
    },
    step1ListenModel: {
      vi: 'Bước 1: Nghe âm mẫu tham chiếu',
      en: 'Step 1: Listen to Reference Model',
    },
    playReferenceBtn: {
      vi: 'Nghe mẫu tham chiếu',
      en: 'Play Reference Audio',
    },
    previewAudioTag: {
      vi: 'Bản nghe thử (chưa kiểm duyệt)',
      en: 'Preview clip (unreviewed)',
    },
    step2RecordSelf: {
      vi: 'Bước 2: Thu âm giọng đọc của bạn',
      en: 'Step 2: Record Your Voice',
    },
    openingMicBtn: {
      vi: 'Đang mở micro...',
      en: 'Opening microphone...',
    },
    startRecordBtn: {
      vi: 'Bắt đầu thu âm',
      en: 'Start Recording',
    },
    stopRecordBtn: {
      vi: 'Dừng thu âm',
      en: 'Stop Recording',
    },
    recordAgainBtn: {
      vi: 'Thu âm lại lượt khác',
      en: 'Record Another Take',
    },
    recordingLimitHint: {
      vi: 'Tối đa 15 giây. Bản thu được giữ ngay trên trình duyệt để bạn tự nghe lại.',
      en: 'Up to 15 seconds. Kept locally in your browser so you can replay and compare.',
    },
    step3SelfCompare: {
      vi: 'Bước 3: Tự nghe lại & so sánh với âm mẫu',
      en: 'Step 3: Self-Replay & Compare with Reference',
    },
    playMyTakeBtn: {
      vi: 'Nghe bản thu của tôi',
      en: 'Play My Recording',
    },
    replayModelSideBySideBtn: {
      vi: 'Nghe lại âm mẫu để đối chiếu',
      en: 'Replay Reference to Compare',
    },
    analyzingLocally: {
      vi: 'Đang kiểm tra độ rõ của âm thanh...',
      en: 'Checking recording clarity...',
    },
    retryLocalCheckBtn: {
      vi: 'Thử kiểm tra lại bản thu',
      en: 'Retry Recording Check',
    },
    invalidAudioTitle: {
      vi: 'Cần thu âm lại — Âm thanh chưa đủ rõ',
      en: 'Please Record Again — Audio Was Not Clear Enough',
    },
    invalidAudioBadge: {
      vi: 'Cần thu lại',
      en: 'Record again',
    },
    abstainTitle: {
      vi: 'Đã ghi nhận lượt luyện nói — Hãy tự nghe lại và so sánh với âm mẫu',
      en: 'Practice Take Recorded — Replay and Compare with the Reference Audio',
    },
    abstainBadge: {
      vi: 'Tự nghe đối chiếu',
      en: 'Self-comparison',
    },
    approximateTranscriptLabel: {
      vi: 'Chữ nhận diện tự động ước tính (chỉ để tham khảo, KHÔNG phải kết quả chấm phát âm):',
      en: 'Approximate recognized words (for reference only, NOT a pronunciation verdict):',
    },
    transcriptDisclaimer: {
      vi: 'Lưu ý: Máy nhận diện chữ có thể đoán từ theo ngữ cảnh, không chứng minh được bạn đã phát âm đúng hay sai nguyên âm /ɪ/ hay /iː/.',
      en: 'Note: Word recognition guesses text by context and never proves whether your vowel was /ɪ/ or /iː/.',
    },
    advanceReadyHint: {
      vi: 'Bạn đã có ít nhất 1 bản thu hợp lệ cho mục này. Hãy tự nghe so sánh với âm mẫu, thu lại nếu muốn, hoặc chuyển sang mục tiếp theo.',
      en: 'You have completed a valid practice recording for this item. Compare with the model, record again if you like, or move on.',
    },
    advanceLockedHint: {
      vi: 'Hãy hoàn thành ít nhất một bản thu âm rõ ràng để mở khóa nút chuyển sang mục tiếp theo.',
      en: 'Complete at least one clear practice recording on this item to unlock moving to the next prompt.',
    },
    advanceButton: {
      vi: 'Đã luyện xong, chuyển sang mục tiếp theo',
      en: 'Move to Next Prompt After Practice',
    },
    advancingButton: {
      vi: 'Đang chuyển mục...',
      en: 'Moving on...',
    },
    micPermissionDenied: {
      vi: 'Trình duyệt bị từ chối quyền truy cập micro. Hãy cấp quyền micro trên thanh địa chỉ trình duyệt rồi thử lại.',
      en: 'Microphone permission was denied. Please allow microphone access in your browser address bar and try again.',
    },
    micUnsupported: {
      vi: 'Trình duyệt hoặc thiết bị này không hỗ trợ thu âm trực tiếp.',
      en: 'Microphone recording is not supported in this browser or device.',
    },
  },
  completion: {
    badge: {
      vi: 'Hoàn thành phiên học',
      en: 'Session Completed',
    },
    heading: {
      vi: 'Tổng kết phiên luyện tập của bạn',
      en: 'Your Session Summary',
    },
    subtext: {
      vi: 'Kết quả nghe phân biệt và số lượt thực hành phát âm được báo cáo độc lập để phản ánh đúng năng lực.',
      en: 'Listening discrimination and speaking practice counts are reported separately for honest progress tracking.',
    },
    listeningCardTitle: {
      vi: 'Kết quả Nghe phân biệt',
      en: 'Listening Discrimination Score',
    },
    speakingCardTitle: {
      vi: 'Thực hành Phát âm',
      en: 'Speaking Practice Activity',
    },
    speakingAttemptsUnit: {
      vi: 'lượt thu âm đã thực hiện',
      en: 'recorded practice attempts',
    },
    speakingAccuracyUnavailable: {
      vi: 'Độ chính xác phát âm tự động: Chưa khả dụng (chờ kiểm định độc lập trên giọng người học Việt Nam).',
      en: 'Automatic pronunciation accuracy: Unavailable (pending independent validation on Vietnamese learner speech).',
    },
    revisitCardTitle: {
      vi: 'Lịch ôn tập giữ trí nhớ (7 ngày sau)',
      en: 'Scheduled Retention Revisit (7 Days)',
    },
    revisitScheduledFor: {
      vi: 'Thời điểm ôn tập đề xuất:',
      en: 'Recommended revisit date:',
    },
    returnHomeBtn: {
      vi: 'Quay về trang chính',
      en: 'Return to Home Workspace',
    },
    startAnotherPracticeBtn: {
      vi: 'Luyện thêm một phiên mới',
      en: 'Start Another Practice Session',
    },
  },
  errors: {
    retryBtn: {
      vi: 'Thử lại',
      en: 'Retry',
    },
    dismissBtn: {
      vi: 'Đóng thông báo',
      en: 'Dismiss',
    },
    networkFallback: {
      vi: 'Không thể kết nối tới ứng dụng trên máy. Tiến độ trên màn hình vẫn được giữ nguyên — hãy kiểm tra lại và bấm Thử lại.',
      en: 'Could not reach the local server. Your current screen progress is preserved — please check and click Retry.',
    },
    audioLoadError: {
      vi: 'Chưa phát được tệp âm thanh mẫu. Hãy bấm Thử lại.',
      en: 'Could not play the reference audio clip. Please click Retry.',
    },
  },
};

export function formatModeName(mode: SessionMode, lang: Language): string {
  return UI_COPY.modes[mode]?.badge[lang] ?? mode;
}

export function formatPhaseName(phase: SessionPhase, lang: Language): string {
  return UI_COPY.phases[phase]?.[lang] ?? phase;
}

export function formatDateTime(iso: string | null | undefined, lang: Language): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function formatAccuracy(
  acc: number | null | undefined,
  correct?: number | null,
  total?: number
): string {
  if (typeof acc === 'number' && !Number.isNaN(acc)) {
    const pct =
      acc <= 1 && acc >= 0 && (total ?? 0) > 0 && acc * (total ?? 1) <= (total ?? 1) + 0.01
        ? Math.round(acc * 100)
        : Math.round(acc);
    return `${pct}%`;
  }
  if (typeof correct === 'number' && typeof total === 'number' && total > 0) {
    return `${Math.round((correct / total) * 100)}%`;
  }
  return '—';
}

export const ERROR_CODE_HINTS: Record<string, LocalizedText> = {
  reference_audio_unavailable: {
    vi: 'Tệp âm thanh mẫu hiện chưa sẵn sàng trên máy. Hãy chuẩn bị âm thanh bài học rồi thử lại.',
    en: 'Reference lesson audio is not yet available on this machine. Please prepare the lesson audio and try again.',
  },
  audio_not_found: {
    vi: 'Không tìm thấy tệp âm thanh mẫu được yêu cầu.',
    en: 'The requested reference audio clip was not found.',
  },
  recording_required: {
    vi: 'Cần hoàn thành ít nhất một bản thu âm rõ ràng cho mục này trước khi chuyển sang mục tiếp theo.',
    en: 'Please complete at least one clear recording on this prompt before moving on.',
  },
  activity_changed: {
    vi: 'Trạng thái câu hỏi đã thay đổi. Hãy bấm Thử lại để đồng bộ phiên học.',
    en: 'Session progress has changed. Click Retry to synchronize the session.',
  },
  recording_too_large: {
    vi: 'Bản thu vượt quá giới hạn 15 giây. Hãy thu âm ngắn hơn và thử lại.',
    en: 'The recording exceeds the 15-second limit. Please record a shorter take and try again.',
  },
};
