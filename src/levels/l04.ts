import type { Level } from "./types";

export const level: Level = {
  title: "Level 4: Permission denied",
  story: "There's a script called run.sh in your home folder. It won't run. Make it run.",
  hint: "Try ./run.sh, read the error, then chmod +x run.sh",
  files: {
    "/home/user/run.sh": { content: "#!/bin/sh\necho secret\n", mode: 0o644, exec: "ACCESS GRANTED\nFLAG{chmod_plus_x}" },
  },
  solution: ["./run.sh", "chmod +x run.sh", "./run.sh"],
  check: (a) => a.output.includes("FLAG{chmod_plus_x}"),
};
