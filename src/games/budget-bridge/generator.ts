import type { Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  type Cell, type Design, type Mode, PIECE_NAME, type Piece, type Puzzle, RULES, RULE_TEXT, type Site, type Vehicle,
  cellWords, cheapest, cheapestAllSteel, cheapestFix, costOf, encodePuzzle, grade, plansWithin, segmentsOf, siteWords,
} from "./logic";

/**
 * Brix's Budget Bridge — seeded, solver-verified site generator (docs/curriculum/engineering.md §4.4).
 * Pure: same (level, rng, index) → same site. For every item we
 *   1. draw the gap width G, the ground/deep pattern and the vehicle for the level,
 *   2. run the solver for the cheapest valid design C* and set the budget B = round up to $5 of C* × slack,
 *   3. check the level's teaching constraint (below); a site that fails any check is redrawn from the same
 *      rng stream (still deterministic).
 * Improve level (7): a valid design is weakened in exactly one segment; B = the cost of the cheapest fix of that
 * segment, so there is money for at least one fix and not for a rebuild in steel.
 *
 * Level (0-based) → site. Full table + reasons in docs/worlds/budget-bridge.md §5.
 *   0  G 1–2, ground, scooter/car, wood only                          slack 2.0   (tutorial level)
 *   1  G 2–3, ground, scooter/car, wood + steel                        slack 1.6   steel is strong but costs more
 *   2  G 4–5, ground, car/van, + pillar                                slack 1.3   wood can't span 4: add a pillar
 *   3  G 3–5, ground, truck, + triangle                                slack 1.5   heavier load: steel, pillars or triangles
 *   4  G 4–5, ground, truck                                            slack 1.15  all-steel is over budget → wood + triangles
 *   5  G 5–6, deep water in the middle 2–3 cells, van/truck            slack 1.3   long spans with no middle pillar
 *   6  G 5–6, mixed ground, bus                                        slack 1.25  ≥ 2 different designs fit the budget
 *   7  G 4–6, mixed, truck/bus, a pre-built bridge with one weak span  B = fix    improve: fix only the weak part
 *   8  G 6, mixed, bus                                                 slack 1.1   cheapest = pillars + wood + triangles; no pillar-free or all-steel design fits
 */

export const BB_AGES = [8, 12] as const;
export const SKILL = {
  spanLoad: "engr.struct.span-load",
  triangle: "engr.struct.triangle",
  criteria: "engr.design.criteria",
  iterate: "engr.design.iterate",
} as const;

type Pattern = "ground" | "deep-middle" | "mixed";
export interface LevelSpec {
  label: string;
  gap: readonly [number, number];
  pattern: Pattern;
  vehicles: readonly Vehicle[];
  pieces: readonly Piece[];
  /** Budget = C* × slack (rounded up to $5). Unused at the improve level. */
  slack: number;
  mode: Mode;
  skill: string;
}
const W: readonly Piece[] = ["wood"];
const WS: readonly Piece[] = ["wood", "steel"];
const WSP: readonly Piece[] = ["wood", "steel", "pillar"];
const ALL: readonly Piece[] = ["wood", "steel", "pillar", "brace"];

export const LEVELS: readonly LevelSpec[] = [
  { label: "1–2 cells, wood only, scooter or car", gap: [1, 2], pattern: "ground", vehicles: ["scooter", "car"], pieces: W, slack: 2, mode: "build", skill: SKILL.spanLoad },
  { label: "2–3 cells, wood or steel, scooter or car", gap: [2, 3], pattern: "ground", vehicles: ["scooter", "car"], pieces: WS, slack: 1.6, mode: "build", skill: SKILL.spanLoad },
  { label: "4–5 cells, car or van: wood can't span 4, add a pillar", gap: [4, 5], pattern: "ground", vehicles: ["car", "van"], pieces: WSP, slack: 1.3, mode: "build", skill: SKILL.spanLoad },
  { label: "3–5 cells, truck: steel, more pillars or triangles", gap: [3, 5], pattern: "ground", vehicles: ["truck"], pieces: ALL, slack: 1.5, mode: "build", skill: SKILL.triangle },
  { label: "4–5 cells, truck, tight budget: all-steel is too expensive", gap: [4, 5], pattern: "ground", vehicles: ["truck"], pieces: ALL, slack: 1.15, mode: "build", skill: SKILL.triangle },
  { label: "5–6 cells, deep water in the middle: no middle pillar", gap: [5, 6], pattern: "deep-middle", vehicles: ["van", "truck"], pieces: ALL, slack: 1.3, mode: "deep", skill: SKILL.spanLoad },
  { label: "5–6 cells, mixed ground, bus: several designs fit", gap: [5, 6], pattern: "mixed", vehicles: ["bus"], pieces: ALL, slack: 1.25, mode: "build", skill: SKILL.criteria },
  { label: "improve: one span of a pre-built bridge sags; fix only it", gap: [4, 6], pattern: "mixed", vehicles: ["truck", "bus"], pieces: ALL, slack: 1, mode: "improve", skill: SKILL.iterate },
  { label: "6 cells, mixed, bus, tight budget: the cheapest design combines pillars, wood and triangles", gap: [6, 6], pattern: "mixed", vehicles: ["bus"], pieces: ALL, slack: 1.1, mode: "build", skill: SKILL.iterate },
];
export const BB_MAX_LEVEL = LEVELS.length - 1;

