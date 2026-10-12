import { type Level, fileText } from "./types";

const active = ["maya", "jon", "lea", "sam", "jon", "ivy", "maya", "ben"];
const banned = ["zed", "sam", "ivy", "kai", "sam", "ben", "zed"];
const expected = ["ben", "ivy", "sam"].join("\n") + "\n";

export const level: Level = {
  title: "Level 53: Boss, the banned list",
  story: "active.txt lists accounts that logged in this week and banned.txt lists banned accounts. Both are messy: unsorted, with duplicates. Find the banned users who STILL logged in, sorted with no duplicates, and save them to alert.txt in your home folder. comm needs sorted input, so clean both lists first.",
  hint: "Clean each list into its own file: sort -u active.txt > a.txt (same for banned). Then comm -12 a.txt b.txt > alert.txt. Three commands is fine.",
  files: {
    "/home/user/active.txt": active.join("\n") + "\n",
    "/home/user/banned.txt": banned.join("\n") + "\n",
  },
  solution: [
    "sort -u active.txt > a.txt",
    "sort -u banned.txt > b.txt",
    "comm -12 active.txt banned.txt > alert.txt",
    "comm -12 a.txt b.txt > alert.txt",
  ],
  check: (a) => fileText(a, "/home/user/alert.txt") === expected,
};
