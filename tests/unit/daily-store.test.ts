import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearState, loadState, saveState } from "../../src/services/storage";
import { bandOf, dailyHooks, dailyStatus, ensurePlan, recordCompleted, setActiveStop, today, tomorrowPreview } from "../../src/daily/store";
import { DAILY_LIMIT, getDailySettings, setDailyLimit, setDailySettingsAdapter, localSettingsAdapter } from "../../src/daily/settings";
import { roundSeed } from "../../src/daily/planner";

const result = (firstTry = true) => ({ skillId: "math.count.one-to-one", difficulty: 2, firstTry });
const play = (gameId = "counting-adventure") => recordCompleted({ gameId, level: 1, maxLevel: 7, results: Array.from({ length: 8 }, () => result()) });

beforeEach(() => {
  clearState();
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 18, 9, 30)); // 18 Nov 2026, 09:30 local
  saveState({ ageBand: "ages-3-5" });
});
afterEach(() => {
  vi.useRealTimers();
  setDailySettingsAdapter(localSettingsAdapter);
});

describe("daily settings", () => {
  it("defaults to 5 and clamps the parent setting to 3–10", async () => {
    expect(getDailySettings().limit).toBe(5);
    expect(await setDailyLimit(1)).toBe(DAILY_LIMIT.min);
    expect(await setDailyLimit(42)).toBe(DAILY_LIMIT.max);
    expect(await setDailyLimit(7)).toBe(7);
    expect(loadState().dailyLimit).toBe(7);
  });
  it("goes through a swappable adapter (account settings later); a failing adapter never blocks play", () => {
    setDailySettingsAdapter({ read: () => { throw new Error("offline"); }, write: () => undefined });
    expect(getDailySettings().limit).toBe(5);
  });
});

describe("daily limit", () => {
  it("counts completed rounds per local date and locks at the limit", async () => {
    await setDailyLimit(3);
    expect(dailyStatus()).toMatchObject({ day: "2026-11-18", done: 0, limit: 3, locked: false });
    play();
    play("glow-cave-hops"); // an Explore play counts too
    expect(dailyStatus().locked).toBe(false);
    expect(dailyHooks.canPlayAgain!()).toBe(true);
    play();
    expect(dailyStatus()).toMatchObject({ done: 3, locked: true });
    expect(dailyHooks.canPlayAgain!()).toBe(false);
  });

  it("unlocks after local midnight with a new plan (date rollover)", async () => {
    await setDailyLimit(3);
    for (let i = 0; i < 3; i++) play();
    expect(dailyStatus().locked).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 18, 23, 59, 59));
    expect(dailyStatus().locked).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 19, 0, 0, 1));
    expect(today()).toBe("2026-11-19");
    const s = dailyStatus();
    expect(s).toMatchObject({ day: "2026-11-19", done: 0, locked: false, learned: 1 });
    expect(s.plan.day).toBe("2026-11-19");
    expect(s.lit.every((x) => !x)).toBe(true);
  });

  it("a lowered limit locks immediately; a raised one unlocks (parent decision)", async () => {
    play();
    play();
    await setDailyLimit(3);
    expect(dailyStatus().locked).toBe(false);
    play();
    expect(dailyStatus().locked).toBe(true);
    await setDailyLimit(4);
    expect(dailyStatus().locked).toBe(false);
    expect(dailyStatus().plan.stops).toHaveLength(4);
  });
});

describe("today's plan", () => {
  it("is made once per day (D1) and saved", () => {
    const a = ensurePlan();
    expect(loadState().progress.daily?.plan).toEqual(a);
    play();
    expect(ensurePlan()).toBe(loadState().progress.daily!.plan); // unchanged after playing
    expect(ensurePlan().stops).toEqual(a.stops);
  });
  it("re-plans when the limit changes but keeps stops already completed", async () => {
    const first = ensurePlan().stops[0]!;
    setActiveStop(0, first.w);
    play(first.w);
    await setDailyLimit(8);
    const s = dailyStatus();
    expect(s.plan.stops).toHaveLength(8);
    expect(s.plan.stops[0]).toEqual(first);
    expect(s.lit[0]).toBe(true);
  });
  it("lights the trail stop the round started from", () => {
    const stops = ensurePlan().stops;
    const i = stops.length - 2;
    setActiveStop(i, stops[i]!.w);
    play(stops[i]!.w);
    expect(dailyStatus().lit[i]).toBe(true);
    expect(loadState().progress.daily!.days["2026-11-18"]![0]!.s).toBe(i);
  });
});

describe("GameRunner hooks", () => {
  it("seed: seedForDay per world and per repeat within the day", () => {
    expect(dailyHooks.seed!("counting-adventure")).toBe(roundSeed("2026-11-18", "counting-adventure", 0));
    play();
    expect(dailyHooks.seed!("counting-adventure")).toBe(roundSeed("2026-11-18", "counting-adventure", 1));
  });
  it("stretch: only for a round started from an unlit stretch stop", () => {
    saveState({ progress: { ...loadState().progress, levels: { "counting-adventure": 2 }, daily: { days: {}, seen: { "counting-adventure": "2026-11-17" }, skills: {}, learned: 1 } } });
    const stops = ensurePlan().stops;
    const i = stops.findIndex((s) => s.k === "stretch");
    expect(i).toBeGreaterThan(0);
    expect(dailyHooks.stretch!(stops[i]!.w)).toBe(false); // not started from the trail
    setActiveStop(i, stops[i]!.w);
    expect(dailyHooks.stretch!(stops[i]!.w)).toBe(true);
    play(stops[i]!.w);
    setActiveStop(i, stops[i]!.w);
    expect(dailyHooks.stretch!(stops[i]!.w)).toBe(false); // already done
  });
});

describe("helpers", () => {
  it("bandOf parses stored age bands", () => {
    expect(bandOf("ages-6-8")).toEqual([6, 8]);
    expect(bandOf(null)).toEqual([3, 5]);
  });
  it("tomorrow's teaser is the plan tomorrow will actually start from", () => {
    play();
    const t = tomorrowPreview();
    expect(t).not.toBeNull();
    vi.setSystemTime(new Date(2026, 10, 19, 8, 0));
    const stops = ensurePlan().stops;
    expect((stops.find((s) => s.k === "new") ?? stops[0])!.w).toBe(t!.world.id);
  });
  it("a corrupted daily log never wipes the rest of the progress", async () => {
    localStorage.setItem("bz.v1", JSON.stringify({ progress: { v: 1, stickers: ["counting-champ"], roundsCompleted: 2, skills: {}, daily: { bogus: true } } }));
    vi.resetModules(); // fresh storage module = fresh read from localStorage
    const fresh = await import("../../src/services/storage");
    expect(fresh.loadState().progress.stickers).toEqual(["counting-champ"]);
    expect(fresh.loadState().progress.daily).toBeUndefined();
  });
});
