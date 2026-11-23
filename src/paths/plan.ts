import type { DailyPlanStop } from "../engine/progressSchema";

/**
 * PP1 (docs/PATHS.md): when the child has a visible path, today's trail puts the path's current world on the first
 * learning stop (the first stop that is not a review and not the final pick). Reviews are never displaced, a world
 * never gets more than 2 stops (P7), and no change may put the same world on two neighbouring stops (P9) — if every
 * candidate would, the plan stays as the planner made it. Pure; applied by src/daily/store.ts after planDay.
 */
const MAX_PER_WORLD = 2;
const worldsOf = (s: DailyPlanStop): readonly string[] => s.o ?? [s.w];
const shares = (a: DailyPlanStop, b: DailyPlanStop) => worldsOf(a).some((w) => worldsOf(b).includes(w));
const neighbours = (arr: readonly DailyPlanStop[]): number => arr.reduce((n, s, i) => n + (i > 0 && shares(arr[i - 1]!, s) ? 1 : 0), 0);
const uses = (arr: readonly DailyPlanStop[], w: string) => arr.filter((s) => worldsOf(s).includes(w)).length;

const learningSlots = (arr: readonly DailyPlanStop[]) => arr.map((s, i) => (s.k !== "review" && s.k !== "pick" ? i : -1)).filter((i) => i >= 0);

/**
 * PP1 + D1 warm-up: the path world first; an owed warm-up world (the previous world of the path) gets ONE stop,
 * badged like a review ("Remember this one") and placed just before the path world when the neighbours allow.
 */
export function planWithPath(stops: readonly DailyPlanStop[], focus: { world: string; warm: string | null } | null, isNew: boolean): DailyPlanStop[] {
  if (!focus) return [...stops];
  const out = preferPathWorld(stops, focus.world, isNew);
  const warm = focus.warm;
  if (!warm || warm === focus.world) return out;
  const wi = out.findIndex((s) => s.w === focus.world && s.k !== "review" && s.k !== "pick");
  const base = neighbours(out);
  const swapBefore = (t: DailyPlanStop[], i: number): DailyPlanStop[] => {
    if (wi >= 0 && i > wi) {
      const sw = [...t];
      [sw[i], sw[wi]] = [sw[wi]!, sw[i]!];
      if (neighbours(sw) <= base) return sw;
    }
    return t;
  };
  if (out.some((s) => s.w === warm && s.k === "review")) return out;
  // already planned (practice / new / stretch): that stop becomes the warm-up (a stretch never starts harder then)
  const have = out.findIndex((s) => s.w === warm && s.k !== "pick");
  if (have >= 0) {
    const t = [...out];
    t[have] = { w: warm, k: "review" };
    return swapBefore(t, have);
  }
  if (uses(out, warm) >= MAX_PER_WORLD) return out;
  for (const i of learningSlots(out)) {
    if (i === wi) continue;
    const t = [...out];
    t[i] = { w: warm, k: "review" };
    if (neighbours(t) > base) continue;
    return swapBefore(t, i);
  }
  return out;
}

export function preferPathWorld(stops: readonly DailyPlanStop[], world: string | undefined, isNew: boolean): DailyPlanStop[] {
  const out = [...stops];
  if (!world) return out;
  const slots = learningSlots(out);
  if (!slots.length || out[slots[0]!]!.w === world) return out;
  const base = neighbours(out);

  const existing = slots.find((i) => out[i]!.w === world);
  if (existing !== undefined) {
    // already planned: move it forward (a swap keeps every world's count)
    for (const i of slots) {
      if (i >= existing) break;
      const t = [...out];
      [t[i], t[existing]] = [t[existing]!, t[i]!];
      if (neighbours(t) <= base) return t;
    }
    return out;
  }
  if (uses(out, world) >= MAX_PER_WORLD) return out;
  for (const i of slots) {
    const t = [...out];
    t[i] = { w: world, k: isNew ? "new" : "practice" };
    if (neighbours(t) <= base) return t;
  }
  return out;
}
