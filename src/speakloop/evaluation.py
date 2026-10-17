"""Conservative diagnostic reporting; all-abstain and tiny samples cannot pass."""

import math
from collections import Counter

from speakloop.contracts import Clip, EvaluationConfig, Prediction

CLAIMS = {"likely_error", "supported_correct"}


def rate(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def wilson(successes: int, total: int) -> list[float] | None:
    if not total:
        return None
    z = 1.959963984540054
    p = successes / total
    scale = 1 + z * z / total
    center = (p + z * z / (2 * total)) / scale
    margin = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / scale
    return [max(0.0, center - margin), min(1.0, center + margin)]


def _claim_correct(clip: Clip, prediction: Prediction) -> bool:
    span_correct = (
        prediction.segment_start == clip.segment_start
        and prediction.segment_end == clip.segment_end
    )
    if prediction.decision == "likely_error":
        return (
            clip.expected_class == "substitution"
            and prediction.hypothesis == clip.observed_phoneme
            and span_correct
        )
    if prediction.decision == "supported_correct":
        return (
            clip.expected_class == "correct"
            and prediction.hypothesis == clip.target_phoneme
            and span_correct
        )
    return False


def _metrics(clips: list[Clip], predictions: dict[str, Prediction]) -> dict:
    errors = [c for c in clips if predictions[c.id].decision == "likely_error"]
    true_errors = sum(_claim_correct(c, predictions[c.id]) for c in errors)
    claims = [c for c in clips if predictions[c.id].decision in CLAIMS]
    unsafe = sum(not _claim_correct(c, predictions[c.id]) for c in claims)
    usable = [c for c in clips if c.expected_class != "unusable"]
    invalid = [c for c in clips if c.expected_class == "unusable"]
    ambiguous = [c for c in clips if c.expected_class == "ambiguous"]
    clean = [
        c
        for c in clips
        if c.expected_class in {"correct", "substitution"} and c.noise_condition == "clean"
    ]
    latencies = sorted(predictions[c.id].latency_ms for c in clips)
    return {
        "attempts": len(clips),
        "class_counts": dict(Counter(c.expected_class for c in clips)),
        "error_claims": len(errors),
        "correct_error_claims": true_errors,
        "error_precision": rate(true_errors, len(errors)),
        "error_precision_wilson95": wilson(true_errors, len(errors)),
        "unsafe_claims": unsafe,
        "unsafe_claim_rate": rate(unsafe, len(clips)),
        "unsafe_claim_rate_wilson95": wilson(unsafe, len(clips)),
        "invalid_detection": rate(
            sum(predictions[c.id].decision == "invalid_audio" for c in invalid), len(invalid)
        ),
        "false_audio_rejection": rate(
            sum(predictions[c.id].decision == "invalid_audio" for c in clean), len(clean)
        ),
        "ambiguous_abstention": rate(
            sum(predictions[c.id].decision == "abstain" for c in ambiguous), len(ambiguous)
        ),
        "coverage": rate(sum(predictions[c.id].decision in CLAIMS for c in usable), len(usable)),
        "p95_latency_ms": latencies[math.ceil(0.95 * len(latencies)) - 1] if latencies else None,
    }


def evaluate(
    clips: list[Clip],
    predictions: list[Prediction],
    config: EvaluationConfig,
    *,
    audio_files_checked: bool = False,
) -> dict:
    held_out = [c for c in clips if c.split == "held_out"]
    predicted = {p.clip_id: p for p in predictions}
    if len(predicted) != len(predictions):
        raise ValueError("duplicate prediction IDs")
    if len({c.id for c in clips}) != len(clips):
        raise ValueError("duplicate clip IDs")
    versions = {(p.provider_version, p.policy_version) for p in predictions}
    calibrations = {p.calibration_reference for p in predictions if p.decision in CLAIMS}
    if len(versions) > 1 or len(calibrations) > 1:
        raise ValueError("one run must use a single frozen provider, policy and calibration")
    expected_ids = {c.id for c in held_out}
    if set(predicted) != expected_ids:
        raise ValueError(
            "predictions must cover exactly the held-out IDs "
            f"(missing={len(expected_ids - predicted.keys())}, "
            f"unknown={len(predicted.keys() - expected_ids)})"
        )
    metrics = _metrics(held_out, predicted)
    counts = Counter(c.expected_class for c in held_out)
    insufficient: list[str] = []
    if not audio_files_checked:
        insufficient.append("audio_files_not_verified")
    if len(held_out) < config.min_held_out:
        insufficient.append("too_few_held_out_clips")
    if any(
        counts[label] < config.min_per_class
        for label in ("correct", "substitution", "ambiguous", "unusable")
    ):
        insufficient.append("too_few_examples_per_class")
    if any(c.source_kind != "human" or c.annotation_status != "reviewed" for c in held_out):
        insufficient.append("human_reviewed_examples_required")
    if len({c.speaker_id for c in held_out}) < config.min_speakers:
        insufficient.append("too_few_speakers")
    vietnamese = {c.speaker_id for c in held_out if c.l1.casefold() in {"vi", "vietnamese"}}
    if len(vietnamese) < config.min_vietnamese_speakers:
        insufficient.append("too_few_vietnamese_speakers")
    devices = {c.device for c in held_out if c.device.casefold() != "unknown"}
    if len(devices) < config.min_devices:
        insufficient.append("too_few_known_devices")
    if not any(c.condition == "valid_accent_variant" for c in held_out):
        insufficient.append("valid_accent_variant_examples_missing")
    if {c.level for c in held_out} != {"word", "sentence"}:
        insufficient.append("both_production_levels_required")
    if {c.target_phoneme for c in held_out} != {"/ɪ/", "/iː/"}:
        insufficient.append("both_vowels_required")
    if metrics["error_claims"] < config.min_error_claims:
        insufficient.append("too_few_specific_error_claims")

    failed: list[str] = []
    if any(
        p.decision in CLAIMS and p.calibrated_confidence < config.min_claim_confidence
        for p in predictions
    ):
        failed.append("claim_confidence_threshold")
    thresholds = [
        ("error_precision", config.error_precision, "min"),
        ("unsafe_claim_rate", config.max_unsafe_claim_rate, "max"),
        ("invalid_detection", config.min_invalid_detection, "min"),
        ("false_audio_rejection", config.max_false_rejection, "max"),
        ("ambiguous_abstention", config.min_ambiguous_abstention, "min"),
        ("p95_latency_ms", config.max_p95_latency_ms, "max"),
    ]
    for name, threshold, direction in thresholds:
        value = metrics[name]
        if value is None:
            insufficient.append(f"undefined_metric:{name}")
        elif (direction == "min" and value < threshold) or (
            direction == "max" and value > threshold
        ):
            failed.append(name)
    interval = metrics["error_precision_wilson95"]
    if interval and interval[0] < config.precision_lower_bound:
        failed.append("precision_lower_bound")

    slices = {}
    for field in ("speaker_id", "device", "l1", "level", "condition", "target_phoneme"):
        slices[field] = {
            value: _metrics([c for c in held_out if getattr(c, field) == value], predicted)
            for value in sorted({getattr(c, field) for c in held_out})
        }
    status = "insufficient_evidence" if insufficient else ("fail" if failed else "pass")
    return {
        "protocol_version": config.version,
        "provider_policy_versions": [list(value) for value in sorted(versions)],
        "calibration_references": sorted(calibrations),
        "status": status,
        "deployment_approved": False,
        "audio_files_checked": audio_files_checked,
        "metrics": metrics,
        "insufficient_evidence_reasons": insufficient,
        "failed_numeric_gates": failed,
        "slices": slices,
        "note": "Numeric/data gates do not replace human review of labels, rights and calibration.",
    }
