import { type Level, fileText } from "./types";

const lines = ["groceries: milk, eggs", "call mom", "dentist friday 10:00", "wifi password: hunter2", "buy birthday gift"];

export const level: Level = {
  title: "Level 39: Delete a line",
  story: "Whoops, a password ended up in notes.txt (it's line 4). Delete that line from the file itself and keep everything else.",
  hint: "sed 'Nd' deletes line N, and /word/d deletes lines containing a word. Add -i to change the file instead of just printing.",
  files: { "/home/user/notes.txt": lines.join("\n") + "\n" },
  solution: ["sed 4d notes.txt", "sed -i 4d notes.txt"],
  check: (a) => fileText(a, "/home/user/notes.txt") === lines.filter((_, i) => i !== 3).join("\n") + "\n",
};
