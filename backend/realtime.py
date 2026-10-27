"""The websocket: typing dots, presence, delivered/read and the encrypted messages themselves.
The server only ever sees ciphertext (iv + ct), never the text."""
import time
from collections import deque
from urllib.parse import urlparse

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .db import db, now
from .deps import COOKIE, user_from_token
from .hub import hub
from .social import are_friends, friend_ids, is_blocked, user_by_name

router = APIRouter()

MAX_CT = 12000
MAX_KEY = 120


def _chat_allowed(conn, me_id, other):
    return bool(other) and are_friends(conn, me_id, other["id"]) and not is_blocked(conn, me_id, other["id"])


async def _broadcast_presence(user_id, username, online, last_seen=None):
    with db() as conn:
        ids = friend_ids(conn, user_id)
    payload = {"type": "presence", "user": username, "online": online, "last_seen": last_seen}
    for fid in ids:
        await hub.send_user(fid, payload)


async def _flush_undelivered(user_id, username):
    """Messages that arrived while we were offline are now delivered."""
    stamp = now()
    with db() as conn:
        rows = conn.execute(
            "SELECT m.id, u.username AS sender, m.sender_id FROM messages m JOIN users u ON u.id = m.sender_id "
            "WHERE m.recipient_id = ? AND m.delivered_at IS NULL",
            (user_id,),
        ).fetchall()
        if not rows:
            return
        conn.execute(
            "UPDATE messages SET delivered_at = ? WHERE recipient_id = ? AND delivered_at IS NULL",
            (stamp, user_id),
        )
        conn.commit()
    grouped = {}
    for r in rows:
        grouped.setdefault(r["sender_id"], []).append(r["id"])
    for sender_id, ids in grouped.items():
        await hub.send_user(
            sender_id, {"type": "delivered", "to": username, "ids": ids, "at": stamp}
        )


async def _handle_msg(ws, me, data):
    to = data.get("to")
    cid = data.get("cid")
    iv, ct, spub, rpub = (data.get(k) for k in ("iv", "ct", "spub", "rpub"))
    fields = (iv, ct, spub, rpub)
    if not isinstance(to, str) or not all(isinstance(f, str) and f for f in fields):
        return await ws.send_json({"type": "error", "cid": cid, "error": "bad message"})
    if len(ct) > MAX_CT or len(iv) > 32 or len(spub) > MAX_KEY or len(rpub) > MAX_KEY:
        return await ws.send_json({"type": "error", "cid": cid, "error": "message too long"})
    with db() as conn:
        other = user_by_name(conn, to)
        if not _chat_allowed(conn, me["id"], other):
            return await ws.send_json(
                {"type": "error", "cid": cid, "error": "you can only message friends you haven't blocked"}
            )
        stamp = now()
        online = hub.is_online(other["id"])
        cur = conn.execute(
            "INSERT INTO messages (sender_id, recipient_id, iv, ct, spub, rpub, created_at, delivered_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (me["id"], other["id"], iv, ct, spub, rpub, stamp, stamp if online else None),
        )
        conn.commit()
        msg_id = cur.lastrowid
    event = {
        "type": "msg",
        "id": msg_id,
        "from": me["username"],
        "to": other["username"],
        "iv": iv,
        "ct": ct,
        "spub": spub,
        "rpub": rpub,
        "at": stamp,
        "delivered_at": stamp if online else None,
        "read_at": None,
    }
    await ws.send_json({**event, "type": "sent", "cid": cid})
    await hub.send_user(me["id"], event, exclude=ws)  # my other tabs
    await hub.send_user(other["id"], event)


async def _handle_read(me, data):
    with db() as conn:
        other = user_by_name(conn, data.get("with"))
        if not other or is_blocked(conn, me["id"], other["id"]):
            return
        stamp = now()
        rows = conn.execute(
            "SELECT id FROM messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL",
            (other["id"], me["id"]),
        ).fetchall()
        if not rows:
            return
        conn.execute(
            "UPDATE messages SET read_at = ?, delivered_at = COALESCE(delivered_at, ?) "
            "WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL",
            (stamp, stamp, other["id"], me["id"]),
        )
        conn.commit()
    ids = [r["id"] for r in rows]
    await hub.send_user(other["id"], {"type": "read", "by": me["username"], "ids": ids, "at": stamp})
    await hub.send_user(me["id"], {"type": "read_self", "with": other["username"]})


async def _handle_typing(me, data):
    with db() as conn:
        other = user_by_name(conn, data.get("to"))
        if not _chat_allowed(conn, me["id"], other):
            return
    await hub.send_user(
        other["id"], {"type": "typing", "from": me["username"], "on": bool(data.get("on"))}
    )


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # the cookie rides along on websockets too, so check the Origin to stop other sites using it
    origin = ws.headers.get("origin")
    if origin and urlparse(origin).netloc != ws.headers.get("host"):
        await ws.close(code=1008)
        return
    with db() as conn:
        me = user_from_token(conn, ws.cookies.get(COOKIE))
        if me:
            me = {"id": me["id"], "username": me["username"]}
    if not me:
        await ws.close(code=1008)
        return
    await ws.accept()

    first_tab = not hub.is_online(me["id"])
    hub.add(me["id"], ws)
    with db() as conn:
        online_friends = [
            u["username"]
            for u in (
                conn.execute("SELECT username FROM users WHERE id = ?", (fid,)).fetchone()
                for fid in friend_ids(conn, me["id"])
                if hub.is_online(fid)
            )
        ]
    await ws.send_json({"type": "hello", "me": me["username"], "online": online_friends})
    await _flush_undelivered(me["id"], me["username"])
    if first_tab:
        await _broadcast_presence(me["id"], me["username"], True)

    recent = deque(maxlen=30)  # tiny flood guard: 30 events per 10 seconds
    try:
        while True:
            try:
                data = await ws.receive_json()
            except ValueError:
                continue
            if not isinstance(data, dict):
                continue
            t = time.monotonic()
            while recent and t - recent[0] > 10:
                recent.popleft()
            if len(recent) == recent.maxlen:
                await ws.send_json({"type": "error", "error": "slow down a little"})
                continue
            recent.append(t)

            kind = data.get("type")
            if kind == "ping":
                with db() as conn:
                    conn.execute("UPDATE users SET last_seen = ? WHERE id = ?", (now(), me["id"]))
                    conn.commit()
                await ws.send_json({"type": "pong"})
            elif kind == "msg":
                await _handle_msg(ws, me, data)
            elif kind == "read":
                await _handle_read(me, data)
            elif kind == "typing":
                await _handle_typing(me, data)
    except WebSocketDisconnect:
        pass
    finally:
        hub.remove(me["id"], ws)
        if not hub.is_online(me["id"]):
            stamp = now()
            with db() as conn:
                conn.execute("UPDATE users SET last_seen = ? WHERE id = ?", (stamp, me["id"]))
                conn.commit()
            await _broadcast_presence(me["id"], me["username"], False, stamp)
