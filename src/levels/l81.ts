
import type { Level } from "./types";

export const level: Level = {
  title: "Level 81: Compare two sorted lists",
  story: "mine.txt and theirs.txt are sorted. Print only names that appear in both files.",
  hint: "comm -12 mine.txt theirs.txt",
  files: {
    "/home/user/mine.txt": "ana\nlea\nmax\nzoe\n",
    "/home/user/theirs.txt": "ben\nlea\nzoe\n",
  },
  solution: ["comm -12 mine.txt theirs.txt"],
  check: (a) => a.output === "lea\nzoe\n",
};
