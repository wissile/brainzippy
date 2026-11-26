import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise, type ExerciseState } from "../../src/engine/session";
import type { AnswerValue, Exercise } from "../../src/engine/types";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { airportTutorial, busyAirport } from "../../src/games/busy-airport/definition";
import {
  BA_LEVELS, BA_MAX_LEVEL, BLANK, COLOURS, CORES, MAX_PASSENGERS, SIGNALS, countChoices, crewFor, generateBusyAirport, modeOf, parseArt,
  ruleOf, runwayOf, signalsOf, type Mode,
} from "../../src/games/busy-airport/generator";
import { alongSayFor, alongStepsFor, explainFor, hintFor, praiseFor } from "../../src/games/busy-airport/hints";
import { gridFor } from "../../src/games/busy-airport/shared";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 5);
const RL = busyAirport.progression.roundLength;
const all: Exercise[] = [];
for (const seed of SEEDS) for (let level = 0; level <= BA_MAX_LEVEL; level++) all.push(...generateBand(busyAirport, level, seed, RL));
const levelOf = (ex: Exercise) => Number(/-l(\d+)n\d+$/.exec(ex.id)![1]);
const byMode = (m: Mode) => all.filter((e) => modeOf(e) === m);
/** Submit and finish the feedback presentation (what the runner does after praise / hints). */
const submit = (s: ExerciseState, value: AnswerValue) => exerciseReducer(exerciseReducer(s, { type: "SUBMIT", value }), { type: "FEEDBACK_DONE" });

