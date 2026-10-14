import { type Level } from "./types";

export const level: Level = {
  title: "Level 88: Hand it an argument",
  story: "greet.sh is ready to go. It greets whoever you give it (inside the script that name is $1). Run it so it says hello to Leo.",
  hint: "Type the arguments after the script: ./greet.sh Leo",
  files: { "/home/user/greet.sh": { content: '#!/bin/bash\necho "Hello, $1!"\n', mode: 0o755 } },
  solution: ["./greet.sh Leo"],
  check: (a) => a.output === "Hello, Leo!\n",
};
