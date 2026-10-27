import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(os.environ.get("CIPHER_DB") or Path(__file__).parent / "cipher.db")


def now() -> str:
    """UTC timestamp, ISO 8601 with a Z so the browser parses it correctly."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect():
    # one connection per request; async endpoints and their sync dependencies may run on different threads
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    tagline TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    mood TEXT NOT NULL DEFAULT '',
    now_playing TEXT NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    meet TEXT NOT NULL DEFAULT '',
    interests TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT '{}',
    top_friends TEXT NOT NULL DEFAULT '[]',
    avatar BLOB,
    avatar_mime TEXT,
    avatar_v INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
);
CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at TEXT NOT NULL,
    UNIQUE (requester_id, addressee_id)
);
CREATE TABLE IF NOT EXISTS blocks (
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_author ON posts (author_id, id);
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_profile ON comments (profile_id, id);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    iv TEXT NOT NULL,
    ct TEXT NOT NULL,
    spub TEXT NOT NULL,
    rpub TEXT NOT NULL,
    created_at TEXT NOT NULL,
    delivered_at TEXT,
    read_at TEXT
);
CREATE INDEX IF NOT EXISTS messages_pair ON messages (sender_id, recipient_id, id);
CREATE INDEX IF NOT EXISTS messages_inbox ON messages (recipient_id, read_at);
"""


def _add_column(conn, table, column, ddl):
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})")]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")


def init_db():
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        # columns added after the first version, so old cipher.db files still work
        _add_column(conn, "users", "public_key", "TEXT")
        _add_column(conn, "users", "last_seen", "TEXT")
        conn.execute(
            "INSERT OR IGNORE INTO profiles (user_id, display_name, updated_at) "
            "SELECT id, username, ? FROM users",
            (now(),),
        )
        conn.commit()
    finally:
        conn.close()
