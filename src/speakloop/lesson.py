"""Fixed alpha content. Machine reference audio remains explicitly unreviewed."""

import random
from uuid import uuid4

GROUPS = {
    "baseline": [("ship", "sheep"), ("sit", "seat"), ("fill", "feel"), ("bin", "bean")],
    "practice": [("bit", "beat"), ("fit", "feet"), ("slip", "sleep"), ("chip", "cheap")],
    "review": [("grin", "green"), ("still", "steel"), ("lick", "leak"), ("hill", "heel")],
}
WORD_DATA = [
    ("ship", "/ʃɪp/", "con tàu"),
    ("sheep", "/ʃiːp/", "con cừu"),
    ("sit", "/sɪt/", "ngồi"),
    ("seat", "/siːt/", "chỗ ngồi"),
    ("fill", "/fɪl/", "làm đầy"),
    ("feel", "/fiːl/", "cảm thấy"),
    ("bin", "/bɪn/", "thùng đựng"),
    ("bean", "/biːn/", "hạt đậu"),
    ("bit", "/bɪt/", "một chút"),
    ("beat", "/biːt/", "nhịp"),
    ("fit", "/fɪt/", "vừa vặn"),
    ("feet", "/fiːt/", "bàn chân (số nhiều)"),
    ("slip", "/slɪp/", "trượt"),
    ("sleep", "/sliːp/", "ngủ"),
    ("chip", "/tʃɪp/", "miếng nhỏ"),
    ("cheap", "/tʃiːp/", "rẻ"),
    ("grin", "/ɡrɪn/", "cười rộng miệng"),
    ("green", "/ɡriːn/", "màu xanh lá"),
    ("still", "/stɪl/", "vẫn"),
    ("steel", "/stiːl/", "thép"),
    ("lick", "/lɪk/", "liếm"),
    ("leak", "/liːk/", "rò rỉ"),
    ("hill", "/hɪl/", "ngọn đồi"),
    ("heel", "/hiːl/", "gót chân"),
]
WORDS = {
    text: {"id": text, "text": text, "ipa": ipa, "meaning_vi": meaning}
    for text, ipa, meaning in WORD_DATA
}
GUIDANCE = {
    "vi": "Nghe hai âm rồi thử lại. /ɪ/ và /iː/ khác chất lượng âm; đừng chỉ kéo dài âm.",
    "en": "Compare both vowels and try again. /ɪ/ and /iː/ differ in quality, not only length.",
}
SENTENCE_GUIDANCE = {
    "vi": (
        "Nghe cả câu, rồi giữ rõ âm trong từ được đánh dấu. Chưa cần bắt chước toàn bộ giọng mẫu."
    ),
    "en": "Listen to the sentence and preserve the vowel in the marked word. Go at your own pace.",
}
VOICES = {"zira": "Microsoft Zira Desktop", "david": "Microsoft David Desktop"}


def audio_registry() -> dict[str, dict]:
    tokens = {}
    for voice_id, voice in VOICES.items():
        for word in WORDS:
            tokens[f"{voice_id}-{word}"] = {"text": word, "voice": voice, "rate": -1}
        for word in ("ship", "sheep"):
            tokens[f"{voice_id}-sentence-{word}"] = {
                "text": f"I can see a {word}.",
                "voice": voice,
                "rate": -1,
            }
    return tokens


def lesson_view() -> dict:
    return {
        "id": "ih-ee-v1",
        "title": {"vi": "Nghe rõ /ɪ/ và /iː/", "en": "Hear /ɪ/ and /iː/"},
        "contrast": ["/ɪ/", "/iː/"],
        "reference_accent": "en-US",
        "pairs": [
            {"id": f"{a}-{b}", "words": [WORDS[a], WORDS[b]]}
            for pairs in GROUPS.values()
            for a, b in pairs
        ],
        "explanation": {
            "vi": (
                "Bắt đầu bằng nghe phân biệt, luyện từng từ, rồi đưa từ vào câu. "
                "Điểm nghe và lượt luyện nói được ghi riêng."
            ),
            "en": (
                "First distinguish the vowels, then practise words and sentences. "
                "Listening scores and speaking attempts are separate."
            ),
        },
        "production_guidance": GUIDANCE,
        "audio_reviewed": False,
    }


def make_trials(mode: str) -> list[dict]:
    trials = []
    for index, pair in enumerate(GROUPS[mode]):
        voice = "zira" if index % 2 == 0 else "david"
        for answer in pair:
            trials.append(
                {
                    "id": uuid4().hex,
                    "audio_token": f"{voice}-{answer}",
                    "options": [WORDS[word] for word in pair],
                    "correct_option_id": answer,
                }
            )
    random.SystemRandom().shuffle(trials)
    return trials


def production_prompt(index: int) -> dict:
    word = "ship" if index % 2 == 0 else "sheep"
    sentence = index >= 2
    text = f"I can see a {word}." if sentence else word
    start = text.index(word)
    return {
        "id": f"{'sentence' if sentence else 'word'}-{word}",
        "text": text,
        "target_word": word,
        "target_ipa": WORDS[word]["ipa"],
        "segment_start": start,
        "segment_end": start + len(word),
        "audio_url": f"/api/audio/zira-{'sentence-' if sentence else ''}{word}.wav",
        "guidance": SENTENCE_GUIDANCE if sentence else GUIDANCE,
    }