describe("Busy Airport: levels, generator and determinism", () => {
  it("9 levels (maxLevel 8), one authored tutorial at difficulty 1 that lints", () => {
    expect(BA_LEVELS).toHaveLength(9);
    expect(busyAirport.progression.maxLevel).toBe(8);
    expect(busyAirport.exercises.filter((e) => e.tutorial)).toEqual([airportTutorial]);
    expect(airportTutorial.difficulty).toBe(1);
    expect(lintExercise(airportTutorial)).toEqual([]);
    expect(validateAnswer(airportTutorial.answer, { b1: "p2", b2: "p1" }).correct).toBe(true);
  });

  it("level 0 plays only Bag Drop; each later level unlocks one more inner game, and all four are live from level 3", () => {
    expect(BA_LEVELS[0]!.games).toEqual(["bags"]);
    const games = (l: number) => new Set(BA_LEVELS[l]!.games.map((m) => (m === "make" ? "count" : m)));
    for (let l = 1; l <= 3; l++) expect(games(l).size, `level ${l}`).toBe(games(l - 1).size + 1);
    for (let l = 3; l <= BA_MAX_LEVEL; l++) expect(games(l).size, `level ${l}`).toBe(4);
    // a round's 8 items rotate through every game the level has
    for (let l = 0; l <= BA_MAX_LEVEL; l++) {
      const modes = new Set(generateBand(busyAirport, l, 1, RL).map(modeOf));
      expect([...modes].sort(), `level ${l}`).toEqual([...new Set(BA_LEVELS[l]!.games)].sort());
    }
  });

  it(`every generated exercise (9 levels × 50 seeds × ${RL}) lints, has a declared skill, and difficulty = level + 1`, () => {
    const problems: string[] = [];
    for (const ex of all) {
      problems.push(...lintExercise(ex));
      if (!busyAirport.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill ${ex.skillId}`);
      if (ex.difficulty !== levelOf(ex) + 1) problems.push(`${ex.id}: difficulty`);
      if (!BA_LEVELS[levelOf(ex)]!.games.includes(modeOf(ex))) problems.push(`${ex.id}: mode not unlocked at its level`);
      if (ex.ages[0] !== 3 || ex.ages[1] !== 5) problems.push(`${ex.id}: ages`);
    }
    for (const seed of SEEDS.slice(0, 10)) for (let level = 0; level <= BA_MAX_LEVEL; level++) for (const ex of buildRound(busyAirport, { level, seed }).exercises) problems.push(...lintExercise(ex));
    expect(problems).toEqual([]);
  });

  it("is deterministic: same (level, seed) → same round; the generator is pure", () => {
    for (let level = 0; level <= BA_MAX_LEVEL; level++) {
      expect(buildRound(busyAirport, { level, seed: 9 })).toEqual(buildRound(busyAirport, { level, seed: 9 }));
      expect(buildRound(busyAirport, { level, seed: 9 }).exercises).not.toEqual(buildRound(busyAirport, { level, seed: 10 }).exercises);
      for (let i = 0; i < RL; i++) expect(generateBusyAirport(level, createRng(42), i)).toEqual(generateBusyAirport(level, createRng(42), i));
    }
    expect(crewFor(77, 10)).toEqual(crewFor(77, 10));
    expect(generateBusyAirport(99, createRng(1), 0).id).toMatch(/-l8n0$/); // out-of-range levels clamp
  });
});

describe("Busy Airport: content is right at every level", () => {
  it("Bag Drop: each bag matches exactly one plane by the level's rule, and colour never decides a shape sort", () => {
    let shapeColourMismatch = 0;
    for (const ex of [airportTutorial, ...byMode("bags")]) {
      if (ex.answer.kind !== "match") throw new Error("match");
      const rule = ruleOf(ex);
      const { pairs, items, targets } = ex.answer;
      const planes = targets.map((t) => ({ id: t.id, ...parseArt(t.art) }));
      for (const it of items) {
        const bag = parseArt(it.art);
        const fits = planes.filter((p) => (rule === "colour" ? p.colour === bag.colour : rule === "shape" ? p.tag === bag.tag : p.colour === bag.colour && p.tag === bag.tag));
        expect(fits.map((p) => p.id), `${ex.id} ${it.id}`).toEqual([pairs[it.id]]);
        if (rule === "shape" && bag.colour !== parseArt(items[0]!.art).colour) shapeColourMismatch++;
      }
      if (rule === "colour") expect(new Set(planes.map((p) => p.colour)).size).toBe(planes.length);
      if (rule === "shape") expect(planes.every((p) => p.colour === "white")).toBe(true);
      // no plane is left empty when there are at least as many bags as planes
      if (items.length >= targets.length) expect(new Set(Object.values(pairs)).size, ex.id).toBe(targets.length);
      const level = ex.tutorial ? 0 : levelOf(ex);
      const spec = BA_LEVELS[level]!.bags;
      expect(rule).toBe(spec.rule);
      expect(targets).toHaveLength(spec.planes);
      expect(items.length).toBeGreaterThanOrEqual(spec.bags[0]);
      expect(items.length).toBeLessThanOrEqual(spec.bags[1]);
    }
    expect(shapeColourMismatch).toBeGreaterThan(20); // bags of one shape sort come in different colours
  });

  it("All Aboard: counts stay in the level range (1–10), choices are three neighbours, make-a-set leaves extras", () => {
    for (const ex of byMode("count")) {
      if (ex.answer.kind !== "number") throw new Error("number");
      const [lo, hi] = BA_LEVELS[levelOf(ex)]!.count;
      expect(ex.answer.value).toBeGreaterThanOrEqual(lo);
      expect(ex.answer.value).toBeLessThanOrEqual(hi);
      expect(ex.answer.choices).toEqual(countChoices(ex.answer.value));
      expect(ex.params?.n).toBe(ex.answer.value);
    }
    for (let n = 1; n <= 10; n++) {
      const c = countChoices(n);
      expect(c).toContain(n);
      expect(c[2]! - c[0]!).toBe(2);
      expect(c[0]).toBeGreaterThanOrEqual(1);
      expect(c[2]).toBeLessThanOrEqual(10);
    }
    for (const ex of byMode("make")) {
      if (ex.answer.kind !== "number") throw new Error("number");
      const n = ex.answer.value;
      const [lo, hi] = BA_LEVELS[levelOf(ex)]!.make;
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
      expect(ex.answer.choices).toBeUndefined();
      expect(ex.params!.pool!).toBeGreaterThanOrEqual(n + 2);
      expect(ex.params!.pool!).toBeLessThanOrEqual(MAX_PASSENGERS);
    }
    for (const who of crewFor(5, 10)) expect(who).toBeGreaterThanOrEqual(0), expect(who).toBeLessThan(6);
    expect(new Set(crewFor(5, 6)).size).toBe(6); // every six passengers are the whole Crew
  });

  it("Runway Lights: the answer continues the repeating pattern; two full repeats show first; the odd bulb never fits", () => {
    for (const ex of byMode("lights")) {
      const runway = runwayOf(ex);
      const core = CORES[ex.params!.core!]!;
      const c = core.length;
      const gaps = runway.map((v, i) => (v === BLANK ? i : -1)).filter((i) => i >= 0);
      expect(runway.length, ex.id).toBeLessThanOrEqual(9);
      expect(gaps.length).toBe(ex.params!.blanks);
      // the shown lights follow one consistent letter → colour mapping of the core
      const map = new Map<string, number>();
      runway.forEach((v, i) => {
        if (v === BLANK) return;
        const ch = core[i % c]!;
        if (map.has(ch)) expect(map.get(ch), ex.id).toBe(v);
        else map.set(ch, v);
      });
      expect(new Set(map.values()).size, ex.id).toBe(new Set(core).size);
      const want = gaps.map((g) => COLOURS[map.get(core[g % c]!)!]!);
      if (ex.params!.middle) {
        expect(gaps[0]!).toBeGreaterThanOrEqual(c);
        expect(gaps[0]!).toBeLessThan(runway.length - 1);
      } else {
        expect(gaps[0]!, ex.id).toBeGreaterThanOrEqual(2 * c);
        expect(gaps.at(-1)).toBe(runway.length - 1);
      }
      if (ex.answer.kind === "choice") {
        expect(gaps).toHaveLength(1);
        expect(ex.answer.options.find((o) => o.id === (ex.answer as { correct: string }).correct)!.text).toBe(want[0]);
        expect(new Set(ex.answer.options.map((o) => o.text)).size).toBe(ex.answer.options.length);
      } else if (ex.answer.kind === "sequence") {
        const a = ex.answer;
        expect(a.order.map((id) => a.pieces.find((p) => p.id === id)!.text)).toEqual(want);
        const odd = a.pieces.filter((p) => !a.order.includes(p.id));
        expect(odd).toHaveLength(1);
        expect(want).not.toContain(odd[0]!.text);
      } else throw new Error(ex.id);
    }
  });

  it("Marshaller: the signal comes from the level's set; two-signal plans use two different moves", () => {
    for (const ex of byMode("signal")) {
      const spec = BA_LEVELS[levelOf(ex)]!.signal;
      const sig = signalsOf(ex);
      expect(sig).toHaveLength(spec.steps);
      for (const s of sig) expect(spec.set).toContain(s);
      if (sig.length === 2) expect(sig[0]).not.toBe(sig[1]);
      const opts = ex.answer.kind === "choice" ? ex.answer.options : ex.answer.kind === "sequence" ? ex.answer.pieces : [];
      expect(opts.map((o) => o.id)).toEqual(SIGNALS.filter((s) => spec.set.includes(s)));
      if (ex.answer.kind === "choice") expect(ex.answer.correct).toBe(sig[0]);
      if (ex.answer.kind === "sequence") expect(ex.answer.order).toEqual(sig);
    }
    // across a band both turns appear, so left/right is never a fixed pattern
    const l3 = SEEDS.flatMap((s) => generateBand(busyAirport, 3, s, RL)).filter((e) => modeOf(e) === "signal").map((e) => signalsOf(e)[0]);
    expect(new Set(l3)).toEqual(new Set(["left", "right"]));
  });
});

describe("Busy Airport: voice, hints and the feedback ladder", () => {
  it("prompts use catalogued lines; vary lists cover every value; the caption matches the on-screen text", () => {
    for (const ex of [airportTutorial, ...all]) {
      const line = VOICE_LINES[ex.prompt!.line];
      expect(line, ex.id).toBeDefined();
      for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values, `${ex.id} ${k}`).toContain(ex.prompt!.vars![k]);
      expect(renderLine(ex.prompt!.line, (ex.prompt!.vars ?? {}) as Record<string, number>)).toBe(ex.prompt!.text);
    }
  });

  it("helper, hint and praise lines exist for every exercise, and praise vary lists cover every number", () => {
    for (const ex of all) {
      expect(VOICE_LINES[explainFor(ex)], ex.id).toBeDefined();
      const s = initExercise(ex);
      expect(VOICE_LINES[hintFor({ ...s, check: { correct: false, reason: "too-high" } })], ex.id).toBeDefined();
      for (const id of praiseFor(ex)) {
        const line = VOICE_LINES[id];
        expect(line, id).toBeDefined();
        for (const values of Object.values(line!.vary ?? {})) if (ex.answer.kind === "number") expect(values, `${id} ${ex.id}`).toContain(ex.answer.value);
      }
    }
  });

  it("every line is short, warm and praises process (≤ 14 words, never 'smart' or 'clever')", () => {
    const own = JSON.parse(readFileSync("src/games/busy-airport/voice.json", "utf8")) as { lines: Record<string, { text: string }> };
    for (const [id, l] of Object.entries(own.lines)) {
      expect(id.startsWith("ba."), id).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|clever|genius|brilliant|wrong!/);
    }
  });

  it("make-a-set: the first miss diagnoses too many or too few; the second miss models exactly n", () => {
    const ex = byMode("make").find((e) => (e.answer as { value: number }).value >= 3)!;
    const n = (ex.answer as { value: number }).value;
    let s = submit(initExercise(ex), n + 1);
    expect(s.hintStage).toBe(1);
    expect(hintFor(s)).toBe("ba.hint.tooMany");
    s = submit(initExercise(ex), n - 1);
    expect(hintFor(s)).toBe("ba.hint.tooFew");
    s = submit(s, n + 2);
    expect(s.hintStage).toBe(2);
    expect(s.model).toBe(n);
    expect(alongStepsFor(ex)).toBe(n);
    expect(alongSayFor(ex, 2)).toBe(3);
    expect(submit(s, n).phase).toBe("solved");
  });

  it("Bag Drop: a miss marks right and wrong bags; the second miss models every pair; half-done or unknown loads are ignored", () => {
    const ex = byMode("bags").find((e) => e.answer.kind === "match" && e.answer.items.length >= 3)!;
    if (ex.answer.kind !== "match") throw new Error("match");
    const { pairs, items, targets } = ex.answer;
    const swapped = Object.fromEntries(items.map((it, i) => [it.id, i === 0 ? targets.find((t) => t.id !== pairs[it.id])!.id : pairs[it.id]!]));
    let s = submit(initExercise(ex), swapped);
    expect(s.hintStage).toBe(1);
    expect(s.check?.parts?.[items[0]!.id]).toBe(false);
    expect(s.check?.parts?.[items[1]!.id]).toBe(true);
    expect(hintFor(s)).toMatch(/^ba\.hint\.bags\./);
    // malformed submissions never count as a try
    const before = s.attempts;
    s = exerciseReducer(s, { type: "SUBMIT", value: { nope: "p1" } });
    expect(s.attempts).toBe(before);
    s = submit(s, swapped);
    expect(s.hintStage).toBe(2);
    expect(s.model).toEqual(pairs);
    expect(alongStepsFor(ex)).toBe(items.length);
    expect(alongSayFor(ex, 0)).toBeNull();
    expect(submit(s, pairs).phase).toBe("solved");
  });

  it("Marshaller and Runway Lights: the wrong pick greys out after the first miss; hints name the signal", () => {
    const stop = all.find((e) => modeOf(e) === "signal" && e.answer.kind === "choice" && e.answer.correct === "stop")!;
    let s = submit(initExercise(stop), "left");
    expect(s.eliminated).toContain("left");
    expect(hintFor(s)).toBe("ba.hint.signal.stop");
    const left = all.find((e) => modeOf(e) === "signal" && e.answer.kind === "choice" && e.answer.correct === "left")!;
    expect(hintFor(submit(initExercise(left), "right"))).toBe("ba.hint.signal.point");
    const two = all.find((e) => modeOf(e) === "signal" && e.answer.kind === "sequence")!;
    expect(explainFor(two)).toBe("ba.help.signal2");
    const lights = all.find((e) => modeOf(e) === "lights" && e.answer.kind === "choice")!;
    if (lights.answer.kind !== "choice") throw new Error("choice");
    const wrongId = lights.answer.options.find((o) => o.id !== (lights.answer as { correct: string }).correct)!.id;
    s = submit(initExercise(lights), wrongId);
    expect(s.eliminated).toEqual([wrongId]);
    expect(exerciseReducer(s, { type: "SUBMIT", value: wrongId })).toBe(s); // a greyed-out bulb can't be picked again
    expect(submit(s, lights.answer.correct).phase).toBe("solved");
  });

  it("sequence lights accept either of two same-colour bulbs (interchangeable by colour)", () => {
    let checked = 0;
    for (const ex of byMode("lights")) {
      const a = ex.answer;
      if (a.kind !== "sequence") continue;
      const text = (id: string) => a.pieces.find((p) => p.id === id)!.text;
      const [x, y] = a.order;
      if (a.order.length < 2 || text(x!) !== text(y!)) continue;
      const swapped = [y!, x!, ...a.order.slice(2)];
      expect(validateAnswer(a, swapped).correct, ex.id).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("gridFor never goes below the 64 px tap target", () => {
    expect(gridFor(10, 300, 100).cell).toBeGreaterThanOrEqual(64);
    expect(gridFor(3, 900, 200).cols).toBe(3);
  });
});
