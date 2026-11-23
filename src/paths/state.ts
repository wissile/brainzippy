import { localDate } from "../daily/date";
import { type OfferReason, type PathNote, type PathsState, choosePath, placementAge, recordPathRound } from "../engine/pathProgress";
import type { ExerciseResult } from "../engine/types";
import { loadState, saveState } from "../services/storage";
import { visiblePaths } from "./flags";
import { type LearningPath, pathOfWorld, toPathDef } from "./registry";

/**
 * Glue between the pure path rules (src/engine/pathProgress.ts) and the app: registry, local storage, the clock.
 * Synchronous and local; if storage is unavailable everything still works in memory. Never blocks play.
 * (Deliberately does not import src/daily/store, which imports this module for the daily-plan preference.)
 */

/** "ages-6-8" → 7 (A1); unknown → 4 (the youngest band, like the daily planner). */
export function childAge(ageBand: string | null = loadState().ageBand): number {
  const m = ageBand?.match(/^ages-(\d+)-(\d+)$/);
  return placementAge(m ? [Number(m[1]), Number(m[2])] : [3, 5]);
}

export const getPaths = (): PathsState => loadState().paths;

/** The child's chosen path, if it is visible (live, or the dev override). */
export function currentPath(paths: readonly LearningPath[] = visiblePaths()): LearningPath | null {
  const cur = getPaths().cur;
  return paths.find((p) => p.id === cur) ?? null;
}

/** The world the child's path is at (re-placed if the stored stop left the path). */
export function currentStop(path: LearningPath): { world: LearningPath["worlds"][number]; index: number; level: number } {
  const st = loadState();
  const w = st.paths.by[path.id]?.w;
  let index = path.worlds.findIndex((x) => x.id === w);
  if (index < 0) index = 0;
  const world = path.worlds[index]!;
  return { world, index, level: st.progress.levels?.[world.id] ?? 0 };
}

/** Choose a path (or come back to one). Keeps every other path's progress; seeds the start world's level if new. */
export function pickPath(path: LearningPath): void {
  const st = loadState();
  const levels = st.progress.levels ?? {};
  const r = choosePath(st.paths, toPathDef(path), childAge(st.ageBand), levels);
  const patch: Parameters<typeof saveState>[0] = { paths: r.state };
  if (r.setLevel) patch.progress = { ...st.progress, levels: { ...levels, [r.setLevel.world]: r.setLevel.level } };
  saveState(patch);
}

/** Make sure the path's current world has a level before playing it (a path picked before a world was added). */
export function preparePlay(path: LearningPath): string {
  if (getPaths().by[path.id]?.w !== currentStop(path).world.id) pickPath(path);
  const { world } = currentStop(path);
  return world.id;
}

export interface PathRoundResult {
  path: LearningPath;
  note: PathNote | null;
  offer: OfferReason | null;
}

/**
 * Record a completed round (called after the game saved its own progress and level). Updates the path state and,
 * when a rule fires, the stored world levels. Returns null for worlds outside every visible path.
 */
export function recordRound(round: { gameId: string; level: number; results: readonly ExerciseResult[] }, now: Date = new Date(), paths: readonly LearningPath[] = visiblePaths()): PathRoundResult | null {
  const path = pathOfWorld(round.gameId, paths);
  if (!path) return null;
  const st = loadState();
  const levels = st.progress.levels ?? {};
  const out = recordPathRound(st.paths, { path: toPathDef(path), day: localDate(now), age: childAge(st.ageBand), round: { world: round.gameId, level: round.level, results: round.results }, levels });
  const patch: Parameters<typeof saveState>[0] = { paths: out.state };
  if (Object.keys(out.levels).length) patch.progress = { ...st.progress, levels: { ...levels, ...out.levels } };
  saveState(patch);
  return { path, note: out.note, offer: out.offer };
}

/** For the daily planner: the chosen visible path and its current world (null = plan exactly as without paths). */
export function pathFocus(): { path: string; world: string } | null {
  const p = currentPath();
  return p ? { path: p.id, world: currentStop(p).world.id } : null;
}

// ---------------------------------------------------------------- "this round was started from the path view"

const PLAY_KEY = "bz.path.play";
let playing: string | null = null;
/** Remember that the next round of `worldId` was started from the path view (so "Games" returns there). */
export function setPathPlay(worldId: string | null): void {
  playing = worldId;
  try {
    if (worldId) sessionStorage.setItem(PLAY_KEY, worldId);
    else sessionStorage.removeItem(PLAY_KEY);
  } catch {
    /* in-memory only */
  }
}
export function isPathPlay(worldId: string): boolean {
  if (playing === null) {
    try {
      playing = sessionStorage.getItem(PLAY_KEY);
    } catch {
      /* ignore */
    }
  }
  return playing === worldId;
}
