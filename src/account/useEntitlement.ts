import { useCallback, useEffect, useState } from "react";
import { currentDecision, onBillingChange, refreshEntitlement } from "../billing/client";
import type { Entitlement } from "../billing/model";

/**
 * Client entitlement hook. Answers synchronously from the device (never waits for the network: play must not block),
 * then refreshes from POST /api/billing/status in the background when a parent is signed in on this device.
 * Offline: the last server answer is cached; paid access keeps working for 7 days past its end date (OFFLINE_GRACE_MS).
 * Shape mirrors worker/lib/entitlements.ts (src/billing/model.ts).
 */
export type { Entitlement, EntitlementSource, EntitlementStatus } from "../billing/model";

export function useEntitlement(opts: { refresh?: boolean } = {}): { entitlement: Entitlement; playable: boolean; loading: boolean; refresh: () => Promise<void> } {
  const [decision, setDecision] = useState(() => currentDecision());
  const [loading, setLoading] = useState(opts.refresh !== false);
  const refresh = useCallback(async () => {
    setLoading(true);
    await refreshEntitlement();
    setDecision(currentDecision());
    setLoading(false);
  }, []);
  useEffect(() => onBillingChange(() => setDecision(currentDecision())), []);
  useEffect(() => {
    if (opts.refresh !== false) void refresh();
  }, [opts.refresh, refresh]);
  return { entitlement: decision.entitlement, playable: decision.playable, loading, refresh };
}
