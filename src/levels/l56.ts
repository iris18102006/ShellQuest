import type { Level } from "./types";

const log = [
  "10:01 INFO server started",
  "10:03 ERROR db timeout",
  "10:04 INFO user login",
  "10:09 ERROR disk full",
  "10:15 WARN slow request",
  "10:21 ERROR db timeout",
  "10:30 INFO user logout",
  "10:44 ERROR out of memory",
].join("\n") + "\n";

export const level: Level = {
  title: "Level 56: Name it once",
  story: "You keep typing the same long filename. Store server.log in a variable called LOG, then count how many ERROR lines it has, using $LOG instead of the filename.",
  hint: "LOG=server.log, then grep -c ERROR $LOG. You can also do both in one line with a ; between them.",
  files: { "/home/user/server.log": log },
  solution: ["LOG=server.log", "grep -c ERROR $LOG"],
  check: (a) => /\$\{?LOG\}?/.test(a.command) && a.output === "4\n",
};
