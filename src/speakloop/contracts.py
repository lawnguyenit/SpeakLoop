"""Versioned, provider-neutral benchmark contracts; no provider prose is accepted."""

from pathlib import PurePosixPath, PureWindowsPath
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Text = Annotated[str, Field(min_length=1)]
Probability = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
Phoneme = Literal["/ɪ/", "/iː/"]
Label = Literal["correct", "substitution", "ambiguous", "unusable"]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class Clip(Contract):
    id: Text
    audio_path: Text
    audio_sha256: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")] | None = None
    expected_text: Text
    target_phoneme: Phoneme
    segment_start: Annotated[int, Field(ge=0, strict=True)]
    segment_end: Annotated[int, Field(gt=0, strict=True)]
    expected_class: Label
    human_label: Text
    observed_phoneme: Phoneme | None = None
    annotation_status: Literal["unreviewed", "reviewed"] = "unreviewed"
    annotators: list[Text] = Field(default_factory=list)
    speaker_id: Text
    l1: Text
    device: Text
    noise_condition: Literal["clean", "noisy", "unknown"]
    condition: Literal["ordinary", "valid_accent_variant", "device_variation"] = "ordinary"
    level: Literal["word", "sentence"]
    split: Literal["development", "calibration", "held_out"]
    source_kind: Literal["human", "synthetic", "fixture"]
    source_reference: Text
    license_or_consent: Text
    local_processing_allowed: bool = False
    cloud_processing_allowed: bool = False

    @field_validator("audio_path")
    @classmethod
    def relative_audio_path(cls, value: str) -> str:
        path = PurePosixPath(value)
        if (
            "\\" in value
            or PureWindowsPath(value).drive
            or path.is_absolute()
            or ".." in path.parts
            or path.suffix.lower() != ".wav"
        ):
            raise ValueError("audio_path must be a relative WAV path without traversal")
        return value

    @model_validator(mode="after")
    def consistent_label(self) -> "Clip":
        if not self.segment_start < self.segment_end <= len(self.expected_text):
            raise ValueError("segment offsets must identify a nonempty span in expected_text")
        if len(set(self.annotators)) != len(self.annotators):
            raise ValueError("annotator IDs must be unique")
        if self.annotation_status == "reviewed" and len(self.annotators) < 2:
            raise ValueError("reviewed clips need at least two independent annotator IDs")
        if self.expected_class == "substitution":
            if self.observed_phoneme is None or self.observed_phoneme == self.target_phoneme:
                raise ValueError(
                    "substitution requires the other contrast vowel as observed_phoneme"
                )
        elif self.expected_class == "correct" and self.observed_phoneme != self.target_phoneme:
            raise ValueError("correct clips must label the preserved target vowel")
        elif self.expected_class in {"ambiguous", "unusable"} and self.observed_phoneme:
            raise ValueError("uncertain/unusable clips cannot have a definitive observed vowel")
        return self


class Prediction(Contract):
    clip_id: Text
    provider_version: Text
    policy_version: Text
    evidence_reference: Text
    evidence_kind: Literal["none", "asr_only", "acoustic", "phoneme_recognition"]
    audio_status: Literal["invalid", "uncertain", "valid"]
    decision: Literal["likely_error", "supported_correct", "abstain", "invalid_audio"]
    hypothesis: Phoneme | None = None
    segment_start: Annotated[int, Field(ge=0, strict=True)] | None = None
    segment_end: Annotated[int, Field(gt=0, strict=True)] | None = None
    calibrated_confidence: Probability | None = None
    calibration_reference: Text | None = None
    abstain_reason: Text | None = None
    latency_ms: Annotated[float, Field(ge=0, allow_inf_nan=False)]

    @model_validator(mode="after")
    def supported_claim(self) -> "Prediction":
        if self.decision in {"likely_error", "supported_correct"}:
            if self.audio_status != "valid":
                raise ValueError("specific claims require valid speech audio")
            if self.evidence_kind not in {"acoustic", "phoneme_recognition"}:
                raise ValueError("ASR alone cannot support a pronunciation claim")
            if self.calibrated_confidence is None or not self.calibration_reference:
                raise ValueError("specific claims require calibrated evidence and its reference")
            if self.hypothesis is None or self.segment_start is None or self.segment_end is None:
                raise ValueError("specific claims require hypothesis and written span")
            if self.segment_end <= self.segment_start:
                raise ValueError("specific claims require a nonempty span")
        else:
            if not self.abstain_reason:
                raise ValueError("abstention/invalid audio requires an explanation code")
            if self.decision == "invalid_audio" and self.audio_status != "invalid":
                raise ValueError("invalid_audio requires invalid audio_status")
        return self


class EvaluationConfig(Contract):
    version: Text = "evaluation-v1"
    min_held_out: Annotated[int, Field(gt=0)] = 120
    min_per_class: Annotated[int, Field(gt=0)] = 30
    min_speakers: Annotated[int, Field(ge=2)] = 4
    min_vietnamese_speakers: Annotated[int, Field(ge=1)] = 2
    min_devices: Annotated[int, Field(ge=1)] = 2
    min_error_claims: Annotated[int, Field(gt=0)] = 40
    min_claim_confidence: Probability = 0.95
    error_precision: Probability = 0.95
    precision_lower_bound: Probability = 0.90
    max_unsafe_claim_rate: Probability = 0.05
    min_invalid_detection: Probability = 0.95
    max_false_rejection: Probability = 0.10
    min_ambiguous_abstention: Probability = 0.90
    max_p95_latency_ms: Annotated[float, Field(gt=0, allow_inf_nan=False)] = 8000
