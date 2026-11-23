import { getWorld, playableWorlds, registry } from "../content/registry";
import type { World } from "../content/types";
import type { DailyLog, DailyPlan, DailyPlanStop } from "../engine/progressSchema";
import { emptyDailyLog } from "../engine/progressSchema";
import type { RoundHooks } from "../game/roundHooks";
import { loadState, saveState } from "../services/storage";
import { type LocalDate, addDays, localDate } from "./date";
import { recordRound, roundsOn } from "./memory";
import { type AgeRange, type PlanInput, litStops, planDay, registryFingerprint, roundSeed, stopWorlds, toStored } from "./planner";
import { getDailySettings } from "./settings";
import { hashSeed } from "../engine/rng";
import { pathFocus } from "../paths/state";
import { preferPathWorld } from "../paths/plan";

/**
 * Glue between the pure daily rules (planner, memory) and the app: registry, local storage, the clock.
 * Everything here is synchronous and local; nothing blocks play if storage is unavailable.
 */

/** The device's current local date. A function so tests (and page.clock in e2e) control it. */
export const today = (): LocalDate => localDate(new Date());

/** "ages-6-8" → [6, 8]; unknown → the youngest band. */
export function bandOf(ageBand: string | null | undefined): AgeRange {
  const m = ageBand?.match(/^ages-(\d+)-(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : [3, 5];
}

export const getLog = (): DailyLog => loadState().progress.daily ?? emptyDailyLog();
function saveLog(daily: DailyLog) {
  const st = loadState();
  saveState({ progress: { ...st.progress, daily } });
}

function plannerInput(day: LocalDate, log: DailyLog, limit: number): PlanInput {
  const st = loadState();
  return {
    day,
    limit,
    band: bandOf(st.ageBand),
    worlds: playableWorlds(),
    skills: registry.skills,
    levels: st.progress.levels ?? {},
    log,
  };
}

/**
 * D1: today's plan, made once at the first visit of the day and saved. Re-planned only when the daily limit
 * or the registry's worlds change; stops already completed today stay on the trail.
 */
export function ensurePlan(day: LocalDate = today()): DailyPlan {
  const log = getLog();
  const limit = getDailySettings().limit;
  // D-034 PP1: a visible chosen path puts its current world first; choosing another path re-plans (kept stops stay)
  const focus = pathFocus();
  const reg = focus ? hashSeed(registryFingerprint(playableWorlds()), "path", focus.path) : registryFingerprint(playableWorlds());
  const old = log.plan;
  if (old && old.day === day && old.k === limit && old.reg === reg) return old;
  const input = plannerInput(day, log, limit);
  const planned = planDay(input).map(toStored);
  const fresh = focus ? preferPathWorld(planned, focus.world, input.levels[focus.world] === undefined && log.seen[focus.world] === undefined) : planned;
  let stops: DailyPlanStop[] = fresh;
  if (old && old.day === day) {
    const lit = litStops(old.stops, roundsOn(log, day));
    const kept = old.stops.filter((_, i) => lit[i]);
    stops = [...kept, ...fresh].slice(0, Math.max(limit, kept.length));
  }
  const plan: DailyPlan = { day, k: limit, reg, stops };
  saveLog({ ...log, plan });
  return plan;
}

export interface DailyStatus {
  day: LocalDate;
  limit: number;
  /** Completed rounds today (Explore and Again count too). */
  done: number;
  locked: boolean;
  plan: DailyPlan;
  lit: boolean[];
  /** Index of the next unlit stop (−1 when the trail is done). */
  next: number;
  /** Total distinct days with a completed round. */
  learned: number;
}

export function dailyStatus(day: LocalDate = today()): DailyStatus {
  const plan = ensurePlan(day);
  const log = getLog();
  const rounds = roundsOn(log, day);
  const limit = getDailySettings().limit;
  const lit = litStops(plan.stops, rounds);
  return { day, limit, done: rounds.length, locked: rounds.length >= limit, plan, lit, next: lit.indexOf(false), learned: log.learned };
}

/** Is a saved, unfinished round waiting for this world? (A round in progress always finishes.) */
export const hasRoundInProgress = (worldId: string): boolean => loadState().round?.gameId === worldId;

// ---------------------------------------------------------------- active stop (which trail stop started this round)

const ACTIVE_KEY = "bz.daily.active";
interface Active {
  day: LocalDate;
  stop: number;
  world: string;
}
let active: Active | null = null;
export function setActiveStop(stop: number | null, world?: string): void {
  active = stop === null || !world ? null : { day: today(), stop, world };
  try {
    if (active) sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* in-memory only */
  }
}
function activeFor(worldId: string, day: LocalDate): number | undefined {
  if (!active) {
    try {
      const raw = sessionStorage.getItem(ACTIVE_KEY);
      const o = raw ? (JSON.parse(raw) as Active) : null;
      if (o && typeof o.stop === "number" && typeof o.world === "string" && typeof o.day === "string") active = o;
    } catch {
      /* ignore */
    }
  }
  return active && active.world === worldId && active.day === day ? active.stop : undefined;
}

// ---------------------------------------------------------------- GameRunner hooks

/** Record a completed round in today's log (called by GameRunner through RoundHooks). */
export function recordCompleted(round: { gameId: string; level: number; maxLevel: number; results: readonly { skillId: string; difficulty: number; firstTry: boolean }[] }, day: LocalDate = today()): void {
  ensurePlan(day); // D1: the plan is made from the start-of-day state, before the first round is logged
  const stop = activeFor(round.gameId, day);
  const plan = getLog().plan;
  const validStop = stop !== undefined && plan?.day === day && plan.stops[stop] && stopWorlds(plan.stops[stop]!).includes(round.gameId) ? stop : undefined;
  saveLog(recordRound(getLog(), { day, world: round.gameId, level: round.level, maxLevel: round.maxLevel, results: round.results, stop: validStop }));
  setActiveStop(null);
}

export const dailyHooks: RoundHooks = {
  seed: (gameId) => {
    const day = today();
    return roundSeed(day, gameId, roundsOn(getLog(), day).filter((r) => r.w === gameId).length);
  },
  stretch: (gameId) => {
    const st = dailyStatus();
    const i = activeFor(gameId, st.day);
    return i !== undefined && !st.lit[i] && st.plan.stops[i]?.k === "stretch";
  },
  onRoundComplete: (r) => recordCompleted(r),
  canPlayAgain: () => !dailyStatus().locked,
};

// ---------------------------------------------------------------- recap + teaser

/** Distinct worlds played on `day`, in the order first played. */
export function worldsPlayed(day: LocalDate = today()): World[] {
  const ids = [...new Set(roundsOn(getLog(), day).map((r) => r.w))];
  return ids.flatMap((id) => getWorld(id) ?? []);
}

/** A peek at tomorrow's plan (deterministic: tomorrow's real plan starts from the same state). */
export function tomorrowPreview(day: LocalDate = today()): { world: World; isNew: boolean } | null {
  const log = getLog();
  const stops = planDay(plannerInput(addDays(day, 1), log, getDailySettings().limit));
  const pick = stops.find((s) => s.kind === "new") ?? stops[0];
  const world = pick ? getWorld(pick.world) : undefined;
  return world ? { world, isNew: pick!.kind === "new" } : null;
}
