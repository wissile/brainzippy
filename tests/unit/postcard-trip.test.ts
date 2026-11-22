import { describe, expect, it } from "vitest";
import { checkRegistry, getSkill, getWorld } from "../../src/content";
import { createRng } from "../../src/engine/rng";
import { buildRound } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { isSubmittable, lintExercise, validateAnswer } from "../../src/engine/validation";
import type { Exercise } from "../../src/engine/types";
import { explainFor, hintLineFor, modelSteps, praiseFor } from "../../src/games/postcard-trip/coach";
import { postcardTrip, tripTutorial } from "../../src/games/postcard-trip/definition";
import {
  ANCHOR, CONTINENTS, CONTINENT_NAME, DIRS, DIR_WORD, FLIGHTS, type LonLat, MAP_H, MAP_W, OCEANS, OCEAN_NAME, PACIFIC_WEST, PLACES, SIDES,
  continentAt, flightFrom, isOcean, oceanAt, project,
} from "../../src/games/postcard-trip/geo";
import {
  CONTINENT_ORDER, HEMI_PLACES, LEVELS, MONTHS, PC_MAX_LEVEL, SEASON_PLACES, TRIP_STARTS, type IslandMission, type Mission, type WorldMission,
  cardId, decodeMission, encodeMission, generatePostcardTrip, gridOptions, reaches, sayName, seasonOf, tripsFrom,
} from "../../src/games/postcard-trip/generator";
import { COASTAL, COLS, FEATURES, LOOKALIKE, ROWS, isEdge, rc, refOf, step, transposed, walk } from "../../src/games/postcard-trip/island";
import { tripBetween, tripIntro, tripOutro } from "../../src/games/postcard-trip/story";
import voice from "../../src/games/postcard-trip/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = 60;
const levelItems = (level: number, seeds = SEEDS) =>
  Array.from({ length: seeds }, (_, s) => ({ ...generatePostcardTrip(level, createRng(4000 + s * 13 + level), s), difficulty: level + 1 }) as Exercise);
const all = () => Array.from({ length: PC_MAX_LEVEL + 1 }, (_, l) => levelItems(l)).flat();
const sample = (a: LonLat, b: LonLat, n = 60): LonLat[] => Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n] as LonLat);

