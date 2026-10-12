import { commands, can, type Ctx } from "./commands";
import { parse, splitChain, ParseError, type Cmd } from "./parser";
import { FS } from "./vfs";

export interface RunResult { out: string; err: string }

export class Shell implements Ctx {
  constructor(public fs: FS, public cwd = "/home/user", public user = "user") {}

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
    try { pipeline = parse(line); }
    catch (e) { return { out: "", err: `shell: ${(e as ParseError).message}\n` }; }

    let stdin: string | null = null;
    const errs: string[] = [];
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

      if (name.includes("/")) res = this.execFile(name);
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

  /** ./script.sh — runs only if the file has the execute bit. */
  private execFile(path: string): { out: string; err?: string } {
    const n = this.fs.get(path, this.cwd);
    if (!n) return { out: "", err: `${path}: No such file or directory` };
    if (n.type === "dir") return { out: "", err: `${path}: Is a directory` };
    if (!can(n, 1, this.user)) return { out: "", err: `${path}: Permission denied` };
    return { out: n.exec ? n.exec.replace(/\n?$/, "\n") : "" };
  }
}
