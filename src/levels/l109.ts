import { type Level } from "./types";

export const level: Level = {
  title: "Level 109: What do we share",
  story: "list_a.txt and list_b.txt are both sorted. Print only the lines that appear in BOTH.",
  hint: "comm -12 list_a.txt list_b.txt   (-1 and -2 hide the 'only in one' columns)",
  files: {
    "/home/user/list_a.txt": "apple\nbanana\ncherry\ndate\n",
    "/home/user/list_b.txt": "banana\ncherry\nelder\nfig\n",
  },
  solution: ["cat list_a.txt", "comm -12 list_a.txt list_b.txt"],
  check: (a) => /comm/.test(a.command) && a.output === "banana\ncherry\n",
};
