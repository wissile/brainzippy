/**
 * Pure aggregation for the owner's /insights dashboard (D-033): turns the rows of GET /api/insights into the tables
 * the dashboard shows. No React, no fetch — unit-tested in tests/unit/analytics.test.ts.
 */
import { ONB_STEPS } from "./schema";

/** [event, game, k1, k2, count, total] summed over the chosen days. */
export type InsightRow = [string, string, string, string, number, number];
/** [day, event, count] */
export type DayRow = [string, string, number];

export interface InsightsData {
  from: string;
  days: number;
  rows: InsightRow[];
  perDay: DayRow[];
  truncated: boolean;
}

const sum = (rows: InsightRow[]) => rows.reduce((a, r) => a + r[4], 0);
const sumTotal = (rows: InsightRow[]) => rows.reduce((a, r) => a + r[5], 0);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const byEvent = (rows: InsightRow[], event: string) => rows.filter((r) => r[0] === event);

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}

export interface Summary {
  sessions: number;
  roundsStarted: number;
  roundsDone: number;
  roundsQuit: number;
  finishRate: number;
  avgRoundMin: number;
  exercisesSolved: number;
  firstTryRate: number;
}

export function summary(rows: InsightRow[]): Summary {
  const done = byEvent(rows, "round_done");
  const ex = byEvent(rows, "ex_done");
  const roundsStarted = sum(byEvent(rows, "round_start"));
  const roundsDone = sum(done);
  return {
    sessions: sum(byEvent(rows, "session")),
    roundsStarted,
    roundsDone,
    roundsQuit: sum(byEvent(rows, "round_quit")),
    finishRate: pct(roundsDone, roundsStarted),
    avgRoundMin: roundsDone > 0 ? Math.round((sumTotal(done) / roundsDone / 60) * 10) / 10 : 0,
    exercisesSolved: sum(ex),
    firstTryRate: pct(sum(ex.filter((r) => r[3] === "first-try")), sum(ex)),
  };
}

/** Onboarding funnel: children reaching each step, and % of those who started. */
export function funnel(rows: InsightRow[]): { step: string; count: number; pct: number; skipped: number }[] {
  const steps = byEvent(rows, "onb_step");
  const reached = (s: string) => sum(steps.filter((r) => r[2] === s && r[3] === ""));
  const first = reached("intro");
  return ONB_STEPS.filter((s) => s !== "grownup" || steps.some((r) => r[2] === "grownup")).map((step) => ({
    step,
    count: reached(step),
    pct: pct(reached(step), first),
    skipped: sum(steps.filter((r) => r[2] === step && r[3] === "skip")),
  }));
}

export interface GameStats {
  game: string;
  started: number;
  done: number;
  quit: number;
  finishRate: number;
  avgMin: number;
  solved: number;
  firstTryRate: number;
  afterModelRate: number;
  levelUps: number;
  /** Quits split by how many exercises had been solved: "0", "1-2", "3-5", "6+". */
  quitAfter: Record<string, number>;
}

export function perGame(rows: InsightRow[]): GameStats[] {
  const games = new Set(rows.filter((r) => r[1] && ["round_start", "round_done", "ex_done"].includes(r[0])).map((r) => r[1]));
  return [...games]
    .map((game) => {
      const g = rows.filter((r) => r[1] === game);
      const done = byEvent(g, "round_done");
      const ex = byEvent(g, "ex_done");
      const quits = byEvent(g, "round_quit");
      const started = sum(byEvent(g, "round_start"));
      const quitAfter: Record<string, number> = {};
      for (const q of quits) quitAfter[q[3]] = (quitAfter[q[3]] ?? 0) + q[4];
      return {
        game,
        started,
        done: sum(done),
        quit: sum(quits),
        finishRate: pct(sum(done), started),
        avgMin: sum(done) > 0 ? Math.round((sumTotal(done) / sum(done) / 60) * 10) / 10 : 0,
        solved: sum(ex),
        firstTryRate: pct(sum(ex.filter((r) => r[3] === "first-try")), sum(ex)),
        afterModelRate: pct(sum(ex.filter((r) => r[3] === "after-model")), sum(ex)),
        levelUps: sum(byEvent(g, "level_up")),
        quitAfter,
      };
    })
    .sort((a, b) => b.started - a.started);
}

