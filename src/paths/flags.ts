import { registry, type Registry } from "../content/registry";
import { type LearningPath, allPaths } from "./registry";

/**
 * Which paths children see (D-034). A path shows when its pack says `path.live: true` (the owner flips it once every
 * age 3–14 has a world). For development and e2e only, `?paths=all` shows every path that has a playable world; it
 * works only on a dev build or on localhost / 127.0.0.1 (never on brainzippy.com), lasts for the browser tab, and
 * `?paths=live` turns it off again.
 */
const KEY = "bz.paths.override";
let override: boolean | null = null;

function devHost(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  } catch {
    return false;
  }
}

/** Read `?paths=all|live` from the URL (call once at app start; later calls re-read it). */
export function initPathsOverride(): boolean {
  override = false;
  try {
    if (!devHost()) return false;
    const q = new URLSearchParams(window.location.search).get("paths");
    if (q === "all") sessionStorage.setItem(KEY, "all");
    else if (q === "live") sessionStorage.removeItem(KEY);
    override = sessionStorage.getItem(KEY) === "all";
  } catch {
    /* storage unavailable: no override */
  }
  return override;
}

export const pathsOverride = (): boolean => override ?? initPathsOverride();

/** Paths a child may see right now (live ones, or every path under the dev override). */
export function visiblePaths(reg: Registry = registry, all: boolean = pathsOverride()): LearningPath[] {
  return allPaths(reg).filter((p) => all || p.live);
}

/** True when any path UI should appear (the "My path" tab, the picker, the daily-plan preference, path rounds). */
export const pathsEnabled = (reg: Registry = registry): boolean => visiblePaths(reg).length > 0;
