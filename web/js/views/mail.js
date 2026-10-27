// Mail: an AIM-style buddy list and chat window. Messages are encrypted in the browser
// (see crypto.js), the server stores and forwards only ciphertext.
import { api } from "../api.js";
import { aad, decryptText, deriveSharedKey, encryptText, fingerprint, importPub } from "../crypto.js";
import { avatar, dayKey, dialog, fmtClock, fmtDay, h, statusText, timeAgo, toast } from "../dom.js";
import * as socket from "../socket.js";
import { emit, listen, setSound, state } from "../state.js";

const PAGE = 50;
const MAX_LEN = 2000;
const sharedKeys = new Map(); // peer public key (b64) -> AES key

async function sharedKeyFor(pubB64) {
  if (!sharedKeys.has(pubB64)) sharedKeys.set(pubB64, await deriveSharedKey(state.identity.privateKey, await importPub(pubB64)));
  return sharedKeys.get(pubB64);
}

// "trust on first use": remember the key we saw for a friend, and shout if it ever changes
const trustKey = (peer) => `cc-trusted:${state.me.username}:${peer}`;
const trustedKeys = (peer) => JSON.parse(localStorage.getItem(trustKey(peer)) || "[]");
const trust = (peer, pub) => localStorage.setItem(trustKey(peer), JSON.stringify([...new Set([...trustedKeys(peer), pub])]));

const windowFrame = (cls, title, buttons, ...body) =>
  h("section", { class: `win ${cls}` },
    h("div", { class: "titlebar" }, h("span", { class: "tb-title" }, title), h("span", { class: "tb-btns" }, buttons)),
    body);

