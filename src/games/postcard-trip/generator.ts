import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  CONTINENTS, CONTINENT_NAME, type ContinentId, DIRS, DIR_WORD, type Dir, FLIGHTS, type Flight, OCEANS, OCEAN_NAME, OPPOSITE, type OceanId,
  PLACES, type Place, SIDES, type Side, flightFrom, placeById, placesOn,
} from "./geo";
import { CELLS, COASTAL, FEATURES, FEATURE_NAME, type Feature, LOOKALIKE, refOf, rc, cellAt, isEdge, step, transposed, walk, COLS, ROWS } from "./island";

/**
 * Yonder's Postcard Trip — seeded mission generator (docs/curriculum/geography.md §4.4, docs/worlds/postcard-trip.md).
 * Pure: same (level, rng, index) → same mission. Every answer is computed from the same data the board draws
 * (island grid simulation, or the authored world tables in ./geo), and tests/unit/postcard-trip.test.ts checks
 * every level × 60 seeds for a correct, reachable answer.
 *
 * Level (0-based) → mission:
 *   0  island: walk 1 step; the direction is spoken and the postcard is visible            geo.map.directions
 *   1  island: walk 1 step to a named place; no marker; ≥ 50 % east/west; a decoy place
 *      sits the opposite way (the east/west swap)                                           geo.map.directions
 *   2  island: follow a 2-leg route "Go north 2, then east 1" (2–4 steps); postcard hidden  geo.map.directions
 *   3  island: "Find the cave" using the map key; a look-alike symbol is always on the map geo.map.key
 *   4  island: "Which square is the cave in?" 3 references (right · off by one · swapped)  geo.map.grid
 *   5  world: post a postcard to its continent (7); rotation covers every continent         geo.world.continents
 *   6  world: sail the boat to a named ocean (5)                                            geo.world.oceans
 *   7  world: which way does the balloon fly from A to B? · which ocean is east of Africa?  geo.map.directions / geo.world.oceans
 *   8  world: north or south of the equator? · in July, summer or winter there?             geo.world.equator
 *   9  world: trip mission — order 3 postcards by the directions (+ 1 decoy card); every
 *      other mission is a mixed review (3 postcards · ocean side · seasons)                  mixed
 */

export const PC_AGES = [5, 9] as const;
export const SKILL = {
  directions: "geo.map.directions",
  key: "geo.map.key",
  gridRef: "geo.map.grid",
  continents: "geo.world.continents",
  oceans: "geo.world.oceans",
  equator: "geo.world.equator",
} as const;

export type IslandMode = "step" | "route" | "key" | "grid";
export type WorldMode = "continent" | "ocean" | "fly" | "side" | "hemi" | "season" | "trip" | "cards";
export type Mode = IslandMode | WorldMode;
export const MODES: readonly Mode[] = ["step", "route", "key", "grid", "continent", "ocean", "fly", "side", "hemi", "season", "trip", "cards"];
export const ISLAND_MODES: readonly Mode[] = ["step", "route", "key", "grid"];
export const isIsland = (m: Mode): m is IslandMode => (ISLAND_MODES as readonly string[]).includes(m);

export interface LevelSpec { label: string; modes: readonly Mode[] }
export const LEVELS: readonly LevelSpec[] = [
  { label: "island: 1 step, direction spoken, postcard visible", modes: ["step"] },
  { label: "island: 1 step to a named place, ≥50% east/west, decoy the opposite way", modes: ["step"] },
  { label: "island: 2-leg route (2–4 steps) from compass words", modes: ["route"] },
  { label: "island: find a symbol with the map key (look-alike on the map)", modes: ["key"] },
  { label: "island: which square? 3 grid references", modes: ["grid"] },
  { label: "world: postcard → continent (7)", modes: ["continent"] },
  { label: "world: boat → ocean (5)", modes: ["ocean"] },
  { label: "world: balloon direction between continents · ocean on a side", modes: ["fly", "side"] },
  { label: "world: north/south of the equator · opposite seasons", modes: ["hemi", "season"] },
  { label: "world: 3-stop trip by directions · mixed review", modes: ["trip", "cards", "side", "season"] },
];
export const PC_MAX_LEVEL = LEVELS.length - 1;