export interface ExerciseStats {
  game: string;
  id: string;
  solved: number;
  firstTryRate: number;
  afterModelRate: number;
  avgSec: number;
  /** Most common wrong answers, most frequent first. */
  wrong: { answer: string; count: number }[];
  hints: number;
}

/** Exercises with at least `minSolves` solves, hardest (lowest first-try rate) first. */
export function hardestExercises(rows: InsightRow[], minSolves = 10, limit = 40): ExerciseStats[] {
  const exGroups = groupBy(byEvent(rows, "ex_done"), (r) => `${r[1]}\u0000${r[2]}`);
  const wrongGroups = groupBy(byEvent(rows, "wrong"), (r) => `${r[1]}\u0000${r[2]}`);
  const hintGroups = groupBy(byEvent(rows, "hint"), (r) => `${r[1]}\u0000${r[2]}`);
  const out: ExerciseStats[] = [];
  for (const [key, ex] of exGroups) {
    const solved = sum(ex);
    if (solved < minSolves) continue;
    const [game, id] = key.split("\u0000") as [string, string];
    out.push({
      game,
      id,
      solved,
      firstTryRate: pct(sum(ex.filter((r) => r[3] === "first-try")), solved),
      afterModelRate: pct(sum(ex.filter((r) => r[3] === "after-model")), solved),
      avgSec: Math.round(sumTotal(ex) / solved),
      wrong: (wrongGroups.get(key) ?? []).map((r) => ({ answer: r[3], count: r[4] })).sort((a, b) => b.count - a.count).slice(0, 3),
      hints: sum(hintGroups.get(key) ?? []),
    });
  }
  return out.sort((a, b) => a.firstTryRate - b.firstTryRate || b.solved - a.solved).slice(0, limit);
}

/** First-try rate by skill and difficulty ("skill@d3"), so a difficulty step that is too steep stands out. */
export function skillLadder(rows: InsightRow[], minSolves = 10): { game: string; skill: string; difficulty: number; solved: number; firstTryRate: number; avgSec: number }[] {
  const groups = groupBy(byEvent(rows, "skill_done"), (r) => `${r[1]}\u0000${r[2]}`);
  return [...groups]
    .map(([key, rs]) => {
      const [game, k1] = key.split("\u0000") as [string, string];
      const [skill, d] = k1.split("@d") as [string, string];
      const solved = sum(rs);
      return { game, skill, difficulty: Number(d), solved, firstTryRate: pct(sum(rs.filter((r) => r[3] === "first-try")), solved), avgSec: solved ? Math.round(sumTotal(rs) / solved) : 0 };
    })
    .filter((s) => s.solved >= minSolves)
    .sort((a, b) => a.game.localeCompare(b.game) || a.skill.localeCompare(b.skill) || a.difficulty - b.difficulty);
}

/** Count of one event split by one dimension, biggest first. */
export function breakdown(rows: InsightRow[], event: string, dim: "game" | "k1" | "k2", filter?: (r: InsightRow) => boolean): { key: string; count: number; pct: number }[] {
  const rs = byEvent(rows, event).filter((r) => !filter || filter(r));
  const idx = dim === "game" ? 1 : dim === "k1" ? 2 : 3;
  const total = sum(rs);
  const m = new Map<string, number>();
  for (const r of rs) m.set(r[idx] || "other", (m.get(r[idx] || "other") ?? 0) + r[4]);
  return [...m].map(([key, count]) => ({ key, count, pct: pct(count, total) })).sort((a, b) => b.count - a.count);
}

/** One value per day for the trend chart (missing days are 0). */
export function dailySeries(perDay: DayRow[], event: string, from: string, days: number): { day: string; count: number }[] {
  const m = new Map(perDay.filter((r) => r[1] === event).map((r) => [r[0], r[2]]));
  const start = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    return { day, count: m.get(day) ?? 0 };
  });
}
