/**
 * Device side of billing. Stores (localStorage "bz.billing", no personal data):
 * - firstPlayAt: when a game was first opened on this device (starts the 14 free days);
 * - cache: the last entitlement the server returned for the signed-in parent, for offline play.
 * Enforcement is client-side by design (honest-user model, see docs/BILLING.md): clearing site data restarts the
 * device's free period. Paid access is never taken away just because the device is offline (OFFLINE_GRACE_MS).
 */
import { decidePlay, parseEntitlement, type CachedEntitlement, type Entitlement } from "./model";

const KEY = "bz.billing";

export interface Offer {
  trialEndsAt: number | null;
  price: string;
  interval: string;
}
export interface StatusResponse {
  entitlement: Entitlement;
  offer: Offer;
  billing: "live" | "fake" | null;
}

interface Stored {
  firstPlayAt: number | null;
  cache: CachedEntitlement | null;
}

let memory: Stored | null = null;

export function loadBilling(): Stored {
  if (memory) return memory;
  memory = { firstPlayAt: null, cache: null };
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (o && typeof o === "object") {
      const f = o.firstPlayAt;
      const c = o.cache as Record<string, unknown> | null | undefined;
      const ent = c ? parseEntitlement(c.ent) : null;
      memory = {
        firstPlayAt: typeof f === "number" && Number.isFinite(f) ? f : null,
        cache: ent && typeof c?.fetchedAt === "number" ? { ent, fetchedAt: c.fetchedAt } : null,
      };
    }
  } catch {
    /* unavailable or corrupted: in-memory only */
  }
  return memory;
}

function save(patch: Partial<Stored>) {
  memory = { ...loadBilling(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* in-memory only */
  }
  for (const fn of listeners) fn();
}

const listeners = new Set<() => void>();
export function onBillingChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Called when a game opens. Only the first call ever sets the time. */
export function markFirstPlay(now = Date.now()) {
  if (loadBilling().firstPlayAt === null) save({ firstPlayAt: now });
}

export function currentDecision(now = Date.now()) {
  const s = loadBilling();
  return decidePlay(s.firstPlayAt, s.cache, now);
}

/** Store a fresh server answer (e.g. after redeeming a code). */
export function rememberEntitlement(ent: Entitlement, now = Date.now()) {
  save({ cache: { ent, fetchedAt: now } });
}

/**
 * Ask the server (needs the parent's session cookie on this device). Sends the device's first play so the account's
 * free period starts at the earlier of the two. "signed-out" and "offline" leave the cache untouched.
 */
export async function refreshEntitlement(): Promise<StatusResponse | "signed-out" | "offline"> {
  try {
    const res = await fetch("/api/billing/status", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(loadBilling().firstPlayAt === null ? {} : { firstPlayAt: loadBilling().firstPlayAt }),
    });
    if (res.status === 401) return "signed-out";
    if (!res.ok) return "offline";
    const data = (await res.json()) as Partial<StatusResponse>;
    const ent = parseEntitlement(data.entitlement);
    if (!ent || !data.offer) return "offline";
    rememberEntitlement(ent);
    return { entitlement: ent, offer: data.offer, billing: data.billing ?? null };
  } catch {
    return "offline";
  }
}

/** Typed calls for the parent-facing billing screens. */
async function post<T>(path: string, body: unknown): Promise<({ ok: true } & T) | { ok: false; error: string }> {
  try {
    const res = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: typeof data.error === "string" ? data.error : "server_error" };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, error: "offline" };
  }
}
export const billingApi = {
  checkout: () => post<{ url: string }>("/api/billing/checkout", { consent: true }),
  portal: (flow?: "cancel") => post<{ url: string }>("/api/billing/portal", flow ? { flow } : {}),
  redeem: async (code: string) => {
    const r = await post<{ entitlement: Entitlement }>("/api/billing/redeem", { code });
    if (r.ok) {
      const ent = parseEntitlement(r.entitlement);
      if (ent) rememberEntitlement(ent);
    }
    return r;
  },
};

export const errorText = (e: string) =>
  ({
    offline: "We couldn't reach BrainZippy. Check your connection and try again.",
    rate_limited: "Too many tries. Please wait a few minutes and try again.",
    billing_not_configured: "Payments aren't available yet. Please try again later.",
    billing_unavailable: "The payment page couldn't be opened. Please try again.",
    already_subscribed: "You already have a plan. Use Manage billing to change it.",
    already_free: "Your family already has free access.",
    invalid_code: "That code doesn't look right. Check it and try again.",
    code_unavailable: "That code has expired or has already been used.",
    already_redeemed: "You've already used this code.",
    has_subscription: "You have a paid plan. Cancel it in Manage billing first, then redeem the code.",
    no_billing_account: "There's no billing account yet.",
    unauthorized: "Please sign in again.",
  })[e] ?? "Something went wrong. Please try again.";
