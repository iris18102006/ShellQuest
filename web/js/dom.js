// tiny DOM helpers. Everything user-written goes in as text nodes, never as HTML.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  add(el, kids);
  return el;
}

function add(el, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

// ---------- people pictures ----------

const SILHOUETTE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#d9d9d9"/><circle cx="50" cy="38" r="17" fill="#a8a8a8"/>
<path d="M14 100c0-24 15-38 36-38s36 14 36 38z" fill="#a8a8a8"/>
<text x="50" y="94" font-family="Verdana,sans-serif" font-size="9" text-anchor="middle" fill="#fff">no pic</text></svg>`;
export const DEFAULT_AVATAR = "data:image/svg+xml," + encodeURIComponent(SILHOUETTE);

export function avatar(username, version = 0, cls = "ava") {
  const img = h("img", {
    class: cls,
    alt: "",
    loading: "lazy",
    src: version ? `/api/avatar/${encodeURIComponent(username)}?v=${version}` : DEFAULT_AVATAR,
  });
  img.addEventListener(
    "error",
    () => {
      img.onerror = null;
      img.src = DEFAULT_AVATAR;
    },
    { once: true }
  );
  return img;
}

// ---------- time ----------

export function parseTime(s) {
  if (!s) return null;
  const iso = /Z|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

export function fmtClock(s) {
  const d = parseTime(s);
  return d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

export function fmtDate(s) {
  const d = parseTime(s);
  return d ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";
}

export function dayKey(s) {
  const d = parseTime(s);
  return d ? d.toDateString() : "";
}

export function fmtDay(s) {
  const d = parseTime(s);
  if (!d) return "";
  const today = new Date();
  const yest = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return fmtDate(s);
}

export function timeAgo(s) {
  const d = parseTime(s);
  if (!d) return "a while ago";
  const sec = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (sec < 45) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} hr ago`;
  if (sec < 86400 * 7) return `${Math.round(sec / 86400)} day${sec >= 86400 * 1.5 ? "s" : ""} ago`;
  return fmtDate(s);
}

export function statusText(online, lastSeen) {
  if (online) return "Online now!";
  return lastSeen ? `Last seen ${timeAgo(lastSeen)}` : "Offline";
}

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

// ---------- balloons + dialogs ----------

function toastHost() {
  let host = document.getElementById("toasts");
  if (!host) {
    host = h("div", { id: "toasts", "aria-live": "polite" });
    document.body.append(host);
  }
  return host;
}

export function toast(message, { kind = "info", onclick, ms = 4500 } = {}) {
  const icon = { info: "💬", ok: "✅", error: "⚠️" }[kind] || "💬";
  const el = h("div", { class: `toast ${kind}`, role: "status" }, h("span", { class: "toast-icon" }, icon), h("span", {}, message));
  const close = () => el.remove();
  el.addEventListener("click", () => {
    if (onclick) onclick();
    close();
  });
  toastHost().append(el);
  setTimeout(close, ms);
}

export function dialog({ title, icon = "ℹ️", body, buttons = [{ label: "OK", value: true, primary: true }] }) {
  return new Promise((resolve) => {
    const finish = (value) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") finish(false);
    };
    const btns = buttons.map((b) =>
      h("button", { class: "xp-btn" + (b.primary ? " primary" : ""), onclick: () => finish(b.value) }, b.label)
    );
    const overlay = h(
      "div",
      { class: "overlay", onclick: (e) => e.target === overlay && finish(false) },
      h(
        "div",
        { class: "win dialog", role: "dialog", "aria-modal": "true", "aria-label": title },
        h("div", { class: "titlebar" }, h("span", { class: "tb-title" }, title), h("button", { class: "tb-btn close", "aria-label": "Close", onclick: () => finish(false) }, "x")),
        h("div", { class: "dialog-body" }, h("span", { class: "dialog-icon" }, icon), h("div", { class: "dialog-text" }, body)),
        h("div", { class: "dialog-buttons" }, btns)
      )
    );
    document.addEventListener("keydown", onKey);
    document.body.append(overlay);
    (btns.find((b) => b.classList.contains("primary")) || btns[0]).focus();
  });
}

export const confirmBox = (title, message, yes = "Yes", no = "Cancel") =>
  dialog({ title, icon: "⚠️", body: message, buttons: [{ label: yes, value: true, primary: true }, { label: no, value: false }] });

// ---------- sounds ----------

let audio;
export function beep() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.12);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.13);
    });
  } catch {
    /* no sound is fine */
  }
}

export const MOODS = [
  "😎 chillin'", "😊 happy", "😍 in love", "🤩 pumped", "😴 sleepy", "🥱 bored", "😢 sad", "😡 mad",
  "🤔 thinking", "🎧 in my headphones", "💻 coding", "📚 studying", "🎮 gaming", "🌙 up too late", "☕ caffeinated", "🖤 dramatic",
];
