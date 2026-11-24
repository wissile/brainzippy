import type { ExerciseState } from "../../engine/session";
import type { Exercise } from "../../engine/types";
import { SKILLS } from "./generator";
import { classWord, fitOf, gapOf, modeOf, passageOf, tagOf } from "./logic";
import type { Tag } from "./morphology";

/** Wordroot Grove — which helper line, hint and praise fit an exercise (pure; used by the skin, unit-tested). */

/** Round-start explanation (Gloop explains the concept; docs §4 "Round start"). */
export function explainFor(ex: Exercise): string {
  switch (modeOf(ex)) {
    case "meaning":
    case "build":
      return ex.params?.b === 1 ? "wg.help.suffix" : "wg.help.prefix";
    case "build2":
    case "family":
      return "wg.help.parts";
    case "sort":
    case "fit":
      return "wg.help.class";
    case "rootmatch":
    case "rootmeaning":
      return "wg.help.greek";
    case "wordfor":
    case "rootcontext":
      return "wg.help.latin";
    case "clueMeaning":
    case "clueTap":
      return "wg.help.context";
    case "owner":
    case "apostrophe":
      return "wg.help.apostrophe";
    default:
      return "wg.help.confused";
  }
}

const AFFIX_TAGS = new Set<Tag>(["un", "re", "dis", "pre"]);
const SUFFIX_TAGS = new Set<Tag>(["ful", "less", "er", "able"]);
const GAP_HINT: Partial<Record<Tag, string>> = {
  "its-possessive": "wg.hint.its", "its-contraction": "wg.hint.its", "no-apostrophe": "wg.hint.plural", irregular: "wg.hint.irregular",
  contraction: "wg.hint.contraction", "plural-owner": "wg.hint.owners", "singular-owner": "wg.hint.owners",
  there: "wg.hint.they", their: "wg.hint.they", theyre: "wg.hint.they", to: "wg.hint.to", too: "wg.hint.to", two: "wg.hint.to",
  your: "wg.hint.you", youre: "wg.hint.you", than: "wg.hint.than", then: "wg.hint.than",
};

/** First-miss line, keyed by the misconception the wrong answer shows (ENGLISH_PATH §6.6, docs §4 "1st miss"). */
export function hintFor(s: ExerciseState): string {
  const ex = s.exercise;
  const last = s.lastAnswer;
  const m = modeOf(ex);
  const tag = typeof last === "string" ? tagOf(ex, last) : undefined;
  switch (m) {
    case "meaning":
      if (tag === "base-only") return "wg.hint.base";
      if (tag && SUFFIX_TAGS.has(tag)) return "wg.hint.suffix";
      if (tag && AFFIX_TAGS.has(tag)) return "wg.hint.prefix";
      return ex.params?.b === 1 ? "wg.hint.suffix" : "wg.hint.prefix";
    case "build":
      return "wg.hint.build";
    case "build2":
      return "wg.hint.build2";
    case "family":
      return "wg.hint.family";
    case "sort": {
      // the first card on the wrong branch decides which class clue Gloop gives
      const a = ex.answer;
      if (a.kind !== "match" || !last || typeof last !== "object" || Array.isArray(last)) return "wg.hint.sort.noun";
      const wrong = Object.entries(last as Record<string, string>).find(([w, bin]) => a.pairs[w] !== bin)?.[0];
      const cw = wrong ? classWord(wrong) : undefined;
      if (cw?.trap) return "wg.hint.sort.trap";
      return `wg.hint.sort.${cw?.cls ?? "noun"}`;
    }
    case "fit":
      return `wg.hint.fit.${fitOf(ex).cls}`;
    case "rootmatch":
      return "wg.hint.rootmatch";
    case "rootmeaning":
      return tag === "literal" ? "wg.hint.literal" : "wg.hint.roots";
    case "wordfor":
      return "wg.hint.wordfor";
    case "rootcontext":
      return "wg.hint.rootcontext";
    case "clueMeaning":
    case "clueTap":
      return `wg.hint.clue.${passageOf(ex).type}`;
    case "owner":
      return tag === "no-apostrophe" ? "wg.hint.own" : "wg.hint.owners";
    case "apostrophe":
    case "confused":
      return GAP_HINT[gapOf(ex).kind] ?? "wg.hint.test";
    default:
      return "wg.retry.1";
  }
}

/** After a right answer: process praise for what the child just did (docs §5). */
export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex)) {
    case "meaning":
    case "build":
    case "build2":
      return ["wg.praise.1"];
    case "sort":
    case "fit":
      return ["wg.praise.2"];
    case "family":
      return ["wg.praise.family"];
    case "rootmatch":
    case "rootmeaning":
    case "wordfor":
    case "rootcontext":
      return ["wg.praise.roots"];
    case "clueMeaning":
    case "clueTap": {
      const p = passageOf(ex);
      if (p.type === "contrast") return ["wg.praise.4"];
      return ex.skillId === SKILLS.context && p.clues.length === 2 ? ["wg.praise.3"] : ["wg.praise.clue"];
    }
    case "owner":
      return ["wg.praise.5"];
    case "apostrophe": {
      const kind = gapOf(ex).kind;
      if (kind === "no-apostrophe") return ["wg.praise.plural"];
      if (kind === "contraction" || kind === "its-contraction" || kind === "its-possessive") return ["wg.praise.squeeze"];
      return ["wg.praise.5"];
    }
    default: {
      const kind = gapOf(ex).kind;
      if (kind === "theyre" || kind === "their" || kind === "there") return ["wg.praise.6"];
      if (kind === "youre" || kind === "your") return ["wg.praise.you"];
      if (kind === "its-contraction" || kind === "its-possessive") return ["wg.praise.it"];
      return ["wg.praise.test"];
    }
  }
}
