// Tiny static file server for the built game. No dependencies, so it runs
// anywhere Node does (including a fresh Arch install with just `nodejs`).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** Map a request URL to a file inside `root`, or null if it escapes the root. */
export function resolveRequest(root, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
  if (pathname.includes("\0")) return null;
  const target = path.normalize(path.join(root, pathname));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) return null;
  return target;
}

export function createServer(root) {
  const absRoot = path.resolve(root);
  return http.createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    let file = resolveRequest(absRoot, req.url ?? "/");
    if (!file) {
      res.writeHead(400);
      return res.end("Bad request");
    }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    } catch {
      /* fall through to 404 below */
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not found");
      }
      const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": data.length,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    });
  });
}

/** Listen on `port`, moving up one port at a time if it is taken. */
export function listen(server, host, port, attempts = 20) {
  return new Promise((resolve, reject) => {
    const tryPort = (p, left) => {
      const onError = (err) => {
        server.off("listening", onListening);
        if (err.code === "EADDRINUSE" && left > 0) tryPort(p + 1, left - 1);
        else reject(err);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve(server.address().port);
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(p, host);
    };
    tryPort(port, attempts);
  });
}