// ---------------------------------------------------------------- content sets (each matches a voice `vary` list)

/** Island prompts name these places (pc.prompt.step / key / grid). */
export const STEP_FEATURES: readonly Feature[] = FEATURES;
/** Places for equator questions: single-word names, ≥ 12° from the equator. */
export const HEMI_PLACES: readonly string[] = ["canada", "mexico", "france", "italy", "norway", "egypt", "japan", "china", "india", "peru", "argentina", "madagascar", "sydney", "antarctica"];
/** Season questions only use places outside the tropics (|latitude| > 23.5°): in the tropics wet and dry seasons matter more than summer and winter. */
export const SEASON_PLACES: readonly string[] = ["canada", "france", "norway", "japan", "china", "argentina", "sydney", "antarctica"];
export const MONTHS = ["July", "December"] as const;
/** Spoken name in equator / season prompts. */
export const sayName = (p: Place) => (p.id === "antarctica" ? "Antarctica" : p.name);
/** Continent rotation for postcard levels: neighbours that get mixed up come one after another. */
export const CONTINENT_ORDER: readonly ContinentId[] = ["europe", "asia", "na", "sa", "africa", "australia", "antarctica"];
export const OCEAN_ORDER: readonly OceanId[] = ["pacific", "atlantic", "indian", "southern", "arctic"];

// ---------------------------------------------------------------- the decoded mission

export interface IslandMission {
  kind: "island";
  mode: IslandMode;
  start: number;
  /** Destination cell (step/route) or the asked feature's cell (key/grid). */
  target: number;
  targetFeature: Feature;
  /** Feature → cell (absent features are not on the map). */
  features: Partial<Record<Feature, number>>;
  /** The intended moves (step/route). */
  moves: Dir[];
  legs: { d: Dir; n: number }[];
  decoy: Feature | null;
  marked: boolean;
  /** Grid answer options (cells), in display order. */
  options: number[];
}
export interface WorldMission {
  kind: "world";
  mode: WorldMode;
  place: Place | null;
  month: (typeof MONTHS)[number] | null;
  flight: Flight | null;
  side: Side | null;
  ocean: OceanId | null;
  /** Trip: start continent, leg directions, the stops in order, the decoy continent, and the place drawn on each card (stops then decoy). */
  start: ContinentId | null;
  legs: Dir[];
  stops: ContinentId[];
  decoy: ContinentId | null;
  cardPlaces: Place[];
}
export type Mission = IslandMission | WorldMission;

const DIR_CODE: Record<Dir, number> = { n: 0, e: 1, s: 2, w: 3 };
const dirOf = (n: number | undefined): Dir => DIRS[n ?? 0] ?? "n";
const ci = (c: ContinentId) => CONTINENTS.indexOf(c);
const pi = (p: Place) => PLACES.indexOf(p);

export function encodeMission(m: Mission): Record<string, number> {
  const q: Record<string, number> = { k: m.kind === "island" ? 0 : 1, mode: MODES.indexOf(m.mode) };
  if (m.kind === "island") {
    Object.assign(q, { start: m.start, target: m.target, tf: FEATURES.indexOf(m.targetFeature), n: m.moves.length, nl: m.legs.length, decoy: m.decoy ? FEATURES.indexOf(m.decoy) : -1, marked: m.marked ? 1 : 0, no: m.options.length });
    m.moves.forEach((d, i) => (q[`m${i}`] = DIR_CODE[d]));
    m.legs.forEach((l, i) => {
      q[`ld${i}`] = DIR_CODE[l.d];
      q[`ln${i}`] = l.n;
    });
    FEATURES.forEach((f, i) => (q[`f${i}`] = m.features[f] ?? -1));
    m.options.forEach((c, i) => (q[`o${i}`] = c));
  } else {
    Object.assign(q, {
      place: m.place ? pi(m.place) : -1, month: m.month ? MONTHS.indexOf(m.month) : -1, flight: m.flight ? FLIGHTS.indexOf(m.flight) : -1,
      side: m.side ? SIDES.indexOf(m.side) : -1, ocean: m.ocean ? OCEANS.indexOf(m.ocean) : -1, start: m.start ? ci(m.start) : -1,
      nl: m.legs.length, decoy: m.decoy ? ci(m.decoy) : -1, nc: m.cardPlaces.length,
    });
    m.legs.forEach((d, i) => (q[`l${i}`] = DIR_CODE[d]));
    m.stops.forEach((c, i) => (q[`s${i}`] = ci(c)));
    m.cardPlaces.forEach((p, i) => (q[`p${i}`] = pi(p)));
  }
  return q;
}

