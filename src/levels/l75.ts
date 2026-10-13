import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 75: Backup only after success",
  story: "Create an archive folder, then copy report.txt into it in the same line. The copy should happen only if mkdir succeeds.",
  hint: "mkdir archive && cp report.txt archive",
  files: { "/home/user/report.txt": 'weekly total: 42\n' },
  solution: ["mkdir archive && cp report.txt archive"],
  check: (a) => /&&/.test(a.command) && fileText(a, "/home/user/archive/report.txt") === "weekly total: 42\n",
};
