import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 118: Error census",
  story: "Write census.sh that loops over every .log file and prints its ERROR count, one number per file. Then run it.",
  hint: "echo 'for f in *.log; do grep -c ERROR $f; done' > census.sh   then   sh census.sh",
  files: {
    "/home/user/x.log": "ERROR a\nINFO b\nERROR c\n",
    "/home/user/y.log": "INFO ok\n",
    "/home/user/z.log": "ERROR boom\n",
  },
  solution: ["echo 'for f in *.log; do grep -c ERROR $f; done' > census.sh", "sh census.sh"],
  check: (a) => a.output === "2\n0\n1\n" && (fileText(a, "/home/user/census.sh") ?? "").includes("for "),
};
