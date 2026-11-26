import type { AnswerOption, Exercise, ExerciseGenerator, GeneratorBand } from "../../engine/types";
import { createRng, hashSeed, type Rng } from "../../engine/rng";
import {
  type Dir, type Kind, POINTS, POINT_HEADING, POINT_NAME, type Point, type Scenario, STRENGTH_ID, STRENGTH_TEXT, type Strength,
  WIND_TEXT, type WindKind, airportEnds, angleDiff, answerFor, bestEnd, bestMargin, blank, degId, encode, fmtHeading, fmtRunway,
  hdgId, norm, pointOf, reciprocal, runwayHeading, runwayNumber, rwId, sayHeading, sayRunway, sockPoints, turnHeading, windKind, wraps,
} from "./logic";

/**
 * Compass Rose Runways — seeded generator (pure: same level + rng + index (+ band) → same exercise).
 * Spec: docs/curriculum/pilot.md §3 world 5 (and world 3 for the windsock); pedagogy + level table:
 * docs/worlds/compass-runways.md. Five inner games share one airport-from-above scene with a giant compass rose:
 *
 *   Windsock Reader  (sock)  strength · from 4 / 8 points · from degrees            choice
 *   Runway Painter   (paint) cardinal · tens · rounding · opposite end · rotate      number (runway 1–36, or a heading)
 *   Heading Turns    (turn)  90° turns · any turn · turns past 360                   number (heading 1–360)
 *   Into the Wind    (wind)  2 ends · 4 ends · headwind / crosswind / tailwind       choice
 *   Tower Talk       (tower) wind → runway · runway → heading · turn → runway · wind on a runway   choice
 *
 * Bands of 8 play in index order; each level has a fixed slot pattern that mixes the inner games unlocked so far
 * (new game first, earlier games as review). The band seed deals values from shuffled decks, so a band never
 * repeats a value it could avoid. Time is never a parameter.
 */
export const CR_AGES = [10, 12] as const;
export const SKILL = { wind: "pilot.wx.wind", headings: "pilot.nav.headings" } as const;

export interface LevelSpec {
  label: string;
  /** Inner games that appear at this level (first = the one this level introduces or focuses on). */
  games: readonly string[];
  /** Slot pattern, index % 8. */
  slots: readonly Kind[];
}
export const LEVELS: readonly LevelSpec[] = [
  { label: "Windsock: calm or windy, and wind from N/E/S/W · paint N/E/S/W runways (09, 18, 27, 36)", games: ["sock", "paint"], slots: ["strength", "card", "from4", "card", "from4", "strength", "card", "from4"] },
  { label: "Runway number = heading ÷ 10 (tens) · rotate a runway to its number · wind from 8 points", games: ["paint", "sock"], slots: ["ten", "from8", "ten", "card", "from8", "ten", "rotate", "from8"] },
  { label: "Round to the nearest ten · the other end differs by 18 · wind in degrees", games: ["paint", "sock"], slots: ["round", "opp", "rotate", "fromDeg", "round", "opp", "round", "opp"] },
  { label: "Heading Turns: 90° turns from N/E/S/W (360, not 000)", games: ["turn", "paint", "sock"], slots: ["quarter", "opp", "quarter", "fromDeg", "quarter", "round", "quarter", "quarter"] },
  { label: "Heading Turns: any turn, and turns past 360 (right and left)", games: ["turn", "paint"], slots: ["wrap", "turn", "wrap", "opp", "wrap", "turn", "rotate", "wrap"] },
  { label: "Into the Wind: one runway, choose the end that faces the wind", games: ["wind", "sock", "turn", "paint"], slots: ["two", "fromDeg", "two", "wrap", "two", "round", "two", "two"] },
  { label: "Into the Wind: two runways (4 ends) · headwind, crosswind or tailwind", games: ["wind", "turn"], slots: ["four", "xwind", "four", "xwind", "turn", "four", "xwind", "four"] },
  { label: "Tower Talk: radio calls that combine wind, runway numbers and turns", games: ["tower", "wind"], slots: ["twind", "tline", "tjoin", "xwind", "twind", "tcomp", "tline", "tjoin"] },
  { label: "Busy tower: every inner game mixed, hardest settings", games: ["tower", "wind", "turn", "paint", "sock"], slots: ["tjoin", "twind", "wrap", "round", "tcomp", "four", "tline", "fromDeg"] },
];
export const CR_MAX_LEVEL = LEVELS.length - 1;

