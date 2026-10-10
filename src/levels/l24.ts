import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 24: Append, don't overwrite",
  story: "log.txt already has two lines. Add a third line saying: done. Careful, a single > wipes the file first.",
  hint: ">> adds to the end of a file instead of replacing it.",
  files: { "/home/user/log.txt": "start\nrunning\n" },
  solution: ["echo done >> log.txt"],
  check: (a) => fileText(a, "/home/user/log.txt") === "start\nrunning\ndone\n",
};
