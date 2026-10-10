import type { FS, FsSpec } from "../vfs";

export interface Attempt {
  command: string;
  output: string;
  /** The live filesystem, so a level can check what the player changed. */
  fs: FS;
  cwd: string;
}

export interface Level {
  title: string;
  story: string;
  hint: string;
  files: FsSpec;
  cwd?: string;
  /** Commands that solve the level. The last one must complete it, earlier ones must not. Used by the tests. */
  solution: string[];
  /** Called after every command. Return true to complete the level. */
  check(a: Attempt): boolean;
}

export const lineCount = (s: string) => s.split("\n").filter(Boolean).length;

/** Text of a file, or null if it doesn't exist / isn't a file. */
export const fileText = (a: Attempt, path: string): string | null => {
  const n = a.fs.get(path);
  return n && n.type === "file" ? n.content : null;
};

/** Names inside a directory (empty if it doesn't exist). */
export const listDir = (a: Attempt, path: string): string[] => {
  const n = a.fs.get(path);
  return n && n.type === "dir" ? Object.keys(n.children) : [];
};
