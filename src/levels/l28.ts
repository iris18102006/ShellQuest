import type { Level } from "./types";

const words = ["kiwi", "apple", "fig", "apple", "mango", "kiwi", "apple", "pear", "apple", "mango", "kiwi", "apple", "pear", "mango", "apple", "kiwi"];

export const level: Level = {
  title: "Level 28: Top 3",
  story: "words.txt has one word per line. Print the 3 most common words, most common first (with their counts).",
  hint: "Same trick as the visitors level: sort | uniq -c | sort -rn, then keep the top 3 with head.",
  files: { "/home/user/words.txt": words.join("\n") + "\n" },
  solution: ["sort words.txt | uniq -c | sort -rn | head -n 3"],
  check: (a) => {
    const top = a.output.trim().split("\n").map((l) => l.trim().split(/\s+/)[1]);
    return a.command.includes("|") && JSON.stringify(top) === JSON.stringify(["apple", "kiwi", "mango"]);
  },
};
