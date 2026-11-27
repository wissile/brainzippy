/**
 * Ziggy's Flight Plan — pure content logic (no React, no DOM). Unit-tested in tests/unit/flight-plan.test.ts.
 *
 * Everything here is FICTIONAL and simplified for learning (docs/worlds/flight-plan.md): the model wing, the chart,
 * the weather stations, the METARs and Ziggy's practice minimums are made up. Not flight training, not FAA-approved
 * ground training, never for navigation, and the card is not real legal weather minimums.
 *
 *  tunnel  a fictional model wing: lift grows with angle of attack until the critical angle, then drops (stall);
 *          lift also grows with airspeed (∝ v²), but the stall angle does not change with speed.
 *  leg     time = distance ÷ groundspeed (minutes = distance × 60 ÷ groundspeed); head/tailwind changes groundspeed.
 *  wx      simplified METARs (station, time, wind, visibility, cloud, temperature/dew point) built and parsed here.
 *  check   pre-flight order, the missed planning item, IMSAFE ("is the pilot ready?").
 *  brief   the go / no-go briefing that closes every round.
 */

// ------------------------------------------------------------------------------------------------ games and modes
export type Game = "tunnel" | "leg" | "wx" | "check" | "brief";
export const GAMES: readonly Game[] = ["tunnel", "leg", "wx", "check", "brief"];
export type Mode =
  | "find" | "flaps" | "lift" | "speed" | "engine" | "recover" // tunnel
  | "time" // leg
  | "decode" | "call" // wx
  | "order" | "missed" | "imsafe" // check
  | "brief";
export const MODES: readonly Mode[] = ["find", "flaps", "lift", "speed", "engine", "recover", "time", "decode", "call", "order", "missed", "imsafe", "brief"];
export const GAME_OF: Record<Mode, Game> = {
  find: "tunnel", flaps: "tunnel", lift: "tunnel", speed: "tunnel", engine: "tunnel", recover: "tunnel",
  time: "leg", decode: "wx", call: "wx", order: "check", missed: "check", imsafe: "check", brief: "brief",
};
export const GAME_TITLE: Record<Game, string> = { tunnel: "Wind tunnel", leg: "Leg timer", wx: "Weather brief", check: "Pre-flight checklist", brief: "Go / no-go briefing" };

/** Mode of an exercise (params.m is the index in MODES). */
export const modeOf = (ex: { params?: Readonly<Record<string, number>> }): Mode => MODES[ex.params?.m ?? 0] ?? "find";
export const gameOf = (ex: { params?: Readonly<Record<string, number>> }): Game => GAME_OF[modeOf(ex)];
export const p = (ex: { params?: Readonly<Record<string, number>> }, k: string, d = 0): number => ex.params?.[k] ?? d;

// ------------------------------------------------------------------------------------------------ wind tunnel
export const AOA_MIN = 0;
export const AOA_MAX = 24;
export const SPEED_MIN = 40;
export const SPEED_MAX = 120;
export const SPEED_STEP = 10;
/** Critical angles of the fictional model wings (clean). Flaps lower it by FLAP_DROP. */
export const CRITS = [14, 15, 16, 17, 18] as const;
export const FLAP_DROP = 2;
export const WING_NAMES = ["Blue wing", "Orange wing", "Teal wing", "Gold wing", "Coral wing"] as const;
const SLOPE = 0.1; // lift coefficient per degree (fictional, typical order of magnitude)

export interface Wing { crit: number; flaps: boolean }
/** Zero-lift angle: flaps shift the whole curve up (more lift at the same angle). */
const zeroLift = (w: Wing) => (w.flaps ? -5 : -2);

/** Lift coefficient of the fictional wing at angle `aoa` (degrees). Peak at the critical angle, then a sharp drop. */
export function liftCoef(aoa: number, w: Wing): number {
  const a0 = zeroLift(w);
  const lin = (a: number) => Math.max(0, SLOPE * (a - a0));
  if (aoa <= w.crit) return lin(aoa);
  const peak = lin(w.crit);
  const past = aoa - w.crit;
  return peak * (1 - 0.5 * (1 - Math.exp(-past / 1.4)));
}

