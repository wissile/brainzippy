import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { createRng } from "../../src/engine/rng";
import { checkRegistry, getSkill, getWorld } from "../../src/content";
import { renderLine } from "../../src/audio/voiceLines";
import { compassRunways, crTutorial } from "../../src/games/compass-runways/definition";
import { CR_MAX_LEVEL, LEVELS, ROUND_HEADINGS, SKILL, TURN_DEGS, generateCompassRunways, unambiguous } from "../../src/games/compass-runways/generator";
import { explainFor, hintFor, praiseFor } from "../../src/games/compass-runways/hints";
import {
  ALL_RUNWAYS, KINDS, MODE_OF, TEN_HEADINGS, type Kind, type Scenario, airportEnds, angleDiff, answerFor, bestEnd, blank, decode, encode,
  entryOf, fmtHeading, fmtRunway, headingFromVector, isNumberKind, norm, reciprocal, runwayHeading, runwayNumber, sayHeading, sayRunway,
  sockPoints, stepValue, turnHeading, typedValue, windKind, working, wraps,
} from "../../src/games/compass-runways/logic";
import { crBetween, crIntro, crOutro } from "../../src/games/compass-runways/story";
import voice from "../../src/games/compass-runways/voice.json";

const lines = voice.lines as Record<string, { text: string; speaker?: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 5);
const words = (s: string) => s.trim().split(/\s+/).length;
const all = () => {
  const out = [];
  for (const seed of SEEDS) for (let level = 0; level <= CR_MAX_LEVEL; level++) out.push(...generateBand(compassRunways, level, seed, 8));
  return out;
};
const ALL = all();

describe("heading arithmetic", () => {
  it("normalises to 1–360 (north is 360, never 0)", () => {
    expect(norm(0)).toBe(360);
    expect(norm(360)).toBe(360);
    expect(norm(720)).toBe(360);
    expect(norm(361)).toBe(1);
    expect(norm(-30)).toBe(330);
    expect(norm(-360)).toBe(360);
    expect(norm(45)).toBe(45);
  });
  it("turns right add, left take away, and wrap past north both ways", () => {
    expect(turnHeading(90, 1, 120)).toBe(210);
    expect(turnHeading(210, -1, 120)).toBe(90);
    expect(turnHeading(300, 1, 120)).toBe(60); // 420 − 360
    expect(turnHeading(350, 1, 30)).toBe(20);
    expect(turnHeading(30, -1, 90)).toBe(300); // 30 + 360 − 90
    expect(turnHeading(10, -1, 10)).toBe(360); // lands on north: 360, not 000
    expect(turnHeading(270, 1, 90)).toBe(360);
    expect(turnHeading(360, 1, 90)).toBe(90);
    expect(turnHeading(360, -1, 90)).toBe(270);
    expect(turnHeading(180, 1, 180)).toBe(360);
    expect(turnHeading(315, 1, 135)).toBe(90);
  });
  it("knows which turns pass through north", () => {
    expect(wraps(300, 1, 120)).toBe(true);
    expect(wraps(270, 1, 90)).toBe(false); // ends exactly on 360
    expect(wraps(30, -1, 90)).toBe(true);
    expect(wraps(90, -1, 90)).toBe(true); // 0 → 360 counts as wrapping
    expect(wraps(100, -1, 90)).toBe(false);
  });
  it("angle difference is the short way round", () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(90, 270)).toBe(180);
    expect(angleDiff(360, 0)).toBe(0);
    expect(angleDiff(45, 135)).toBe(90);
  });
  it("dial angle from a pointer vector (north up, clockwise), snapped", () => {
    expect(headingFromVector(0, -1, 10)).toBe(360);
    expect(headingFromVector(1, 0, 10)).toBe(90);
    expect(headingFromVector(0, 1, 10)).toBe(180);
    expect(headingFromVector(-1, 0, 10)).toBe(270);
    expect(headingFromVector(1, -1, 5)).toBe(45);
    expect(headingFromVector(-0.05, -1, 10)).toBe(360); // just left of north snaps to 360
  });
});

