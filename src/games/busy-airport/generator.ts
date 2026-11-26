import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import { createRng, type Rng } from "../../engine/rng";

/**
 * Ziggy's Busy Airport — procedural exercises. PURE: same (level, rng, index) → same exercise.
 * Four inner games share one airport; each level unlocks one more and makes the others a little harder.
 * Full rationale (misconceptions, why each interaction): docs/worlds/busy-airport.md.
 *
 *   Lv  games unlocked (new first)          Bag Drop                 All Aboard        Runway Lights            Marshaller
 *   1   bags (tutorial)                     colour · 2 planes · 2–3  —                 —                        —
 *   2   + count                             colour · 2 planes · 3    count 1–3         —                        —
 *   3   + lights                            colour · 3 planes · 3–4  count 2–5         AB · next light (1)      —
 *   4   + signal                            shape  · 2 planes · 3–4  count 2–6         AB · 2 more lights       left / right
 *   5   + make (count out a set)            shape  · 3 planes · 4    3–7 · make 2–4    AAB/ABB · next light     + stop
 *   6   all                                 colour+shape · 4 · 4     4–8 · make 3–6    AAB/ABB · 2 more         + ahead
 *   7   all                                 colour+shape · 4 · 5     5–10 · make 4–7   ABC (+AAB/ABB) · 1–2     + slow down
 *   8   all                                 colour+shape · 4 · 5     6–10 · make 5–8   ABC/AAB/ABB · 3 more     two signals in order
 *   9   all                                 colour+shape · 4 · 5     6–10 · make 6–8   missing middle light     two signals (all five)
 *
 * No time pressure anywhere. Skills: pilot.airport.sort, math.count.one-to-one / cardinality / make-set,
 * math.pattern.repeat, pilot.airport.signals.
 */
export const BA_AGES = [3, 5] as const;
export const SKILL = {
  sort: "pilot.airport.sort",
  oneToOne: "math.count.one-to-one",
  cardinality: "math.count.cardinality",
  makeSet: "math.count.make-set",
  pattern: "math.pattern.repeat",
  signals: "pilot.airport.signals",
} as const;

export type Mode = "bags" | "count" | "make" | "lights" | "signal";
export const MODES: readonly Mode[] = ["bags", "count", "make", "lights", "signal"];
/** Which of the four inner games a mode belongs to (count and make are both "All Aboard"). */
export const GAME_OF: Record<Mode, "bag-drop" | "all-aboard" | "runway-lights" | "marshaller"> = {
  bags: "bag-drop",
  count: "all-aboard",
  make: "all-aboard",
  lights: "runway-lights",
  signal: "marshaller",
};

export const COLOURS = ["red", "blue", "yellow", "green"] as const;
export type Colour = (typeof COLOURS)[number];
export const TAGS = ["circle", "star", "triangle", "heart"] as const;
export type Tag = (typeof TAGS)[number];
export type BagRule = "colour" | "shape" | "both";
export const RULES: readonly BagRule[] = ["colour", "shape", "both"];
/** Signals in on-screen button order (left on the left, right on the right). */
export const SIGNALS = ["left", "ahead", "stop", "slow", "right"] as const;
export type Signal = (typeof SIGNALS)[number];
export const SIGNAL_TEXT: Record<Signal, string> = { left: "Turn left", ahead: "Go ahead", stop: "Stop", slow: "Slow down", right: "Turn right" };
export type Core = "AB" | "AAB" | "ABB" | "ABC";
export const CORES: readonly Core[] = ["AB", "AAB", "ABB", "ABC"];
/** Light kinds reuse the four colours; each also has its own lamp shape (never colour alone). */
export const BLANK = 9;
export const MAX_PASSENGERS = 10;
/** All Aboard counts up to this are tagged `math.count.one-to-one`; larger counts `math.count.cardinality`. */
export const ONE_TO_ONE_MAX = 3;

interface Level {
  games: readonly Mode[];
  bags: { rule: BagRule; planes: number; bags: readonly [number, number] };
  count: readonly [number, number];
  make: readonly [number, number];
  lights: { cores: readonly Core[]; blanks: readonly [number, number]; middle?: boolean; extra: boolean };
  signal: { set: readonly Signal[]; steps: 1 | 2 };
}

