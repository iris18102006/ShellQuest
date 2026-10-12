import { FS, modeString, type Node } from "./vfs";

export interface Ctx { fs: FS; cwd: string; user: string; setCwd(p: string): void }
export interface Result { out: string; err?: string }
export type Command = (ctx: Ctx, args: string[], stdin: string | null) => Result;

const ok = (out = ""): Result => ({ out });
const fail = (err: string): Result => ({ out: "", err });

export const lines = (t: string): string[] => (t === "" ? [] : t.replace(/\n$/, "").split("\n"));
const nl = (ls: string[]): string => (ls.length ? ls.join("\n") + "\n" : "");

/** Does `user` have permission bit (4=r, 2=w, 1=x) on node? */
export function can(node: Node, bit: number, user: string): boolean {
  const shift = node.owner === user ? 6 : 0;
  return ((node.mode >> shift) & bit) !== 0;
}

/** Split args into flags (-abc) and operands. */
function split(args: string[]): { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const a of args) {
    if (/^-[a-zA-Z]+$/.test(a)) for (const c of a.slice(1)) flags.add(c);
    else rest.push(a);
  }
  return { flags, rest };
}

/** Read text from files or stdin, shared by grep/head/tail/wc/sort/uniq/cat. */
function readInputs(ctx: Ctx, files: string[], stdin: string | null, cmd: string):
  { texts: { name: string; text: string }[]; err?: string } {
  if (!files.length) return { texts: [{ name: "-", text: stdin ?? "" }] };
  const texts: { name: string; text: string }[] = [];
  const errs: string[] = [];
  for (const f of files) {
    const n = ctx.fs.get(f, ctx.cwd);
    if (!n) errs.push(`${cmd}: ${f}: No such file or directory`);
    else if (n.type === "dir") errs.push(`${cmd}: ${f}: Is a directory`);
    else if (!can(n, 4, ctx.user)) errs.push(`${cmd}: ${f}: Permission denied`);
    else texts.push({ name: f, text: n.content });
  }
  return { texts, err: errs.length ? errs.join("\n") : undefined };
}

