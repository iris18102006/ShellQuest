import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 70: Normalize the labels",
  story: "labels.txt has uppercase labels. Convert every letter to lowercase.",
  hint: "tr A-Z a-z < labels.txt",
  files: { "/home/user/labels.txt": 'READY\nInProgress\nDONE\n' },
  solution: ["tr A-Z a-z < labels.txt"],
  check: (a) => a.output === "ready\ninprogress\ndone\n",
};
