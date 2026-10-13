import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 64: Keep the clean lines",
  story: "users.txt has active and disabled accounts. Print only the lines that do NOT contain disabled.",
  hint: "grep -v disabled users.txt",
  files: { "/home/user/users.txt": 'iris active\nmax disabled\nlea active\nzoe disabled\n' },
  solution: ["grep -v disabled users.txt"],
  check: (a) => a.output === "iris active\nlea active\n",
};
