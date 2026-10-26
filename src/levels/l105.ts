import { type Level } from "./types";

export const level: Level = {
  title: "Level 105: Each name once",
  story: "visitors.txt has repeated names. Print each name exactly once, sorted.",
  hint: "sort -u visitors.txt   (or sort | uniq)",
  files: {
    "/home/user/visitors.txt": "zoe\nlea\nzoe\nomar\nlea\nlea\n",
  },
  solution: ["cat visitors.txt", "sort -u visitors.txt"],
  check: (a) => a.output === "lea\nomar\nzoe\n",
};
