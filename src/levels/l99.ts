import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 99: Fix the extension",
  story: "draft.txt is finished. Rename it to final.txt so the old name is gone.",
  hint: "mv draft.txt final.txt",
  files: {
    "/home/user/draft.txt": "the end\n",
  },
  solution: ["ls", "mv draft.txt final.txt"],
  check: (a) => fileText(a, "/home/user/final.txt") === "the end\n" && fileText(a, "/home/user/draft.txt") === null,
};
