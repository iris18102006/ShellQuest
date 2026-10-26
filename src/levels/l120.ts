import { type Level } from "./types";

export const level: Level = {
  title: "Level 120: Boss: the average",
  story: "sales.csv is name,region,amount. Print the average amount as one number (total divided by the number of rows).",
  hint: "awk -F, '{ s += $3 } END { print s / NR }' sales.csv",
  files: {
    "/home/user/sales.csv": "maya,north,100\njon,south,200\nlea,east,300\n",
  },
  solution: ["cat sales.csv", "awk -F, '{ s += $3 } END { print s / NR }' sales.csv"],
  check: (a) => /awk/.test(a.command) && a.output === "200\n",
};
