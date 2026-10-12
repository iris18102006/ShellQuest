import type { Level } from "./types";

const log = [
  "09:00 server started",
  "09:05 user maya logged in",
  "09:12 disk usage 81%",
  "09:30 backup finished",
  "09:41 user jon logged in",
];
const expected = [...log].reverse().join("\n") + "\n";

export const level: Level = {
  title: "Level 47: Newest first",
  story: "events.log is written oldest to newest, but you want to read the latest events first. Print the whole file in reverse order, last line on top.",
  hint: "tac is cat backwards: tac events.log",
  files: { "/home/user/events.log": log.join("\n") + "\n" },
  solution: ["cat events.log", "tac events.log"],
  check: (a) => /tac/.test(a.command) && a.output === expected,
};