describe("the world map data (docs/worlds/postcard-trip.md §6)", () => {
  it("projects north up and east right, Equal Earth bounds", () => {
    expect(MAP_W).toBe(541);
    expect(MAP_H).toBe(263);
    const [x0, y0] = project([0, 0]);
    expect(Math.abs(x0 - MAP_W / 2)).toBeLessThan(1);
    expect(Math.abs(y0 - MAP_H / 2)).toBeLessThan(1);
    expect(project([0, 45])[1]).toBeLessThan(y0);
    expect(project([90, 0])[0]).toBeGreaterThan(x0);
    // parallels are straight: same latitude, same y
    expect(project([-120, 30])[1]).toBe(project([150, 30])[1]);
  });
  it("every continent and ocean label sits inside its own region", () => {
    for (const c of CONTINENTS) expect(continentAt(ANCHOR[c]), c).toBe(c);
    for (const o of OCEANS) expect(oceanAt(ANCHOR[o]), o).toBe(o);
    expect(oceanAt(PACIFIC_WEST)).toBe("pacific");
  });
  it("every postcard place is on its continent (the reef is in the sea just off Australia)", () => {
    for (const p of PLACES) {
      if (p.id === "reef") {
        expect(oceanAt(p.at)).toBe("pacific");
        expect(continentAt([p.at[0] - 2, p.at[1]])).toBe("australia");
      } else expect(continentAt(p.at), p.id).toBe(p.continent);
    }
    expect(new Set(PLACES.map((p) => p.continent)).size).toBe(7);
  });
  it("hemispheres in the place table match the latitude, with no place near the equator asked about", () => {
    for (const p of PLACES) {
      if (p.hemi === null) expect(Math.abs(p.at[1]), p.id).toBeLessThan(12);
      else {
        expect(Math.abs(p.at[1]), p.id).toBeGreaterThanOrEqual(12);
        expect(p.hemi, p.id).toBe(p.at[1] > 0 ? "n" : "s");
      }
    }
  });
  it("every flight is a straight compass line from its continent to its continent, crossing the ocean it names", () => {
    const pairs = new Set<string>();
    const ways = new Set<string>();
    for (const f of FLIGHTS) {
      const tag = `${f.from}-${f.dir}-${f.to}`;
      expect(continentAt(f.a), tag).toBe(f.from);
      expect(continentAt(f.b), tag).toBe(f.to);
      if (f.dir === "e" || f.dir === "w") {
        expect(f.a[1], tag).toBe(f.b[1]);
        expect(Math.sign(f.b[0] - f.a[0]), tag).toBe(f.dir === "e" ? 1 : -1);
      } else {
        expect(f.a[0], tag).toBe(f.b[0]);
        expect(Math.sign(f.b[1] - f.a[1]), tag).toBe(f.dir === "n" ? 1 : -1);
      }
      expect(Math.abs(f.b[0] - f.a[0]), `${tag} never crosses the map edge`).toBeLessThan(180);
      const seen = new Set(sample(f.a, f.b).map((p) => oceanAt(p)).filter(Boolean));
      if (f.via) expect(seen.has(f.via), tag).toBe(true);
      expect(f.to).not.toBe(f.from);
      pairs.add(`${f.from}>${f.to}`);
      ways.add(`${f.from}>${f.dir}`);
    }
    expect(pairs.size).toBe(FLIGHTS.length); // "which way from A to B?" has one answer
    expect(ways.size).toBe(FLIGHTS.length); // and each way from A leads to one place
  });
  it("every ocean side: the boat is in that ocean, on that side of the continent", () => {
    for (const s of SIDES) {
      const tag = `${s.continent}-${s.dir}`;
      expect(oceanAt(s.boat), tag).toBe(s.ocean);
      const a = ANCHOR[s.continent];
      if (s.dir === "e") expect(s.boat[0], tag).toBeGreaterThan(a[0]);
      if (s.dir === "w") expect(s.boat[0], tag).toBeLessThan(a[0]);
      if (s.dir === "n") expect(s.boat[1], tag).toBeGreaterThan(a[1]);
      if (s.dir === "s") expect(s.boat[1], tag).toBeLessThan(a[1]);
    }
    expect(new Set(SIDES.map((s) => `${s.continent}-${s.dir}`)).size).toBe(SIDES.length);
  });
  it("there are trips from six continents, and every trip follows real flights without repeats", () => {
    expect([...TRIP_STARTS].sort()).toEqual(["africa", "asia", "australia", "europe", "na", "sa"]);
    for (const c of TRIP_STARTS) {
      for (const t of tripsFrom(c)) {
        let at = c;
        t.legs.forEach((d, i) => {
          const f = flightFrom(at, d)!;
          expect(f.to).toBe(t.stops[i]);
          at = f.to;
        });
        expect(new Set([c, ...t.stops]).size).toBe(4);
      }
    }
  });
});

describe("the island grid", () => {
  it("moves, edges, references and the row/column swap", () => {
    expect(COLS * ROWS).toBe(36);
    expect(step(0, "n")).toBe(-1);
    expect(step(0, "e")).toBe(1);
    expect(step(0, "s")).toBe(6);
    expect(refOf(0)).toBe("A1");
    expect(refOf(14)).toBe("C3");
    expect(refOf(transposed(rc(1 * 6 + 4)[0] * 6 + 4))).toBe("B5"); // E2 ↔ B5
    expect(walk(14, ["n", "n", "n"])).toEqual({ cells: [14, 8, 2], bump: 2, end: 2 });
  });
});

describe("generator", () => {
  it("has 10 levels (maxLevel 9) and is deterministic", () => {
    expect(LEVELS.length).toBe(10);
    expect(postcardTrip.progression.maxLevel).toBe(9);
    for (let level = 0; level <= PC_MAX_LEVEL; level++) {
      const a = buildRound(postcardTrip, { level, seed: 777 });
      const b = buildRound(postcardTrip, { level, seed: 777 });
      expect(a.exercises.map((e) => e.id)).toEqual(b.exercises.map((e) => e.id));
      expect(a.exercises).toEqual(b.exercises);
    }
  });
  it("every level × 60 seeds lints, uses a declared skill, and round-trips through params", () => {
    for (const ex of all()) {
      expect(lintExercise(ex), ex.id).toEqual([]);
      expect(getSkill(ex.skillId), ex.skillId).toBeDefined();
      expect(postcardTrip.skillIds).toContain(ex.skillId);
      const m = decodeMission(ex);
      expect(encodeMission(m), ex.id).toEqual(ex.params);
    }
    expect(lintExercise(tripTutorial)).toEqual([]);
  });
  it("every level offers the mission kinds in its table", () => {
    for (let level = 0; level <= PC_MAX_LEVEL; level++) {
      const modes = new Set(levelItems(level).map((ex) => decodeMission(ex).mode));
      expect([...modes].sort(), `level ${level}`).toEqual([...LEVELS[level]!.modes].sort());
    }
  });
});

