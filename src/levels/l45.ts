import { type Level, fileText } from "./types";

const day1 = [
  "2026-10-09 03:12:44 FAILED login user=root ip=203.0.113.9",
  "2026-10-09 03:13:01 OK login user=maya ip=10.0.0.4",
  "2026-10-09 04:40:10 FAILED login user=admin ip=198.51.100.23",
];
const day2 = [
  "2026-10-10 01:02:03 OK login user=jon ip=10.0.0.9",
  "2026-10-10 01:02:55 FAILED login user=root ip=203.0.113.9",
  "2026-10-10 02:15:30 FAILED login user=guest ip=192.0.2.77",
];
const day3 = [
  "2026-10-11 00:05:12 FAILED login user=admin ip=198.51.100.23",
  "2026-10-11 00:06:40 OK login user=lea ip=10.0.0.12",
];
const expected = ["192.0.2.77", "198.51.100.23", "203.0.113.9"].join("\n") + "\n";

export const level: Level = {
  title: "Level 45: Boss, the breach report",
  story: "Three days of login logs sit in /var/log/auth. Build a blocklist: every IP with a FAILED login, one per line, no duplicates, sorted, saved to blocklist.txt in your home folder. One pipeline, no hand-copying.",
  hint: "grep -r FAILED /var/log/auth | awk '{print $NF}' | cut -d= -f2 | sort -u > blocklist.txt. $NF is the last column, and cut -d= -f2 peels off the 'ip=' part.",
  files: {
    "/var/log/auth/day1.log": day1.join("\n") + "\n",
    "/var/log/auth/day2.log": day2.join("\n") + "\n",
    "/var/log/auth/day3.log": day3.join("\n") + "\n",
  },
  solution: [
    "grep -r FAILED /var/log/auth",
    "grep -r FAILED /var/log/auth | awk '{print $NF}' | cut -d= -f2 | sort -u > blocklist.txt",
  ],
  check: (a) => fileText(a, "/home/user/blocklist.txt") === expected,
};