/** Turn sizes per kind (voice `vary` for {deg} = TURN_DEGS). */
export const TURN_DEGS = [30, 45, 60, 90, 120, 135, 150, 180] as const;
const TURN_PLAIN = [30, 60, 90, 120, 150, 180] as const;
const WRAP_DEGS = [30, 45, 60, 90, 120, 135, 150] as const;
/** Fixed turn directions per slot so every band has right and left turns. */
const DIRS: readonly Dir[] = [1, -1, -1, 1, 1, -1, 1, -1];
/** Tower calls always say "at one zero" (10 knots), so the voice stays one clip per wind. */
export const TOWER_KNOTS = 10;

const skillOf = (k: Kind): string => (["strength", "from4", "from8", "fromDeg", "two", "four", "xwind", "twind", "tcomp"].includes(k) ? SKILL.wind : SKILL.headings);

/** A deterministic per-band deck: the band's shuffled copy of `items`, read at position `pos` (wraps). */
function deal<T>(band: GeneratorBand | undefined, key: string, items: readonly T[], pos: number): T {
  const r = createRng(hashSeed(band?.seed ?? 0, "cr", key));
  const deck = r.shuffle([...items]);
  return deck[((pos % deck.length) + deck.length) % deck.length]!;
}
/** How many earlier slots of this level's pattern have the same kind (so decks advance per kind). */
const nth = (slots: readonly Kind[], i: number, k: Kind) => slots.slice(0, i).filter((x) => x === k).length;

// ---------------------------------------------------------------- scenario picking

const ALL_HEADINGS = Array.from({ length: 359 }, (_, i) => i + 1);
/** Rounding headings: not a multiple of 10 and never ending in exactly 5 (ambiguous); includes 001–004 and 356–359 (→ 36). */
export const ROUND_HEADINGS = ALL_HEADINGS.filter((h) => h % 10 !== 0 && h % 10 !== 5);
const TEN_NON_CARD = Array.from({ length: 36 }, (_, i) => (i + 1) * 10).filter((h) => h % 90 !== 0);