/** The answer a correct child gives, derived independently from the mission's map data. */
function solve(m: Mission): unknown {
  if (m.kind === "island") {
    if (m.mode === "step" || m.mode === "route") return reaches(m, m.moves) ? ["start", "goal"] : null;
    if (m.mode === "key") return FEATURES.find((f) => m.features[f] === m.target);
    return refOf(m.target).toLowerCase();
  }
  switch (m.mode) {
    case "continent":
      return continentAt(m.place!.at) ?? "australia";
    case "ocean":
      return m.ocean;
    case "fly":
      return DIRS.find((d) => flightFrom(m.flight!.from, d)?.to === m.flight!.to);
    case "side":
      return oceanAt(m.side!.boat);
    case "hemi":
      return m.place!.at[1] > 0 ? "north" : "south";
    case "season":
      return (m.place!.at[1] > 0) === (m.month === "July") ? "summer" : "winter";
    case "trip": {
      let at = m.start!;
      return m.legs.map((d) => cardId((at = flightFrom(at, d)!.to)));
    }
    case "cards":
      return Object.fromEntries(m.cardPlaces.map((p) => [`card-${p.id}`, continentAt(p.at) ?? "australia"]));
  }
}

describe("every generated mission has one correct, reachable answer", () => {
  it("the independent solver's answer is accepted by the engine, for every level × 60 seeds", () => {
    for (const ex of [tripTutorial, ...all()]) {
      const m = decodeMission(ex);
      const v = solve(m);
      expect(v, ex.id).not.toBeNull();
      expect(validateAnswer(ex.answer, v as never).correct, ex.id).toBe(true);
    }
  });
  it("island steering: the route stays on the island and ends on the named place; the decoy sits the opposite way", () => {
    for (const level of [0, 1, 2]) {
      const items = levelItems(level).map((ex) => decodeMission(ex) as IslandMission);
      for (const m of items) {
        const w = walk(m.start, m.moves);
        expect(w.bump).toBe(-1);
        expect(w.end).toBe(m.target);
        expect(m.features[m.targetFeature]).toBe(m.target);
        expect(m.start).not.toBe(m.target);
        expect(Object.values(m.features)).not.toContain(m.start);
        expect(new Set(Object.values(m.features)).size).toBe(Object.keys(m.features).length);
        for (const f of COASTAL) if (m.features[f] !== undefined) expect(isEdge(m.features[f]!), f).toBe(true);
        expect(m.marked).toBe(level === 0);
        if (level === 1) {
          const opp = { n: "s", s: "n", e: "w", w: "e" } as const;
          expect(m.features[m.decoy!]).toBe(step(m.start, opp[m.moves[0]!]));
          expect(reaches(m, [opp[m.moves[0]!]])).toBe(false); // the swapped direction is a real, wrong place
        }
        if (level === 2) {
          expect(m.legs).toHaveLength(2);
          expect(m.moves.length).toBeGreaterThanOrEqual(2);
          expect(m.moves.length).toBeLessThanOrEqual(4);
          const [a, b] = [m.legs[0]!, m.legs[1]!];
          expect((a.d === "n" || a.d === "s") !== (b.d === "n" || b.d === "s")).toBe(true);
          expect(reaches(m, [...m.moves].reverse())).toBe(true); // any order of the same steps arrives too
        }
      }
    }
  });
  it("level 1 is at least half east/west (the swap the spec targets)", () => {
    const items = levelItems(1).map((ex) => decodeMission(ex) as IslandMission);
    const ew = items.filter((m) => m.moves[0] === "e" || m.moves[0] === "w").length;
    expect(ew / items.length).toBeGreaterThanOrEqual(0.5);
  });
  it("key missions always show a look-alike symbol; grid options are the answer, one off by one, and the swap", () => {
    for (const ex of levelItems(3)) {
      const m = decodeMission(ex) as IslandMission;
      expect(m.features[LOOKALIKE[m.targetFeature]]).toBeDefined();
      expect(ex.answer.kind === "choice" && ex.answer.options.map((o) => o.id)).toContain(m.targetFeature);
    }
    for (const ex of levelItems(4)) {
      const m = decodeMission(ex) as IslandMission;
      expect(new Set(m.options).size).toBe(3);
      expect(m.options).toContain(m.target);
      for (const c of m.options) expect(c >= 0 && c < 36).toBe(true);
      const [r, c] = rc(m.target);
      const swap = transposed(m.target);
      if (swap !== m.target) expect(m.options).toContain(swap);
      const near = m.options.filter((o) => o !== m.target && o !== swap);
      for (const o of near) {
        const [r2, c2] = rc(o);
        expect(Math.abs(r2 - r) + Math.abs(c2 - c)).toBe(1);
      }
    }
    const rng = createRng(5);
    expect(gridOptions(0, rng)).toContain(0); // corner: still three distinct options
  });
  it("level 5 rotates continents: a round of 8 covers all 7, none more than twice", () => {
    const round = levelItems(5, 8).map((ex) => (decodeMission(ex) as WorldMission).place!.continent);
    expect(new Set(round).size).toBe(7);
    for (const c of CONTINENTS) expect(round.filter((x) => x === c).length).toBeLessThanOrEqual(2);
    expect(CONTINENT_ORDER.slice(0, 2)).toEqual(["europe", "asia"]);
  });
  it("trips: the decoy is never on the route; season and equator places stay inside their voice lists", () => {
    for (const ex of [...levelItems(8), ...levelItems(9)]) {
      const m = decodeMission(ex) as WorldMission;
      if (m.mode === "trip") {
        expect(m.stops).not.toContain(m.decoy);
        expect(m.decoy).not.toBe(m.start);
        expect(m.cardPlaces.map((p) => p.continent)).toEqual([...m.stops, m.decoy]);
      }
      if (m.mode === "hemi") expect(HEMI_PLACES).toContain(m.place!.id);
      if (m.mode === "season") {
        expect(SEASON_PLACES).toContain(m.place!.id);
        expect(seasonOf(m.place!, m.month!)).toBe((m.place!.hemi === "n") === (m.month === "July") ? "summer" : "winter");
      }
      if (m.mode === "cards") expect(new Set(m.cardPlaces.map((p) => p.continent)).size).toBe(3);
    }
  });
});

