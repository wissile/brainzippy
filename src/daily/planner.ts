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
 *  P7 fill       empty slots repeat unlocked worlds, at most MAX_PER_WORLD rounds per world (pick included) whenever
 *                enough unlocked worlds exist, adding the fewest unplayed ones needed; otherwise repeats spread evenly (D5, D7).
 *  P8 pick       the last slot (K ≥ 2) is the child's choice between two worlds (agency, D6); the first option is
 *                never the world just played, and with only one other world the previous one is the second option.
 *  P9 variety    two consecutive slots never use the same world when it can be avoided (D5).
 *  P10 ties      broken by world id, so tests are reproducible (D9).
 *  P11 libraries soft cap of LIB_CAP planned stops per library (D5, D-029): brand-new worlds come first from the
 *                libraries with the fewest queued stops (P4), and a library over the cap hands its non-review stops to
 *                unlocked worlds of libraries under the cap while any exist (familiar worlds first). The pick (P8)
 *                offers two libraries when it can. Reviews are never displaced.
 */

export type AgeRange = readonly [number, number];
export interface PlannerWorld {
  id: string;
  /** Library id (World.subject). */
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
/** P11: planned stops per library per day (soft: exceeded only when no other library has an unlocked world with room). */
export const LIB_CAP = 2;
export const newCap = (band: AgeRange): number => (band[0] >= 8 ? 2 : 1);
export const reviewSlots = (due: number, limit: number): number => (due === 0 ? 0 : Math.min(due, Math.max(1, Math.floor(0.4 * limit))));

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const mid = (r: AgeRange) => (r[0] + r[1]) / 2;

/** Seed for the n-th round (0-based) of a world on a day: new content every day, stable within it. */
export const roundSeed = (day: LocalDate, worldId: string, nth: number): number => seedForDay(day, worldId, nth);

/** A fingerprint of the registry's world ids: when it changes (new worlds shipped), today's plan is redone. */
export const registryFingerprint = (worlds: readonly { id: string }[]): number => hashSeed("worlds", ...worlds.map((w) => w.id).sort());

/** P1 + P2: the worlds a day may use. Shared by the planner and its property tests. */
function worldPools(input: PlanInput) {
  const { band, levels, log } = input;
  const all = [...input.worlds].sort(byId);
  const skillById = new Map(input.skills.map((s) => [s.id, s]));
  const mem = log.skills;
  const played = (w: PlannerWorld) => levels[w.id] !== undefined || log.seen[w.id] !== undefined;
  const assumedByAge = (skillId: string) => {
    const s = skillById.get(skillId);
    return !!s && s.ages[1] <= band[0];
  };

  // P1 eligible by age (fallback: closest worlds, so older/younger children never get an empty day)
  let eligible = all.filter((w) => w.ages[0] <= band[1] + 1 && w.ages[1] >= band[0] - 1);
  if (eligible.length === 0 && all.length) {
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
  return { all, mem, played, eligible, open, belowBand };
}

/** The unlocked worlds a day may use (`open`) and those the child already knows (`familiar`: played or below band). */
export function dayWorlds(input: PlanInput): { open: string[]; familiar: string[] } {
  const { open, played, belowBand } = worldPools(input);
  return { open: open.map((w) => w.id), familiar: open.filter((w) => played(w) || belowBand(w)).map((w) => w.id) };
}

export function planDay(input: PlanInput): PlanStop[] {
  const K = Math.max(1, Math.floor(input.limit));
  const { day, band, levels, log } = input;
  const { all, mem, played, eligible, open, belowBand } = worldPools(input);
  if (all.length === 0) return [];
  const lastSeen = (w: PlannerWorld) => log.seen[w.id] ?? "";
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
  // P11: a library's load = today's reviews + practising worlds in it; new worlds come from the least-loaded libraries first
  const libLoad = new Map<string, number>();
  for (const id of [...reviews.slice(0, R).map((r) => r.world), ...practising.map((w) => w.id)]) {
    const lib = all.find((w) => w.id === id)?.subject ?? id;
    libLoad.set(lib, (libLoad.get(lib) ?? 0) + 1);
  }
  const load = (w: PlannerWorld) => libLoad.get(w.subject) ?? 0;
  const fresh = open
    .filter((w) => !played(w) && !belowBand(w))
    .sort((a, b) => load(a) - load(b) || Math.abs(mid(a.ages) - mid(band)) - Math.abs(mid(b.ages) - mid(band)) || a.ages[0] - b.ages[0] || byId(a, b));
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
    const first = (turn === "r" && rq.length) || !lq.length ? rq : lq;
    // P9: take the queue's first stop in a different world from the last one (else the other queue's, else as is)
    const other = first === rq ? lq : rq;
    const last = core.at(-1)?.world;
    const iFirst = first.findIndex((x) => x.world !== last);
    const iOther = other.findIndex((x) => x.world !== last);
    const [q, i] = iFirst >= 0 ? [first, iFirst] : iOther >= 0 ? [other, iOther] : [first, 0];
    const s = q.splice(i, 1)[0]!;
    // a stop in the world just played is left to P7 (it is already on today's trail; the fill may repeat it later)
    if (fits(s) && s.world !== last) push(s);
    turn = turn === "r" ? "l" : "r";
  }
  // the stretch never directly follows a round in the same world (P9); another levelling world may take its place
  const stretchAt = [stretchWorld, ...practising.filter((w) => (levels[w.id] ?? 0) < w.maxLevel)].find(
    (w) => w && w.id !== core.at(-1)?.world && fits({ world: w.id, kind: "stretch" }),
  );
  if (stretchWorld && stretchAt && coreLen >= 2 && core.length < coreLen) push({ world: stretchAt.id, kind: "stretch" });

  // P7 fill: today's worlds first, then other played unlocked worlds by recency, then below-band ones. If those
  // can't fill the remaining core slots at ≤ MAX_PER_WORLD rounds each, add the fewest further unlocked worlds
  // needed (closest to the child's age first, shown as NEW) — also when the slots couldn't otherwise avoid two in a row:
  // variety (D5) beats the new-world cap (D4) only then.
  // When even every unlocked world can't fill the day, repeats are allowed and spread evenly (fewest rounds first).
  const used = [...new Set(core.map((s) => s.world))];
  const others = open.filter((w) => !used.includes(w.id) && played(w)).sort(recent).map((w) => w.id);
  const easy = open.filter((w) => !used.includes(w.id) && !others.includes(w.id) && belowBand(w)).map((w) => w.id);
  const pool = [...used, ...others, ...easy];
  const extras = fresh.map((w) => w.id).filter((id) => !pool.includes(id));
  const isExtra = new Set<string>();
  // room each world has left today, also capped so the fill can avoid two in a row (≤ ceil(n/2) per world, ≤ floor(n/2)
  // for the world just played)
  const fillN = coreLen - core.length;
  const cap = (id: string) => (id === core.at(-1)?.world ? Math.floor(fillN / 2) : Math.ceil(fillN / 2));
  const roomFor = (id: string) => Math.min(cap(id), Math.max(0, MAX_PER_WORLD - (count.get(id) ?? 0)));
  const short = () => pool.reduce((t, id) => t + roomFor(id), 0) < fillN;
  while (short() && extras.length) {
    const id = extras.shift()!;
    pool.push(id);
    isExtra.add(id);
  }
  const fillPool = pool.length ? pool : open.map((w) => w.id);
  // allocate: today's worlds first, then the rest of the pool, up to MAX_PER_WORLD each, capped so the slots can still
  // be ordered without two in a row (≤ ceil(n/2) per world, ≤ floor(n/2) for the world just played); only if that
  // can't fill the day, +1 to the world with the fewest rounds
  const alloc = new Map<string, number>();
  const total = (id: string) => (count.get(id) ?? 0) + (alloc.get(id) ?? 0);
  let left = fillN;
  for (const id of fillPool) {
    const k = Math.min(left, Math.max(0, MAX_PER_WORLD - total(id)), cap(id));
    if (k > 0) alloc.set(id, k);
    left -= Math.max(0, k);
  }
  while (left > 0) {
    const roomy = fillPool.filter((x) => (alloc.get(x) ?? 0) < cap(x));
    const from = roomy.length ? roomy : fillPool;
    const id = from.reduce((best, x) => (total(x) < total(best) ? x : best), from[0]!);
    alloc.set(id, (alloc.get(id) ?? 0) + 1);
    left--;
  }
  // arrange: the world with the most allocated slots left that isn't the one just played (pool order breaks ties)
  while (core.length < coreLen) {
    const prev = core.at(-1)?.world;
    const avail = fillPool.filter((id) => (alloc.get(id) ?? 0) > 0);
    const most = (ids: readonly string[]) => ids.reduce<string | undefined>((best, x) => (best === undefined || alloc.get(x)! > alloc.get(best)! ? x : best), undefined);
    const id = most(avail.filter((x) => x !== prev)) ?? most(avail)!;
    alloc.set(id, alloc.get(id)! - 1);
    push({ world: id, kind: isExtra.has(id) && !core.some((s) => s.world === id) ? "new" : "practice" });
  }

  // P11 libraries: hand stops from a library over LIB_CAP to unlocked worlds of libraries under it
  if (rebalanceLibraries(core, all, open, (w) => played(w) || belowBand(w), isExtra)) {
    count.clear();
    for (const s of core) count.set(s.world, (count.get(s.world) ?? 0) + 1);
  }

  // P9 variety: no two consecutive slots in the same world (slot 0 keeps its review)
  for (let i = 1; i < core.length; i++) {
    if (core[i]!.world !== core[i - 1]!.world) continue;
    const j = core.findIndex((s, k) => k > i && s.world !== core[i - 1]!.world && (k + 1 >= core.length || core[k + 1]!.world !== core[i]!.world));
    if (j > 0) [core[i], core[j]] = [core[j]!, core[i]!];
  }
  // P7 for the pick: if the only world with a round to spare is the one just played, move it earlier so the pick can offer it
  // (or, on a day with too few worlds, if it has the fewest rounds)
  const lastWorld = core.at(-1)?.world;
  const othersMin = Math.min(...[...open.map((w) => w.id), ...fillPool].filter((id) => id !== lastWorld).map((id) => count.get(id) ?? 0));
  if (pickSlot && lastWorld && othersMin >= MAX_PER_WORLD && othersMin > (count.get(lastWorld) ?? 0)) {
    const noRepeats = (arr: readonly PlanStop[]) => arr.every((x, i) => i === 0 || x.world !== arr[i - 1]!.world);
    for (let k = core.length - 2; k >= 1; k--) {
      const trial = [...core];
      [trial[k], trial[core.length - 1]] = [trial[core.length - 1]!, trial[k]!];
      if (trial.at(-1)!.world !== lastWorld && noRepeats(trial)) {
        core.splice(0, core.length, ...trial);
        break;
      }
    }
  }
  // a world added for variety is NEW at its first stop and practice after (P9 may have reordered them)
  for (const id of isExtra) {
    let first = true;
    for (const s of core) if (s.world === id) [s.kind, first] = [first ? "new" : "practice", false];
  }

  if (!pickSlot) return core;
  // P8 pick: two options the child hasn't just played; learning and review leftovers first
  const prev = core.at(-1)?.world;
  const leftovers = [...lq, ...rq, ...learning, ...reviews].map((s) => s.world);
  const options: string[] = [];
  const ranked = [...leftovers, ...fillPool, ...open.map((w) => w.id)];
  // prefer worlds the child hasn't just played; the previous world may be the second option if nothing else is open
  const fitsId = (id: string) => (count.get(id) ?? 0) < MAX_PER_WORLD;
  const fewestFirst = (ids: string[]) => [...ids].sort((a, b) => (count.get(a) ?? 0) - (count.get(b) ?? 0)); // stable
  const libOfId = (id: string) => all.find((w) => w.id === id)?.subject ?? id;
  const order = [...ranked.filter((x) => x !== prev && fitsId(x)), ...fewestFirst(ranked.filter((x) => x !== prev)), ...ranked];
  for (const id of order) {
    if (options.length === 1) {
      // P11: the second option comes from another library when one has a world with room (else as ranked)
      const other = ranked.find((x) => x !== prev && fitsId(x) && x !== options[0] && libOfId(x) !== libOfId(options[0]!));
      if (other) {
        options.push(other);
        break;
      }
    }
    if (options.length === 2) break;
    if (!options.includes(id)) options.push(id);
  }
  if (options.length === 0) return [...core, { world: fillPool.find((id) => id !== prev) ?? fillPool[0]!, kind: "practice" }];
  if (options.length === 1) return [...core, { world: options[0]!, kind: "practice" }];
  return [...core, { world: options[0]!, kind: "pick", options }];
}

/**
 * P11: while a library has more than LIB_CAP stops in `core`, move one of its non-review stops (practice first, then
 * new, then stretch; the world with most stops, latest slot first) to an unlocked world of a library under LIB_CAP
 * that still has room (< MAX_PER_WORLD rounds): least-used library first, familiar worlds before new ones, then id.
 * A replacement never sits next to the same world. Deterministic; mutates `core` and records new worlds in `isNew`.
 */
function rebalanceLibraries(core: PlanStop[], all: readonly PlannerWorld[], open: readonly PlannerWorld[], familiar: (w: PlannerWorld) => boolean, isNew: Set<string>): boolean {
  let changed = false;
  const libOf = new Map(all.map((w) => [w.id, w.subject]));
  const lib = (id: string) => libOf.get(id) ?? `?${id}`;
  const KIND_ORDER: Record<string, number> = { practice: 0, new: 1, stretch: 2 };
  for (let guard = 0; guard < core.length * 2; guard++) {
    const libCount = new Map<string, number>();
    const worldCount = new Map<string, number>();
    for (const s of core) {
      libCount.set(lib(s.world), (libCount.get(lib(s.world)) ?? 0) + 1);
      worldCount.set(s.world, (worldCount.get(s.world) ?? 0) + 1);
    }
    const over = [...libCount].filter(([, n]) => n > LIB_CAP).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([l]) => l);
    let moved = false;
    for (const l of over) {
      const cands = open
        .filter((w) => w.subject !== l && (libCount.get(w.subject) ?? 0) < LIB_CAP && (worldCount.get(w.id) ?? 0) < MAX_PER_WORLD)
        .sort((a, b) => (libCount.get(a.subject) ?? 0) - (libCount.get(b.subject) ?? 0) || Number(familiar(b)) - Number(familiar(a)) || byId(a, b));
      const slots = core
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => lib(s.world) === l && s.kind in KIND_ORDER)
        .sort((a, b) => KIND_ORDER[a.s.kind]! - KIND_ORDER[b.s.kind]! || worldCount.get(b.s.world)! - worldCount.get(a.s.world)! || b.i - a.i);
      for (const { i } of slots) {
        for (const w of cands) {
          const fam = familiar(w) || (worldCount.get(w.id) ?? 0) > 0;
          const trial = [...core];
          trial[i] = { world: w.id, kind: fam ? "practice" : "new" };
          const fixed = arrangeNoRepeats(trial, adjacent(core));
          if (!fixed) continue;
          core.splice(0, core.length, ...fixed);
          if (!familiar(w)) isNew.add(w.id);
          moved = changed = true;
          break;
        }
        if (moved) break;
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  return changed;
}

/** Number of neighbouring stops in the same world. */
const adjacent = (arr: readonly PlanStop[]): number => arr.reduce((n, s, i) => n + (i > 0 && s.world === arr[i - 1]!.world ? 1 : 0), 0);

/**
 * `arr` as is if it has at most `limit` same-world neighbours, else the first single swap (slot 0 stays put) that
 * gets there; null if none does. Deterministic.
 */
function arrangeNoRepeats(arr: PlanStop[], limit: number): PlanStop[] | null {
  if (adjacent(arr) === 0) return arr;
  for (let a = 1; a < arr.length; a++)
    for (let b = a + 1; b < arr.length; b++) {
      const t = [...arr];
      [t[a], t[b]] = [t[b]!, t[a]!];
      if (adjacent(t) === 0) return t;
    }
  return adjacent(arr) <= limit ? arr : null;
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
