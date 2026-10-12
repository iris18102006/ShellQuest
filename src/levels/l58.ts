import type { Level } from "./types";

const rows = ["rent,400", "food,120", "bus pass,35", "books,65", "coffee,15"];

export const level: Level = {
  title: "Level 58: Add them up",
  story: "expenses.csv has an item and a cost on every line (item,cost). Print the TOTAL of the cost column, just the number. No calculator, no copying numbers by hand.",
  hint: "awk can keep a running total and print it once the file ends: awk -F, '{ s += $2 } END { print s }' expenses.csv",
  files: { "/home/user/expenses.csv": rows.join("\n") + "\n" },
  solution: ["cat expenses.csv", "awk -F, '{ s += $2 } END { print s }' expenses.csv"],
  check: (a) => /awk/.test(a.command) && /END/.test(a.command) && a.output === "635\n",
};
