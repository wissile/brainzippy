// @vitest-environment jsdom
/** Client feature flags (src/app/features.ts) and what billing does with them (D-030). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_OFF, features, onFeaturesChange, parseFeatures, refreshFeatures, resetFeaturesForTests } from "../../src/app/features";
import { DAY_MS } from "../../src/billing/model";

const ON = { accounts: true, billing: true, friends: true, push: true };
const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

beforeEach(() => {
  localStorage.clear();
  resetFeaturesForTests();
});

describe("parseFeatures", () => {
  it("accepts exactly four booleans and applies the server's dependencies", () => {
    expect(parseFeatures(ON)).toEqual(ON);
    expect(parseFeatures({ accounts: false, billing: true, friends: true, push: true })).toEqual({ accounts: false, billing: false, friends: false, push: true });
    for (const bad of [null, [], "x", {}, { ...ON, extra: true }, { ...ON, billing: "true" }, { accounts: true, billing: true, friends: true }]) expect(parseFeatures(bad), JSON.stringify(bad)).toBeNull();
  });
});

describe("features store", () => {
  it("is all off before the first answer (an offline first visit is guest-only)", () => {
    expect(features()).toEqual(ALL_OFF);
  });

  it("fetches /api/config once, caches it and notifies on change", async () => {
    const fn = vi.fn();
    onFeaturesChange(fn);
    const f = answer(ON);
    expect(await refreshFeatures(f)).toEqual(ON);
    expect(f).toHaveBeenCalledWith("/api/config", { credentials: "omit" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("bz.features")!)).toEqual(ON);
    await refreshFeatures(answer(ON));
    expect(fn).toHaveBeenCalledTimes(1); // unchanged: no re-render
  });

  it("offline, an error or a malformed answer keeps the last cached value", async () => {
    localStorage.setItem("bz.features", JSON.stringify({ accounts: true, billing: false, friends: false, push: false }));
    const cached = { accounts: true, billing: false, friends: false, push: false };
    expect(await refreshFeatures(vi.fn(async () => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch)).toEqual(cached);
    expect(await refreshFeatures(answer({ error: "not_found" }, 404))).toEqual(cached);
    expect(await refreshFeatures(answer({ accounts: "yes" }))).toEqual(cached);
    resetFeaturesForTests();
    localStorage.setItem("bz.features", "{broken");
    expect(features()).toEqual(ALL_OFF);
  });
});

describe("billing off on the device", () => {
  it("no trial clock: day 15 (and day 400) is still playable, first play is not recorded, no network call", async () => {
    const { currentDecision, markFirstPlay, refreshEntitlement } = await import("../../src/billing/client");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const t0 = Date.UTC(2026, 10, 22);
    markFirstPlay(t0);
    expect(localStorage.getItem("bz.billing")).toBeNull();
    for (const day of [0, 15, 400]) {
      const d = currentDecision(t0 + day * DAY_MS);
      expect(d.playable).toBe(true);
      expect(d.entitlement).toMatchObject({ status: "free", source: "early-access" });
    }
    expect(await refreshEntitlement()).toBe("billing-off");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("billing on: the day-15 paywall decision still applies", async () => {
    await refreshFeatures(answer(ON));
    const { currentDecision, markFirstPlay } = await import("../../src/billing/client");
    const t0 = Date.now();
    markFirstPlay(t0);
    expect(currentDecision(t0 + 15 * DAY_MS).playable).toBe(false);
  });
});
