import type { Outcome } from "./logic";

/**
 * How the round's go / no-go briefing came out, so the outro can tell the right ending (fly now, wait an hour, or
 * sort it out and fly later). Written by the board when the briefing is solved; read once by the outro.
 */
let outcome: Outcome = "go";
export const outcomeStore = {
  get: (): Outcome => outcome,
  set: (o: Outcome) => {
    outcome = o;
  },
};
