import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 79: Keep only the repeated IDs",
  story: "ids.txt contains repeated IDs. Print only IDs that occur more than once, once each.",
  hint: "sort ids.txt | uniq -d",
  files: { "/home/user/ids.txt": 'a12\nb07\na12\nc44\nb07\nb07\n' },
  solution: ["sort ids.txt | uniq -d"],
  check: (a) => a.output === "a12\nb07\n",
};
