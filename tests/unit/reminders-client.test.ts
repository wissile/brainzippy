// @vitest-environment jsdom
/**
 * Daily reminders, device side (src/pwa/push.ts): nothing happens while push is off for the deployment, the server key
 * is fetched before any permission prompt, and "Delete all progress" forgets the device id and the service worker's
 * prefs cache (which holds the monster name).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshFeatures, resetFeaturesForTests } from "../../src/app/features";
import { PUSH_STORAGE_KEY, SW_PREFS_CACHE, forgetReminders, preparePush } from "../../src/pwa/push";

const DEVICE = "11111111-1111-4111-8111-111111111111";
const KEY = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"; // RFC 8291 sample (test only)
const config = (push: boolean) => vi.fn(async () => new Response(JSON.stringify({ accounts: false, billing: false, friends: false, push, analytics: false }))) as unknown as typeof fetch;

let cacheDelete: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  resetFeaturesForTests();
  cacheDelete = vi.fn(async () => true);
  vi.stubGlobal("caches", { delete: cacheDelete });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Minimal browser push support for pushSupport() === "supported" in jsdom. */
function stubPushSupport() {
  const requestPermission = vi.fn(async () => "granted" as NotificationPermission);
  vi.stubGlobal("Notification", Object.assign(function Notification() {}, { requestPermission, permission: "default" }));
  vi.stubGlobal("PushManager", function PushManager() {});
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: {} }) } });
  return requestPermission;
}

describe("preparePush (runs when the reminder panel opens, before any prompt)", () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it("push off for this deployment: no request at all", async () => {
    await refreshFeatures(config(false));
    stubPushSupport();
    const fetchSpy = vi.fn();
    expect(await preparePush(fetchSpy as unknown as typeof fetch)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("push on: fetches the key; a missing or malformed key means no 'Turn on' (and never a prompt)", async () => {
    await refreshFeatures(config(true));
    const requestPermission = stubPushSupport();
    const ok = await preparePush(vi.fn(async () => new Response(JSON.stringify({ publicKey: KEY }))) as unknown as typeof fetch);
    expect(ok?.publicKey).toBe(KEY);
    for (const res of [new Response("{}", { status: 404 }), new Response(JSON.stringify({ publicKey: "short" })), new Response("not json")]) {
      expect(await preparePush(vi.fn(async () => res) as unknown as typeof fetch)).toBeNull();
    }
    expect(await preparePush(vi.fn(async () => Promise.reject(new Error("offline"))) as unknown as typeof fetch)).toBeNull();
    expect(requestPermission).not.toHaveBeenCalled();
  });
});

describe("forgetReminders (Delete all progress)", () => {
  it("unsubscribes, then removes bz.push.v1 and the service worker's prefs cache", async () => {
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify({ enabled: true, hour: 9, deviceId: DEVICE }));
    const fetchSpy = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchSpy);
    await forgetReminders();
    expect(localStorage.getItem(PUSH_STORAGE_KEY)).toBeNull();
    expect(cacheDelete).toHaveBeenCalledWith(SW_PREFS_CACHE);
    expect(SW_PREFS_CACHE).toBe("bz-local");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/push/unsubscribe");
    expect(JSON.parse(init.body as string)).toEqual({ id: DEVICE });
  });

  it("never set up: no network request, but the prefs cache is still cleared", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await forgetReminders();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith(SW_PREFS_CACHE);
  });

  it("never throws (offline, no Cache Storage)", async () => {
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify({ enabled: false, deviceId: DEVICE }));
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    vi.stubGlobal("caches", undefined);
    await expect(forgetReminders()).resolves.toBeUndefined();
    expect(localStorage.getItem(PUSH_STORAGE_KEY)).toBeNull();
  });
});
