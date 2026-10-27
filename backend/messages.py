import base64
import binascii

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .deps import current_user, get_conn
from .social import are_friends, is_blocked, user_by_name

router = APIRouter(prefix="/api")


class KeyIn(BaseModel):
    public_key: str


@router.put("/keys")
def publish_key(body: KeyIn, user=Depends(current_user), conn=Depends(get_conn)):
    """The browser publishes its public key. The private key never leaves the browser."""
    try:
        raw = base64.b64decode(body.public_key, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "bad key")
    if len(raw) != 65 or raw[0] != 4:  # uncompressed P-256 point
        raise HTTPException(400, "bad key")
    conn.execute("UPDATE users SET public_key = ? WHERE id = ?", (body.public_key, user["id"]))
    conn.commit()
    return {"ok": True}


@router.get("/keys/{username}")
def get_key(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    other = user_by_name(conn, username)
    if not other:
        raise HTTPException(404, "can't find that person")
    if other["id"] != user["id"] and (
        is_blocked(conn, user["id"], other["id"]) or not are_friends(conn, user["id"], other["id"])
    ):
        raise HTTPException(403, "you can only chat with friends")
    row = conn.execute("SELECT public_key FROM users WHERE id = ?", (other["id"],)).fetchone()
    if not row["public_key"]:
        raise HTTPException(404, "they haven't opened chat on any browser yet")
    return {"public_key": row["public_key"]}


def msg_dict(row, me_name, other_name):
    mine = row["sender_id"] == row["me"]
    return {
        "id": row["id"],
        "from": me_name if mine else other_name,
        "to": other_name if mine else me_name,
        "iv": row["iv"],
        "ct": row["ct"],
        "spub": row["spub"],
        "rpub": row["rpub"],
        "at": row["created_at"],
        "delivered_at": row["delivered_at"],
        "read_at": row["read_at"],
    }


@router.get("/messages/{username}")
def history(
    username: str,
    before: int | None = None,
    limit: int = 50,
    user=Depends(current_user),
    conn=Depends(get_conn),
):
    other = user_by_name(conn, username)
    if not other:
        raise HTTPException(404, "can't find that person")
    if is_blocked(conn, user["id"], other["id"]):
        raise HTTPException(403, "you can't chat with this person")
    limit = max(1, min(limit, 100))
    args = [user["id"], user["id"], other["id"], other["id"], user["id"]]
    cond = ""
    if before:
        cond = "AND id < ?"
        args.append(before)
    rows = conn.execute(
        "SELECT *, ? AS me FROM messages WHERE ((sender_id = ? AND recipient_id = ?) "
        f"OR (sender_id = ? AND recipient_id = ?)) {cond} ORDER BY id DESC LIMIT {limit}",
        args,
    ).fetchall()
    return {"messages": [msg_dict(r, user["username"], other["username"]) for r in reversed(rows)]}


@router.get("/unread")
def unread(user=Depends(current_user), conn=Depends(get_conn)):
    rows = conn.execute(
        "SELECT u.username, COUNT(*) AS n FROM messages m JOIN users u ON u.id = m.sender_id "
        "WHERE m.recipient_id = ? AND m.read_at IS NULL GROUP BY u.username",
        (user["id"],),
    ).fetchall()
    by_user = {r["username"]: r["n"] for r in rows}
    return {"total": sum(by_user.values()), "by_user": by_user}
