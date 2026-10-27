import base64
import binascii
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from .db import now
from .deps import current_user, get_conn
from .hub import hub
from .social import (
    friend_ids,
    is_blocked,
    parse_json,
    relation,
    summaries,
    user_by_name,
)
from .theme import clean_text, validate_theme

router = APIRouter(prefix="/api")

MAX_AVATAR = 200 * 1024
DATA_URL_RE = re.compile(r"^data:(image/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$")
MAGIC = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),
}


class ProfileIn(BaseModel):
    display_name: str | None = None
    tagline: str | None = None
    location: str | None = None
    mood: str | None = None
    now_playing: str | None = None
    about: str | None = None
    meet: str | None = None
    interests: str | None = None
    theme: dict | None = None
    top_friends: list[str] | None = None


class AvatarIn(BaseModel):
    data_url: str


LIMITS = {
    "tagline": 80,
    "location": 40,
    "mood": 30,
    "now_playing": 80,
    "about": 2000,
    "meet": 2000,
    "interests": 2000,
}


def top_friends_for(conn, uid: int) -> list:
    """The saved Top 8 (only people who are still friends), topped up with recent friends."""
    row = conn.execute("SELECT top_friends FROM profiles WHERE user_id = ?", (uid,)).fetchone()
    saved = parse_json(row["top_friends"], []) if row else []
    friends = friend_ids(conn, uid)
    order = []
    for name in saved:
        u = user_by_name(conn, name) if isinstance(name, str) else None
        if u and u["id"] in friends and u["id"] not in order:
            order.append(u["id"])
    for fid in friends:
        if len(order) >= 8:
            break
        if fid not in order:
            order.append(fid)
    return summaries(conn, order[:8])


@router.get("/profile/{username}")
def get_profile(
    username: str, count_view: int = 1, user=Depends(current_user), conn=Depends(get_conn)
):
    target = user_by_name(conn, username)
    if not target or is_blocked(conn, user["id"], target["id"]):
        raise HTTPException(404, "this profile doesn't exist (or isn't available)")
    rel = relation(conn, user["id"], target["id"])
    if rel != "self" and count_view:
        conn.execute("UPDATE profiles SET views = views + 1 WHERE user_id = ?", (target["id"],))
        conn.commit()
    p = conn.execute("SELECT * FROM profiles WHERE user_id = ?", (target["id"],)).fetchone()
    data = {
        "username": target["username"],
        "display_name": p["display_name"],
        "tagline": p["tagline"],
        "location": p["location"],
        "mood": p["mood"],
        "now_playing": p["now_playing"],
        "about": p["about"],
        "meet": p["meet"],
        "interests": p["interests"],
        "theme": validate_theme(parse_json(p["theme"], {})),
        "top_friends": top_friends_for(conn, target["id"]),
        "friend_count": len(friend_ids(conn, target["id"])),
        "avatar_v": p["avatar_v"],
        "views": p["views"],
        "member_since": target["created_at"],
        "rel": rel,
    }
    # online status and last seen are only for the person and their friends
    if rel in ("self", "friend"):
        data["online"] = hub.is_online(target["id"])
        data["last_seen"] = target["last_seen"]
    return data


@router.put("/profile")
async def update_profile(body: ProfileIn, user=Depends(current_user), conn=Depends(get_conn)):
    updates = {}
    if body.display_name is not None:
        name = clean_text(body.display_name)
        if not 1 <= len(name) <= 24:
            raise HTTPException(400, "display name must be 1-24 characters")
        updates["display_name"] = name
    for field, limit in LIMITS.items():
        val = getattr(body, field)
        if val is not None:
            updates[field] = clean_text(val)[:limit]
    if body.theme is not None:
        updates["theme"] = json.dumps(validate_theme(body.theme))
    if body.top_friends is not None:
        allowed = set(friend_ids(conn, user["id"]))
        names = []
        for name in body.top_friends[:8]:
            u = user_by_name(conn, name)
            if u and u["id"] in allowed and u["username"] not in names:
                names.append(u["username"])
        updates["top_friends"] = json.dumps(names)
    if updates:
        updates["updated_at"] = now()
        cols = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(f"UPDATE profiles SET {cols} WHERE user_id = ?", (*updates.values(), user["id"]))
        conn.commit()
    return get_profile(user["username"], 0, user=user, conn=conn)


@router.put("/profile/avatar")
def set_avatar(body: AvatarIn, user=Depends(current_user), conn=Depends(get_conn)):
    m = DATA_URL_RE.match(body.data_url)
    if not m:
        raise HTTPException(400, "pick a png, jpg, gif or webp picture")
    mime = m.group(1)
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "that picture is broken")
    if len(raw) > MAX_AVATAR:
        raise HTTPException(400, "picture is too big (200 KB max)")
    if not any(raw.startswith(sig) for sig in MAGIC[mime]):
        raise HTTPException(400, "that file isn't really a picture")
    conn.execute(
        "UPDATE profiles SET avatar = ?, avatar_mime = ?, avatar_v = avatar_v + 1 WHERE user_id = ?",
        (raw, mime, user["id"]),
    )
    conn.commit()
    v = conn.execute("SELECT avatar_v FROM profiles WHERE user_id = ?", (user["id"],)).fetchone()
    return {"avatar_v": v["avatar_v"]}


@router.delete("/profile/avatar")
def remove_avatar(user=Depends(current_user), conn=Depends(get_conn)):
    conn.execute(
        "UPDATE profiles SET avatar = NULL, avatar_mime = NULL, avatar_v = avatar_v + 1 WHERE user_id = ?",
        (user["id"],),
    )
    conn.commit()
    return {"ok": True}


@router.get("/avatar/{username}")
def get_avatar(username: str, user=Depends(current_user), conn=Depends(get_conn)):
    target = user_by_name(conn, username)
    if not target or is_blocked(conn, user["id"], target["id"]):
        raise HTTPException(404, "no picture")
    p = conn.execute(
        "SELECT avatar, avatar_mime FROM profiles WHERE user_id = ?", (target["id"],)
    ).fetchone()
    if not p or not p["avatar"]:
        raise HTTPException(404, "no picture")
    return Response(
        p["avatar"],
        media_type=p["avatar_mime"],
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )
