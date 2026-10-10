import { type Level, fileText } from "./types";

const lines = Array.from({ length: 20 }, (_, i) => (i % 5 === 2 ? `ERROR disk_${i}` : `INFO ok_${i}`));
const errors = lines.filter((l) => l.startsWith("ERROR")).join("\n") + "\n";

export const level: Level = {
  title: "Level 30: Save the evidence",
  story: "Pull every ERROR line out of system.log and save just those lines into a new file called errors.txt.",
  hint: "grep prints matches. > sends them into a file instead of the screen.",
  files: { "/home/user/system.log": lines.join("\n") + "\n" },
  solution: ["grep ERROR system.log > errors.txt"],
  check: (a) => fileText(a, "/home/user/errors.txt") === errors,
};