export const BA_LEVELS: readonly Level[] = [
  { games: ["bags"], bags: { rule: "colour", planes: 2, bags: [2, 3] }, count: [1, 3], make: [2, 3], lights: { cores: ["AB"], blanks: [1, 1], extra: false }, signal: { set: ["left", "right"], steps: 1 } },
  { games: ["count", "bags"], bags: { rule: "colour", planes: 2, bags: [3, 3] }, count: [1, 3], make: [2, 3], lights: { cores: ["AB"], blanks: [1, 1], extra: false }, signal: { set: ["left", "right"], steps: 1 } },
  { games: ["lights", "bags", "count"], bags: { rule: "colour", planes: 3, bags: [3, 4] }, count: [2, 5], make: [2, 4], lights: { cores: ["AB"], blanks: [1, 1], extra: false }, signal: { set: ["left", "right"], steps: 1 } },
  { games: ["signal", "bags", "lights", "count"], bags: { rule: "shape", planes: 2, bags: [3, 4] }, count: [2, 6], make: [2, 4], lights: { cores: ["AB"], blanks: [2, 2], extra: true }, signal: { set: ["left", "right"], steps: 1 } },
  { games: ["make", "signal", "bags", "lights", "count"], bags: { rule: "shape", planes: 3, bags: [4, 4] }, count: [3, 7], make: [2, 4], lights: { cores: ["AAB", "ABB"], blanks: [1, 1], extra: false }, signal: { set: ["left", "stop", "right"], steps: 1 } },
  { games: ["bags", "lights", "make", "signal", "count"], bags: { rule: "both", planes: 4, bags: [4, 4] }, count: [4, 8], make: [3, 6], lights: { cores: ["AAB", "ABB"], blanks: [2, 2], extra: true }, signal: { set: ["left", "ahead", "stop", "right"], steps: 1 } },
  { games: ["signal", "count", "lights", "bags", "make"], bags: { rule: "both", planes: 4, bags: [5, 5] }, count: [5, 10], make: [4, 7], lights: { cores: ["ABC", "ABC", "AAB", "ABB"], blanks: [1, 2], extra: true }, signal: { set: ["left", "ahead", "stop", "slow", "right"], steps: 1 } },
  { games: ["lights", "signal", "make", "bags", "count"], bags: { rule: "both", planes: 4, bags: [5, 5] }, count: [6, 10], make: [5, 8], lights: { cores: ["ABC", "AAB", "ABB"], blanks: [3, 3], extra: true }, signal: { set: ["left", "ahead", "stop", "right"], steps: 2 } },
  { games: ["signal", "lights", "bags", "make", "count"], bags: { rule: "both", planes: 4, bags: [5, 5] }, count: [6, 10], make: [6, 8], lights: { cores: ["AB", "AAB", "ABB", "ABC"], blanks: [1, 1], middle: true, extra: true }, signal: { set: ["left", "ahead", "stop", "slow", "right"], steps: 2 } },
];
export const BA_MAX_LEVEL = BA_LEVELS.length - 1;

const clampLevel = (level: number) => Math.max(0, Math.min(BA_MAX_LEVEL, Math.floor(level) || 0));
type Gen = Omit<Exercise, "difficulty">;
const base = (rng: Rng) => ({ ages: BA_AGES, interaction: "choose" as const, seed: rng.int(1, 999_999) });

// ---------------------------------------------------------------- Bag Drop (match: bag → plane)

export const bagArt = (colour: Colour, tag: Tag | "none") => `bag~${colour}~${tag}`;
export const planeArt = (colour: Colour | "white", tag: Tag | "none") => `plane~${colour}~${tag}`;
export function parseArt(art: string | undefined): { what: string; colour: string; tag: string } {
  const [what = "", colour = "", tag = "none"] = (art ?? "").split("~");
  return { what, colour, tag };
}

/** The planes for a rule: colour planes (no emblem), white planes with emblems, or colour × emblem. */
function planesFor(rule: BagRule, n: number, rng: Rng): { colour: Colour | "white"; tag: Tag | "none" }[] {
  if (rule === "colour") return rng.shuffle([...COLOURS]).slice(0, n).map((colour) => ({ colour, tag: "none" as const }));
  if (rule === "shape") return rng.shuffle([...TAGS]).slice(0, n).map((tag) => ({ colour: "white" as const, tag }));
  const [c1, c2] = rng.shuffle([...COLOURS]) as Colour[];
  const [t1, t2] = rng.shuffle([...TAGS]) as Tag[];
  return rng.shuffle([
    { colour: c1!, tag: t1! },
    { colour: c1!, tag: t2! },
    { colour: c2!, tag: t1! },
    { colour: c2!, tag: t2! },
  ]).slice(0, n);
}

