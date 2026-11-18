import { useEffect, useState } from "react";

/**
 * Client entitlement hook. STUB for the billing agent: today it reads `entitlement` from GET /api/me when a parent
 * is signed in and otherwise reports "free". Shape mirrors worker/lib/entitlements.ts.
 */
export type EntitlementStatus = "trial" | "active" | "free" | "needs-payment";
export interface Entitlement {
  status: EntitlementStatus;
  trialEndsAt?: number;
}

export function useEntitlement(): { entitlement: Entitlement; loading: boolean } {
  const [state, setState] = useState<{ entitlement: Entitlement; loading: boolean }>({ entitlement: { status: "free" }, loading: true });
  useEffect(() => {
    let live = true;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ entitlement?: Entitlement }>) : null))
      .catch(() => null)
      .then((d) => live && setState({ entitlement: d?.entitlement ?? { status: "free" }, loading: false }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}
