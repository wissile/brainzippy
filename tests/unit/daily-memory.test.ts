import { describe, expect, it } from "vitest";
import { MASTERY_COUNT, REVIEW_DAYS, isDue, masteryLevel, recordRound, roundsOn, updateSkill } from "../../src/daily/memory";
import { addDays, daysBetween, localDate, msUntilNextDay } from "../../src/daily/date";
import { MAX_DAILY_DAYS, type SkillMemory, parseDailyLog } from "../../src/engine/progressSchema";

const items = (n: number, firstTry: boolean, difficulty = 3, skillId = "m.a") => Array.from({ length: n }, () => ({ skillId, difficulty, firstTry }));
const ctx = (day: string) => ({ day, world: "count", mastery: 1 });

describe("local dates", () => {
  it("formats the local calendar date and does calendar arithmetic", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-18", "2026-12-18")).toBe(30);
    expect(msUntilNextDay(new Date(2026, 10, 18, 23, 59, 0))).toBe(60_000);
  });
});

describe("mastery (M1–M2)", () => {
  it("needs N first-try successes at the mastery level, spread over two dates", () => {
    let m = updateSkill(undefined, items(MASTERY_COUNT + 2, true), ctx("2026-11-18"));
    expect(m.b).toBe(0); // all on one day → not mastered yet
    expect(m.q).toBe(MASTERY_COUNT + 2);
    m = updateSkill(m, items(1, true), ctx("2026-11-19"));
    expect(m.b).toBe(0);
    m = updateSkill(m, items(1, true), ctx("2026-11-20"));
    expect(m.b).toBe(1); // S1
    expect(m.due).toBe("2026-11-22");
  });
  it("below the mastery level or not first try: no credit and no penalty", () => {
    const m = updateSkill({ q: 4, lq: 1, b: 0, fails: 0, f: "2026-11-01" }, [...items(3, false), ...items(3, true, 1)], ctx("2026-11-18"));
    expect(m.q).toBe(4);
    expect(m.lq).toBe(1);
    expect(masteryLevel(7)).toBe(3);
    expect(masteryLevel(3)).toBe(1);
  });
});

describe("spaced review (S1–S3)", () => {
  const mastered = { q: 6, lq: 2, b: 1, fails: 0, due: "2026-11-20", f: "2026-11-10" };
  it("is due on its date, not before", () => {
    expect(isDue(mastered, "2026-11-19")).toBe(false);
    expect(isDue(mastered, "2026-11-20")).toBe(true);
    expect(isDue({ ...mastered, b: 0 }, "2026-12-01")).toBe(false);
  });
  it("practice before the due date changes nothing", () => {
    expect(updateSkill(mastered, items(5, false), ctx("2026-11-19"))).toMatchObject({ b: 1, due: "2026-11-20" });
  });
  it("a passed review moves up a box with expanding intervals, capped at box 5", () => {
    let m: SkillMemory = { ...mastered };
    let day = "2026-11-20";
    for (const box of [2, 3, 4, 5, 5]) {
      m = updateSkill(m, items(5, true), ctx(day));
      expect(m.b).toBe(box);
      expect(m.due).toBe(addDays(day, REVIEW_DAYS[box]!));
      day = m.due!;
    }
  });
  it("a failed review drops a box (min 1); two failures in box 1 return to practising quietly", () => {
    const b3 = updateSkill({ ...mastered, b: 3 }, items(5, false), ctx("2026-11-20"));
    expect(b3).toMatchObject({ b: 2, due: "2026-11-24" });
    const f1 = updateSkill(mastered, [...items(2, true), ...items(3, false)], ctx("2026-11-20"));
    expect(f1).toMatchObject({ b: 1, fails: 1, due: "2026-11-22" });
    const f2 = updateSkill(f1, items(5, false), ctx("2026-11-22"));
    expect(f2.b).toBe(0);
    expect(f2.due).toBeUndefined();
    expect(f2.q).toBe(MASTERY_COUNT / 2);
  });
});

describe("recordRound", () => {
  const round = (day: string, world = "count", extra = {}) => ({ day, world, level: 2, maxLevel: 3, results: items(8, true, 3), ...extra });
  it("counts rounds per local date, 'days learning' once per date, and keeps a valid schema", () => {
    let log = recordRound(undefined, round("2026-11-18", "count", { stop: 0 }));
    log = recordRound(log, round("2026-11-18", "rhyme"));
    expect(roundsOn(log, "2026-11-18")).toHaveLength(2);
    expect(roundsOn(log, "2026-11-18")[0]).toEqual({ w: "count", l: 2, ft: 8, n: 8, s: 0 });
    expect(log.learned).toBe(1);
    log = recordRound(log, round("2026-11-19"));
    expect(log.learned).toBe(2);
    expect(log.seen).toEqual({ count: "2026-11-19", rhyme: "2026-11-18" });
    expect(parseDailyLog(log)).toEqual(log);
  });
  it("keeps only the most recent days", () => {
    let log = recordRound(undefined, round("2026-11-01"));
    for (let i = 1; i < 20; i++) log = recordRound(log, round(addDays("2026-11-01", i)));
    expect(Object.keys(log.days)).toHaveLength(MAX_DAILY_DAYS);
    expect(log.learned).toBe(20); // never decreases
  });
});

describe("daily log schema", () => {
  const good = { days: { "2026-11-18": [{ w: "count", l: 1, ft: 4, n: 8 }] }, seen: { count: "2026-11-18" }, skills: { "m.a": { q: 1, lq: 0, b: 0, fails: 0 } }, learned: 1, plan: { day: "2026-11-18", k: 5, reg: 123, stops: [{ w: "count", k: "new" }, { w: "count", k: "pick", o: ["count", "rhyme"] }] } };
  it("accepts a valid log and rejects unknown keys, bad dates and bad kinds", () => {
    expect(parseDailyLog(good)).toEqual(good);
    expect(parseDailyLog({ ...good, name: "Ada" })).toBeNull();
    expect(parseDailyLog({ ...good, days: { "18/11/2026": [] } })).toBeNull();
    expect(parseDailyLog({ ...good, plan: { ...good.plan, stops: [{ w: "count", k: "bonus" }] } })).toBeNull();
    expect(parseDailyLog({ ...good, days: { "2026-11-18": [{ w: "count", l: 1, ft: 4, n: 8, time: 3 }] } })).toBeNull();
  });
});
