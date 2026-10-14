import { commands, can, type Ctx } from "./commands";
import { parse, splitChain, ParseError, type Cmd } from "./parser";
import { FS } from "./vfs";
import { helpFor } from "./help";

export interface RunResult { out: string; err: string }

export class Shell implements Ctx {
  /** Shell variables: NAME=value sets one, $NAME reads it. */
  vars: Record<string, string>;

  constructor(public fs: FS, public cwd = "/home/user", public user = "user") {
    this.vars = { USER: user, HOME: `/home/${user}` };
  }

  setCwd(p: string) { this.cwd = p; }

  prompt(): string {
    const home = `/home/${this.user}`;
    const shown = this.cwd === home ? "~" : this.cwd.startsWith(home + "/") ? "~" + this.cwd.slice(home.length) : this.cwd;
    return `${this.user}@shellquest:${shown}$ `;
  }

  /** Expand * and ? in unquoted args against the filesystem. */
  private expand(cmd: Cmd): string[] {
    const out: string[] = [cmd.argv[0]];
    cmd.argv.slice(1).forEach((arg, i) => {
      if (!cmd.raw[i + 1] || !/[*?]/.test(arg)) return void out.push(arg);
      const slash = arg.lastIndexOf("/");
      const dirPart = slash >= 0 ? arg.slice(0, slash + 1) : "";
      const filePart = arg.slice(slash + 1);
      const dir = this.fs.get(dirPart || ".", this.cwd);
      const re = new RegExp("^" + filePart.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
      const hits = dir?.type === "dir"
        ? Object.keys(dir.children).filter((n) => re.test(n) && (!n.startsWith(".") || filePart.startsWith("."))).sort()
        : [];
      out.push(...(hits.length ? hits.map((h) => dirPart + h) : [arg]));
    });
    return out;
  }

  /** Runs a whole line: pipelines joined by `&&` (stop on failure) or `;` (always continue). */
  run(line: string): RunResult {
    let parts: ReturnType<typeof splitChain>;
    try { parts = splitChain(line); }
    catch (e) { return { out: "", err: `shell: ${(e as ParseError).message}\n` }; }
    let out = "";
    let err = "";
    let lastFailed = false;
    for (const part of parts) {
      if (part.before === "&&" && lastFailed) continue;
      const r = this.runPipeline(part.text);
      out += r.out;
      err += r.err;
      lastFailed = r.err !== "";
    }
    return { out, err };
  }

  private runPipeline(line: string): RunResult {
    let pipeline: Cmd[];
    const subErrs: string[] = [];
    const sub = (inner: string) => {
      const r = this.run(inner);
      if (r.err) subErrs.push(r.err.replace(/\n$/, ""));
      return r.out;
    };
    try { pipeline = parse(line, this.vars, sub); }
    catch (e) { return { out: "", err: `shell: ${(e as ParseError).message}\n` }; }

    // NAME=value on its own is an assignment, not a command.
    const assign = pipeline.length === 1 && pipeline[0].argv.length === 1 && !pipeline[0].redirect && !pipeline[0].input
      ? /^([A-Za-z_]\w*)=([\s\S]*)$/.exec(pipeline[0].argv[0]) : null;
    if (assign) {
      this.vars[assign[1]] = assign[2];
      return { out: "", err: "" };
    }

    let stdin: string | null = null;
    const errs: string[] = [...subErrs];
    let out = "";

    for (const cmd of pipeline) {
      if (cmd.input) {
        const n = this.fs.get(cmd.input, this.cwd);
        if (!n || n.type !== "file") { errs.push(`shell: ${cmd.input}: No such file or directory`); out = ""; stdin = ""; continue; }
        if (!can(n, 4, this.user)) { errs.push(`shell: ${cmd.input}: Permission denied`); out = ""; stdin = ""; continue; }
        stdin = n.content;
      }
      const argv = this.expand(cmd);
      const name = argv[0];
      let res: { out: string; err?: string };

      if (argv.length === 2 && argv[1] === "--help" && commands[name] && helpFor(name)) res = { out: helpFor(name)! };
      else if (name.includes("/")) res = this.execFile(name, argv.slice(1));
      else if (commands[name]) res = commands[name](this, argv.slice(1), stdin);
      else res = { out: "", err: `${name}: command not found` };

      if (res.err) errs.push(res.err);
      out = res.out;
      if (cmd.redirect) {
        const { path, append } = cmd.redirect;
        const prev = this.fs.get(path, this.cwd);
        const base = append && prev?.type === "file" ? prev.content : "";
        if (!this.fs.writeFile(path, base + out, { cwd: this.cwd, owner: this.user })) errs.push(`shell: ${path}: cannot write`);
        out = "";
      }
      stdin = out;
    }
    return { out, err: errs.map((e) => e + "\n").join("") };
  }

  /** ./script.sh [args] — runs only if the file has the execute bit. */
  private execFile(path: string, args: string[]): { out: string; err?: string } {
    const n = this.fs.get(path, this.cwd);
    if (!n) return { out: "", err: `${path}: No such file or directory` };
    if (n.type === "dir") return { out: "", err: `${path}: Is a directory` };
    if (!can(n, 1, this.user)) return { out: "", err: `${path}: Permission denied` };
    return this.runScript(path, args);
  }

  private depth = 0;

  /** Runs a script line by line. Arguments become $1, $2 ... and $#. Used by ./file, sh and bash. */
  runScript(path: string, args: string[]): { out: string; err?: string } {
    const n = this.fs.get(path, this.cwd);
    if (!n) return { out: "", err: `${path}: No such file or directory` };
    if (n.type === "dir") return { out: "", err: `${path}: Is a directory` };
    if (!can(n, 4, this.user)) return { out: "", err: `${path}: Permission denied` };
    // Level files can ship a fixed output instead of real script lines.
    if (n.exec !== undefined) return { out: n.exec ? n.exec.replace(/\n?$/, "\n") : "" };
    if (this.depth >= 10) return { out: "", err: `${path}: too many nested scripts` };

    const keys = ["#", "@", ...Array.from({ length: 9 }, (_, i) => String(i + 1))];
    const saved = Object.fromEntries(keys.map((k) => [k, this.vars[k]]));
    for (let i = 0; i < 9; i++) this.vars[String(i + 1)] = args[i] ?? "";
    this.vars["#"] = String(args.length);
    this.vars["@"] = args.join(" ");

    const res = { out: "", err: "" };
    this.depth++;
    try { this.execLines(n.content.split("\n"), res); }
    finally {
      this.depth--;
      for (const k of keys) { if (saved[k] === undefined) delete this.vars[k]; else this.vars[k] = saved[k]; }
    }
    return { out: res.out, err: res.err.replace(/\n$/, "") || undefined };
  }

  /** Runs script lines. Understands comments, the #! line and for-loops (one line or several). */
  private execLines(lines: string[], res: { out: string; err: string }) {
    const runLine = (text: string) => { const r = this.run(text); res.out += r.out; res.err += r.err; };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      const oneLiner = /^for\s+(\w+)\s+in\s+(.*?)\s*;\s*do\s+(.*?)\s*;?\s*done$/.exec(line);
      const header = /^for\s+(\w+)\s+in\s+(.*?)\s*(;\s*do)?$/.exec(line);
      if (!oneLiner && !header) { runLine(line); continue; }

      let body: string[];
      if (oneLiner) body = [oneLiner[3]];
      else {
        let j = i + 1;
        if (!header![3]) { if (lines[j]?.trim() === "do") j++; else { res.err += "shell: syntax error: expected 'do'\n"; return; } }
        const start = j;
        let depth = 1;
        for (; j < lines.length; j++) {
          const t = lines[j].trim();
          if (/^for\s/.test(t) && !/done$/.test(t)) depth++;
          else if (t === "done" && --depth === 0) break;
        }
        if (j >= lines.length) { res.err += "shell: syntax error: unexpected end of file (missing 'done')\n"; return; }
        body = lines.slice(start, j);
        i = j;
      }
      const [, name, list] = (oneLiner ?? header)!;
      const items = this.run(`echo ${list}`).out.trim().split(/\s+/).filter(Boolean);
      for (const item of items) {
        this.vars[name] = item;
        this.execLines(body, res);
      }
    }
  }
}
