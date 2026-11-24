import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { SKILLS } from "./generator";
import { classify, gotLine, modeOf, noteOf, pluralOf, sailWord, sentenceLine, spokenWord } from "./logic";
import { graphemes, word, wordLevel } from "./words";

/** Paper Boat Post — which helper line, hint and praise fit an exercise (pure; used by the skin, unit-tested). */

/** Round-start explanation by level/mode (the helper explains the concept, docs/worlds §4). */
export function explainFor(ex: Exercise): string {
  const m = modeOf(ex);
  if (m === "swap") return "pb.help.swap";
  if (m === "tag") return "pb.help.tag";
  if (m === "sort") return "pb.help.sort";
  if (m === "noteRead" || m === "noteBuild") return "pb.help.note";
  switch (ex.skillId) {
    case SKILLS.digraph: return "pb.help.digraph";
    case SKILLS.blend: return "pb.help.blend";
    case SKILLS.magicE: return "pb.help.e";
    case SKILLS.team: return "pb.help.team";
    case SKILLS.multi: return "pb.help.syllable";
    default: return m === "build" ? "pb.help.build" : "pb.help.start";
  }
}

/** First-miss line, keyed by the misconception the wrong answer shows (ENGLISH_PATH §6.6). */
export function hintFor(s: ExerciseState): string {
  const ex = s.exercise;
  const m = modeOf(ex);
  const last = s.lastAnswer;
  switch (m) {
    case "swap": return "pb.hint.swap.1";
    case "tag": return "pb.hint.tag.1";
    case "sort": return "pb.hint.sort.1";
    case "noteRead": return "pb.hint.note.1";
    case "noteBuild": return "pb.hint.sentence.1";
    case "compound": return "pb.hint.compound.1";
    case "plural": return "pb.hint.plural.1";
    case "build": {
      const w = spokenWord(ex);
      const a = ex.answer;
      if (!w || a.kind !== "sequence" || !Array.isArray(last)) return "pb.hint.build.1";
      const used = (last as readonly string[]).map((id) => a.pieces.find((p) => p.id === id)?.text ?? "");
      const split = graphemes(w).some((g) => g.length === 2 && used.some((t) => t.length === 1 && g.startsWith(t)) && !used.includes(g));
      if (split) return "pb.hint.split";
      if (word(w).magic && used.length < a.order.length) return "pb.hint.e.build";
      return "pb.hint.build.1";
    }
    default: {
      const target = sailWord(ex);
      if (!target || typeof last !== "string") return "pb.hint.read.1";
      const kind = classify(target, last);
      return ({
        "vowel-swap": "pb.hint.vowel", "final-swap": "pb.hint.final", "onset-swap": "pb.hint.first", "blend-swap": "pb.hint.first",
        "dropped-consonant": "pb.hint.dropped", "digraph-swap": "pb.hint.digraph", "short-partner": "pb.hint.e.1", "team-swap": "pb.hint.team",
        "syllable-swap": "pb.hint.syllable.1",
      } as Record<string, string>)[kind] ?? "pb.hint.read.1";
    }
  }
}

/** Spelling praise names what the child did with the word's pattern (built, not read). */
export function builtLine(w: string): string {
  const x = word(w);
  if (x.magic) return "pb.built.e";
  if (x.g.some((g) => g.length === 2)) return "pb.built.digraph";
  if (wordLevel(w) === 5) return "pb.built.blend";
  return "pb.built.cvc";
}

/** After a right answer: the word (or note) is spoken now for the first time, with process praise. */
export function praiseFor(ex: Exercise): string[] {
  const m = modeOf(ex);
  if (m === "read") return [gotLine(sailWord(ex)!)];
  if (m === "plural") return [gotLine(pluralOf(ex)!)];
  if (m === "swap") return ["pb.praise.swap"];
  if (m === "compound") return [gotLine(spokenWord(ex)!)];
  if (m === "build") return [builtLine(spokenWord(ex)!)];
  if (m === "tag") return [`pb.tag.ok.${spokenWord(ex)}`];
  if (m === "noteRead") return [sentenceLine(noteOf(ex).id)];
  if (m === "noteBuild") return ["pb.praise.6"];
  return ["pb.praise.sort"];
}
