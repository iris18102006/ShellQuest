import { type Level } from "./types";

export const level: Level = {
  title: "Level 111: Folders only",
  story: "This project is a maze of files and folders. List every FOLDER (not files), starting from here.",
  hint: "find . -type d",
  files: {
    "/home/user/src/main.c": "",
    "/home/user/src/util/helpers.c": "",
    "/home/user/docs/readme.txt": "",
    "/home/user/notes.txt": "",
  },
  solution: ["ls", "find . -type d"],
  check: (a) => /find/.test(a.command) && a.output.includes("./src/util") && a.output.includes("./docs") && !a.output.includes(".c") && !a.output.includes(".txt"),
};
