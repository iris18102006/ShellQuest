from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import auth, friends, messages, posts, profiles, realtime
from .db import init_db

app = FastAPI(title="cipher-chat")
init_db()

for module in (auth, profiles, friends, posts, messages, realtime):
    app.include_router(module.router)

# keep this last, it catches everything that isn't /api or /ws
app.mount(
    "/",
    StaticFiles(directory=Path(__file__).parent.parent / "web", html=True),
    name="web",
)
