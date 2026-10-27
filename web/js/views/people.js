import { api } from "../api.js";
import { avatar, confirmBox, h, statusText, toast } from "../dom.js";
import { listen, refreshFriends, state } from "../state.js";

const box = (title, ...body) => h("section", { class: "site-box" }, h("h2", { class: "box-head" }, title), h("div", { class: "box-body" }, body));

const post = (path, body) => api(path, { method: "POST", body });

async function attempt(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg, { kind: "ok" });
  } catch (e) {
    toast(e.message, { kind: "error" });
  }
  await refreshFriends();
}

// ============================ My friends ============================

export async function renderFriends(root, _params, ctx) {
  const host = h("div", { class: "page-narrow" });
  root.append(host);
  let blocked = [];

  async function loadBlocked() {
    blocked = (await api("/api/blocks")).blocked;
    draw();
  }

  function draw() {
    const requests = state.incoming.map((p) =>
      h("div", { class: "person-row big" },
        h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava md")),
        h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name, h("small", {}, ` @${p.username}`)),
        h("span", { class: "spacer" }),
        h("button", { class: "xp-btn primary", onclick: () => attempt(() => post("/api/friends/accept", { username: p.username }), "You're friends now!") }, "Accept"),
        h("button", { class: "xp-btn", onclick: () => attempt(() => post("/api/friends/decline", { username: p.username })) }, "Decline"))
    );

    const friends = [...state.friends]
      .sort((a, b) => Number(state.online.has(b.username)) - Number(state.online.has(a.username)) || a.display_name.localeCompare(b.display_name))
      .map((p) => {
        const on = state.online.has(p.username);
        const n = state.unread[p.username];
        return h("div", { class: "person-row big" },
          h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava md")),
          h("div", { class: "pcol" },
            h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name, h("small", {}, ` @${p.username}`)),
            h("span", { class: "status " + (on ? "on" : "off") }, statusText(on, state.lastSeen[p.username]))),
          h("span", { class: "spacer" }),
          h("a", { class: "xp-btn", href: `#/mail/${p.username}` }, n ? `Message (${n} new)` : "Message"),
          h("button", { class: "xp-btn", onclick: async () => {
            if (await confirmBox("Remove friend", `Remove ${p.display_name} from your friends?`, "Remove"))
              attempt(() => api(`/api/friends/${p.username}`, { method: "DELETE" }));
          } }, "Remove"));
      });

    const sent = state.outgoing.map((p) =>
      h("div", { class: "person-row" },
        avatar(p.username, p.avatar_v, "ava sm"),
        h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name),
        h("span", { class: "spacer" }),
        h("button", { class: "xp-btn small", onclick: () => attempt(() => api(`/api/friends/${p.username}`, { method: "DELETE" }), "Request cancelled.") }, "Cancel"))
    );

    const blockedRows = blocked.map((p) =>
      h("div", { class: "person-row" },
        h("span", { class: "pname" }, p.display_name, h("small", {}, ` @${p.username}`)),
        h("span", { class: "spacer" }),
        h("button", { class: "xp-btn small", onclick: async () => {
          await attempt(() => api(`/api/blocks/${p.username}`, { method: "DELETE" }), "Unblocked.");
          loadBlocked();
        } }, "Unblock"))
    );

    host.replaceChildren(
      ...[
        requests.length ? box(`Friend requests (${requests.length})`, requests) : null,
        box(`My friends (${friends.length})`, friends.length ? friends : h("p", { class: "empty" }, "No friends yet. ", h("a", { href: "#/browse" }, "Go find some!"))),
        sent.length ? box("Requests I sent", sent) : null,
        blockedRows.length ? box("Blocked people", blockedRows) : null,
      ].filter(Boolean)
    );
  }

  ctx.cleanup(listen("friends", draw));
  ctx.cleanup(listen("presence", draw));
  ctx.cleanup(listen("unread", draw));
  draw();
  await loadBlocked();
}

// ============================ Browse / search ============================

function personCard(p, reload) {
  const btn = (label, fn, cls = "xp-btn small") => h("button", { class: cls, onclick: fn }, label);
  let action;
  if (p.rel === "none") action = btn("➕ Add friend", () => attempt(() => post("/api/friends/request", { username: p.username }), "Friend request sent!").then(reload));
  else if (p.rel === "incoming") action = btn("✅ Accept", () => attempt(() => post("/api/friends/accept", { username: p.username }), "You're friends now!").then(reload));
  else if (p.rel === "outgoing") action = h("small", { class: "muted" }, "request sent");
  else action = h("small", { class: "muted" }, "✓ friends");
  return h("div", { class: "card" },
    h("a", { href: `#/u/${p.username}` }, avatar(p.username, p.avatar_v, "ava md")),
    h("a", { class: "pname", href: `#/u/${p.username}` }, p.display_name),
    h("small", { class: "muted" }, `@${p.username}`),
    action);
}

export async function renderBrowse(root, _params, ctx) {
  const q0 = ctx.query.get("q") || "";
  const input = h("input", { type: "search", maxLength: 30, placeholder: "name or username", value: q0, "aria-label": "Search people" });
  const results = h("div", { class: "cards" });
  const newest = h("div", { class: "cards" });
  const resultsBox = h("div");

  async function search(q) {
    if (!q) {
      resultsBox.replaceChildren();
      return;
    }
    const { people } = await api(`/api/people/search?q=${encodeURIComponent(q)}`);
    results.replaceChildren(...(people.length ? people.map((p) => personCard(p, () => search(q))) : [h("p", { class: "empty" }, `Nobody matches “${q}”.`)]));
    resultsBox.replaceChildren(box(`Search results for “${q}”`, results));
  }

  async function loadNew() {
    const { people } = await api("/api/people/new");
    newest.replaceChildren(...(people.length ? people.map((p) => personCard(p, loadNew)) : [h("p", { class: "empty" }, "No new people right now. Invite your friends!")]));
  }

  const form = h("form", { class: "search-form", onsubmit: (e) => {
    e.preventDefault();
    const q = input.value.trim();
    history.replaceState(null, "", q ? `#/browse?q=${encodeURIComponent(q)}` : "#/browse");
    search(q);
  } }, input, h("button", { class: "xp-btn primary", type: "submit" }, "Search"));

  root.append(h("div", { class: "page-narrow" }, box("Find people", form), resultsBox, box("Cool new people", newest)));
  ctx.cleanup(listen("friends", () => { loadNew(); if (input.value.trim()) search(input.value.trim()); }));
  await Promise.all([loadNew(), search(q0.trim())]);
  input.focus();
}
