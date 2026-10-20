#!/usr/bin/env node
// `shellquest` command: serves the built game and opens it in your browser.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer, listen } from "./server.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "dist");
const pkg = JSON.parse(fs.readFileSync(path.resolve(here, "..", "package.json"), "utf8"));

const HELP = `ShellQuest ${pkg.version}
Learn the Linux command line by solving puzzles in a browser terminal.

Usage: shellquest [options]

Options:
  -p, --port <n>    port to listen on (default 4173, next free one if taken)
      --host <ip>   address to bind (default 127.0.0.1)
      --no-open     do not open a browser window
  -v, --version     print the version
  -h, --help        show this help
`;

function parseArgs(argv) {
  const opts = { port: 4173, host: "127.0.0.1", open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "-v" || a === "--version") return { version: true };
    else if (a === "--no-open") opts.open = false;
    else if (a === "-p" || a === "--port") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("port must be 1-65535");
      opts.port = n;
    } else if (a.startsWith("--port=")) {
      const n = Number(a.slice(7));
      if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("port must be 1-65535");
      opts.port = n;
    } else if (a === "--host") opts.host = value();
    else throw new Error(`unknown option: ${a}`);
  }
  return opts;
}

function openBrowser(url) {
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(opener, args, { stdio: "ignore", detached: true });
    child.on("error", () => {}); // no xdg-open installed: the printed URL is enough
    child.unref();
  } catch {
    /* ignore */
  }
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`shellquest: ${e.message}\n`);
    console.error(HELP);
    process.exit(2);
  }
  if (opts.help) return void process.stdout.write(HELP);
  if (opts.version) return void console.log(pkg.version);

  if (!fs.existsSync(path.join(root, "index.html"))) {
    console.error("shellquest: no build found. Run `npm run build` first (or install the package).");
    process.exit(1);
  }

  const server = createServer(root);
  const port = await listen(server, opts.host, opts.port);
  const url = `http://${opts.host === "0.0.0.0" ? "localhost" : opts.host}:${port}/`;
  console.log(`ShellQuest is running at ${url}\nPress Ctrl+C to stop.`);
  if (opts.open) openBrowser(url);

  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(`shellquest: ${e.message}`);
  process.exit(1);
});
