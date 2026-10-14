// Shareable links: https://.../#level=12 opens ShellQuest on level 12.

/** "#level=12" -> 11 (zero-based index). Returns null if it isn't a valid level for `total` levels. */
export function levelFromHash(hash: string, total: number): number | null {
  const m = /^#?level=(\d+)$/.exec(hash.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= total ? n - 1 : null;
}

/** Zero-based level index -> "#level=N". */
export const hashForLevel = (index: number): string => `#level=${index + 1}`;
