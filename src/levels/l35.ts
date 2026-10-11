import { type Level, fileText } from "./types";

const text = "meeting moved to friday\nbring snacks and laptops\nno phones in the room\n";

export const level: Level = {
  title: "Level 35: Shout it",
  story: "The boss wants announcement.txt in ALL CAPS. Save the shouty version as loud.txt and leave the original alone.",
  hint: "tr swaps characters: tr a-z A-Z turns lowercase into uppercase. Feed it with a pipe (cat file | tr ...) or with < file, then redirect with >.",
  files: { "/home/user/announcement.txt": text },
  solution: ["cat announcement.txt | tr a-z A-Z", "cat announcement.txt | tr a-z A-Z > loud.txt"],
  check: (a) => fileText(a, "/home/user/loud.txt") === text.toUpperCase() && fileText(a, "/home/user/announcement.txt") === text,
};