/** Lift in percent of the tunnel's meter (lift ∝ coefficient × v²). */
export function liftPct(aoa: number, speed: number, w: Wing): number {
  const full = SLOPE * (18 + 5); // the highest flaps-down peak at 120 kt = 100 %
  return Math.max(0, Math.min(100, (100 * liftCoef(aoa, w) * (speed / SPEED_MAX) ** 2) / full));
}

export const isStalled = (aoa: number, w: Wing) => aoa > w.crit;
/** The angle (whole degrees) with the most lift: the critical angle. Independent of speed. */
export function peakAngle(w: Wing, speed = SPEED_MAX): number {
  let best = AOA_MIN;
  for (let a = AOA_MIN; a <= AOA_MAX; a++) if (liftPct(a, speed, w) > liftPct(best, speed, w)) best = a;
  return best;
}
/** Stall answers: the critical angle ±1° (the peak, or the first angle where lift has dropped). */
export const STALL_TOLERANCE = 1;

// ------------------------------------------------------------------------------------------------ leg timer (TSD)
/** Original, fictional places on Ziggy's chart (not real places; the chart is not to scale and not for navigation). */
export const PLACES = ["Pebble Field", "Lighthouse Point", "Twin Lakes", "Gullrock", "Old Mill", "Festival Isle"] as const;
/** Route legs on the chart, in flight order: [from, to]. */
export const LEGS: readonly (readonly [number, number])[] = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 2], [2, 4], [1, 3]];

/** Exact minutes for a leg: distance (nm) × 60 ÷ groundspeed (kt). */
export const exactMinutes = (d: number, gs: number) => (d * 60) / gs;
export const groundspeed = (tas: number, wind: number) => tas + wind; // wind < 0 = headwind, > 0 = tailwind
/** Nearest whole minute (halves never occur: the generator keeps fractions away from .5). */
export const roundMinutes = (m: number) => Math.round(m);

export interface LegSpec { from: number; to: number; d: number; tas: number; wind: number; round: boolean; d2: number; via: number }
export function legAnswer(s: Pick<LegSpec, "d" | "tas" | "wind" | "d2">): number {
  const gs = groundspeed(s.tas, s.wind);
  return roundMinutes(exactMinutes(s.d, gs)) + (s.d2 > 0 ? roundMinutes(exactMinutes(s.d2, gs)) : 0);
}
/** Likely wrong answers and the misconception each shows (used to diagnose a first miss). */
export function legMistakes(s: Pick<LegSpec, "d" | "tas" | "wind" | "d2">): { value: number; why: "add" | "flip" | "noWind" | "windWay" | "hours" }[] {
  const gs = groundspeed(s.tas, s.wind);
  const out: { value: number; why: "add" | "flip" | "noWind" | "windWay" | "hours" }[] = [];
  const d = s.d + s.d2;
  out.push({ value: d + gs, why: "add" });
  out.push({ value: Math.round((gs * 60) / d), why: "flip" });
  if (s.wind !== 0) {
    out.push({ value: legAnswer({ ...s, wind: 0 }), why: "noWind" });
    out.push({ value: legAnswer({ ...s, wind: -s.wind }), why: "windWay" });
  }
  out.push({ value: Math.round(d / gs), why: "hours" });
  return out;
}

