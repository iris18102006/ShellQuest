import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 91: Boss: the nightly backup",
  story: "Write backup.sh. Given a folder name as its argument, it tars that folder into NAME.tar and then prints: backed up NAME. Make it executable and run it on the photos folder.",
  hint: "echo 'tar -cf $1.tar $1 && echo backed up $1' > backup.sh, then chmod +x backup.sh, then ./backup.sh photos",
  files: {
    "/home/user/photos/day1.txt": "beach\n",
    "/home/user/photos/day2.txt": "market\n",
    "/home/user/docs/todo.txt": "sleep\n",
  },
  solution: ["echo 'tar -cf $1.tar $1 && echo backed up $1' > backup.sh", "chmod +x backup.sh", "./backup.sh photos"],
  check: (a) => {
    const t = fileText(a, "/home/user/photos.tar");
    return a.command.includes("backup.sh") && a.output === "backed up photos\n" && t !== null && t.includes('"path":"photos/day2.txt"');
  },
};
