import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 6: Say it with echo",
  story: "Create a file called note.txt in your home folder that contains exactly this text: hello shellquest",
  hint: "echo prints text. The > symbol sends that output into a file instead of the screen.",
  files: { "/home/user/todo.txt": "buy milk\n" },
  solution: ["echo hello shellquest > note.txt"],
  check: (a) => fileText(a, "/home/user/note.txt")?.trim() === "hello shellquest",
};
