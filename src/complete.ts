// Tab completion for the prompt: command names first, file and folder names everywhere else.
import { FS } from "./vfs";
import { commands } from "./commands";

/** Everything you can type as the first word: shell commands plus the game's own. */
export const commandNames = (): string[] =>
  [...Object.keys(commands), "help", "hint", "level", "share", "reset", "clear"].sort();

export interface Completion { line: string; options: string[] }

const commonPrefix = (words: string[]): string =>
  words.reduce((p, w) => { let i = 0; while (i < p.length && p[i] === w[i]) i++; return p.slice(0, i); });

/** Is the word being typed the first word of a command (start of line, or after | && ; $( )? */
const atCommandStart = (before: string): boolean => /(^|\||&&|;|\$\()\s*$/.test(before);

export function complete(buf: string, fs: FS, cwd: string, names: string[] = commandNames()): Completion {
  const start = Math.max(buf.lastIndexOf(" "), buf.lastIndexOf("\t")) + 1;
  const before = buf.slice(0, start);
  const token = buf.slice(start);
  const none: Completion = { line: buf, options: [] };
  if (/["'$`]/.test(token)) return none; // quotes and variables: leave them alone

  let matches: { text: string; dir: boolean }[];
  let head = "";
  if (atCommandStart(before) && !token.includes("/")) {
    matches = names.filter((n) => n.startsWith(token)).map((n) => ({ text: n, dir: false }));
  } else {
    const slash = token.lastIndexOf("/");
    head = token.slice(0, slash + 1);
    const part = token.slice(slash + 1);
    const dir = fs.get(head || ".", cwd);
    if (!dir || dir.type !== "dir") return none;
    matches = Object.values(dir.children)
      .filter((n) => n.name.startsWith(part) && (!n.name.startsWith(".") || part.startsWith(".")))
      .map((n) => ({ text: n.name, dir: n.type === "dir" }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }
  if (!matches.length) return none;

  if (matches.length === 1) {
    const m = matches[0];
    return { line: before + head + m.text + (m.dir ? "/" : " "), options: [m.text + (m.dir ? "/" : "")] };
  }
  const prefix = commonPrefix(matches.map((m) => m.text));
  return { line: before + head + prefix, options: matches.map((m) => m.text + (m.dir ? "/" : "")) };
}
