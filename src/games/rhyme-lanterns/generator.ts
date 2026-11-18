import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { type DistractorKind, FAMILIES, candidates, familyOf, wordInfo } from "./words";

/**
 * Hoot's Rhyme Lanterns — procedural exercises. PURE and deterministic: same (level, rng, index) → same exercise.
 *
 * Level → parameters (0-based; "Level 1" on screen = level 0). Time pressure is never a parameter.
 *   0 yesno  Do these two rhyme? Non-rhymes share nothing (far).
 *   1 pick   Pick the rhyme from 2 pictures (rhyme + far).
 *   2 pick   Pick from 3: one distractor starts with the same sound (cat → cake).
 *   3 pick   Pick from 3: same vowel, different ending (cat → can) + same first sound.
 *   4 odd    Odd one out: 3 rhyming lanterns + 1 with the same vowel (cat hat bat | can).
 *   5 pick   Pick from 4 with consonant blends (frog → log): first-sound, vowel and far distractors.
 *   6 chain  Rhyme chain of 3: hang 2 rhymes after Hoot's lantern, from 4 (2 near-miss distractors).
 *   7 chain  Rhyme chain of 4: hang 3 rhymes, from 6 (first-sound, vowel and far distractors).
 * Full rationale and misconception per distractor: docs/worlds/rhyme-lanterns.md.
 */
export type Mode = "yesno" | "pick" | "odd" | "chain";
export const MODES: readonly Mode[] = ["yesno", "pick", "odd", "chain"];

export interface LevelSpec {
  mode: Mode;
  /** Distractor kinds, one wrong option each (yesno: the "no" partner). */
  distractors: readonly DistractorKind[];
  /** pick: target or answer starts with a consonant blend. */
  blend?: boolean;
  /** chain: lanterns on the finished string, Hoot's included. */
  links?: number;
}

export const RHYME_LEVELS: readonly LevelSpec[] = [
  { mode: "yesno", distractors: ["far"] },
  { mode: "pick", distractors: ["far"] },
  { mode: "pick", distractors: ["onset", "far"] },
  { mode: "pick", distractors: ["vowel", "onset"] },
  { mode: "odd", distractors: ["vowel"] },
  { mode: "pick", distractors: ["onset", "vowel", "far"], blend: true },
  { mode: "chain", distractors: ["onset", "vowel"], links: 3 },
  { mode: "chain", distractors: ["onset", "vowel", "far"], links: 4 },
];
export const RHYME_MAX_LEVEL = RHYME_LEVELS.length - 1;
export const RHYME_AGES = [3, 5] as const;
export const RHYME_SKILL = "english.phon.rhyme";

/** The answer option for a word: the picture (art) plus its spoken name for pre-readers. */
export const wordOption = (word: string): AnswerOption => ({ id: word, art: word, say: `rl.w.${word}` });
export const YES: AnswerOption = { id: "yes", text: "Yes", say: "rl.yes" };
export const NO: AnswerOption = { id: "no", text: "No", say: "rl.no" };

/** How many rhyming partners (besides the target) a level needs from the target's family. */
function partnersNeeded(spec: LevelSpec): number {
  if (spec.mode === "chain") return (spec.links ?? 3) - 1;
  if (spec.mode === "odd") return 2;
  return 1;
}

/** Can `target` be used at this level with every distractor kind strictly available (no fallbacks)? */
function eligible(spec: LevelSpec, target: string): boolean {
  const fam = familyOf(target);
  if (fam.length - 1 < partnersNeeded(spec)) return false;
  if (spec.blend && !fam.some((w) => wordInfo(w).blend)) return false;
  if (spec.blend && fam.every((w) => wordInfo(w).blend)) return false;
  const need = new Map<DistractorKind, number>();
  for (const k of spec.distractors) need.set(k, (need.get(k) ?? 0) + 1);
  for (const [k, n] of need) if (candidates(k, target).length < n) return false;
  return true;
}

/** Eligible targets per level, grouped by family (bank order), precomputed once. */
export const ELIGIBLE: readonly (readonly (readonly string[])[])[] = RHYME_LEVELS.map((spec) =>
  [...FAMILIES.values()].map((fam) => fam.filter((w) => eligible(spec, w))).filter((g) => g.length > 0),
);

const pickDistractors = (spec: LevelSpec, target: string, rng: Rng): string[] => {
  const used = new Set<string>();
  return spec.distractors.map((k) => {
    const pool = candidates(k, target).filter((w) => !used.has(w));
    const w = rng.pick(pool);
    used.add(w);
    return w;
  });
};

