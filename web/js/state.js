import { api } from "./api.js";
import { beep, toast } from "./dom.js";
import { exportPub, loadOrCreateIdentity } from "./crypto.js";
import * as socket from "./socket.js";

export const state = {
  me: null,
  identity: null,
  myPub: null,
  friends: [],
  incoming: [],
  outgoing: [],
  online: new Set(),
  lastSeen: {},
  unread: {},
  activeChat: null, // who's chat window is open right now
  sound: localStorage.getItem("cc-sound") !== "off",
};

const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
export function listen(name, fn) {
  const wrapped = (e) => fn(e.detail);
  bus.addEventListener(name, wrapped);
  return () => bus.removeEventListener(name, wrapped);
}

export function setSound(on) {
  state.sound = on;
  localStorage.setItem("cc-sound", on ? "on" : "off");
}

export const unreadTotal = () => Object.values(state.unread).reduce((a, b) => a + b, 0);

export function nameOf(username) {
  const p = [...state.friends, ...state.incoming, ...state.outgoing].find((f) => f.username === username);
  return p ? p.display_name : username;
}

export async function refreshFriends() {
  const data = await api("/api/friends");
  state.friends = data.friends;
  state.incoming = data.incoming;
  state.outgoing = data.outgoing;
  for (const f of data.friends) {
    state.lastSeen[f.username] = f.last_seen;
    if (f.online) state.online.add(f.username);
    else state.online.delete(f.username);
  }
  emit("friends");
}

export async function refreshUnread() {
  const data = await api("/api/unread");
  state.unread = data.by_user;
  emit("unread");
}

export async function refreshMe() {
  state.me = await api("/api/me");
  emit("me");
}

function wireSocket() {
  socket.on("open", () => emit("conn", { open: true }));
  socket.on("close", () => {
    state.online.clear();
    emit("conn", { open: false });
    emit("presence", {});
  });
  socket.on("hello", (d) => {
    state.online = new Set(d.online);
    emit("presence", {});
  });
  socket.on("presence", (d) => {
    if (d.online) state.online.add(d.user);
    else state.online.delete(d.user);
    if (d.last_seen) state.lastSeen[d.user] = d.last_seen;
    emit("presence", d);
  });
  socket.on("friends_changed", async (d) => {
    await refreshFriends();
    const who = d.user;
    if (d.reason === "request") {
      toast(`${nameOf(who)} wants to be your friend!`, { onclick: () => (location.hash = "#/friends") });
    } else if (d.reason === "accepted") {
      toast(`${nameOf(who)} accepted your friend request!`, { kind: "ok", onclick: () => (location.hash = `#/u/${who}`) });
    }
  });
  socket.on("msg", (d) => {
    emit("msg", d);
    if (d.from === state.me.username) return; // my other tab
    const watching = state.activeChat === d.from && !document.hidden;
    if (watching) return; // the chat window takes care of it
    state.unread[d.from] = (state.unread[d.from] || 0) + 1;
    emit("unread");
    if (state.sound) beep();
    toast(`New message from ${nameOf(d.from)} 🔒`, { onclick: () => (location.hash = `#/mail/${d.from}`) });
  });
  for (const type of ["sent", "delivered", "read", "typing", "error"]) socket.on(type, (d) => emit("ws-" + type, d));
  socket.on("read_self", (d) => {
    delete state.unread[d.with];
    emit("unread");
  });
}

export async function boot() {
  await refreshMe();
  state.identity = await loadOrCreateIdentity(state.me.username);
  state.myPub = await exportPub(state.identity.publicKey);
  await api("/api/keys", { method: "PUT", body: { public_key: state.myPub } });
  await Promise.all([refreshFriends(), refreshUnread()]);
  wireSocket();
  socket.connect();
}
