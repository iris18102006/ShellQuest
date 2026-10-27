import hashlib

from fastapi import Cookie, Depends, HTTPException

from .db import connect

COOKIE = "session"


def get_conn():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def user_from_token(conn, token):
    if not token:
        return None
    return conn.execute(
        "SELECT users.id, users.username FROM sessions "
        "JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?",
        (hash_token(token),),
    ).fetchone()


def current_user(session: str | None = Cookie(default=None), conn=Depends(get_conn)):
    row = user_from_token(conn, session)
    if not row:
        raise HTTPException(401, "not logged in")
    return row
