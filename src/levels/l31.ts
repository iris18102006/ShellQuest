import { type Level, lineCount } from "./types";

const rows = (n: number) => Array.from({ length: n }, (_, i) => `row_${i + 1}`).join("\n") + "\n";

export const level: Level = {
  title: "Level 31: Count them all",
  story: "The reports folder has three .csv files. How many lines does each one have? One command, and let a wildcard do the typing.",
  hint: "wc -l *.csv counts the lines of every matching file.",
  cwd: "/home/user/reports",
  files: {
    "/home/user/reports/jan.csv": rows(3),
    "/home/user/reports/feb.csv": rows(5),
    "/home/user/reports/mar.csv": rows(4),
    "/home/user/reports/notes.txt": "ignore me\n",
  },
  solution: ["ls", "wc -l *.csv"],
  check: (a) => lineCount(a.output) === 3 && a.output.includes("5 feb.csv") && a.output.includes("3 jan.csv") && a.output.includes("4 mar.csv"),
};
