import { type Level, fileText } from "./types";

const cfg = "host=db.local\npass=s3cr3t\n";

export const level: Level = {
  title: "Level 32: Boss, the heist",
  story: "A file called db.cfg is hiding somewhere under /var/www. Copy it into your home folder as loot.cfg, then lock the copy down so only you can read and write it.",
  hint: "Three steps: find it, cp it, chmod 600 the copy. Watch out for the .bak decoy.",
  files: {
    "/var/www/app/shared/config/db.cfg": cfg,
    "/var/www/app/config/db.cfg.bak": "old\n",
    "/var/www/html/index.html": "<h1>hi</h1>\n",
  },
  solution: ["find /var/www -name db.cfg", "cp /var/www/app/shared/config/db.cfg loot.cfg", "chmod 600 loot.cfg"],
  check: (a) => fileText(a, "/home/user/loot.cfg") === cfg && a.fs.get("/home/user/loot.cfg")?.mode === 0o600,
};
