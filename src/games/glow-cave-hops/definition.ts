import type { Difficulty, Exercise, GameDefinition } from "../../engine/types";

/**
 * Glow Cave Hops — exercise DATA only (no rendering or logic).
 * Skill math.add.number-line: addition as moving forward on an evenly spaced, numbered line.
 * Each hop is +1; the child counts on from `start`, so `target = start + hops`.
 * `choices` = every stop on the line (0..max) — the child answers by moving the cart to a stop and pressing Go.
 * Linear number-line board games are among the best-evidenced early number activities (Siegler & Ramani 2008),
 * which is why the line is always evenly spaced and every stop is labelled.
 */
const AGES = [5, 7] as const;
const SKILL = "math.add.number-line";

const line = (max: number) => Array.from({ length: max + 1 }, (_, i) => i);

function hop(start: number, hops: number, max: number, difficulty: Difficulty, seed: number, tutorial = false): Exercise {
  const target = start + hops;
  return {
    id: `gc-${start}-plus-${hops}-to-${max}`,
    skillId: SKILL,
    objective: `Count on ${hops} from ${start} on a 0 to ${max} number line`,
    ages: AGES,
    difficulty,
    interaction: "choose",
    target,
    objectKind: "crystal",
    choices: line(max),
    seed,
    ...(tutorial ? { tutorial: true } : {}),
    params: { start, hops, max },
    prompt:
      hops === 1
        ? { line: "gc.prompt1", vars: { start }, text: `Hop 1 space from ${start}!` }
        : { line: "gc.prompt", vars: { start, hops }, text: `Hop ${hops} spaces from ${start}!` },
    a11yDescription: `A mine cart on a number line from 0 to ${max}. The cart starts on ${start}. Move it forward ${hops} ${hops === 1 ? "hop" : "hops"}.`,
  };
}

export const caveExercises: readonly Exercise[] = [
  // Difficulty 1: line 0–5, 1–2 hops (the tutorial is the very first, one-hop item)
  hop(2, 1, 5, 1, 101, true),
  hop(0, 2, 5, 1, 102),
  hop(1, 1, 5, 1, 103),
  hop(3, 1, 5, 1, 104),
  hop(1, 2, 5, 1, 105),
  hop(3, 2, 5, 1, 106),
  hop(4, 1, 5, 1, 107),
  hop(2, 2, 5, 1, 108),
  hop(0, 1, 5, 1, 109),

  // Difficulty 2: line 0–10, 2–4 hops
  hop(3, 4, 10, 2, 201),
  hop(5, 2, 10, 2, 202),
  hop(6, 3, 10, 2, 203),
  hop(2, 3, 10, 2, 204),
  hop(4, 4, 10, 2, 205),
  hop(7, 2, 10, 2, 206),

  // Difficulty 3: line 0–10, 3–6 hops
  hop(1, 5, 10, 3, 301),
  hop(4, 6, 10, 3, 302),
  hop(2, 4, 10, 3, 303),
  hop(5, 3, 10, 3, 304),
  hop(3, 6, 10, 3, 305),
  hop(6, 4, 10, 3, 306),

  // Difficulty 4: line 0–20, 4–9 hops
  hop(8, 5, 20, 4, 401),
  hop(11, 6, 20, 4, 402),
  hop(9, 7, 20, 4, 403),
  hop(12, 8, 20, 4, 404),
  hop(6, 9, 20, 4, 405),
  hop(13, 4, 20, 4, 406),
];

export const glowCaveHops: GameDefinition = {
  id: "glow-cave-hops",
  title: "Glow Cave Hops",
  mascot: "gloop",
  ages: AGES,
  skillIds: [SKILL],
  learningObjective: "Understand addition as moving forward on a number line: each hop is plus one, counting on from the start number.",
  progression: { roundLength: 8, minDifficulty: 1, maxDifficulty: 4, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: caveExercises,
  achievement: { id: "cave-explorer", title: "Cave Explorer" },
};