export function decodeMission(ex: Pick<Exercise, "params">): Mission {
  const q = ex.params ?? {};
  const n = (k: string, d = 0) => q[k] ?? d;
  const mode = MODES[n("mode")] ?? "step";
  if (n("k") === 0) {
    const features: Partial<Record<Feature, number>> = {};
    FEATURES.forEach((f, i) => {
      const c = n(`f${i}`, -1);
      if (c >= 0) features[f] = c;
    });
    return {
      kind: "island", mode: mode as IslandMode, start: n("start"), target: n("target"), targetFeature: FEATURES[n("tf")] ?? "lighthouse", features,
      moves: Array.from({ length: n("n") }, (_, i) => dirOf(q[`m${i}`])),
      legs: Array.from({ length: n("nl") }, (_, i) => ({ d: dirOf(q[`ld${i}`]), n: n(`ln${i}`, 1) })),
      decoy: n("decoy", -1) >= 0 ? FEATURES[n("decoy")]! : null, marked: n("marked") === 1,
      options: Array.from({ length: n("no") }, (_, i) => n(`o${i}`)),
    };
  }
  const opt = <T,>(arr: readonly T[], k: string): T | null => (n(k, -1) >= 0 ? arr[n(k)] ?? null : null);
  return {
    kind: "world", mode: mode as WorldMode, place: opt(PLACES, "place"), month: opt(MONTHS, "month"), flight: opt(FLIGHTS, "flight"),
    side: opt(SIDES, "side"), ocean: opt(OCEANS, "ocean"), start: opt(CONTINENTS, "start"),
    legs: Array.from({ length: n("nl") }, (_, i) => dirOf(q[`l${i}`])),
    stops: Array.from({ length: n("nl") }, (_, i) => CONTINENTS[n(`s${i}`)]!),
    decoy: opt(CONTINENTS, "decoy"),
    cardPlaces: Array.from({ length: n("nc") }, (_, i) => PLACES[n(`p${i}`)]!),
  };
}

// ---------------------------------------------------------------- answers (computed from the mission)

const CHECKPOINTS = { kind: "sequence" as const, order: ["start", "goal"], pieces: [{ id: "start", text: "Start" }, { id: "goal", text: "Postcard" }] };
export const DIR_OPTIONS: AnswerOption[] = DIRS.map((d) => ({ id: d, text: DIR_WORD[d][0]!.toUpperCase() + DIR_WORD[d].slice(1), say: `pc.dir.${d}` }));
export const CONTINENT_OPTIONS: AnswerOption[] = CONTINENTS.map((c) => ({ id: c, text: CONTINENT_NAME[c] }));
export const OCEAN_OPTIONS: AnswerOption[] = OCEANS.map((o) => ({ id: o, text: `${OCEAN_NAME[o]} Ocean` }));
export const cardId = (c: ContinentId) => `c-${c}`;
export const postcardId = (p: Place) => `card-${p.id}`;

/** July is summer north of the equator and winter south of it; December the other way round. */
export const seasonOf = (p: Place, month: (typeof MONTHS)[number]): "summer" | "winter" => ((p.hemi === "n") === (month === "July") ? "summer" : "winter");

