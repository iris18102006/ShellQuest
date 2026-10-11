import type { Level } from "./types";

export const level: Level = {
  title: "Level 34: Names only, please",
  story: "Something crashed last night. Which log files in this folder mention CRITICAL? I don't want the log lines, just the file names.",
  hint: "grep -l prints only the names of files that match: grep -l CRITICAL *.log",
  cwd: "/var/log/app",
  files: {
    "/var/log/app/web.log": "INFO started\nINFO request ok\n",
    "/var/log/app/db.log": "INFO started\nCRITICAL disk full\n",
    "/var/log/app/cache.log": "WARN slow response\n",
    "/var/log/app/auth.log": "INFO login\nCRITICAL token store down\nCRITICAL retry failed\n",
  },
  solution: ["ls", "grep CRITICAL *.log", "grep -l CRITICAL *.log"],
  check: (a) => {
    const names = a.output.trim().split("\n").map((l) => l.split("/").pop()).sort();
    return /grep\s+-\w*l/.test(a.command) && JSON.stringify(names) === JSON.stringify(["auth.log", "db.log"]);
  },
};