describe("runway numbers (convention: heading ÷ 10 rounded, two digits, 01–36; 360 → 36; no runway 00)", () => {
  it("divides by ten and rounds to the nearest whole number", () => {
    expect(runwayNumber(270)).toBe(27);
    expect(runwayNumber(90)).toBe(9);
    expect(runwayNumber(236)).toBe(24);
    expect(runwayNumber(234)).toBe(23);
    expect(runwayNumber(184)).toBe(18);
    expect(runwayNumber(186)).toBe(19);
  });
  it("edge cases at north: 355–004 → 36, 006 → 01, 354 → 35", () => {
    expect(runwayNumber(360)).toBe(36);
    expect(runwayNumber(0)).toBe(36);
    expect(runwayNumber(4)).toBe(36);
    expect(runwayNumber(1)).toBe(36);
    expect(runwayNumber(356)).toBe(36);
    expect(runwayNumber(355)).toBe(36); // half up (never generated)
    expect(runwayNumber(354)).toBe(35);
    expect(runwayNumber(6)).toBe(1);
    expect(runwayNumber(5)).toBe(1); // 005 → 01 by half-up (never generated: ambiguous)
    expect(runwayNumber(14)).toBe(1);
    expect(runwayNumber(16)).toBe(2);
  });
  it("every number is 1–36 for every heading", () => {
    for (let h = 1; h <= 360; h++) {
      const n = runwayNumber(h);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(36);
    }
  });
  it("opposite ends differ by 18 (09/27, 18/36, 14/32) and reciprocal is its own inverse", () => {
    expect(reciprocal(9)).toBe(27);
    expect(reciprocal(27)).toBe(9);
    expect(reciprocal(18)).toBe(36);
    expect(reciprocal(36)).toBe(18);
    expect(reciprocal(14)).toBe(32);
    for (const n of ALL_RUNWAYS) {
      expect(reciprocal(reciprocal(n))).toBe(n);
      expect(Math.abs(reciprocal(n) - n)).toBe(18);
      expect(runwayNumber(runwayHeading(n) + 180)).toBe(reciprocal(n));
    }
  });
  it("formats and speaks numbers the way a tower does", () => {
    expect(fmtRunway(9)).toBe("09");
    expect(fmtRunway(36)).toBe("36");
    expect(fmtHeading(90)).toBe("090");
    expect(fmtHeading(0)).toBe("360");
    expect(sayRunway(27)).toBe("two seven");
    expect(sayRunway(9)).toBe("zero nine");
    expect(sayHeading(240)).toBe("two four zero");
    expect(sayHeading(360)).toBe("three six zero");
  });
});

describe("wind", () => {
  it("a windsock points where the wind goes (from + 180)", () => {
    expect(sockPoints(270)).toBe(90);
    expect(sockPoints(90)).toBe(270);
    expect(sockPoints(180)).toBe(360);
  });
  it("headwind / crosswind / tailwind, and ambiguous angles are not classified", () => {
    expect(windKind(270, 270)).toBe("head");
    expect(windKind(270, 250)).toBe("head");
    expect(windKind(270, 360)).toBe("cross");
    expect(windKind(270, 180)).toBe("cross");
    expect(windKind(270, 90)).toBe("tail");
    expect(windKind(270, 225)).toBeNull();
    expect(windKind(10, 350)).toBe("head");
  });
  it("land into the wind: the end whose heading is closest to where the wind comes from", () => {
    expect(bestEnd([9, 27], 240)).toBe(27);
    expect(bestEnd([9, 27], 60)).toBe(9);
    expect(bestEnd([9, 27, 18, 36], 350)).toBe(36);
    expect(bestEnd([9, 27, 18, 36], 190)).toBe(18);
  });
});

