import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { type Mode, decode, hintClue } from "./generator";
import { type ClueId, type Msg, partsOf } from "./messages";

/**
 * Helper (Hoot) and praise lines for Fenn's Message Mystery — pure, unit-tested (docs/curriculum/cyber.md §4.5–4.7).
 * First-miss lines name the CONCEPT behind the clue (or the misconception the miss shows), never the answer.
 */
export const HELP_FOR_CLUE: Record<ClueId, string> = {
  secret: "mm.help.start",
  prize: "mm.help.prize",
  urgent: "mm.help.rush",
  keepSecret: "mm.help.secret",
  giftCard: "mm.help.gift",
  sender: "mm.help.sender",
  lookAlike: "mm.help.sender",
  link: "mm.help.link",
  file: "mm.help.file",
};

/** Round-start explanation by level (0-based). */
export const EXPLAIN_BY_LEVEL = [
  "mm.help.start", "mm.help.prize", "mm.help.rush", "mm.help.secret", "mm.help.sender",
  "mm.help.link", "mm.help.clues", "mm.help.action", "mm.help.verify", "mm.help.inbox",
] as const;
export const explainFor = (ex: Pick<Exercise, "params">) => EXPLAIN_BY_LEVEL[decode(ex).level] ?? "mm.help.start";

/** First-miss line, diagnosed from what the child did. */
export function hintFor(s: Pick<ExerciseState, "exercise" | "lastAnswer" | "check">): string {
  const ex = s.exercise;
  const d = decode(ex);
  if (d.mode === "inbox") return "mm.help.inbox";
  const m = d.msgs[0]!;
  const ans = s.lastAnswer;
  if (d.mode === "clues") {
    if (m.safe) return "mm.hint.expected";
    const picked = Array.isArray(ans) ? (ans as string[]) : [];
    const missed = partsOf(m).find((p) => p.clue && !picked.includes(p.id));
    return missed ? HELP_FOR_CLUE[missed.clue!] : "mm.hint.missed";
  }
  if (m.safe) return d.mode === "verify" ? "mm.hint.expected" : "mm.hint.askOk";
  if (d.mode === "action" && ans === "stop") return "mm.hint.reply";
  if (d.mode === "verify") return "mm.hint.friend";
  if (d.fold) return "mm.hint.polish";
  const c = hintClue(ex, m);
  return c ? HELP_FOR_CLUE[c] : "mm.help.start";
}

const PRAISE: Record<Mode, { trick: string[]; safe: string[] }> = {
  sort: { trick: ["mm.praise.tell", "mm.praise.asks", "mm.praise.slow"], safe: ["mm.praise.expected", "mm.praise.asks"] },
  clues: { trick: ["mm.praise.clues", "mm.praise.parts"], safe: ["mm.praise.parts", "mm.praise.expected"] },
  action: { trick: ["mm.praise.tell", "mm.praise.slow"], safe: ["mm.praise.expected"] },
  verify: { trick: ["mm.praise.verify", "mm.praise.slow"], safe: ["mm.praise.expected"] },
  inbox: { trick: ["mm.praise.sorted"], safe: ["mm.praise.sorted"] },
};
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const d = decode(ex);
  const m: Msg = d.msgs[0]!;
  if (d.mode === "sort" && d.fold && !m.safe) return ["mm.praise.address", "mm.praise.tell"];
  return PRAISE[d.mode][m.safe ? "safe" : "trick"];
}