export function bagsExercise(
  level: number,
  rng: Rng,
  index: number,
  spec: { rule: BagRule; planes: number; bags: number },
): Gen {
  const planes = planesFor(spec.rule, spec.planes, rng);
  // every plane gets a bag before any plane gets a second one (so no plane is a pure distractor at low levels)
  const owners = [...rng.shuffle(planes.map((_, i) => i)).slice(0, Math.min(spec.bags, planes.length))];
  while (owners.length < spec.bags) owners.push(rng.int(0, planes.length - 1));
  const bags = rng.shuffle(owners).map((p) => {
    const plane = planes[p]!;
    // shape rule: the bag's colour is random, so colour can never be the sorting rule
    const colour: Colour = plane.colour === "white" ? rng.pick(COLOURS) : plane.colour;
    return { plane: p, colour, tag: plane.tag };
  });
  const targets: AnswerOption[] = planes.map((p, i) => ({ id: `p${i + 1}`, art: planeArt(p.colour, p.tag) }));
  const items: AnswerOption[] = bags.map((b, i) => ({ id: `b${i + 1}`, art: bagArt(b.colour, b.tag) }));
  const pairs = Object.fromEntries(bags.map((b, i) => [`b${i + 1}`, `p${b.plane + 1}`]));
  const ruleText = spec.rule === "colour" ? "colour" : spec.rule === "shape" ? "shape" : "colour and shape";
  const prompt =
    spec.rule === "colour"
      ? { line: "ba.prompt.bags.colour", text: "Put each bag on the plane with the same colour!" }
      : spec.rule === "shape"
        ? { line: "ba.prompt.bags.shape", text: "Look at each bag's tag. Find the plane with the same shape!" }
        : { line: "ba.prompt.bags.both", text: "Match the colour and the shape! Every bag has one plane." };
  const b = base(rng);
  return {
    ...b,
    id: `ba-bags-${spec.rule}-${spec.bags}-l${level}n${index}`,
    skillId: SKILL.sort,
    objective: spec.rule === "both" ? "Sort bags by two attributes at once: colour and shape" : `Sort bags onto planes by ${ruleText}`,
    answer: { kind: "match", pairs, items, targets },
    objectKind: "bag",
    params: { mode: 0, rule: RULES.indexOf(spec.rule) },
    prompt,
    a11yDescription: `${bags.length} suitcases on a conveyor belt and ${planes.length} planes. Put each suitcase on the plane with the same ${ruleText}, then press Ready.`,
  };
}

// ---------------------------------------------------------------- All Aboard (number)

/** Three neighbouring numbers that include n (off-by-one is the classic counting slip), within 1–10. */
export function countChoices(n: number): number[] {
  const lo = Math.max(1, Math.min(n - 1, MAX_PASSENGERS - 2));
  return [lo, lo + 1, lo + 2];
}

/** Which Critter Crew member each passenger is (0 Bobbo · 1 Zuzu · 2 Gloop · 3 Hoot · 4 Rumble · 5 Puff). Pure. */
export function crewFor(seed: number, count: number): number[] {
  const rng = createRng(seed);
  const out: number[] = [];
  let bag: number[] = [];
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) bag = rng.shuffle([0, 1, 2, 3, 4, 5]);
    out.push(bag.pop()!);
  }
  return out;
}

export function countExercise(level: number, rng: Rng, index: number, n: number): Gen {
  const b = base(rng);
  return {
    ...b,
    id: `ba-count-${n}-l${level}n${index}`,
    // counts of 1–3 practise one-to-one tagging; they come up at levels 1–4 (count ranges start at 1, 2, 2, 3)
    skillId: n <= ONE_TO_ONE_MAX ? SKILL.oneToOne : SKILL.cardinality,
    objective: `Board ${n} passengers one at a time and say how many got on`,
    answer: { kind: "number", value: n, choices: countChoices(n) },
    objectKind: "passenger",
    params: { mode: 1, n },
    prompt: { line: "ba.prompt.count", text: "Tap each passenger to help them climb aboard!" },
    a11yDescription: `${n} passengers wait by the plane steps. Press each one to help them on board; each takes a window seat with a number. Then choose how many got on.`,
  };
}

export function makeExercise(level: number, rng: Rng, index: number, n: number, pool: number): Gen {
  const b = base(rng);
  return {
    ...b,
    id: `ba-make-${n}-l${level}n${index}`,
    skillId: SKILL.makeSet,
    objective: `Count out exactly ${n} passengers from a group of ${pool}, and stop`,
    answer: { kind: "number", value: n },
    objectKind: "passenger",
    params: { mode: 2, n, pool },
    prompt: { line: "ba.prompt.make", vars: { n }, text: `Ziggy needs ${NUMBER_WORDS[n]} passengers. Help them climb aboard!` },
    a11yDescription: `${pool} passengers wait in the lounge. Ziggy needs exactly ${n}. Press a passenger to put them on the plane, press Send one back to take one off, then press Ready.`,
  };
}
export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"] as const;

