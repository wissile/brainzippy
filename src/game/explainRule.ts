import type { Exercise } from "../engine/types";

/**
 * When the round-start helper explains (GameRunner): always on the round's first exercise; and, when the skin gives
 * an `explainKey` (e.g. which inner game an exercise belongs to), also the first time an exercise of a new key
 * appears in the round, so a game that unlocks mid-round never arrives unexplained. Pure.
 */
export function shouldExplain(ex: Exercise, playedIds: readonly string[], pool: readonly Exercise[], resultsSoFar: number, key?: (e: Exercise) => string): boolean {
  if (resultsSoFar === 0) return true;
  if (!key) return false;
  const mine = key(ex);
  return !playedIds.some((id) => {
    if (id === ex.id) return false;
    const e = pool.find((x) => x.id === id);
    return !!e && key(e) === mine;
  });
}
