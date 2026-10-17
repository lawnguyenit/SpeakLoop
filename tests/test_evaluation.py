"""All examples here are fabricated unit-test data, never an acoustic benchmark."""

import json
from io import BytesIO, TextIOWrapper

import pytest
from pydantic import ValidationError

from speakloop.benchmark import validate_manifest
from speakloop.cli import main
from speakloop.contracts import Clip, EvaluationConfig, Prediction
from speakloop.evaluation import evaluate, wilson


def make_clip(index=0, label="substitution", **changes):
    target = "/ɪ/" if index % 2 == 0 else "/iː/"
    observed = target if label == "correct" else ("/iː/" if target == "/ɪ/" else "/ɪ/")
    data = {
        "id": f"unit-{index}",
        "audio_path": f"audio/unit-{index}.wav",
        "expected_text": "ship" if target == "/ɪ/" else "sheep",
        "target_phoneme": target,
        "segment_start": 2,
        "segment_end": 3 if target == "/ɪ/" else 4,
        "expected_class": label,
        "human_label": "FABRICATED UNIT TEST LABEL",
        "observed_phoneme": observed if label in {"correct", "substitution"} else None,
        "annotation_status": "reviewed",
        "annotators": ["test-reviewer-a", "test-reviewer-b"],
        "speaker_id": f"test-speaker-{index % 4}",
        "l1": "vi",
        "device": f"test-device-{index % 2}",
        "noise_condition": "clean" if label != "unusable" else "noisy",
        "condition": "valid_accent_variant" if label == "correct" else "ordinary",
        "level": "word" if index % 2 == 0 else "sentence",
        "split": "held_out",
        "source_kind": "human",  # Simulates metadata only; there are no real clips here.
        "source_reference": "unit-test-only",
        "license_or_consent": "not-real-data",
    }
    return Clip.model_validate(data | changes)


def make_prediction(clip, **changes):
    decision = {
        "correct": "supported_correct",
        "substitution": "likely_error",
        "ambiguous": "abstain",
        "unusable": "invalid_audio",
    }[clip.expected_class]
    data = {
        "clip_id": clip.id,
        "provider_version": "unit-test-model-v1",
        "policy_version": "unit-test-policy-v1",
        "evidence_reference": "unit-test-evidence",
        "evidence_kind": "acoustic",
        "audio_status": "invalid" if clip.expected_class == "unusable" else "valid",
        "decision": decision,
        "hypothesis": clip.observed_phoneme,
        "segment_start": clip.segment_start,
        "segment_end": clip.segment_end,
        "calibrated_confidence": 0.99,
        "calibration_reference": "unit-test-calibration-only",
        "abstain_reason": "test_uncertain" if decision in {"abstain", "invalid_audio"} else None,
        "latency_ms": 120,
    }
    return Prediction.model_validate(data | changes)


def test_empty_benchmark_cannot_pass():
    report = evaluate([], [], EvaluationConfig(), audio_files_checked=True)
    assert report["status"] == "insufficient_evidence"
    assert report["metrics"]["error_precision"] is None
    assert not report["deployment_approved"]


def test_all_abstain_cannot_appear_perfect():
    clip = make_clip()
    pred = make_prediction(clip, decision="abstain", abstain_reason="not_validated")
    report = evaluate([clip], [pred], EvaluationConfig())
    assert report["status"] == "insufficient_evidence"
    assert report["metrics"]["coverage"] == 0
    assert report["metrics"]["error_precision"] is None


@pytest.mark.parametrize("label", ["correct", "ambiguous", "unusable"])
def test_false_error_on_variant_ambiguous_or_bad_audio_is_counted(label):
    clip = make_clip(label=label)
    pred = make_prediction(clip, decision="likely_error", hypothesis="/iː/", audio_status="valid")
    report = evaluate([clip], [pred], EvaluationConfig())
    assert report["metrics"]["unsafe_claim_rate"] == 1
    assert report["metrics"]["error_precision"] == 0


def test_false_reassurance_on_ambiguous_is_counted():
    clip = make_clip(label="ambiguous")
    pred = make_prediction(clip, decision="supported_correct", hypothesis=clip.target_phoneme)
    report = evaluate([clip], [pred], EvaluationConfig())
    assert report["metrics"]["unsafe_claims"] == 1


def test_wrong_location_does_not_count_as_correct_diagnosis():
    clip = make_clip()
    pred = make_prediction(clip, segment_start=0, segment_end=1)
    assert evaluate([clip], [pred], EvaluationConfig())["metrics"]["error_precision"] == 0


