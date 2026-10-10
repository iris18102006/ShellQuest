import { type Level, lineCount } from "./types";

const visitors = (): string => {
  const ips = ["10.0.0.4", "10.0.0.9", "10.0.0.12", "10.0.0.31", "198.51.100.23"];
  const rows: string[] = [];
  for (let i = 0; i < 40; i++) rows.push(i % 3 === 0 ? "198.51.100.23" : ips[(i * 7) % 4]);
  return rows.join("\n") + "\n";
};

export const level: Level = {
  title: "Level 3: Pipe dreams",
  story: "visitors.txt lists one IP per visit. Find the single IP that visited the most, and print only that line (with its count is fine).",
  hint: "sort groups equal lines, uniq -c counts them, sort -rn ranks, head -n 1 keeps the winner. Chain them with |",
  files: { "/home/user/visitors.txt": visitors() },
  solution: ["sort visitors.txt | uniq -c | sort -rn | head -n 1"],
  check: (a) => a.command.includes("|") && a.output.includes("198.51.100.23") && lineCount(a.output) === 1,
};
