import type { ExerciseState } from "../../engine/session";
import type { Exercise } from "../../engine/types";
import { ACTIONS, type FeelingId, SCENARIOS, type Scenario, TUTORIAL, isAction, isFeeling } from "./bank";

/**
 * Board-independent logic for Snug's Feelings Garden (pure, unit-tested): reads an exercise back into its
 * scenario, and picks the helper's words. Helper lines name the CLUE to look at (face, body, what happened)
 * or the idea behind a kinder choice; they never give the answer. Spec §4.5–4.7.
 */
export function scenarioOf(ex: Pick<Exercise, "params">): Scenario {
  const i = ex.params?.sc ?? -1;
  return i < 0 ? TUTORIAL : (SCENARIOS[i] ?? TUTORIAL);
}

/** Every accepted answer for the (first) friend. */
export const acceptedOf = (ex: Pick<Exercise, "params">) => [...scenarioOf(ex).accepted];
/** Two-friend items: friend id → accepted feelings. */
export function acceptedByFriend(ex: Pick<Exercise, "params">): Record<string, readonly string[]> {
  const sc = scenarioOf(ex);
  return sc.second ? { [sc.friend]: sc.accepted, [sc.second.friend]: sc.second.accepted ?? [] } : { [sc.friend]: sc.accepted };
}

const POSITIVE: readonly FeelingId[] = ["happy", "excited", "proud", "surprised"];

/** Round-start explanation (Rumble), by level. */
export const EXPLAIN_BY_LEVEL = [
  "fg.help.start", "fg.help.face", "fg.help.face", "fg.help.situation", "fg.help.body",
  "fg.help.kind", "fg.help.calm", "fg.help.more", "fg.help.different",
] as const;
export const explainFor = (ex: Pick<Exercise, "params">) => EXPLAIN_BY_LEVEL[scenarioOf(ex).level] ?? "fg.help.start";

/** First "not yet": diagnose from what the child chose. */
export function hintFor(s: Pick<ExerciseState, "exercise" | "lastAnswer">): string {
  const sc = scenarioOf(s.exercise);
  const ans = s.lastAnswer;
  const picked = typeof ans === "string" ? ans : null;
  if (sc.cue === "two") return "fg.help.different";
  if (picked && isAction(picked) && !ACTIONS[picked].kind) return sc.cue === "calm" ? "fg.hint.calm" : "fg.hint.action";
  if (sc.cue === "help") return "fg.help.kind";
  if (sc.cue === "calm") return "fg.help.calm";
  // "some feelings are bad": a happy face chosen when only harder feelings fit what happened
  const onlyHard = sc.accepted.every((a) => isFeeling(a) && !POSITIVE.includes(a));
  if (picked && isFeeling(picked) && POSITIVE.includes(picked) && onlyHard && (sc.cue === "situation" || sc.cue === "more")) return "fg.help.okay";
  if (sc.cue === "body") return "fg.help.body";
  if (sc.cue === "situation" || sc.cue === "more") return "fg.help.situation";
  return "fg.help.face";
}

/** Praise for the process (never ability), by what the item asked for. */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const sc = scenarioOf(ex);
  switch (sc.cue) {
    case "help":
      return ["fg.praise.kind", "fg.praise.helper"];
    case "calm":
      return ["fg.praise.calm", "fg.praise.safe"];
    case "two":
      return ["fg.praise.different"];
    case "body":
      return ["fg.praise.body", "fg.praise.clues"];
    default:
      return sc.accepted.length > 1 ? ["fg.praise.more", "fg.praise.clues"] : ["fg.praise.clues", "fg.praise.face"];
  }
}

/** The spoken modelled answer (second miss): names the clue and a fitting feeling. */
export const modelLine = (ex: Pick<Exercise, "params">) => `fg.m.${scenarioOf(ex).id}`;
/** Spoken name of a flower or idea card. */
export const optionLine = (id: string) => (isAction(id) ? `fg.a.${id}` : `fg.f.${id}`);
/** Was the item an idea-card item (vs feeling flowers)? */
export const usesCards = (ex: Pick<Exercise, "params">) => isAction(scenarioOf(ex).accepted[0]!);
