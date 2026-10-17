"""Offline evaluation commands. This module makes no model/API calls."""

import argparse
import hashlib
import json
import sys
from pathlib import Path

from pydantic import ValidationError

from speakloop.audio import inspect_wav
from speakloop.benchmark import read_jsonl, validate_manifest
from speakloop.contracts import Clip, EvaluationConfig, Prediction
from speakloop.evaluation import evaluate


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="speakloop")
    commands = parser.add_subparsers(dest="command", required=True)
    validate = commands.add_parser("validate", help="Validate metadata/splits (no model calls)")
    validate.add_argument("manifest", type=Path)
    validate.add_argument("--check-audio", action="store_true")
    report = commands.add_parser("evaluate", help="Evaluate held-out policy decisions")
    report.add_argument("manifest", type=Path)
    report.add_argument("predictions", type=Path)
    report.add_argument("--config", type=Path, default=Path("configs/evaluation.v1.json"))
    report.add_argument("--metadata-only", action="store_true", help="Never permits gate pass")
    report.add_argument("--output", type=Path)
    audio = commands.add_parser("audio", help="Inspect physical PCM16 WAV properties")
    audio.add_argument("path", type=Path)
    schemas = commands.add_parser("schemas", help="Export schemas from authoritative contracts")
    schemas.add_argument("--output-dir", type=Path, default=Path("benchmark/schemas"))
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        code = 0
        if args.command == "schemas":
            args.output_dir.mkdir(parents=True, exist_ok=True)
            for name, model in (
                ("clip", Clip),
                ("prediction", Prediction),
                ("evaluation-config", EvaluationConfig),
            ):
                (args.output_dir / f"{name}.json").write_text(
                    json.dumps(model.model_json_schema(), ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
            result = {"schemas_written": 3, "directory": str(args.output_dir)}
        elif args.command == "audio":
            result = inspect_wav(args.path)
            code = 0 if result["status"] != "invalid" else 3
        else:
            clips = read_jsonl(args.manifest, Clip)
            check_audio = args.check_audio if args.command == "validate" else not args.metadata_only
            validate_manifest(clips, args.manifest.parent, check_audio=check_audio)
            if args.command == "validate":
                result = {
                    "metadata_valid": True,
                    "clips": len(clips),
                    "audio_files_checked": check_audio,
                    "diagnosis_ready": False,
                }
            else:
                config = EvaluationConfig.model_validate_json(args.config.read_text("utf-8"))
                predictions = read_jsonl(args.predictions, Prediction)
                result = evaluate(clips, predictions, config, audio_files_checked=check_audio)
                result["manifest_sha256"] = hashlib.sha256(args.manifest.read_bytes()).hexdigest()
                result["predictions_sha256"] = hashlib.sha256(
                    args.predictions.read_bytes()
                ).hexdigest()
                result["config_sha256"] = hashlib.sha256(args.config.read_bytes()).hexdigest()
                code = 0 if result["status"] == "pass" else 3
        rendered = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if getattr(args, "output", None):
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered, encoding="utf-8")
        # Windows terminals may use a legacy code page that cannot print IPA.
        # JSON escapes preserve content on stdout; saved reports remain UTF-8.
        print(json.dumps(result, ensure_ascii=True, indent=2, allow_nan=False))
        return code
    except ValidationError as exc:
        fields = [".".join(map(str, error["loc"])) for error in exc.errors()]
        print("Invalid fields: " + ", ".join(fields), file=sys.stderr)
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
    return 2
