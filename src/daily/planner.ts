import type { DailyLog, DailyPlanStop, DailyRound, DailyStopKind } from "../engine/progressSchema";
import { hashSeed, seedForDay } from "../engine/rng";
import { type LocalDate, daysBetween } from "./date";
import { UNLOCK_COUNT, isDue, isMastered, masteryLevel } from "./memory";

/**
 * Deterministic daily planner (docs/DAILY_LEARNING.md; rules D1–D9 in docs/curriculum/README.md §3.5).
 * Pure: the same input always gives the same plan. Works with any number of worlds (including none).
 *
 *  P1 eligible   worlds whose ages overlap the child's band ±1 year (U2); if none, the closest worlds by age.
 *  P2 unlocked   every prerequisite of a world's skills (outside the world itself) is met: mastered, or
 *                UNLOCK_COUNT qualifying successes, or a world teaching it is at/above its mastery level, or the
 *                skill is assumed by age (its age range ends at or before the band starts) (U1).
 *  P3 reviews    due skills sorted by days overdue (desc), box (asc), id; one played world per skill, preferring a
 *                different world from last time. Slots = min(|due worlds|, max(1, floor(0.4 K))) (D3).
 *  P4 learning   practising worlds (most recently played first), with up to NEW_CAP brand-new worlds
 *                (prerequisites met, closest to the child's age first) placed right after the first one (D4).
 *  P5 stretch    the most recently played world that can still level up, played one difficulty step higher
 *                (the round steps back down automatically if it's too much). K ≥ 3 only.
 *  P6 order      review first if any, then alternate learning / review, stretch last before the pick (D6).
 *  P7 fill       empty slots repeat unlocked worlds, at most MAX_PER_WORLD rounds each while alternatives exist (D7).
 *  P8 pick       the last slot (K ≥ 2) is the child's choice between two worlds (agency, D6); the first option is
 *                never the world just played, and with only one other world the previous one is the second option.
 *  P9 variety    two consecutive slots never use the same world when it can be avoided (D5).
 *  P10 ties      broken by world id, so tests are reproducible (D9).
 */

export type AgeRange = readonly [number, number];
export interface PlannerWorld {
  id: string;
  subject: string;
  skills: readonly string[];
  ages: AgeRange;
  maxLevel: number;
}
export interface PlannerSkill {
  id: string;
  ages: AgeRange;
  prerequisites: readonly string[];
}
export interface PlanInput {
  day: LocalDate;
  /** K: rounds today (daily limit). */
  limit: number;
  /** The child's age band, e.g. [3, 5]. */
  band: AgeRange;
  worlds: readonly PlannerWorld[];
  skills: readonly PlannerSkill[];
  /** Stored world levels (a key means the world has been completed at least once). */
  levels: Readonly<Record<string, number>>;
  log: Pick<DailyLog, "skills" | "seen">;
}
export interface PlanStop {
  world: string;
  kind: DailyStopKind;
  /** "pick" stops: the worlds to choose between (world = options[0]). */
  options?: string[];
  /** "review" stops: the due skill being reviewed. */
  skill?: string;
}

export const MAX_PER_WORLD = 2;
export const newCap = (band: AgeRange): number => (band[0] >= 8 ? 2 : 1);
export const reviewSlots = (due: number, limit: number): number => (due === 0 ? 0 : Math.min(due, Math.max(1, Math.floor(0.4 * limit))));

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const mid = (r: AgeRange) => (r[0] + r[1]) / 2;

/** Seed for the n-th round (0-based) of a world on a day: new content every day, stable within it. */
export const roundSeed = (day: LocalDate, worldId: string, nth: number): number => seedForDay(day, worldId, nth);

/** A fingerprint of the registry's world ids: when it changes (new worlds shipped), today's plan is redone. */
export const registryFingerprint = (worlds: readonly { id: string }[]): number => hashSeed("worlds", ...worlds.map((w) => w.id).sort());

