import type { Level } from "./types";

const nums = ["555-0142", "555-0187", "555-0199", "555-0123"];

export const level: Level = {
  title: "Level 36: Strip it",
  story: "phones.txt has numbers like 555-0142. The dialer can't handle dashes. Print the numbers with every dash removed.",
  hint: "tr -d deletes characters instead of swapping them: cat phones.txt | tr -d -",
  files: { "/home/user/phones.txt": nums.join("\n") + "\n" },
  solution: ["cat phones.txt", "cat phones.txt | tr -d '-'"],
  check: (a) => /tr/.test(a.command) && a.output === nums.map((n) => n.replace("-", "")).join("\n") + "\n",
};
