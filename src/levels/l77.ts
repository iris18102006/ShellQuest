import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 77: Count without typing the number",
  story: "Print exactly: There are 3 tasks. Use command substitution to count the lines in tasks.txt.",
  hint: "echo \"There are $(wc -l < tasks.txt) tasks\"",
  files: { "/home/user/tasks.txt": 'write tests\nreview PR\nship release\n' },
  solution: ["echo \"There are $(wc -l < tasks.txt) tasks\""],
  check: (a) => /\$\(/.test(a.command) && a.output === "There are 3 tasks\n",
};