// ------------------------------------------------------------------------------------------------ weather (METAR)
/** Fictional stations. "X" is not an ICAO region letter, so XPBF/XFES/XGRK are not real airports (verify before release). */
export const STATIONS = [
  { id: "XPBF", name: "Pebble Field" },
  { id: "XFES", name: "Festival Isle" },
  { id: "XGRK", name: "Gullrock" },
] as const;
export const COVERS = ["", "FEW", "SCT", "BKN", "OVC", "SKC"] as const;
export type Cover = Exclude<(typeof COVERS)[number], "">;
export const COVER_WORD: Record<Cover, string> = { FEW: "few", SCT: "scattered", BKN: "broken", OVC: "overcast", SKC: "sky clear" };
export const COVER_TEXT: Record<Cover, string> = { FEW: "A few clouds", SCT: "Scattered clouds", BKN: "Broken clouds", OVC: "Overcast", SKC: "Sky clear" };
/** Value sets the voice lines cover (voice.json `vary`); generators stay inside them. */
export const WDIRS = [90, 120, 150, 180, 210, 240, 270, 300, 330, 360] as const;
export const WSPDS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
export const GUSTS = [18, 20, 22, 25, 28, 30] as const;
export const VISES = [2, 3, 4, 5, 6, 7, 10] as const;
export const BASES = [8, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60] as const; // hundreds of feet above the ground
export const TIMES = [1450, 1550, 1650, 1750] as const;
export const TEMPS = [9, 12, 15, 18, 22, 25] as const;
export const DEWS = [5, 7, 9, 10, 12, 14] as const;
export const METAR_DAY = 26;

export interface Layer { cover: Cover; base: number }
export interface Metar { st: number; time: number; wdir: number; wspd: number; gust: number; vis: number; layers: Layer[]; t: number; dp: number }
export type GroupKind = "time" | "wind" | "vis" | "cloud" | "cloud2" | "temp";
export const GROUP_KINDS: readonly GroupKind[] = ["time", "wind", "vis", "cloud", "cloud2", "temp"];

const pad = (n: number, w: number) => String(n).padStart(w, "0");
export const windGroup = (m: Pick<Metar, "wdir" | "wspd" | "gust">) => `${pad(m.wdir, 3)}${pad(m.wspd, 2)}${m.gust ? `G${pad(m.gust, 2)}` : ""}KT`;
export const layerGroup = (l: Layer) => (l.cover === "SKC" ? "SKC" : `${l.cover}${pad(l.base, 3)}`);
/** The METAR's groups in order (station and type first). */
export function metarGroups(m: Metar): { kind: GroupKind | "type" | "station"; text: string }[] {
  const g: { kind: GroupKind | "type" | "station"; text: string }[] = [
    { kind: "type", text: "METAR" },
    { kind: "station", text: STATIONS[m.st]!.id },
    { kind: "time", text: `${pad(METAR_DAY, 2)}${pad(m.time, 4)}Z` },
    { kind: "wind", text: windGroup(m) },
    { kind: "vis", text: `${m.vis}SM` },
  ];
  m.layers.forEach((l, i) => g.push({ kind: i === 0 ? "cloud" : "cloud2", text: layerGroup(l) }));
  g.push({ kind: "temp", text: `${pad(m.t, 2)}/${pad(m.dp, 2)}` });
  return g;
}
export const formatMetar = (m: Metar) => metarGroups(m).map((g) => g.text).join(" ");

/** Parse a simplified METAR (the subset this world generates). Throws on anything else. */
export function parseMetar(s: string): Metar {
  const parts = s.trim().split(/\s+/);
  if (parts[0] !== "METAR") throw new Error(`not a METAR: ${s}`);
  const st = STATIONS.findIndex((x) => x.id === parts[1]);
  if (st < 0) throw new Error(`unknown station ${parts[1]}`);
  const tm = /^(\d{2})(\d{4})Z$/.exec(parts[2] ?? "");
  const wd = /^(\d{3})(\d{2})(?:G(\d{2}))?KT$/.exec(parts[3] ?? "");
  const vs = /^(\d{1,2})SM$/.exec(parts[4] ?? "");
  if (!tm || !wd || !vs) throw new Error(`bad groups in ${s}`);
  const layers: Layer[] = [];
  let i = 5;
  for (; i < parts.length; i++) {
    const g = parts[i]!;
    if (g === "SKC") layers.push({ cover: "SKC", base: 0 });
    else {
      const c = /^(FEW|SCT|BKN|OVC)(\d{3})$/.exec(g);
      if (!c) break;
      layers.push({ cover: c[1] as Cover, base: Number(c[2]) });
    }
  }
  const td = /^(\d{2})\/(\d{2})$/.exec(parts[i] ?? "");
  if (!td || i !== parts.length - 1) throw new Error(`bad temperature group in ${s}`);
  return { st, time: Number(tm[2]), wdir: Number(wd[1]), wspd: Number(wd[2]), gust: wd[3] ? Number(wd[3]) : 0, vis: Number(vs[1]), layers, t: Number(td[1]), dp: Number(td[2]) };
}

