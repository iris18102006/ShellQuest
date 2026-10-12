import type { Level } from "./types";

const invited = ["ana", "bo", "cy", "dee", "eli", "fay"];
const rsvp = ["bo", "dee", "fay"];
const expected = ["ana", "cy", "eli"].join("\n") + "\n";

export const level: Level = {
  title: "Level 51: Who ghosted?",
  story: "invited.txt is everyone you invited, rsvp.txt is everyone who answered. Both are sorted. Print the people who were invited but did NOT answer.",
  hint: "You want the lines only in the FIRST file, so hide columns 2 and 3: comm -23 invited.txt rsvp.txt",
  files: {
    "/home/user/invited.txt": invited.join("\n") + "\n",
    "/home/user/rsvp.txt": rsvp.join("\n") + "\n",
  },
  solution: ["comm -12 invited.txt rsvp.txt", "comm -23 invited.txt rsvp.txt"],
  check: (a) => /comm/.test(a.command) && a.output === expected,
};
