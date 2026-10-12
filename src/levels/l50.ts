import type { Level } from "./types";

const mine = ["ana", "bo", "cy", "dee", "eli"];
const theirs = ["bo", "dee", "fay", "gus"];
const expected = ["bo", "dee"].join("\n") + "\n";

export const level: Level = {
  title: "Level 50: In both lists",
  story: "You and a friend each wrote down who's coming to the party: mine.txt and theirs.txt. Both are already sorted. Print only the names that appear on BOTH lists.",
  hint: "comm compares two sorted files in three columns: only-in-first, only-in-second, in-both. Hide columns 1 and 2 with: comm -12 mine.txt theirs.txt",
  files: {
    "/home/user/mine.txt": mine.join("\n") + "\n",
    "/home/user/theirs.txt": theirs.join("\n") + "\n",
  },
  solution: ["comm mine.txt theirs.txt", "comm -12 mine.txt theirs.txt"],
  check: (a) => /comm/.test(a.command) && a.output === expected,
};
