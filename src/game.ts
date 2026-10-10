import { FS } from "./vfs";
import { Shell } from "./shell";
import { levels } from "./levels";

export interface Turn { out: string; err: string; clear?: boolean; levelChanged?: boolean }

const HELP = `Commands: ls [-la] cd pwd cat echo grep [-ivcn] head tail wc sort [-nru] uniq [-c]
          find [-name -type] chmod mkdir touch rm cp mv cut whoami
You can use pipes (|), redirects (> >>), quotes and * globs.
Game: hint  level  reset  clear  help
`;

export class Game {
  level = 0;
  shell!: Shell;

  constructor(start = 0) { this.load(start); }

  get current() { return levels[Math.min(this.level, levels.length - 1)]; }
  get finished() { return this.level >= levels.length; }

  load(i: number) {
    this.level = i;
    const l = this.current;
    this.shell = new Shell(FS.from(l.files), l.cwd ?? "/home/user");
  }

  input(line: string): Turn {
    const cmd = line.trim();
    if (!cmd) return { out: "", err: "" };
    if (cmd === "clear") return { out: "", err: "", clear: true };
    if (cmd === "help") return { out: HELP, err: "" };
    if (cmd === "hint") return { out: this.finished ? "" : `Hint: ${this.current.hint}\n`, err: "" };
    if (cmd === "level") return { out: this.finished ? "You finished everything.\n" : `${this.current.title}\n${this.current.story}\n`, err: "" };
    if (cmd === "reset") { this.load(this.level); return { out: "Level reset.\n", err: "", levelChanged: true }; }
    if (this.finished) return { out: "", err: "Nothing left to solve. Type 'reset' to replay the last level.\n" };

    const res = this.shell.run(cmd);
    const solved = this.current.check({ command: cmd, output: res.out, fs: this.shell.fs, cwd: this.shell.cwd });
    if (!solved) return { ...res };

    const done = this.level + 1 >= levels.length;
    this.load(this.level + 1);
    const banner = done
      ? "\n*** All levels complete. You know your way around a shell now. ***\n"
      : `\n*** Level complete! Next up: ${this.current.title} ***\n`;
    return { out: res.out + banner, err: res.err, levelChanged: true };
  }
}
