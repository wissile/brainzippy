import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import { ACTIONS, type Cue, FRIEND_NAME, SCENARIOS, type Scenario, TUTORIAL, isAction, optionText } from "./bank";

/**
 * Snug's Feelings Garden — round content. PURE and deterministic: same (level, rng, index) → same exercise.
 * Scenarios are AUTHORED (bank.ts); the generator picks one per round slot and shuffles its options.
 *
 * Level → parameters (0-based; "Level 1" on screen = level 0). Time pressure is never a parameter.
 *   0  clear face + what happened · 2 flowers (happy, sad) · 1 fits                      sel.feel.basic
 *   1  clear face + what happened · 2 flowers (any of happy sad angry scared surprised)  sel.feel.basic
 *   2  clear face + what happened · 4 flowers (happy sad angry scared) · 1 fits          sel.feel.basic
 *   3  what happened only (friend turned away) · 4 flowers · 1–3 fit                     sel.feel.basic
 *   4  body clues only (turned away, no scene) · 4 flowers · 1–2 fit                     sel.feel.body
 *   5  feeling given: what could help? · 3 idea cards · 1–2 kind ideas                   sel.kind.notice
 *   6  big angry feeling: what can they do? · 3 idea cards · 1–2 calm, safe ideas        sel.calm.strategy
 *   7  more feeling words (frustrated, proud, nervous, excited, disappointed, lonely) · 6 flowers · 1–3 fit   sel.feel.more
 *   8  one event, two friends: a flower for each · 6 flowers · each friend 1–3 fit       sel.persp.two-sides
 * Rationale per level and the misconception each "not yet" option targets: docs/worlds/feelings-garden.md.
 */
export interface LevelSpec {
  cue: Cue;
  skill: string;
  /** options offered (flowers or idea cards) */
  options: number;
  /** most answers accepted for one friend */
  maxAccepted: number;
}

export const FG_LEVELS: readonly LevelSpec[] = [
  { cue: "face", skill: "sel.feel.basic", options: 2, maxAccepted: 1 },
  { cue: "face", skill: "sel.feel.basic", options: 2, maxAccepted: 1 },
  { cue: "face", skill: "sel.feel.basic", options: 4, maxAccepted: 1 },
  { cue: "situation", skill: "sel.feel.basic", options: 4, maxAccepted: 3 },
  { cue: "body", skill: "sel.feel.body", options: 4, maxAccepted: 2 },
  { cue: "help", skill: "sel.kind.notice", options: 3, maxAccepted: 2 },
  { cue: "calm", skill: "sel.calm.strategy", options: 3, maxAccepted: 2 },
  { cue: "more", skill: "sel.feel.more", options: 6, maxAccepted: 3 },
  { cue: "two", skill: "sel.persp.two-sides", options: 6, maxAccepted: 3 },
];
export const FG_MAX_LEVEL = FG_LEVELS.length - 1;
export const FG_AGES = [4, 7] as const;
export const FG_SKILLS = ["sel.feel.basic", "sel.feel.body", "sel.kind.notice", "sel.calm.strategy", "sel.feel.more", "sel.persp.two-sides"] as const;
export const FG_ROUND = 8;

/** Scenarios per level, in bank order (the bank alternates feelings and friends so neighbouring slots differ). */
export const BY_LEVEL: readonly (readonly Scenario[])[] = FG_LEVELS.map((_, lv) => SCENARIOS.filter((s) => s.level === lv));

/** Which bank entries round slot `slot` (0..7) may use: disjoint, increasing buckets, so a round never repeats one. */
export function bucket(count: number, slot: number): [number, number] {
  const at = (k: number) => Math.floor((k * count) / FG_ROUND);
  const lo = at(slot % FG_ROUND);
  return [lo, Math.max(lo, at((slot % FG_ROUND) + 1) - 1)];
}

/** An option for the board: a feeling flower or an idea card, with its spoken name for pre-readers. */
export const optionFor = (id: string): AnswerOption => ({
  id,
  text: optionText(id),
  art: isAction(id) ? `card-${id}` : `flower-${id}`,
  say: isAction(id) ? `fg.a.${id}` : `fg.f.${id}`,
});

const list = (ids: readonly string[]) => ids.map(optionText).map((t) => t.toLowerCase()).join(", ");

/** Build the exercise for one scenario (options in the given order). */
export function exerciseFor(sc: Scenario, order: readonly string[], seed: number, tag: string): Omit<Exercise, "difficulty"> {
  const spec = FG_LEVELS[sc.level]!;
  const name = FRIEND_NAME[sc.friend];
  const index = sc === TUTORIAL ? -1 : SCENARIOS.indexOf(sc);
  const base = {
    id: sc === TUTORIAL ? `fg-${sc.id}-tutorial` : `fg-${sc.id}-${tag}`,
    skillId: spec.skill,
    ages: FG_AGES,
    interaction: "choose" as const,
    objectKind: `fg-${sc.friend}`,
    seed,
    params: { level: sc.level, sc: index },
    prompt: { line: `fg.s.${sc.id}`, text: sc.text },
  };
  if (sc.second) {
    const other = FRIEND_NAME[sc.second.friend];
    const acc2 = sc.second.accepted ?? [];
    const accept: Record<string, readonly string[]> = {};
    if (sc.accepted.length > 1) accept[sc.friend] = sc.accepted.slice(1);
    if (acc2.length > 1) accept[sc.second.friend] = acc2.slice(1);
    return {
      ...base,
      objective: `Notice that ${name} and ${other} can feel different about the same thing`,
      answer: {
        kind: "match",
        pairs: { [sc.friend]: sc.accepted[0]!, [sc.second.friend]: acc2[0]! },
        ...(Object.keys(accept).length ? { accept } : {}),
        items: [{ id: sc.friend, text: name }, { id: sc.second.friend, text: other }],
        targets: order.map(optionFor),
      },
      a11yDescription: `${sc.a11y} Feeling flowers: ${list(order)}. Give one flower to ${name} and one to ${other}.`,
    };
  }
  const cards = isAction(sc.accepted[0]!);
  return {
    ...base,
    objective: cards
      ? sc.level === 6
        ? `Choose a calm, safe idea when ${name} feels angry`
        : `Choose a kind idea that could help ${name}`
      : `Name how ${name} might feel from ${sc.cue === "body" ? "body clues" : sc.cue === "situation" ? "what happened" : "the face and what happened"}`,
    answer: {
      kind: "choice",
      correct: sc.accepted[0]!,
      ...(sc.accepted.length > 1 ? { also: sc.accepted.slice(1) } : {}),
      options: order.map(optionFor),
    },
    a11yDescription: cards
      ? `${sc.a11y} Bring the idea card that could help to ${name}.`
      : `${sc.a11y} Feeling flowers: ${list(order)}. Bring a flower that fits to ${name}.`,
  };
}

export const generateFeelingsGarden: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(FG_MAX_LEVEL, level));
  const pool = BY_LEVEL[lv]!;
  const [lo, hi] = bucket(pool.length, index);
  const sc = pool[rng.int(lo, Math.min(hi, pool.length - 1))]!;
  const order = rng.shuffle([...sc.options]);
  return exerciseFor(sc, order, rng.int(1, 999_999), `l${lv}n${index}`);
};

/** Kind ideas never sit in the same spot every time: used by tests to check that every option is a real choice. */
export const isKindIdea = (id: string) => isAction(id) && ACTIONS[id].kind;
