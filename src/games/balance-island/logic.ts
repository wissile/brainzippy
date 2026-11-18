/**
 * Balance Scale Island — pure balance/algebra logic (no React, no DOM).
 *
 * A pan holds `x` mystery bags (each weighs the unknown) and `n` one-kilogram weights, so a pan is the
 * expression `x·X + n`. Two pans are an equation; the scale balances exactly when both sides are equal for the
 * true value X. Every move the child makes is one of these pure functions, so the board, the hints, the
 * generator and the unit tests all share one model.
 */
import { createRng } from "../../engine/rng";

export interface Side {
  /** mystery bags on the pan */
  x: number;
  /** one-kilogram weights on the pan */
  n: number;
}
export interface Pans {
  l: Side;
  r: Side;
}
export type Where = "l" | "r";
export type Kind = "x" | "n";

/** Most weights / bags one pan can hold (keeps every pan readable at 390 px wide). */
export const MAX_UNITS = 40;
export const MAX_BAGS = 6;
/** Every answer (the weight of one bag) stays within 1..MAX_X: praise and hint clips are pre-rendered for these. */
export const MAX_X = 12;

export const side = (x: number, n: number): Side => ({ x, n });
export const pansOf = (p: Readonly<Record<string, number>> | undefined): Pans => ({
  l: side(p?.lx ?? 0, p?.ln ?? 0),
  r: side(p?.rx ?? 0, p?.rn ?? 0),
});
export const samePans = (a: Pans, b: Pans) => a.l.x === b.l.x && a.l.n === b.l.n && a.r.x === b.r.x && a.r.n === b.r.n;

export const weight = (s: Side, x: number) => s.x * x + s.n;
/** Left minus right, in kilograms, for a bag weight of `x`. */
export const diff = (p: Pans, x: number) => weight(p.l, x) - weight(p.r, x);
export const isBalanced = (p: Pans, x: number) => diff(p, x) === 0;

/**
 * Beam angle in degrees (CSS rotation: positive = clockwise = the RIGHT pan goes down).
 * Any imbalance shows at least 3° so a 1 kg difference is visible; big differences ease towards 14°.
 */
export function tiltDeg(d: number): number {
  if (d === 0) return 0;
  return -Math.sign(d) * (3 + 11 * Math.tanh(Math.abs(d) / 6));
}

/** Solve l.x·X + l.n = r.x·X + r.n. Returns null when there is no single solution (same bags on both sides). */
export function solve(p: Pans): number | null {
  const a = p.l.x - p.r.x;
  if (a === 0) return null;
  return (p.r.n - p.l.n) / a;
}

// ---------------------------------------------------------------- moves

const fits = (s: Side) => s.x >= 0 && s.n >= 0 && s.x <= MAX_BAGS && s.n <= MAX_UNITS;

/** Add (delta > 0) or remove (delta < 0) bags or weights on one pan. Null when the move is impossible. */
export function change(p: Pans, where: Where, kind: Kind, delta: number): Pans | null {
  const s = { ...p[where], [kind]: p[where][kind] + delta };
  if (!fits(s)) return null;
  return where === "l" ? { l: s, r: p.r } : { l: p.l, r: s };
}

/** Do the same thing to both pans. Null when either pan can't take it. */
export function both(p: Pans, kind: Kind, delta: number): Pans | null {
  const a = change(p, "l", kind, delta);
  return a && change(a, "r", kind, delta);
}

