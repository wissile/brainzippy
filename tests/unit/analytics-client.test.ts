/** Client side of anonymous play statistics (D-033): batching, the flag, and "Delete all progress". */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStats, flush, pendingRowsForTests, resetStatsForTests, setStatsSharing, statsSharing, track } from "../../src/analytics/track";
import { resetFeaturesForTests } from "../../src/app/features";

const config = (analytics: boolean) => ({ accounts: false, billing: false, friends: false, push: false, analytics });

function mockFetch(analytics: boolean) {
  const sent: unknown[] = [];
  const impl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) === "/api/config") return new Response(JSON.stringify(config(analytics)), { status: 200 });
    sent.push(JSON.parse(String(init?.body)));
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal("fetch", impl);
  return { impl, sent };
}

beforeEach(() => {
  localStorage.clear();
  resetFeaturesForTests();
  resetStatsForTests();
});
afterEach(() => vi.unstubAllGlobals());

describe("track + flush", () => {
  it("aggregates counts, sends one batch, then forgets it (never sent twice)", async () => {
    const { sent, impl } = mockFetch(true);
    track("screen", { k1: "map" });
    track("screen", { k1: "map" });
    track("round_done", { game: "sky-balloon-race", k1: "L1", k2: "s3", total: 61.6 });
    expect(localStorage.getItem("bz.stats.v1")).toBeNull(); // nothing written to storage during play
    await flush(impl as unknown as typeof fetch);
    expect(sent).toEqual([{ rows: [["screen", "", "map", "", 2, 0], ["round_done", "sky-balloon-race", "L1", "s3", 1, 62]] }]);
    expect(pendingRowsForTests()).toEqual([]);
    expect(localStorage.getItem("bz.stats.v1")).toBeNull();
    await flush(impl as unknown as typeof fetch);
    expect(sent).toHaveLength(1);
  });

  it("drops invalid dimensions instead of sending them (typed text never leaves the device)", () => {
    mockFetch(true);
    track("wrong", { game: "sky-balloon-race", k1: "sb-3p4", k2: "Sam" });
    track("ex_done", { game: "sky-balloon-race", k1: "gc-1", k2: "first-try" }); // not this game's exercise
    track("screen", { k1: "not-a-screen" });
    track("session", { game: "sky-balloon-race", k1: "phone" });
    expect(pendingRowsForTests()).toEqual([]);
  });

  it("sends nothing and clears the queue when the deployment has analytics off", async () => {
    const { sent, impl } = mockFetch(false);
    track("screen", { k1: "map" });
    await flush(impl as unknown as typeof fetch);
    expect(sent).toEqual([]);
    expect(pendingRowsForTests()).toEqual([]);
    expect(localStorage.getItem("bz.stats.v1")).toBeNull();
    track("screen", { k1: "map" }); // flag now known: not even queued
    expect(pendingRowsForTests()).toEqual([]);
  });

  it("keeps the batch when the network fails, and clearStats forgets everything", async () => {
    mockFetch(true);
    track("screen", { k1: "explore" });
    const failing = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === "/api/config") return new Response(JSON.stringify(config(true)));
      throw new TypeError("offline");
    });
    await flush(failing as unknown as typeof fetch);
    expect(pendingRowsForTests()).toEqual([["screen", "", "explore", "", 1, 0]]);
    clearStats();
    expect(pendingRowsForTests()).toEqual([]);
    expect(localStorage.getItem("bz.stats.v1")).toBeNull();
  });

  it("a grown-up can switch sharing off: nothing is counted or sent, and the queue is forgotten", async () => {
    const { sent, impl } = mockFetch(true);
    track("screen", { k1: "map" });
    expect(statsSharing()).toBe(true);
    setStatsSharing(false);
    expect(statsSharing()).toBe(false);
    expect(localStorage.getItem("bz.stats.off")).toBe("1");
    expect(pendingRowsForTests()).toEqual([]);
    track("screen", { k1: "map" });
    await flush(impl as unknown as typeof fetch);
    expect(sent).toEqual([]);
    setStatsSharing(true);
    track("screen", { k1: "map" });
    expect(pendingRowsForTests()).toHaveLength(1);
  });

  it("the Global Privacy Control signal switches sharing off", () => {
    mockFetch(true);
    Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, get: () => true });
    try {
      expect(statsSharing()).toBe(false);
      track("screen", { k1: "map" });
      expect(pendingRowsForTests()).toEqual([]);
    } finally {
      delete (navigator as unknown as Record<string, unknown>).globalPrivacyControl;
    }
  });

  it("never throws, even with storage unavailable", () => {
    mockFetch(true);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => track("screen", { k1: "map" })).not.toThrow();
    spy.mockRestore();
  });
});
