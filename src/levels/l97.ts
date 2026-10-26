import { type Level } from "./types";

export const level: Level = {
  title: "Level 97: Strip the spaces",
  story: "phone.txt holds a phone number with stray spaces. Print it with every space removed.",
  hint: "tr -d deletes characters: tr -d ' ' < phone.txt",
  files: {
    "/home/user/phone.txt": "555 12 34\n",
  },
  solution: ["cat phone.txt", "tr -d ' ' < phone.txt"],
  check: (a) => /tr/.test(a.command) && a.output === "5551234\n",
};
