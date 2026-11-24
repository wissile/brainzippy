import type { ExerciseState } from "../../engine/session";
import type { Exercise } from "../../engine/types";
import { SKILLS } from "./generator";
import { modeOf, tagOf } from "./logic";
import type { Tag } from "./sentences";

/**
 * The Lantern Press — which helper line, hint and praise fit an exercise (pure; used by the skin, unit-tested).
 * Hoot (fact-checker) explains the idea at round start and gives the strategy after a first miss; Sarah (editor)
 * reads prompts, models the answer after a second miss and gives terse process praise (docs §4–§5).
 */
const SKILL_HELP: Readonly<Record<string, string>> = {
  [SKILLS.combine]: "lp.help.combine",
  [SKILLS.modifier]: "lp.help.modifier",
  [SKILLS.pronoun]: "lp.help.pronoun",
  [SKILLS.concise]: "lp.help.concise",
  [SKILLS.connotation]: "lp.help.connotation",
  [SKILLS.figurative]: "lp.help.figurative",
  [SKILLS.voice]: "lp.help.voice",
  [SKILLS.claim]: "lp.help.claim",
  [SKILLS.evaluate]: "lp.help.evaluate",
};
/** Round-start explanation of the concept (docs §4 "Round start"). */
export const explainFor = (ex: Exercise): string => SKILL_HELP[ex.skillId] ?? "lp.help.combine";

/** First-miss line keyed by the misconception tag of the wrong choice. */
const TAG_HINT: Readonly<Record<Tag, string>> = {
  reversed: "lp.hint.reversed",
  "wrong-relation": "lp.hint.relation",
  "comma-splice": "lp.hint.splice",
  "run-on": "lp.hint.runon",
  "meaning-shift": "lp.hint.meaning",
  "info-loss": "lp.hint.infoloss",
  "still-misplaced": "lp.hint.stillmod",
  "still-ambiguous": "lp.hint.stillamb",
  wordy: "lp.hint.wordy",
  "wrong-connotation": "lp.hint.feeling",
  neutral: "lp.hint.neutral",
  "wrong-device": "lp.hint.device",
  literal: "lp.hint.literal",
  misread: "lp.hint.misread",
  "wrong-focus": "lp.hint.focus",
  shift: "lp.hint.shift",
  irrelevant: "lp.hint.relevant",
  anecdote: "lp.hint.relevant",
  opinion: "lp.hint.check",
  "small-sample": "lp.hint.sample",
  "too-strict": "lp.hint.strict",
};

/** First-miss line (Hoot), keyed by what the miss shows (ENGLISH_PATH §6.6, docs §4 "1st miss"). */
export function hintFor(s: ExerciseState): string {
  const ex = s.exercise;
  const last = s.lastAnswer;
  const m = modeOf(ex);
  const tag = typeof last === "string" ? tagOf(ex, last) : undefined;
  // a meaning shift in a rewrite item means "who does what" changed; elsewhere, the connective's meaning
  if (tag === "meaning-shift" && (m === "modFix" || m === "pronFix")) return "lp.hint.who";
  if (tag === "meaning-shift" && (m === "purpose")) return "lp.hint.focus";
  if (tag) return TAG_HINT[tag];
  switch (m) {
    case "order": return "lp.hint.order";
    case "modTap": return "lp.hint.literalmod";
    case "pronTap": return "lp.hint.pronoun";
    case "cutTap": return "lp.hint.cut";
    case "feelSort": return "lp.hint.sort";
    case "evidenceTap":
    case "claimSort": return "lp.hint.check";
    case "offTap": return "lp.hint.off";
    default: return "lp.retry.1";
  }
}

/** After a right answer: terse process praise for what the learner just did (docs §5). */
export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex)) {
    case "connective": return ["lp.praise.1"];
    case "combine": return ["lp.praise.combine"];
    case "order": return ["lp.praise.order"];
    case "modTap": return ["lp.praise.2"];
    case "modFix": return ["lp.praise.fix"];
    case "pronTap":
    case "pronFix": return ["lp.praise.3"];
    case "cutTap":
    case "concise": return ["lp.praise.4"];
    case "connote": return ["lp.praise.5"];
    case "feelSort": return ["lp.praise.sort"];
    case "device": return ["lp.praise.device"];
    case "figMeaning": return ["lp.praise.6"];
    case "purpose": return ["lp.praise.7"];
    case "shift": return ["lp.praise.shift"];
    case "evidenceTap":
    case "claimSort": return ["lp.praise.8"];
    case "offTap": return ["lp.praise.off"];
    default: return ["lp.praise.evaluate"];
  }
}
