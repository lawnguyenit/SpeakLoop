"""CTC label normalization only; labels are not calibrated pronunciation claims."""


def collapse_ctc(ids: list[int], vocabulary: dict[int, str], blank_id: int = 0) -> list[str]:
    labels = []
    previous = None
    for token in ids:
        if token != blank_id and token != previous:
            labels.append(vocabulary[token])
        previous = token
    return labels
