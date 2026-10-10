import type { Level } from "./types";

// 50 lines, every 4th one (starting at line 2) is an ERROR -> 13 errors.
const log = (): string => {
  const rows: string[] = [];
  for (let i = 0; i < 50; i++) rows.push(`${i % 4 === 1 ? "ERROR" : "INFO"} job_${i} finished`);
  return rows.join("\n") + "\n";
};

export const level: Level = {
  title: "Level 10: Count the damage",
  story: "How many ERROR lines are in app.log? Don't print them, just give me the number.",
  hint: "grep -c counts matching lines. Or pipe grep into wc -l.",
  files: { "/home/user/app.log": log() },
  solution: ["grep -c ERROR app.log"],
  check: (a) => a.output.trim() === "13",
};
