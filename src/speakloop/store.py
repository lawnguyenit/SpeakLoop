"""Transactional single-user lesson state. Raw recordings/transcripts are never stored."""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from speakloop.lesson import make_trials, production_prompt


class ActivityError(Exception):
    def __init__(self, code: str, status: int = 409):
        self.code, self.status = code, status
        super().__init__(code)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.transaction() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY, mode TEXT NOT NULL, language TEXT NOT NULL,
                position INTEGER NOT NULL DEFAULT 0, trials_json TEXT NOT NULL,
                answers_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL,
                completed_at TEXT, review_due_at TEXT, reviewed_at TEXT)""")
            db.execute("""CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
                prompt_id TEXT NOT NULL, audio_sha256 TEXT NOT NULL, result_json TEXT NOT NULL,
                created_at TEXT NOT NULL)""")
            db.execute(
                "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, language TEXT)"
            )
            db.execute("INSERT OR IGNORE INTO settings VALUES (1, 'vi')")

    @contextmanager
    def transaction(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _row(self, db, session_id):
        row = db.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
        if row is None:
            raise ActivityError("session_not_found", 404)
        return row

    def _view(self, db, row):
        position = row["position"]
        answers = json.loads(row["answers_json"])
        score_visible = row["mode"] == "practice" or position == 12
        correct = sum(answer["correct"] for answer in answers.values())
        score = {
            "correct": correct if score_visible else None,
            "total": len(answers),
            "accuracy": correct / len(answers) if score_visible and answers else None,
        }
        phase = (
            "perception"
            if position < 8
            else ("word" if position < 10 else ("sentence" if position < 12 else "complete"))
        )
        trial = None
        if phase == "perception":
            item = json.loads(row["trials_json"])[position]
            trial = {
                "id": item["id"],
                "audio_url": f"/api/audio/{item['audio_token']}.wav",
                "options": [
                    {k: option[k] for k in ("id", "text", "ipa")} for option in item["options"]
                ],
            }
        return {
            "id": row["id"],
            "mode": row["mode"],
            "language": row["language"],
            "phase": phase,
            "current": position + 1
            if position < 8
            else ((position - 8) % 2 + 1 if position < 12 else 0),
            "total": 8 if position < 8 else (2 if position < 12 else 0),
            "trial": trial,
            "prompt": production_prompt(position - 8) if 8 <= position < 12 else None,
            "perception": score,
            "production_attempts": db.execute(
                "SELECT COUNT(*) FROM attempts WHERE session_id=?", (row["id"],)
            ).fetchone()[0],
            "review_due_at": row["review_due_at"],
        }

    def start(self, mode, language):
        session_id = str(uuid4())
        with self.transaction() as db:
            db.execute(
                "INSERT INTO sessions (id,mode,language,trials_json,created_at) VALUES (?,?,?,?,?)",
                (session_id, mode, language, json.dumps(make_trials(mode)), now()),
            )
            return self._view(db, self._row(db, session_id))

    def get(self, session_id):
        with self.transaction() as db:
            return self._view(db, self._row(db, session_id))

    def answer(self, session_id, trial_id, option_id):
        with self.transaction() as db:
            row = self._row(db, session_id)
            answers = json.loads(row["answers_json"])
            if trial_id in answers:
                if answers[trial_id]["option_id"] != option_id:
                    raise ActivityError("answer_already_submitted")
                correct = answers[trial_id]["correct"]
                item = next(t for t in json.loads(row["trials_json"]) if t["id"] == trial_id)
            else:
                if row["position"] >= 8:
                    raise ActivityError("activity_changed")
                item = json.loads(row["trials_json"])[row["position"]]
                if item["id"] != trial_id or option_id not in {o["id"] for o in item["options"]}:
                    raise ActivityError("invalid_answer")
                correct = option_id == item["correct_option_id"]
                answers[trial_id] = {"option_id": option_id, "correct": correct}
                db.execute(
                    "UPDATE sessions SET position=position+1, answers_json=? WHERE id=?",
                    (json.dumps(answers), session_id),
                )
            visible = row["mode"] == "practice"
            return {
                "correct": correct if visible else None,
                "correct_option_id": item["correct_option_id"] if visible else None,
                "session": self._view(db, self._row(db, session_id)),
            }

    def cached_attempt(self, session_id, attempt_id, prompt_id, digest):
        with self.transaction() as db:
            self._row(db, session_id)
            row = db.execute("SELECT * FROM attempts WHERE id=?", (attempt_id,)).fetchone()
            if row is None:
                return None
            if (row["session_id"], row["prompt_id"], row["audio_sha256"]) != (
                session_id,
                prompt_id,
                digest,
            ):
                raise ActivityError("attempt_id_conflict")
            return json.loads(row["result_json"])

    def check_prompt(self, session_id, prompt_id):
        view = self.get(session_id)
        if view["prompt"] is None or view["prompt"]["id"] != prompt_id:
            raise ActivityError("activity_changed")

    def record(self, session_id, attempt_id, prompt_id, digest, result):
        with self.transaction() as db:
            row = self._row(db, session_id)
            existing = db.execute("SELECT * FROM attempts WHERE id=?", (attempt_id,)).fetchone()
            if existing:
                if (existing["session_id"], existing["prompt_id"], existing["audio_sha256"]) != (
                    session_id,
                    prompt_id,
                    digest,
                ):
                    raise ActivityError("attempt_id_conflict")
                return json.loads(existing["result_json"])
            view = self._view(db, row)
            if not view["prompt"] or view["prompt"]["id"] != prompt_id:
                raise ActivityError("activity_changed")
            safe = dict(result, transcript=None)
            db.execute(
                "INSERT INTO attempts VALUES (?,?,?,?,?,?)",
                (attempt_id, session_id, prompt_id, digest, json.dumps(safe), now()),
            )
            return result

    def advance(self, session_id, prompt_id):
        with self.transaction() as db:
            row = self._row(db, session_id)
            view = self._view(db, row)
            if not view["prompt"] or view["prompt"]["id"] != prompt_id:
                raise ActivityError("activity_changed")
            attempts = db.execute(
                "SELECT result_json FROM attempts WHERE session_id=? AND prompt_id=?",
                (session_id, prompt_id),
            ).fetchall()
            if not any(
                json.loads(a["result_json"])["decision"] != "invalid_audio" for a in attempts
            ):
                raise ActivityError("recording_required")
            position = row["position"] + 1
            if position == 12:
                completed = now()
                due = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                db.execute(
                    "UPDATE sessions SET position=?,completed_at=?,review_due_at=? WHERE id=?",
                    (position, completed, due, session_id),
                )
                if row["mode"] == "review":
                    db.execute(
                        "UPDATE sessions SET reviewed_at=? WHERE review_due_at<=? "
                        "AND reviewed_at IS NULL",
                        (completed, completed),
                    )
            else:
                db.execute("UPDATE sessions SET position=? WHERE id=?", (position, session_id))
            return self._view(db, self._row(db, session_id))

    def settings(self, language=None):
        with self.transaction() as db:
            if language is not None:
                db.execute("UPDATE settings SET language=? WHERE id=1", (language,))
            return {
                "language": db.execute("SELECT language FROM settings WHERE id=1").fetchone()[0]
            }

    def progress(self):
        with self.transaction() as db:
            rows = db.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
            sessions = []
            correct = total = 0
            for row in rows:
                view = self._view(db, row)
                if view["perception"]["correct"] is not None:
                    correct += view["perception"]["correct"]
                    total += view["perception"]["total"]
                sessions.append(
                    {
                        "id": row["id"],
                        "mode": row["mode"],
                        "phase": view["phase"],
                        "created_at": row["created_at"],
                        "completed_at": row["completed_at"],
                        "review_due_at": row["review_due_at"],
                        "perception": view["perception"],
                    }
                )
            due = [r["review_due_at"] for r in rows if r["review_due_at"] and not r["reviewed_at"]]
            return {
                "sessions_started": len(rows),
                "sessions_completed": sum(r["completed_at"] is not None for r in rows),
                "perception": {
                    "correct": correct,
                    "total": total,
                    "accuracy": correct / total if total else None,
                },
                "production": {
                    "attempts": db.execute("SELECT COUNT(*) FROM attempts").fetchone()[0],
                    "diagnosis_ready": False,
                },
                "reviews_due": sum(date <= now() for date in due),
                "next_review_at": min(due) if due else None,
                "sessions": sessions,
            }
