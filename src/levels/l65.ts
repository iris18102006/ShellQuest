import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 65: Count the incidents",
  story: "incidents.log has one incident per line. Print only the number of incidents, not the lines themselves.",
  hint: "wc -l incidents.log",
  files: { "/home/user/incidents.log": 'login failed\ncache miss\nretry timeout\nservice recovered\n' },

solution: ["wc -l < incidents.log"],
check: (a) => a.output.trim() === "4",
};
