import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 80: Find the unfinished files",
  story: "The project folder has .todo and .done files, including in subfolders. List every .todo file.",
  hint: "find project -name \"*.todo\"",
  files: { "/home/user/project/readme.txt": "overview\n", "/home/user/project/plan.todo": "plan\n", "/home/user/project/archive/tasks.todo": "tasks\n", "/home/user/project/archive/old.done": "done\n" },
  solution: ["find project -name \"*.todo\""],
  check: (a) => a.output.includes("project/plan.todo") && a.output.includes("project/archive/tasks.todo") && !a.output.includes("old.done"),
};