export function answerFor(m: Mission): Exercise["answer"] {
  if (m.kind === "island") {
    switch (m.mode) {
      case "step":
      case "route":
        return CHECKPOINTS;
      case "key":
        return {
          kind: "choice", correct: m.targetFeature,
          options: FEATURES.filter((f) => m.features[f] !== undefined).map((f) => ({ id: f, text: FEATURE_NAME[f], art: `sym-${f}`, say: `pc.sym.${f}` })),
        };
      case "grid":
        return { kind: "choice", correct: refOf(m.target).toLowerCase(), options: m.options.map((c) => ({ id: refOf(c).toLowerCase(), text: refOf(c) })) };
    }
  }
  switch (m.mode) {
    case "continent":
      return { kind: "choice", correct: m.place!.continent, options: CONTINENT_OPTIONS };
    case "ocean":
      return { kind: "choice", correct: m.ocean!, options: OCEAN_OPTIONS };
    case "fly":
      return { kind: "choice", correct: m.flight!.dir, options: DIR_OPTIONS };
    case "side":
      return { kind: "choice", correct: m.side!.ocean, options: OCEAN_OPTIONS };
    case "hemi":
      return { kind: "choice", correct: m.place!.hemi === "n" ? "north" : "south", options: [{ id: "north", text: "North of the equator", say: "pc.say.north" }, { id: "south", text: "South of the equator", say: "pc.say.south" }] };
    case "season":
      return { kind: "choice", correct: seasonOf(m.place!, m.month!), options: [{ id: "summer", text: "Summer", say: "pc.say.summer" }, { id: "winter", text: "Winter", say: "pc.say.winter" }] };
    case "trip": {
      const all = [...m.stops, m.decoy!];
      return {
        kind: "sequence", order: m.stops.map(cardId),
        pieces: all.map((c, i) => ({ id: cardId(c), text: CONTINENT_NAME[c], art: `pc-${m.cardPlaces[i]!.id}` })),
      };
    }
    case "cards":
      return {
        kind: "match",
        pairs: Object.fromEntries(m.cardPlaces.map((p) => [postcardId(p), p.continent])),
        items: m.cardPlaces.map((p) => ({ id: postcardId(p), text: `Postcard from ${p.name}`, art: `pc-${p.id}`, say: `pc.card.${p.id}` })),
        targets: CONTINENT_OPTIONS,
      };
  }
}

// ---------------------------------------------------------------- words (prompts, captions, a11y)

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function featureList(m: IslandMission): string {
  return FEATURES.filter((f) => m.features[f] !== undefined).map((f) => `${FEATURE_NAME[f]} at ${refOf(m.features[f]!)}`).join(", ");
}
export function promptFor(m: Mission): NonNullable<Exercise["prompt"]> {
  if (m.kind === "island") {
    const f = FEATURE_NAME[m.targetFeature];
    switch (m.mode) {
      case "step": {
        const dir = DIR_WORD[m.moves[0]!];
        return { line: "pc.prompt.step", vars: { dir, place: f }, text: `Help Yonder walk ${dir} to the ${f}.` };
      }
      case "route": {
        const [a, b] = m.legs as [{ d: Dir; n: number }, { d: Dir; n: number }];
        return { line: "pc.prompt.route", vars: { dir: DIR_WORD[a.d], n: a.n, dir2: DIR_WORD[b.d], n2: b.n }, text: `Go ${DIR_WORD[a.d]} ${a.n}, then ${DIR_WORD[b.d]} ${b.n}.` };
      }
      case "key":
        return { line: "pc.prompt.key", vars: { symbol: f }, text: `Find the ${f} on the map.` };
      case "grid":
        return { line: "pc.prompt.grid", vars: { feature: f }, text: `Which square is the ${f} in?` };
    }
  }
  switch (m.mode) {
    case "continent": {
      const p = m.place!;
      return { line: `pc.card.${p.id}`, text: `This postcard is from ${p.id === "antarctica" ? "a science station in Antarctica" : `${p.name}, in ${CONTINENT_NAME[p.continent]}`}. Where is ${CONTINENT_NAME[p.continent]}?` };
    }
    case "ocean":
      return { line: "pc.prompt.ocean", vars: { ocean: OCEAN_NAME[m.ocean!] }, text: `Sail the boat to the ${OCEAN_NAME[m.ocean!]} Ocean.` };
    case "fly": {
      const to = CONTINENT_NAME[m.flight!.to];
      return { line: "pc.prompt.fly", vars: { to }, text: `Which way should Yonder fly to reach ${to}?` };
    }
    case "side": {
      const s = m.side!;
      return { line: "pc.prompt.side", vars: { dir: DIR_WORD[s.dir], continent: CONTINENT_NAME[s.continent] }, text: `Yonder sails ${DIR_WORD[s.dir]} from ${CONTINENT_NAME[s.continent]}. Which ocean is the boat in?` };
    }
    case "hemi": {
      const place = sayName(m.place!);
      return { line: "pc.prompt.hemi", vars: { place }, text: `Is ${place} north or south of the equator?` };
    }
    case "season": {
      const place = sayName(m.place!);
      return { line: "pc.prompt.season", vars: { month: m.month!, place }, text: `In ${m.month}, is it summer or winter in ${place}?` };
    }
    case "trip": {
      const start = CONTINENT_NAME[m.start!];
      return { line: "pc.prompt.trip", vars: { start }, text: `Start in ${start}. Follow the arrows and put the postcards in order.` };
    }
    case "cards":
      return { line: "pc.prompt.cards", text: "Post each card to its continent." };
  }
}