export function pickScenario(kind: Kind, lv: number, rng: Rng, band: GeneratorBand | undefined, k: number): Scenario {
  const s = blank(kind, lv);
  const dealK = <T,>(items: readonly T[], key = kind) => deal(band, `${key}-${lv}`, items, k);
  switch (kind) {
    case "strength": {
      s.s = dealK<Strength>([0, 1, 2, 2, 1, 0]);
      s.w = POINT_HEADING[rng.pick(POINTS)];
      return s;
    }
    case "from4":
      s.w = dealK([360, 90, 180, 270]);
      s.s = rng.chance(0.5) ? 2 : 1;
      return s;
    case "from8":
      // diagonals first so a band of three always has at least two of them
      s.w = dealK([45, 135, 225, 315, 360, 90, 180, 270].slice(0, k < 2 ? 4 : 8));
      s.s = rng.chance(0.5) ? 2 : 1;
      return s;
    case "fromDeg":
      s.w = dealK([30, 60, 120, 150, 210, 240, 300, 330, 360, 90, 180, 270]);
      s.s = 2;
      return s;
    case "card":
      s.h = dealK([90, 180, 270, 360]);
      return s;
    case "ten":
      s.h = dealK(TEN_NON_CARD);
      return s;
    case "round": {
      // a quarter of rounding items sit next to north, where 356–004 all become 36 (the 360 → 36 edge)
      const nearNorth = [1, 2, 3, 4, 356, 357, 358, 359, 6, 354];
      s.h = k % 4 === 3 ? rng.pick(nearNorth) : dealK(ROUND_HEADINGS);
      return s;
    }
    case "opp": {
      // both directions (+18 and −18) and the 18 ↔ 36 edge appear across a band
      const n = k === 0 ? rng.int(1, 17) : k === 1 ? rng.int(19, 35) : k === 2 ? rng.pick([18, 36]) : rng.int(1, 36);
      s.h = runwayHeading(n);
      return s;
    }
    case "rotate": {
      s.n = dealK(Array.from({ length: 36 }, (_, i) => i + 1));
      const off = rng.pick([40, 60, 70, 90, 110, 130]) * (rng.chance(0.5) ? 1 : -1);
      s.h = norm(runwayHeading(s.n) + off); // where the dial starts (never on or opposite the answer)
      return s;
    }
    case "quarter": {
      s.h = dealK([90, 180, 270, 360]);
      s.d = 90;
      s.dir = DIRS[k % DIRS.length]!;
      return s;
    }
    case "turn": {
      s.dir = rng.chance(0.5) ? 1 : -1;
      for (let t = 0; t < 50; t++) {
        s.d = rng.pick(TURN_PLAIN);
        s.h = rng.int(1, 35) * 10;
        if (!wraps(s.h, s.dir, s.d) && turnHeading(s.h, s.dir, s.d) !== 360) return s;
      }
      s.h = s.dir === 1 ? 100 : 300;
      s.d = 90;
      return s;
    }
    case "wrap": {
      s.dir = DIRS[(k + lv) % DIRS.length]!;
      for (let t = 0; t < 50; t++) {
        s.d = rng.pick(WRAP_DEGS);
        // right: start between 220 and 350; left: start between 10 and 140
        s.h = s.dir === 1 ? rng.int(22, 35) * 10 : rng.int(1, 14) * 10;
        if (wraps(s.h, s.dir, s.d) && turnHeading(s.h, s.dir, s.d) !== 360) return s;
      }
      s.h = s.dir === 1 ? 300 : 30;
      s.d = 120;
      return s;
    }
    case "two": {
      s.a = dealK(Array.from({ length: 18 }, (_, i) => i + 1));
      const end = rng.chance(0.5) ? s.a : reciprocal(s.a);
      s.w = norm(runwayHeading(end) + rng.pick([-30, -20, -10, 0, 10, 20, 30]));
      s.s = rng.chance(0.6) ? 2 : 1;
      return s;
    }
    case "four":
    case "twind": {
      for (let t = 0; t < 80; t++) {
        s.a = rng.int(1, 18);
        const gap = rng.int(5, 13); // runways 50°–130° apart
        s.b = ((s.a - 1 + gap) % 18) + 1;
        const ends = airportEnds(s);
        const target = rng.pick(ends);
        s.w = norm(runwayHeading(target) + rng.pick([-20, -10, 0, 10, 20]));
        if (bestEnd(ends, s.w) === target && bestMargin(ends, s.w) >= 30) break;
      }
      if (bestMargin(airportEnds(s), s.w) < 30) s.w = runwayHeading(s.a); // safe fallback: straight down runway a
      s.s = 2;
      return s;
    }
    case "xwind":
    case "tcomp": {
      const kinds: WindKind[] = ["cross", "head", "tail", "cross", "head", "cross"];
      const want = kind === "tcomp" ? (k % 2 === 0 ? "cross" : "head") : kinds[(k + lv) % kinds.length]!;
      const offsets: Record<WindKind, number[]> = { head: [0, 10, -10, 20, -20], cross: [80, 90, 100, -80, -90, -100], tail: [180, 170, -170, 160, -160] };
      const n = rng.int(1, 36);
      s.h = runwayHeading(n);
      s.a = n;
      s.w = norm(s.h + rng.pick(offsets[want]));
      s.s = 2;
      return s;
    }
    case "tline":
      s.n = dealK(Array.from({ length: 36 }, (_, i) => i + 1));
      return s;
    case "tjoin": {
      s.dir = DIRS[(k + 3) % DIRS.length]!;
      s.d = rng.pick([90, 90, 180, 60, 120]);
      s.h = rng.int(1, 36) * 10;
      const ahead = runwayNumber(turnHeading(s.h, s.dir, s.d));
      const wrongWay = runwayNumber(turnHeading(s.h, (-s.dir) as Dir, s.d));
      s.a = ahead > 18 ? reciprocal(ahead) : ahead;
      // the second runway is the one a wrong-way turn would line up with, when that's a different runway
      const other = wrongWay > 18 ? reciprocal(wrongWay) : wrongWay;
      s.b = other !== s.a ? other : ((s.a - 1 + 9) % 18) + 1;
      return s;
    }
  }
}

