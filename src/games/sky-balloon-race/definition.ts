import type { Difficulty, Exercise, GameDefinition } from "../../engine/types";

/**
 * Sky Balloon Race — exercise DATA only. No rendering or logic lives here.
 * Skill (see docs/CURRICULUM.md):
 *   math.add.within-20 — add two numbers with sums to 20 by counting on from the larger number,
 *                        and by making ten when a sum crosses 10.
 * Difficulty ladder:
 *   1 sums ≤ 5 (count on 1–3)   2 sums 6–10   3 crossing ten (make ten)   4 teen numbers within 20
 * Distractors: target ± 1 / ± 2. target − 1 is the classic counting-on slip (counting the start number again).
 */
const AGES = [6, 8] as const;
const SKILL = "math.add.within-20";

function sum(a: number, b: number, difficulty: Difficulty, choices: readonly number[], seed: number, extra: Partial<Exercise> = {}): Exercise {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const objective =
    difficulty === 3
      ? `Add ${a} and ${b} by making ten`
      : `Add ${a} and ${b} by counting on ${small} from ${big}`;
  return {
    id: `sb-${a}p${b}`,
    skillId: SKILL,
    objective,
    ages: AGES,
    difficulty,
    interaction: "choose",
    target: a + b,
    objectKind: "balloon",
    choices,
    seed,
    params: { a, b },
    prompt: { line: `sb.q.${a}p${b}`, text: `${a} + ${b} = ?` },
    a11yDescription: `${a} plus ${b}. Three number balloons float in the sky: ${choices.join(", ")}. Drag or tap the answer to Bobbo's balloon basket.`,
    ...extra,
  };
}

export const skyExercises: readonly Exercise[] = [
  // Difficulty 1: sums to 5 (9 items so a child who needs easy items can still finish a round)
  sum(2, 1, 1, [2, 3, 4], 101, { tutorial: true }),
  sum(3, 1, 1, [4, 5, 3], 102),
  sum(2, 2, 1, [3, 5, 4], 103),
  sum(4, 1, 1, [6, 4, 5], 104),
  sum(1, 3, 1, [4, 3, 5], 105),
  sum(3, 2, 1, [5, 4, 6], 106),
  sum(1, 2, 1, [3, 2, 4], 107),
  sum(2, 3, 1, [6, 5, 4], 108),
  sum(1, 4, 1, [4, 6, 5], 109),

  // Difficulty 2: sums 6–10
  sum(5, 2, 2, [7, 8, 6], 201),
  sum(6, 3, 2, [10, 8, 9], 202),
  sum(4, 4, 2, [7, 9, 8], 203),
  sum(2, 6, 2, [8, 9, 7], 204),
  sum(7, 3, 2, [9, 10, 12], 205),
  sum(5, 4, 2, [9, 8, 10], 206),

  // Difficulty 3: crossing ten — make ten, then add the rest
  sum(8, 5, 3, [13, 12, 14], 301),
  sum(9, 4, 3, [14, 12, 13], 302),
  sum(7, 6, 3, [12, 13, 14], 303),
  sum(8, 6, 3, [14, 13, 15], 304),
  sum(9, 3, 3, [11, 13, 12], 305),
  sum(3, 8, 3, [11, 10, 12], 306),

  // Difficulty 4: within 20 (teen numbers)
  sum(12, 5, 4, [17, 18, 16], 401),
  sum(14, 6, 4, [19, 20, 18], 402),
  sum(11, 7, 4, [18, 17, 19], 403),
  sum(13, 4, 4, [16, 18, 17], 404),
  sum(16, 3, 4, [19, 18, 20], 405),
  sum(8, 7, 4, [15, 14, 16], 406),
];

export const skyBalloonRace: GameDefinition = {
  id: "sky-balloon-race",
  title: "Sky Balloon Race",
  mascot: "bobbo",
  ages: AGES,
  skillIds: [SKILL],
  learningObjective: "Add two numbers within 20 by counting on from the larger number and by making ten.",
  progression: { roundLength: 8, minDifficulty: 1, maxDifficulty: 4, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: skyExercises,
  achievement: { id: "sky-champion", title: "Sky Champion" },
};
