import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 73: Make a quick backup",
  story: "Copy notes.txt to notes.bak. Keep the original file too.",
  hint: "cp notes.txt notes.bak",
  files: { "/home/user/notes.txt": 'remember to hydrate\nship the patch\n' },
  solution: ["cp notes.txt notes.bak"],
  check: (a) => fileText(a, "/home/user/notes.bak") === "remember to hydrate\nship the patch\n" && fileText(a, "/home/user/notes.txt") !== null,
};
