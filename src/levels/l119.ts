import { type Level } from "./types";

export const level: Level = {
  title: "Level 119: Who won",
  story: "scores.csv is name,points. Print only the NAME of the person with the most points.",
  hint: "sort -t, -k2 -nr scores.csv | head -n 1 | cut -d, -f1",
  files: {
    "/home/user/scores.csv": "ava,70\nmia,95\nken,88\nli,60\n",
  },
  solution: ["cat scores.csv", "sort -t, -k2 -nr scores.csv | head -n 1 | cut -d, -f1"],
  check: (a) => /sort/.test(a.command) && a.output === "mia\n",
};
