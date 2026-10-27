import { api } from "../api.js";
import { avatar, confirmBox, fmtClock, fmtDate, h, plural, statusText, toast } from "../dom.js";
import { listen, refreshFriends, state } from "../state.js";
import { applyTheme, startTrail, stopTrail } from "../theme.js";

const box = (title, ...body) =>
  h("section", { class: "pf-box" }, h("h2", { class: "pf-box-head" }, title), h("div", { class: "pf-box-body" }, body));

const textOrEmpty = (text, empty) =>
  text ? h("div", { class: "pf-text" }, text) : h("div", { class: "pf-text empty" }, empty);

export function setStatus(el, online, lastSeen) {
  el.className = "pf-status " + (online ? "on" : "off");
  el.textContent = statusText(online, lastSeen);
}

const led = (n) =>
  h("span", { class: "led", role: "img", "aria-label": plural(n, "profile view") }, [...String(n).padStart(6, "0")].map((d) => h("i", {}, d)));

function contactBox(p, actions, preview) {
  const btn = (cls, label, fn) => h("button", { class: "mb " + cls, type: "button", disabled: preview, onclick: fn }, label);
  const link = (label, href) => h(preview ? "span" : "a", { class: "mb", href }, label);
  const items = [];
  if (p.rel === "self") {
    items.push(link("✏️ Edit my page", "#/customize"), link("✉️ My mail", "#/mail"));
  } else {
    if (p.rel === "friend") items.push(link("✉️ Send message", `#/mail/${p.username}`));
    if (p.rel === "none") items.push(btn("add", "➕ Add to friends", actions.add));
    if (p.rel === "outgoing") items.push(btn("", "⏳ Request sent (cancel)", actions.remove));
    if (p.rel === "incoming") items.push(btn("add", "✅ Accept request", actions.accept), btn("", "✖ Decline", actions.decline));
    if (p.rel === "friend") items.push(btn("", "💔 Remove friend", actions.remove));
    items.push(btn("danger", "🚫 Block user", actions.block));
  }
  return box(`Contacting ${p.display_name}`, h("div", { class: "pf-buttons" }, items));
}

function commentsBox(p, comments, actions, preview, viewer) {
  const ta = h("textarea", { rows: 3, maxLength: 300, placeholder: `Say something nice to ${p.display_name}…`, "aria-label": "Write a comment", disabled: preview });
  const form = h(
    "form",
    {
      class: "pf-comment-form",
      onsubmit: async (e) => {
        e.preventDefault();
        const text = ta.value.trim();
        if (text) await actions.comment(text);
      },
    },
    ta,
    h("button", { class: "mb add", type: "submit", disabled: preview }, "💬 Post comment")
  );
  const rows = comments.map((c) =>
    h(
      "div",
      { class: "pf-comment" },
      h("a", { class: "pf-comment-who", href: `#/u/${c.username}` }, avatar(c.username, c.avatar_v, "ava sm"), h("span", {}, c.display_name)),
      h(
        "div",
        { class: "pf-comment-main" },
        h(
          "div",
          { class: "pf-comment-meta" },
          `${fmtDate(c.created_at)} · ${fmtClock(c.created_at)}`,
          c.username === viewer || p.rel === "self"
            ? h("button", { class: "linkish", type: "button", disabled: preview, "aria-label": "Delete comment", onclick: () => actions.deleteComment(c.id) }, "delete")
            : null
        ),
        h("div", { class: "pf-text" }, c.body)
      )
    )
  );
  return box(
    `${p.display_name}'s friends' comments (${comments.length})`,
    form,
    rows.length ? rows : h("div", { class: "pf-text empty" }, "No comments yet. Be the first!")
  );
}

function postsBox(p, posts, actions, preview) {
  const rows = posts.map((post) =>
    h(
      "div",
      { class: "pf-post" },
      h("div", { class: "pf-post-meta" }, `${fmtDate(post.created_at)} · ${fmtClock(post.created_at)}`,
        p.rel === "self" ? h("button", { class: "linkish", type: "button", disabled: preview, onclick: () => actions.deletePost(post.id) }, "delete") : null),
      h("div", { class: "pf-text" }, post.body)
    )
  );
  return box(`${p.display_name}'s bulletins`, rows.length ? rows : h("div", { class: "pf-text empty" }, "No bulletins posted yet."));
}

