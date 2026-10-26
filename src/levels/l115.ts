import { type Level } from "./types";

export const level: Level = {
  title: "Level 115: Command inside a command",
  story: "Print the sentence: I have 4 files, where 4 comes from counting the files here with find (don't type the number!).",
  hint: "echo \"I have $(find . -type f | wc -l) files\"",
  files: {
    "/home/user/a": "",
    "/home/user/b": "",
    "/home/user/c": "",
    "/home/user/d": "",
  },
  solution: ["find . -type f | wc -l", "echo \"I have $(find . -type f | wc -l) files\""],
  check: (a) => a.command.includes("$(") && a.output === "I have 4 files\n",
};
