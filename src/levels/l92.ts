import { type Level } from "./types";

export const level: Level = {
  title: "Level 92: Count the logs",
  story: "There are a few .log files in this folder. Print how many there are, as a single number.",
  hint: "find lists one name per line, so wc -l can count them: find . -name '*.log' | wc -l",
  files: {
    "/home/user/a.txt": "",
    "/home/user/b.txt": "",
    "/home/user/app.log": "",
    "/home/user/db.log": "",
    "/home/user/web.log": "",
  },
  solution: ["ls", "find . -name '*.log' | wc -l"],
  check: (a) => /wc/.test(a.command) && a.output === "3\n",
};
