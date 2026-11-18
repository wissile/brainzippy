import { useState } from "react";
import { RoundHooksContext } from "../game/roundHooks";
import { EndOfDay } from "./EndOfDay";
import { dailyHooks, dailyStatus, hasRoundInProgress } from "./store";
import { useToday } from "./useToday";

/**
 * Wraps every /play/<world> route. Under today's limit the game runs with the daily hooks (seedForDay
 * content, stretch start, round logging). At the limit the end-of-day scene shows instead — except that a
 * game which was already open (or a saved round in progress) always finishes. A new local day unlocks play.
 */
export function DailyGate({ worldId, children }: { worldId: string; children: React.ReactNode }) {
  const day = useToday();
  const locked = dailyStatus(day).locked;
  // Allowed at mount = may finish: completing the last round of the day must not swap the reward screen away.
  const [allowedAtMount] = useState(() => !locked || hasRoundInProgress(worldId));
  if (locked && !allowedAtMount) return <EndOfDay key={day} />;
  return <RoundHooksContext.Provider value={dailyHooks}>{children}</RoundHooksContext.Provider>;
}
