import type { FsSpec } from "./vfs";

export interface Attempt { command: string; output: string }

export interface Level {
  title: string;
  story: string;
  hint: string;
  files: FsSpec;
  cwd?: string;
  /** Called after every command. Return true to complete the level. */
  check(a: Attempt): boolean;
}

const lineCount = (s: string) => s.split("\n").filter(Boolean).length;

// Deterministic "random" data so the levels are the same every run.
const logLines = (): string => {
  const lvl = ["INFO", "INFO", "INFO", "WARN", "INFO", "ERROR"];
  const rows: string[] = [];
  for (let i = 0; i < 60; i++) {
    rows.push(`2026-10-04 03:${String(i % 60).padStart(2, "0")} ${lvl[i % lvl.length]} job_${i} finished`);
  }
  rows[37] = "2026-10-04 03:37 CRITICAL login as root from 203.0.113.66";
  return rows.join("\n") + "\n";
};

const visitors = (): string => {
  const ips = ["10.0.0.4", "10.0.0.9", "10.0.0.12", "10.0.0.31", "198.51.100.23"];
  const rows: string[] = [];
  for (let i = 0; i < 40; i++) rows.push(i % 3 === 0 ? "198.51.100.23" : ips[(i * 7) % 4]);
  return rows.join("\n") + "\n";
};

export const levels: Level[] = [
  {
    title: "Level 1: Hidden in plain sight",
    story: "Someone left a note in your home folder, but it doesn't show up in a normal listing. Find it and read it.",
    hint: "Hidden files start with a dot. ls -a shows them, cat prints them.",
    files: {
      "/home/user/todo.txt": "buy milk\nlearn linux\n",
      "/home/user/.hidden_note": "FLAG{dotfiles_are_not_invisible}\n",
    },
    check: (a) => a.output.includes("FLAG{dotfiles_are_not_invisible}"),
  },
  {
    title: "Level 2: Needle in a log",
    story: "server.log has 60 lines and exactly one is CRITICAL. Print only that line.",
    hint: "grep CRITICAL server.log",
    files: { "/home/user/server.log": logLines() },
    check: (a) => /grep/.test(a.command) && a.output.includes("203.0.113.66") && lineCount(a.output) === 1,
  },
  {
    title: "Level 3: Pipe dreams",
    story: "visitors.txt lists one IP per visit. Find the single IP that visited the most, and print only that line (with its count is fine).",
    hint: "sort groups equal lines, uniq -c counts them, sort -rn ranks, head -n 1 keeps the winner. Chain them with |",
    files: { "/home/user/visitors.txt": visitors() },
    check: (a) => a.command.includes("|") && a.output.includes("198.51.100.23") && lineCount(a.output) === 1,
  },
  {
    title: "Level 4: Permission denied",
    story: "There's a script called run.sh in your home folder. It won't run. Make it run.",
    hint: "Try ./run.sh, read the error, then chmod +x run.sh",
    files: {
      "/home/user/run.sh": { content: "#!/bin/sh\necho secret\n", mode: 0o644, exec: "ACCESS GRANTED\nFLAG{chmod_plus_x}" },
    },
    check: (a) => a.output.includes("FLAG{chmod_plus_x}"),
  },
  {
    title: "Level 5: Treasure hunt",
    story: "A file named master.key is buried somewhere under /srv. Locate it and read what's inside.",
    hint: "find /srv -name master.key, then cat the path it prints.",
    files: {
      "/srv/app/notes.txt": "nothing here\n",
      "/srv/app/cache/tmp/master.key.bak": "decoy\n",
      "/srv/backups/2025/archive/deep/master.key": "FLAG{find_is_a_superpower}\n",
      "/srv/www/index.html": "<h1>hi</h1>\n",
    },
    check: (a) => a.output.includes("FLAG{find_is_a_superpower}"),
  },
];
