import { type Level } from "./types";

export const level: Level = {
  title: "Level 106: Only the repeats",
  story: "names.txt lists attendees, and some signed up twice. Print ONLY the names that appear more than once.",
  hint: "uniq only sees neighbours, so sort first: sort names.txt | uniq -d",
  files: {
    "/home/user/names.txt": "ivy\nraj\nivy\nmo\nraj\nkim\n",
  },
  solution: ["cat names.txt", "sort names.txt | uniq -d"],
  check: (a) => /uniq/.test(a.command) && a.output === "ivy\nraj\n",
};