function globToRegex(g: string): RegExp {
  const esc = g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${esc}$`);
}

// ---------- chmod ----------
function applyChmod(mode: number, spec: string): number | null {
  if (/^[0-7]{3}$/.test(spec)) return parseInt(spec, 8);
  const m = /^([ugoa]*)([+\-=])([rwx]+)$/.exec(spec);
  if (!m) return null;
  const who = m[1] || "a";
  const perm = [...m[3]].reduce((n, c) => n | (c === "r" ? 4 : c === "w" ? 2 : 1), 0);
  let next = mode;
  for (const [ch, shift] of [["u", 6], ["g", 3], ["o", 0]] as const) {
    if (!who.includes(ch) && !who.includes("a")) continue;
    if (m[2] === "+") next |= perm << shift;
    else if (m[2] === "-") next &= ~(perm << shift);
    else next = (next & ~(7 << shift)) | (perm << shift);
  }
  return next;
}

export const commands: Record<string, Command> = {
  pwd: (ctx) => ok(ctx.cwd + "\n"),
  whoami: (ctx) => ok(ctx.user + "\n"),
  echo: (_c, args) => ok(args.join(" ") + "\n"),

  ls(ctx, args) {
    const { flags, rest } = split(args);
    const target = rest[0] ?? ".";
    const node = ctx.fs.get(target, ctx.cwd);
    if (!node) return fail(`ls: cannot access '${target}': No such file or directory`);
    const entries: Node[] = node.type === "dir"
      ? Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name))
      : [node];
    const shown = entries.filter((e) => flags.has("a") || !e.name.startsWith("."));
    if (flags.has("l")) {
      return ok(nl(shown.map((e) =>
        `${modeString(e)} ${e.owner.padEnd(5)} ${String(e.type === "file" ? e.content.length : 4096).padStart(5)} ${e.name}${e.type === "dir" ? "/" : ""}`)));
    }
    return ok(shown.length ? shown.map((e) => e.name + (e.type === "dir" ? "/" : "")).join("  ") + "\n" : "");
  },

  cd(ctx, args) {
    const target = args[0] ?? "/home/" + ctx.user;
    const node = ctx.fs.get(target, ctx.cwd);
    if (!node) return fail(`cd: ${target}: No such file or directory`);
    if (node.type !== "dir") return fail(`cd: ${target}: Not a directory`);
    if (!can(node, 1, ctx.user)) return fail(`cd: ${target}: Permission denied`);
    ctx.setCwd(FS.abs(target, ctx.cwd));
    return ok();
  },

  cat(ctx, args, stdin) {
    const { texts, err } = readInputs(ctx, args, stdin, "cat");
    return { out: texts.map((t) => t.text).join(""), err };
  },

  head(ctx, args, stdin) {
    const { n, files } = countArg(args, 10);
    const { texts, err } = readInputs(ctx, files, stdin, "head");
    return { out: nl(texts.flatMap((t) => lines(t.text).slice(0, n))), err };
  },

  tail(ctx, args, stdin) {
    // tail -n +N means "start at line N", so the first N-1 lines are skipped.
    const from = args.findIndex((a, i) => /^\+\d+$/.test(a) && args[i - 1] === "-n");
    const fromN = from >= 0 ? parseInt(args[from].slice(1), 10) : null;
    const { n, files } = countArg(fromN === null ? args : args.filter((_, i) => i !== from && i !== from - 1), 10);
    const { texts, err } = readInputs(ctx, files, stdin, "tail");
    const pick = (ls: string[]) => (fromN === null ? ls.slice(-n) : ls.slice(Math.max(fromN - 1, 0)));
    return { out: nl(texts.flatMap((t) => pick(lines(t.text)))), err };
  },

  tac(ctx, args, stdin) {
    const { texts, err } = readInputs(ctx, args, stdin, "tac");
    return { out: nl(texts.flatMap((t) => lines(t.text).reverse())), err };
  },

  wc(ctx, args, stdin) {
    const { flags, rest } = split(args);
    const { texts, err } = readInputs(ctx, rest, stdin, "wc");
    const rows = texts.map((t) => {
      const l = lines(t.text).length;
      const w = t.text.split(/\s+/).filter(Boolean).length;
      const c = t.text.length;
      const nums = flags.has("l") ? [l] : flags.has("w") ? [w] : flags.has("c") ? [c] : [l, w, c];
      return nums.join(" ") + (t.name === "-" ? "" : " " + t.name);
    });
    return { out: nl(rows), err };
  },

  sort(ctx, args, stdin) {
    const flags = new Set<string>();
    const files: string[] = [];
    let sep: string | null = null;
    let key: { from: number; to: number | null } | null = null;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "-t") sep = args[++i] ?? null;
      else if (a.startsWith("-t") && a.length > 2) sep = a.slice(2);
      else if (a === "-k" || (a.startsWith("-k") && a.length > 2)) {
        const spec = a.length > 2 ? a.slice(2) : args[++i] ?? "";
        const m = /^(\d+)(?:,(\d+))?([a-zA-Z]*)$/.exec(spec);
        if (!m) return fail(`sort: invalid key '${spec}'`);
        key = { from: parseInt(m[1], 10), to: m[2] ? parseInt(m[2], 10) : null };
        for (const c of m[3]) flags.add(c);
      } else if (/^-[a-zA-Z]+$/.test(a)) for (const c of a.slice(1)) flags.add(c);
      else files.push(a);
    }
    const { texts, err } = readInputs(ctx, files, stdin, "sort");
    let ls = texts.flatMap((t) => lines(t.text));
    const keyOf = (l: string): string => {
      if (!key) return l;
      const parts = sep !== null ? l.split(sep) : l.trim().split(/\s+/);
      return parts.slice(key.from - 1, key.to ?? undefined).join(sep ?? " ");
    };
    ls.sort((a, b) => {
      const ka = keyOf(a), kb = keyOf(b);
      let c = flags.has("n") ? (parseFloat(ka) || 0) - (parseFloat(kb) || 0) : ka < kb ? -1 : ka > kb ? 1 : 0;
      if (c === 0 && key) c = a < b ? -1 : a > b ? 1 : 0;
      return c;
    });
    if (flags.has("r")) ls.reverse();
    if (flags.has("u")) ls = ls.filter((l, i) => ls.indexOf(l) === i);
    return { out: nl(ls), err };
  },

  uniq(ctx, args, stdin) {
    const { flags, rest } = split(args);
    const { texts, err } = readInputs(ctx, rest, stdin, "uniq");
    const groups: { line: string; n: number }[] = [];
    for (const l of texts.flatMap((t) => lines(t.text))) {
      const last = groups[groups.length - 1];
      if (last && last.line === l) last.n++;
      else groups.push({ line: l, n: 1 });
    }
    return { out: nl(groups.map((g) => (flags.has("c") ? `${String(g.n).padStart(7)} ${g.line}` : g.line))), err };
  },

  grep(ctx, args, stdin) {
    const { flags, rest } = split(args);
    const [pattern, ...operands] = rest;
    if (pattern === undefined) return fail("usage: grep [-ivcnrlh] PATTERN [FILE...]");
    let re: RegExp;
    try { re = new RegExp(pattern, flags.has("i") ? "i" : ""); }
    catch { return fail(`grep: invalid pattern '${pattern}'`); }
    const recursive = flags.has("r") || flags.has("R");
    const src = recursive
      ? collectFiles(ctx, operands.length ? operands : ["."], "grep")
      : { ...readInputs(ctx, operands, stdin, "grep"), sawDir: false };
    const { texts, err } = src;
    const showName = !flags.has("h") && (texts.length > 1 || (recursive && src.sawDir));
    const out: string[] = [];
    const matched: string[] = [];
    let count = 0;
    for (const t of texts) {
      let hits = 0;
      lines(t.text).forEach((line, i) => {
        if (re.test(line) === flags.has("v")) return;
        hits++;
        count++;
        out.push((showName ? t.name + ":" : "") + (flags.has("n") ? `${i + 1}:` : "") + line);
      });
      if (hits) matched.push(t.name === "-" ? "(standard input)" : t.name);
    }
    if (flags.has("l")) return { out: nl(matched), err };
    return { out: flags.has("c") ? `${count}\n` : nl(out), err };
  },

  find(ctx, args) {
    let start = ".";
    let name: RegExp | null = null;
    let type: string | null = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-name") name = globToRegex(args[++i] ?? "");
      else if (args[i] === "-type") type = args[++i] ?? null;
      else start = args[i];
    }
    const root = ctx.fs.get(start, ctx.cwd);
    if (!root) return fail(`find: '${start}': No such file or directory`);
    const out: string[] = [];
    const walk = (n: Node, path: string) => {
      const typeOk = !type || (type === "d" ? n.type === "dir" : n.type === "file");
      if (typeOk && (!name || name.test(n.name))) out.push(path);
      if (n.type === "dir" && can(n, 1, ctx.user))
        for (const c of Object.values(n.children).sort((a, b) => a.name.localeCompare(b.name)))
          walk(c, (path === "/" ? "" : path) + "/" + c.name);
    };
    walk(root, start === "." || start.startsWith("/") ? (start === "." ? "." : FS.abs(start)) : start);
    return ok(nl(out));
  },

  chmod(ctx, args) {
    const [spec, ...files] = args;
    if (!spec || !files.length) return fail("usage: chmod MODE FILE...");
    for (const f of files) {
      const n = ctx.fs.get(f, ctx.cwd);
      if (!n) return fail(`chmod: cannot access '${f}': No such file or directory`);
      const next = applyChmod(n.mode, spec);
      if (next === null) return fail(`chmod: invalid mode: '${spec}'`);
      n.mode = next;
    }
    return ok();
  },

  mkdir(ctx, args) {
    for (const a of split(args).rest) {
      if (ctx.fs.get(a, ctx.cwd)) return fail(`mkdir: cannot create directory '${a}': File exists`);
      ctx.fs.mkdirp(a, ctx.cwd, ctx.user);
    }
    return ok();
  },

  touch(ctx, args) {
    for (const a of args) if (!ctx.fs.get(a, ctx.cwd)) ctx.fs.writeFile(a, "", { cwd: ctx.cwd, owner: ctx.user });
    return ok();
  },

  rm(ctx, args) {
    for (const a of split(args).rest) {
      const n = ctx.fs.get(a, ctx.cwd);
      if (!n) return fail(`rm: cannot remove '${a}': No such file or directory`);
      if (n.type === "dir" && !split(args).flags.has("r")) return fail(`rm: cannot remove '${a}': Is a directory (use -r)`);
      ctx.fs.remove(a, ctx.cwd);
    }
    return ok();
  },

  mv(ctx, args) {
    const { rest } = split(args);
    if (rest.length !== 2) return fail("usage: mv SOURCE DEST");
    const [src, dst] = rest;
    const node = ctx.fs.get(src, ctx.cwd);
    if (!node) return fail(`mv: cannot stat '${src}': No such file or directory`);
    const dest = destPath(ctx, node.name, dst);
    const segs = FS.segments(dest);
    const name = segs.pop();
    if (!name) return fail(`mv: cannot move '${src}' to '${dst}'`);
    if (dest.startsWith(FS.abs(src, ctx.cwd) + "/")) return fail(`mv: cannot move '${src}' into itself`);
    const parent = ctx.fs.get("/" + segs.join("/"));
    if (!parent || parent.type !== "dir") return fail(`mv: cannot move '${src}' to '${dst}': No such file or directory`);
    ctx.fs.remove(src, ctx.cwd);
    node.name = name;
    parent.children[name] = node;
    return ok();
  },

  cp(ctx, args) {
    const { flags, rest } = split(args);
    if (rest.length !== 2) return fail("usage: cp [-r] SOURCE DEST");
    const [src, dst] = rest;
    const node = ctx.fs.get(src, ctx.cwd);
    if (!node) return fail(`cp: cannot stat '${src}': No such file or directory`);
    if (node.type === "dir") {
      if (!flags.has("r") && !flags.has("R")) return fail(`cp: -r not specified; omitting directory '${src}'`);
      const from = FS.abs(src, ctx.cwd);
      const dest = destPath(ctx, node.name, dst);
      if (dest === from || dest.startsWith(from + "/")) return fail(`cp: cannot copy a directory, '${src}', into itself, '${dst}'`);
      const segs = FS.segments(dest);
      const name = segs.pop();
      const parent = ctx.fs.get("/" + segs.join("/"));
      if (!name || !parent || parent.type !== "dir") return fail(`cp: cannot create directory '${dst}': No such file or directory`);
      if (parent.children[name]?.type === "file") return fail(`cp: cannot overwrite non-directory '${dst}' with directory '${src}'`);
      parent.children[name] = cloneNode(node, name, ctx.user);
      return ok();
    }
    if (!can(node, 4, ctx.user)) return fail(`cp: cannot open '${src}' for reading: Permission denied`);
    const dest = destPath(ctx, node.name, dst);
    const done = ctx.fs.writeFile(dest, node.content, { mode: node.mode, exec: node.exec, owner: ctx.user });
    return done ? ok() : fail(`cp: cannot create regular file '${dst}'`);
  },

  cut(ctx, args, stdin) {
    let delim = "\t";
    let fields: number[] = [];
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a.startsWith("-d")) delim = a.length > 2 ? a.slice(2) : args[++i] ?? delim;
      else if (a.startsWith("-f")) fields = parseFields(a.length > 2 ? a.slice(2) : args[++i] ?? "");
      else files.push(a);
    }
    if (!fields.length) return fail("cut: you must specify a list of fields (-f)");
    const { texts, err } = readInputs(ctx, files, stdin, "cut");
    const out = texts.flatMap((t) => lines(t.text)).map((line) => {
      if (!line.includes(delim)) return line;
      const parts = line.split(delim);
      return fields.filter((f) => f <= parts.length).map((f) => parts[f - 1]).join(delim);
    });
    return { out: nl(out), err };
  },

  tee(ctx, args, stdin) {
    const { flags, rest } = split(args);
    const text = stdin ?? "";
    for (const f of rest) {
      const prev = ctx.fs.get(f, ctx.cwd);
      if (prev?.type === "dir") return { out: text, err: `tee: ${f}: Is a directory` };
      const base = flags.has("a") && prev?.type === "file" ? prev.content : "";
      ctx.fs.writeFile(f, base + text, { cwd: ctx.cwd, owner: ctx.user });
    }
    return ok(text);
  },

  tr(_ctx, args, stdin) {
    const { flags, rest } = split(args);
    const del = flags.has("d");
    const squeeze = flags.has("s");
    const [s1, s2] = rest;
    if (!s1 || (!del && !squeeze && s2 === undefined)) return fail("usage: tr [-ds] SET1 [SET2]");
    if (stdin === null) return fail("tr: needs input (pipe something in, or use < file)");
    const from = expandSet(s1);
    const to = s2 !== undefined ? expandSet(s2) : [];
    const squeezeSet = to.length ? to : from;
    let out = "";
    let last = "";
    for (const ch of stdin) {
      let c = ch;
      const i = from.indexOf(ch);
      if (i >= 0) {
        if (del) continue;
        if (to.length) c = to[Math.min(i, to.length - 1)];
      }
      if (squeeze && squeezeSet.includes(c) && c === last) continue;
      out += c;
      last = c;
    }
    return ok(out);
  },

  sed(ctx, args, stdin) {
    const flags = new Set<string>();
    const rest: string[] = [];
    for (const a of args) {
      if (/^-[a-zA-Z]+$/.test(a)) for (const c of a.slice(1)) flags.add(c);
      else rest.push(a);
    }
    const [script, ...files] = rest;
    if (script === undefined) return fail("usage: sed [-n] [-i] SCRIPT [FILE...]");
    const prog = parseSed(script);
    if (typeof prog === "string") return fail("sed: " + prog);
    if (flags.has("i") && !files.length) return fail("sed: no input files");
    const { texts, err } = readInputs(ctx, files, stdin, "sed");
    if (flags.has("i")) {
      for (const t of texts) ctx.fs.writeFile(t.name, runSed(prog, t.text, flags.has("n")), { cwd: ctx.cwd, owner: ctx.user });
      return { out: "", err };
    }
    return { out: texts.map((t) => runSed(prog, t.text, flags.has("n"))).join(""), err };
  },

  awk(ctx, args, stdin) {
    let sep: string | null = null;
    const rest: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "-F") sep = args[++i] ?? null;
      else if (a.startsWith("-F") && a.length > 2) sep = a.slice(2);
      else rest.push(a);
    }
    const [src, ...files] = rest;
    if (src === undefined) return fail("usage: awk [-F SEP] 'PROGRAM' [FILE...]");
    const prog = parseAwk(src);
    if (typeof prog === "string") return fail("awk: " + prog);
    if (sep === "\\t") sep = "\t";
    const { texts, err } = readInputs(ctx, files, stdin, "awk");
    const out: string[] = [];
    let nr = 0;
    for (const t of texts) {
      for (const line of lines(t.text)) {
        nr++;
        const f = sep !== null ? line.split(sep) : line.trim() === "" ? [] : line.trim().split(/\s+/);
        if (prog.cond(line, f, nr)) out.push(prog.items.map((it) => it(line, f, nr)).join(" "));
      }
    }
    return { out: nl(out), err };
  },
};

/** Where mv/cp should put something: dst itself, or inside dst if dst is a directory. */
function destPath(ctx: Ctx, name: string, dst: string): string {
  const d = ctx.fs.get(dst, ctx.cwd);
  const abs = FS.abs(dst, ctx.cwd);
  return d?.type === "dir" ? `${abs === "/" ? "" : abs}/${name}` : abs;
}

/** "1,3" or "2-4" or "1,3-4" becomes [1,3] / [2,3,4] / [1,3,4]. */
function parseFields(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) return [];
    const from = parseInt(m[1], 10);
    const to = m[2] ? parseInt(m[2], 10) : from;
    for (let n = from; n <= to; n++) out.push(n);
  }
  return out;
}

function countArg(args: string[], dflt: number): { n: number; files: string[] } {
  let n = dflt;
  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-n") n = parseInt(args[++i] ?? "", 10) || dflt;
    else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10);
    else files.push(a);
  }
  return { n, files };
}

/** Walk files and folders for grep -r. Names are the paths as the player typed them. */
function collectFiles(ctx: Ctx, starts: string[], cmd: string):
  { texts: { name: string; text: string }[]; err?: string; sawDir: boolean } {
  const texts: { name: string; text: string }[] = [];
  const errs: string[] = [];
  let sawDir = false;
  const walk = (n: Node, path: string) => {
    if (n.type === "file") {
      if (can(n, 4, ctx.user)) texts.push({ name: path, text: n.content });
      else errs.push(`${cmd}: ${path}: Permission denied`);
      return;
    }
    if (!can(n, 1, ctx.user)) return void errs.push(`${cmd}: ${path}: Permission denied`);
    for (const c of Object.values(n.children).sort((a, b) => a.name.localeCompare(b.name)))
      walk(c, path === "." ? c.name : path.replace(/\/$/, "") + "/" + c.name);
  };
  for (const s of starts) {
    const n = ctx.fs.get(s, ctx.cwd);
    if (!n) errs.push(`${cmd}: ${s}: No such file or directory`);
    else { if (n.type === "dir") sawDir = true; walk(n, s); }
  }
  return { texts, err: errs.length ? errs.join("\n") : undefined, sawDir };
}

/** Deep copy of a file or folder (for cp -r). */
function cloneNode(n: Node, name: string, owner: string): Node {
  if (n.type === "file") return { ...n, name, owner };
  const children: Record<string, Node> = {};
  for (const c of Object.values(n.children)) children[c.name] = cloneNode(c, c.name, owner);
  return { type: "dir", name, mode: n.mode, owner, children };
}

// ---------- tr ----------
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const CLASSES: Record<string, string> = {
  "[:upper:]": UPPER, "[:lower:]": LOWER, "[:alpha:]": UPPER + LOWER, "[:digit:]": "0123456789",
  "[:alnum:]": UPPER + LOWER + "0123456789", "[:space:]": " \t\n", "[:punct:]": "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
};

/** "a-z" -> [a..z], "[:digit:]" -> [0..9], "\n" -> newline. */
function expandSet(spec: string): string[] {
  const out: string[] = [];
  const unescape = (c: string) => (c === "n" ? "\n" : c === "t" ? "\t" : c);
  let i = 0;
  while (i < spec.length) {
    const cls = Object.keys(CLASSES).find((k) => spec.startsWith(k, i));
    if (cls) { out.push(...CLASSES[cls]); i += cls.length; continue; }
    let c = spec[i];
    if (c === "\\" && i + 1 < spec.length) c = unescape(spec[++i]);
    if (spec[i + 1] === "-" && i + 2 < spec.length) {
      let end = spec[i + 2];
      let adv = 3;
      if (end === "\\" && i + 3 < spec.length) { end = unescape(spec[i + 3]); adv = 4; }
      for (let k = c.charCodeAt(0); k <= end.charCodeAt(0); k++) out.push(String.fromCharCode(k));
      i += adv;
      continue;
    }
    out.push(c);
    i++;
  }
  return out;
}

// ---------- sed ----------
type Addr = { n: number } | { last: true } | { re: RegExp };
interface SedProg { a1?: Addr; a2?: Addr; cmd: "d" | "p" | "s"; re?: RegExp; repl?: string; groups?: number }

function findUnescaped(s: string, ch: string, from: number): number {
  for (let i = from; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === ch) return i;
  }
  return -1;
}

function parseAddr(s: string, pos: number): { addr: Addr; end: number } | null {
  if (s[pos] === "$") return { addr: { last: true }, end: pos + 1 };
  const num = /^\d+/.exec(s.slice(pos));
  if (num) return { addr: { n: parseInt(num[0], 10) }, end: pos + num[0].length };
  if (s[pos] === "/") {
    const e = findUnescaped(s, "/", pos + 1);
    if (e < 0) return null;
    return { addr: { re: new RegExp(s.slice(pos + 1, e).split("\\/").join("/")) }, end: e + 1 };
  }
  return null;
}

/** Supports: Nd  N,Md  /re/d  $d  Np  s/a/b/[gi]  (with -n and -i handled by the caller). */
function parseSed(script: string): SedProg | string {
  script = script.trim();
  try {
    let pos = 0;
    const prog: SedProg = { cmd: "p" };
    const first = parseAddr(script, 0);
    if (first) {
      prog.a1 = first.addr;
      pos = first.end;
      if (script[pos] === ",") {
        const second = parseAddr(script, pos + 1);
        if (!second) return "bad address after ','";
        prog.a2 = second.addr;
        pos = second.end;
      }
    }
    const c = script[pos];
    if (c === "d" || c === "p") {
      if (script.slice(pos + 1).trim()) return "extra characters after command";
      prog.cmd = c;
      return prog;
    }
    if (c === "s") {
      const delim = script[pos + 1];
      if (!delim) return "unterminated `s' command";
      const e1 = findUnescaped(script, delim, pos + 2);
      const e2 = e1 < 0 ? -1 : findUnescaped(script, delim, e1 + 1);
      if (e2 < 0) return "unterminated `s' command";
      const unesc = (t: string) => t.split("\\" + delim).join(delim);
      const pat = unesc(script.slice(pos + 2, e1));
      const fl = script.slice(e2 + 1).trim();
      if (!/^[gi]*$/.test(fl)) return "unknown option to `s'";
      prog.cmd = "s";
      prog.re = new RegExp(pat, (fl.includes("g") ? "g" : "") + (fl.includes("i") ? "i" : ""));
      prog.repl = unesc(script.slice(e1 + 1, e2));
      prog.groups = (new RegExp(pat + "|").exec("") as RegExpExecArray).length - 1;
      return prog;
    }
    return `unknown command: '${c ?? ""}'`;
  } catch {
    return "invalid regular expression";
  }
}

