import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { type Mission, type Mode, decodeMission } from "./generator";
import { LOOKALIKE } from "./island";

/**
 * Zephy's lines (docs/curriculum/geography.md §4.5–4.6): the concept at round start, and on a first miss a line
 * that answers THAT miss (east/west swap, look-alike symbol, where a continent is) without giving the answer.
 */
const EXPLAIN: Record<Mode, string> = {
  step: "pc.help.compass", route: "pc.help.compass", key: "pc.help.key", grid: "pc.help.grid", continent: "pc.help.continent",
  cards: "pc.help.continent", ocean: "pc.help.ocean", side: "pc.help.ocean", fly: "pc.help.worldcompass", trip: "pc.help.trip",
  hemi: "pc.help.equator", season: "pc.help.equator",
};
export const explainFor = (ex: Exercise) => EXPLAIN[decodeMission(ex).mode];

export function hintLineFor(m: Mission, s: Pick<ExerciseState, "lastAnswer" | "check">, diagnosis: string | null): string {
  if (m.kind === "island") {
    if (m.mode === "key") return s.lastAnswer === LOOKALIKE[m.targetFeature] ? "pc.help.lookalike" : "pc.help.key";
    if (m.mode === "grid") return "pc.help.grid";
    return diagnosis ?? "pc.help.compass";
  }
  switch (m.mode) {
    case "continent":
      return `pc.where.${m.place!.continent}`;
    case "ocean":
      return `pc.where.${m.ocean}`;
    case "fly":
      return "pc.help.worldcompass";
    case "side":
      return "pc.help.side";
    case "hemi":
      return "pc.help.above";
    case "season":
      return "pc.help.season";
    case "trip":
      return "pc.help.trip";
    case "cards": {
      const wrong = m.cardPlaces.find((p) => s.check?.parts?.[`card-${p.id}`] === false);
      return wrong ? `pc.where.${wrong.continent}` : "pc.help.continent";
    }
  }
}

export function praiseFor(ex: Exercise): string[] {
  const m = decodeMission(ex);
  if (m.kind === "island") {
    switch (m.mode) {
      case "step":
        return m.marked ? ["pc.praise.compass"] : ["pc.praise.compass", "pc.praise.listen"];
      case "route":
        return ["pc.praise.route"];
      case "key":
        return ["pc.praise.key"];
      case "grid":
        return ["pc.praise.grid"];
    }
  }
  switch (m.mode) {
    case "continent":
      return [`pc.found.${m.place!.id}`];
    case "ocean":
      return [`pc.found.${m.ocean}`];
    case "fly":
      return ["pc.praise.fly"];
    case "side":
      return [`pc.found.${m.side!.ocean}`, "pc.praise.side"];
    case "hemi":
      return ["pc.praise.equator"];
    case "season":
      return ["pc.praise.season"];
    case "trip":
      return ["pc.praise.trip"];
    case "cards":
      return ["pc.praise.cards"];
  }
}

/** Worked-example steps on the model: one footprint per move on the island; the world board shows its model at once. */
export const modelSteps = (ex: Exercise) => {
  const m = decodeMission(ex);
  return m.kind === "island" && (m.mode === "step" || m.mode === "route") ? m.moves.length : 0;
};