export function describeMission(m: Mission): string {
  if (m.kind === "island") {
    const base = `Island map, 6 by 6 squares, columns A to F, rows 1 to 6, north at the top. Yonder is at ${refOf(m.start)}. On the map: ${featureList(m)}.`;
    switch (m.mode) {
      case "step":
        return `${base}${m.marked ? ` A postcard is waiting at the ${FEATURE_NAME[m.targetFeature]}.` : ""} Use the compass buttons north, east, south and west to plan one step, and Yonder walks it.`;
      case "route":
        return `${base} Plan ${m.moves.length} steps with the compass buttons, then press Walk.`;
      case "key":
        return `${base} The map key shows each symbol. Choose the square with the ${FEATURE_NAME[m.targetFeature]}.`;
      case "grid":
        return `${base} Choose the grid reference of the ${FEATURE_NAME[m.targetFeature]}: ${m.options.map(refOf).join(", ")}.`;
    }
  }
  const world = "World map, north at the top, with the seven continents and five oceans.";
  switch (m.mode) {
    case "continent":
      return `${world} A postcard showing ${m.place!.shows}. Drag it to ${CONTINENT_NAME[m.place!.continent]}, or pick it up and choose a continent from the list.`;
    case "ocean":
      return `${world} Drag the boat to the ${OCEAN_NAME[m.ocean!]} Ocean, or choose an ocean from the list.`;
    case "fly":
      return `${world} Yonder's balloon is over ${CONTINENT_NAME[m.flight!.from]} and a postcard is waiting in ${CONTINENT_NAME[m.flight!.to]}. Choose north, east, south or west.`;
    case "side":
      return `${world} Yonder's boat is ${DIR_WORD[m.side!.dir]} of ${CONTINENT_NAME[m.side!.continent]}. Choose the ocean.`;
    case "hemi":
      return `${world} The equator is marked. A pin shows ${m.place!.shows} in ${sayName(m.place!)}. Choose north or south of the equator.`;
    case "season":
      return `${world} The equator is marked. A pin shows ${sayName(m.place!)}. It is ${m.month}. Choose summer or winter.`;
    case "trip":
      return `${world} The trip starts in ${CONTINENT_NAME[m.start!]}. Directions: ${m.legs.map((d) => DIR_WORD[d]).join(", then ")}. Put three of the four postcards into stops 1, 2 and 3.`;
    case "cards":
      return `${world} Postcards: ${m.cardPlaces.map((p) => `${p.name} (${p.shows})`).join("; ")}. Post each one to its continent.`;
  }
}

// ---------------------------------------------------------------- building missions

