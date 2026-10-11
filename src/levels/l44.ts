import type { Level } from "./types";

export const level: Level = {
  title: "Level 44: Sort by column",
  story: "scores.csv is name,score. Who has the HIGHEST score? Print just that one line. Sorting the whole line alphabetically won't cut it, you need to sort by the score column.",
  hint: "sort -t, -k2 -nr scores.csv | head -n 1. -t, sets the separator, -k2 picks column 2, -n is numeric, -r is biggest first.",
  files: { "/home/user/scores.csv": "ana,72\nbo,91\ncy,88\ndee,65\neli,79\n" },
  solution: ["sort scores.csv", "sort -t, -k2 -nr scores.csv | head -n 1"],
  check: (a) => /sort/.test(a.command) && /-k/.test(a.command) && a.output.trim() === "bo,91",
};
