import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 76: Use the home variable",
  story: "Print the path to your home directory using the HOME variable, not by typing the path literally.",
  hint: "echo $HOME",
  files: { "/home/user/readme.txt": 'hello\n' },
  solution: ["echo $HOME"],
  check: (a) => a.output === "/home/user\n",
};
