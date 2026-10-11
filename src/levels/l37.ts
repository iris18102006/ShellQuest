import type { Level } from "./types";

const letter = "Dear NAME,\nThanks NAME for joining. Yes, you, NAME.\nSee you soon, NAME!\n";

export const level: Level = {
  title: "Level 37: Find and replace",
  story: "letter.txt is a template full of NAME placeholders. Print the letter with every NAME replaced by Alex. Every one, even when a line has two.",
  hint: "sed 's/NAME/Alex/g' letter.txt. The g at the end means 'all of them on the line', not just the first.",
  files: { "/home/user/letter.txt": letter },
  solution: ["sed 's/NAME/Alex/' letter.txt", "sed 's/NAME/Alex/g' letter.txt"],
  check: (a) => /sed/.test(a.command) && a.output === letter.replace(/NAME/g, "Alex"),
};
