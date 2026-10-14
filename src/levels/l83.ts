import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 83: Two keys, one ranking",
  story: "scores.csv has name,team,points. Rank it by team (a to z) and, inside each team, by points from highest to lowest. Save the result to ranked.csv.",
  hint: "Each -k gets its own letters: sort -t, -k2,2 -k3,3nr scores.csv > ranked.csv",
  files: { "/home/user/scores.csv": "mia,red,40\nleo,blue,55\nzoe,red,75\nsam,blue,20\nana,red,60\n" },
  solution: ["sort -t, -k2,2 -k3,3nr scores.csv > ranked.csv"],
  check: (a) => fileText(a, "/home/user/ranked.csv") === "leo,blue,55\nsam,blue,20\nzoe,red,75\nana,red,60\nmia,red,40\n",
};
