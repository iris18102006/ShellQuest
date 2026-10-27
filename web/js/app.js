import { api } from "./api.js";
import { h, $ } from "./dom.js";
import * as socket from "./socket.js";
import { boot, listen, state, unreadTotal } from "./state.js";
import { stopTrail } from "./theme.js";
import { toast } from "./dom.js";
import * as home from "./views/home.js";
import * as profile from "./views/profile.js";
import * as customize from "./views/customize.js";
import * as people from "./views/people.js";
import * as mail from "./views/mail.js";

const routes = [
  [/^\/?$/, home.render, "home"],
  [/^\/u\/([a-z0-9_]+|me)$/, profile.render, "profile"],
  [/^\/customize$/, customize.render, "customize"],
  [/^\/friends$/, people.renderFriends, "friends"],
  [/^\/browse$/, people.renderBrowse, "browse"],
  [/^\/mail(?:\/([a-z0-9_]+))?$/, mail.render, "mail"],
];

const view = $("#view");
let current = null; // {ctx}
let navId = 0;
let lastHash = location.hash;
let reverting = false;

function makeCtx(query) {
  const cleanups = [];
  return {
    query,
    dead: false,
    guard: null,
    cleanup(fn) {
      if (this.dead) fn();
      else cleanups.push(fn);
    },
    destroy() {
      this.dead = true;
      cleanups.splice(0).forEach((fn) => fn());
    },
  };
}

async function navigate() {
  // views like Customize can ask "are you sure?" before we leave
  if (reverting) {
    reverting = false;
    return;
  }
  if (current && current.ctx.guard && !current.ctx.guard()) {
    reverting = true;
    location.hash = lastHash;
    return;
  }
  lastHash = location.hash;

  const id = ++navId;
  if (current) current.ctx.destroy();
  stopTrail();
  state.activeChat = null;
  document.title = "cipher-chat - a place for friends";

  const [path, qs] = (location.hash.slice(1) || "/").split("?");
  const query = new URLSearchParams(qs || "");
  const ctx = makeCtx(query);
  current = { ctx };

  const match = routes.map(([re, fn, name]) => [re.exec(path), fn, name]).find(([m]) => m);
  const container = h("div", { class: "view-inner" });
  view.replaceChildren(h("p", { class: "loading" }, "Loading…"));
  document.body.dataset.route = match ? match[2] : "404";
  markNav(match ? match[2] : "");

  if (!match) {
    view.replaceChildren(h("div", { class: "site-box page-narrow" }, h("h2", {}, "Page not found"), h("a", { href: "#/" }, "← back home")));
    return;
  }
  try {
    await match[1](container, match[0].slice(1), ctx);
    if (id !== navId) return ctx.destroy();
    view.replaceChildren(container);
    window.scrollTo(0, 0);
  } catch (e) {
    if (id !== navId) return ctx.destroy();
    console.error(e);
    view.replaceChildren(h("div", { class: "site-box page-narrow" }, h("h2", {}, "Oops"), h("p", {}, e.message || "something broke"), h("a", { href: "#/" }, "← back home")));
  }
}

// ---------- page chrome ----------
const navLinks = [
  ["home", "Home", "#/"],
  ["profile", "My Page", "#/u/me"],
  ["mail", "Mail", "#/mail"],
  ["friends", "Friends", "#/friends"],
  ["browse", "Browse", "#/browse"],
  ["customize", "Customize", "#/customize"],
];

function drawNav() {
  const n = unreadTotal();
  const req = state.incoming.length;
  $("#nav").replaceChildren(
    ...navLinks.map(([name, label, href]) =>
      h("a", { href, "data-nav": name },
        label,
        name === "mail" && n ? h("b", { class: "new-badge" }, String(n)) : null,
        name === "friends" && req ? h("b", { class: "new-badge" }, String(req)) : null)
    )
  );
  markNav(document.body.dataset.route || "");
  const banner = $("#banner-text");
  const bits = ["★ welcome to cipher-chat!! ★", "every message is end-to-end encrypted 🔒", "customize your page, no code needed", "add friends, leave comments, post bulletins ★"];
  if (n) bits.unshift(`✉ you have ${n} new message${n === 1 ? "" : "s"}!`);
  if (req) bits.unshift(`👥 ${req} friend request${req === 1 ? "" : "s"} waiting!`);
  banner.textContent = bits.join("   ✦   ");
}

function markNav(name) {
  for (const a of document.querySelectorAll("#nav a")) {
    if (a.dataset.nav === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

function drawUser() {
  $("#whoami").replaceChildren(
    "Hello, ",
    h("a", { href: "#/u/me" }, state.me.display_name),
    "! ",
    h("button", { class: "linkish", type: "button", onclick: logout }, "[log out]")
  );
}

async function logout() {
  socket.disconnect();
  await api("/api/logout", { method: "POST" }).catch(() => {});
  location.href = "/login.html";
}

$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#search-q").value.trim();
  location.hash = q ? `#/browse?q=${encodeURIComponent(q)}` : "#/browse";
});

// ---------- start ----------
(async () => {
  try {
    await boot();
  } catch (e) {
    console.error(e);
    view.replaceChildren(h("div", { class: "site-box page-narrow" }, h("h2", {}, "Couldn't start"), h("p", {}, e.message || "is the server running?")));
    return;
  }
  drawUser();
  drawNav();
  listen("friends", drawNav);
  listen("unread", drawNav);
  listen("me", drawUser);
  listen("conn", ({ open }) => $("#conn").classList.toggle("down", !open));
  listen("ws-error", (d) => !d.cid && toast(d.error || "something went wrong", { kind: "error" }));
  window.addEventListener("hashchange", navigate);
  navigate();
})();
