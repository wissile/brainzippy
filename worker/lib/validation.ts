/**
 * Input validation used by every route. The data validators are shared with the client (src/account/schema.ts,
 * src/engine/progressSchema.ts) so both sides agree on exactly what is accepted.
 */
export { parseGuestProgress, MAX_PROGRESS_BYTES } from "../../src/engine/progressSchema";
export {
  UUID_RE,
  isObj,
  isInt,
  onlyKeys,
  normaliseEmail,
  cleanDisplayName,
  parseMonster,
  parseAgeBand,
  parseSettings,
  parseChildProgress,
  isWorldId,
  MAX_CHILD_PROGRESS_BYTES,
} from "../../src/account/schema";
import { UUID_RE } from "../../src/account/schema";

export const isUuid = (x: unknown): x is string => typeof x === "string" && UUID_RE.test(x);

/** Challenge tokens: 128-bit random, hex. */
export const CHALLENGE_TOKEN_RE = /^[0-9a-f]{32}$/;
