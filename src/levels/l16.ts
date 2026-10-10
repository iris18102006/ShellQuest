import type { Level } from "./types";

const emails = ["zed@mail.com", "amy@mail.com", "bob@mail.com", "amy@mail.com", "zed@mail.com", "cat@mail.com", "bob@mail.com", "amy@mail.com"];
const unique = [...new Set(emails)].sort();

export const level: Level = {
  title: "Level 16: Once is enough",
  story: "emails.txt has duplicates. Print every address exactly once, in alphabetical order.",
  hint: "sort -u sorts and drops duplicates in one go. Or sort first, then uniq.",
  files: { "/home/user/emails.txt": emails.join("\n") + "\n" },
  solution: ["sort -u emails.txt"],
  check: (a) => a.output === unique.join("\n") + "\n",
};
