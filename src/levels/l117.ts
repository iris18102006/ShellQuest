import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 117: How many arguments",
  story: "Write count.sh so it prints how many arguments it received. Run it with three arguments: red green blue.",
  hint: "echo 'echo $#' > count.sh   then   sh count.sh red green blue   ($# is the count)",
  files: {},
  solution: ["echo 'echo $#' > count.sh", "sh count.sh red green blue"],
  check: (a) => a.output === "3\n" && (fileText(a, "/home/user/count.sh") ?? "").includes("$#"),
};
