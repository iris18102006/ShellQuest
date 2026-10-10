import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 19: Rename it",
  story: "draft.txt is finished. Rename it to final.txt (don't copy it, the old name should be gone).",
  hint: "mv moves or renames: mv old new",
  files: { "/home/user/draft.txt": "my finished essay\n" },
  solution: ["mv draft.txt final.txt"],
  check: (a) => fileText(a, "/home/user/final.txt") === "my finished essay\n" && a.fs.get("/home/user/draft.txt") === null,
};
