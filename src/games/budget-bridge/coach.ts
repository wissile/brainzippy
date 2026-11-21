import type { Exercise } from "../../engine/types";
import { type Cell, type Diagnosis, type Puzzle, decodePuzzle, segmentsOf } from "./logic";

/**
 * What the helper (Budge) says and which praise fits (docs/curriculum/engineering.md §4.5–§4.7). Pure; unit-tested.
 * Round start: the idea the level introduces. First miss: a line chosen from the miss itself (the diagnosis).
 */
const EXPLAIN_BY_LEVEL: readonly string[] = [
  "bb.help.start", // 0: strong enough AND cheap enough
  "bb.help.material", // 1: steel is stronger but costs more
  "bb.help.support", // 2: pillars shorten spans
  "bb.help.triangle", // 3: triangles arrive
  "bb.help.budget", // 4: tight budget
  "bb.help.material", // 5: long span with no middle pillar → steel or triangles
  "bb.help.start", // 6: several designs: balance both
  "bb.help.test", // 7: improve after a test
  "bb.help.budget", // 8: tight budget, combine everything
];
export const explainFor = (ex: Exercise): string => EXPLAIN_BY_LEVEL[Math.max(0, ex.difficulty - 1)] ?? "bb.help.start";

const HINT: Record<Diagnosis, string> = {
  ground: "bb.hint.ground",
  brace: "bb.hint.brace",
  span: "bb.hint.span",
  budget: "bb.hint.budget",
  improve: "bb.hint.improve",
  ok: "bb.help.test",
};
export const hintLineFor = (d: Diagnosis | null): string => (d ? HINT[d] : "bb.help.test");

/** Praise the process the child actually used in the design that passed. */
export function praiseFor(pz: Puzzle, tested: readonly Cell[] | null): string[] {
  if (pz.mode === "improve") return ["bb.praise.3"];
  if (!tested) return ["bb.praise.2"];
  const segs = segmentsOf(pz, tested);
  if (segs.some((s) => s.braced)) return ["bb.praise.1"];
  if (tested.some((c, i) => c.pillar && pz.ground[i])) return ["bb.praise.4"];
  if (pz.pieces.includes("steel") && tested.every((c) => c.deck === "wood")) return ["bb.praise.5"];
  return ["bb.praise.2"];
}
export const praiseForExercise = (ex: Exercise, tested: readonly Cell[] | null) => praiseFor(decodePuzzle(ex), tested);
