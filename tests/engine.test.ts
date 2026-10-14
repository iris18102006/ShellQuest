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

describe("tail", () => {
  it("tail -n +N starts at line N", () => {
    const s = sh({ "/home/user/a.csv": "h\n1\n2\n3\n" });
    expect(s.run("tail -n +2 a.csv").out).toBe("1\n2\n3\n");
    expect(s.run("tail -n +3 a.csv").out).toBe("2\n3\n");
    expect(s.run("cat a.csv | tail -n +2").out).toBe("1\n2\n3\n");
  });
  it("tail -n N still shows the last N lines", () => {
    const s = sh({ "/home/user/a.csv": "h\n1\n2\n3\n" });
    expect(s.run("tail -n 2 a.csv").out).toBe("2\n3\n");
    expect(s.run("tail -1 a.csv").out).toBe("3\n");
  });
});

describe("tac", () => {
  it("prints lines in reverse order", () => {
    const s = sh({ "/home/user/a.txt": "1\n2\n3\n" });
    expect(s.run("tac a.txt").out).toBe("3\n2\n1\n");
    expect(s.run("cat a.txt | tac").out).toBe("3\n2\n1\n");
    expect(s.run("tac nope.txt").err).toContain("No such file");
  });
});

describe("uniq -d / -u", () => {
  it("-d keeps only repeated lines, one copy each", () => {
    const s = sh({ "/home/user/a.txt": "a\na\nb\nc\nc\nc\n" });
    expect(s.run("uniq -d a.txt").out).toBe("a\nc\n");
  });
  it("-u keeps only lines that appear once", () => {
    const s = sh({ "/home/user/a.txt": "a\na\nb\nc\nc\nc\n" });
    expect(s.run("uniq -u a.txt").out).toBe("b\n");
  });
  it("works after sort", () => {
    const s = sh({ "/home/user/a.txt": "x\ny\nx\nz\ny\n" });
    expect(s.run("sort a.txt | uniq -d").out).toBe("x\ny\n");
  });
});

describe("cut -c", () => {
  it("cuts by character position", () => {
    const s = sh({ "/home/user/a.txt": "abcdef\nxyz\n" });
    expect(s.run("cut -c1-3 a.txt").out).toBe("abc\nxyz\n");
    expect(s.run("cut -c2 a.txt").out).toBe("b\ny\n");
    expect(s.run("cut -c1,4 a.txt").out).toBe("ad\nx\n");
    expect(s.run("cat a.txt | cut -c5-9").out).toBe("ef\n\n");
  });
  it("still cuts fields with -d and -f", () => {
    const s = sh({ "/home/user/a.csv": "a,b,c\n" });
    expect(s.run("cut -d, -f2 a.csv").out).toBe("b\n");
  });
});

describe("comm", () => {
  const files = { "/home/user/a.txt": "ana\nbo\ncy\n", "/home/user/b.txt": "bo\ncy\ndee\n" };
  it("shows three columns by default", () => {
    expect(sh(files).run("comm a.txt b.txt").out).toBe("ana\n\t\tbo\n\t\tcy\n\tdee\n");
  });
  it("-12 shows only lines in both", () => {
    expect(sh(files).run("comm -12 a.txt b.txt").out).toBe("bo\ncy\n");
  });
  it("-23 shows only lines unique to the first file", () => {
    expect(sh(files).run("comm -23 a.txt b.txt").out).toBe("ana\n");
  });
  it("-13 shows only lines unique to the second file", () => {
    expect(sh(files).run("comm -13 a.txt b.txt").out).toBe("dee\n");
  });
  it("reports missing files and wrong usage", () => {
    expect(sh(files).run("comm a.txt nope.txt").err).toContain("No such file");
    expect(sh(files).run("comm a.txt").err).toContain("usage");
  });
});

describe("xargs", () => {
  const files = {
    "/home/user/a.tmp": "1\n", "/home/user/b.tmp": "2\n", "/home/user/keep.txt": "3\n",
    "/home/user/sub/c.tmp": "4\n",
  };
  it("feeds piped words to another command as arguments", () => {
    const s = sh(files);
    expect(s.run("find . -name '*.tmp' | xargs rm").err).toBe("");
    expect(s.run("find . -name '*.tmp'").out).toBe("");
    expect(s.run("cat keep.txt").out).toBe("3\n");
  });
  it("keeps the extra arguments you give it", () => {
    const s = sh(files);
    expect(s.run("echo a.tmp b.tmp | xargs cat").out).toBe("1\n2\n");
    expect(s.run("echo a.tmp b.tmp | xargs wc -l").out).toBe("1 a.tmp\n1 b.tmp\n");
  });
  it("defaults to echo and rejects unknown commands", () => {
    const s = sh(files);
    expect(s.run("echo hi there | xargs").out).toBe("hi there\n");
    expect(s.run("echo x | xargs nope").err).toContain("No such file or directory");
  });
  it("does nothing for rm when nothing was piped in", () => {
    const s = sh(files);
    expect(s.run("find . -name '*.zzz' | xargs rm").err).toBe("");
  });
});