// ---------------------------------------------------------------- exercise building

const pointOpt = (p: Point): AnswerOption => ({ id: p, text: POINT_NAME[p][0]!.toUpperCase() + POINT_NAME[p].slice(1) });
const degOpt = (h: number): AnswerOption => ({ id: degId(h), text: `${fmtHeading(h)}°` });
const rwOpt = (n: number): AnswerOption => ({ id: rwId(n), text: fmtRunway(n) });
const windOpts: AnswerOption[] = (["head", "cross", "tail"] as WindKind[]).map((k) => ({ id: k, text: WIND_TEXT[k] }));
const dirWord = (d: Dir) => (d === 1 ? "right" : "left");

/**
 * Options are never shuffled: compass points run clockwise, degrees and runway numbers ascend (a stable, readable
 * layout; runway ends are also placed on the map at their thresholds).
 */
export function crExercise(s: Scenario, opts: { id: string; seed: number }): Omit<Exercise, "difficulty"> {
  const ans = answerFor(s);
  const base = {
    id: opts.id,
    skillId: skillOf(s.kind),
    ages: CR_AGES,
    interaction: "choose" as const,
    seed: opts.seed,
    params: encode(s),
    ...(s.tut ? { tutorial: true } : {}),
  };
  const choice = (correct: string, options: AnswerOption[]) => ({ kind: "choice" as const, correct, options });
  const byDeg = (hs: number[]) => [...hs].sort((x, y) => norm(x) - norm(y));
  const number = (value: number) => ({ kind: "number" as const, value });
  const sockSays = `The windsock streams toward ${fmtHeading(sockPoints(s.w))}°${pointOf(sockPoints(s.w)) ? ` (${POINT_NAME[pointOf(sockPoints(s.w))!]})` : ""}`;
  const ends = (s.b ? [s.a, reciprocal(s.a), s.b, reciprocal(s.b)] : [s.a, reciprocal(s.a)]).sort((x, y) => x - y);

  switch (s.kind) {
    case "strength": {
      const sock = ["hangs limp down the pole", "is half filled and droops", "is full and sticks straight out"][s.s]!;
      return {
        ...base,
        objectKind: "windsock",
        objective: "Read a windsock's strength: limp means calm, straight out means strong wind",
        answer: choice(ans as string, STRENGTH_ID.map((id) => ({ id, text: STRENGTH_TEXT[id] }))),
        prompt: { line: "cr.prompt.strength", text: "How strong is the wind? Read the windsock." },
        a11yDescription: `A close-up of the airport windsock on its pole. The sock ${sock}. Choose calm, light breeze or strong wind.`,
      };
    }
    case "from4":
    case "from8": {
      const right = ans as Point;
      const opp = pointOf(sockPoints(s.w))!;
      const pool: Point[] = s.kind === "from4"
        ? ["n", "e", "s", "w"]
        : [right, opp, pointOf(norm(s.w + 45))!, pointOf(norm(s.w - 45))!];
      return {
        ...base,
        objectKind: "windsock",
        objective: "Name the wind by where it comes FROM: the windsock points the other way",
        answer: choice(right, [...pool].sort((x, y) => (POINT_HEADING[x] % 360) - (POINT_HEADING[y] % 360)).map(pointOpt)),
        prompt: s.tut
          ? { line: "cr.prompt.tutorial", text: "The sock points west, so the wind comes from the east. Tap East!" }
          : { line: "cr.prompt.from", text: "Read the windsock. Where is the wind coming FROM?" },
        a11yDescription: `A windsock stands in the middle of a big compass rose, north at the top. ${sockSays}. Where is the wind coming from?`,
      };
    }
    case "fromDeg": {
      const opts4 = [s.w, sockPoints(s.w), norm(s.w + 30), norm(s.w - 30)];
      return {
        ...base,
        objectKind: "windsock",
        objective: "Read the wind direction in degrees from a windsock on a compass rose",
        answer: choice(ans as string, byDeg(opts4).map(degOpt)),
        prompt: { line: "cr.prompt.fromDeg", text: "Read the sock on the compass rose. The wind comes FROM which heading?" },
        a11yDescription: `A windsock on a compass rose marked every 30 degrees. ${sockSays}. Which heading is the wind coming from?`,
      };
    }
    case "card":
    case "ten":
    case "round": {
      const n = ans as number;
      return {
        ...base,
        objectKind: "runway",
        objective: s.kind === "round" ? "Round the heading to the nearest ten, then divide by ten to get the runway number" : "A runway's number is its heading divided by ten",
        answer: number(n),
        prompt: { line: "cr.prompt.paint", text: `Planes land here flying heading ${fmtHeading(s.h)}°. Paint the runway number.` },
        a11yDescription: `A runway lies across the compass rose. An arrow shows planes landing along it on heading ${fmtHeading(s.h)} degrees. Enter the two-digit number to paint where they touch down, 01 to 36, with the plus and minus buttons, the number keys or the arrow keys, then Check.`,
      };
    }
    case "opp": {
      const painted = runwayNumber(s.h);
      return {
        ...base,
        objectKind: "runway",
        objective: "The two ends of a runway point opposite ways, so their numbers differ by 18",
        answer: number(ans as number),
        prompt: { line: "cr.prompt.opp", vars: { rw: sayRunway(painted) }, text: `This end is runway ${fmtRunway(painted)}. Paint the number on the other end.` },
        a11yDescription: `A runway on the compass rose. One end is painted ${fmtRunway(painted)} (heading ${fmtHeading(s.h)}). Planes using the other end fly the opposite way. Enter the number for the other end, then Check.`,
      };
    }
    case "rotate":
      return {
        ...base,
        objectKind: "dial",
        objective: "Line a runway up with its number: runway n points heading n × 10",
        answer: number(ans as number),
        prompt: { line: "cr.prompt.rotate", vars: { rw: sayRunway(s.n) }, text: `Turn the runway until its arrow end is runway ${fmtRunway(s.n)}.` },
        a11yDescription: `A runway on the compass rose, its arrow end painted ${fmtRunway(s.n)}. The arrow now points heading ${fmtHeading(s.h)}. Turn the runway by dragging around the rose, with the turn buttons or the arrow keys, until the arrow points the right heading, then Check.`,
      };
    case "quarter":
    case "turn":
    case "wrap":
      return {
        ...base,
        objectKind: "plane",
        objective: s.kind === "wrap" ? "Turn by degrees past north: keep counting past 360 (or below 0) and wrap around" : "Turning right adds degrees, turning left takes them away",
        answer: number(ans as number),
        prompt: { line: "cr.prompt.turn", vars: { dir: dirWord(s.dir), deg: s.d }, text: `Heading ${fmtHeading(s.h)}. Tower says: turn ${dirWord(s.dir)} ${s.d}°. What's your new heading?` },
        a11yDescription: `A plane in the middle of the compass rose flies heading ${fmtHeading(s.h)}. Turn ${dirWord(s.dir)} ${s.d} degrees. Set the new heading by turning the plane, with the buttons, number keys or arrow keys, then Check. North is 360.`,
      };
    case "two":
    case "four":
      return {
        ...base,
        objectKind: "windsock",
        objective: "Planes land into the wind: choose the runway end that faces the wind",
        answer: choice(ans as string, ends.map(rwOpt)),
        prompt: { line: "cr.prompt.land", text: `Wind from ${fmtHeading(s.w)}°. Which runway end should the plane land on?` },
        a11yDescription: `The airport from above with ${s.b ? "two runways" : "one runway"}: ends ${ends.map(fmtRunway).join(", ")}. The wind comes from ${fmtHeading(s.w)} degrees; ${sockSays.toLowerCase()}. Choose the runway end to land on.`,
      };
    case "xwind": {
      const rw = runwayNumber(s.h);
      return {
        ...base,
        objectKind: "windsock",
        objective: "Tell a headwind from a crosswind (or a tailwind) by comparing the wind with the runway",
        answer: choice(ans as string, windOpts),
        prompt: { line: "cr.prompt.xwind", text: `Landing on runway ${fmtRunway(rw)}, wind from ${fmtHeading(s.w)}°. What wind will the plane feel?` },
        a11yDescription: `A plane lines up to land on runway ${fmtRunway(rw)}, heading ${fmtHeading(s.h)}. The wind comes from ${fmtHeading(s.w)} degrees. Is it a headwind, a crosswind or a tailwind?`,
      };
    }
    case "twind":
      return {
        ...base,
        objectKind: "tower",
        objective: "Hear the wind in a tower call and choose the runway end that faces into it",
        answer: choice(ans as string, ends.map(rwOpt)),
        prompt: { line: "cr.tower.wind", vars: { wind: sayHeading(s.w) }, text: `Tower: "Wind ${fmtHeading(s.w)} at ${TOWER_KNOTS}." Which runway?` },
        a11yDescription: `The tower calls: wind ${fmtHeading(s.w)} degrees at ${TOWER_KNOTS} knots. The windsock is hidden. Runway ends: ${ends.map(fmtRunway).join(", ")}. Choose the end to land on.`,
      };
    case "tline": {
      const right = runwayHeading(s.n);
      const name = s.n; // misconception: the runway number is just a name, read as degrees ("031")
      const recip = runwayHeading(reciprocal(s.n));
      const third = name !== recip && name !== right ? name : norm(right + 10);
      return {
        ...base,
        objectKind: "tower",
        objective: "Runway numbers are headings: runway n means flying heading n × 10",
        answer: choice(ans as string, byDeg([right, recip, third]).map((h) => ({ id: hdgId(h), text: `${fmtHeading(h)}°` }))),
        prompt: { line: "cr.tower.line", vars: { rw: sayRunway(s.n) }, text: `Tower: "Cleared to land, runway ${fmtRunway(s.n)}." What heading will you fly?` },
        a11yDescription: `The tower clears you to land on runway ${fmtRunway(s.n)}. Which heading will the plane fly when lined up on it?`,
      };
    }
    case "tjoin": {
      return {
        ...base,
        objectKind: "tower",
        objective: "Combine a turn and runway numbers: after the turn, which runway is straight ahead?",
        answer: choice(ans as string, ends.map(rwOpt)),
        prompt: { line: "cr.tower.join", text: `Tower: "Fly heading ${fmtHeading(s.h)}, then turn ${dirWord(s.dir)} ${s.d}°." Which runway is straight ahead?` },
        a11yDescription: `A plane flies heading ${fmtHeading(s.h)}. The tower says turn ${dirWord(s.dir)} ${s.d} degrees. Runway ends: ${ends.map(fmtRunway).join(", ")}. Which runway can you land on straight ahead?`,
      };
    }
    case "tcomp": {
      const rw = runwayNumber(s.h);
      return {
        ...base,
        objectKind: "tower",
        objective: "Hear a tower call and say whether the wind is a headwind or a crosswind on that runway",
        answer: choice(ans as string, windOpts),
        prompt: { line: "cr.tower.comp", vars: { wind: sayHeading(s.w) }, text: `Tower: "Runway ${fmtRunway(rw)}, wind ${fmtHeading(s.w)} at ${TOWER_KNOTS}." What wind will you feel?` },
        a11yDescription: `The tower says: runway ${fmtRunway(rw)} (heading ${fmtHeading(s.h)}), wind ${fmtHeading(s.w)} degrees at ${TOWER_KNOTS} knots. Headwind, crosswind or tailwind?`,
      };
    }
  }
}

