import type { Level } from "./types";

export const level: Level = {
  title: "Level 41: Filter and print",
  story: "sales.csv is name,region,sales. Print the names of everyone who sold MORE than 100. Exactly 100 doesn't count.",
  hint: "awk can test a column before printing: awk -F, '$3 > 100 {print $1}' sales.csv. -F, sets the separator.",
  files: { "/home/user/sales.csv": "maya,north,140\njon,south,95\nlea,east,210\nomar,north,100\nzoe,west,101\n" },
  solution: ["cat sales.csv", "awk -F, '$3 > 100 {print $1}' sales.csv"],
  check: (a) => /awk/.test(a.command) && a.output === "maya\nlea\nzoe\n",
};
