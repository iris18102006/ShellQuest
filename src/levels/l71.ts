import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 71: Replace the old port",
  story: "service.conf uses port 8080. Print the config with every 8080 replaced by 3000. Do not edit the original file.",
  hint: "sed s/8080/3000/g service.conf",
  files: { "/home/user/service.conf": 'host=localhost\nport=8080\nbackup_port=8080\n' },
  solution: ["sed s/8080/3000/g service.conf"],
  check: (a) => a.output === "host=localhost\nport=3000\nbackup_port=3000\n",
};
