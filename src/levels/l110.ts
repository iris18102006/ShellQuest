import { type Level } from "./types";

export const level: Level = {
  title: "Level 110: Spot the difference",
  story: "old.txt and new.txt are almost identical. Show exactly what changed between them.",
  hint: "diff old.txt new.txt",
  files: {
    "/home/user/old.txt": "alpha\nbeta\ngamma\n",
    "/home/user/new.txt": "alpha\nBETA\ngamma\n",
  },
  solution: ["cat old.txt", "diff old.txt new.txt"],
  check: (a) => /diff/.test(a.command) && a.output.includes("2c2"),
};