describe("chaining with && and ;", () => {
  it("&& runs the next command only if the last one worked", () => {
    const s = sh({ "/home/user/a.txt": "hi\n" });
    expect(s.run("cat a.txt && echo done").out).toBe("hi\ndone\n");
    const bad = s.run("cat nope.txt && echo done");
    expect(bad.out).toBe("");
    expect(bad.err).toContain("No such file");
  });
  it("; always runs the next command", () => {
    const s = sh({ "/home/user/a.txt": "hi\n" });
    const r = s.run("cat nope.txt ; echo done");
    expect(r.out).toBe("done\n");
    expect(r.err).toContain("No such file");
  });
  it("keeps state between the parts, like cd", () => {
    const s = sh({ "/home/user/d/x.txt": "x\n" });
    expect(s.run("cd d && ls").out).toBe("x.txt\n");
    expect(s.cwd).toBe("/home/user/d");
  });
  it("ignores && and ; inside quotes and still pipes", () => {
    const s = sh({ "/home/user/a.txt": "a;b\nc&&d\n" });
    expect(s.run('grep ";" a.txt | wc -l').out).toBe("1\n");
    expect(s.run('echo "x && y"').out).toBe("x && y\n");
  });
  it("reports dangling operators", () => {
    expect(sh().run("echo a &&").err).toContain("syntax error");
    expect(sh().run("&& echo a").err).toContain("syntax error");
  });
});

describe("variables", () => {
  it("sets and reads a variable", () => {
    const s = sh();
    expect(s.run("NAME=iris").err).toBe("");
    expect(s.run("echo hi $NAME").out).toBe("hi iris\n");
    expect(s.run("echo ${NAME}x").out).toBe("irisx\n");
  });
  it("expands inside double quotes but not single quotes", () => {
    const s = sh();
    s.run("NAME=iris");
    expect(s.run('echo "hi $NAME"').out).toBe("hi iris\n");
    expect(s.run("echo 'hi $NAME'").out).toBe("hi $NAME\n");
  });
  it("keeps spaces when the value was quoted", () => {
    const s = sh();
    s.run('MSG="hello big world"');
    expect(s.run('echo "$MSG"').out).toBe("hello big world\n");
    expect(s.run("echo $MSG | wc -w").out).toBe("3\n");
  });
  it("works as an argument, even in a chain", () => {
    const s = sh({ "/home/user/log.txt": "ERROR a\nok\nERROR b\n" });
    expect(s.run("LOG=log.txt; grep ERROR $LOG | wc -l").out).toBe("2\n");
    expect(s.run("cd $HOME && pwd").out).toBe("/home/user\n");
  });
  it("unset variables vanish, and a lone $ or $1 stays as typed", () => {
    const s = sh();
    expect(s.run("echo a $NOPE b").out).toBe("a b\n");
    expect(s.run("echo cost $5 $").out).toBe("cost $5 $\n");
    expect(s.run("echo $USER").out).toBe("user\n");
  });
  it("later assignments overwrite earlier ones", () => {
    const s = sh();
    s.run("X=1");
    s.run("X=2");
    expect(s.run("echo $X").out).toBe("2\n");
  });
});

describe("command substitution", () => {
  const files = { "/home/user/a.txt": "x\ny\nz\n", "/home/user/b.txt": "1\n" };
  it("replaces $(cmd) with its output", () => {
    const s = sh(files);
    expect(s.run("echo files: $(ls)").out).toBe("files: a.txt b.txt\n");
    expect(s.run('echo "lines: $(cat a.txt | wc -l)"').out).toBe("lines: 3\n");
  });
  it("works in a variable assignment", () => {
    const s = sh(files);
    s.run("N=$(cat a.txt | wc -l)");
    expect(s.run("echo $N").out).toBe("3\n");
  });
  it("feeds one command's output to another", () => {
    const s = sh(files);
    expect(s.run("cat $(echo b.txt)").out).toBe("1\n");
    expect(s.run("head -n $(cat b.txt) a.txt").out).toBe("x\n");
  });
  it("is not expanded inside single quotes", () => {
    expect(sh(files).run("echo '$(ls)'").out).toBe("$(ls)\n");
  });
  it("keeps ; and && inside the parentheses together", () => {
    expect(sh(files).run("echo $(echo a; echo b) end").out).toBe("a b end\n");
  });
  it("shows errors from the inner command and reports a missing )", () => {
    expect(sh(files).run("echo $(cat nope.txt)").err).toContain("No such file");
    expect(sh(files).run("echo $(ls").err).toContain("unterminated");
  });
});

