import { describe, it, expect } from "vitest";
import { FS } from "../src/vfs";
import { Shell } from "../src/shell";
import { Game } from "../src/game";
import { parse } from "../src/parser";
import { levels } from "../src/levels";

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

describe("mv, cp, cut", () => {
  it("mv renames and moves into directories", () => {
    const s = sh({ "/home/user/a.txt": "hi\n", "/home/user/dir/keep": "" });
    s.run("mv a.txt b.txt");
    expect(s.run("ls").out).toBe("b.txt  dir/\n");
    s.run("mv b.txt dir");
    expect(s.run("cat dir/b.txt").out).toBe("hi\n");
    expect(s.run("mv nope x").err).toContain("No such file");
  });
  it("mv refuses to move a folder into itself", () => {
    const s = sh({ "/home/user/d/x": "1\n" });
    expect(s.run("mv d d/inner").err).toContain("into itself");
    expect(s.run("cat d/x").out).toBe("1\n");
  });
  it("cp copies and keeps the original", () => {
    const s = sh({ "/home/user/a.txt": "hi\n" });
    s.run("cp a.txt a.bak");
    expect(s.run("cat a.bak").out).toBe("hi\n");
    expect(s.run("cat a.txt").out).toBe("hi\n");
    s.run("mkdir d");
    s.run("cp a.txt d");
    expect(s.run("cat d/a.txt").out).toBe("hi\n");
  });
  it("cp refuses directories", () => {
    const s = sh({ "/home/user/d/x": "1" });
    expect(s.run("cp d e").err).toContain("-r not specified");
  });
  it("cut picks fields", () => {
    const s = sh({ "/home/user/u.csv": "a,1,x\nb,2,y\n" });
    expect(s.run("cut -d, -f1 u.csv").out).toBe("a\nb\n");
    expect(s.run("cut -d , -f 2,3 u.csv").out).toBe("1,x\n2,y\n");
    expect(s.run("cat u.csv | cut -d, -f3").out).toBe("x\ny\n");
  });
});

describe("levels are solvable", () => {
  levels.forEach((lvl, i) => {
    it(`${lvl.title}`, () => {
      const g = new Game(i);
      lvl.solution.forEach((c, j) => {
        const t = g.input(c);
        const last = j === lvl.solution.length - 1;
        expect(t.levelChanged === true, `cmd "${c}"`).toBe(last);
      });
      expect(g.level).toBe(i + 1);
    });
  });

  it("full playthrough from level 1", () => {
    const g = new Game(0);
    for (const lvl of levels) for (const c of lvl.solution) g.input(c);
    expect(g.finished).toBe(true);
  });

  it("no level is solved before the player types anything", () => {
    levels.forEach((lvl, i) => {
      const g = new Game(i);
      expect(g.input("pwd").levelChanged, lvl.title).toBeFalsy();
    });
  });
});