/** Ceiling = the lowest broken or overcast layer (hundreds of feet), or null if there is none. */
export function ceilingOf(layers: readonly Layer[]): number | null {
  const c = layers.filter((l) => l.cover === "BKN" || l.cover === "OVC").map((l) => l.base);
  return c.length ? Math.min(...c) : null;
}

/** Plain-language meaning of each group (the correct tile) and its misconception tile (the distractor). */
export const fmtFeet = (hundreds: number) => (hundreds * 100).toLocaleString("en-US");
export function groupMeaning(kind: GroupKind, m: Metar): { right: string; wrong: string; why: "zulu" | "windTo" | "km" | "hundreds" | "tempDew" } {
  switch (kind) {
    case "time": {
      const hh = pad(Math.floor(m.time / 100), 2), mm = pad(m.time % 100, 2);
      return { right: `Day ${METAR_DAY}, ${hh}:${mm} UTC (Zulu time)`, wrong: `${hh}:${mm} local time`, why: "zulu" };
    }
    case "wind":
      return {
        right: `Wind from ${pad(m.wdir, 3)}° at ${m.wspd} knots${m.gust ? `, gusts to ${m.gust}` : ""}`,
        wrong: `Wind blowing toward ${pad(m.wdir, 3)}° at ${m.wspd} knots${m.gust ? `, gusts to ${m.gust}` : ""}`,
        why: "windTo",
      };
    case "vis":
      return { right: `Visibility ${m.vis} statute miles${m.vis >= 10 ? " or more" : ""}`, wrong: `Visibility ${m.vis} kilometres`, why: "km" };
    case "cloud":
    case "cloud2": {
      const l = m.layers[kind === "cloud" ? 0 : 1]!;
      if (l.cover === "SKC") return { right: "Sky clear: no clouds", wrong: "Sky covered by cloud", why: "hundreds" };
      return { right: `${COVER_TEXT[l.cover]} at ${fmtFeet(l.base)} ft above the ground`, wrong: `${COVER_TEXT[l.cover]} at ${l.base} ft above the ground`, why: "hundreds" };
    }
    case "temp":
      return { right: `Temperature ${m.t} °C, dew point ${m.dp} °C`, wrong: `High of ${m.t} °C, low of ${m.dp} °C`, why: "tempDew" };
  }
}

/** Ziggy's PRACTICE minimums card (fictional; not real legal minimums). */
export const CARD = { ceiling: 30, vis: 5, wind: 15, gust: 20 } as const;
export type WxFail = "ceiling" | "vis" | "wind" | "gust";
/** Which lines of the card this METAR breaks (the generator makes at most one). */
export function cardFails(m: Metar, useGust: boolean): WxFail[] {
  const out: WxFail[] = [];
  const c = ceilingOf(m.layers);
  if (c !== null && c < CARD.ceiling) out.push("ceiling");
  if (m.vis < CARD.vis) out.push("vis");
  if (m.wspd > CARD.wind) out.push("wind");
  if (useGust && m.gust > CARD.gust) out.push("gust");
  return out;
}

// ------------------------------------------------------------------------------------------------ checklists
/**
 * Planning-to-take-off steps, in their one sensible order (each step needs the one before it). The route step says it
 * uses the forecast winds, so the weather briefing has to come first (learning review: "weather" and "route" alone
 * could sensibly be done either way round).
 */
