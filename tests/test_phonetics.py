from speakloop.phonetics import collapse_ctc


def test_ctc_blanks_separate_repeated_phones():
    vocabulary = {0: "<pad>", 1: "ɪ", 2: "iː"}
    assert collapse_ctc([0, 1, 1, 0, 1, 2, 2, 0], vocabulary) == ["ɪ", "ɪ", "iː"]
    assert collapse_ctc([], vocabulary) == []
