import type { Level } from "./types";

export const level: Level = {
  title: "Level 15: Biggest number wins",
  story: "scores.txt has one score per line. Print only the highest one. Careful: a plain sort thinks 9 is bigger than 1000.",
  hint: "sort -n sorts by number value. Then take the last line with tail -n 1 (or flip it with -r and use head).",
  files: { "/home/user/scores.txt": "87\n9\n152\n45\n1000\n63\n7\n98\n" },
  solution: ["sort scores.txt | tail -n 1", "sort -n scores.txt | tail -n 1"],
  check: (a) => a.command.includes("|") && a.output.trim() === "1000",
};
