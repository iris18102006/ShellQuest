import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 90: Loop it",
  story: "Write list.sh with a for-loop that prints 'found: NAME' for every .txt file here. Then run it with sh. Mind your quotes: $f has to reach the script untouched.",
  hint: "echo 'for f in *.txt; do echo found: $f; done' > list.sh  then  sh list.sh",
  files: { "/home/user/a.txt": "", "/home/user/b.txt": "", "/home/user/c.txt": "", "/home/user/skip.md": "" },
  solution: ["echo 'for f in *.txt; do echo found: $f; done' > list.sh", "sh list.sh"],
  check: (a) => a.output === "found: a.txt\nfound: b.txt\nfound: c.txt\n" && (fileText(a, "/home/user/list.sh") ?? "").includes("for "),
};
