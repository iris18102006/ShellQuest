import type { Level } from "./types";

export const level: Level = {
  title: "Level 1: Hidden in plain sight",
  story: "Someone left a note in your home folder, but it doesn't show up in a normal listing. Find it and read it.",
  hint: "Hidden files start with a dot. ls -a shows them, cat prints them.",
  files: {
    "/home/user/todo.txt": "buy milk\nlearn linux\n",
    "/home/user/.hidden_note": "FLAG{dotfiles_are_not_invisible}\n",
  },
  solution: ["ls", "ls -a", "cat .hidden_note"],
  check: (a) => a.output.includes("FLAG{dotfiles_are_not_invisible}"),
};
