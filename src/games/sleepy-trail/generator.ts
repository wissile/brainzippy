import type { Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { type Frac, fracCmp, fracEq, fracText, fracValue, fracWords, postOf } from "./fractions";

/**
 * Rumble's Sleepy Trail — seeded exercise generator (docs/curriculum/maths.md §4.4, docs/worlds/sleepy-trail.md).
 * Pure: (level, rng, index) → exercise. No Date, no Math.random.
 *
 * A trail (number line) runs from 0 (Mossy Rock) to M (1 Big Tree, 2 Far Hill, 3 Cloud Peak). Each unit is split
 * into P equal parts by posts. Fractions are always POSITIONS on the trail (never slices of a shape).
 *
 * Engine level i = spec level L(i+1); spec L0 is the authored tutorial (1/2 on halves) that opens level 0.
 *
 * Variety without repeats: generators can't share state between indices, so each level lists, for the 8 slots of a
 * band, which group (usually a denominator) the slot uses. The j-th slot of a group picks from the j-th bucket of
 * that group's candidates (candidates split round-robin), so two slots never produce the same item, and
 * neighbouring slots never share a denominator.
 */

export type Mode = "place" | "name" | "compare" | "estimate";
export const MODE_CODE: Record<Mode, number> = { place: 0, name: 1, compare: 2, estimate: 3 };
const MODES: Mode[] = ["place", "name", "compare", "estimate"];

export interface Item {
  mode: Mode;
  /** trail length in units (1, 2 or 3) */
  M: number;
  /** posts per unit (the partition). For estimates: the posts revealed by the modelled answer. */
  P: number;
  /** target fraction (Rumble's) */
  a: number;
  d: number;
  /** compare only: Bobbo's fraction and trail partition */
  a2?: number;
  d2?: number;
}

export const SKILLS = {
  unit: "math.frac.unit-on-line",
  onLine: "math.frac.on-line",
  equivalent: "math.frac.equivalent",
  compare: "math.frac.compare",
  estimate: "math.frac.estimate",
} as const;

export const AGES = [7, 9] as const;
/** Exercises per band = the round length. */
export const SLOTS = 8;
/** Estimates snap to 24ths of a unit: every target a/d with d ∈ {2,3,4,6,8} is exactly on this grid. */
export const FINE = 24;

const range = (lo: number, hi: number) => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i);
const place = (d: number, a: number, M = 1, P = d): Item => ({ mode: "place", M, P, a, d });

interface LevelSpec {
  /** what the level practises (docs + tests) */
  note: string;
  skill: string;
  /** group key per slot (length SLOTS) */
  order: readonly (number | string)[];
  /** candidate items of a group, in bucket order */
  cands: (key: number | string) => Item[];
  /** optional special item for a slot (e.g. the one d/d of the round), decided by rng */
  special?: (slot: number, key: number | string, rng: Rng) => Item | null;
}

// L7 compare pairs (Rumble a/d on his trail, Bobbo a2/d2 on his): same denominator, or same numerator. Never equal.
const CMP_SAME_D: [number, number, number, number][] = [
  [1, 3, 2, 3], [3, 4, 1, 4], [2, 4, 3, 4], [5, 6, 1, 6], [2, 6, 4, 6], [3, 8, 5, 8], [7, 8, 4, 8], [6, 8, 2, 8],
];
const CMP_SAME_A: [number, number, number, number][] = [
  [1, 2, 1, 4], [1, 8, 1, 3], [1, 3, 1, 6], [1, 6, 1, 2], [2, 3, 2, 8], [2, 6, 2, 4], [3, 4, 3, 8], [3, 8, 3, 6],
];
const cmp = ([a, d, a2, d2]: [number, number, number, number]): Item => ({ mode: "compare", M: 1, P: d, a, d, a2, d2 });

// L6 equivalence: the trail's posts (P) differ from the target's denominator.
const EQUIV: Item[] = [place(4, 1, 1, 8), place(3, 1, 1, 6), place(2, 1, 1, 8), place(3, 2, 1, 6), place(2, 1, 1, 4), place(4, 3, 1, 8), place(2, 1, 1, 6), place(4, 2, 1, 8)];

