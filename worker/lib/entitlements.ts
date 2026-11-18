/**
 * Entitlements seam for billing. STUB: the billing agent replaces the body with Stripe-backed state
 * (14-day device/account trial → card → 14-day Stripe trial → $6.99/month; free-access codes).
 * Callers must only depend on the return type, never on how it is computed.
 */
export type EntitlementStatus = "trial" | "active" | "free" | "needs-payment";

export interface Entitlement {
  status: EntitlementStatus;
  /** Unix ms; present when status is "trial". */
  trialEndsAt?: number;
}

export type EntitlementSubject = { parentId: string } | { deviceId: string };

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getEntitlement(_env: Env, _subject: EntitlementSubject): Promise<Entitlement> {
  // Stub: everyone can play while billing is being built.
  return { status: "free" };
}