function runSed(prog: SedProg, text: string, quiet: boolean): string {
  const ls = lines(text);
  const out: string[] = [];
  let inRange = false;
  const at = (a: Addr, n: number, line: string) => ("n" in a ? a.n === n : "last" in a ? n === ls.length : a.re.test(line));
  ls.forEach((line, idx) => {
    const n = idx + 1;
    let hit: boolean;
    if (!prog.a1) hit = true;
    else if (!prog.a2) hit = at(prog.a1, n, line);
    else if (inRange) {
      hit = true;
      if ("n" in prog.a2 ? n >= prog.a2.n : at(prog.a2, n, line)) inRange = false;
    } else if (at(prog.a1, n, line)) {
      hit = true;
      inRange = !("n" in prog.a2 && prog.a2.n <= n);
    } else hit = false;

    let cur = line;
    let deleted = false;
    if (hit) {
      if (prog.cmd === "d") deleted = true;
      else if (prog.cmd === "p") out.push(line);
      else {
        const repl = prog.repl ?? "";
        const ng = prog.groups ?? 0;
        cur = line.replace(prog.re as RegExp, (m: string, ...r: unknown[]) =>
          repl.replace(/\\([0-9&\\])|&/g, (t, e) => (t === "&" ? m : e === "&" ? "&" : e === "\\" ? "\\" : String(r[+e - 1 < ng ? +e - 1 : 999] ?? ""))));
      }
    }
    if (!deleted && !quiet) out.push(cur);
  });
  return nl(out);
}

