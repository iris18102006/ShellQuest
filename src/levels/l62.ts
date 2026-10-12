import { type Level, fileText } from "./types";

const jan = ["north,300", "south,200", "east,150"];
const feb = ["north,250", "west,100", "south,175"];
const mar = ["north,340", "east,90", "north,60"];

export const level: Level = {
  title: "Level 62: Boss, the quarterly report",
  story: "The sales folder has one CSV per month (region,amount). Your boss wants the TOTAL for the north region across all three months, saved in report.txt in your home folder, in exactly this form: north: 950. Use the real total from the files, not a number you worked out in your head.",
  hint: "One awk can read every file at once: awk -F, '$1 == \"north\" { s += $2 } END { print \"north:\", s }' sales/*.csv > report.txt",
  files: {
    "/home/user/sales/jan.csv": jan.join("\n") + "\n",
    "/home/user/sales/feb.csv": feb.join("\n") + "\n",
    "/home/user/sales/mar.csv": mar.join("\n") + "\n",
  },
  solution: [
    "cat sales/jan.csv",
    "awk -F, '{ s += $2 } END { print s }' sales/*.csv",
    "awk -F, '$1 == \"north\" { s += $2 } END { print \"north:\", s }' sales/*.csv > report.txt",
  ],
  check: (a) => fileText(a, "/home/user/report.txt") === "north: 950\n",
};
