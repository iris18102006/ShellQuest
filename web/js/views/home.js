import { api } from "../api.js";
import { avatar, fmtClock, fmtDate, h, toast } from "../dom.js";
import { listen, refreshFriends, state, unreadTotal } from "../state.js";

const box = (title, ...body) => h("section", { class: "site-box" }, h("h2", { class: "box-head" }, title), h("div", { class: "box-body" }, body));

export async function render(root, _params, ctx) {
  const me = state.me.username;
  const mine = await api(`/api/profile/${me}?count_view=0`);

  const left = h("div", { class: "col col-left" });
  const mid = h("div", { class: "col col-mid" });
  const right = h("div", { class: "col col-right" });
  root.append(h("div", { class: "cols" }, left, mid, right));

  // ---------- left: hello + requests ----------
  function drawLeft() {
    const n = unreadTotal();
    const requests = state.incoming.map((p) =>
      h("div", { class: "person-row" },
        h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava sm")),
        h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name),
        h("button", { class: "xp-btn small", onclick: () => answer(p.username, "accept") }, "Accept"),
        h("button", { class: "xp-btn small", onclick: () => answer(p.username, "decline") }, "Decline"))
    );
    left.replaceChildren(
      ...[box(`Hello, ${state.me.display_name}!`,
        h("div", { class: "hello" },
          h("a", { href: "#/u/me" }, avatar(me, state.me.avatar_v, "ava lg")),
          h("div", {},
            mine.mood ? h("div", {}, h("b", {}, "Mood: "), mine.mood) : null,
            h("div", {}, h("b", {}, "Views: "), String(mine.views)),
            h("div", {}, h("b", {}, "Friends: "), String(state.friends.length)))),
        h("ul", { class: "quick" },
          h("li", {}, h("a", { href: "#/u/me" }, "View my profile")),
          h("li", {}, h("a", { href: "#/customize" }, "Edit profile & theme")),
          h("li", {}, h("a", { href: "#/mail" }, "Mail"), n ? h("b", { class: "new-badge" }, ` ${n} new!`) : null),
          h("li", {}, h("a", { href: "#/browse" }, "Find people")))),
      requests.length ? box(`Friend requests (${requests.length})`, requests) : null].filter(Boolean)
    );
  }

  async function answer(username, what) {
    try {
      await api(`/api/friends/${what}`, { method: "POST", body: { username } });
      toast(what === "accept" ? "You're friends now!" : "Request declined.", { kind: "ok" });
      await refreshFriends();
    } catch (e) {
      toast(e.message, { kind: "error" });
    }
  }

  // ---------- middle: bulletin board ----------
  const ta = h("textarea", { rows: 3, maxLength: 500, placeholder: "What's on your mind? (your friends will see it)", "aria-label": "New bulletin" });
  const counter = h("span", { class: "counter" }, "0/500");
  ta.addEventListener("input", () => (counter.textContent = `${ta.value.length}/500`));
  const feed = h("div", { class: "feed" });

  const composer = h("form", { class: "composer", onsubmit: async (e) => {
    e.preventDefault();
    const body = ta.value.trim();
    if (!body) return;
    try {
      await api("/api/posts", { method: "POST", body: { body } });
      ta.value = "";
      counter.textContent = "0/500";
      await loadFeed();
    } catch (err) {
      toast(err.message, { kind: "error" });
    }
  } }, ta, h("div", { class: "composer-row" }, counter, h("button", { class: "xp-btn primary", type: "submit" }, "Post bulletin")));

  async function loadFeed() {
    const { posts } = await api("/api/posts/feed");
    feed.replaceChildren(
      ...(posts.length
        ? posts.map((p) =>
            h("article", { class: "post" },
              h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava md")),
              h("div", { class: "post-main" },
                h("div", { class: "post-meta" }, h("a", { href: `#/u/${p.username}`, class: "pname" }, p.display_name), ` · ${fmtDate(p.created_at)} ${fmtClock(p.created_at)}`,
                  p.username === me ? h("button", { class: "linkish", onclick: async () => { await api(`/api/posts/${p.id}`, { method: "DELETE" }); loadFeed(); } }, "delete") : null),
                h("div", { class: "post-body" }, p.body))))
        : [h("p", { class: "empty" }, "Nothing here yet. Post something, or add a few friends so their bulletins show up!")])
    );
  }
  mid.append(box("Bulletin space", composer, feed));

  // ---------- right: who's online + new people ----------
  const newPeople = h("div", { class: "new-people" });
  const onlineBox = h("div");
  function drawOnline() {
    const online = state.friends.filter((f) => state.online.has(f.username));
    onlineBox.replaceChildren(
      box(`Friends online (${online.length}/${state.friends.length})`,
        online.length
          ? online.map((f) => h("a", { class: "person-row", href: `#/mail/${f.username}` }, h("span", { class: "dot on" }), h("span", { class: "pname" }, f.display_name), h("small", {}, "chat")))
          : h("p", { class: "empty" }, state.friends.length ? "Nobody's online right now." : "No friends yet, find some below!"))
    );
  }
  async function loadNew() {
    const { people } = await api("/api/people/new");
    newPeople.replaceChildren(
      box("Cool new people",
        people.length
          ? people.slice(0, 6).map((p) =>
              h("div", { class: "person-row" },
                h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava sm")),
                h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name),
                p.rel === "none" || p.rel === "incoming"
                  ? h("button", { class: "xp-btn small", onclick: async () => { await api("/api/friends/request", { method: "POST", body: { username: p.username } }).catch((e) => toast(e.message, { kind: "error" })); await refreshFriends(); loadNew(); } }, p.rel === "incoming" ? "Accept" : "Add")
                  : h("small", {}, "sent")))
          : h("p", { class: "empty" }, "You've met everybody. For now!")),
      h("p", { class: "more" }, h("a", { href: "#/browse" }, "Search for more people »"))
    );
  }
  right.append(onlineBox, newPeople);

  drawLeft();
  drawOnline();
  ctx.cleanup(listen("friends", () => { drawLeft(); drawOnline(); loadNew(); }));
  ctx.cleanup(listen("presence", drawOnline));
  ctx.cleanup(listen("unread", drawLeft));
  await Promise.all([loadFeed(), loadNew()]);
}
