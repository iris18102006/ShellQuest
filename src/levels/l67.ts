import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 67: Last two events",
  story: "events.log has five events. Print only the two most recent lines.",
  hint: "tail -n 2 events.log",
  files: { "/home/user/events.log": 'boot\nlogin\nupdate\nbackup\nshutdown\n' },
  solution: ["tail -n 2 events.log"],
  check: (a) => a.output === "backup\nshutdown\n",
};
