import { type Level } from "./types";

export const level: Level = {
  title: "Level 94: Just the ending",
  story: "todo.txt has five lines. I only care about the last three.",
  hint: "tail -n 3 todo.txt",
  files: {
    "/home/user/todo.txt": "one\ntwo\nthree\nfour\nfive\n",
  },
  solution: ["cat todo.txt", "tail -n 3 todo.txt"],
  check: (a) => a.output === "three\nfour\nfive\n",
};