const SKILL_OF: Record<Mode, string> = {
  step: SKILL.directions, route: SKILL.directions, key: SKILL.key, grid: SKILL.gridRef, continent: SKILL.continents, cards: SKILL.continents,
  ocean: SKILL.oceans, side: SKILL.oceans, fly: SKILL.directions, trip: SKILL.directions, hemi: SKILL.equator, season: SKILL.equator,
};
const AGES_OF = (mode: Mode): readonly [number, number] => (isIsland(mode) ? [5, 8] : mode === "hemi" || mode === "season" ? [7, 9] : [6, 9]);
const ICON: Record<Mode, string> = {
  step: "compass", route: "compass", key: "key", grid: "grid", continent: "postcard", cards: "postcard", ocean: "boat", side: "boat",
  fly: "balloon", trip: "balloon", hemi: "globe", season: "globe",
};
const OBJECTIVE: Record<Mode, string> = {
  step: "Move one step north, east, south or west using the compass rose.",
  route: "Follow a two-part route given in compass words.",
  key: "Use a map key to find a symbol on the map.",
  grid: "Give the grid reference (letter, then number) of a place on the map.",
  continent: "Find a continent on a world map.",
  cards: "Find the continents of several places on a world map.",
  ocean: "Find one of the five oceans on a world map.",
  side: "Name the ocean on one side of a continent.",
  fly: "Use compass directions between continents on a world map.",
  trip: "Follow compass directions from continent to continent and order the stops.",
  hemi: "Tell whether a place is north or south of the equator.",
  season: "Know that seasons are opposite in the northern and southern hemispheres.",
};

export function exerciseFor(m: Mission, meta: { id: string; seed: number; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  return {
    id: meta.id, skillId: SKILL_OF[m.mode], objective: OBJECTIVE[m.mode], ages: AGES_OF(m.mode), interaction: "choose",
    answer: answerFor(m), objectKind: ICON[m.mode], seed: meta.seed, a11yDescription: describeMission(m), params: encodeMission(m),
    prompt: promptFor(m), ...(meta.tutorial ? { tutorial: true } : {}),
  };
}

// ---------- island ----------

/** Put the remaining features on free cells (coastal ones only on the edge), never on Yonder's start. */
function scatter(rng: Rng, fixed: Partial<Record<Feature, number>>, start: number, count: number): Partial<Record<Feature, number>> {
  const out = { ...fixed };
  const taken = new Set<number>([start, ...Object.values(out)]);
  const pool = rng.shuffle(FEATURES.filter((f) => out[f] === undefined));
  for (const f of pool) {
    if (Object.keys(out).length >= count) break;
    const free = Array.from({ length: CELLS }, (_, c) => c).filter((c) => !taken.has(c) && (!COASTAL.has(f) || isEdge(c)));
    if (!free.length) continue;
    const c = rng.pick(free);
    out[f] = c;
    taken.add(c);
  }
  return out;
}
const fitsFeature = (f: Feature, cell: number) => !COASTAL.has(f) || isEdge(cell);

function islandStep(level: number, rng: Rng, index: number): IslandMission {
  const ew = level === 1 && index % 2 === 0;
  const dir = ew ? rng.pick<Dir>(["e", "w"]) : rng.pick(DIRS);
  const starts = Array.from({ length: CELLS }, (_, c) => c).filter((c) => step(c, dir) >= 0 && (level === 0 || step(c, OPPOSITE[dir]) >= 0));
  const start = rng.pick(starts);
  const target = step(start, dir);
  const targetFeature = rng.pick(FEATURES.filter((f) => fitsFeature(f, target)));
  const fixed: Partial<Record<Feature, number>> = { [targetFeature]: target };
  let decoy: Feature | null = null;
  if (level >= 1) {
    const dc = step(start, OPPOSITE[dir]);
    decoy = rng.pick(FEATURES.filter((f) => f !== targetFeature && fitsFeature(f, dc)));
    fixed[decoy] = dc;
  }
  return {
    kind: "island", mode: "step", start, target, targetFeature, features: scatter(rng, fixed, start, 6), moves: [dir], legs: [{ d: dir, n: 1 }],
    decoy, marked: level === 0, options: [],
  };
}

function islandRoute(rng: Rng): IslandMission {
  for (;;) {
    const d1 = rng.pick(DIRS);
    const d2 = rng.pick<Dir>(d1 === "n" || d1 === "s" ? ["e", "w"] : ["n", "s"]);
    const n1 = rng.int(1, 2);
    const n2 = rng.int(1, 2);
    const moves: Dir[] = [...Array<Dir>(n1).fill(d1), ...Array<Dir>(n2).fill(d2)];
    const starts = Array.from({ length: CELLS }, (_, c) => c).filter((c) => walk(c, moves).bump < 0);
    if (!starts.length) continue;
    const start = rng.pick(starts);
    const target = walk(start, moves).end;
    const targetFeature = rng.pick(FEATURES.filter((f) => fitsFeature(f, target)));
    return {
      kind: "island", mode: "route", start, target, targetFeature, features: scatter(rng, { [targetFeature]: target }, start, 6), moves,
      legs: [{ d: d1, n: n1 }, { d: d2, n: n2 }], decoy: null, marked: false, options: [],
    };
  }
}

function islandKey(rng: Rng): IslandMission {
  const targetFeature = rng.pick(FEATURES);
  const look = LOOKALIKE[targetFeature];
  const start = rng.int(0, CELLS - 1);
  const free = (f: Feature, not: number[]) => Array.from({ length: CELLS }, (_, c) => c).filter((c) => !not.includes(c) && fitsFeature(f, c));
  const target = rng.pick(free(targetFeature, [start]));
  const lc = rng.pick(free(look, [start, target]));
  const features = scatter(rng, { [targetFeature]: target, [look]: lc }, start, 7);
  return { kind: "island", mode: "key", start, target, targetFeature, features, moves: [], legs: [], decoy: look, marked: false, options: [] };
}

/** Grid options: the right square, one off by one column or row, and the row/column swap (else another neighbour). */
export function gridOptions(target: number, rng: Rng): number[] {
  const [r, c] = rc(target);
  const neighbours = [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]]
    .filter(([a, b]) => a! >= 0 && b! >= 0 && a! < ROWS && b! < COLS)
    .map(([a, b]) => cellAt(a!, b!));
  const near = rng.pick(neighbours);
  const swap = transposed(target);
  const third = swap !== target && swap !== near ? swap : rng.pick(neighbours.filter((x) => x !== near));
  return rng.shuffle([target, near, third]);
}

