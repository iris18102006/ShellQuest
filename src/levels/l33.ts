import { type Level, lineCount } from "./types";

export const level: Level = {
  title: "Level 33: Dig through everything",
  story: "TODO comments are scattered all over the project folder, in subfolders too. Show me every line that says TODO, and which file it lives in.",
  hint: "grep -r searches a folder and everything inside it: grep -r TODO project",
  files: {
    "/home/user/project/main.py": "import app\n# TODO: add logging\nprint('hi')\n",
    "/home/user/project/app/routes.py": "def home():\n    return 'ok'  # TODO: real homepage\n",
    "/home/user/project/app/db.py": "def connect():\n    pass\n",
    "/home/user/project/docs/notes.md": "# Notes\nTODO: write docs\n",
    "/home/user/project/README.md": "A small app\n",
  },
  solution: ["grep TODO project", "grep -r TODO project"],
  check: (a) =>
    /grep/.test(a.command) &&
    lineCount(a.output) === 3 &&
    ["project/main.py:", "project/app/routes.py:", "project/docs/notes.md:"].every((p) => a.output.includes(p)),
};
