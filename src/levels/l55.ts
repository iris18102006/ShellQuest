import type { Level } from "./types";

export const level: Level = {
  title: "Level 55: Say it with a variable",
  story: "Store the word quest in a variable called GAME. Then print the sentence: I love quest. The word quest must come from the variable, so don't type it in the echo.",
  hint: "Set it with NAME=value (no spaces around the =), read it with a dollar sign: GAME=quest, then echo \"I love $GAME\"",
  files: {},
  solution: ["GAME=quest", "echo \"I love $GAME\""],
  check: (a) => /\$\{?GAME\}?/.test(a.command) && a.output === "I love quest\n",
};
