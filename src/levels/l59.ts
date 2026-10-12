import type { Level } from "./types";

const rows = ["ana 70", "bo 82", "cy 91", "dee 63"];

export const level: Level = {
  title: "Level 59: The average",
  story: "grades.txt has a name and a score on each line, separated by a space. What's the class AVERAGE? Print just the number. You'll need the total and the number of lines.",
  hint: "NR is the number of lines awk has read. Add up column 2, then divide at the end: awk '{ s += $2 } END { print s / NR }' grades.txt",
  files: { "/home/user/grades.txt": rows.join("\n") + "\n" },
  solution: ["awk 'END { print NR }' grades.txt", "awk '{ s += $2 } END { print s / NR }' grades.txt"],
  check: (a) => /awk/.test(a.command) && /NR/.test(a.command) && a.output === "76.5\n",
};
