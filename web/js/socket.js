// one websocket, reconnects by itself, other files subscribe with on("type", fn)
const handlers = new Map();
let ws = null;
let retry = 1000;
let pingTimer = null;
let wanted = false;

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type).delete(fn);
}

function emit(type, data) {
  for (const fn of handlers.get(type) || []) fn(data);
}

export const isOpen = () => !!ws && ws.readyState === WebSocket.OPEN;

export function send(obj) {
  if (!isOpen()) return false;
  ws.send(JSON.stringify(obj));
  return true;
}

export function connect() {
  wanted = true;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => {
    retry = 1000;
    clearInterval(pingTimer);
    pingTimer = setInterval(() => send({ type: "ping" }), 25000); // keeps "last seen" fresh
    emit("open", {});
  };
  ws.onmessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }
    if (data && data.type) emit(data.type, data);
  };
  ws.onclose = () => {
    clearInterval(pingTimer);
    emit("close", {});
    if (wanted) {
      setTimeout(connect, retry);
      retry = Math.min(retry * 2, 15000);
    }
  };
}

export function disconnect() {
  wanted = false;
  if (ws) ws.close();
}
