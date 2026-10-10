import type { Level } from "./types";

export const level: Level = {
  title: "Level 7: Folders all the way down",
  story: "Set up your workspace: you need the folder projects/2026/ideas inside your home folder. None of it exists yet. Make it in one command.",
  hint: "mkdir -p creates every missing folder along the path.",
  files: { "/home/user/todo.txt": "buy milk\n" },
  solution: ["mkdir -p projects/2026/ideas"],
  check: (a) => /mkdir/.test(a.command) && a.fs.get("/home/user/projects/2026/ideas")?.type === "dir",
};
