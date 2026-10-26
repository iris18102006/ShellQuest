import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 107: Glue it together",
  story: "part1.txt and part2.txt are halves of a story. Put part1 first, then part2, into a new file called story.txt.",
  hint: "cat part1.txt part2.txt > story.txt",
  files: {
    "/home/user/part1.txt": "Once upon a time\n",
    "/home/user/part2.txt": "they all lived happily\n",
  },
  solution: ["cat part1.txt", "cat part1.txt part2.txt > story.txt"],
  check: (a) => fileText(a, "/home/user/story.txt") === "Once upon a time\nthey all lived happily\n",
};
