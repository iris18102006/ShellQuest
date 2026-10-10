import type { Level } from "./types";

export const level: Level = {
  title: "Level 18: Lost in the tree",
  story: "You're deep inside a project (check your prompt). readme.txt lives two folders up from where you are. Read it.",
  hint: ".. means 'the folder above'. So ../.. is two folders up: cat ../../readme.txt",
  cwd: "/home/user/projects/web/src",
  files: {
    "/home/user/projects/readme.txt": "FLAG{dotdot_is_up}\n",
    "/home/user/projects/web/src/index.js": "console.log('hi')\n",
  },
  solution: ["pwd", "cat ../../readme.txt"],
  check: (a) => a.output.includes("FLAG{dotdot_is_up}"),
};
