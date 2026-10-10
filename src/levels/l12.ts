import { type Level, lineCount } from "./types";

const ini = (): string => {
  const rows = Array.from({ length: 30 }, (_, i) => `setting_${i + 1}=value_${i + 1}`);
  rows[16] = "admin_password=hunter2";
  return rows.join("\n") + "\n";
};

export const level: Level = {
  title: "Level 12: Line number, please",
  story: "Someone hard-coded a password in settings.ini. Find the line, and show its line number so you can go fix it.",
  hint: "grep -n puts the line number in front of every match.",
  files: { "/home/user/settings.ini": ini() },
  solution: ["grep -n password settings.ini"],
  check: (a) => /grep/.test(a.command) && a.output.startsWith("17:") && lineCount(a.output) === 1,
};