export const generateRhymeLanterns: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(RHYME_MAX_LEVEL, level));
  const spec = RHYME_LEVELS[lv]!;
  // Families are spread over the round by index (one bucket of families per index), so a band of 8 never
  // repeats a family unless the level has fewer than 8 eligible families; the word inside is random.
  const groups = ELIGIBLE[lv]!;
  const bucket = (k: number) => Math.floor((k * groups.length) / 8);
  const slot = index % 8;
  const lo = bucket(slot);
  const hi = Math.max(lo, bucket(slot + 1) - 1);
  const group = groups[rng.int(lo, Math.min(hi, groups.length - 1))]!;
  let target = rng.pick(group);
  const seed = rng.int(1, 999_999);
  const base = { ages: RHYME_AGES, skillId: RHYME_SKILL, interaction: "choose" as const, seed };
  const tag = `l${lv}n${index}`;
  const partners = (n: number) => rng.shuffle(familyOf(target).filter((w) => w !== target)).slice(0, n);

  switch (spec.mode) {
    case "yesno": {
      const yes = rng.chance(0.5);
      const other = yes ? partners(1)[0]! : pickDistractors(spec, target, rng)[0]!;
      return {
        ...base,
        id: `rl-yesno-${target}-${other}-${tag}`,
        objective: yes ? `Hear that ${target} and ${other} rhyme` : `Hear that ${target} and ${other} do not rhyme`,
        answer: { kind: "choice", correct: yes ? "yes" : "no", options: [YES, NO] },
        objectKind: target,
        params: { mode: 0 },
        prompt: { line: "rl.ask.yesno", vars: { a: target, b: other }, text: `Do ${target} and ${other} rhyme?` },
        a11yDescription: `Hoot's lantern shows a ${target}. The next lantern shows a ${other}. Do ${target} and ${other} rhyme? Choose yes or no.`,
      } satisfies Omit<Exercise, "difficulty">;
    }
    case "pick": {
      let answer = partners(1)[0]!;
      if (spec.blend) {
        // one of the pair starts with a blend (frog → log or log → frog)
        const fam = familyOf(target);
        if (!wordInfo(target).blend && !wordInfo(answer).blend) answer = rng.pick(fam.filter((w) => wordInfo(w).blend));
        if (wordInfo(target).blend && wordInfo(answer).blend) answer = rng.pick(fam.filter((w) => !wordInfo(w).blend));
      }
      const wrong = pickDistractors(spec, target, rng);
      const words = rng.shuffle([answer, ...wrong]);
      return {
        ...base,
        id: `rl-pick-${target}-${tag}`,
        objective: `Pick the word that rhymes with ${target}`,
        answer: { kind: "choice", correct: answer, options: words.map(wordOption) },
        objectKind: target,
        params: { mode: 1 },
        prompt: { line: "rl.ask.pick", vars: { a: target }, text: `What rhymes with ${target}?` },
        a11yDescription: `Hoot's lantern shows a ${target}. Picture lanterns: ${words.join(", ")}. Hang the one that rhymes with ${target} next to Hoot's lantern.`,
      } satisfies Omit<Exercise, "difficulty">;
    }
    case "odd": {
      const group = [target, ...partners(2)];
      const odd = pickDistractors(spec, target, rng)[0]!;
      const words = rng.shuffle([...group, odd]);
      return {
        ...base,
        id: `rl-odd-${odd}-${target}-${tag}`,
        objective: `Find the word that does not rhyme with ${group.join(", ")}`,
        answer: { kind: "choice", correct: odd, options: words.map(wordOption) },
        objectKind: "lantern",
        params: { mode: 2 },
        prompt: { line: "rl.ask.odd", vars: { a: target }, text: "Which one does not rhyme?" },
        a11yDescription: `Four lanterns: ${words.join(", ")}. Three of them rhyme. Put the one that does not rhyme in the basket.`,
      } satisfies Omit<Exercise, "difficulty">;
    }
    case "chain": {
      const links = spec.links ?? 3;
      // prefer a target with a full family so the chain can always be completed
      if (familyOf(target).length < links) target = rng.pick(group.filter((w) => familyOf(w).length >= links));
      const right = partners(links - 1);
      const wrong = pickDistractors(spec, target, rng);
      const words = rng.shuffle([...right, ...wrong]);
      return {
        ...base,
        id: `rl-chain-${target}-${tag}`,
        objective: `Make a rhyme chain of ${links} starting with ${target}`,
        answer: { kind: "set", correct: right, options: words.map(wordOption) },
        objectKind: target,
        params: { mode: 3, links },
        prompt: { line: "rl.ask.chain", vars: { a: target }, text: `Find ${links - 1} words that rhyme with ${target}` },
        a11yDescription: `Hoot's lantern shows a ${target}, with ${links - 1} empty hooks after it. Picture lanterns: ${words.join(", ")}. Hang every one that rhymes with ${target}.`,
      } satisfies Omit<Exercise, "difficulty">;
    }
  }
};
