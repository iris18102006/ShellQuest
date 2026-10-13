import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 68: Extract the usernames",
  story: "accounts.csv stores username,role,team. Print only the usernames from every row.",
  hint: "cut -d, -f1 accounts.csv",
  files: { "/home/user/accounts.csv": 'iris,admin,core\nmax,editor,web\nlea,viewer,ops\n' },
  solution: ["cut -d, -f1 accounts.csv"],
  check: (a) => a.output === "iris\nmax\nlea\n",
};
