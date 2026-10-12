import type { Level } from "./types";

const rows = ["o1,250", "o2,40", "o3,120", "o4,99", "o5,101", "o6,15"];

export const level: Level = {
  title: "Level 60: Count the big ones",
  story: "orders.csv has an order id and an amount on every line (id,amount). How many orders are for MORE than 100? Print only that count. A 100 exactly doesn't count as more.",
  hint: "Put a condition in front of the braces and count the matches: awk -F, '$2 > 100 { n++ } END { print n }' orders.csv",
  files: { "/home/user/orders.csv": rows.join("\n") + "\n" },
  solution: ["awk -F, '$2 > 100 {print $1}' orders.csv", "awk -F, '$2 > 100 { n++ } END { print n }' orders.csv"],
  check: (a) => /awk/.test(a.command) && /END/.test(a.command) && a.output === "3\n",
};
