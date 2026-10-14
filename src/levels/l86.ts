import { type Level, fileText } from "./types";

const entries = [
  { path: "notes", dir: true, mode: 0o755 },
  { path: "notes/todo.txt", dir: false, mode: 0o644, content: "ship it\n" },
];

export const level: Level = {
  title: "Level 86: Unpack it somewhere else",
  story: "drop.tar has a notes folder inside. Unpack it into the inbox folder, not into your home folder.",
  hint: "-x extracts, -C picks the folder to unpack into: tar -xf drop.tar -C inbox",
  files: {
    "/home/user/drop.tar": "SQTAR1\n" + JSON.stringify(entries),
    "/home/user/inbox/.keep": "",
  },
  solution: ["tar -xf drop.tar -C inbox"],
  check: (a) => fileText(a, "/home/user/inbox/notes/todo.txt") === "ship it\n",
};
