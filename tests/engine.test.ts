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

describe("grep -r / -l / -h", () => {
  const spec = { "/home/user/p/a.txt": "hit\nmiss\n", "/home/user/p/sub/b.txt": "hit again\n", "/home/user/p/c.txt": "nothing\n" };
  it("-r walks folders and prefixes paths", () => {
    expect(sh(spec).run("grep -r hit p").out).toBe("p/a.txt:hit\np/sub/b.txt:hit again\n");
  });
  it("-l prints only matching file names", () => {
    expect(sh(spec).run("grep -rl hit p").out).toBe("p/a.txt\np/sub/b.txt\n");
  });
  it("-h hides names, plain grep on a folder errors", () => {
    expect(sh(spec).run("grep -rh hit p").out).toBe("hit\nhit again\n");
    expect(sh(spec).run("grep hit p").err).toContain("Is a directory");
  });
});

describe("tr", () => {
  it("translates ranges and deletes characters", () => {
    const s = sh({ "/home/user/a.txt": "Hello-World\n" });
    expect(s.run("cat a.txt | tr a-z A-Z").out).toBe("HELLO-WORLD\n");
    expect(s.run("cat a.txt | tr -d -").out).toBe("HelloWorld\n");
    expect(s.run("tr -s l < a.txt").out).toBe("Helo-World\n");
    expect(s.run("cat a.txt | tr '[:upper:]' '[:lower:]'").out).toBe("hello-world\n");
  });
});

describe("sed", () => {
  const s = () => sh({ "/home/user/f.txt": "a a\nb a\nc\nd a\n" });
  it("substitutes first vs all", () => {
    expect(s().run("sed s/a/X/ f.txt").out).toBe("X a\nb X\nc\nd X\n");
    expect(s().run("sed s/a/X/g f.txt").out).toBe("X X\nb X\nc\nd X\n");
    expect(s().run("sed 's/(b) a/\\1-&/' f.txt").out).toContain("b-b a");
  });
  it("deletes by number, range, regex, last line", () => {
    expect(s().run("sed 2d f.txt").out).toBe("a a\nc\nd a\n");
    expect(s().run("sed 2,3d f.txt").out).toBe("a a\nd a\n");
    expect(s().run("sed '/a/d' f.txt").out).toBe("c\n");
    expect(s().run("sed '$d' f.txt").out).toBe("a a\nb a\nc\n");
  });
  it("-n with p prints only the selection, -i edits the file", () => {
    const x = s();
    expect(x.run("sed -n 2p f.txt").out).toBe("b a\n");
    expect(x.run("sed -i 1d f.txt").out).toBe("");
    expect(x.run("cat f.txt").out).toBe("b a\nc\nd a\n");
  });
  it("rejects nonsense", () => {
    expect(sh().run("sed 'zzz' f.txt").err).toContain("unknown command");
  });
});

describe("awk", () => {
  const s = () => sh({ "/home/user/t.txt": "1   ann   50\n2   bo    150\n3   cy    100\n", "/home/user/t.csv": "ann,50\nbo,150\n" });
  it("prints columns across ragged whitespace", () => {
    expect(s().run("awk '{print $2}' t.txt").out).toBe("ann\nbo\ncy\n");
    expect(s().run("awk '{print $NF, $1}' t.txt").out).toBe("50 1\n150 2\n100 3\n");
  });
  it("filters with comparisons, regexes and -F", () => {
    expect(s().run("awk '$3 > 100 {print $2}' t.txt").out).toBe("bo\n");
    expect(s().run("awk '$3 >= 100 {print $2}' t.txt").out).toBe("bo\ncy\n");
    expect(s().run("awk -F, '$2 > 100 {print $1}' t.csv").out).toBe("bo\n");
    expect(s().run("awk '/bo/' t.txt").out).toBe("2   bo    150\n");
    expect(s().run("cat t.txt | awk 'NR == 2 {print $2}'").out).toBe("bo\n");
  });
  it("complains about unsupported programs", () => {
    expect(s().run("awk '{x = 1}' t.txt").err).toContain("awk:");
  });
});

describe("tee, cp -r, sort -k", () => {
  it("tee writes and passes through, -a appends", () => {
    const s = sh({ "/home/user/a.txt": "b\na\n" });
    expect(s.run("sort a.txt | tee o.txt").out).toBe("a\nb\n");
    expect(s.run("cat o.txt").out).toBe("a\nb\n");
    s.run("echo z | tee -a o.txt");
    expect(s.run("cat o.txt").out).toBe("a\nb\nz\n");
  });
  it("cp -r copies a whole tree", () => {
    const s = sh({ "/home/user/d/x.txt": "1\n", "/home/user/d/s/y.txt": "2\n" });
    expect(s.run("cp d e").err).toContain("-r not specified");
    s.run("cp -r d e");
    expect(s.run("cat e/s/y.txt").out).toBe("2\n");
    expect(s.run("cat d/s/y.txt").out).toBe("2\n");
    expect(s.run("cp -r d d/inside").err).toContain("into itself");
    s.run("cp -r d e");
    expect(s.run("cat e/d/x.txt").out).toBe("1\n");
  });
  it("sort -t -k picks a column", () => {
    const s = sh({ "/home/user/s.csv": "a,10\nb,9\nc,100\n" });
    expect(s.run("sort -t, -k2 -n s.csv").out).toBe("b,9\na,10\nc,100\n");
    expect(s.run("sort -t, -k2 -nr s.csv").out).toBe("c,100\na,10\nb,9\n");
    expect(s.run("sort -t , -k 2 s.csv").out).toBe("a,10\nc,100\nb,9\n");
  });
});

describe("< input redirect", () => {
  it("parses and feeds stdin", () => {
    expect(parse("tr a b < f.txt")[0].input).toBe("f.txt");
    const s = sh({ "/home/user/f.txt": "aaa\n" });
    expect(s.run("tr a b < f.txt").out).toBe("bbb\n");
    expect(s.run("tr a b < nope.txt").err).toContain("No such file");
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
