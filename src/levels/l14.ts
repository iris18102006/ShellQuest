import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 14: Glue it together",
  story: "A story is split into three parts inside the parts folder. Join them, in order, into one file called story.txt in your home folder.",
  hint: "cat can take many files at once, and parts/part*.txt matches all three. Send the result into a file with >",
  files: {
    "/home/user/parts/part1.txt": "Once upon a time\n",
    "/home/user/parts/part2.txt": "there was a tiny shell\n",
    "/home/user/parts/part3.txt": "and it lived happily ever after.\n",
  },
  solution: ["ls parts", "cat parts/part*.txt > story.txt"],
  check: (a) => fileText(a, "/home/user/story.txt") === "Once upon a time\nthere was a tiny shell\nand it lived happily ever after.\n",
};
