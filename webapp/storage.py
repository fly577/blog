import sqlite3
from pathlib import Path
from typing import Any


DB_PATH = Path(__file__).resolve().parents[1] / "data" / "app.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS query_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                city TEXT NOT NULL,
                days INTEGER NOT NULL,
                weather TEXT NOT NULL,
                attraction TEXT NOT NULL DEFAULT '',
                include_attraction INTEGER NOT NULL DEFAULT 0,
                task_type TEXT NOT NULL DEFAULT '天气',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                history_id INTEGER,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                city TEXT NOT NULL,
                days INTEGER NOT NULL,
                weather TEXT NOT NULL,
                attraction TEXT NOT NULL DEFAULT '',
                include_attraction INTEGER NOT NULL DEFAULT 0,
                task_type TEXT NOT NULL DEFAULT '天气',
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        ensure_column(conn, "query_history", "task_type", "TEXT NOT NULL DEFAULT '天气'")
        ensure_column(conn, "favorites", "task_type", "TEXT NOT NULL DEFAULT '天气'")


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    if any(row["name"] == column for row in rows):
        return
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    if "include_attraction" in data:
        data["include_attraction"] = bool(data["include_attraction"])
    return data


def add_history(question: str, result: dict[str, Any]) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO query_history (
                question, answer, city, days, weather, attraction, include_attraction, task_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                question,
                result.get("answer", ""),
                result.get("city", ""),
                int(result.get("days", 1)),
                result.get("weather", ""),
                result.get("attraction", ""),
                1 if result.get("include_attraction") else 0,
                result.get("task_type", "天气"),
            ),
        )
        return int(cursor.lastrowid)


def list_history(limit: int = 20) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM query_history
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def clear_history() -> None:
    with get_connection() as conn:
        conn.execute("DELETE FROM query_history")


def add_favorite(payload: dict[str, Any]) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO favorites (
                history_id, question, answer, city, days, weather, attraction, include_attraction, task_type, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("history_id"),
                payload.get("question", ""),
                payload.get("answer", ""),
                payload.get("city", ""),
                int(payload.get("days", 1)),
                payload.get("weather", ""),
                payload.get("attraction", ""),
                1 if payload.get("include_attraction") else 0,
                payload.get("task_type", "天气"),
                payload.get("note", ""),
            ),
        )
        return int(cursor.lastrowid)


def list_favorites(limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM favorites
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [row_to_dict(row) for row in rows]


def delete_favorite(favorite_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM favorites WHERE id = ?", (favorite_id,))
        return cursor.rowcount > 0
