import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 82: Build the error report",
  story: "Search the app logs for ERROR, extract the IP field, remove duplicates, sort the results, and save them to ips.txt.",
  hint: "grep ERROR app.log | cut -d= -f2 | sort -u > ips.txt",
  files: { "/home/user/app.log": 'ERROR ip=10.0.0.2\nINFO ip=10.0.0.3\nERROR ip=10.0.0.1\nERROR ip=10.0.0.2\n' },
  solution: ["grep ERROR app.log | cut -d= -f2 | sort -u > ips.txt"],
  check: (a) => fileText(a, "/home/user/ips.txt") === "10.0.0.1\n10.0.0.2\n",
};
