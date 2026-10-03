import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./style.css";
import { Game } from "./game";
import { levels } from "./levels";

const KEY = "shellquest.level";
const saved = Number(localStorage.getItem(KEY));
const game = new Game(Number.isFinite(saved) && saved < levels.length ? saved : 0);

const term = new Terminal({
  cursorBlink: true,
  fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, Menlo, monospace',
  fontSize: 15,
  theme: { background: "#17121f", foreground: "#e6def5", cursor: "#ff6fae", selectionBackground: "#4b3a6b" },
});
const fit = new FitAddon();
term.loadAddon(fit);
term.open(document.getElementById("term")!);
fit.fit();
window.addEventListener("resize", () => fit.fit());

const $ = (id: string) => document.getElementById(id)!;
function renderMission() {
  const l = game.current;
  $("level-title").textContent = game.finished ? "All levels complete" : l.title;
  $("level-story").textContent = game.finished ? "Push your own levels in src/levels.ts." : l.story;
  $("level-hint").hidden = true;
}

const write = (s: string) => term.write(s.replace(/\n/g, "\r\n"));
const prompt = () => term.write("\x1b[38;5;213m" + game.shell.prompt() + "\x1b[0m");

let buf = "";
const history: string[] = [];
let hIdx = 0;

function submit() {
  term.write("\r\n");
  const line = buf;
  buf = "";
  if (line.trim()) { history.push(line); }
  hIdx = history.length;

  const turn = game.input(line);
  if (turn.clear) term.clear();
  if (line.trim() === "hint") { $("level-hint").textContent = game.current.hint; $("level-hint").hidden = false; }
  if (turn.out) write(turn.out);
  if (turn.err) write("\x1b[31m" + turn.err + "\x1b[0m");
  if (turn.levelChanged) { localStorage.setItem(KEY, String(game.level)); renderMission(); }
  prompt();
}

function setLine(next: string) {
  term.write("\x1b[2K\r");
  prompt();
  buf = next;
  term.write(buf);
}

term.onData((d) => {
  if (d === "\r") return submit();
  if (d === "\x7f") { if (buf) { buf = buf.slice(0, -1); term.write("\b \b"); } return; }
  if (d === "\x03") { buf = ""; term.write("^C\r\n"); return prompt(); }
  if (d === "\x0c") { term.clear(); return setLine(buf); }
  if (d === "\x1b[A") { if (hIdx > 0) setLine(history[--hIdx]); return; }
  if (d === "\x1b[B") { if (hIdx < history.length) setLine(history[++hIdx] ?? ""); return; }
  if (d >= " " && !d.startsWith("\x1b")) { buf += d; term.write(d); }
});

renderMission();
write("Welcome to ShellQuest. Solve each level using real shell commands.\n");
write("Type 'help' to see what's available.\n\n");
prompt();
term.focus();
