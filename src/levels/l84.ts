import { type Level, fileText } from "./types";

export const level: Level = {
  title: "Level 84: Pack it up",
  story: "Bundle the whole photos folder (subfolders too) into one archive called backup.tar. Keep the original folder.",
  hint: "tar -cf backup.tar photos  (c = create, f = file name)",
  files: {
    "/home/user/photos/day1.txt": "beach\n",
    "/home/user/photos/day2.txt": "market\n",
    "/home/user/photos/trip/day3.txt": "mountain\n",
  },
  solution: ["tar -cf backup.tar photos"],
  check: (a) => {
    const t = fileText(a, "/home/user/backup.tar");
    return t !== null && t.includes('"path":"photos/day1.txt"') && t.includes('"path":"photos/trip/day3.txt"') && fileText(a, "/home/user/photos/day2.txt") !== null;
  },
};
