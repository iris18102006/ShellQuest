import { type Level, fileText } from "./types";

const report = "Q3 totals: all good\n";

export const level: Level = {
  title: "Level 54: Two jobs, one line",
  story: "Make a folder called backup and copy report.txt into it, all in ONE line. The copy should only run if the folder was created, so don't just use two separate commands.",
  hint: "&& runs the next command only if the one before it worked: mkdir backup && cp report.txt backup",
  files: { "/home/user/report.txt": report },
  solution: ["ls", "mkdir backup && cp report.txt backup"],
  check: (a) => /&&/.test(a.command) && fileText(a, "/home/user/backup/report.txt") === report,
};
