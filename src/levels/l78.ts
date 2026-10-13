import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 78: Find the average score",
  story: "scores.txt has one score per line. Use awk to print the average score.",
  hint: "awk '{ s += $1 } END { print s / NR }' scores.txt",
  files: { "/home/user/scores.txt": '80\n90\n70\n100\n' },
  solution: ["awk '{ s += $1 } END { print s / NR }' scores.txt"],
  check: (a) => /awk/.test(a.command) && a.output === "85\n",
};
