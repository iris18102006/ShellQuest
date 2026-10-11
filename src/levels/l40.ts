import type { Level } from "./types";

const procs = [["1042", "firefox", "12.5"], ["2210", "code", "8.1"], ["3317", "spotify", "3.4"], ["4091", "node", "21.0"]];
const pad = (r: string[]) => `${r[0].padEnd(7)}${r[1].padEnd(12)}${r[2]}`;

export const level: Level = {
  title: "Level 40: Pick a column",
  story: "processes.txt lists PID, name and CPU, padded with a random number of spaces. cut chokes on that. Print just the process names (column 2).",
  hint: "awk splits on any amount of whitespace: awk '{print $2}' processes.txt",
  files: { "/home/user/processes.txt": procs.map(pad).join("\n") + "\n" },
  solution: ["cat processes.txt", "awk '{print $2}' processes.txt"],
  check: (a) => /awk/.test(a.command) && a.output === procs.map((p) => p[1]).join("\n") + "\n",
};
