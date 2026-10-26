import { type Level } from "./types";

export const level: Level = {
  title: "Level 93: Count the words",
  story: "essay.txt is a short essay. How many words does it have?",
  hint: "wc -w counts words: wc -w essay.txt",
  files: {
    "/home/user/essay.txt": "the quick brown fox jumps over dogs\n",
  },
  solution: ["cat essay.txt", "wc -w essay.txt"],
  check: (a) => /wc/.test(a.command) && /\b7\b/.test(a.output),
};
