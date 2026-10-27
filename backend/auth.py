import re
import secrets
import sqlite3

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel

from .db import now
from .deps import COOKIE, current_user, get_conn, hash_token

USERNAME_RE = re.compile(r"^[a-z0-9_]{3,20}$")

router = APIRouter(prefix="/api")
ph = PasswordHasher()


class Credentials(BaseModel):
    username: str
    password: str


def start_session(conn, response: Response, user_id: int):
    token = secrets.token_urlsafe(32)
    conn.execute(
        "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
        (hash_token(token), user_id),
    )
    conn.commit()
    response.set_cookie(
        COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 24 * 30
    )


@router.post("/signup")
def signup(creds: Credentials, response: Response, conn=Depends(get_conn)):
    username = creds.username.strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(400, "username must be 3-20 chars: a-z, 0-9, _")
    if not 8 <= len(creds.password) <= 128:
        raise HTTPException(400, "password must be 8-128 characters")
    try:
        cur = conn.execute(
            "INSERT INTO users (username, password_hash, last_seen) VALUES (?, ?, ?)",
            (username, ph.hash(creds.password), now()),
        )
        conn.execute(
            "INSERT INTO profiles (user_id, display_name, updated_at) VALUES (?, ?, ?)",
            (cur.lastrowid, username, now()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(409, "that username is taken")
    start_session(conn, response, cur.lastrowid)
    return {"username": username}


@router.post("/login")
def login(creds: Credentials, response: Response, conn=Depends(get_conn)):
    username = creds.username.strip().lower()
    row = conn.execute(
        "SELECT id, password_hash FROM users WHERE username = ?", (username,)
    ).fetchone()
    try:
        if not row:
            raise VerifyMismatchError()
        ph.verify(row["password_hash"], creds.password)
    except VerifyMismatchError:
        raise HTTPException(401, "wrong username or password")
    start_session(conn, response, row["id"])
    return {"username": username}


@router.post("/logout")
def logout(
    response: Response,
    session: str | None = Cookie(default=None),
    conn=Depends(get_conn),
):
    if session:
        conn.execute("DELETE FROM sessions WHERE token = ?", (hash_token(session),))
        conn.commit()
    response.delete_cookie(COOKIE)
    return {"ok": True}


@router.get("/me")
def me(user=Depends(current_user), conn=Depends(get_conn)):
    p = conn.execute(
        "SELECT display_name, avatar_v FROM profiles WHERE user_id = ?", (user["id"],)
    ).fetchone()
    return {
        "username": user["username"],
        "display_name": p["display_name"] if p else user["username"],
        "avatar_v": p["avatar_v"] if p else 0,
    }
