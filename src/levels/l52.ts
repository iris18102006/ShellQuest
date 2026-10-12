import { type Level, fileText, listDir } from "./types";

const files = {
  "/home/user/cache/a.tmp": "junk\n",
  "/home/user/cache/b.tmp": "junk\n",
  "/home/user/cache/session.txt": "keep me\n",
  "/home/user/cache/old/c.tmp": "junk\n",
  "/home/user/cache/old/notes.txt": "keep me too\n",
};

export const level: Level = {
  title: "Level 52: Sweep the temp files",
  story: "The cache folder is full of .tmp files, some of them hidden in subfolders. Delete every .tmp file in one go, but do NOT touch the .txt files. You can't just type rm *.tmp, that only reaches the current folder.",
  hint: "find can list them all, and xargs turns that list into arguments for rm: find cache -name \"*.tmp\" | xargs rm",
  files,
  solution: ["find cache -name \"*.tmp\"", "find cache -name \"*.tmp\" | xargs rm"],
  check: (a) =>
    !listDir(a, "/home/user/cache").some((n) => n.endsWith(".tmp")) &&
    !listDir(a, "/home/user/cache/old").some((n) => n.endsWith(".tmp")) &&
    fileText(a, "/home/user/cache/session.txt") === "keep me\n" &&
    fileText(a, "/home/user/cache/old/notes.txt") === "keep me too\n",
};
