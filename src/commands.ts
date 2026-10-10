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
    const { n, files } = countArg(args, 10);
    const { texts, err } = readInputs(ctx, files, stdin, "tail");
    return { out: nl(texts.flatMap((t) => lines(t.text).slice(-n))), err };
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
    const { flags, rest } = split(args);
    const { texts, err } = readInputs(ctx, rest, stdin, "sort");
    let ls = texts.flatMap((t) => lines(t.text));
    if (flags.has("n")) ls.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    else ls.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
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
    const [pattern, ...files] = rest;
    if (pattern === undefined) return fail("usage: grep [-ivcn] PATTERN [FILE...]");
    let re: RegExp;
    try { re = new RegExp(pattern, flags.has("i") ? "i" : ""); }
    catch { return fail(`grep: invalid pattern '${pattern}'`); }
    const { texts, err } = readInputs(ctx, files, stdin, "grep");
    const multi = texts.length > 1;
    const out: string[] = [];
    let count = 0;
    for (const t of texts) {
      lines(t.text).forEach((line, i) => {
        if (re.test(line) === flags.has("v")) return;
        count++;
        out.push((multi ? t.name + ":" : "") + (flags.has("n") ? `${i + 1}:` : "") + line);
      });
    }
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
    const { rest } = split(args);
    if (rest.length !== 2) return fail("usage: cp SOURCE DEST");
    const [src, dst] = rest;
    const node = ctx.fs.get(src, ctx.cwd);
    if (!node) return fail(`cp: cannot stat '${src}': No such file or directory`);
    if (node.type === "dir") return fail(`cp: -r not specified; omitting directory '${src}'`);
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
