import type { Level } from "./types";

export const level: Level = {
  title: "Level 57: A command inside a command",
  story: "inbox.txt has one message per line. Print exactly: You have 4 messages. But don't type the 4 yourself. Let the shell count the lines and drop that number into your sentence.",
  hint: "$(...) runs a command and pastes its output into the line: echo \"You have $(wc -l < inbox.txt) messages\". The < feeds the file in so wc prints just the number.",
  files: {
    "/home/user/inbox.txt": "from maya: lunch?\nfrom jon: PR is ready\nfrom lea: new schedule\nfrom sam: ping me later\n",
  },
  solution: ["wc -l inbox.txt", "echo \"You have $(wc -l < inbox.txt) messages\""],
  check: (a) => /\$\(/.test(a.command) && a.output === "You have 4 messages\n",
};
