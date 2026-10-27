"""Profile themes. People pick options in a form, the server only keeps
values from these whitelists, so there is no way to sneak CSS or HTML in."""
import re

COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")

DEFAULT_THEME = {
    "preset": "classic-blue",
    "page_bg": "#6f9bd1",
    "pattern": "none",
    "pattern_color": "#ffffff",
    "box_bg": "#ffffff",
    "box_opacity": 100,
    "box_border": "#17407f",
    "box_style": "solid",
    "corners": "square",
    "head_bg": "#17407f",
    "head_text": "#ffffff",
    "text": "#111111",
    "link": "#17407f",
    "name_color": "#ff6600",
    "font": "verdana",
    "font_size": 12,
    "glitter": False,
    "trail": "none",
    "marquee_on": False,
    "marquee_text": "",
}

ENUMS = {
    "pattern": {"none", "dots", "checks", "stripes", "grid", "stars", "hearts", "skulls", "notes"},
    "box_style": {"solid", "dashed", "dotted", "double", "ridge"},
    "corners": {"square", "rounded"},
    "font": {"verdana", "tahoma", "comic", "trebuchet", "times", "georgia", "courier", "lucida", "impact"},
    "trail": {"none", "sparkles", "hearts", "stars", "skulls", "flowers", "bats", "music", "snow"},
}
INT_RANGES = {"box_opacity": (40, 100), "font_size": (10, 16)}
STR_MAX = {"preset": 24, "marquee_text": 120}


def validate_theme(raw) -> dict:
    out = dict(DEFAULT_THEME)
    if not isinstance(raw, dict):
        return out
    for key, default in DEFAULT_THEME.items():
        if key not in raw:
            continue
        val = raw[key]
        if key in ENUMS:
            if isinstance(val, str) and val in ENUMS[key]:
                out[key] = val
        elif key in INT_RANGES:
            lo, hi = INT_RANGES[key]
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                out[key] = max(lo, min(hi, int(val)))
        elif isinstance(default, bool):
            if isinstance(val, bool):
                out[key] = val
        elif key == "preset":
            if isinstance(val, str) and re.fullmatch(r"[a-z0-9-]{0,24}", val):
                out[key] = val
        elif key == "marquee_text":
            if isinstance(val, str):
                out[key] = clean_text(val)[: STR_MAX[key]]
        elif isinstance(default, str) and default.startswith("#"):
            if isinstance(val, str) and COLOR_RE.match(val):
                out[key] = val.lower()
    return out


_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(s: str) -> str:
    return _CONTROL.sub("", s).strip()