describe("engine flow: misses are never punished, the ladder ends in a model", () => {
  it("steering: a wrong walk is a miss; malformed submissions are ignored", () => {
    const ex = tripTutorial;
    expect(isSubmittable(ex.answer, [])).toBe(false);
    let s = initExercise(ex);
    s = exerciseReducer(s, { type: "SUBMIT", value: [] });
    expect(s.attempts).toBe(0);
    s = exerciseReducer(s, { type: "SUBMIT", value: ["start"] });
    expect(s.feedback?.correct).toBe(false);
    expect(s.hintStage).toBe(1);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: ["start"] });
    expect(s.hintStage).toBe(2);
    expect(modelSteps(ex)).toBe(1);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: ["start", "goal"] });
    expect(s.feedback?.correct).toBe(true);
  });
  it("choice: the first miss greys the wrong place out, the second shows the right one", () => {
    const ex = levelItems(5)[0]!;
    const right = (ex.answer as { correct: string }).correct;
    const wrong = CONTINENTS.find((c) => c !== right)!;
    let s = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong });
    expect(s.eliminated).toContain(wrong);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    s = exerciseReducer(s, { type: "SUBMIT", value: wrong }); // greyed out: ignored, not a second miss
    expect(s.attempts).toBe(1);
    const other = CONTINENTS.find((c) => c !== right && c !== wrong)!;
    s = exerciseReducer(exerciseReducer(s, { type: "SUBMIT", value: other }), { type: "FEEDBACK_DONE" });
    expect(s.model).toBe(right);
  });
  it("trip and cards: wrong parts are marked so right cards can stay", () => {
    const trip = levelItems(9).find((ex) => decodeMission(ex).mode === "trip")!;
    const m = decodeMission(trip) as WorldMission;
    const order = trip.answer.kind === "sequence" ? trip.answer.order : [];
    const swapped = [order[0]!, cardId(m.decoy!), order[2]!];
    const r = validateAnswer(trip.answer, swapped);
    expect(r.correct).toBe(false);
    expect(r.parts).toEqual({ 0: true, 1: false, 2: true });
    const cards = levelItems(9).find((ex) => decodeMission(ex).mode === "cards")!;
    const cm = decodeMission(cards) as WorldMission;
    const bad = Object.fromEntries(cm.cardPlaces.map((p, i) => [`card-${p.id}`, i === 0 ? (p.continent === "asia" ? "europe" : "asia") : p.continent]));
    const rc2 = validateAnswer(cards.answer, bad);
    expect(rc2.correct).toBe(false);
    expect(hintLineFor(cm, { lastAnswer: bad, check: rc2 }, null)).toBe(`pc.where.${cm.cardPlaces[0]!.continent}`);
  });
  it("Zephy names the misconception: the look-alike symbol, the opposite direction", () => {
    const key = levelItems(3)[0]!;
    const km = decodeMission(key) as IslandMission;
    expect(hintLineFor(km, { lastAnswer: LOOKALIKE[km.targetFeature], check: null }, null)).toBe("pc.help.lookalike");
    expect(hintLineFor(decodeMission(tripTutorial), { lastAnswer: ["start"], check: null }, "pc.help.opposite")).toBe("pc.help.opposite");
  });
});