// ---------- awk ----------
type Ref = (line: string, f: string[], nr: number) => string;
interface AwkProg { cond: (line: string, f: string[], nr: number) => boolean; items: Ref[] }

function parseRef(src: string): Ref | null {
  const s = src.trim();
  let m: RegExpExecArray | null;
  if (s === "NR") return (_l, _f, nr) => String(nr);
  if (s === "NF") return (_l, f) => String(f.length);
  if (s === "$NF") return (_l, f) => f[f.length - 1] ?? "";
  if ((m = /^\$\(NF\s*-\s*(\d+)\)$/.exec(s))) { const k = parseInt(m[1], 10); return (_l, f) => f[f.length - 1 - k] ?? ""; }
  if ((m = /^\$(\d+)$/.exec(s))) { const n = parseInt(m[1], 10); return (l, f) => (n === 0 ? l : f[n - 1] ?? ""); }
  if ((m = /^"(.*)"$/.exec(s))) { const lit = m[1]; return () => lit; }
  if (/^-?\d+(\.\d+)?$/.test(s)) return () => s;
  return null;
}

function splitItems(s: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let q = false;
  for (const c of s) {
    if (c === '"') q = !q;
    if (c === "," && !q) { parts.push(cur); cur = ""; } else cur += c;
  }
  if (cur.trim() || parts.length) parts.push(cur);
  return parts;
}

