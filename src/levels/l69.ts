import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 69: Unique sorted tags",
  story: "tags.txt has repeated tags. Print each tag once in alphabetical order.",
  hint: "sort -u tags.txt",
  files: { "/home/user/tags.txt": 'bug\nfeature\nbug\ndocs\nfeature\nurgent\n' },
  solution: ["sort -u tags.txt"],
  check: (a) => a.output === "bug\ndocs\nfeature\nurgent\n",
};
