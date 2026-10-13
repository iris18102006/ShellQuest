import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 74: Rename the draft",
  story: "Rename draft.txt to final.txt. The old filename should no longer exist.",
  hint: "mv draft.txt final.txt",
  files: { "/home/user/draft.txt": 'Release checklist\nQA approved\n' },
  solution: ["mv draft.txt final.txt"],
  check: (a) => fileText(a, "/home/user/final.txt") === "Release checklist\nQA approved\n" && fileText(a, "/home/user/draft.txt") === null,
};
