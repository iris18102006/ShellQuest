import type { Level } from "./types";

export const level: Level = {
  title: "Level 17: Lock it down",
  story: "private.key is readable by everyone. Make it so only you can read and write it, and nobody else can do anything with it.",
  hint: "Run ls -l first. Numeric modes: 6 = read+write, 0 = nothing. So chmod 600 private.key",
  files: { "/home/user/private.key": { content: "-----KEY-----\n", mode: 0o644 } },
  solution: ["ls -l", "chmod 600 private.key"],
  check: (a) => a.fs.get("/home/user/private.key")?.mode === 0o600,
};
