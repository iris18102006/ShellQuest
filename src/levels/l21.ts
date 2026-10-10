import type { Level } from "./types";

export const level: Level = {
  title: "Level 21: Column surgery",
  story: "users.csv has name,age,city on every line. Print just the names, nothing else.",
  hint: "cut splits lines into fields. -d, says the separator is a comma and -f1 picks the first field.",
  files: { "/home/user/users.csv": "alice,23,Tirana\nbob,31,Durres\ncara,27,Vlore\ndrin,19,Shkoder\n" },
  solution: ["cut -d, -f1 users.csv"],
  check: (a) => a.output === "alice\nbob\ncara\ndrin\n",
};
