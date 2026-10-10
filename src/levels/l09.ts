import { type Level, lineCount } from "./types";

const conf = [
  "# Server config",
  "port=8080",
  "# database",
  "db_host=localhost",
  "db_user=admin",
  "# cache",
  "cache=on",
  "debug=false",
  "# misc",
  "timeout=30",
].join("\n") + "\n";

export const level: Level = {
  title: "Level 9: Skip the noise",
  story: "app.conf is full of # comments. Print only the real settings, with every comment line left out.",
  hint: "grep -v flips the match: it prints the lines that do NOT contain the pattern.",
  files: { "/home/user/app.conf": conf },
  solution: ['grep -v "#" app.conf'],
  check: (a) => /grep/.test(a.command) && !a.output.includes("#") && lineCount(a.output) === 6 && a.output.includes("port=8080"),
};
