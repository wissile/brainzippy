/**
 * Cookie Kitchen — pure sharing logic (no React/DOM). The board keeps the child's arrangement as
 * `Stacks`: for each plate, the ids of the cookies on it in the order they were put there.
 * Cookies not on any plate are on Rumble's tray.
 */
export type Stacks = readonly (readonly number[])[];

export const emptyStacks = (groups: number): Stacks => Array.from({ length: groups }, () => []);

/** Worked example: the first `steps` cookies dealt one at a time, round and round (cookie i → plate i % groups). */
export function dealRoundRobin(total: number, groups: number, steps: number): Stacks {
  const stacks: number[][] = Array.from({ length: groups }, () => []);
  const n = Math.max(0, Math.min(total, steps));
  for (let i = 0; i < n; i++) stacks[i % groups]!.push(i);
  return stacks;
}

/** Which plate a cookie is on (−1 = still on the tray). */
export function plateOf(stacks: Stacks, cookie: number): number {
  return stacks.findIndex((s) => s.includes(cookie));
}

/** Move a cookie onto `plate` (or back to the tray with plate = −1). Returns a new Stacks; never mutates. */
export function moveCookie(stacks: Stacks, cookie: number, plate: number): Stacks {
  if (plate >= stacks.length) return stacks;
  const from = plateOf(stacks, cookie);
  if (from === plate) return stacks;
  return stacks.map((s, k) => {
    let next = from === k ? s.filter((c) => c !== cookie) : s;
    if (k === plate) next = [...next, cookie];
    return next;
  });
}

/** Cookie ids still on the tray, in tray order. */
export function trayCookies(total: number, stacks: Stacks): number[] {
  const placed = new Set(stacks.flat());
  return Array.from({ length: total }, (_, i) => i).filter((i) => !placed.has(i));
}

export interface ShareStatus {
  /** Every cookie is on a plate. */
  allShared: boolean;
  /** Every plate has the same number of cookies. */
  equal: boolean;
  /** Cookies per plate when the share is complete and fair, else null. */
  each: number | null;
}

export function shareStatus(total: number, stacks: Stacks): ShareStatus {
  const counts = stacks.map((s) => s.length);
  const placed = counts.reduce((a, b) => a + b, 0);
  const allShared = placed === total && total > 0;
  const equal = counts.length > 0 && counts.every((c) => c === counts[0]);
  return { allShared, equal, each: allShared && equal ? (counts[0] ?? 0) : null };
}

/** Number spoken at each worked-example step: the per-plate count at the end of each full round of dealing. */
export function alongSayFor(groups: number, i: number): number | null {
  return (i + 1) % groups === 0 ? Math.floor((i + 1) / groups) : null;
}

/** The plausible errors a distractor may come from: off-by-one(two), subtracting instead of sharing, confusing groups with share. */
export function plausibleDistractors(total: number, groups: number): number[] {
  const target = total / groups;
  return [target - 1, target + 1, target + 2, total - groups, groups].filter((v) => v > 0 && v !== target);
}

/** Tray grid that makes `n` equal cells as large as possible in a box of the given width/height ratio. */
export function bestGrid(n: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: 1, rows: Math.max(1, n), size: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min(aspect / cols, 1 / rows);
    if (size > best.size + 1e-9) best = { cols, rows, size };
  }
  return { cols: best.cols, rows: best.rows };
}
