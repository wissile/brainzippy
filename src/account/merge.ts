/**
 * Deterministic local-first merge of child progress (device ⇄ server).
 * Properties (unit-tested): commutative, associative, idempotent; never loses a level, star or sticker.
 *   per-world level = max, per-world stars = max, stickers = union, skill tallies = per-field max,
 *   roundsCompleted = max, history = union by round id, sorted by (ts, id), capped to the newest HISTORY_CAP.
 * Tallies use max (not sum) because both sides may already contain the same rounds; summing would double count.
 */
import type { GuestProgress } from "../engine/progressSchema";
import { HISTORY_CAP, type ChildProgress, type RoundRecord, type SkillTally, type WorldProgress } from "./schema";

const sortedUnion = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])].sort();

function mergeWorlds(a: Record<string, WorldProgress>, b: Record<string, WorldProgress>): Record<string, WorldProgress> {
  const out: Record<string, WorldProgress> = {};
  for (const k of sortedUnion(Object.keys(a), Object.keys(b))) {
    const x = a[k];
    const y = b[k];
    out[k] = { level: Math.max(x?.level ?? 0, y?.level ?? 0), stars: Math.max(x?.stars ?? 0, y?.stars ?? 0) };
  }
  return out;
}

function mergeSkills(a: Record<string, SkillTally>, b: Record<string, SkillTally>): Record<string, SkillTally> {
  const out: Record<string, SkillTally> = {};
  for (const k of sortedUnion(Object.keys(a), Object.keys(b))) {
    const x = a[k] ?? { attempts: 0, firstTry: 0, completed: 0 };
    const y = b[k] ?? { attempts: 0, firstTry: 0, completed: 0 };
    out[k] = { attempts: Math.max(x.attempts, y.attempts), firstTry: Math.max(x.firstTry, y.firstTry), completed: Math.max(x.completed, y.completed) };
  }
  return out;
}

const byTsThenId = (p: RoundRecord, q: RoundRecord) => p.ts - q.ts || (p.id < q.id ? -1 : p.id > q.id ? 1 : 0);

/** Union by id. If two records share an id but differ (should not happen), keep the one whose JSON sorts last, so the result is order-independent. */
export function mergeHistory(a: readonly RoundRecord[], b: readonly RoundRecord[], cap = HISTORY_CAP): RoundRecord[] {
  const byId = new Map<string, RoundRecord>();
  for (const r of [...a, ...b]) {
    const prev = byId.get(r.id);
    if (!prev || JSON.stringify(r) > JSON.stringify(prev)) byId.set(r.id, r);
  }
  const all = [...byId.values()].sort(byTsThenId);
  return all.slice(Math.max(0, all.length - cap));
}

export function mergeChildProgress(a: ChildProgress, b: ChildProgress): ChildProgress {
  return {
    v: 1,
    worlds: mergeWorlds(a.worlds, b.worlds),
    stickers: sortedUnion(a.stickers, b.stickers),
    skills: mergeSkills(a.skills, b.skills),
    roundsCompleted: Math.max(a.roundsCompleted, b.roundsCompleted),
    history: mergeHistory(a.history, b.history),
  };
}

/** Build a ChildProgress from the device's guest progress plus its local round history. */
export function guestToChildProgress(guest: GuestProgress, history: readonly RoundRecord[]): ChildProgress {
  const worlds: Record<string, WorldProgress> = {};
  for (const [id, level] of Object.entries(guest.levels ?? {})) worlds[id] = { level, stars: 0 };
  for (const r of history) {
    const w = (worlds[r.gameId] ??= { level: 0, stars: 0 });
    w.stars = Math.max(w.stars, r.stars);
  }
  const skills: Record<string, SkillTally> = {};
  for (const [k, t] of Object.entries(guest.skills)) skills[k] = { ...t };
  return { v: 1, worlds, stickers: [...new Set(guest.stickers)].sort(), skills, roundsCompleted: guest.roundsCompleted, history: mergeHistory(history, []) };
}

/** Fold merged server progress back into the device's guest progress (levels/stickers/tallies never go down). */
export function applyToGuest(guest: GuestProgress, child: ChildProgress): GuestProgress {
  const levels: Record<string, number> = { ...(guest.levels ?? {}) };
  for (const [id, w] of Object.entries(child.worlds)) levels[id] = Math.max(levels[id] ?? 0, w.level);
  const skills = mergeSkills(guest.skills, child.skills);
  const out: GuestProgress = {
    v: 1,
    stickers: sortedUnion(guest.stickers, child.stickers),
    roundsCompleted: Math.max(guest.roundsCompleted, child.roundsCompleted),
    skills,
  };
  if (Object.keys(levels).length) out.levels = levels;
  return out;
}
