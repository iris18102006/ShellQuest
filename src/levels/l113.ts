import { type Level } from "./types";

export const level: Level = {
  title: "Level 113: Look inside the archive",
  story: "Bundle the src folder into code.tar, and in the same command line, list what ended up inside it.",
  hint: "tar -cf code.tar src && tar -tf code.tar",
  files: {
    "/home/user/src/main.c": "int main(){}\n",
    "/home/user/src/util.c": "//\n",
  },
  solution: ["tar -cf code.tar src", "tar -cf code.tar src && tar -tf code.tar"],
  check: (a) => a.command.includes("-t") && a.output.includes("src/main.c") && a.output.includes("src/util.c"),
};
