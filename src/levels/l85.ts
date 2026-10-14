import { type Level } from "./types";

const entries = [
  { path: "release", dir: true, mode: 0o755 },
  { path: "release/app.js", dir: false, mode: 0o644, content: "run()\n" },
  { path: "release/changelog.txt", dir: false, mode: 0o644, content: "v1\n" },
  { path: "release/readme.md", dir: false, mode: 0o644, content: "hi\n" },
  { path: "release/notes.txt", dir: false, mode: 0o644, content: "todo\n" },
];

export const level: Level = {
  title: "Level 85: Peek inside",
  story: "release.tar just landed in your home folder. Without unpacking it, print how many .txt files are inside.",
  hint: "-t lists an archive without extracting it. Pipe it into grep -c: tar -tf release.tar | grep -c txt",
  files: { "/home/user/release.tar": "SQTAR1\n" + JSON.stringify(entries) },
  solution: ["tar -tf release.tar | grep -c txt"],
  check: (a) => a.output === "2\n" && a.fs.get("/home/user/release") === null,
};
