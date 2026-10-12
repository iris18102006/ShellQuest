import type { Level } from "./types";

const oldConf = ["name=shellquest", "port=8080", "theme=dark", "lang=en"];
const newConf = ["name=shellquest", "port=9090", "theme=dark", "lang=en", "debug=true"];

export const level: Level = {
  title: "Level 61: What changed?",
  story: "Someone edited the server config. old.conf is the backup and new.conf is what's live now. Compare them, then show ONLY the lines that are new in new.conf (with their marker), so you can see what was added or changed.",
  hint: "diff old.conf new.conf marks old lines with < and new lines with >. Keep just the > lines: diff old.conf new.conf | grep '^>'",
  files: {
    "/home/user/old.conf": oldConf.join("\n") + "\n",
    "/home/user/new.conf": newConf.join("\n") + "\n",
  },
  solution: ["diff old.conf new.conf", "diff old.conf new.conf | grep '^>'"],
  check: (a) => /diff/.test(a.command) && a.output === "> port=9090\n> debug=true\n",
};
