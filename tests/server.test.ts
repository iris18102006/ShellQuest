import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { createServer, listen, resolveRequest } from "../bin/server.mjs";

let root: string;
let server: Server;
let base: string;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sq-"));
  fs.mkdirSync(path.join(root, "assets"));
  fs.writeFileSync(path.join(root, "index.html"), "<h1>home</h1>");
  fs.writeFileSync(path.join(root, "assets", "app.js"), "console.log(1)");
  fs.writeFileSync(path.join(path.dirname(root), "sq-secret.txt"), "secret");
  server = createServer(root);
  const port = await listen(server, "127.0.0.1", 0);
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(path.join(path.dirname(root), "sq-secret.txt"), { force: true });
});

describe("static server", () => {
  it("serves index.html at /", async () => {
    const r = await fetch(base + "/");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(await r.text()).toContain("home");
  });

  it("serves assets with the right mime type", async () => {
    const r = await fetch(base + "/assets/app.js");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/javascript");
  });

  it("returns 404 for missing files", async () => {
    expect((await fetch(base + "/nope.txt")).status).toBe(404);
  });

  it("rejects non-GET methods", async () => {
    expect((await fetch(base + "/", { method: "POST" })).status).toBe(405);
  });
});

describe("resolveRequest", () => {
  const safe = (p: string | null) => p === null || p === root || p.startsWith(root + path.sep);

  it("maps normal paths into the root", () => {
    expect(resolveRequest(root, "/assets/app.js")).toBe(path.join(root, "assets", "app.js"));
  });

  it("never resolves outside the root", () => {
    // plain ".." is collapsed by URL parsing (stays inside root); encoded slashes are rejected (null)
    for (const u of ["/../sq-secret.txt", "/%2e%2e/sq-secret.txt", "/a/%2e%2e/%2e%2e/x", "/..%2f..%2fetc/passwd"]) {
      expect(safe(resolveRequest(root, u))).toBe(true);
    }
  });

  it("rejects encoded-slash traversal outright", () => {
    expect(resolveRequest(root, "/..%2f..%2fetc/passwd")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(resolveRequest(root, "/bad%00")).toBeNull();
    expect(resolveRequest(root, "/%E0%A4%A")).toBeNull();
  });

  it("does not leak files from the parent directory over HTTP", async () => {
    const r = await fetch(base + "/%2e%2e/sq-secret.txt");
    expect(r.status).toBe(404);
  });
});