export const LEVELS: readonly LevelSpec[] = [
  {
    note: "L1 unit fractions 1/d on 0–1 (posts shown)",
    skill: SKILLS.unit,
    // only six unit fractions exist for d ≤ 8 (no sevenths): slots 6–7 repeat slots 1 and 0
    order: [3, 4, 6, 2, 8, 5, 4, 3],
    cands: (d) => [place(d as number, 1)],
  },
  {
    note: "L2 a/d below one, d ∈ {2,3,4,6}",
    skill: SKILLS.onLine,
    order: [4, 3, 6, 2, 4, 3, 6, 4],
    cands: (d) => range(1, (d as number) - 1).map((a) => place(d as number, a)),
  },
  {
    note: "L3 a/d with d ∈ {3,4,5,6,8}, plus at most one d/d (one whole) and one 0/d",
    skill: SKILLS.onLine,
    order: [8, 5, 3, 6, 4, 8, 5, 4],
    cands: (d) => range(1, (d as number) - 1).map((a) => place(d as number, a)),
    special: (slot, d, rng) => (slot === 4 && rng.chance(0.6) ? place(d as number, d as number) : slot === 7 && rng.chance(0.5) ? place(d as number, 0) : null),
  },
  {
    note: "L4 name the fraction: Rumble stands on a post, choose one of 3 cards",
    skill: SKILLS.onLine,
    order: [4, 8, 3, 6, 8, 4, 6, 8],
    cands: (d) => range(1, (d as number) - 1).map((a) => ({ mode: "name", M: 1, P: d as number, a, d: d as number })),
  },
  {
    note: "L5 beyond one: 0–2 trail, d ∈ {2,3,4}, mostly not whole numbers",
    skill: SKILLS.onLine,
    order: [4, 3, 2, 4, 3, 2, 4, 3],
    // buckets alternate above/below one so every slot can land past Big Tree
    cands: (d) => {
      const n = d as number;
      const above = range(n + 1, 2 * n - 1), below = range(1, n - 1);
      const out: number[] = [];
      for (let i = 0; i < Math.max(above.length, below.length); i++) out.push(...(above[i] !== undefined ? [above[i]!] : []), ...(below[i] !== undefined ? [below[i]!] : []));
      return out.map((a) => place(n, a, 2));
    },
    special: (slot, d, rng) => (slot === 6 && rng.chance(0.4) ? place(d as number, rng.pick([d as number, 2 * (d as number)]), 2) : null),
  },
  {
    note: "L6 equivalence: posts in 8ths/6ths/4ths, target named in halves, thirds or fourths",
    skill: SKILLS.equivalent,
    order: range(0, SLOTS - 1),
    cands: (k) => [EQUIV[k as number]!],
  },
  {
    note: "L7 compare: place Rumble and Bobbo on two equal trails, then say who walked farther",
    skill: SKILLS.compare,
    order: range(0, SLOTS - 1),
    cands: (k) => [cmp(((k as number) % 2 === 0 ? CMP_SAME_D : CMP_SAME_A)[Math.floor((k as number) / 2) * 2]!), cmp(((k as number) % 2 === 0 ? CMP_SAME_D : CMP_SAME_A)[Math.floor((k as number) / 2) * 2 + 1]!)],
  },
  {
    note: "L8 estimate on an unmarked 0–1 trail, d ∈ {2,3,4,6,8}",
    skill: SKILLS.estimate,
    order: [4, 3, 8, 6, 2, 4, 3, 8],
    cands: (d) => range(1, (d as number) - 1).map((a) => ({ mode: "estimate", M: 1, P: d as number, a, d: d as number })),
  },
  {
    note: "L9 estimate on unmarked 0–2 or 0–3 trails, d ∈ {2,3,4}",
    skill: SKILLS.estimate,
    order: [4, 3, 2, 4, 3, 2, 4, 3],
    cands: (d) => {
      const n = d as number;
      const out: Item[] = [];
      for (const M of [2, 3]) for (const a of range(1, M * n)) if (a % n !== 0) out.push({ mode: "estimate", M, P: n, a, d: n });
      // interleave the two trail lengths so every bucket offers both
      return out.sort((x, y) => (x.a - y.a) || (x.M - y.M));
    },
  },
];
export const MAX_LEVEL = LEVELS.length - 1;