describe("awk END blocks", () => {
  const sales = "north,120\nsouth,80\nnorth,50\neast,10\n";
  const s = () => sh({ "/home/user/sales.csv": sales, "/home/user/empty.txt": "" });
  it("sums a column", () => {
    expect(s().run("awk -F, '{ s += $2 } END { print s }' sales.csv").out).toBe("260\n");
    expect(s().run("awk -F, '{s+=$2} END {print s}' sales.csv").out).toBe("260\n");
  });
  it("counts lines with n++ and with NR", () => {
    expect(s().run("awk '{ n++ } END { print n }' sales.csv").out).toBe("4\n");
    expect(s().run("awk 'END { print NR }' sales.csv").out).toBe("4\n");
  });
  it("only adds lines that pass the condition", () => {
    expect(s().run(`awk -F, '$1 == "north" { s += $2 } END { print s }' sales.csv`).out).toBe("170\n");
    expect(s().run("awk -F, '$2 > 60 { n++ } END { print n }' sales.csv").out).toBe("2\n");
    expect(s().run("awk '/north/ { n++ } END { print n }' sales.csv").out).toBe("2\n");
  });
  it("does math in the END print, with up to 6 significant digits", () => {
    expect(s().run("awk -F, '{ s += $2 } END { print s / NR }' sales.csv").out).toBe("65\n");
    expect(s().run("awk -F, '{ s += $2 } END { print s / 3 }' sales.csv").out).toBe("86.6667\n");
    expect(s().run("awk -F, '{ s += $2 } END { print s * 2 - 10 }' sales.csv").out).toBe("510\n");
  });
  it("prints labels, several items and works in a pipe", () => {
    expect(s().run(`awk -F, '{ s += $2 } END { print "total:", s }' sales.csv`).out).toBe("total: 260\n");
    expect(s().run("cat sales.csv | awk -F, '{ s += $2 } END { print s }'").out).toBe("260\n");
  });
  it("an unset variable prints empty, and an empty file gives zero records", () => {
    expect(s().run("awk '{ n++ } END { print n }' empty.txt").out).toBe("\n");
    expect(s().run("awk 'END { print NR }' empty.txt").out).toBe("0\n");
  });
  it("gives helpful errors", () => {
    expect(s().run("awk '{ s += } END { print s }' sales.csv").err).toContain("awk:");
    expect(s().run("awk '{ s += $2 } END { s }' sales.csv").err).toContain("only 'print'");
    expect(s().run("awk '{ s += $2 } END' sales.csv").err).toContain("awk:");
  });
  it("normal one-liners still work", () => {
    expect(s().run("awk -F, '{print $1}' sales.csv").out).toBe("north\nsouth\nnorth\neast\n");
  });
});

describe("diff", () => {
  const run = (a: string, b: string, cmd = "diff a.txt b.txt") =>
    sh({ "/home/user/a.txt": a, "/home/user/b.txt": b }).run(cmd);
  it("prints nothing for identical files", () => {
    expect(run("x\ny\n", "x\ny\n").out).toBe("");
  });
  it("shows a changed line", () => {
    expect(run("a\nb\nc\n", "a\nB\nc\n").out).toBe("2c2\n< b\n---\n> B\n");
  });
  it("shows an added line", () => {
    expect(run("a\nc\n", "a\nb\nc\n").out).toBe("1a2\n> b\n");
  });
  it("shows a deleted line", () => {
    expect(run("a\nb\nc\n", "a\nc\n").out).toBe("2d1\n< b\n");
  });
  it("groups neighbouring changes and uses ranges", () => {
    expect(run("a\nb\nc\nd\n", "a\nX\nY\nZ\nd\n").out).toBe("2,3c2,4\n< b\n< c\n---\n> X\n> Y\n> Z\n");
  });
  it("reports several separate hunks", () => {
    expect(run("1\n2\n3\n4\n5\n", "1\nX\n3\n4\nY\n").out).toBe("2c2\n< 2\n---\n> X\n5c5\n< 5\n---\n> Y\n");
  });
  it("handles an empty file and missing files", () => {
    expect(run("", "a\n").out).toBe("0a1\n> a\n");
    expect(run("a\n", "a\n", "diff a.txt nope.txt").err).toContain("No such file");
    expect(run("a\n", "a\n", "diff a.txt").err).toContain("usage");
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

describe("shareable links", () => {
  it("parses #level=N into a zero-based index", async () => {
    const { levelFromHash, hashForLevel } = await import("../src/link");
    expect(levelFromHash("#level=12", 82)).toBe(11);
    expect(levelFromHash("level=1", 82)).toBe(0);
    expect(levelFromHash("#level=0", 82)).toBeNull();
    expect(levelFromHash("#level=83", 82)).toBeNull();
    expect(levelFromHash("#nope", 82)).toBeNull();
    expect(hashForLevel(11)).toBe("#level=12");
  });
  it("share prints a link to the current level", () => {
    const g = new Game(4);
    g.baseUrl = "https://x.dev/";
    expect(g.input("share").out).toContain("https://x.dev/#level=5");
  });
});

describe("per-command help", () => {
  it("help CMD and CMD --help both explain a command", () => {
    const g = new Game(0);
    expect(g.input("help grep").out).toContain("grep [-ivcnrlh]");
    expect(g.input("help nope").err).toContain("no help for 'nope'");
    expect(sh().run("sort --help").out).toContain("-k START[,END]");
  });
  it("every command in the shell has help text", async () => {
    const { commands } = await import("../src/commands");
    const { HELP } = await import("../src/help");
    for (const name of Object.keys(commands)) expect(HELP[name], name).toBeTruthy();
  });
});