/** A short tag for ids: what the item is about. */
function tagOf(s: Scenario): string {
  switch (s.kind) {
    case "strength":
      return STRENGTH_ID[s.s];
    case "from4":
    case "from8":
    case "fromDeg":
      return fmtHeading(s.w);
    case "card":
    case "ten":
    case "round":
    case "opp":
      return fmtHeading(s.h);
    case "rotate":
    case "tline":
      return fmtRunway(s.n);
    case "quarter":
    case "turn":
    case "wrap":
    case "tjoin":
      return `${fmtHeading(s.h)}${s.dir === 1 ? "r" : "l"}${s.d}`;
    default:
      return `${fmtRunway(s.a)}w${fmtHeading(s.w)}`;
  }
}

/**
 * The band's slot order: slot 0 (the level's focus game) stays first; the other seven rotate by the band seed. A child
 * who answers everything first try steps up every two items and so only meets the first items of each band; rotating
 * means different rounds surface different inner games (rotate, opposite end, …) instead of always the same two.
 */
export function bandSlots(lv: number, band: GeneratorBand | undefined): Kind[] {
  const slots = LEVELS[Math.max(0, Math.min(CR_MAX_LEVEL, lv))]!.slots;
  const rest = slots.slice(1);
  const off = (band?.seed ?? 0) % rest.length;
  return [slots[0]!, ...rest.slice(off), ...rest.slice(0, off)];
}