export const roundUp5 = (n: number) => Math.ceil(n / 5 - 1e-9) * 5;

function groundPattern(p: Pattern, gap: number, rng: Rng): boolean[] {
  if (p === "ground") return Array.from({ length: gap }, () => true);
  if (p === "deep-middle") {
    const deep = rng.int(2, 3);
    const first = Math.floor((gap - deep) / 2) + (rng.chance(0.5) && (gap - deep) % 2 === 1 ? 1 : 0);
    return Array.from({ length: gap }, (_, i) => i < first || i >= first + deep);
  }
  // mixed: each cell deep with chance 0.4, never more than 3 deep cells in a row
  for (;;) {
    const g = Array.from({ length: gap }, () => !rng.chance(0.4));
    const longestDeep = g.reduce<[number, number]>(([best, run], x) => (x ? [best, 0] : [Math.max(best, run + 1), run + 1]), [0, 0])[0];
    if (longestDeep <= 3 && g.some((x) => !x)) return g;
  }
}

/** Plans (cheapest uniform designs) that fit the budget; used for the level-6 and level-8 checks. */
const plans = (site: Site, max = Infinity) => plansWithin(site, site.budget, max);
const usesWoodSpan = (d: Design) => d.some((c) => !c.pillar && c.deck === "wood");

/** Every check from §4.4 (also asserted by the unit tests over levels × seeds). */
export function puzzleProblems(pz: Puzzle, level: number): string[] {
  const p: string[] = [];
  const best = cheapest(pz);
  if (!best) return ["no valid design"];
  if (best.cost !== pz.best) p.push("best cost is stale");
  const sol = grade(pz, pz.solution);
  if (!sol.pass) p.push("the solution does not pass");
  if (best.cost > pz.budget) p.push("cheapest design is over budget");
  if (pz.budget % 5 !== 0) p.push("budget is not a multiple of $5");
  for (const c of pz.solution) {
    if (c.pillar && !pz.pieces.includes("pillar")) p.push("solution uses a pillar the level doesn't offer");
    if (c.brace && !pz.pieces.includes("brace")) p.push("solution uses a triangle the level doesn't offer");
    if (c.deck && !pz.pieces.includes(c.deck)) p.push("solution uses a material the level doesn't offer");
  }
  switch (level) {
    case 2:
      if (grade(pz, Array.from({ length: pz.gap }, () => ({ deck: "wood", pillar: false, brace: false }))).pass) p.push("a plain wood deck already works");
      break;
    case 4:
      if (cheapestAllSteel(pz) <= pz.budget) p.push("the all-steel design fits the budget");
      break;
    case 5:
      if (pz.ground.every(Boolean)) p.push("no deep water");
      break;
    case 6:
      if (plans(pz, 2).length < 2) p.push("only one design fits the budget");
      break;
    case 8:
      // A strict "every design that fits uses all three" is impossible with these costs (a braced wood span and a
      // plain steel span of 1 cell differ by $5), so: the cheapest combines all three, pillars are needed, and the
      // all-steel deck does not fit.
      if (!best.design.some((c) => c.pillar) || !best.design.some((c) => c.brace) || !usesWoodSpan(best.design)) p.push("the cheapest design doesn't combine pillars, wood and triangles");
      if (plans(pz).some((pl) => !pl.design.some((c) => c.pillar))) p.push("a design without pillars fits the budget");
      if (cheapestAllSteel(pz) <= pz.budget) p.push("the all-steel design fits the budget");
      break;
  }
  if (pz.mode === "improve") {
    if (!pz.given || !pz.weak) return [...p, "improve level without a given bridge"];
    const g = grade(pz, pz.given);
    if (g.passed.length !== RULES.length - 1 || g.rules.load) p.push("the given bridge must fail exactly the load rule");
    const weakSegs = g.segments.filter((s) => s.tooWeak);
    if (weakSegs.length !== 1 || weakSegs[0]!.start !== pz.weak[0] || weakSegs[0]!.end !== pz.weak[1]) p.push("the given bridge must have exactly the one weak segment");
    const fix = cheapestFix(pz, pz.given, pz.weak[0], pz.weak[1]);
    if (!fix || fix.cost > pz.budget) p.push("no fix of the weak segment fits the budget");
    if (costOf(pz.given) >= pz.budget) p.push("there is no money for a fix");
    if (pz.solution.some((c, i) => (i < pz.weak![0] || i > pz.weak![1]) && JSON.stringify(c) !== JSON.stringify(pz.given![i]))) p.push("the model changes more than the weak part");
  }
  return p;
}

