import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 108: Add to the end",
  story: "diary.txt already has an entry. Add the line 'day 2: rested' at the bottom WITHOUT erasing what is there.",
  hint: "echo 'day 2: rested' >> diary.txt   (>> appends, > overwrites)",
  files: {
    "/home/user/diary.txt": "day 1: started\n",
  },
  solution: ["cat diary.txt", "echo 'day 2: rested' >> diary.txt"],
  check: (a) => fileText(a, "/home/user/diary.txt") === "day 1: started\nday 2: rested\n",
};
