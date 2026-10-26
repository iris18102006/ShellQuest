import { type Level } from "./types";

export const level: Level = {
  title: "Level 96: Shout it",
  story: "note.txt is whispered in lowercase. Print it in UPPERCASE without changing the file.",
  hint: "tr swaps characters and reads stdin: tr a-z A-Z < note.txt",
  files: {
    "/home/user/note.txt": "hello world\n",
  },
  solution: ["cat note.txt", "tr a-z A-Z < note.txt"],
  check: (a) => /tr/.test(a.command) && a.output === "HELLO WORLD\n",
};