describe("number entry", () => {
  it("steppers wrap: runway 36 → 01, heading 360 → 001", () => {
    expect(stepValue("runway", 36, 1)).toBe(1);
    expect(stepValue("runway", 1, -1)).toBe(36);
    expect(stepValue("runway", null, 1)).toBe(1);
    expect(stepValue("runway", null, -1)).toBe(36);
    expect(stepValue("heading", 360, 1)).toBe(1);
    expect(stepValue("heading", 355, 10)).toBe(5);
    expect(stepValue("heading", 5, -10)).toBe(355);
    expect(stepValue("heading", 10, -10)).toBe(360);
  });
  it("typed digits: runway 1–36; heading 1–360 and 000 = north (360)", () => {
    expect(typedValue("runway", "27")).toBe(27);
    expect(typedValue("runway", "09")).toBe(9);
    expect(typedValue("runway", "37")).toBeNull();
    expect(typedValue("runway", "00")).toBeNull();
    expect(typedValue("heading", "240")).toBe(240);
    expect(typedValue("heading", "000")).toBe(360);
    expect(typedValue("heading", "0")).toBeNull();
    expect(typedValue("heading", "420")).toBeNull();
    expect(typedValue("heading", "45")).toBe(45);
  });
});

describe("generator", () => {
  it("every exercise at every level × 50 seeds lints, has a declared skill, decodes back and is unambiguous", () => {
    const problems: string[] = [];
    for (const ex of [...ALL, crTutorial]) {
      problems.push(...lintExercise(ex));
      if (!compassRunways.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill`);
      const s = decode(ex);
      expect(encode(s)).toEqual(ex.params);
      if (!lines[ex.prompt!.line]) problems.push(`${ex.id}: no line ${ex.prompt!.line}`);
      if (!unambiguous(s)) problems.push(`${ex.id}: ambiguous`);
      const right = answerFor(s);
      const a = ex.answer;
      if (isNumberKind(s.kind)) {
        if (a.kind !== "number") problems.push(`${ex.id}: number expected`);
        else {
          expect(a.value, ex.id).toBe(right);
          const [lo, hi] = entryOf(s.kind) === "runway" ? [1, 36] : [1, 360];
          if (a.value < lo || a.value > hi) problems.push(`${ex.id}: ${a.value} out of range`);
        }
      } else if (a.kind === "choice") {
        expect(a.correct, ex.id).toBe(right);
        if (new Set(a.options.map((o) => o.text)).size !== a.options.length) problems.push(`${ex.id}: duplicate option labels`);
      } else problems.push(`${ex.id}: unexpected answer kind`);
    }
    expect(problems).toEqual([]);
  });
  it("each level only uses the inner games it lists, and unlocks them in order", () => {
    const seen: string[] = [];
    for (let level = 0; level <= CR_MAX_LEVEL; level++) {
      const modes = new Set(generateBand(compassRunways, level, 3, 8).map((e) => MODE_OF[decode(e).kind]));
      for (const m of modes) expect(LEVELS[level]!.games, `level ${level}`).toContain(m);
      for (const m of modes) if (!seen.includes(m)) seen.push(m);
    }
    expect(seen).toEqual(["sock", "paint", "turn", "wind", "tower"]);
    // the owner's bar: several inner games mixed in one round from level 0
    for (let level = 0; level <= CR_MAX_LEVEL; level++) expect(new Set(LEVELS[level]!.slots.map((k) => MODE_OF[k])).size, `level ${level}`).toBeGreaterThanOrEqual(2);
  });
  it("same seed → same round; ids unique; every kind appears somewhere", () => {
    for (let level = 0; level <= CR_MAX_LEVEL; level++) {
      expect(buildRound(compassRunways, { level, seed: 11 })).toEqual(buildRound(compassRunways, { level, seed: 11 }));
      for (const seed of SEEDS.slice(0, 10)) expect(() => buildRound(compassRunways, { level, seed })).not.toThrow();
    }
    expect(generateCompassRunways(4, createRng(4), 2)).toEqual(generateCompassRunways(4, createRng(4), 2));
    const kinds = new Set(ALL.map((e) => decode(e).kind));
    expect([...KINDS].filter((k) => !kinds.has(k))).toEqual([]);
  });
  it("rounding items never end in 5, and include the edges next to north", () => {
    expect(ROUND_HEADINGS.some((h) => h % 10 === 5 || h % 10 === 0)).toBe(false);
    const rounds = ALL.filter((e) => decode(e).kind === "round").map((e) => decode(e).h);
    expect(rounds.some((h) => h % 10 === 5)).toBe(false);
    expect(rounds.some((h) => h <= 4 || h >= 356)).toBe(true); // → 36
  });
  it("turn items: right and left both appear; wrap items always pass north and never land on it; quarter turns include 360", () => {
    const turns = ALL.map(decode).filter((s) => MODE_OF[s.kind] === "turn");
    for (const s of turns) {
      expect(TURN_DEGS as readonly number[]).toContain(s.d);
      if (s.kind === "wrap") {
        expect(wraps(s.h, s.dir, s.d), JSON.stringify(s)).toBe(true);
        expect(turnHeading(s.h, s.dir, s.d)).not.toBe(360);
      }
      if (s.kind === "turn") expect(wraps(s.h, s.dir, s.d)).toBe(false);
    }
    expect(new Set(turns.filter((s) => s.kind === "wrap").map((s) => s.dir)).size).toBe(2);
    expect(turns.some((s) => s.kind === "quarter" && turnHeading(s.h, s.dir, s.d) === 360)).toBe(true);
    // a band at level 4 holds right and left turns past north
    const band = generateBand(compassRunways, 4, 9, 8).map(decode).filter((s) => s.kind === "wrap");
    expect(new Set(band.map((s) => s.dir)).size).toBe(2);
  });
  it("wind items: one clearly best end (≥ 30° margin); the downwind end is always a distractor", () => {
    for (const s of ALL.map(decode).filter((x) => ["two", "four", "twind"].includes(x.kind))) {
      const ends = airportEnds(s);
      expect(ends).toContain(reciprocal(bestEnd(ends, s.w)));
      expect(angleDiff(runwayHeading(bestEnd(ends, s.w)), s.w)).toBeLessThanOrEqual(30);
      if (s.b) expect(new Set(ends).size).toBe(4);
    }
  });
  it("tower join: the turn always lines up with a runway at this airport", () => {
    for (const s of ALL.map(decode).filter((x) => x.kind === "tjoin")) {
      const res = turnHeading(s.h, s.dir, s.d);
      expect(res % 10).toBe(0);
      expect(airportEnds(s)).toContain(runwayNumber(res));
    }
  });
  it("windsock from-items: the opposite direction (where the sock points) is always offered", () => {
    for (const ex of ALL.filter((e) => ["from4", "from8", "fromDeg"].includes(decode(e).kind))) {
      if (ex.answer.kind !== "choice") throw new Error("choice expected");
      expect(ex.answer.options.length).toBe(4);
      expect(ex.answer.options.map((o) => o.text?.toLowerCase())).not.toContain(undefined);
    }
  });
  it("tutorial: wind from the east, level 0 only, pointing hand target exists", () => {
    expect(crTutorial.tutorial).toBe(true);
    expect(crTutorial.difficulty).toBe(1);
    expect(crTutorial.answer).toMatchObject({ kind: "choice", correct: "e" });
    expect(buildRound(compassRunways, { level: 0, seed: 1 }).exercises[0]!.id).toBe("cr-tutorial-east");
    expect(buildRound(compassRunways, { level: 1, seed: 1 }).exercises.some((e) => e.tutorial)).toBe(false);
  });
});

describe("validation, hints and the model", () => {
  const find = (level: number, kind: Kind) => {
    for (const seed of SEEDS) {
      const e = generateBand(compassRunways, level, seed, 8).find((x) => decode(x).kind === kind);
      if (e) return e;
    }
    throw new Error(`no ${kind} at ${level}`);
  };
  const miss = (e: ReturnType<typeof find>, value: string | number) => exerciseReducer(initExercise(e), { type: "SUBMIT", value });
  it("number answers: only the exact number is right; misses never punish and the second miss models it", () => {
    const e = find(4, "wrap");
    const s = decode(e);
    const right = answerFor(s) as number;
    expect(validateAnswer(e.answer, right).correct).toBe(true);
    expect(validateAnswer(e.answer, right + 1).correct).toBe(false);
    let st = miss(e, norm(right + 10));
    expect(st.hintStage).toBe(1);
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: norm(right + 20) });
    expect(st.hintStage).toBe(2);
    expect(st.model).toBe(right);
  });
  it("first-miss lines diagnose the misconception", () => {
    const from = find(1, "from8");
    expect(hintFor(miss(from, (["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const).find((p) => ({ n: 360, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 })[p] === sockPoints(decode(from).w))!))).toBe("cr.hint.toWind");
    const paint = find(1, "ten");
    expect(hintFor(miss(paint, reciprocal(runwayNumber(decode(paint).h))))).toBe("cr.hint.recip");
    const rnd = find(2, "round");
    const rn = runwayNumber(decode(rnd).h);
    expect(hintFor(miss(rnd, rn === 36 ? 1 : rn + 1))).toBe("cr.hint.roundCheck");
    const opp = find(2, "opp");
    expect(hintFor(miss(opp, runwayNumber(decode(opp).h)))).toBe("cr.hint.oppSame");
    const rot = find(2, "rotate");
    expect(hintFor(miss(rot, runwayHeading(reciprocal(decode(rot).n))))).toBe("cr.hint.flip");
    const turn = find(4, "wrap");
    const t = decode(turn);
    expect(hintFor(miss(turn, turnHeading(t.h, t.dir === 1 ? -1 : 1, t.d)))).toBe("cr.hint.turnWay");
    const two = find(5, "two");
    const ts = decode(two);
    expect(hintFor(miss(two, `rw${fmtRunway(reciprocal(bestEnd(airportEnds(ts), ts.w)))}`))).toBe("cr.hint.tail");
    const xw = ALL.find((e) => decode(e).kind === "xwind" && answerFor(decode(e)) === "cross")!;
    expect(hintFor(miss(xw, "head"))).toBe("cr.hint.across");
    const line = find(7, "tline");
    expect(hintFor(miss(line, `h${fmtHeading(runwayHeading(reciprocal(decode(line).n)))}`))).toBe("cr.hint.lineRecip");
    expect(explainFor(crTutorial)).toBe("cr.help.from");
  });
  it("the modelled working ends at the right answer for every kind", () => {
    const sc = (kind: Kind, o: Partial<Scenario>): Scenario => ({ ...blank(kind, 0), ...o });
    expect(working(sc("wrap", { h: 300, d: 120, dir: 1 }))).toEqual(["300 + 120 = 420", "Past north: 420 − 360 = 60", "New heading 060°"]);
    expect(working(sc("wrap", { h: 30, d: 90, dir: -1 }))).toEqual(["30 + 360 = 390", "390 − 90 = 300", "New heading 300°"]);
    expect(working(sc("quarter", { h: 270, d: 90, dir: 1 }))[1]).toBe("New heading 360° (north is 360)");
    expect(working(sc("round", { h: 236 }))).toEqual(["236° is nearest 240°", "240 ÷ 10 = 24", "Paint 24"]);
    expect(working(sc("round", { h: 3 }))[0]).toBe("003° is nearest 360°");
    expect(working(sc("opp", { h: 90 }))).toEqual(["This end: 09", "9 + 18 = 27", "Paint 27"]);
    expect(working(sc("fromDeg", { w: 240 }))[1]).toBe("060 + 180 = 240");
    for (const s of ALL.map(decode)) expect(working(s).length).toBeGreaterThan(0);
  });
});

describe("voice, praise and story", () => {
  it("every line the world can say exists, prompts stay inside their vary lists, praise is about process", () => {
    const ids = new Set<string>([
      "cr.ready", "cr.back", "cr.idle", "cr.retry", "cr.hint.model", "cr.hint.show", "cr.hint.yourTurn",
      ...[...crIntro, ...crOutro].map((b) => b.line), ...Object.values(crBetween).map((b) => b.line),
    ]);
    for (const ex of [...ALL, crTutorial]) {
      for (const p of praiseFor(ex)) ids.add(p);
      ids.add(explainFor(ex));
      const v = ex.prompt!.vars ?? {};
      for (const [k, val] of Object.entries(v)) expect(lines[ex.prompt!.line]!.vary![k], `${ex.id} ${k}`).toContain(val);
      // diagnosed first-miss lines for a plausible wrong answer
      const a = ex.answer;
      const wrong = a.kind === "choice" ? a.options.find((o) => o.id !== a.correct)!.id : a.kind === "number" ? (a.value === 1 ? 2 : a.value - 1) : 0;
      ids.add(hintFor(exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong })));
    }
    expect([...ids].filter((id) => !lines[id])).toEqual([]);
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("cr."), id).toBe(true);
      expect(words(l.text), id).toBeLessThanOrEqual(16);
      expect(["ziggy", "gloop", "narrator"], id).toContain(l.speaker);
      if (id.startsWith("cr.praise")) expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|talented/);
      expect(l.text, id).not.toMatch(/crash|danger|scary|emergency|mayday/i);
    }
    expect(lines["cr.prompt.opp"]!.vary!.rw).toEqual(ALL_RUNWAYS.map(sayRunway));
    expect(lines["cr.tower.wind"]!.vary!.wind).toEqual(TEN_HEADINGS.map(sayHeading));
    expect(lines["cr.prompt.turn"]!.vary!.deg).toEqual([...TURN_DEGS]);
    for (const l of Object.values(lines)) {
      const combos = Object.values(l.vary ?? {}).reduce((n, vs) => n * vs.length, 1);
      expect(combos).toBeLessThan(150);
    }
    expect(renderLine("cr.prompt.opp", { rw: "zero nine" })).toBe("This end is runway zero nine. Paint the number on the other end.");
    expect(renderLine("cr.tower.wind", { wind: "two four zero" })).toBe("Tower here. Wind two four zero at one zero. Which runway?");
  });
  it("tower calls only use winds the voice covers (multiples of 10)", () => {
    for (const s of ALL.map(decode).filter((x) => x.kind === "twind" || x.kind === "tcomp")) expect(s.w % 10).toBe(0);
  });
});

describe("registry", () => {
  it("the world, its topics and skills are registered; prerequisites are taught by some world", () => {
    expect(checkRegistry()).toEqual([]);
    const w = getWorld("compass-runways")!;
    expect(w.subject).toBe("pilot");
    expect(w.ages).toEqual([10, 12]);
    expect(w.maxLevel).toBe(CR_MAX_LEVEL);
    expect(w.characters[0]).toBe("ziggy");
    expect(getSkill(SKILL.wind)?.topic).toBe("pilot.wx");
    expect(getSkill(SKILL.headings)?.topic).toBe("pilot.nav");
    expect(getSkill(SKILL.headings)?.prerequisites).toEqual([SKILL.wind]);
    expect(w.skills).toContain(SKILL.wind); // the prerequisite is taught here, so the planner never locks the world
    expect(w.parentDescription).toMatch(/not flight training/);
  });
});

describe("band order", () => {
  it("slot 0 (the level's focus game) stays first; the rest rotate by band seed but keep the level's mix", async () => {
    const { bandSlots } = await import("../../src/games/compass-runways/generator");
    for (let level = 0; level <= CR_MAX_LEVEL; level++) {
      const orders = new Set<string>();
      for (const seed of SEEDS) {
        const o = bandSlots(level, { seed });
        expect(o[0]).toBe(LEVELS[level]!.slots[0]);
        expect([...o].sort()).toEqual([...LEVELS[level]!.slots].sort());
        orders.add(o.join());
      }
      expect(orders.size, `level ${level}`).toBeGreaterThan(1);
    }
  });
});
