import type { Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { type Form, MAX_X, type Pans, answerChoices, describeSide, formOf, formatEq, side, storyCount } from "./logic";

/**
 * Balance Scale Island — procedural equations (pure: same level + rng + index → same exercise).
 * Every equation is BUILT from its answer (pick the bag weight x first, then the numbers around it), so it
 * always has exactly one whole-number solution in 1..12 and every pan stays within MAX_UNITS / MAX_BAGS.
 *
 * Level (0-based) → equation shape (docs/curriculum/maths.md §3 item 7, docs/worlds/balance-island.md):
 *   0  x + q = r          x 1–6,  q 1–4               one step: take the same weight off both pans
 *   1  x + q = r to 20    x 2–12, q 2–8,  r ≤ 20      the bag may sit on the right pan (r = x + q)
 *   2  2x = r             x 2–9                       split both pans into 2 equal groups
 *   3  px = r             p 3–5, x 2–8, r ≤ 40
 *   4  2x + q = r         x 1–9, q 1–9                two steps: take away, then split
 *   5  px + q = r         p 3–5, x 1–7, q 1–9, r ≤ 40
 *   6  px + q = sx + r    s 1–2, p s+1..5, x 1–8, q 0–6   bags on both pans: take bags off both first
 *   7  word story → equation (choose) → solve        forms rotate two-step / add / both / mult
 */
export const BALANCE_AGES = [11, 13] as const;
export const SKILL = {
  one: "math.alg.one-step",
  two: "math.alg.two-step",
  both: "math.alg.both-sides",
} as const;

export interface LevelSpec {
  form: Form;
  story?: boolean;
  /** Short description for docs / tests. */
  label: string;
}
export const BALANCE_LEVELS: readonly LevelSpec[] = [
  { form: "add", label: "x + q = r (r ≤ 10)" },
  { form: "add", label: "x + q = r to 20, either side" },
  { form: "mult", label: "2x = r" },
  { form: "mult", label: "px = r, p 3–5" },
  { form: "two", label: "2x + q = r" },
  { form: "two", label: "px + q = r, p 3–5" },
  { form: "both", label: "px + q = sx + r" },
  { form: "two", story: true, label: "word story → equation → solve" },
];
export const BALANCE_MAX_LEVEL = BALANCE_LEVELS.length - 1;
const STORY_FORMS: readonly Form[] = ["two", "add", "both", "mult"];

/** Bags-side numbers for a level + form: P bags + Q kg = S bags + R kg, with bag weight x. */
function numbers(level: number, form: Form, rng: Rng): { p: number; q: number; s: number; x: number } {
  switch (form) {
    case "add": {
      if (level === 0) return { p: 1, q: rng.int(1, 4), s: 0, x: rng.int(1, 6) };
      const x = rng.int(2, MAX_X);
      return { p: 1, q: rng.int(2, Math.min(8, 20 - x)), s: 0, x };
    }
    case "mult": {
      const p = level <= 2 ? 2 : rng.int(3, 5);
      const x = p === 2 ? rng.int(2, 9) : rng.int(2, Math.min(8, Math.floor(40 / p)));
      return { p, q: 0, s: 0, x };
    }
    case "two": {
      const p = level === 4 ? 2 : rng.int(3, 5);
      const x = p === 2 ? rng.int(1, 9) : rng.int(1, 7);
      return { p, q: rng.int(1, Math.min(9, 40 - p * x)), s: 0, x };
    }
    case "both": {
      const s = rng.int(1, 2);
      const p = rng.int(s + 1, Math.min(5, s + 3));
      // stories always name a loose weight on both pans
      return { p, q: rng.int(level === 7 ? 1 : 0, 6), s, x: rng.int(1, 8) };
    }
  }
}

const skillFor = (form: Form) => (form === "both" ? SKILL.both : form === "two" ? SKILL.two : SKILL.one);

export function exerciseFrom(pans: Pans, opts: { id: string; seed: number; story?: number; tutorial?: boolean; pick?: (n: number) => number }): Omit<Exercise, "difficulty"> {
  const x = (pans.r.n - pans.l.n) / (pans.l.x - pans.r.x);
  const form = formOf(pans);
  const eq = formatEq(pans);
  const isStory = opts.story !== undefined;
  const prompt = opts.tutorial
    ? { line: "bi.prompt.tutorial", text: "Take the same off both pans. What does one bag weigh?" }
    : isStory
      ? { line: "bi.prompt.story", text: "Match the story to an equation, then solve it." }
      : form === "both"
        ? { line: "bi.prompt.both", text: "Bags on both pans! What does one bag weigh?" }
        : { line: "bi.prompt.one", text: "Keep it balanced. What does one bag weigh?" };
  return {
    id: opts.id,
    skillId: skillFor(form),
    objective: isStory ? `Write a word story as ${eq} and solve it` : `Solve ${eq} by doing the same to both sides`,
    ages: BALANCE_AGES,
    interaction: "choose",
    answer: { kind: "number", value: x, choices: answerChoices(pans, opts.pick) },
    objectKind: "bag",
    seed: opts.seed,
    ...(opts.tutorial ? { tutorial: true } : {}),
    params: { lx: pans.l.x, ln: pans.l.n, rx: pans.r.x, rn: pans.r.n, ...(isStory ? { story: opts.story! } : {}) },
    prompt,
    a11yDescription: `${isStory ? "A word story about mystery bags. " : ""}Balance scale. Left pan: ${describeSide(pans.l)}. Right pan: ${describeSide(pans.r)}. The scale is balanced${isStory ? "" : `: ${eq.replace(/(\d)x/g, "$1 x")}`}.`,
  };
}

export const generateBalance: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(BALANCE_MAX_LEVEL, level));
  const spec = BALANCE_LEVELS[lv]!;
  const form = spec.story ? STORY_FORMS[index % STORY_FORMS.length]! : spec.form;
  const { p, q, s, x } = numbers(lv, form, rng);
  const bagSide = side(p, q);
  const other = side(s, (p - s) * x + q);
  // from level 1 the bags sometimes sit on the right pan (12 = x + 5): "=" means "balances", not "the answer is next"
  const flip = lv >= 1 && rng.chance(0.35);
  const pans: Pans = flip ? { l: other, r: bagSide } : { l: bagSide, r: other };
  const seed = rng.int(1, 999_999);
  const story = spec.story ? rng.int(0, storyCount(form) - 1) : undefined;
  const id = `bi-${form}-${pans.l.x}x${pans.l.n}-${pans.r.x}x${pans.r.n}-l${lv}n${index}`;
  return exerciseFrom(pans, { id, seed, story, pick: (n) => rng.int(0, n - 1) });
};
