import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 116: Greeter script",
  story: "Write greet.sh so that it prints 'Hello NAME' using its first argument. Then run it with sh and the name Sam.",
  hint: "echo 'echo Hello $1' > greet.sh   then   sh greet.sh Sam",
  files: {},
  solution: ["echo 'echo Hello $1' > greet.sh", "sh greet.sh Sam"],
  check: (a) => a.output === "Hello Sam\n" && (fileText(a, "/home/user/greet.sh") ?? "").includes("$1"),
};
