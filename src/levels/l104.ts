import { type Level } from "./types";

export const level: Level = {
  title: "Level 104: Add up the costs",
  story: "costs.csv is item,price. Print the total of the price column as one number.",
  hint: "awk -F, '{ s += $2 } END { print s }' costs.csv",
  files: {
    "/home/user/costs.csv": "tea,10\nbread,20\nmilk,30\n",
  },
  solution: ["cat costs.csv", "awk -F, '{ s += $2 } END { print s }' costs.csv"],
  check: (a) => /awk/.test(a.command) && a.output === "60\n",
};
