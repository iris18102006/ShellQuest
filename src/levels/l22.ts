import type { Level } from "./types";

// 60 requests, 4 IPs, mixed statuses. Count how many 404s came from the suspicious IP.
const IPS = ["198.51.100.23", "10.0.0.4", "10.0.0.9", "10.0.0.12"];
const STATUS = [200, 200, 404, 500, 200, 404];
const rows = Array.from({ length: 60 }, (_, i) => `${IPS[i % 4]} GET /page_${i} ${STATUS[i % 6]}`);
const expected = rows.filter((r) => r.startsWith("198.51.100.23") && r.endsWith(" 404")).length;

export const level: Level = {
  title: "Level 22: Boss, the access log",
  story: "Somebody at 198.51.100.23 is poking around. access.log has a line per request: IP, method, path, status. How many of THAT IP's requests came back 404? Give me only the number.",
  hint: "Chain two greps with a pipe (one for the IP, one for 404), then count with wc -l.",
  files: { "/home/user/access.log": rows.join("\n") + "\n" },
  solution: ["grep 198.51.100.23 access.log | grep 404 | wc -l"],
  check: (a) => a.output.trim() === String(expected),
};
