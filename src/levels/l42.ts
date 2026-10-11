import { type Level, fileText } from "./types";

const names = ["noor", "ben", "ines", "adam", "cleo"];
const sorted = [...names].sort().join("\n") + "\n";

export const level: Level = {
  title: "Level 42: Show and save",
  story: "Sort names.txt. I want to SEE the sorted list on screen and ALSO have it saved in sorted.txt, with a single command.",
  hint: "tee copies its input to a file and passes it along: sort names.txt | tee sorted.txt",
  files: { "/home/user/names.txt": names.join("\n") + "\n" },
  solution: ["sort names.txt > sorted.txt", "sort names.txt | tee sorted.txt"],
  check: (a) => /tee/.test(a.command) && a.output === sorted && fileText(a, "/home/user/sorted.txt") === sorted,
};