// ---------------------------------------------------------------- Runway Lights (choice / sequence)

export const lightArt = (c: Colour) => `light~${c}`;
/** Colour index per position of the runway (BLANK = empty socket). */
export function runwayOf(ex: Pick<Exercise, "params">): number[] {
  const len = ex.params?.len ?? 0;
  return Array.from({ length: len }, (_, i) => ex.params?.[`s${i}`] ?? BLANK);
}

export function lightsExercise(
  level: number,
  rng: Rng,
  index: number,
  spec: { core: Core; blanks: number; middle: boolean; extra: boolean },
): Gen {
  const k = new Set(spec.core).size;
  const kinds = rng.shuffle([0, 1, 2, 3]).slice(0, 4); // first k are the pattern's colours, the rest outsiders
  const letter = (ch: string) => kinds["ABC".indexOf(ch)]!;
  const c = spec.core.length;
  // two full repeats before the gap (3 for AB), then the blanks
  const shown = spec.middle ? c * 2 + Math.max(2, 8 - c * 2) : c === 2 ? (spec.blanks === 1 ? 5 : 4) : c * 2;
  const len = spec.middle ? Math.min(8, shown) : shown + spec.blanks;
  const full = Array.from({ length: len }, (_, i) => letter(spec.core[i % c]!));
  const gaps = spec.middle ? [rng.int(c, len - 2)] : Array.from({ length: spec.blanks }, (_, i) => len - spec.blanks + i);
  const runway = full.map((v, i) => (gaps.includes(i) ? BLANK : v));
  const needed = gaps.map((g) => full[g]!);
  const params: Record<string, number> = { mode: 3, len, blanks: gaps.length, core: CORES.indexOf(spec.core), middle: spec.middle ? 1 : 0 };
  runway.forEach((v, i) => (params[`s${i}`] = v));
  const name = (v: number) => COLOURS[v]!;
  const b = base(rng);
  const common = {
    ...b,
    skillId: SKILL.pattern,
    objectKind: "light",
    params,
  };
  if (gaps.length === 1) {
    // pick the next light: the pattern's colours, plus an outsider colour from L7 up
    const pool = kinds.slice(0, k + (spec.extra ? 1 : 0));
    const options: AnswerOption[] = rng.shuffle(pool).map((v, i) => ({ id: `l${i + 1}`, text: name(v), art: lightArt(name(v)) }));
    const correct = options.find((o) => o.text === name(needed[0]!))!.id;
    return {
      ...common,
      id: `ba-lights-${spec.core.toLowerCase()}-${spec.middle ? "mid" : "next"}-l${level}n${index}`,
      objective: spec.middle ? `Find the missing light in a ${spec.core} pattern` : `Continue a ${spec.core} light pattern by one`,
      answer: { kind: "choice", correct, options },
      prompt: spec.middle
        ? { line: "ba.prompt.lights.middle", text: "One light is missing. Which one fits the pattern?" }
        : { line: "ba.prompt.lights.next", text: "Which light comes next? Keep the pattern going!" },
      a11yDescription: `Runway lights in a repeating pattern: ${runway.map((v) => (v === BLANK ? "empty" : name(v))).join(", ")}. Choose the light for the empty socket.`,
    };
  }
  // several blanks: one bulb per blank (same colours are interchangeable) + one outsider bulb that never fits
  const outsider = kinds.find((v) => !needed.includes(v))!;
  const bulbs = rng.shuffle([...needed.map((v, i) => ({ v, need: i })), { v: outsider, need: -1 }]);
  const pieces: AnswerOption[] = bulbs.map((x, i) => ({ id: `l${i + 1}`, text: name(x.v), art: lightArt(name(x.v)) }));
  const order = needed.map((_, i) => `l${bulbs.findIndex((x) => x.need === i) + 1}`);
  return {
    ...common,
    id: `ba-lights-${spec.core.toLowerCase()}-${gaps.length}-l${level}n${index}`,
    objective: `Continue a ${spec.core} light pattern by ${gaps.length} lights`,
    answer: { kind: "sequence", order, pieces },
    prompt: { line: "ba.prompt.lights.fill", text: "Finish the runway lights. Keep the pattern going!" },
    a11yDescription: `Runway lights in a repeating pattern: ${runway.map((v) => (v === BLANK ? "empty" : name(v))).join(", ")}. Fill the ${gaps.length} empty sockets in order with the bulbs below, then press Ready.`,
  };
}