export const STEPS = [
  "Get the weather briefing",
  "Plan the route and leg times with the forecast winds",
  "Work out the fuel needed, plus a reserve",
  "Walk around and inspect the plane",
  "Brief Bobbo: seat belt, door, quiet for take-off",
  "Start the engine",
  "Do the run-up check before the runway",
  "Take off",
] as const;
/** Steps that look tempting but skip safety (the "get-there-itis" and "pilots don't need checklists" misconceptions). */
export const SKIP_STEPS = [
  "Skip the walk-around: the plane flew yesterday",
  "Check the weather later, once we're in the air",
  "Skip the run-up: we're running late",
] as const;

/** Planning card (simplified from the FAA's preflight action rule, 14 CFR 91.103; not the rule's wording). */
export const PLAN_ITEMS = ["weather", "fuel", "runways", "distances", "planB"] as const;
export type PlanItem = (typeof PLAN_ITEMS)[number];
export const PLAN_TITLE: Record<PlanItem, string> = {
  weather: "Weather reports and forecasts",
  fuel: "Fuel needed, plus a reserve",
  runways: "Runway lengths at both airfields",
  distances: "Take-off and landing distances",
  planB: "A plan B if we can't land there",
};
/** Ziggy's notes for each item (variants), and the tempting "skipped" note for weather. */
export const PLAN_NOTES: Record<PlanItem, readonly string[]> = {
  weather: ["Pebble Field and Festival Isle reports read, forecast checked", "Weather: both airfields read, forecast is steady"],
  fuel: ["Fuel: 3 hours on board; trip 50 min plus 30 min reserve", "Fuel: tanks full, trip and reserve worked out"],
  runways: ["Runways: Pebble Field 3,200 ft, Festival Isle 2,800 ft", "Runways: both are long enough for us"],
  distances: ["Our take-off roll is 900 ft and landing roll 700 ft today", "Take-off and landing rolls worked out from the book"],
  planB: ["If Festival Isle is busy, we land at Gullrock", "Plan B: turn back to Pebble Field or land at Gullrock"],
};
export const WEATHER_SKIPPED_NOTE = "Weather: skipped, it's only a short hop";

/** IMSAFE (FAA Pilot's Handbook of Aeronautical Knowledge): Illness, Medication, Stress, Alcohol, Fatigue, Emotion. */
export const IMSAFE = [
  { letter: "I", word: "Illness" },
  { letter: "M", word: "Medication" },
  { letter: "S", word: "Stress" },
  { letter: "A", word: "Alcohol" },
  { letter: "F", word: "Fatigue" },
  { letter: "E", word: "Emotion" },
] as const;
export type ImsafeWhy = "ready" | "Illness" | "Medication" | "Stress" | "Fatigue" | "Emotion";
/** Scenarios (no alcohol scenarios for this age group; the letter is on the card). */
export const PILOT_SCENES: readonly { text: string; why: ImsafeWhy }[] = [
  { text: "Ziggy slept eight hours, feels well, had breakfast and feels calm.", why: "ready" },
  { text: "Ziggy has a heavy cold, and his ears feel blocked.", why: "Illness" },
  { text: "Ziggy took a cold tablet. The box says it may cause drowsiness.", why: "Medication" },
  { text: "Ziggy's hangar roof leaked last night, and he can't stop worrying about it.", why: "Stress" },
  { text: "A thunderstorm kept Ziggy awake. He slept about three hours.", why: "Fatigue" },
  { text: "Ziggy just had an upsetting phone call and feels shaky and upset.", why: "Emotion" },
  { text: "Ziggy had a good night's sleep and a big breakfast, and he's looking forward to the trip.", why: "ready" },
];
export const IMSAFE_OPTION: Record<ImsafeWhy, string> = {
  ready: "Ready to fly",
  Illness: "Not today: Illness",
  Medication: "Not today: Medication",
  Stress: "Not today: Stress",
  Fatigue: "Not today: Fatigue",
  Emotion: "Not today: Emotion",
};
export const IMSAFE_PUSH = "Ready: Ziggy is experienced, so he can push through";