/** Weaken one segment of a valid design: take its triangles away, or swap steel for wood (span ≤ 3). */
function weaken(site: Site, d: Cell[], rng: Rng): { given: Cell[]; weak: [number, number] } | null {
  const segs = segmentsOf(site, d);
  const options = rng.shuffle(segs.flatMap((s) => {
    const out: { given: Cell[]; weak: [number, number] }[] = [];
    if (s.braced) out.push({ given: d.map((c, i) => (i >= s.start && i <= s.end ? { ...c, brace: false } : c)), weak: [s.start, s.end] });
    if (s.mat === "steel" && s.span <= 3) out.push({ given: d.map((c, i) => (i >= s.start && i <= s.end ? { ...c, deck: "wood" } : c)), weak: [s.start, s.end] });
    return out;
  }));
  for (const o of options) {
    const g = grade({ ...site, budget: Infinity }, o.given);
    const weakSegs = g.segments.filter((s) => s.tooWeak);
    if (g.rules.span && !g.rules.load && weakSegs.length === 1 && weakSegs[0]!.start === o.weak[0]) return o;
  }
  return null;
}

function candidate(level: number, rng: Rng): Puzzle | null {
  const spec = LEVELS[level]!;
  const gap = rng.int(spec.gap[0], spec.gap[1]);
  const vehicle = rng.pick(spec.vehicles);
  const ground = groundPattern(spec.pattern, gap, rng);
  const open: Site = { gap, ground, vehicle, budget: Infinity, pieces: spec.pieces };
  const best = cheapest(open);
  if (!best) return null;
  if (spec.mode !== "improve") {
    const budget = roundUp5(best.cost * spec.slack);
    return { ...open, budget, mode: spec.mode, solution: best.design, given: null, weak: null, best: best.cost };
  }
  // improve: start from a valid design a little above the cheapest (variety), weaken one segment, budget = cheapest fix
  const start = rng.pick(plansWithin(open, roundUp5(best.cost * 1.4), 40));
  const w = start && weaken(open, start.design, rng);
  if (!w) return null;
  const fix = cheapestFix(open, w.given, w.weak[0], w.weak[1]);
  // the fix must cost something (a fix cheaper than or equal to the weak bridge would make "improve" a rebuild)
  if (!fix || fix.cost <= costOf(w.given)) return null;
  return { ...open, budget: fix.cost, mode: "improve", solution: fix.design, given: w.given, weak: w.weak, best: best.cost };
}

const VEHICLE_WORD: Record<Vehicle, string> = { scooter: "scooter", car: "car", van: "van", truck: "truck", bus: "school bus" };

const PROMPTS: Record<Mode, { line: string; text: (pz: Puzzle) => string }> = {
  build: { line: "bb.prompt.build", text: (pz) => `Build a bridge for the ${VEHICLE_WORD[pz.vehicle]}. Budget: $${pz.budget}.` },
  deep: { line: "bb.prompt.deep", text: (pz) => `Too deep for pillars in the middle! Bridge for the ${VEHICLE_WORD[pz.vehicle]}. Budget: $${pz.budget}.` },
  improve: { line: "bb.prompt.improve", text: (pz) => `This bridge sagged. Fix the weak part! Budget: $${pz.budget}.` },
};
const OBJECTIVE: Record<Mode, string> = {
  build: "Design a bridge that holds the vehicle and costs no more than the budget",
  deep: "Carry the load over a long span with no middle pillar, using steel or triangles, within the budget",
  improve: "Use a load-test result to strengthen only the weak span, within the budget",
};

export function exerciseFor(pz: Puzzle, opts: { id: string; seed: number; skillId: string; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const pr = PROMPTS[pz.mode];
  const given = pz.given ? ` A bridge is already built: ${pz.given.map((c, i) => cellWords(pz, c, i)).join("; ")}.` : "";
  return {
    id: opts.id,
    skillId: opts.skillId,
    objective: OBJECTIVE[pz.mode],
    ages: BB_AGES,
    interaction: "choose",
    answer: { kind: "set", correct: [...RULES], options: RULES.map((r) => ({ id: r, text: RULE_TEXT[r] })) },
    objectKind: pz.vehicle,
    seed: opts.seed,
    tutorial: opts.tutorial,
    a11yDescription: `${siteWords(pz)} Pieces: ${pz.pieces.map((p) => PIECE_NAME[p]).join(", ")}.${given}`,
    params: encodePuzzle(pz),
    prompt: opts.tutorial
      ? { line: "bb.prompt.tutorial", text: "Put a wood plank in the gap, then press Test!" }
      : { line: pr.line, vars: { vehicle: VEHICLE_WORD[pz.vehicle] }, text: pr.text(pz) },
  };
}

export const generateBudgetBridge: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(BB_MAX_LEVEL, level));
  let pz: Puzzle | null = null;
  for (let tries = 0; tries < 400 && !pz; tries++) {
    const c = candidate(lv, rng);
    if (c && puzzleProblems(c, lv).length === 0) pz = c;
  }
  if (!pz) throw new Error(`budget-bridge: no site for level ${lv}`);
  return exerciseFor(pz, { id: `bb-${pz.mode}-g${pz.gap}-${pz.vehicle}-l${lv}n${index}`, seed: rng.int(1, 1_000_000), skillId: LEVELS[lv]!.skill });
};

export { costOf, VEHICLE_WORD };
