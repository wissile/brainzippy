import type { Exercise, ExerciseGenerator, InteractionType } from "../../engine/types";

/**
 * Counting Adventure — procedural exercises (pure, deterministic: same level + rng + index → same exercise).
 * Reference implementation of an engine generator (docs/GAME_AUTHORING.md §Generators).
 *
 * Level → difficulty parameters (levels are 0-based; Level 1 on screen = level 0):
 *   quantities to count; ten-frame layouts from level 3 (structured subitising); the first level uses a row
 *   for some tap-count items (easiest to count one-to-one). Quantities stay within 1–10 and the four snack
 *   kinds, because the spoken prompts / praise are pre-rendered for exactly those values.
 * Interactions rotate tap → choose → make by index so a round alternates (R5).
 */
export const COUNTING_LEVELS = [
  { min: 1, max: 3 },
  { min: 2, max: 4 },
  { min: 3, max: 5 },
  { min: 4, max: 6 },
  { min: 5, max: 7 },
  { min: 6, max: 8 },
  { min: 7, max: 9 },
  { min: 8, max: 10 },
] as const;
export const COUNTING_MAX_LEVEL = COUNTING_LEVELS.length - 1;
export const COUNTING_AGES = [4, 6] as const;

const KINDS = ["apple", "carrot", "cookie", "berry"] as const;
const NAMES: Record<(typeof KINDS)[number], [string, string]> = {
  apple: ["apple", "apples"],
  carrot: ["carrot", "carrots"],
  cookie: ["cookie", "cookies"],
  berry: ["strawberry", "strawberries"],
};
const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const ROTATION: readonly InteractionType[] = ["tap-count", "choose-count", "make-set"];
const SHORT: Record<string, string> = { "tap-count": "tap", "choose-count": "choose", "make-set": "make" };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const name = (kind: (typeof KINDS)[number], n: number) => NAMES[kind][n === 1 ? 0 : 1];

/** Three neighbouring numbers that include the target (1..11), e.g. 1 → [1, 2, 3], 7 → [6, 7, 8]. */
export function neighbourChoices(target: number): number[] {
  const lo = Math.max(1, target - 1);
  return [lo, lo + 1, lo + 2];
}

export const generateCounting: ExerciseGenerator = (level, rng, index) => {
  const band = COUNTING_LEVELS[Math.max(0, Math.min(COUNTING_MAX_LEVEL, level))]!;
  const interaction = ROTATION[index % ROTATION.length]!;
  const kind = rng.pick(KINDS);
  const seed = rng.int(1, 999_999);
  // counting a single object (or putting one in the basket) is trivial: tap/make start at 2
  const min = interaction === "choose-count" ? band.min : Math.max(2, band.min);
  let n = rng.int(min, band.max);
  if (interaction === "make-set") n = Math.min(n, 8); // the pile holds at most 10
  const id = `ca-${SHORT[interaction]}-${n}-${kind}-l${level}n${index}`;
  const base = { id, ages: COUNTING_AGES, objectKind: kind, seed } as const;

  if (interaction === "make-set") {
    const poolSize = Math.min(10, n + rng.int(2, 3));
    return {
      ...base,
      skillId: "math.count.make-set",
      objective: `Count out ${n} from a group of ${poolSize}`,
      interaction,
      answer: { kind: "number", value: n },
      poolSize,
      a11yDescription: `${cap(WORDS[poolSize]!)} ${name(kind, poolSize)} next to Bobbo's basket.`,
    } satisfies Omit<Exercise, "difficulty">;
  }

  const layout = interaction === "choose-count" && level >= 3 && n >= 5 && rng.chance(0.5) ? "ten-frame" : interaction === "tap-count" && level === 0 && rng.chance(0.5) ? "row" : "scatter";
  const where = layout === "ten-frame" ? "in a ten frame" : layout === "row" ? "in a row" : n >= 4 ? "scattered on the blanket" : "on the blanket";
  return {
    ...base,
    skillId: interaction === "choose-count" ? "math.count.subitize" : n <= 3 ? "math.count.one-to-one" : "math.count.cardinality",
    objective:
      interaction === "choose-count"
        ? layout === "ten-frame" ? `Count ${n} in a ten frame` : `Recognise ${n} at a glance`
        : n <= 3 ? `Count ${n} objects by touching each one` : `Count ${n} and say how many`,
    interaction,
    answer: { kind: "number", value: n, choices: neighbourChoices(n) },
    layout,
    a11yDescription: `${cap(WORDS[n]!)} ${name(kind, n)} ${where}.`,
  } satisfies Omit<Exercise, "difficulty">;
};
