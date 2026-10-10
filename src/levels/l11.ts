import type { Level } from "./types";

const events = (): string => Array.from({ length: 40 }, (_, i) => `event_${i + 1}`).join("\n") + "\n";

export const level: Level = {
  title: "Level 11: Last words",
  story: "events.log has 40 lines. Only the final 3 matter. Print just those.",
  hint: "tail shows the end of a file. tail -n 3 events.log",
  files: { "/home/user/events.log": events() },
  solution: ["tail -n 3 events.log"],
  check: (a) => a.output.trim() === "event_38\nevent_39\nevent_40",
};
