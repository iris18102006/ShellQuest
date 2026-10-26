import { type Level } from "./types";

export const level: Level = {
  title: "Level 100: Century: the busiest visitor",
  story: "access.log starts every line with the visitor's IP. Print the single busiest IP with its hit count (the count first, then the IP).",
  hint: "cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 1",
  files: {
    "/home/user/access.log": "10.0.0.5 GET /\n10.0.0.9 GET /a\n10.0.0.5 GET /b\n10.0.0.2 GET /\n10.0.0.5 POST /c\n10.0.0.9 GET /d\n",
  },
  solution: ["cat access.log", "cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 1"],
  check: (a) => a.output.trim().replace(/\s+/g, " ") === "3 10.0.0.5",
};
