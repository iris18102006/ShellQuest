import { type Level, listDir } from "./types";

export const level: Level = {
  title: "Level 8: Spring cleaning",
  story: "The cache folder is full of .tmp junk. Delete every .tmp file, but keep keep.txt. Try not to do it one file at a time.",
  hint: "A * glob matches many files at once: rm cache/*.tmp",
  files: {
    "/home/user/cache/a.tmp": "junk\n",
    "/home/user/cache/b.tmp": "junk\n",
    "/home/user/cache/c.tmp": "junk\n",
    "/home/user/cache/d.tmp": "junk\n",
    "/home/user/cache/keep.txt": "important\n",
  },
  solution: ["ls cache", "rm cache/*.tmp"],
  check: (a) => {
    const names = listDir(a, "/home/user/cache");
    return names.includes("keep.txt") && !names.some((n) => n.endsWith(".tmp"));
  },
};