function islandGrid(rng: Rng): IslandMission {
  const start = rng.int(0, CELLS - 1);
  const features = scatter(rng, {}, start, 7);
  const present = FEATURES.filter((f) => features[f] !== undefined);
  const targetFeature = rng.pick(present);
  const target = features[targetFeature]!;
  return { kind: "island", mode: "grid", start, target, targetFeature, features, moves: [], legs: [], decoy: null, marked: false, options: gridOptions(target, rng) };
}

// ---------- world ----------

const world = (mode: WorldMode, over: Partial<WorldMission>): WorldMission => ({
  kind: "world", mode, place: null, month: null, flight: null, side: null, ocean: null, start: null, legs: [], stops: [], decoy: null, cardPlaces: [], ...over,
});
const placeOf = (id: string) => placeById(id)!;

/** Every 3-leg trip from `start` along the authored flights, never visiting a continent twice. */
export function tripsFrom(start: ContinentId): { legs: Dir[]; stops: ContinentId[] }[] {
  const out: { legs: Dir[]; stops: ContinentId[] }[] = [];
  const go = (at: ContinentId, legs: Dir[], stops: ContinentId[]) => {
    if (legs.length === 3) return void out.push({ legs, stops });
    for (const f of FLIGHTS.filter((x) => x.from === at)) {
      if (f.to === start || stops.includes(f.to)) continue;
      go(f.to, [...legs, f.dir], [...stops, f.to]);
    }
  };
  go(start, [], []);
  return out;
}
export const TRIP_STARTS: readonly ContinentId[] = CONTINENTS.filter((c) => tripsFrom(c).length > 0);

