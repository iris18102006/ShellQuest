import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 20: Backup first",
  story: "You're about to mess with config.ini. Make a copy called config.ini.bak first, and leave the original where it is.",
  hint: "cp source destination",
  files: { "/home/user/config.ini": "mode=production\nretries=3\n" },
  solution: ["cp config.ini config.ini.bak"],
  check: (a) => {
    const orig = fileText(a, "/home/user/config.ini");
    return orig !== null && fileText(a, "/home/user/config.ini.bak") === orig;
  },
};
