import type { Level } from "./types";

const ranking = Array.from({ length: 20 }, (_, i) => `rank_${i + 1}`).join("\n") + "\n";

export const level: Level = {
  title: "Level 25: Top of the file",
  story: "ranking.txt has 20 lines. Show me only the first 5.",
  hint: "head -n 5 ranking.txt",
  files: { "/home/user/ranking.txt": ranking },
  solution: ["head -n 5 ranking.txt"],
  check: (a) => a.output.trim() === "rank_1\nrank_2\nrank_3\nrank_4\nrank_5",
};
