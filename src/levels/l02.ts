import { type Level, lineCount } from "./types";

// Deterministic "random" data so the level is the same every run.
const logLines = (): string => {
  const lvl = ["INFO", "INFO", "INFO", "WARN", "INFO", "ERROR"];
  const rows: string[] = [];
  for (let i = 0; i < 60; i++) {
    rows.push(`2026-10-04 03:${String(i % 60).padStart(2, "0")} ${lvl[i % lvl.length]} job_${i} finished`);
  }
  rows[37] = "2026-10-04 03:37 CRITICAL login as root from 203.0.113.66";
  return rows.join("\n") + "\n";
};

export const level: Level = {
  title: "Level 2: Needle in a log",
  story: "server.log has 60 lines and exactly one is CRITICAL. Print only that line.",
  hint: "grep CRITICAL server.log",
  files: { "/home/user/server.log": logLines() },
  solution: ["grep CRITICAL server.log"],
  check: (a) => /grep/.test(a.command) && a.output.includes("203.0.113.66") && lineCount(a.output) === 1,
};
