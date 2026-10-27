"""Tracks which users have a websocket open. No database in here on purpose."""


class Hub:
    def __init__(self):
        self.conns = {}

    def add(self, user_id, ws):
        self.conns.setdefault(user_id, set()).add(ws)

    def remove(self, user_id, ws):
        socks = self.conns.get(user_id)
        if socks:
            socks.discard(ws)
            if not socks:
                del self.conns[user_id]

    def is_online(self, user_id) -> bool:
        return bool(self.conns.get(user_id))

    async def send_user(self, user_id, payload, exclude=None):
        for ws in list(self.conns.get(user_id, ())):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                self.remove(user_id, ws)


hub = Hub()