export const generateCompassRunways: ExerciseGenerator = (level, rng, index, band) => {
  const lv = Math.max(0, Math.min(CR_MAX_LEVEL, level));
  const slots = bandSlots(lv, band);
  const i = index % slots.length;
  const kind = slots[i]!;
  const k = nth(slots, i, kind) + Math.floor(index / slots.length) * slots.filter((x) => x === kind).length;
  const s = pickScenario(kind, lv, rng, band, k);
  const seed = rng.int(1, 999_999);
  return crExercise(s, { id: `cr-${kind.toLowerCase()}-${tagOf(s)}-l${lv}n${index}`, seed });
};

/** Sanity: is the scenario's answer unambiguous? (used by unit tests over levels × seeds) */
export function unambiguous(s: Scenario): boolean {
  switch (s.kind) {
    case "two":
    case "four":
    case "twind":
      return bestMargin(airportEnds(s), s.w) >= 30;
    case "xwind":
    case "tcomp":
      return windKind(s.h, s.w) !== null;
    case "round":
      return s.h % 10 !== 5;
    case "rotate":
      return angleDiff(s.h, runwayHeading(s.n)) >= 40 && angleDiff(s.h, runwayHeading(s.n)) <= 140;
    case "tjoin":
      return runwayHeading(runwayNumber(turnHeading(s.h, s.dir, s.d))) === turnHeading(s.h, s.dir, s.d) && airportEnds(s).includes(runwayNumber(turnHeading(s.h, s.dir, s.d)));
    default:
      return true;
  }
}

export const TUTORIAL_SCENARIO: Scenario = { ...blank("from4", 0), w: 90, s: 2, tut: true };
export { hdgId, rwId, degId };
