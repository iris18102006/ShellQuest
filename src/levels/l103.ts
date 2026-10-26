import { type Level } from "./types";

export const level: Level = {
  title: "Level 103: Drop the comments",
  story: "settings.conf has comment lines that start with #. Print only the real settings.",
  hint: "grep -v '^#' settings.conf   (^ means start of line)",
  files: {
    "/home/user/settings.conf": "# network\nport=80\n# debug off\ndebug=false\nhost=local\n",
  },
  solution: ["cat settings.conf", "grep -v '^#' settings.conf"],
  check: (a) => a.output === "port=80\ndebug=false\nhost=local\n",
};