/** Move one item from one place to another ("shelf" = the market counter, i.e. off the scale). */
export function move(p: Pans, from: Where | "shelf", to: Where | "shelf", kind: Kind): Pans | null {
  if (from === to) return null;
  let next: Pans | null = p;
  if (from !== "shelf") next = change(next, from, kind, -1);
  if (next && to !== "shelf") next = change(next, to, kind, +1);
  return next;
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** The largest number of equal groups both pans can be split into (0/1 = no split possible). */
export function splitFactor(p: Pans): number {
  return [p.l.x, p.l.n, p.r.x, p.r.n].reduce((g, v) => gcd(g, v), 0);
}

/** Split both pans into k equal groups and keep one group of each. */
export function split(p: Pans, k: number): Pans | null {
  if (k < 2 || splitFactor(p) % k !== 0) return null;
  return { l: side(p.l.x / k, p.l.n / k), r: side(p.r.x / k, p.r.n / k) };
}

/** Which pan holds a single bag on its own while the other holds only weights (the "read the answer" state). */
export function isolatedSide(p: Pans): Where | null {
  if (p.l.x === 1 && p.l.n === 0 && p.r.x === 0) return "l";
  if (p.r.x === 1 && p.r.n === 0 && p.l.x === 0) return "r";
  return null;
}

// ---------------------------------------------------------------- notation

export function formatSide(s: Side): string {
  const parts: string[] = [];
  if (s.x > 0) parts.push(s.x === 1 ? "x" : `${s.x}x`);
  if (s.n > 0) parts.push(String(s.n));
  return parts.length ? parts.join(" + ") : "0";
}
export const formatEq = (p: Pans) => `${formatSide(p.l)} = ${formatSide(p.r)}`;

/** Plain-language description of a pan for screen readers. */
export function describeSide(s: Side): string {
  const bags = s.x === 0 ? "" : s.x === 1 ? "1 mystery bag" : `${s.x} mystery bags`;
  const kg = s.n === 0 ? "" : s.n === 1 ? "1 kilogram" : `${s.n} kilograms`;
  return [bags, kg].filter(Boolean).join(" and ") || "nothing";
}

/** What changed between two balanced states, written the way it goes in a maths book ("−3", "÷2"). */
export function stepNote(prev: Pans, next: Pans): string {
  const dlx = next.l.x - prev.l.x;
  const dln = next.l.n - prev.l.n;
  if (dlx === next.r.x - prev.r.x && dln === next.r.n - prev.r.n && (dlx !== 0 || dln !== 0)) {
    const term = (v: number, unit: string) => (v === 0 ? "" : `${v < 0 ? "−" : "+"}${Math.abs(v) === 1 && unit ? "" : Math.abs(v)}${unit}`);
    return [term(dlx, "x"), term(dln, "")].filter(Boolean).join(" ");
  }
  for (const k of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const s = split(prev, k);
    if (s && samePans(s, next)) return `÷${k}`;
  }
  return "";
}

// ---------------------------------------------------------------- worked solution

export interface SolveStep {
  op: "bags" | "units" | "split";
  /** bags / kilograms taken off both pans, or the number of equal groups */
  k: number;
  pans: Pans;
}

/**
 * The model solution, one balanced step at a time: take the smaller number of bags off both pans, then the
 * smaller number of weights off both pans, then split both pans into as many groups as there are bags left.
 * For every equation the generator makes this ends with one bag alone against X kilograms.
 */
export function solveSteps(p0: Pans): SolveStep[] {
  const steps: SolveStep[] = [];
  let p = p0;
  const mb = Math.min(p.l.x, p.r.x);
  if (mb > 0) {
    p = both(p, "x", -mb)!;
    steps.push({ op: "bags", k: mb, pans: p });
  }
  const mn = Math.min(p.l.n, p.r.n);
  if (mn > 0) {
    p = both(p, "n", -mn)!;
    steps.push({ op: "units", k: mn, pans: p });
  }
  const bags = Math.max(p.l.x, p.r.x);
  if (bags > 1) {
    const s = split(p, bags);
    if (s) {
      p = s;
      steps.push({ op: "split", k: bags, pans: p });
    }
  }
  return steps;
}

// ---------------------------------------------------------------- answer choices

/**
 * Four answer choices: the true weight and three wrong answers that come from real misconceptions,
 * most telling first (then near misses). Sorted ascending.
 *   R + Q             did the operation shown (added the loose weights instead of taking them away)
 *   R − Q             took the weights away but forgot to split into groups
 *   (R + Q) / B       split correctly but with the wrong inverse for the weights
 *   (R − Q) / (P + S) added the bags on both sides instead of taking them away
 *   (R − Q) / P       ignored the bags on the other pan
 *   R − P             subtracted the number of bags instead of dividing (px = q)
 *   R / P − Q         split first and only divided the bags, not the weights
 * where P/Q are the bags/weights on the pan with more bags, S/R the bags/weights on the other pan, B = P − S.
 */
export function answerChoices(p0: Pans, pick: (n: number) => number = () => 0): number[] {
  const x = solve(p0);
  if (x === null) return [];
  const big = p0.l.x >= p0.r.x ? p0.l : p0.r;
  const other = big === p0.l ? p0.r : p0.l;
  const P = big.x, Q = big.n, S = other.x, R = other.n, B = P - S;
  const cands: number[] = [];
  if (Q > 0) cands.push(R + Q);
  if (B > 1) cands.push(R - Q);
  if (Q > 0 && B > 1) cands.push((R + Q) / B);
  if (S > 0) cands.push((R - Q) / (P + S), (R - Q) / P);
  if (Q === 0 && S === 0 && P > 1) cands.push(R - P);
  if (Q > 0 && P > 1) cands.push(R / P - Q);
  const near = [x + 1, x - 1, x + 2, x + 3];
  const ok = (v: number, have: number[]) => Number.isInteger(v) && v >= 1 && v <= 60 && v !== x && !have.includes(v);
  const out: number[] = [];
  for (const v of cands) if (out.length < 2 && ok(v, out)) out.push(v);
  // one near miss chosen by the exercise's rng (so the right answer is not always in the middle), then fill
  const nearOk = near.filter((v) => ok(v, out));
  if (nearOk.length) out.push(nearOk[pick(Math.min(2, nearOk.length)) % nearOk.length]!);
  for (const v of [...cands, ...near]) if (out.length < 3 && ok(v, out)) out.push(v);
  return [...out, x].sort((a, b) => a - b);
}

// ---------------------------------------------------------------- word stories (top level)

export type Form = "add" | "mult" | "two" | "both";
export const FORMS: readonly Form[] = ["add", "mult", "two", "both"];

/** The equation form of a set of pans (bags-side first). */
export function formOf(p: Pans): Form {
  if (p.l.x > 0 && p.r.x > 0) return "both";
  const big = p.l.x > 0 ? p.l : p.r;
  if (big.x === 1) return "add";
  return big.n === 0 ? "mult" : "two";
}

interface StoryNums {
  p: number;
  q: number;
  s: number;
  r: number;
}
/** Bags-side numbers: P bags + Q kg (left) balance S bags + R kg. */
export function storyNums(p0: Pans): StoryNums {
  const big = p0.l.x >= p0.r.x ? p0.l : p0.r;
  const other = big === p0.l ? p0.r : p0.l;
  return { p: big.x, q: big.n, s: other.x, r: other.n };
}

const STORIES: Record<Form, readonly ((v: StoryNums) => string)[]> = {
  add: [
    ({ q, r }) => `A sealed bag of plums and a ${q} kg melon weigh ${r} kg together.`,
    ({ q, r }) => `Gloop's bag of figs plus a ${q} kg pumpkin balances ${r} kg of weights.`,
  ],
  mult: [
    ({ p, r }) => `${p} identical bags of apples weigh ${r} kg altogether.`,
    ({ p, r }) => `Puff packs ${p} equal sacks of rice. Together they weigh ${r} kg.`,
  ],
  two: [
    ({ p, q, r }) => `${p} identical bags of pears and a ${q} kg pumpkin weigh ${r} kg in total.`,
    ({ p, q, r }) => `Zuzu carries ${p} equal bags of nuts in a ${q} kg basket. The full basket weighs ${r} kg.`,
  ],
  both: [
    ({ p, q, s, r }) => `${p} bags of limes and ${q} kg of weights balance ${s} ${s === 1 ? "bag" : "bags"} of limes and ${r} kg.`,
    ({ p, q, s, r }) => `On Bobbo's scale, ${p} sacks plus ${q} kg exactly balance ${s} ${s === 1 ? "sack" : "sacks"} plus ${r} kg.`,
  ],
};
export const storyCount = (f: Form) => STORIES[f].length;
export function storyText(p0: Pans, which: number): string {
  const list = STORIES[formOf(p0)];
  return list[((which % list.length) + list.length) % list.length]!(storyNums(p0));
}

const coef = (k: number) => (k === 1 ? "x" : `${k}x`);

export interface EqOption {
  text: string;
  correct: boolean;
  /** The misconception a wrong option models (documentation + tests). */
  why: string;
}

/**
 * Equation options for a word story: the equation of the scale plus misconception-based look-alikes,
 * deduplicated and shuffled by `seed` (deterministic). Always 3–4 options with exactly one correct.
 */
export function equationOptions(p0: Pans, seed: number): EqOption[] {
  const { p, q, s, r } = storyNums(p0);
  const right = `${formatSide({ x: p, n: q })} = ${formatSide({ x: s, n: r })}`;
  let wrong: [string, string][] = [];
  switch (formOf(p0)) {
    case "add":
      wrong = [
        [`${q}x = ${r}`, "reads the loose weight as a number of bags"],
        [`x + ${r} = ${q}`, "swaps the part and the total"],
        [`x = ${q} + ${r}`, "adds every number in the story"],
      ];
      break;
    case "mult":
      wrong = [
        [`x + ${p} = ${r}`, "reads 3x as 3 + x"],
        [`${r}x = ${p}`, "swaps the number of bags and the total"],
        [`x = ${r}`, "treats the total as the weight of one bag"],
      ];
      break;
    case "two":
      wrong = [
        [`x + ${p} + ${q} = ${r}`, "reads 3x as 3 + x"],
        [`${p}(x + ${q}) = ${r}`, "puts the extra weight in every bag"],
        [`${p}x = ${q} + ${r}`, "puts the extra weight on the wrong side"],
        [`${q}x + ${p} = ${r}`, "swaps the number of bags and the extra weight"],
      ];
      break;
    case "both":
      wrong = [
        [`${formatSide({ x: p, n: r })} = ${formatSide({ x: s, n: q })}`, "swaps the loose weights between the pans"],
        [`${coef(p + s)} + ${q} = ${r}`, "adds the bags from both pans together"],
        [`${formatSide({ x: s, n: q })} = ${formatSide({ x: p, n: r })}`, "swaps the bags between the pans"],
      ];
      break;
  }
  const seen = new Set([right]);
  const opts: EqOption[] = [{ text: right, correct: true, why: "matches the story" }];
  for (const [text, why] of wrong) {
    if (opts.length >= 4 || seen.has(text)) continue;
    seen.add(text);
    opts.push({ text, correct: false, why });
  }
  return createRng(seed).shuffle(opts);
}
