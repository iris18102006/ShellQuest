"""Small query helpers shared by the routers."""
import json

from .hub import hub


def user_by_name(conn, username: str):
    return conn.execute(
        "SELECT id, username, created_at, last_seen FROM users WHERE username = ?",
        ((username or "").strip().lower(),),
    ).fetchone()


def is_blocked(conn, a: int, b: int) -> bool:
    """True if either of them blocked the other."""
    return (
        conn.execute(
            "SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) "
            "OR (blocker_id = ? AND blocked_id = ?)",
            (a, b, b, a),
        ).fetchone()
        is not None
    )


def are_friends(conn, a: int, b: int) -> bool:
    return (
        conn.execute(
            "SELECT 1 FROM friendships WHERE status = 'accepted' AND "
            "((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))",
            (a, b, b, a),
        ).fetchone()
        is not None
    )


def friend_ids(conn, uid: int) -> list:
    rows = conn.execute(
        "SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END AS fid "
        "FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?) "
        "ORDER BY id DESC",
        (uid, uid, uid),
    ).fetchall()
    return [r["fid"] for r in rows if not is_blocked(conn, uid, r["fid"])]


def relation(conn, me: int, other: int) -> str:
    if me == other:
        return "self"
    row = conn.execute(
        "SELECT requester_id, status FROM friendships WHERE "
        "(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
        (me, other, other, me),
    ).fetchone()
    if not row:
        return "none"
    if row["status"] == "accepted":
        return "friend"
    return "outgoing" if row["requester_id"] == me else "incoming"


def summaries(conn, ids, show_presence=False) -> list:
    """Small card-sized info for a list of user ids, keeping the order of ids."""
    out = []
    for uid in ids:
        row = conn.execute(
            "SELECT u.id, u.username, u.last_seen, p.display_name, p.avatar_v, p.mood "
            "FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?",
            (uid,),
        ).fetchone()
        if not row:
            continue
        item = {
            "username": row["username"],
            "display_name": row["display_name"],
            "avatar_v": row["avatar_v"],
            "mood": row["mood"],
        }
        if show_presence:
            item["online"] = hub.is_online(uid)
            item["last_seen"] = row["last_seen"]
        out.append(item)
    return out


def parse_json(text, fallback):
    try:
        return json.loads(text)
    except (TypeError, ValueError):
        return fallback
