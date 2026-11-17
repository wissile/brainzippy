import type { Exercise } from "../../engine/types";

/**
 * Board-independent logic for Sky Balloon Race (pure, unit-tested).
 *
 * Worked example = "count on": say the bigger number, then count up once per unit of the smaller number.
 *   7 + 6 → "seven… eight, nine, ten, eleven, twelve, thirteen"
 * Step 0 highlights the bigger group (the number we hold in our head); steps 1..small light one dot each.
 */
export function addends(ex: Exercise): { a: number; b: number; big: number; small: number } {
  const a = ex.params?.a ?? 0;
  const b = ex.params?.b ?? 0;
  return { a, b, big: Math.max(a, b), small: Math.min(a, b) };
}

export const countOnSteps = (ex: Exercise): number => addends(ex).small + 1;

export const countOnSay = (ex: Exercise, i: number): number | null => {
  const { big, small } = addends(ex);
  return i >= 0 && i <= small ? big + i : null;
};

/** Ten-frame cells for the worked example: the bigger group first, then the counted-on group. */
export function tenFrameCells(ex: Exercise): { kind: "big" | "small" | "empty"; order: number }[] {
  const { big, small } = addends(ex);
  const frames = big + small > 10 ? 2 : 1;
  return Array.from({ length: frames * 10 }, (_, i) =>
    i < big ? { kind: "big" as const, order: -1 } : i < big + small ? { kind: "small" as const, order: i - big } : { kind: "empty" as const, order: -1 },
  );
}

/** Race positions (0..1 along the track). Friendly rivals hover at fixed spots that Bobbo floats past. */
export const RIVALS = [
  { id: "zuzu", at: 3.4, color: "#8E6CEF" },
  { id: "gloop", at: 5.5, color: "#2EC4B6" },
] as const;
export const trackPos = (done: number, total: number) => Math.min(1, Math.max(0, done / total));

/** Balloon colours, assigned by position (never by correctness). */
export const BALLOON_COLORS = [
  { body: "#4D96FF", light: "#9CC6FF", dark: "#2A64C9", stroke: "#1C4FA0" },
  { body: "#5BC85A", light: "#A6EA8E", dark: "#2F9A3A", stroke: "#1F6B1A" },
  { body: "#FF6FA3", light: "#FFB3CE", dark: "#D63E78", stroke: "#9A1F52" },
] as const;