/** The item for a slot: the j-th occurrence of a group picks from its j-th bucket (so slots never repeat). */
export function itemFor(level: number, index: number, rng: Rng): Item {
  const spec = LEVELS[Math.max(0, Math.min(MAX_LEVEL, level))]!;
  const slot = index % SLOTS;
  const key = spec.order[slot]!;
  const special = spec.special?.(slot, key, rng);
  if (special) return special;
  const occ = spec.order.filter((k) => k === key).length;
  const j = spec.order.slice(0, slot).filter((k) => k === key).length;
  const all = spec.cands(key);
  const bucket = all.filter((_, i) => i % occ === j);
  const pool = bucket.length ? bucket : all;
  if (spec === LEVELS[4] && pool.length > 1) {
    // beyond-one level: prefer the value past Big Tree
    const above = pool.filter((it) => it.a > it.d);
    if (above.length && rng.chance(0.7)) return rng.pick(above);
  }
  return rng.pick(pool);
}

/** Every item a level can produce (for voice coverage and tests). */
export function allItems(level: number): Item[] {
  const spec = LEVELS[level]!;
  const out: Item[] = [];
  const seen = new Set<string>();
  const add = (it: Item) => {
    const k = itemKey(it);
    if (!seen.has(k)) (seen.add(k), out.push(it));
  };
  for (const key of new Set(spec.order)) spec.cands(key).forEach(add);
  // specials
  if (level === 2) for (const d of new Set(spec.order)) (add(place(d as number, d as number)), add(place(d as number, 0)));
  if (level === 4) for (const d of new Set(spec.order)) (add(place(d as number, d as number, 2)), add(place(d as number, 2 * (d as number), 2)));
  return out;
}

export const itemKey = (it: Item) => `${it.mode}:${it.a}/${it.d}@${it.P}x${it.M}${it.a2 !== undefined ? `:${it.a2}/${it.d2}` : ""}`;

// ---------------------------------------------------------------- name-mode distractors (§4.4)

/** Candidate wrong cards for "name": (a−1)/d, (a+1)/d, a/(d+1), a/(d−1), d/a if ≤ 1; never equal in value to a/d. */
export function nameDistractors(a: number, d: number): Frac[] {
  const t = { a, d };
  const raw: Frac[] = [{ a: a - 1, d }, { a: a + 1, d }, { a, d: d + 1 }, { a, d: d - 1 }];
  if (a > 0 && d <= a) raw.push({ a: d, d: a });
  const out: Frac[] = [];
  for (const f of raw) {
    if (f.a < 1 || f.d < 2 || f.a > f.d) continue; // 0/d, whole-number "fractions" over 1 and d = 1 aren't plausible here
    if (fracEq(f, t) || out.some((g) => fracEq(g, f))) continue; // no card equal in value to another
    out.push(f);
  }
  return out;
}

// ---------------------------------------------------------------- exercise data

export const kindOf = (it: Item) =>
  it.mode === "compare" ? `st-c${it.a}-${it.d}-${it.a2}-${it.d2}` : it.mode === "name" ? `st-n${it.a}-${it.d}` : `st-f${it.a}-${it.d}`;

const optionId = (f: Frac) => `f${f.a}-${f.d}`;
const landmark = (m: number) => ["Mossy Rock", "Big Tree", "Far Hill", "Cloud Peak"][m] ?? String(m);

/** Tolerance for estimates (unit lengths): ±1/12 for d ≤ 6, ±1/16 for d = 8. */
export const toleranceFor = (d: number) => 1 / (2 * Math.max(d, 6));

