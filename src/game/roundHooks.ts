import { type ReactNode, createContext } from "react";
import type { ExerciseResult } from "../engine/types";

/**
 * Optional hooks a host screen can give GameRunner (e.g. daily learning, src/daily). GameRunner works
 * unchanged without them. Kept in its own tiny module so the app shell doesn't pull GameRunner in eagerly.
 */
export interface RoundHooks {
  /** Seed for a new round of this game (e.g. seedForDay). Default: a random seed. */
  seed?: (gameId: string) => number | undefined;
  /** Start the round one difficulty step above its level (a "stretch" round). */
  stretch?: (gameId: string) => boolean;
  /** Called once per completed round, after progress has been saved. */
  onRoundComplete?: (round: { gameId: string; level: number; maxLevel: number; results: readonly ExerciseResult[] }) => void;
  /** Whether "Again" may start another round now (false hides it, e.g. when today's limit is reached). */
  canPlayAgain?: () => boolean;
  /** Where "back" and "Games" go (default: the map), e.g. the learning-path view a round was started from. */
  backTo?: (gameId: string) => string | undefined;
  /** Replaces the reward screen's level line when a host rule changed the level (e.g. a path's skip ahead). */
  levelNote?: (gameId: string) => string | undefined;
  /** Extra content on the reward screen, between rounds (e.g. a path host's "try another path?" offer). */
  rewardExtra?: (gameId: string) => ReactNode;
}

export const RoundHooksContext = createContext<RoundHooks>({});
