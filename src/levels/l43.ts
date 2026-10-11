import { type Level, fileText } from "./types";

const files = {
  "/home/user/project/index.html": "<h1>site</h1>\n",
  "/home/user/project/css/style.css": "body { margin: 0 }\n",
  "/home/user/project/js/app.js": "console.log('app')\n",
  "/home/user/project/js/utils.js": "export const x = 1\n",
};

export const level: Level = {
  title: "Level 43: Clone the folder",
  story: "Back up the whole project folder as project_backup, with every file in every subfolder. The original stays where it is.",
  hint: "cp refuses folders unless you add -r (recursive): cp -r project project_backup",
  files,
  solution: ["cp project project_backup", "cp -r project project_backup"],
  check: (a) =>
    Object.entries(files).every(([path, text]) =>
      fileText(a, path.replace("/project/", "/project_backup/")) === text && fileText(a, path) === text),
};
