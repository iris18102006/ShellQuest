"""Run with:  python -m unittest discover -s tests -v   (needs httpx, see requirements-dev.txt)"""
import base64
import os
import tempfile
import unittest

_tmp = tempfile.TemporaryDirectory()
os.environ["CIPHER_DB"] = os.path.join(_tmp.name, "test.db")

from fastapi.testclient import TestClient  # noqa: E402

from backend.main import app  # noqa: E402

PW = "correct horse battery"
PNG_1PX = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def fake_pub(n):
    return base64.b64encode(bytes([4]) + bytes([n]) * 64).decode()


class CipherChatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.client.__enter__()  # one event loop for http + websockets
        cls.tok = {}
        for name in ("alice", "bob", "carol"):
            r = cls.client.post("/api/signup", json={"username": name, "password": PW})
            assert r.status_code == 200, r.text
            cls.tok[name] = r.cookies.get("session")
        cls.client.cookies.clear()

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)

    def call(self, who, method, path, **kw):
        return self.client.request(method, path, headers={"cookie": f"session={self.tok[who]}"}, **kw)

    def ws(self, who):
        return self.client.websocket_connect("/ws", headers={"cookie": f"session={self.tok[who]}"})

    def befriend(self, a, b):
        self.call(a, "POST", "/api/friends/request", json={"username": b})
        self.call(b, "POST", "/api/friends/accept", json={"username": a})

    # ---- accounts -------------------------------------------------------
    def test_01_auth_required(self):
        self.assertEqual(self.client.get("/api/me").status_code, 401)
        self.assertEqual(self.client.get("/api/profile/alice").status_code, 401)

    def test_02_profile_and_theme_whitelist(self):
        r = self.call("alice", "PUT", "/api/profile", json={
            "display_name": "Alice ★",
            "mood": "😎 chillin",
            "theme": {"page_bg": "#000000", "box_bg": "red; background:url(//evil)", "font": "wingdings",
                      "glitter": True, "font_size": 999, "trail": "bats", "evil": "x"},
        })
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data["display_name"], "Alice ★")
        t = data["theme"]
        self.assertEqual(t["page_bg"], "#000000")
        self.assertEqual(t["box_bg"], "#ffffff")  # junk color rejected, default kept
        self.assertEqual(t["font"], "verdana")  # unknown font rejected
        self.assertEqual(t["font_size"], 16)  # clamped
        self.assertTrue(t["glitter"])
        self.assertNotIn("evil", t)

    def test_03_avatar_validation(self):
        ok = self.call("alice", "PUT", "/api/profile/avatar", json={"data_url": PNG_1PX})
        self.assertEqual(ok.status_code, 200)
        img = self.call("bob", "GET", "/api/avatar/alice")
        self.assertEqual(img.headers["content-type"], "image/png")
        fake = "data:image/png;base64," + base64.b64encode(b"<svg onload=alert(1)>").decode()
        self.assertEqual(self.call("alice", "PUT", "/api/profile/avatar", json={"data_url": fake}).status_code, 400)
        svg = "data:image/svg+xml;base64,PHN2Zy8+"
        self.assertEqual(self.call("alice", "PUT", "/api/profile/avatar", json={"data_url": svg}).status_code, 400)

    # ---- friends + blocking ---------------------------------------------
    def test_04_friends_flow_and_privacy(self):
        p = self.call("bob", "GET", "/api/profile/alice").json()
        self.assertEqual(p["rel"], "none")
        self.assertNotIn("online", p)  # strangers don't see presence
        self.call("bob", "POST", "/api/friends/request", json={"username": "alice"})
        inc = self.call("alice", "GET", "/api/friends").json()["incoming"]
        self.assertEqual([x["username"] for x in inc], ["bob"])
        self.call("alice", "POST", "/api/friends/accept", json={"username": "bob"})
        p = self.call("bob", "GET", "/api/profile/alice").json()
        self.assertEqual(p["rel"], "friend")
        self.assertIn("online", p)
        self.call("alice", "DELETE", "/api/friends/bob")
        self.assertEqual(self.call("bob", "GET", "/api/profile/alice").json()["rel"], "none")

    def test_05_blocking(self):
        self.befriend("alice", "carol")
        self.call("alice", "POST", "/api/blocks", json={"username": "carol"})
        self.assertEqual(self.call("carol", "GET", "/api/profile/alice").status_code, 404)
        self.assertEqual(self.call("alice", "GET", "/api/profile/carol").status_code, 404)
        r = self.call("carol", "POST", "/api/friends/request", json={"username": "alice"})
        self.assertEqual(r.status_code, 403)
        found = self.call("carol", "GET", "/api/people/search?q=ali").json()["people"]
        self.assertEqual(found, [])
        self.call("alice", "DELETE", "/api/blocks/carol")
        self.assertEqual(self.call("carol", "GET", "/api/profile/alice").status_code, 200)

    # ---- posts + wall ---------------------------------------------------
    def test_06_posts_and_comments(self):
        self.befriend("alice", "bob")
        post = self.call("alice", "POST", "/api/posts", json={"body": "hello <b>world</b>"}).json()
        feed = self.call("bob", "GET", "/api/posts/feed").json()["posts"]
        self.assertIn(post["id"], [p["id"] for p in feed])
        self.assertEqual(self.call("bob", "DELETE", f"/api/posts/{post['id']}").status_code, 404)
        self.assertEqual(self.call("alice", "POST", "/api/posts", json={"body": "x" * 501}).status_code, 400)

        c = self.call("bob", "POST", "/api/profile/alice/comments", json={"body": "nice page!!"}).json()
        self.assertEqual(c["username"], "bob")
        # the profile owner can clean their wall
        self.assertEqual(self.call("alice", "DELETE", f"/api/comments/{c['id']}").status_code, 200)

    # ---- keys + messages ------------------------------------------------
    def test_07_keys_only_for_friends(self):
        self.befriend("alice", "bob")
        self.assertEqual(self.call("alice", "PUT", "/api/keys", json={"public_key": "AAAA"}).status_code, 400)
        self.assertEqual(self.call("bob", "PUT", "/api/keys", json={"public_key": fake_pub(2)}).status_code, 200)
        self.assertEqual(self.call("alice", "GET", "/api/keys/bob").json()["public_key"], fake_pub(2))
        self.call("carol", "POST", "/api/blocks", json={"username": "bob"})
        self.assertEqual(self.call("carol", "GET", "/api/keys/bob").status_code, 403)

    def test_08_realtime_chat(self):
        self.befriend("alice", "bob")
        with self.ws("bob") as wb:
            self.assertEqual(wb.receive_json()["type"], "hello")
            with self.ws("alice") as wa:
                hello = wa.receive_json()
                self.assertEqual(hello["online"], ["bob"])
                self.assertEqual(wb.receive_json(), {"type": "presence", "user": "alice", "online": True, "last_seen": None})

                wa.send_json({"type": "typing", "to": "bob", "on": True})
                self.assertEqual(wb.receive_json(), {"type": "typing", "from": "alice", "on": True})

                wa.send_json({"type": "msg", "to": "bob", "cid": "c1", "iv": "aXY=", "ct": "Y3Q=",
                              "spub": fake_pub(1), "rpub": fake_pub(2)})
                sent = wa.receive_json()
                self.assertEqual((sent["type"], sent["cid"]), ("sent", "c1"))
                self.assertIsNotNone(sent["delivered_at"])  # bob was online
                got = wb.receive_json()
                self.assertEqual((got["type"], got["from"], got["ct"]), ("msg", "alice", "Y3Q="))

                wb.send_json({"type": "read", "with": "alice"})
                self.assertEqual(wb.receive_json()["type"], "read_self")
                read = wa.receive_json()
                self.assertEqual((read["type"], read["by"], read["ids"]), ("read", "bob", [got["id"]]))
            self.assertEqual(wb.receive_json()["online"], False)  # alice left

        hist = self.call("bob", "GET", "/api/messages/alice").json()["messages"]
        self.assertEqual(hist[-1]["ct"], "Y3Q=")
        self.assertIsNotNone(hist[-1]["read_at"])
        self.assertEqual(self.call("bob", "GET", "/api/unread").json()["total"], 0)

    def test_09_offline_delivery_and_strangers(self):
        self.befriend("alice", "bob")
        with self.ws("alice") as wa:
            wa.receive_json()
            wa.send_json({"type": "msg", "to": "bob", "cid": "c2", "iv": "aXY=", "ct": "Zm9v",
                          "spub": fake_pub(1), "rpub": fake_pub(2)})
            sent = wa.receive_json()
            self.assertIsNone(sent["delivered_at"])  # bob offline
            self.assertEqual(self.call("bob", "GET", "/api/unread").json()["by_user"].get("alice"), 1)
            with self.ws("bob") as wb:
                wb.receive_json()
                delivered = wa.receive_json()  # presence or delivered, either order
                types = {delivered["type"], wa.receive_json()["type"]}
                self.assertEqual(types, {"presence", "delivered"})
            # carol isn't alice's friend: server refuses
            wa.receive_json()  # bob left
            wa.send_json({"type": "msg", "to": "carol", "cid": "c3", "iv": "aXY=", "ct": "Zm9v",
                          "spub": fake_pub(1), "rpub": fake_pub(3)})
            self.assertEqual(wa.receive_json()["type"], "error")

    def test_10_ws_rejects_strangers_and_bad_origin(self):
        from starlette.websockets import WebSocketDisconnect
        with self.assertRaises(WebSocketDisconnect):
            with self.client.websocket_connect("/ws"):
                pass
        with self.assertRaises(WebSocketDisconnect):
            with self.client.websocket_connect(
                "/ws", headers={"cookie": f"session={self.tok['alice']}", "origin": "https://evil.example"}
            ):
                pass


if __name__ == "__main__":
    unittest.main()
