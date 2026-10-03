import { describe, it, expect } from "vitest";
import { FS } from "../src/vfs";
import { Shell } from "../src/shell";
import { Game } from "../src/game";
import { parse } from "../src/parser";

const sh = (spec = {}) => new Shell(FS.from(spec));

describe("parser", () => {
  it("splits pipes, quotes and redirects", () => {
    const p = parse(`grep "a b" f.txt | wc -l > out`);
    expect(p).toHaveLength(2);
    expect(p[0].argv).toEqual(["grep", "a b", "f.txt"]);
    expect(p[1].redirect).toEqual({ path: "out", append: false });
  });
  it("rejects dangling pipe", () => expect(() => parse("ls |")).toThrow());
});

describe("shell", () => {
  it("pipes grep into wc", () => {
    const s = sh({ "/home/user/a.txt": "x\ny\nx\n" });
    expect(s.run("cat a.txt | grep x | wc -l").out).toBe("2\n");
  });
  it("sort | uniq -c | sort -rn | head -n 1", () => {
    const s = sh({ "/home/user/a.txt": "b\na\nb\nb\n" });
    expect(s.run("sort a.txt | uniq -c | sort -rn | head -n 1").out.trim()).toBe("3 b");
  });
  it("hides dotfiles unless -a", () => {
    const s = sh({ "/home/user/.h": "1", "/home/user/v": "2" });
    expect(s.run("ls").out).toBe("v\n");
    expect(s.run("ls -a").out).toContain(".h");
  });
  it("blocks execution until chmod +x", () => {
    const s = sh({ "/home/user/r.sh": { content: "", exec: "hi", mode: 0o644 } });
    expect(s.run("./r.sh").err).toContain("Permission denied");
    s.run("chmod +x r.sh");
    expect(s.run("./r.sh").out).toBe("hi\n");
  });
  it("redirects write files", () => {
    const s = sh();
    s.run("echo hello > note.txt");
    s.run("echo again >> note.txt");
    expect(s.run("cat note.txt").out).toBe("hello\nagain\n");
  });
  it("expands globs only when unquoted", () => {
    const s = sh({ "/home/user/a.log": "1\n", "/home/user/b.log": "2\n" });
    expect(s.run("cat *.log").out).toBe("1\n2\n");
    expect(s.run(`find . -name "*.log"`).out).toBe("./a.log\n./b.log\n");
  });
});

describe("levels are solvable", () => {
  const solve = (steps: string[][]) => {
    const g = new Game(0);
    steps.forEach((cmds, i) => {
      cmds.forEach((c, j) => {
        const t = g.input(c);
        const last = j === cmds.length - 1;
        expect(t.levelChanged === true, `level ${i + 1} cmd "${c}"`).toBe(last);
      });
    });
    expect(g.finished).toBe(true);
  };
  it("full playthrough", () =>
    solve([
      ["ls", "ls -a", "cat .hidden_note"],
      ["grep CRITICAL server.log"],
      ["sort visitors.txt | uniq -c | sort -rn | head -n 1"],
      ["./run.sh", "chmod +x run.sh", "./run.sh"],
      ["find /srv -name master.key", "cat /srv/backups/2025/archive/deep/master.key"],
    ]));
});
