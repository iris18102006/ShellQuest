import { type Level } from "./types";

export const level: Level = {
  title: "Level 101: Cat to dog",
  story: "pets.txt mentions a cat on several lines. Print the file with every 'cat' swapped for 'dog'.",
  hint: "sed 's/cat/dog/g' pets.txt",
  files: {
    "/home/user/pets.txt": "my cat is lazy\nthe cat sleeps\nbird\n",
  },
  solution: ["cat pets.txt", "sed 's/cat/dog/g' pets.txt"],
  check: (a) => /sed/.test(a.command) && a.output === "my dog is lazy\nthe dog sleeps\nbird\n",
};