def test_missing_duplicate_or_unknown_predictions_are_rejected():
    clip = make_clip()
    pred = make_prediction(clip)
    for predictions in ([], [pred, pred], [make_prediction(clip, clip_id="unknown")]):
        with pytest.raises(ValueError):
            evaluate([clip], predictions, EvaluationConfig())


def test_synthetic_data_and_metadata_only_cannot_pass():
    clip = make_clip(source_kind="synthetic")
    report = evaluate([clip], [make_prediction(clip)], EvaluationConfig())
    assert "human_reviewed_examples_required" in report["insufficient_evidence_reasons"]
    assert "audio_files_not_verified" in report["insufficient_evidence_reasons"]


def test_single_frozen_provider_required():
    clips = [make_clip(0), make_clip(1)]
    predictions = [make_prediction(clips[0]), make_prediction(clips[1], provider_version="other")]
    with pytest.raises(ValueError, match="single frozen"):
        evaluate(clips, predictions, EvaluationConfig())


def test_balanced_simulated_large_sample_can_pass_numeric_gates():
    # This tests arithmetic/control flow only, not model or acoustic performance.
    labels = ["substitution"] * 80 + ["correct"] * 60 + ["ambiguous"] * 40 + ["unusable"] * 40
    clips = [make_clip(i, label) for i, label in enumerate(labels)]
    report = evaluate(
        clips, [make_prediction(c) for c in clips], EvaluationConfig(), audio_files_checked=True
    )
    assert report["status"] == "pass"
    assert report["metrics"]["error_precision_wilson95"][0] > 0.90
    assert not report["deployment_approved"]


def test_wilson_reports_uncertainty_for_tiny_perfect_sample():
    assert wilson(0, 0) is None
    assert wilson(1, 1)[0] < 0.25
    assert wilson(40, 40)[0] > 0.90


@pytest.mark.parametrize(
    "field,value",
    [
        ("evidence_kind", "asr_only"),
        ("audio_status", "uncertain"),
        ("calibration_reference", None),
        ("calibrated_confidence", float("nan")),
    ],
)
def test_unsupported_claim_contracts_rejected(field, value):
    with pytest.raises(ValidationError):
        make_prediction(make_clip(), **{field: value})


@pytest.mark.parametrize("path", ["../private.wav", "C:/voice.wav", "/voice.wav", "audio\\x.wav"])
def test_path_traversal_or_absolute_paths_rejected(path):
    with pytest.raises(ValidationError):
        make_clip(audio_path=path)


def test_leaking_speaker_and_duplicate_record_rejected(tmp_path):
    clips = [make_clip(0), make_clip(4, split="development")]
    with pytest.raises(ValueError, match="speaker crosses"):
        validate_manifest(clips, tmp_path)
    with pytest.raises(ValueError, match="duplicate clip"):
        validate_manifest([clips[0], clips[0]], tmp_path)


def test_cli_empty_report_uses_nonzero_and_does_not_say_ready(tmp_path, capsys):
    manifest, predictions = tmp_path / "manifest.jsonl", tmp_path / "predictions.jsonl"
    manifest.write_text("", encoding="utf-8")
    predictions.write_text("", encoding="utf-8")
    assert main(["evaluate", str(manifest), str(predictions)]) == 3
    assert json.loads(capsys.readouterr().out)["status"] == "insufficient_evidence"


def test_missing_audio_or_local_permission_rejected(tmp_path):
    with pytest.raises(ValueError, match="not permitted"):
        validate_manifest([make_clip()], tmp_path, check_audio=True)
    with pytest.raises(ValueError, match="missing audio"):
        validate_manifest([make_clip(local_processing_allowed=True)], tmp_path, check_audio=True)


def test_schemas_exported_from_contracts(tmp_path):
    assert main(["schemas", "--output-dir", str(tmp_path)]) == 0
    assert json.loads((tmp_path / "clip.json").read_text("utf-8")) == Clip.model_json_schema()


def test_cli_ipa_report_works_with_legacy_windows_stdout(monkeypatch, tmp_path):
    clip = make_clip()
    manifest, predictions = tmp_path / "manifest.jsonl", tmp_path / "predictions.jsonl"
    manifest.write_text(clip.model_dump_json() + "\n", encoding="utf-8")
    predictions.write_text(make_prediction(clip).model_dump_json() + "\n", encoding="utf-8")
    buffer = BytesIO()
    terminal = TextIOWrapper(buffer, encoding="ascii")
    monkeypatch.setattr("sys.stdout", terminal)
    assert main(["evaluate", str(manifest), str(predictions), "--metadata-only"]) == 3
    terminal.flush()
    report = json.loads(buffer.getvalue().decode("ascii"))
    assert "/ɪ/" in report["slices"]["target_phoneme"]
