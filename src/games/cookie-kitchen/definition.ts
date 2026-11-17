import type { Difficulty, Exercise, GameDefinition } from "../../engine/types";

/**
 * Cookie Kitchen — exercise DATA only. Skill (see docs/CURRICULUM.md):
 *   math.div.share-equally — share a quantity equally into groups by dealing one at a time,
 *   then check that every group has the same (early division as fair sharing).
 * params { total, groups }; target = total / groups (always whole).
 * Distractors come from common errors: ±1, subtracting (total − groups), or answering the number of plates.
 */
const AGES = [7, 9] as const;
const SKILL = "math.div.share-equally";

const share = (
  id: string,
  difficulty: Difficulty,
  total: number,
  groups: number,
  choices: number[],
  seed: number,
  tutorial = false,
): Exercise => ({
  id,
  skillId: SKILL,
  objective: `Share ${total} equally into ${groups} groups`,
  ages: AGES,
  difficulty,
  interaction: "choose",
  target: total / groups,
  objectKind: "cookie",
  choices,
  seed,
  ...(tutorial ? { tutorial: true } : {}),
  params: { total, groups },
  prompt: { line: "ck.prompt", vars: { total, groups }, text: `Share ${total} cookies on ${groups} plates!` },
  a11yDescription: `Rumble's tray holds ${total} cookies. There are ${groups} empty plates on the party table.`,
});

export const cookieExercises: readonly Exercise[] = [
  // Difficulty 1: 2 plates, small even totals
  share("ck-4-on-2", 1, 4, 2, [1, 2, 3], 11, true),
  share("ck-2-on-2", 1, 2, 2, [1, 2, 3], 12),
  share("ck-6-on-2", 1, 6, 2, [2, 3, 4], 13),
  share("ck-8-on-2", 1, 8, 2, [3, 4, 5], 14),
  share("ck-6-on-2-b", 1, 6, 2, [3, 4, 5], 15),
  share("ck-4-on-2-b", 1, 4, 2, [2, 3, 4], 16),
  share("ck-8-on-2-b", 1, 8, 2, [2, 4, 6], 17),
  share("ck-2-on-2-b", 1, 2, 2, [1, 2, 3], 18),

  // Difficulty 2: 2–3 plates, up to 12
  share("ck-10-on-2", 2, 10, 2, [4, 5, 8], 21),
  share("ck-6-on-3", 2, 6, 3, [1, 2, 3], 22),
  share("ck-12-on-2", 2, 12, 2, [5, 6, 7], 23),
  share("ck-9-on-3", 2, 9, 3, [3, 4, 6], 24),
  share("ck-12-on-3", 2, 12, 3, [3, 4, 5], 25),

  // Difficulty 3: 3–4 plates, up to 16
  share("ck-8-on-4", 3, 8, 4, [2, 3, 4], 31),
  share("ck-15-on-3", 3, 15, 3, [3, 5, 6], 32),
  share("ck-12-on-4", 3, 12, 4, [3, 4, 8], 33),
  share("ck-4-on-4", 3, 4, 4, [1, 2, 4], 34),
  share("ck-16-on-4", 3, 16, 4, [3, 4, 5], 35),

  // Difficulty 4: 4–5 plates, up to 20
  share("ck-10-on-5", 4, 10, 5, [2, 3, 5], 41),
  share("ck-20-on-4", 4, 20, 4, [4, 5, 6], 42),
  share("ck-15-on-5", 4, 15, 5, [2, 3, 5], 43),
  share("ck-5-on-5", 4, 5, 5, [1, 2, 5], 44),
  share("ck-20-on-5", 4, 20, 5, [3, 4, 5], 45),
];

export const cookieKitchen: GameDefinition = {
  id: "cookie-kitchen",
  title: "Cookie Kitchen",
  mascot: "rumble",
  ages: AGES,
  skillIds: [SKILL],
  learningObjective:
    "Share a quantity equally into groups (early division): deal one at a time to each group, check every group has the same, and say how many each group gets.",
  progression: { roundLength: 8, minDifficulty: 1, maxDifficulty: 4, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: cookieExercises,
  achievement: { id: "fair-sharer", title: "Fair Sharer" },
};