// ------------------------------------------------------------------------------------------------ the go / no-go briefing
export type Call = "go" | "wait" | "fuel" | "rest" | "fix";
export const CALL_TEXT: Record<Call | "pressure", string> = {
  go: "GO: everything checks out",
  wait: "WAIT an hour: weather is below the card",
  fuel: "NOT YET: add fuel first",
  rest: "NO-GO: the pilot isn't fit to fly today",
  fix: "NOT YET: get the plane fixed first",
  pressure: "GO anyway: Bobbo can't be late",
};
/** The reserve rule on Ziggy's card (in the spirit of 14 CFR 91.151's 30-minute day VFR reserve; simplified). */
export const RESERVE_MIN = 30;
export const PLANE_NOTES = { ok: ["Walk-around: all good", "Walk-around: oil, tyres and flaps all fine"], bad: ["Walk-around: the left tyre looks flat", "Walk-around: oil level below the minimum mark"] } as const;
/** Where the story goes after the call (outro): fly now, wait an hour, or sort it out and fly later. */
export type Outcome = "go" | "wait" | "fix";
export const OUTCOME_OF: Record<Call, Outcome> = { go: "go", wait: "wait", fuel: "fix", rest: "fix", fix: "fix" };
export const fmtHM = (min: number) => (min % 60 === 0 ? `${min / 60} h` : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`);

// ------------------------------------------------------------------------------------------------ METAR read aloud
/** Words for each spoken value (must equal voice.json `vary` lists; unit-tested). Pilots read headings digit by digit. */
const DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const NUM: Record<number, string> = { 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 12: "twelve", 14: "fourteen", 15: "fifteen", 16: "sixteen", 18: "eighteen", 20: "twenty", 22: "twenty-two", 25: "twenty-five", 28: "twenty-eight", 30: "thirty", 2: "two", 3: "three" };
export const digits = (n: number, w: number) => String(n).padStart(w, "0").split("").map((d) => DIGIT[Number(d)]).join(" ");
export const numWord = (n: number) => NUM[n] ?? String(n);
export function feetWords(hundreds: number): string {
  const th = Math.floor(hundreds / 10), h = hundreds % 10;
  const t = th ? `${["", "one", "two", "three", "four", "five", "six"][th]} thousand` : "";
  const hs = h ? `${DIGIT[h]} hundred` : "";
  return [t, hs].filter(Boolean).join(" ");
}
/** Voice lines (with vars) that read a METAR aloud, group by group. */
export function metarSpeech(m: Metar, kinds: readonly (GroupKind | "station")[] = ["station", "time", "wind", "vis", "cloud", "cloud2", "temp"]): [string, Record<string, string>][] {
  const out: [string, Record<string, string>][] = [];
  for (const k of kinds) {
    if (k === "station") out.push(["fp.wx.station", { st: STATIONS[m.st]!.name }]);
    if (k === "time") out.push(["fp.wx.time", { time: digits(m.time, 4) }]);
    if (k === "wind") {
      out.push(["fp.wx.wind", { dir: digits(m.wdir, 3), spd: numWord(m.wspd) }]);
      if (m.gust) out.push(["fp.wx.gust", { gst: numWord(m.gust) }]);
    }
    if (k === "vis") out.push(m.vis >= 10 ? ["fp.wx.vis10", {}] : ["fp.wx.vis", { vis: numWord(m.vis) }]);
    if (k === "cloud" || k === "cloud2") {
      const l = m.layers[k === "cloud" ? 0 : 1];
      if (l) out.push(l.cover === "SKC" ? ["fp.wx.skc", {}] : ["fp.wx.cloud", { cover: COVER_WORD[l.cover], base: feetWords(l.base) }]);
    }
    if (k === "temp") out.push(["fp.wx.temp", { t: numWord(m.t), dp: numWord(m.dp) }]);
  }
  return out;
}
