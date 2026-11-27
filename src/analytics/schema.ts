/**
 * Anonymous play statistics (D-033): the ONE list of what BrainZippy may count. Shared by the app (src/analytics/track.ts)
 * and the Worker (worker/routes/stats.ts), which rejects anything not described here.
 *
 * Privacy rules (non-negotiable, checked by tests/unit/analytics.test.ts):
 * - Counts only. Every event is a counter (+ an optional numeric total, e.g. seconds) keyed by
 *   (UTC day, event, game, k1, k2). There is no device id, session id, cookie, IP address, user agent, name, age
 *   or timestamp finer than a day — nothing that links two counts to the same child.
 * - Every dimension is from a closed list or a strict pattern of our own ids (game, exercise, skill, option ids).
 *   No free text from the child ever (typed names never leave the device).
 * - Off unless the deployment sets ANALYTICS_ENABLED="true" (/api/config `analytics`).
 */

export type Dim = "" | string;

/** A dimension rule: a closed set of values, or a pattern for our own ids. */
type Rule = { values: readonly string[] } | { pattern: RegExp };

/** Our own ids: exercise ids ("sb-3p4"), skill ids ("math.add.within-20"), option ids, game ids. Lower-case only. */
const ID = /^[a-z0-9][a-z0-9._:+-]{0,95}$/;
/** A level: "L0".."L20". */
const LEVEL = /^L(?:[0-9]|1[0-9]|20)$/;
const any = (values: readonly string[]): Rule => ({ values: ["", ...values] });

export const DEVICES = ["phone", "tablet", "desktop"] as const;
export const AGE_BANDS = ["ages-3-5", "ages-6-8", "ages-9-11", "ages-12-14", "unknown"] as const;
export const ONB_STEPS = ["intro", "pop", "build", "name", "kid", "age", "grownup", "done"] as const;
export const SCREENS = ["map", "explore", "grown-ups", "hello", "parents", "plan", "play", "end-of-day", "privacy-link", "path", "path-picker"] as const;
export const OUTCOMES = ["first-try", "second-try", "later", "after-model"] as const;
export const SECONDS_BUCKETS = ["0-5", "5-10", "10-20", "20-40", "40-90", "90+"] as const;
export const ROUND_SOURCES = ["daily", "explore", "map", "resume", "again"] as const;
/** "helper" = a helper character explained; the rest are the engine's HintAction kinds (src/engine/types.ts). */
export const HINTS = ["helper", "eliminate-choice", "highlight-last-count", "count-along", "show-slots", "mark-parts", "direction", "model-answer"] as const;
export const SETTINGS = ["sound", "music", "reduced-motion", "installed", "online"] as const;
export const ON_OFF = ["on", "off"] as const;
export const DAILY = ["limit-reached", "limit-changed"] as const;
export const ERROR_AREAS = ["app", "game"] as const;
export const LOAD_BUCKETS = ["0-1s", "1-2s", "2-4s", "4-8s", "8s+"] as const;
export const QUIT_BUCKETS = ["0", "1-2", "3-5", "6+"] as const;
export const STARS = ["s0", "s1", "s2", "s3"] as const;

/**
 * Every exercise id starts with its game's prefix and a dash ("sb-3p4" belongs to sky-balloon-race). The Worker rejects
 * an exercise id that doesn't belong to the game it is counted under, so made-up ids can't fill the table.
 * tests/unit/analytics.test.ts builds rounds for every game and fails if a game is missing here or uses another prefix.
 */
export const EXERCISE_PREFIX: Record<string, string> = {
  "counting-adventure": "ca", "glow-cave-hops": "gc", "sky-balloon-race": "sb", "cookie-kitchen": "ck", "rhyme-lanterns": "rl",
  "garden-path": "gp", "message-mystery": "mm", "budget-bridge": "bb", "postcard-trip": "pc", "lemonade-stand": "ls",
  "reef-rescue": "rr", "sky-hoops": "sh", "rocket-lab": "rl", "feelings-garden": "fg", "balance-island": "bi",
  "pattern-parade": "pp", "shape-squish": "ss", "sleepy-trail": "st", "paper-boat-post": "pb", "wordroot-grove": "wg", "lantern-press": "lp",
  "compass-runways": "cr",
  "busy-airport": "ba",
  "flight-plan": "fp",
  bakery: "bk",
  "bubble-bath": "gb",
  "lighthouse-night": "ln",
};

