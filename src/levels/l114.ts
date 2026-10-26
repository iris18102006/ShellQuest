import { type Level } from "./types";

export const level: Level = {
  title: "Level 114: Say your name",
  story: "Store the name iris in a variable called NAME, then print: hello iris. Use the variable, don't type the name twice in the echo.",
  hint: "NAME=iris; echo hello $NAME",
  files: {},
  solution: ["NAME=iris; echo hello $NAME"],
  check: (a) => /NAME=/.test(a.command) && /\$\{?NAME\}?/.test(a.command) && a.output === "hello iris\n",
};
