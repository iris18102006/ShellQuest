import { type Level, fileText } from "./types";

const cfg = "[server]\nhost=localhost\nport=8080\n[db]\nhost=localhost\nuser=admin\n";

export const level: Level = {
  title: "Level 38: Edit in place",
  story: "config.ini points at localhost, but production lives at 10.0.0.5. Change every localhost to 10.0.0.5 inside the file itself. Printing the result isn't enough, the file has to change.",
  hint: "sed -i edits the file directly: sed -i 's/localhost/10.0.0.5/g' config.ini",
  files: { "/home/user/config.ini": cfg },
  solution: ["sed 's/localhost/10.0.0.5/g' config.ini", "sed -i 's/localhost/10.0.0.5/g' config.ini"],
  check: (a) => fileText(a, "/home/user/config.ini") === cfg.replace(/localhost/g, "10.0.0.5"),
};
