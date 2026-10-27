from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .db import now
from .deps import current_user, get_conn
from .social import friend_ids, is_blocked, user_by_name
from .theme import clean_text

router = APIRouter(prefix="/api")


class Body(BaseModel):
    body: str


def _clean(text, limit):
    text = clean_text(text)
    if not text:
        raise HTTPException(400, "write something first")
    if len(text) > limit:
        raise HTTPException(400, f"that's too long ({limit} characters max)")
    return text


def _post_rows(conn, where, args):
    rows = conn.execute(
        "SELECT po.id, po.body, po.created_at, u.username, p.display_name, p.avatar_v "
        "FROM posts po JOIN users u ON u.id = po.author_id JOIN profiles p ON p.user_id = u.id "
        f"WHERE {where} ORDER BY po.id DESC LIMIT 40",
        args,
    ).fetchall()
    return [dict(r) for r in rows]


@router.post("/posts")
def create_post(body: Body, user=Depends(current_user), conn=Depends(get_conn)):
    text = _clean(body.body, 500)
    cur = conn.execute(
        "INSERT INTO posts (author_id, body, created_at) VALUES (?, ?, ?)",
        (user["id"], text, now()),
    )
    conn.commit()
    return _post_rows(conn, "po.id = ?", (cur.lastrowid,))[0]


@router.get("/posts/feed")
def feed(user=Depends(current_user), conn=Depends(get_conn)):
    ids = [user["id"], *friend_ids(conn, user["id"])]
    marks = ",".join("?" * len(ids))
    return {"posts": _post_rows(conn, f"po.author_id IN ({marks})", ids)}


@router.get("/profile/{username}/posts")
def user_posts(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    target = user_by_name(conn, username)
    if not target or is_blocked(conn, user["id"], target["id"]):
        raise HTTPException(404, "no such profile")
    return {"posts": _post_rows(conn, "po.author_id = ?", (target["id"],))}


@router.delete("/posts/{post_id}")
def delete_post(post_id: int, user=Depends(current_user), conn=Depends(get_conn)):
    cur = conn.execute("DELETE FROM posts WHERE id = ? AND author_id = ?", (post_id, user["id"]))
    conn.commit()
    if not cur.rowcount:
        raise HTTPException(404, "that post isn't yours (or is already gone)")
    return {"ok": True}


def _comment_rows(conn, where, args):
    rows = conn.execute(
        "SELECT c.id, c.body, c.created_at, u.username, p.display_name, p.avatar_v "
        "FROM comments c JOIN users u ON u.id = c.author_id JOIN profiles p ON p.user_id = u.id "
        f"WHERE {where} ORDER BY c.id DESC LIMIT 50",
        args,
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/profile/{username}/comments")
def list_comments(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    target = user_by_name(conn, username)
    if not target or is_blocked(conn, user["id"], target["id"]):
        raise HTTPException(404, "no such profile")
    comments = _comment_rows(conn, "c.profile_id = ?", (target["id"],))
    comments = [c for c in comments if not _author_blocked(conn, user["id"], c["username"])]
    return {"comments": comments}


def _author_blocked(conn, me, username):
    u = user_by_name(conn, username)
    return bool(u) and is_blocked(conn, me, u["id"])


@router.post("/profile/{username}/comments")
def add_comment(username: str, body: Body, user=Depends(current_user), conn=Depends(get_conn)):
    target = user_by_name(conn, username)
    if not target or is_blocked(conn, user["id"], target["id"]):
        raise HTTPException(404, "no such profile")
    text = _clean(body.body, 300)
    cur = conn.execute(
        "INSERT INTO comments (profile_id, author_id, body, created_at) VALUES (?, ?, ?, ?)",
        (target["id"], user["id"], text, now()),
    )
    conn.commit()
    return _comment_rows(conn, "c.id = ?", (cur.lastrowid,))[0]


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, user=Depends(current_user), conn=Depends(get_conn)):
    """The writer or the profile's owner can delete a comment."""
    cur = conn.execute(
        "DELETE FROM comments WHERE id = ? AND (author_id = ? OR profile_id = ?)",
        (comment_id, user["id"], user["id"]),
    )
    conn.commit()
    if not cur.rowcount:
        raise HTTPException(404, "can't delete that comment")
    return {"ok": True}
