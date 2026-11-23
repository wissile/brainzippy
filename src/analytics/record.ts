/**
 * App-level recording helpers (D-033): what to count at app start and on each screen. Game-round counting lives in
 * src/game/GameRunner.tsx. Everything goes through `track()`, which validates against src/analytics/schema.ts.
 */
import { loadState } from "../services/storage";
import { AGE_BANDS, deviceClass, loadBucket } from "./schema";
import { startAnalytics, track } from "./track";

const SCREEN_FOR: Record<string, string> = {
  "/map": "map",
  "/explore": "explore",
  "/grown-ups": "grown-ups",
  "/hello": "hello",
  "/parents": "parents",
  "/plan": "plan",
};

let lastScreen = "";
/** The screen shown before the current one ("map", "explore"...): where a round was started from. */
export const previousScreen = (): string => lastScreen;
let currentScreen = "";

export function recordScreen(path: string, worldId?: string): void {
  const screen = worldId ? "play" : (SCREEN_FOR[path] ?? (path.startsWith("/parents/") ? "parents" : ""));
  if (!screen || screen === currentScreen) return;
  lastScreen = currentScreen;
  currentScreen = screen;
  track("screen", { k1: screen, game: worldId ?? "" });
}

let recorded = false;
/** Once per app start: device class, age band, settings, first-load speed. */
export function recordAppStart(): void {
  if (recorded) return;
  recorded = true;
  try {
    startAnalytics();
    const st = loadState();
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const band = (AGE_BANDS as readonly string[]).includes(st.ageBand ?? "") ? st.ageBand! : "unknown";
    // device and age band are separate counters, so they can't be combined to single out a child
    track("session", { k1: deviceClass(window.innerWidth, window.innerHeight, coarse) });
    track("age_band", { k1: band });
    const onOff = (b: boolean) => (b ? "on" : "off");
    track("setting", { k1: "sound", k2: onOff(!st.muted) });
    track("setting", { k1: "music", k2: onOff(st.music) });
    track("setting", { k1: "reduced-motion", k2: onOff(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false) });
    track("setting", { k1: "installed", k2: onOff(window.matchMedia?.("(display-mode: standalone)").matches ?? false) });
    track("setting", { k1: "online", k2: onOff(navigator.onLine !== false) });
    const ms = performance.now();
    track("load", { k1: loadBucket(ms), total: ms });
  } catch {
    /* never break start-up */
  }
}
