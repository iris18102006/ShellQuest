import type { Level } from "./types";

const emails = [
  "maya@mail.com",
  "jon@mail.com",
  "lea@mail.com",
  "maya@mail.com",
  "sam@mail.com",
  "jon@mail.com",
  "maya@mail.com",
];
const expected = ["jon@mail.com", "maya@mail.com"].join("\n") + "\n";

export const level: Level = {
  title: "Level 48: Only the repeats",
  story: "signups.txt has one email per line, and some people signed up more than once. Print ONLY the emails that appear more than once, each one a single time. Sorted, so it's easy to read.",
  hint: "uniq only compares neighbours, so sort first. Then uniq -d keeps just the repeated lines: sort signups.txt | uniq -d",
  files: { "/home/user/signups.txt": emails.join("\n") + "\n" },
  solution: ["sort signups.txt | uniq", "sort signups.txt | uniq -d"],
  check: (a) => /uniq/.test(a.command) && /-d/.test(a.command) && a.output === expected,
};
