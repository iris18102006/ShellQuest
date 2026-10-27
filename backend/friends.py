from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .db import now
from .deps import current_user, get_conn
from .hub import hub
from .social import friend_ids, is_blocked, relation, summaries, user_by_name

router = APIRouter(prefix="/api")


class Who(BaseModel):
    username: str


def _target(conn, user, username):
    other = user_by_name(conn, username)
    if not other or other["id"] == user["id"]:
        raise HTTPException(404, "can't find that person")
    return other


async def _ping(uid, reason, who):
    await hub.send_user(uid, {"type": "friends_changed", "reason": reason, "user": who})


def _pair(a, b):
    return (a, b, b, a)


@router.get("/friends")
def list_friends(user=Depends(current_user), conn=Depends(get_conn)):
    uid = user["id"]
    incoming = conn.execute(
        "SELECT requester_id FROM friendships WHERE addressee_id = ? AND status = 'pending' ORDER BY id DESC",
        (uid,),
    ).fetchall()
    outgoing = conn.execute(
        "SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'pending' ORDER BY id DESC",
        (uid,),
    ).fetchall()
    return {
        "friends": summaries(conn, friend_ids(conn, uid), show_presence=True),
        "incoming": summaries(
            conn, [r["requester_id"] for r in incoming if not is_blocked(conn, uid, r["requester_id"])]
        ),
        "outgoing": summaries(conn, [r["addressee_id"] for r in outgoing]),
    }


@router.post("/friends/request")
async def request_friend(body: Who, user=Depends(current_user), conn=Depends(get_conn)):
    other = _target(conn, user, body.username)
    if is_blocked(conn, user["id"], other["id"]):
        raise HTTPException(403, "you can't add this person")
    rel = relation(conn, user["id"], other["id"])
    if rel in ("friend", "outgoing"):
        return {"rel": rel}
    if rel == "incoming":  # they already asked us, so just say yes
        conn.execute(
            "UPDATE friendships SET status = 'accepted', created_at = ? "
            "WHERE requester_id = ? AND addressee_id = ?",
            (now(), other["id"], user["id"]),
        )
        conn.commit()
        await _ping(other["id"], "accepted", user["username"])
        return {"rel": "friend"}
    conn.execute(
        "INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, 'pending', ?)",
        (user["id"], other["id"], now()),
    )
    conn.commit()
    await _ping(other["id"], "request", user["username"])
    return {"rel": "outgoing"}


@router.post("/friends/accept")
async def accept_friend(body: Who, user=Depends(current_user), conn=Depends(get_conn)):
    other = _target(conn, user, body.username)
    cur = conn.execute(
        "UPDATE friendships SET status = 'accepted', created_at = ? "
        "WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'",
        (now(), other["id"], user["id"]),
    )
    conn.commit()
    if not cur.rowcount:
        raise HTTPException(404, "there's no request from that person")
    await _ping(other["id"], "accepted", user["username"])
    return {"rel": "friend"}


@router.post("/friends/decline")
async def decline_friend(body: Who, user=Depends(current_user), conn=Depends(get_conn)):
    other = _target(conn, user, body.username)
    conn.execute(
        "DELETE FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'",
        (other["id"], user["id"]),
    )
    conn.commit()
    return {"rel": "none"}


@router.delete("/friends/{username}")
async def remove_friend(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    """Unfriend, or cancel a request you sent."""
    other = _target(conn, user, username)
    conn.execute(
        "DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) "
        "OR (requester_id = ? AND addressee_id = ?)",
        _pair(user["id"], other["id"]),
    )
    conn.commit()
    await _ping(other["id"], "removed", user["username"])
    return {"rel": "none"}


@router.get("/blocks")
def list_blocks(user=Depends(current_user), conn=Depends(get_conn)):
    rows = conn.execute(
        "SELECT blocked_id FROM blocks WHERE blocker_id = ? ORDER BY created_at DESC", (user["id"],)
    ).fetchall()
    return {"blocked": summaries(conn, [r["blocked_id"] for r in rows])}


@router.post("/blocks")
async def block_user(body: Who, user=Depends(current_user), conn=Depends(get_conn)):
    other = _target(conn, user, body.username)
    conn.execute(
        "INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)",
        (user["id"], other["id"], now()),
    )
    # blocking also ends any friendship or pending request
    conn.execute(
        "DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) "
        "OR (requester_id = ? AND addressee_id = ?)",
        _pair(user["id"], other["id"]),
    )
    conn.commit()
    await _ping(other["id"], "removed", user["username"])
    return {"rel": "none", "blocked": True}


@router.delete("/blocks/{username}")
def unblock_user(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    other = _target(conn, user, username)
    conn.execute(
        "DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?", (user["id"], other["id"])
    )
    conn.commit()
    return {"blocked": False}


def _with_rel(conn, user, ids):
    people = summaries(conn, ids)
    for p in people:
        p["rel"] = relation(conn, user["id"], user_by_name(conn, p["username"])["id"])
    return people


@router.get("/people/search")
def search_people(q: str = "", user=Depends(current_user), conn=Depends(get_conn)):
    q = q.strip().lower()[:30]
    if not q:
        return {"people": []}
    like = "%" + q.replace("%", "").replace("_", "\\_") + "%"
    rows = conn.execute(
        "SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id "
        "WHERE u.id != ? AND (u.username LIKE ? ESCAPE '\\' OR lower(p.display_name) LIKE ? ESCAPE '\\') "
        "ORDER BY u.username LIMIT 20",
        (user["id"], like, like),
    ).fetchall()
    ids = [r["id"] for r in rows if not is_blocked(conn, user["id"], r["id"])]
    return {"people": _with_rel(conn, user, ids)}


@router.get("/people/new")
def new_people(user=Depends(current_user), conn=Depends(get_conn)):
    rows = conn.execute(
        "SELECT id FROM users WHERE id != ? ORDER BY id DESC LIMIT 30", (user["id"],)
    ).fetchall()
    ids = [r["id"] for r in rows if not is_blocked(conn, user["id"], r["id"])]
    people = [p for p in _with_rel(conn, user, ids) if p["rel"] != "friend"]
    return {"people": people[:12]}