const isNum = (s: string) => /^\s*-?\d+(\.\d+)?\s*$/.test(s);

/** Supports: '{print $1, $NF}'  '$3 > 100 {print $1}'  '/re/'  '$2 ~ /re/'  '$1 == "x"' */
function parseAwk(src: string): AwkProg | string {
  const ob = src.indexOf("{");
  const condSrc = (ob < 0 ? src : src.slice(0, ob)).trim();
  let action = "print";
  if (ob >= 0) {
    const cb = src.lastIndexOf("}");
    if (cb < ob) return "syntax error: missing }";
    action = src.slice(ob + 1, cb).trim();
  }
  if (!/^print(\s|$)/.test(action)) return "only 'print' actions are supported";
  const itemSrc = splitItems(action.slice(5).trim());
  const items: Ref[] = [];
  for (const it of itemSrc.length ? itemSrc : ["$0"]) {
    const r = parseRef(it);
    if (!r) return `can't understand '${it.trim()}'`;
    items.push(r);
  }

  let cond: AwkProg["cond"] = () => true;
  let m: RegExpExecArray | null;
  if (!condSrc) {
    // always true
  } else if ((m = /^\/(.*)\/$/.exec(condSrc))) {
    const re = new RegExp(m[1]);
    cond = (l) => re.test(l);
  } else if ((m = /^(\$\([^)]*\)|\$\w+|NR|NF)\s*(!?~)\s*\/(.*)\/$/.exec(condSrc))) {
    const left = parseRef(m[1]);
    if (!left) return `can't understand '${m[1]}'`;
    const re = new RegExp(m[3]);
    const neg = m[2] === "!~";
    cond = (l, f, nr) => re.test(left(l, f, nr)) !== neg;
  } else if ((m = /^(\$\([^)]*\)|\$\w+|NR|NF)\s*(==|!=|>=|<=|>|<)\s*(.+)$/.exec(condSrc))) {
    const left = parseRef(m[1]);
    const right = parseRef(m[3]);
    if (!left || !right) return `can't understand '${condSrc}'`;
    const quoted = /^\s*".*"\s*$/.test(m[3]);
    const op = m[2];
    cond = (l, f, nr) => {
      const a = left(l, f, nr);
      const b = right(l, f, nr);
      const numeric = !quoted && isNum(a) && isNum(b);
      const x: string | number = numeric ? parseFloat(a) : a;
      const y: string | number = numeric ? parseFloat(b) : b;
      return op === "==" ? x === y : op === "!=" ? x !== y : op === ">" ? x > y : op === "<" ? x < y : op === ">=" ? x >= y : x <= y;
    };
  } else return `can't understand condition '${condSrc}'`;
  return { cond, items };
}
