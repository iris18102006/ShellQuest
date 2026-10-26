import { type Level, fileText, listDir } from "./types";

export const level: Level = {
  title: "Level 112: Sweep the temp files",
  story: "Scattered .tmp files are everywhere in this tree. Delete ALL of them, but keep keep.txt and the folders.",
  hint: "find . -name '*.tmp' | xargs rm",
  files: {
    "/home/user/a.tmp": "",
    "/home/user/keep.txt": "safe\n",
    "/home/user/cache/b.tmp": "",
    "/home/user/cache/deep/c.tmp": "",
  },
  solution: ["find . -name '*.tmp'", "find . -name '*.tmp' | xargs rm"],
  check: (a) => listDir(a, "/home/user").length === 2 && fileText(a, "/home/user/keep.txt") === "safe\n" && listDir(a, "/home/user/cache/deep").length === 0 && listDir(a, "/home/user/cache").length === 1,
};
