import { type Level, lineCount } from "./types";

const report = [
  "Error: disk full",
  "all systems nominal",
  "ERROR: cannot reach database",
  "warning: slow response",
  "error: file not found",
  "backup finished",
  "Error: timeout after 30s",
  "user logged in",
  "ERROR: out of memory",
  "done",
].join("\n") + "\n";

export const level: Level = {
  title: "Level 13: SHOUTING and whispering",
  story: "report.txt mixes Error, ERROR and error. Print every line that mentions an error, no matter how it's capitalised.",
  hint: "grep is case sensitive by default. grep -i ignores case.",
  files: { "/home/user/report.txt": report },
  solution: ["grep error report.txt", "grep -i error report.txt"],
  check: (a) => /grep/.test(a.command) && lineCount(a.output) === 5,
};