export function planDay(input: PlanInput): PlanStop[] {
  const K = Math.max(1, Math.floor(input.limit));
  const { day, band, levels, log } = input;
  const all = [...input.worlds].sort(byId);
  if (all.length === 0) return [];
  const skillById = new Map(input.skills.map((s) => [s.id, s]));
  const mem = log.skills;
  const played = (w: PlannerWorld) => levels[w.id] !== undefined || log.seen[w.id] !== undefined;
  const lastSeen = (w: PlannerWorld) => log.seen[w.id] ?? "";
  const assumedByAge = (skillId: string) => {
    const s = skillById.get(skillId);
    return !!s && s.ages[1] <= band[0];
  };

  // P1 eligible by age (fallback: closest worlds, so older/younger children never get an empty day)
  let eligible = all.filter((w) => w.ages[0] <= band[1] + 1 && w.ages[1] >= band[0] - 1);
  if (eligible.length === 0) {
    const dist = (w: PlannerWorld) => Math.abs(mid(w.ages) - mid(band));
    const best = Math.min(...all.map(dist));
    eligible = all.filter((w) => dist(w) === best);
  }

  // P2 unlocked
  const met = (skillId: string): boolean =>
    isMastered(mem[skillId]) ||
    (mem[skillId]?.q ?? 0) >= UNLOCK_COUNT ||
    assumedByAge(skillId) ||
    all.some((w) => w.skills.includes(skillId) && (levels[w.id] ?? -1) >= masteryLevel(w.maxLevel));
  const unlocked = (w: PlannerWorld) => w.skills.every((s) => (skillById.get(s)?.prerequisites ?? []).every((p) => w.skills.includes(p) || met(p)));
  let open = eligible.filter(unlocked);
  if (open.length === 0) {
    // nothing unlocked in the age window (e.g. a library whose entry world is for older children): start at the roots
    const roots = eligible.filter((w) => w.skills.every((s) => (skillById.get(s)?.prerequisites ?? []).every((p) => w.skills.includes(p))));
    open = roots.length ? roots : eligible;
  }
  const belowBand = (w: PlannerWorld) => w.skills.every(assumedByAge);
  const complete = (w: PlannerWorld) => (levels[w.id] ?? 0) >= w.maxLevel && w.skills.every((s) => isMastered(mem[s]));
  const recent = (a: PlannerWorld, b: PlannerWorld) => (lastSeen(a) > lastSeen(b) ? -1 : lastSeen(a) < lastSeen(b) ? 1 : byId(a, b));

  // P3 reviews
  const due = Object.keys(mem)
    .filter((id) => isDue(mem[id], day))
    .sort((a, b) => daysBetween(mem[b]!.due!, day) - daysBetween(mem[a]!.due!, day) || mem[a]!.b - mem[b]!.b || (a < b ? -1 : a > b ? 1 : 0));
  const reviews: PlanStop[] = [];
  for (const s of due) {
    const cands = eligible.filter((w) => w.skills.includes(s) && played(w)).sort((a, b) => Number(a.id === mem[s]!.lw) - Number(b.id === mem[s]!.lw) || byId(a, b));
    const w = cands.find((c) => !reviews.some((r) => r.world === c.id));
    if (w) reviews.push({ world: w.id, kind: "review", skill: s });
  }
  const R = reviewSlots(reviews.length, K);

  // P4 learning
  const practising = open.filter((w) => played(w) && !complete(w)).sort(recent);
  const fresh = open
    .filter((w) => !played(w) && !belowBand(w))
    .sort((a, b) => Math.abs(mid(a.ages) - mid(band)) - Math.abs(mid(b.ages) - mid(band)) || a.ages[0] - b.ages[0] || byId(a, b));
  const news = fresh.slice(0, newCap(band));
  // P5 stretch
  const stretchWorld = K >= 3 ? practising.find((w) => (levels[w.id] ?? 0) < w.maxLevel) : undefined;

  const learning: PlanStop[] = [
    ...practising.slice(0, 1).map((w) => ({ world: w.id, kind: "practice" as const })),
    ...news.map((w) => ({ world: w.id, kind: "new" as const })),
    ...practising.slice(1).map((w) => ({ world: w.id, kind: "practice" as const })),
  ];

  const pickSlot = K >= 2;
  const coreLen = pickSlot ? K - 1 : K;
  const count = new Map<string, number>();
  const core: PlanStop[] = [];
  const push = (s: PlanStop) => {
    core.push(s);
    count.set(s.world, (count.get(s.world) ?? 0) + 1);
  };
  const fits = (s: PlanStop) => (count.get(s.world) ?? 0) < MAX_PER_WORLD;

  // P6 order: review first, then alternate learning / review; the stretch closes the core
  const room = coreLen - (stretchWorld && coreLen >= 2 ? 1 : 0);
  const rq = reviews.slice(0, R);
  const lq = learning.filter((s) => s.world !== stretchWorld?.id || practising.length === 1);
  let turn: "r" | "l" = rq.length ? "r" : "l";
  while (core.length < room && (rq.length || lq.length)) {
    const q = (turn === "r" && rq.length) || !lq.length ? rq : lq;
    const s = q.shift()!;
    if (fits(s)) push(s);
    turn = turn === "r" ? "l" : "r";
  }
  if (stretchWorld && coreLen >= 2 && core.length < coreLen) push({ world: stretchWorld.id, kind: "stretch" });

  // P7 fill: today's worlds first, then other unlocked worlds by recency, then below-band ones
  const used = [...new Set(core.map((s) => s.world))];
  const others = open.filter((w) => !used.includes(w.id) && played(w)).sort(recent).map((w) => w.id);
  const easy = open.filter((w) => !used.includes(w.id) && !others.includes(w.id) && belowBand(w)).map((w) => w.id);
  const pool = [...used, ...others, ...easy];
  const fillPool = pool.length ? pool : open.map((w) => w.id);
  const choose = (prev: string | undefined, avoid: readonly string[] = []) =>
    fillPool.find((id) => id !== prev && !avoid.includes(id) && (count.get(id) ?? 0) < MAX_PER_WORLD) ??
    fillPool.find((id) => id !== prev && !avoid.includes(id)) ??
    fillPool.find((id) => id !== prev) ??
    fillPool[0]!;
  while (core.length < coreLen) push({ world: choose(core.at(-1)?.world), kind: "practice" });

  // P9 variety: no two consecutive slots in the same world (slot 0 keeps its review)
  for (let i = 1; i < core.length; i++) {
    if (core[i]!.world !== core[i - 1]!.world) continue;
    const j = core.findIndex((s, k) => k > i && s.world !== core[i - 1]!.world && (k + 1 >= core.length || core[k + 1]!.world !== core[i]!.world));
    if (j > 0) [core[i], core[j]] = [core[j]!, core[i]!];
  }

  if (!pickSlot) return core;
  // P8 pick: two options the child hasn't just played; learning and review leftovers first
  const prev = core.at(-1)?.world;
  const leftovers = [...lq, ...rq, ...learning, ...reviews].map((s) => s.world);
  const options: string[] = [];
  const ranked = [...leftovers, ...fillPool, ...open.map((w) => w.id)];
  // prefer worlds the child hasn't just played; the previous world may be the second option if nothing else is open
  for (const id of [...ranked.filter((x) => x !== prev), ...ranked]) {
    if (options.length === 2) break;
    if (!options.includes(id)) options.push(id);
  }
  if (options.length === 0) return [...core, { world: choose(prev), kind: "practice" }];
  if (options.length === 1) return [...core, { world: options[0]!, kind: "practice" }];
  return [...core, { world: options[0]!, kind: "pick", options }];
}