/**
 * Every event, with the rule for `game` (true = a world id from the content registry, false = must be ""), k1 and k2,
 * and whether it may carry a numeric total. The dashboard (src/analytics/Insights.tsx) explains each.
 */
export const EVENTS = {
  /** One per app start. k1 device class (from screen size and pointer type). */
  session: { game: false, k1: any(DEVICES), k2: any([]), total: false },
  /** One per app start, counted separately from the device so the two can't be combined: the age band picked. */
  age_band: { game: false, k1: any(AGE_BANDS), k2: any([]), total: false },
  /** One per app start per setting: sound/music on or off, reduced motion, installed as an app, online. */
  setting: { game: false, k1: any(SETTINGS), k2: any(ON_OFF), total: false },
  /** First-load speed bucket (navigation start → app ready). total = milliseconds. */
  load: { game: false, k1: any(LOAD_BUCKETS), k2: any([]), total: true },
  /** A screen was opened. */
  screen: { game: true, k1: any(SCREENS), k2: any([]), total: false },
  /** Onboarding step reached (the funnel). k2 "skip" when the step was skipped. */
  onb_step: { game: false, k1: any(ONB_STEPS), k2: any(["skip"]), total: false },
  /** Daily learning: today's limit reached, or the limit changed by a grown-up (k2 = new limit, "3".."10"). */
  daily: { game: true, k1: any(DAILY), k2: { pattern: /^(?:|[0-9]|10)$/ }, total: false },
  /** A round started. k1 level, k2 where it was started from. */
  round_start: { game: true, k1: { pattern: LEVEL }, k2: any(ROUND_SOURCES), total: false },
  /** A round finished. k1 level, k2 stars. total = seconds the round took. */
  round_done: { game: true, k1: { pattern: LEVEL }, k2: any(STARS), total: true },
  /** A round was left before the end. k1 level, k2 how many exercises were solved first. */
  round_quit: { game: true, k1: { pattern: LEVEL }, k2: any(QUIT_BUCKETS), total: false },
  /** Levelled up. k1 the new level. */
  level_up: { game: true, k1: { pattern: LEVEL }, k2: any([]), total: false },
  /** An exercise was solved. k1 exercise id, k2 outcome. total = seconds from first showing to solved. */
  ex_done: { game: true, k1: { pattern: ID }, k2: any(OUTCOMES), total: true },
  /** Same, per skill and difficulty: k1 "skill.id@d3", k2 outcome. */
  skill_done: { game: true, k1: { pattern: /^[a-z0-9][a-z0-9._-]{0,80}@d(?:[0-9]|1[0-9]|20)$/ }, k2: any(OUTCOMES), total: true },
  /** A wrong answer. k1 exercise id, k2 the answer given: a number of at most 4 digits, one of our option ids, or "other". */
  wrong: { game: true, k1: { pattern: ID }, k2: { pattern: /^(?:-?[0-9]{1,4}(?:\.[0-9]{1,2})?|[a-z][a-z0-9._:+,>-]{0,95})$/ }, total: false },
  /** A hint was shown. k1 exercise id, k2 hint kind. */
  hint: { game: true, k1: { pattern: ID }, k2: any(HINTS), total: false },
  /** How long the child took before the first answer, bucketed, per game. k1 bucket. */
  think: { game: true, k1: any(SECONDS_BUCKETS), k2: any([]), total: false },
  /** A crash screen was shown. k1 area, k2 the error's type name (e.g. "TypeError"), never its message. */
  error: { game: true, k1: any(ERROR_AREAS), k2: { pattern: /^(?:|[A-Za-z]{1,40})$/ }, total: false },
} as const satisfies Record<string, { game: boolean; k1: Rule; k2: Rule; total: boolean }>;

export type EventName = keyof typeof EVENTS;

/** One aggregated counter as sent by the app: [event, game, k1, k2, count, total]. */
export type StatRow = [EventName, string, string, string, number, number];

export const MAX_ROWS_PER_BATCH = 60;
export const MAX_COUNT = 500;
export const MAX_TOTAL = 500_000;
export const MAX_BODY_BYTES = 24_000;

const ok = (rule: Rule, v: string) => ("values" in rule ? rule.values.includes(v) : rule.pattern.test(v));

