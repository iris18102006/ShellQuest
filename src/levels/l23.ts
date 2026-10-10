import type { Level } from "./types";

export const level: Level = {
  title: "Level 23: Word count",
  story: "essay.txt is one long sentence. How many WORDS are in it? Just give me the number.",
  hint: "wc -w counts words (wc -l counts lines, wc -c counts characters).",
  files: { "/home/user/essay.txt": "the quick brown fox jumps over the lazy dog and runs away\n" },
  solution: ["wc essay.txt", "wc -w essay.txt"],
  check: (a) => a.output.trim().split(/\s+/)[0] === "12" && a.output.trim().split("\n").length === 1 && /-\w*w/.test(a.command),
};