function worldTrip(rng: Rng): WorldMission {
  const start = rng.pick(TRIP_STARTS);
  const trip = rng.pick(tripsFrom(start));
  const unvisited = CONTINENTS.filter((c) => c !== start && !trip.stops.includes(c));
  // the decoy is where the FIRST leg would go the opposite way, if that's a real flight (the direction swap)
  const swapped = flightFrom(start, OPPOSITE[trip.legs[0]!])?.to;
  const decoy = swapped && unvisited.includes(swapped) ? swapped : rng.pick(unvisited);
  const cardPlaces = [...trip.stops, decoy].map((c) => rng.pick(placesOn(c)));
  return world("trip", { start, legs: trip.legs, stops: trip.stops, decoy, cardPlaces });
}

function worldCards(rng: Rng): WorldMission {
  const cs = rng.shuffle([...CONTINENTS]).slice(0, 3);
  return world("cards", { cardPlaces: cs.map((c) => rng.pick(placesOn(c))) });
}
function worldSide(rng: Rng): WorldMission {
  return world("side", { side: rng.pick(SIDES) });
}
function worldSeason(rng: Rng): WorldMission {
  return world("season", { place: placeOf(rng.pick(SEASON_PLACES)), month: rng.pick(MONTHS) });
}

function missionFor(level: number, rng: Rng, index: number): Mission {
  switch (level) {
    case 0:
    case 1:
      return islandStep(level, rng, index);
    case 2:
      return islandRoute(rng);
    case 3:
      return islandKey(rng);
    case 4:
      return islandGrid(rng);
    case 5: {
      const c = CONTINENT_ORDER[index % CONTINENT_ORDER.length]!;
      return world("continent", { place: rng.pick(placesOn(c)) });
    }
    case 6:
      return world("ocean", { ocean: OCEAN_ORDER[index % OCEAN_ORDER.length]! });
    case 7:
      return index % 2 === 0 ? world("fly", { flight: rng.pick(FLIGHTS) }) : worldSide(rng);
    case 8: {
      if (index % 2 === 0) {
        const hemi = rng.pick<"n" | "s">(["n", "s"]);
        return world("hemi", { place: placeOf(rng.pick(HEMI_PLACES.filter((id) => placeOf(id).hemi === hemi))) });
      }
      return worldSeason(rng);
    }
    default: {
      if (index % 2 === 0) return worldTrip(rng);
      const k = (index >> 1) % 3;
      return k === 0 ? worldCards(rng) : k === 1 ? worldSide(rng) : worldSeason(rng);
    }
  }
}

function idPart(m: Mission): string {
  if (m.kind === "island") {
    if (m.mode === "step" || m.mode === "route") return `${m.mode}-${m.moves.join("")}`;
    return `${m.mode}-${m.targetFeature}`;
  }
  switch (m.mode) {
    case "continent":
    case "hemi":
    case "season":
      return `${m.mode}-${m.place!.id}`;
    case "ocean":
      return `ocean-${m.ocean}`;
    case "fly":
      return `fly-${m.flight!.from}-${m.flight!.dir}`;
    case "side":
      return `side-${m.side!.continent}-${m.side!.dir}`;
    case "trip":
      return `trip-${m.start}-${m.legs.join("")}`;
    case "cards":
      return "cards";
  }
}

export const generatePostcardTrip: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(PC_MAX_LEVEL, level));
  const m = missionFor(lv, rng, index);
  return exerciseFor(m, { id: `pc-${idPart(m)}-l${lv}n${index}`, seed: rng.int(1, 1_000_000) });
};

/** The tutorial (level 0 only): Yonder is one step south of the lighthouse; the hand points at North. */
export const TUTORIAL_MISSION: IslandMission = {
  kind: "island", mode: "step", start: cellAt(1, 2), target: cellAt(0, 2), targetFeature: "lighthouse",
  features: { lighthouse: cellAt(0, 2), forest: cellAt(2, 4), house: cellAt(3, 1), cave: cellAt(4, 4), beach: cellAt(5, 2), lake: cellAt(2, 0) },
  moves: ["n"], legs: [{ d: "n", n: 1 }], decoy: null, marked: true, options: [],
};

/** Helper for the board/tests: does this list of moves reach the destination? (any order of the same steps works) */
export function reaches(m: IslandMission, moves: readonly Dir[]): boolean {
  const w = walk(m.start, moves);
  return w.bump < 0 && w.end === m.target && moves.length === m.moves.length;
}
export { cap };