/** Build the Exercise for an item (used by the generator and the authored tutorial). */
export function buildExercise(it: Item, id: string, seed: number, skillId: string, tutorial = false): Omit<Exercise, "difficulty"> {
  const t = { a: it.a, d: it.d };
  const words = fracWords(t);
  const trail = `a trail from 0 at ${landmark(0)} to ${it.M} at ${landmark(it.M)}`;
  const params: Record<string, number> = { mode: MODE_CODE[it.mode], M: it.M, P: it.P, a: it.a, d: it.d, marks: it.mode === "estimate" ? 0 : 1 };
  const base = { id, skillId, ages: AGES, interaction: "choose" as const, objectKind: kindOf(it), seed, ...(tutorial ? { tutorial: true } : {}) };

  switch (it.mode) {
    case "place": {
      const k = postOf(t, it.P)!;
      const posts = it.M * it.P;
      const equiv = it.P !== it.d;
      return {
        ...base,
        objective: equiv ? `Find ${fracText(t)} on a trail split into ${it.P} parts per whole` : `Place ${fracText(t)} on a 0 to ${it.M} number line by counting equal jumps`,
        answer: { kind: "number", value: k, choices: range(0, posts) },
        params,
        prompt: { line: "st.prompt.place", vars: {}, text: `Find ${fracText(t)} of the trail!` },
        a11yDescription: `${trail}. Each whole is split into ${it.P} equal parts by posts. Move Rumble to ${words}, then press Nap here.`,
      };
    }
    case "name": {
      const rng = seedRng(seed);
      const wrong = shuffle(nameDistractors(it.a, it.d), rng).slice(0, 2);
      const options = shuffle([t, ...wrong], rng).map((f) => ({ id: optionId(f), text: fracText(f) }));
      return {
        ...base,
        objective: `Name the fraction ${fracText(t)} shown as a point on a number line`,
        answer: { kind: "choice", correct: optionId(t), options },
        params,
        prompt: { line: "st.prompt.name", vars: {}, text: "Where is Rumble? Pick the fraction." },
        a11yDescription: `${trail}, split into ${it.P} equal parts. Rumble stands on post ${it.a}. Choose the fraction for his spot: ${options.map((o) => o.text).join(", ")}.`,
      };
    }
    case "compare": {
      const b = { a: it.a2!, d: it.d2! };
      const farther = fracCmp(t, b) > 0 ? "rumble" : "bobbo";
      params.a2 = b.a;
      params.d2 = b.d;
      params.P2 = b.d;
      const posts = (p: string, n: number) => range(0, n).map((k) => ({ id: `${p}${k}`, text: `${p === "r" ? "Rumble" : "Bobbo"} post ${k}` }));
      return {
        ...base,
        objective: `Compare ${fracText(t)} and ${fracText(b)} by placing both on equal number lines`,
        answer: {
          kind: "match",
          pairs: { rumble: `r${it.a}`, bobbo: `b${b.a}`, farther },
          items: [{ id: "rumble", text: "Rumble" }, { id: "bobbo", text: "Bobbo" }, { id: "farther", text: "Who walked farther?" }],
          targets: [...posts("r", it.d), ...posts("b", b.d), { id: "rumble", text: "Rumble" }, { id: "bobbo", text: "Bobbo" }],
        },
        params,
        prompt: { line: "st.prompt.compare", vars: {}, text: `Rumble: ${fracText(t)} · Bobbo: ${fracText(b)}. Who walks farther?` },
        a11yDescription: `Two trails of the same length from 0 to 1. Rumble's trail has ${it.d} parts, Bobbo's has ${b.d}. Put Rumble on ${words} and Bobbo on ${fracWords(b)}, then say who walked farther.`,
      };
    }
    case "estimate":
      return {
        ...base,
        objective: `Estimate where ${fracText(t)} is on an unmarked 0 to ${it.M} number line`,
        answer: { kind: "numeric", value: fracValue(t), tolerance: toleranceFor(it.d), min: 0, max: it.M, step: 1 / FINE },
        params,
        prompt: { line: "st.prompt.estimate", vars: {}, text: `No posts! Where is ${fracText(t)}?` },
        a11yDescription: `${trail} with no posts, only the whole numbers. Slide Rumble to where you think ${words} is, then press Nap here.`,
      };
  }
}

// tiny local helpers so name-card order is a pure function of the exercise seed
function seedRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function shuffle<T>(xs: readonly T[], r: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const generateSleepyTrail: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(MAX_LEVEL, level));
  const it = itemFor(lv, index, rng);
  const tag = it.mode === "compare" ? `cmp-${it.a}-${it.d}-${it.a2}-${it.d2}` : `${it.mode}-${it.a}-${it.d}-on${it.P}-m${it.M}`;
  return buildExercise(it, `st-${tag}-l${lv}n${index}`, rng.int(1, 1_000_000), LEVELS[lv]!.skill);
};

// ---------------------------------------------------------------- reading an exercise back

/** The item an exercise was built from (boards and logic read params, never ids). */
export function itemOf(ex: Pick<Exercise, "params">): Item {
  const p = ex.params ?? {};
  const mode = MODES[p.mode ?? 0] ?? "place";
  const it: Item = { mode, M: p.M ?? 1, P: p.P ?? 2, a: p.a ?? 1, d: p.d ?? 2 };
  if (mode === "compare") Object.assign(it, { a2: p.a2 ?? 1, d2: p.d2 ?? 2 });
  return it;
}
