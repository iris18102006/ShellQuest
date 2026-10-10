import type { Level } from "./types";

export const level: Level = {
  title: "Level 5: Treasure hunt",
  story: "A file named master.key is buried somewhere under /srv. Locate it and read what's inside.",
  hint: "find /srv -name master.key, then cat the path it prints.",
  files: {
    "/srv/app/notes.txt": "nothing here\n",
    "/srv/app/cache/tmp/master.key.bak": "decoy\n",
    "/srv/backups/2025/archive/deep/master.key": "FLAG{find_is_a_superpower}\n",
    "/srv/www/index.html": "<h1>hi</h1>\n",
  },
  solution: ["find /srv -name master.key", "cat /srv/backups/2025/archive/deep/master.key"],
  check: (a) => a.output.includes("FLAG{find_is_a_superpower}"),
};
