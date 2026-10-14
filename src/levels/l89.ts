import { type Level } from "./types";

export const level: Level = {
  title: "Level 89: No execute bit needed",
  story: "report.sh is read-only for everyone, and its permissions must stay exactly as they are. Run it anyway to print the error count. (Hint: you can hand a script to a shell.)",
  hint: "sh report.sh  (or bash report.sh) runs a script without +x",
  files: {
    "/home/user/report.sh": { content: "grep -c ERROR app.log\n", mode: 0o644 },
    "/home/user/app.log": "ERROR a\nINFO b\nERROR c\nERROR d\nWARN e\n",
  },
  solution: ["sh report.sh"],
  check: (a) => /^(sh|bash) /.test(a.command) && a.output === "3\n" && a.fs.get("/home/user/report.sh")?.mode === 0o644,
};
