import { type Level } from "./types";

export const level: Level = {
  title: "Level 98: Squeeze it",
  story: "messy.txt has words separated by random runs of spaces. Print it with each run squeezed down to ONE space.",
  hint: "tr -s squeezes repeats: tr -s ' ' < messy.txt",
  files: {
    "/home/user/messy.txt": "a     b  c    d\n",
  },
  solution: ["cat messy.txt", "tr -s ' ' < messy.txt"],
  check: (a) => /tr/.test(a.command) && a.output === "a b c d\n",
};
