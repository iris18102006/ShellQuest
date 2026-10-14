import { type Level } from "./types";

export const level: Level = {
  title: "Level 87: Your first script",
  story: "A script is just a file full of commands. Make hello.sh that prints: hello world. Then make it executable and run it.",
  hint: "echo 'echo hello world' > hello.sh  then  chmod +x hello.sh  then  ./hello.sh",
  files: { "/home/user/notes.txt": "scripts live in files\n" },
  solution: ["echo 'echo hello world' > hello.sh", "chmod +x hello.sh", "./hello.sh"],
  check: (a) => a.command.includes("hello.sh") && a.output === "hello world\n",
};
