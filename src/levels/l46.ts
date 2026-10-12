import type { Level } from "./types";

const rows = ["ana,72", "bo,91", "cy,88", "dee,65"];
const expected = rows.join("\n") + "\n";

export const level: Level = {
  title: "Level 46: Skip the header",
  story: "report.csv starts with a header row (name,score). Print everything EXCEPT that first line, so only the data rows show up.",
  hint: "tail can start from a specific line: tail -n +2 report.csv. The + means 'start at line 2' instead of 'last 2 lines'.",
  files: { "/home/user/report.csv": "name,score\n" + expected },
  solution: ["tail -n 2 report.csv", "tail -n +2 report.csv"],
  check: (a) => /tail/.test(a.command) && a.output === expected,
};