describe("voice", () => {
  const used = new Set<string>();
  const check = (id: string, vars: Record<string, string | number> = {}) => {
    used.add(id);
    const line = lines[id];
    expect(line, id).toBeDefined();
    for (const [k, v] of Object.entries(vars)) {
      if (!line!.text.includes(`{${k}}`)) continue;
      expect(line!.vary?.[k], `${id}.${k}`).toContain(v);
    }
  };
  it("every prompt, praise, hint and card line the content can produce is in voice.json with its variants", () => {
    for (const ex of [tripTutorial, ...all()]) {
      check(ex.prompt!.line, ex.prompt!.vars as Record<string, string | number>);
      for (const p of praiseFor(ex)) check(p);
      check(explainFor(ex));
      const m = decodeMission(ex);
      if (ex.answer.kind === "choice") for (const o of ex.answer.options) if (o.say) check(o.say);
      if (ex.answer.kind === "match") for (const o of ex.answer.items) check(o.say!);
      if (m.kind === "world" && m.mode === "trip") {
        m.legs.forEach((d, i) => check(i === 0 ? "pc.leg.first" : "pc.leg.then", { dir: DIR_WORD[d] }));
        for (const c of [...m.stops, m.decoy!]) check(`pc.cont.${c}`);
      }
      check(hintLineFor(m, { lastAnswer: null, check: null }, null));
    }
    for (const id of ["pc.help.opposite", "pc.help.turn", "pc.help.edge", "pc.help.route", "pc.help.land", "pc.help.lookalike", "pc.retry", "pc.hint.model", "pc.hint.modelTap", "pc.idle", "pc.walk.go", "pc.walk.full", "pc.ready", "pc.back"]) check(id);
    for (const c of CONTINENTS) check(`pc.where.${c}`);
    for (const o of OCEANS) check(`pc.where.${o}`);
    for (const f of FEATURES) check(`pc.sym.${f}`);
    for (const d of DIRS) check(`pc.dir.${d}`);
    for (const b of [...tripIntro, ...tripOutro, ...Object.values(tripBetween)]) check(b.line);
  });
  it("vary lists are complete and small; lines are short and praise process, not ability", () => {
    expect(lines["pc.prompt.hemi"]!.vary!.place).toEqual(HEMI_PLACES.map((id) => sayName(PLACES.find((p) => p.id === id)!)));
    expect(lines["pc.prompt.season"]!.vary!.month).toEqual([...MONTHS]);
    expect(lines["pc.prompt.fly"]!.vary!.to).toEqual(CONTINENTS.map((c) => CONTINENT_NAME[c]));
    expect(lines["pc.prompt.ocean"]!.vary!.ocean).toEqual(OCEANS.map((o) => OCEAN_NAME[o]));
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("pc."), id).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|weird|strange|exotic/);
      const combos = l.vary ? Object.values(l.vary).reduce((a, v) => a * v.length, 1) : 1;
      expect(combos, id).toBeLessThan(150);
    }
  });
});

describe("registry", () => {
  it("the geo library is live with Yonder's Postcard Trip, and the registry is clean", () => {
    expect(checkRegistry()).toEqual([]);
    const w = getWorld("postcard-trip")!;
    expect(w.subject).toBe("geo");
    expect(w.maxLevel).toBe(PC_MAX_LEVEL);
    expect(w.characters[0]).toBe("yonder");
    expect(isOcean("pacific")).toBe(true);
  });
});
