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

export function preferPathWorld(stops: readonly DailyPlanStop[], world: string | undefined, isNew: boolean): DailyPlanStop[] {
  const out = [...stops];
  if (!world) return out;
  const slots = out.map((s, i) => (s.k !== "review" && s.k !== "pick" ? i : -1)).filter((i) => i >= 0);
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