export async function render(root, [peer], ctx) {
  const me = state.me.username;

  // ================= buddy list =================
  const buddyBody = h("div", { class: "buddy-body" });
  function drawBuddies() {
    const sorted = [...state.friends].sort((a, b) => a.display_name.localeCompare(b.display_name));
    const online = sorted.filter((f) => state.online.has(f.username));
    const offline = sorted.filter((f) => !state.online.has(f.username));
    const row = (f) => {
      const on = state.online.has(f.username);
      const n = state.unread[f.username];
      return h("a", { class: "buddy" + (f.username === peer ? " active" : ""), href: `#/mail/${f.username}` },
        h("span", { class: "dot " + (on ? "on" : "off") }),
        h("span", { class: "buddy-name" }, f.display_name, !on && state.lastSeen[f.username] ? h("small", {}, ` · ${timeAgo(state.lastSeen[f.username])}`) : null),
        n ? h("b", { class: "new-badge" }, String(n)) : null);
    };
    const group = (label, list) => h("details", { class: "buddy-group", open: true }, h("summary", {}, `${label} (${list.length})`), list.map(row));
    buddyBody.replaceChildren(
      ...(state.friends.length
        ? [group("Buddies online", online), group("Offline", offline)]
        : [h("p", { class: "empty pad" }, "Your buddy list is empty. ", h("a", { href: "#/browse" }, "Find people to add!"))])
    );
  }

  // ================= chat window =================
  const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite" });
  const typingEl = h("div", { class: "typing", hidden: true }, h("span", { class: "dots" }, h("i"), h("i"), h("i")), h("span", { class: "typing-who" }));
  const banner = h("div", { class: "chat-banner", hidden: true });
  const newChip = h("button", { class: "new-chip", type: "button", hidden: true, onclick: () => scrollDown(true) }, "↓ new messages");
  const input = h("textarea", { class: "chat-input", rows: 2, maxLength: MAX_LEN, placeholder: "Type a message. Enter to send, Shift+Enter for a new line", "aria-label": "Message" });
  const sendBtn = h("button", { class: "xp-btn primary", type: "button" }, "Send");
  const lock = h("span", { class: "lock", title: "Messages are encrypted in your browser" }, "🔒 end-to-end encrypted");
  const headStatus = h("span", { class: "chat-status" });
  const soundBtn = h("button", { class: "tb-btn", type: "button", "aria-label": "Toggle message sound", title: "Message sound", onclick: () => { setSound(!state.sound); drawSound(); } });
  const drawSound = () => (soundBtn.textContent = state.sound ? "🔔" : "🔕");

  const chatBox = h("div", { class: "chat-main" }, banner, h("div", { class: "log-wrap" }, log, newChip), typingEl,
    h("div", { class: "composer-bar" }, input, h("div", { class: "composer-side" }, h("small", { class: "muted", id: "len" }), sendBtn)));

  const friend = state.friends.find((f) => f.username === peer);
  let chatWin;
  if (!peer) {
    chatWin = windowFrame("chat-win", "Instant messages", [], h("div", { class: "chat-empty" },
      h("div", { class: "big-lock" }, "🔒"), h("h3", {}, "Pick a buddy to start chatting"),
      h("p", {}, "Everything you type is encrypted in your browser before it's sent. The server just passes along scrambled text it can't read.")));
  } else if (!friend) {
    chatWin = windowFrame("chat-win", "Instant messages", [], h("div", { class: "chat-empty" },
      h("h3", {}, "You can only chat with friends"), h("p", {}, h("a", { href: `#/u/${peer}` }, "Visit their page"), " to send a friend request.")));
  } else {
    chatWin = windowFrame("chat-win", `${friend.display_name} - Instant Message`,
      [soundBtn, h("a", { class: "tb-btn", href: `#/u/${peer}`, title: "View profile", "aria-label": "View profile" }, "👤"), h("a", { class: "tb-btn close", href: "#/mail", "aria-label": "Close chat" }, "x")],
      h("div", { class: "chat-head" }, avatar(peer, friend.avatar_v, "ava sm"), h("div", {}, h("b", {}, friend.display_name), headStatus), h("span", { class: "spacer" }), lock), chatBox);
  }

  root.append(h("div", { class: "mail-layout" }, windowFrame("buddy-win", `${state.me.display_name}'s Buddy List`, [], buddyBody), chatWin));
  drawBuddies();
  drawSound();
  ctx.cleanup(listen("friends", drawBuddies));
  ctx.cleanup(listen("presence", () => { drawBuddies(); drawHeadStatus(); }));
  ctx.cleanup(listen("unread", drawBuddies));
  if (!peer || !friend) return;

  // ================= chat logic =================
  const all = []; // {id, cid, from, to, text, at, delivered_at, read_at, state, warn}
  let peerPub = null;
  let peerPubAt = 0;
  let blocked = false; // true when we can't send (no key yet, or key changed and not yet trusted)
  let hasMore = false;
  let typingTimer = null;
  let lastTypingSent = 0;
  let iAmTyping = false;

  const drawHeadStatus = () => {
    const on = state.online.has(peer);
    headStatus.className = "chat-status " + (on ? "on" : "off");
    headStatus.textContent = statusText(on, state.lastSeen[peer]);
  };
  drawHeadStatus();

  const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 90;
  function scrollDown(force) {
    if (force || nearBottom()) {
      log.scrollTop = log.scrollHeight;
      newChip.hidden = true;
    } else newChip.hidden = false;
  }

  function ticks(m) {
    if (m.state === "sending") return h("span", { class: "ticks pending", title: "Sending…" }, "…");
    if (m.state === "failed") return h("span", { class: "ticks failed", title: m.error || "Not sent" }, "⚠ not sent");
    if (m.read_at) return h("span", { class: "ticks read", title: `Read ${fmtClock(m.read_at)}` }, "✓✓");
    if (m.delivered_at) return h("span", { class: "ticks delivered", title: "Delivered" }, "✓✓");
    return h("span", { class: "ticks sent", title: "Sent" }, "✓");
  }

  function bubble(m) {
    const mine = m.from === me;
    const body = m.text === null
      ? h("div", { class: "bubble-text undecryptable" }, "🔒 Can't decrypt this one. It was locked with a key this browser doesn't have (maybe it was sent to another device).")
      : h("div", { class: "bubble-text" }, m.text);
    return h("div", { class: "bubble " + (mine ? "me" : "them") + (m.state === "failed" ? " failed" : ""), "data-key": m.id || m.cid },
      body,
      m.warn ? h("div", { class: "bubble-warn" }, "⚠ This message used a key you haven't verified.") : null,
      h("div", { class: "bubble-meta" }, fmtClock(m.at), mine ? ticks(m) : null),
      mine && m.read_at && m.id === lastReadMine()?.id ? h("div", { class: "seen" }, `Seen ${fmtClock(m.read_at)}`) : null);
  }

  const lastReadMine = () => [...all].reverse().find((m) => m.from === me && m.read_at);

  function drawAll() {
    const keepBottom = nearBottom();
    const frag = document.createDocumentFragment();
    if (hasMore) frag.append(h("button", { class: "xp-btn small more-btn", type: "button", onclick: loadEarlier }, "Load earlier messages"));
    if (!all.length) frag.append(h("p", { class: "empty pad" }, `Say hi to ${friend.display_name}! 👋`));
    let day = "";
    for (const m of all) {
      const k = dayKey(m.at);
      if (k !== day) {
        day = k;
        frag.append(h("div", { class: "day-sep" }, h("span", {}, fmtDay(m.at))));
      }
      frag.append(bubble(m));
    }
    log.replaceChildren(frag);
    if (keepBottom) scrollDown(true);
  }

  async function open(m) {
    // turn the stored/forwarded envelope into text, check who it claims to be from
    try {
      const theirPub = m.from === me ? m.rpub : m.spub;
      m.text = await decryptText(await sharedKeyFor(theirPub), m.iv, m.ct, aad(m.from, m.to));
      m.warn = m.from !== me && !trustedKeys(peer).includes(m.spub);
    } catch {
      m.text = null;
    }
    return m;
  }

  async function loadHistory(before) {
    const q = before ? `?before=${before}&limit=${PAGE}` : `?limit=${PAGE}`;
    const { messages } = await api(`/api/messages/${peer}${q}`);
    const opened = await Promise.all(messages.map(open));
    hasMore = messages.length === PAGE;
    return opened;
  }

  async function loadEarlier() {
    const older = await loadHistory(all[0]?.id);
    const before = log.scrollHeight;
    all.unshift(...older);
    drawAll();
    log.scrollTop = log.scrollHeight - before;
  }

  function addLive(m) {
    if (all.some((x) => x.id === m.id)) return;
    all.push(m);
    const wasNear = nearBottom();
    const last = all[all.length - 2];
    const frag = document.createDocumentFragment();
    if (!last || dayKey(last.at) !== dayKey(m.at)) frag.append(h("div", { class: "day-sep" }, h("span", {}, fmtDay(m.at))));
    if (!last) log.querySelector(".empty")?.remove();
    frag.append(bubble(m));
    log.append(frag);
    if (m.from === me || wasNear) scrollDown(true);
    else newChip.hidden = false;
  }

  const redrawBubble = (m) => {
    const el = log.querySelector(`[data-key="${m.cid || m.id}"], [data-key="${m.id}"]`);
    if (!el) return drawAll();
    el.replaceWith(bubble(m));
  };

  // ---- key handling ----
  function showBanner(text, buttons = []) {
    banner.hidden = !text;
    banner.replaceChildren(...(text ? [h("span", {}, text), ...buttons] : []));
  }

  function setUsable(ok) {
    blocked = !ok;
    input.disabled = !ok || !socket.isOpen();
    sendBtn.disabled = input.disabled;
  }

  async function refreshPeerKey() {
    try {
      const { public_key } = await api(`/api/keys/${peer}`);
      peerPub = public_key;
      peerPubAt = Date.now();
    } catch (e) {
      peerPub = null;
      setUsable(false);
      showBanner(`${friend.display_name} hasn't opened cipher-chat in a browser yet, so there's no key to lock messages with. Try again once they've logged in.`,
        [h("button", { class: "xp-btn small", type: "button", onclick: start }, "Try again")]);
      return false;
    }
    const known = trustedKeys(peer);
    if (!known.length) trust(peer, peerPub); // first time we meet this friend's key
    else if (!known.includes(peerPub)) {
      setUsable(false);
      showBanner(`⚠ ${friend.display_name}'s encryption key changed. That happens if they logged in on a new browser, but it could also mean someone is in the middle. Compare safety numbers with them first.`,
        [h("button", { class: "xp-btn small", type: "button", onclick: showSafety }, "Safety numbers"),
         h("button", { class: "xp-btn small", type: "button", onclick: () => { trust(peer, peerPub); showBanner(""); setUsable(true); drawAll(); } }, "I trust the new key")]);
      return false;
    }
    showBanner("");
    setUsable(true);
    return true;
  }

  async function showSafety() {
    const mine = await fingerprint(state.myPub);
    const theirs = peerPub ? await fingerprint(peerPub) : "(no key yet)";
    await dialog({
      title: "Safety numbers", icon: "🔒",
      body: h("div", { class: "safety" },
        h("p", {}, "Read these out to each other over a phone call or in person. If they match what the other person sees, nobody is spying on the chat."),
        h("p", {}, h("b", {}, "Your number"), h("code", {}, mine)),
        h("p", {}, h("b", {}, `${friend.display_name}'s number`), h("code", {}, theirs)))
    });
  }
  lock.style.cursor = "pointer";
  lock.addEventListener("click", showSafety);

  // ---- sending ----
  const markRead = () => {
    if (!document.hidden) socket.send({ type: "read", with: peer });
  };

  function stopTyping() {
    if (iAmTyping) socket.send({ type: "typing", to: peer, on: false });
    iAmTyping = false;
    clearTimeout(typingTimer);
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    if (!socket.isOpen()) return toast("Not connected right now, reconnecting…", { kind: "error" });
    if (Date.now() - peerPubAt > 60000 && !(await refreshPeerKey())) return;
    if (blocked) return;
    const cid = crypto.randomUUID();
    const m = { id: null, cid, from: me, to: peer, text, at: new Date().toISOString(), state: "sending" };
    try {
      const { iv, ct } = await encryptText(await sharedKeyFor(peerPub), text, aad(me, peer));
      all.push(m);
      addBubbleOnly(m);
      pending.set(cid, m);
      socket.send({ type: "msg", to: peer, cid, iv, ct, spub: state.myPub, rpub: peerPub });
      input.value = "";
      lenEl.textContent = "";
      stopTyping();
    } catch {
      toast("couldn't encrypt that message", { kind: "error" });
    }
  }

  const pending = new Map();
  function addBubbleOnly(m) {
    const last = all[all.length - 2];
    const frag = document.createDocumentFragment();
    if (!last || dayKey(last.at) !== dayKey(m.at)) frag.append(h("div", { class: "day-sep" }, h("span", {}, fmtDay(m.at))));
    log.querySelector(".empty")?.remove();
    frag.append(bubble(m));
    log.append(frag);
    scrollDown(true);
  }

  const lenEl = chatBox.querySelector("#len");
  input.addEventListener("input", () => {
    lenEl.textContent = input.value.length > MAX_LEN - 200 ? `${input.value.length}/${MAX_LEN}` : "";
    if (!input.value) return stopTyping();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 3500);
    if (Date.now() - lastTypingSent > 2500) {
      lastTypingSent = Date.now();
      iAmTyping = true;
      socket.send({ type: "typing", to: peer, on: true });
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener("click", send);

  // ---- live events ----
  ctx.cleanup(listen("msg", async (d) => {
    if (d.from !== peer && d.to !== peer) return;
    const m = await open({ ...d, at: d.at, state: "ok" });
    addLive(m);
    if (d.from === peer) {
      typingEl.hidden = true;
      markRead();
    }
  }));
  ctx.cleanup(listen("ws-sent", async (d) => {
    const m = pending.get(d.cid);
    if (!m) return;
    pending.delete(d.cid);
    Object.assign(m, { id: d.id, at: d.at, delivered_at: d.delivered_at, state: "ok" });
    redrawBubble(m);
  }));
  ctx.cleanup(listen("ws-error", (d) => {
    const m = d.cid && pending.get(d.cid);
    if (m) {
      pending.delete(d.cid);
      Object.assign(m, { state: "failed", error: d.error });
      redrawBubble(m);
    } else toast(d.error || "something went wrong", { kind: "error" });
  }));
  ctx.cleanup(listen("ws-delivered", (d) => {
    if (d.to !== peer) return;
    for (const m of all) if (d.ids.includes(m.id)) m.delivered_at = m.delivered_at || d.at;
    drawAll();
  }));
  ctx.cleanup(listen("ws-read", (d) => {
    if (d.by !== peer) return;
    for (const m of all) if (d.ids.includes(m.id)) { m.read_at = d.at; m.delivered_at = m.delivered_at || d.at; }
    drawAll();
  }));
  ctx.cleanup(listen("ws-typing", (d) => {
    if (d.from !== peer) return;
    typingEl.hidden = !d.on;
    typingEl.querySelector(".typing-who").textContent = `${friend.display_name} is typing…`;
    clearTimeout(typingEl._t);
    if (d.on) typingEl._t = setTimeout(() => (typingEl.hidden = true), 5000);
    scrollDown(false);
  }));
  ctx.cleanup(listen("conn", (d) => {
    if (!d.open) showBanner("Connection lost. Trying to get back online…");
    else if (!blocked) { showBanner(""); markRead(); }
    input.disabled = blocked || !d.open;
    sendBtn.disabled = input.disabled;
  }));
  const onVisible = () => { if (!document.hidden) markRead(); };
  document.addEventListener("visibilitychange", onVisible);
  ctx.cleanup(() => { document.removeEventListener("visibilitychange", onVisible); stopTyping(); state.activeChat = null; });
  log.addEventListener("scroll", () => nearBottom() && (newChip.hidden = true));

  // ---- go ----
  async function start() {
    const keyOk = await refreshPeerKey();
    const history = await loadHistory();
    all.length = 0;
    all.push(...history);
    drawAll();
    scrollDown(true);
    state.activeChat = peer;
    if (state.unread[peer]) { delete state.unread[peer]; emit("unread"); }
    markRead();
    if (keyOk) input.focus();
  }
  await start();
  setUsable(!blocked);
}
