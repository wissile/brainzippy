/**
 * Anonymous play statistics, client side (D-033). See src/analytics/schema.ts for what may be counted and why it can't
 * identify anyone.
 *
 * - `track()` adds 1 to a counter in memory. It is synchronous, never throws and never waits. Pending counters are
 *   written to localStorage "bz.stats.v1" only when the page is hidden and they couldn't be sent (e.g. offline), so
 *   offline play is counted when the device is next online; nothing is written to storage during play.
 * - Counters are sent in one small batch every 5 minutes while the page is visible, and with navigator.sendBeacon when
 *   the page is hidden. Nothing is sent unless /api/config says `analytics: true`; then the pending counters are dropped.
 * - A grown-up can switch sharing off on the Grown-ups page ("bz.stats.off" = "1"), and a browser that sends the
 *   Global Privacy Control signal is treated as switched off. Off = nothing is counted, queued or sent.
 * - A batch is dropped once the server has answered (any status), so a count is never sent twice. A network failure
 *   keeps the counters for the next try.
 * - Never blocks gameplay: no awaits on the play path, no UI, no retries in a loop.
 */
import { getWorld } from "../content/registry";
import { features, onFeaturesChange, startFeatures } from "../app/features";
import { MAX_COUNT, MAX_ROWS_PER_BATCH, MAX_TOTAL, validRow, type EventName, type StatRow } from "./schema";

const KEY = "bz.stats.v1";
const OFF_KEY = "bz.stats.off";
const ENDPOINT = "/api/play-stats";
const FLUSH_MS = 5 * 60_000;
const content = { isGame: (id: string) => getWorld(id) !== undefined, skillsOf: (id: string) => getWorld(id)?.skills };

/** Global Privacy Control (navigator.globalPrivacyControl): the browser asks sites not to share or sell data. */
export const gpcOn = (): boolean => typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/** Has a grown-up left anonymous play counts on for this device? Off when switched off or when the browser sends GPC. */
export function statsSharing(): boolean {
  if (gpcOn()) return false;
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Grown-ups page switch. Turning it off forgets anything waiting to be sent. */
export function setStatsSharing(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, "1");
  } catch {
    /* can't remember the choice: still stop for this visit */
    forcedOff = !on;
  }
  if (!on) clearStats();
}
let forcedOff = false;
const allowed = () => !forcedOff && statsSharing();

type Pending = Map<string, StatRow>;
let pending: Pending | null = null;
let timer = 0;
let started = false;
let featuresKnown = false;

function load(): Pending {
  if (pending) return pending;
  pending = new Map();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (Array.isArray(raw)) for (const x of raw.slice(0, MAX_ROWS_PER_BATCH)) add(validRow(x, content));
    localStorage.removeItem(KEY); // now held in memory; written back only if it can't be sent before the page hides
  } catch {
    /* corrupt or unavailable: start empty */
  }
  return pending;
}

function persist() {
  try {
    if (!pending || pending.size === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify([...pending.values()]));
  } catch {
    /* storage full or blocked: memory only */
  }
}

function add(row: StatRow | null) {
  if (!row || !pending) return;
  const key = row.slice(0, 4).join("\u0000");
  const prev = pending.get(key);
  if (prev) {
    prev[4] = Math.min(MAX_COUNT, prev[4] + row[4]);
    prev[5] = Math.min(MAX_TOTAL, prev[5] + row[5]);
  } else {
    if (pending.size >= MAX_ROWS_PER_BATCH) return; // full until the next flush; never grows without bound
    pending.set(key, [...row] as StatRow);
  }
}

export interface TrackDims {
  game?: string;
  k1?: string;
  k2?: string;
  /** A numeric amount summed with the count (seconds, milliseconds). Only for events that allow it. */
  total?: number;
}

/** Count one event. Invalid dimensions are dropped silently (the server would reject them anyway). */
export function track(event: EventName, dims: TrackDims = {}): void {
  try {
    if ((featuresKnown && !features().analytics) || !allowed()) return;
    load();
    const total = dims.total === undefined ? 0 : Math.max(0, Math.min(MAX_TOTAL, Math.round(dims.total)));
    add(validRow([event, dims.game ?? "", dims.k1 ?? "", dims.k2 ?? "", 1, total], content));
    if (pending && pending.size >= MAX_ROWS_PER_BATCH) void flush();
  } catch {
    /* analytics must never break play */
  }
}

function takeBatch(): StatRow[] {
  const rows = [...(pending?.values() ?? [])];
  pending?.clear();
  return rows;
}

function putBack(rows: StatRow[]) {
  load();
  for (const r of rows) add(r);
}

/** Send pending counters now. Resolves when done; never rejects. */
export async function flush(fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    if (!pending || pending.size === 0) return;
    await startFeatures();
    featuresKnown = true;
    if (!features().analytics || !allowed()) return clearStats();
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const rows = takeBatch();
    try {
      await fetchImpl(ENDPOINT, { method: "POST", credentials: "omit", keepalive: true, headers: { "content-type": "text/plain;charset=UTF-8" }, body: JSON.stringify({ rows }) });
    } catch {
      putBack(rows); // network error: nothing reached the server
    }
  } catch {
    /* never surface */
  }
}

const onLeave = new Set<() => void>();
/** Run `fn` just before the last batch is sent when the page is closed or reloaded (e.g. count a round left open). */
export function beforePageLeave(fn: () => void): () => void {
  onLeave.add(fn);
  return () => onLeave.delete(fn);
}

/** Page is being hidden: hand the batch to the browser, which sends it even if the page goes away. */
function beacon(leaving = false) {
  try {
    if (leaving) for (const fn of onLeave) fn();
    if (!pending || pending.size === 0) return;
    if (!allowed() || (featuresKnown && !features().analytics)) return clearStats();
    const rows = [...pending.values()];
    const sent = featuresKnown && navigator.onLine !== false && typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify({ rows })], { type: "text/plain;charset=UTF-8" }));
    if (sent) takeBatch();
    persist(); // whatever couldn't be sent waits on the device for the next visit (empty = removed)
  } catch {
    /* keep for the next visit */
  }
}

/** Called once at app start. Safe to call again. */
export function startAnalytics(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!allowed()) return clearStats();
  load();
  void startFeatures().then(() => {
    featuresKnown = true;
    if (!features().analytics) clearStats();
  });
  onFeaturesChange(() => {
    if (!features().analytics) clearStats();
  });
  window.addEventListener("online", () => void flush());
  timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void flush();
  }, FLUSH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") beacon(false);
  });
  window.addEventListener("pagehide", () => beacon(true));
}

/** "Delete all progress" and analytics switched off: forget pending counters. */
export function clearStats(): void {
  pending?.clear();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Tests only. */
export function resetStatsForTests() {
  pending = null;
  started = false;
  featuresKnown = false;
  forcedOff = false;
  window.clearInterval(timer);
}
export const pendingRowsForTests = (): StatRow[] => [...(pending?.values() ?? [])];
