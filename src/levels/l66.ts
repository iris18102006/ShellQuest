import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 66: Top three headlines",
  story: "news.txt is newest first. Show only the first three headlines.",
  hint: "head -n 3 news.txt",
  files: { "/home/user/news.txt": 'Launch delayed\nPatch released\nService restored\nNew dashboard\nOld alert\n' },
  solution: ["head -n 3 news.txt"],
  check: (a) => a.output === "Launch delayed\nPatch released\nService restored\n",
};
