import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 63: Case-insensitive search",
  story: "The app log mixes ERROR, error and Error. Print every line containing the word error regardless of capitalization.",
  hint: "grep -i error app.log",
  files: { "/home/user/app.log": 'INFO booted\nERROR disk full\nerror retry failed\nWARN slow\nError timeout\n' },
  solution: ["grep -i error app.log"],
  check: (a) => a.output === "ERROR disk full\nerror retry failed\nError timeout\n",
};