// ---------------------------------------------------------------- Marshaller (choice / sequence)

export const SIGNAL_SAY: Record<Signal, string> = {
  left: "points a wand to your left and waves the other one",
  right: "points a wand to your right and waves the other one",
  ahead: "waves both wands up and back towards the chest",
  stop: "crosses both wands above the head",
  slow: "pats both wands down low",
};

export function signalExercise(level: number, rng: Rng, index: number, spec: { set: readonly Signal[]; steps: 1 | 2 }): Gen {
  const set = SIGNALS.filter((s) => spec.set.includes(s));
  // two-signal plans never start with stop ("Stop, then slow down" is not a sensible order for a taxiing plane)
  const firsts = spec.steps === 2 ? set.filter((s) => s !== "stop") : set;
  const first = firsts[(index + rng.int(0, firsts.length - 1)) % firsts.length]!;
  const options: AnswerOption[] = set.map((s) => ({ id: s, text: SIGNAL_TEXT[s] }));
  const b = base(rng);
  const common = { ...b, skillId: SKILL.signals, objectKind: "wands" };
  if (spec.steps === 1) {
    return {
      ...common,
      id: `ba-signal-${first}-l${level}n${index}`,
      objective: `Follow a marshaller's "${SIGNAL_TEXT[first].toLowerCase()}" signal`,
      answer: { kind: "choice", correct: first, options },
      params: { mode: 4, steps: 1, a: SIGNALS.indexOf(first) },
      prompt: { line: "ba.prompt.signal", text: "Watch the marshaller. What should the plane do?" },
      a11yDescription: `The marshaller ${SIGNAL_SAY[first]}. Choose what the plane should do: ${set.map((s) => SIGNAL_TEXT[s].toLowerCase()).join(", ")}.`,
    };
  }
  const second = rng.pick(set.filter((s) => s !== first));
  return {
    ...common,
    id: `ba-signal-${first}-${second}-l${level}n${index}`,
    objective: "Follow two marshaller signals in order",
    answer: { kind: "sequence", order: [first, second], pieces: options },
    params: { mode: 4, steps: 2, a: SIGNALS.indexOf(first), b: SIGNALS.indexOf(second) },
    prompt: { line: "ba.prompt.signal2", text: "Two signals! Do the first one, then the second one." },
    a11yDescription: `Signal 1: the marshaller ${SIGNAL_SAY[first]}. Signal 2: the marshaller ${SIGNAL_SAY[second]}. Press the two moves in order, then press Ready.`,
  };
}

// ---------------------------------------------------------------- dispatcher

export const generateBusyAirport: ExerciseGenerator = (rawLevel, rng, index) => {
  const level = clampLevel(rawLevel);
  const p = BA_LEVELS[level]!;
  const mode = p.games[index % p.games.length]!;
  switch (mode) {
    case "bags":
      return bagsExercise(level, rng, index, { rule: p.bags.rule, planes: p.bags.planes, bags: rng.int(p.bags.bags[0], p.bags.bags[1]) });
    case "count":
      return countExercise(level, rng, index, rng.int(p.count[0], p.count[1]));
    case "make": {
      const n = rng.int(p.make[0], p.make[1]);
      return makeExercise(level, rng, index, n, Math.min(MAX_PASSENGERS, n + rng.int(2, 3)));
    }
    case "lights":
      return lightsExercise(level, rng, index, {
        core: rng.pick(p.lights.cores),
        blanks: rng.int(p.lights.blanks[0], p.lights.blanks[1]),
        middle: !!p.lights.middle,
        extra: p.lights.extra,
      });
    case "signal":
      return signalExercise(level, rng, index, p.signal);
  }
};

// ---------------------------------------------------------------- helpers shared by board, skin and tests

export const modeOf = (ex: Pick<Exercise, "params">): Mode => MODES[ex.params?.mode ?? 0] ?? "bags";
export const ruleOf = (ex: Pick<Exercise, "params">): BagRule => RULES[ex.params?.rule ?? 0] ?? "colour";
export const signalsOf = (ex: Pick<Exercise, "params">): Signal[] => {
  const p = ex.params ?? {};
  const out = [SIGNALS[p.a ?? 0]!];
  if ((p.steps ?? 1) === 2) out.push(SIGNALS[p.b ?? 0]!);
  return out;
};
