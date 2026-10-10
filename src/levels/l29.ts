import type { Level } from "./types";

export const level: Level = {
  title: "Level 29: Eyes only",
  story: "secret.sh is yours and yours alone. Make it so you can read, write and run it, and nobody else can do anything with it. Then run it.",
  hint: "Owner gets 7 (read+write+execute), group and others get 0: chmod 700 secret.sh",
  files: { "/home/user/secret.sh": { content: "#!/bin/sh\necho hi\n", mode: 0o644, exec: "FLAG{only_me}" } },
  solution: ["./secret.sh", "chmod 700 secret.sh", "./secret.sh"],
  check: (a) => a.output.includes("FLAG{only_me}") && a.fs.get("/home/user/secret.sh")?.mode === 0o700,
};
