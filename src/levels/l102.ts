import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 102: Edit in place",
  story: "config.txt says version=v1. Change it to v2 IN THE FILE itself.",
  hint: "sed -i edits the file directly: sed -i 's/v1/v2/' config.txt",
  files: {
    "/home/user/config.txt": "name=app\nversion=v1\n",
  },
  solution: ["cat config.txt", "sed -i 's/v1/v2/' config.txt"],
  check: (a) => fileText(a, "/home/user/config.txt") === "name=app\nversion=v2\n",
};
