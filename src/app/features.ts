/**
 * Which optional features this deployment has switched on (D-030), from GET /api/config.
 *
 * - Read synchronously from the last cached answer (localStorage "bz.features", booleans only, no personal data),
 *   or ALL OFF when there is none, so nothing waits for the network and an offline first visit is guest-only.
 * - Fetched once at startup (`startFeatures()` in App.tsx); a fresh answer is cached and pushed to subscribers.
 * - Off here only hides UI. The Worker enforces every flag itself (disabled routes answer 404).
 */
import { useSyncExternalStore } from "react";

export interface Features {
  /** Parent accounts: sign-in, children, sync, dashboard, digest (ACCOUNTS_ENABLED). */
  accounts: boolean;
  /** Billing: plan, checkout, codes and the day-15 trial clock (BILLING_ENABLED). */
  billing: boolean;
  /** Friends, leaderboard, challenges (FRIENDS_ENABLED). */
  friends: boolean;
  /** Daily reminders (VAPID public key configured). */
  push: boolean;
}

export const ALL_OFF: Features = Object.freeze({ accounts: false, billing: false, friends: false, push: false });
const KEY = "bz.features";
const NAMES = ["accounts", "billing", "friends", "push"] as const;

/** Strict: exactly the four keys, each a boolean. Anything else is ignored (never trusted). */
export function parseFeatures(x: unknown): Features | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (Object.keys(o).length !== NAMES.length || !NAMES.every((k) => typeof o[k] === "boolean")) return null;
  const f = { accounts: o.accounts === true, billing: o.billing === true, friends: o.friends === true, push: o.push === true };
  // Same dependencies as the Worker: billing and friends need accounts.
  return { ...f, billing: f.accounts && f.billing, friends: f.accounts && f.friends };
}

function readCache(): Features | null {
  try {
    return parseFeatures(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return null;
  }
}

let current: Features | null = null;
const listeners = new Set<() => void>();

/** Current flags: the last server answer, else all off. Synchronous. */
export function features(): Features {
  return (current ??= readCache() ?? ALL_OFF);
}

export function onFeaturesChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(next: Features) {
  const prev = features();
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* in-memory only */
  }
  if (NAMES.some((k) => prev[k] !== next[k])) for (const fn of listeners) fn();
}

/** Fetch /api/config. Offline, an error or a malformed answer keeps the current (cached or all-off) flags. */
export async function refreshFeatures(fetchImpl: typeof fetch = fetch): Promise<Features> {
  try {
    const res = await fetchImpl("/api/config", { credentials: "omit" });
    if (res.ok) {
      const parsed = parseFeatures(await res.json());
      if (parsed) set(parsed);
    }
  } catch {
    /* offline: keep what we have */
  }
  return features();
}

let started: Promise<Features> | null = null;
/** Called once at app startup. Never blocks rendering. */
export function startFeatures(): Promise<Features> {
  return (started ??= refreshFeatures());
}

/** React hook: re-renders when the flags change. */
export function useFeatures(): Features {
  return useSyncExternalStore(onFeaturesChange, features, features);
}

/** Tests only: forget the in-memory state. */
export function resetFeaturesForTests() {
  current = null;
  started = null;
  listeners.clear();
}
