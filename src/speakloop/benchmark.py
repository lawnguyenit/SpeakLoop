"""Read metadata without silently dropping malformed rows or leaking splits."""

import hashlib
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from speakloop.contracts import Clip

T = TypeVar("T", bound=BaseModel)


def read_jsonl(path: Path, model: type[T]) -> list[T]:
    records: list[T] = []
    for number, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            records.append(model.model_validate_json(line))
        except ValidationError as exc:
            # Report field paths/types, not raw recordings, private text, or secrets.
            errors = [f"{'.'.join(map(str, e['loc']))}: {e['type']}" for e in exc.errors()]
            raise ValueError(f"{path.name}:{number}: {'; '.join(errors)}") from None
    return records


def validate_manifest(clips: list[Clip], root: Path, check_audio: bool = False) -> None:
    ids: set[str] = set()
    speakers: dict[str, str] = {}
    hashes: set[str] = set()
    paths: set[str] = set()
    root = root.resolve()
    for clip in clips:
        if clip.id in ids:
            raise ValueError(f"duplicate clip ID: {clip.id}")
        ids.add(clip.id)
        if clip.speaker_id in speakers and speakers[clip.speaker_id] != clip.split:
            raise ValueError(f"speaker crosses splits: {clip.speaker_id}")
        speakers[clip.speaker_id] = clip.split
        if clip.audio_path.casefold() in paths:
            raise ValueError(f"duplicate audio path: {clip.id}")
        paths.add(clip.audio_path.casefold())
        if clip.audio_sha256:
            if clip.audio_sha256 in hashes:
                raise ValueError(f"duplicate audio digest: {clip.id}")
            hashes.add(clip.audio_sha256)
        path = (root / clip.audio_path).resolve()
        if not path.is_relative_to(root):
            raise ValueError(f"audio path escapes benchmark root: {clip.id}")
        if check_audio:
            if not clip.local_processing_allowed:
                raise ValueError(f"local processing not permitted: {clip.id}")
            if not path.is_file():
                raise ValueError(f"missing audio: {clip.id}")
            if path.stat().st_size > 10 * 1024 * 1024:
                raise ValueError(f"audio exceeds 10 MiB: {clip.id}")
            actual = hashlib.sha256(path.read_bytes()).hexdigest()
            if clip.audio_sha256 != actual:
                raise ValueError(f"missing/mismatched audio digest: {clip.id}")
