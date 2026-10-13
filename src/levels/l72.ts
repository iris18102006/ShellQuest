import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 72: Show it and save it",
  story: "Print the sorted list of names and save the same sorted output into sorted.txt.",
  hint: "sort names.txt | tee sorted.txt",
  files: { "/home/user/names.txt": 'zoe\nana\nmax\n' },
  solution: ["sort names.txt | tee sorted.txt"],
  check: (a) => a.output === "ana\nmax\nzoe\n" && fileText(a, "/home/user/sorted.txt") === "ana\nmax\nzoe\n",
};
