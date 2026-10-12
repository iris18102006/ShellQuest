import type { Level } from "./types";

const codes = ["NYC-4471", "LAX-0932", "TIA-1180", "CDG-7765", "FRA-3058"];
const expected = ["NYC", "LAX", "TIA", "CDG", "FRA"].join("\n") + "\n";

export const level: Level = {
  title: "Level 49: First three letters",
  story: "flights.txt lists one booking code per line, like NYC-4471. The first three letters are the airport. Print just the airport part of every line. There's no comma or space to split on, so think in character positions.",
  hint: "cut can count characters instead of fields: cut -c1-3 flights.txt",
  files: { "/home/user/flights.txt": codes.join("\n") + "\n" },
  solution: ["cut -d- -f2 flights.txt", "cut -c1-3 flights.txt"],
  check: (a) => /cut/.test(a.command) && /-c/.test(a.command) && a.output === expected,
};
