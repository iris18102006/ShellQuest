import { type Level } from "./types";

export const level: Level = {
  title: "Level 95: Skip the header",
  story: "data.csv starts with a header row. Print every row except the header.",
  hint: "tail -n +2 starts printing at line 2: tail -n +2 data.csv",
  files: {
    "/home/user/data.csv": "name,score\nava,7\nben,9\ncy,4\n",
  },
  solution: ["cat data.csv", "tail -n +2 data.csv"],
  check: (a) => a.output === "ava,7\nben,9\ncy,4\n",
};