/** Compact stored form of a plan stop. */
export const toStored = (s: PlanStop): DailyPlanStop => (s.options ? { w: s.world, k: s.kind, o: [...s.options] } : { w: s.world, k: s.kind });

/** Worlds a stored stop can be completed by (the pick stop accepts either option). */
export const stopWorlds = (s: DailyPlanStop): readonly string[] => s.o ?? [s.w];

/**
 * Which trail stops are lit by today's rounds. A round started from a stop lights that stop; other rounds
 * (Explore, Again) light the first unlit stop of the same world; any remaining rounds light the earliest
 * unlit stops, so the trail always shows "n of K" for n rounds played.
 */
export function litStops(stops: readonly DailyPlanStop[], rounds: readonly DailyRound[]): boolean[] {
  const lit = stops.map(() => false);
  const rest: DailyRound[] = [];
  for (const r of rounds) {
    if (r.s !== undefined && r.s < stops.length && !lit[r.s] && stopWorlds(stops[r.s]!).includes(r.w)) lit[r.s] = true;
    else rest.push(r);
  }
  const rest2: DailyRound[] = [];
  for (const r of rest) {
    const i = stops.findIndex((s, k) => !lit[k] && stopWorlds(s).includes(r.w));
    if (i >= 0) lit[i] = true;
    else rest2.push(r);
  }
  for (let n = 0; n < rest2.length; n++) {
    const i = lit.indexOf(false);
    if (i < 0) break;
    lit[i] = true;
  }
  return lit;
}