// Builds the whole profile page. Used for real profiles and for the live preview in Customize.
export function profileDom(p, { preview = false, actions = {}, comments = [], posts = [], viewer = null } = {}) {
  const t = p.theme;
  const root = h("div", { class: "profile-page" + (preview ? " is-preview" : "") });
  applyTheme(root, t);

  if (t.marquee_on && t.marquee_text) {
    root.append(h("div", { class: "pf-marquee", role: "marquee" }, h("span", {}, t.marquee_text)));
  }

  const infoRows = [];
  const row = (k, v) => infoRows.push(h("dt", {}, k), h("dd", {}, v));
  if (p.mood) row("Mood:", p.mood);
  if (p.online !== undefined) {
    const status = h("span", { "data-status": p.username });
    setStatus(status, p.online, p.last_seen);
    row("Status:", status);
  }
  if (p.location) row("Location:", p.location);
  row("Member since:", fmtDate(p.member_since));
  row("Profile views:", led(p.views));

  const left = h(
    "div",
    { class: "pf-left" },
    box(
      "Profile",
      h("div", { class: "pf-card" }, avatar(p.username, p.avatar_v, "ava lg"), h("dl", { class: "pf-info" }, infoRows))
    ),
    contactBox(p, actions, preview),
    p.now_playing ? box("Now playing", h("div", { class: "pf-playing" }, h("span", { class: "pf-playing-text" }, "♪ " + p.now_playing + " ♪"))) : null
  );

  const friends = p.top_friends.map((f) =>
    h("a", { class: "pf-friend", href: `#/u/${f.username}` }, avatar(f.username, f.avatar_v, "ava md"), h("span", {}, f.display_name))
  );

  const right = h(
    "div",
    { class: "pf-right" },
    box("About me", textOrEmpty(p.about, p.rel === "self" ? "Nothing here yet. Hit “Edit my page” to write something!" : "Hasn't written anything yet.")),
    box("Who I'd like to meet", textOrEmpty(p.meet, "—")),
    box("Interests", textOrEmpty(p.interests, "—")),
    box(
      `${p.display_name}'s friend space`,
      h("div", { class: "pf-friend-count" }, `${plural(p.friend_count, "friend")}`),
      friends.length ? h("div", { class: "pf-friends" }, friends) : h("div", { class: "pf-text empty" }, "No friends yet.")
    ),
    postsBox(p, posts, actions, preview),
    commentsBox(p, comments, actions, preview, viewer)
  );

  root.append(
    h(
      "div",
      { class: "pf-wrap" },
      h("header", { class: "pf-top" },
        h("h1", { class: "pf-name" + (t.glitter ? " glitter" : "") }, p.display_name),
        h("span", { class: "pf-handle" }, `@${p.username}`),
        p.tagline ? h("div", { class: "pf-tagline" }, `“${p.tagline}”`) : null),
      h("div", { class: "pf-grid" }, left, right)
    )
  );
  return root;
}

export async function render(root, [param], ctx) {
  const username = param === "me" ? state.me.username : param;
  let first = true;

  async function load() {
    let p;
    try {
      p = await api(`/api/profile/${username}${first ? "" : "?count_view=0"}`);
    } catch (e) {
      stopTrail();
      root.replaceChildren(h("div", { class: "site-box" }, h("h2", {}, "Profile not found"), h("p", {}, e.message), h("a", { href: "#/" }, "← back home")));
      return;
    }
    first = false;
    const [posts, comments] = await Promise.all([
      api(`/api/profile/${username}/posts`),
      api(`/api/profile/${username}/comments`),
    ]);
    document.title = `${p.display_name} - cipher-chat`;
    root.replaceChildren(profileDom(p, { actions, comments: comments.comments, posts: posts.posts, viewer: state.me.username }));
    startTrail(p.theme.trail);
  }

  const run = (fn, okMsg) => async () => {
    try {
      await fn();
      if (okMsg) toast(okMsg, { kind: "ok" });
      await refreshFriends();
      await load();
    } catch (e) {
      toast(e.message, { kind: "error" });
    }
  };
  const post = (path, body) => api(path, { method: "POST", body });

  const actions = {
    add: run(() => post("/api/friends/request", { username }), "Friend request sent!"),
    accept: run(() => post("/api/friends/accept", { username }), "You're friends now!"),
    decline: run(() => post("/api/friends/decline", { username })),
    remove: async () => {
      if (await confirmBox("Remove friend", "Remove this person from your friends (or cancel your request)?", "Remove"))
        run(() => api(`/api/friends/${username}`, { method: "DELETE" }))();
    },
    block: async () => {
      if (await confirmBox("Block user", "They won't be able to see your page, message you, or find you. You can unblock them later from the Friends page.", "Block"))
        run(() => post("/api/blocks", { username }), "Blocked.")();
    },
    comment: async (text) => run(() => post(`/api/profile/${username}/comments`, { body: text }))(),
    deleteComment: (id) => run(() => api(`/api/comments/${id}`, { method: "DELETE" }))(),
    deletePost: (id) => run(() => api(`/api/posts/${id}`, { method: "DELETE" }))(),
  };

  ctx.cleanup(stopTrail);
  ctx.cleanup(
    listen("presence", () => {
      const el = root.querySelector(`[data-status="${username}"]`);
      if (el) setStatus(el, state.online.has(username), state.lastSeen[username]);
    })
  );
  await load();
}