/** Events whose k1 is an exercise id (checked against the game's prefix). */
const EXERCISE_EVENTS = new Set<string>(["ex_done", "wrong", "hint"]);

/** What the validator needs to know about real content (the content registry, passed in so this file stays pure). */
export interface ContentCheck {
  isGame: (id: string) => boolean;
  /** The skills a game practises (undefined for an unknown game). */
  skillsOf: (game: string) => readonly string[] | undefined;
}

/** Validate one row against the schema and real content. Returns the cleaned row or null. Pure. */
export function validRow(x: unknown, content: ContentCheck): StatRow | null {
  const { isGame } = content;
  if (!Array.isArray(x) || x.length !== 6) return null;
  const [event, game, k1, k2, count, total] = x as unknown[];
  if (typeof event !== "string" || !Object.hasOwn(EVENTS, event)) return null;
  const spec = EVENTS[event as EventName];
  if (typeof game !== "string" || typeof k1 !== "string" || typeof k2 !== "string") return null;
  if (spec.game ? game !== "" && !isGame(game) : game !== "") return null;
  if (!ok(spec.k1, k1) || !ok(spec.k2, k2)) return null;
  if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > MAX_COUNT) return null;
  if (!Number.isInteger(total) || (total as number) < 0 || (total as number) > MAX_TOTAL) return null;
  if (!spec.total && total !== 0) return null;
  if (EXERCISE_EVENTS.has(event) && (!game || !k1.startsWith(`${EXERCISE_PREFIX[game] ?? "\u0000"}-`))) return null;
  if (event === "skill_done" && (!game || !content.skillsOf(game)?.includes(k1.slice(0, k1.lastIndexOf("@d"))))) return null;
  return [event as EventName, game, k1, k2, count as number, total as number];
}

/** Pure helpers used when recording, so every caller buckets the same way. */
export function secondsBucket(sec: number): (typeof SECONDS_BUCKETS)[number] {
  return sec < 5 ? "0-5" : sec < 10 ? "5-10" : sec < 20 ? "10-20" : sec < 40 ? "20-40" : sec < 90 ? "40-90" : "90+";
}
export function loadBucket(ms: number): (typeof LOAD_BUCKETS)[number] {
  return ms < 1000 ? "0-1s" : ms < 2000 ? "1-2s" : ms < 4000 ? "2-4s" : ms < 8000 ? "4-8s" : "8s+";
}
export function quitBucket(solved: number): (typeof QUIT_BUCKETS)[number] {
  return solved <= 0 ? "0" : solved <= 2 ? "1-2" : solved <= 5 ? "3-5" : "6+";
}
export function outcomeFor(attempts: number, sawModel: boolean): (typeof OUTCOMES)[number] {
  return sawModel ? "after-model" : attempts <= 1 ? "first-try" : attempts === 2 ? "second-try" : "later";
}
export function deviceClass(width: number, height: number, coarse: boolean): (typeof DEVICES)[number] {
  const short = Math.min(width, height);
  // touch screens of tablet size are tablets; a mouse/trackpad screen is a computer, whatever its size
  return short < 600 ? "phone" : coarse ? "tablet" : "desktop";
}
/**
 * A wrong answer as a dimension: small numbers (at most 4 digits, 2 decimals) and our own ids only; anything else —
 * longer numbers a child might type, any text — becomes "other".
 */
export function answerDim(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    const s = String(Math.round(v * 100) / 100);
    return /^-?[0-9]{1,4}(?:\.[0-9]{1,2})?$/.test(s) ? s : "other";
  }
  // option ids start with a letter; a digit string counts only as a small number (never a long typed number)
  const asId = (s: unknown) => (typeof s === "string" && /^[a-z][a-z0-9._:+-]{0,95}$/.test(s) ? s : null);
  if (typeof v === "string") return asId(v) ?? (/^-?[0-9]{1,4}(?:\.[0-9]{1,2})?$/.test(v) ? v : "other");
  if (Array.isArray(v)) {
    const parts = v.map(asId);
    const s = parts.join(",");
    return parts.every(Boolean) && s.length <= 96 ? s : "other";
  }
  if (v && typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([a, b]) => (asId(a) && asId(b) ? `${a}>${b}` : null));
    const s = parts.join(",");
    return parts.every(Boolean) && s.length <= 96 ? s : "other";
  }
  return "other";
}
