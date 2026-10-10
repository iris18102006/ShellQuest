import type { Level } from "./types";

export const level: Level = {
  title: "Level 26: Only the real config files",
  story: "List every .conf FILE under /etc. Watch out: one folder is also named something.conf, and it doesn't count.",
  hint: "find /etc -name \"*.conf\" -type f   (-type f means files only, -type d means directories only)",
  files: {
    "/etc/app.conf": "a=1\n",
    "/etc/backup.conf/readme.txt": "this is a folder, not a config\n",
    "/etc/nginx/nginx.conf": "worker=1\n",
    "/etc/nginx/sites/default.conf": "listen=80\n",
    "/etc/ssh/sshd_config": "Port 22\n",
  },
  solution: ['find /etc -name "*.conf"', 'find /etc -name "*.conf" -type f'],
  check: (a) => {
    const names = a.output.trim().split("\n").map((l) => l.split("/").pop()).sort();
    return /find/.test(a.command) && JSON.stringify(names) === JSON.stringify(["app.conf", "default.conf", "nginx.conf"]);
  },
};
