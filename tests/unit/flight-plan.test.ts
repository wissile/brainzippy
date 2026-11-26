import { describe, expect, it } from "vitest";
import { applyResult, initialProgression, isRoundComplete, markPlayed, selectNextExercise, startDifficultyFor } from "../../src/engine/progression";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { correctValue, lintExercise, validateAnswer } from "../../src/engine/validation";
import { getLibrary, getSkill, getWorld } from "../../src/content";
import { renderLine } from "../../src/audio/voiceLines";
import { flightPlan, fpTutorial } from "../../src/games/flight-plan/definition";
import { BAND, FP_MAX_LEVEL, LEVELS, MODE_SKILL, generateFlightPlan, makeMetar, metarOf, metarParams, roundDistances } from "../../src/games/flight-plan/generator";
import { explainFor, hintFor, modelSteps, praiseFor } from "../../src/games/flight-plan/hints";
import {
  AOA_MAX, BASES, CARD, CRITS, DEWS, FLAP_DROP, GAME_OF, GUSTS, type GroupKind, MODES, PILOT_SCENES, SPEED_MAX, SPEED_MIN, STALL_TOLERANCE, STEPS, TEMPS, TIMES,
  VISES, WDIRS, WSPDS, cardFails, ceilingOf, exactMinutes, formatMetar, gameOf, groundspeed, groupMeaning, legAnswer, legMistakes, liftPct, metarGroups, modeOf,
  parseMetar, peakAngle, isStalled,
} from "../../src/games/flight-plan/logic";
import { fpBetween, fpIntro, outroFor } from "../../src/games/flight-plan/story";
import voice from "../../src/games/flight-plan/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, string[]>; speaker?: string }>;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 5);
const all = () => {
  const out: Exercise[] = [];
  for (const seed of SEEDS) for (let level = 0; level <= FP_MAX_LEVEL; level++) out.push(...generateBand(flightPlan, level, seed, BAND));
  return out;
};
const ALL = all();
const ofMode = (mode: string) => ALL.filter((e) => modeOf(e) === mode);

describe("registry and definition", () => {
  it("is registered in the pilot library with its own skills, ages 12–14, host Ziggy", () => {
    const w = getWorld("flight-plan")!;
    expect(w).toBeDefined();
    expect(w.subject).toBe("pilot");
    expect([...w.ages]).toEqual([12, 14]);
    expect(w.characters[0]).toBe("ziggy");
    expect(w.maxLevel).toBe(FP_MAX_LEVEL);
    expect(getLibrary("pilot")).toBeDefined();
    for (const s of flightPlan.skillIds) expect(getSkill(s), s).toBeDefined();
  });
  it("has 6–10 levels and exactly one tutorial (difficulty 1, numeric stall angle 16° ± 1)", () => {
    expect(FP_MAX_LEVEL + 1).toBeGreaterThanOrEqual(6);
    expect(FP_MAX_LEVEL + 1).toBeLessThanOrEqual(10);
    expect(flightPlan.exercises.filter((e) => e.tutorial)).toEqual([fpTutorial]);
    expect(fpTutorial.difficulty).toBe(1);
    expect(fpTutorial.answer).toMatchObject({ kind: "numeric", value: 16, tolerance: 1 });
    expect(lintExercise(fpTutorial)).toEqual([]);
  });
  it("every level has 8 slots and closes with the briefing", () => {
    for (const l of LEVELS) {
      expect(l.slots).toHaveLength(BAND);
      expect(l.slots[BAND - 1]!.mode).toBe("brief");
      expect(l.slots.slice(0, -1).some((s) => s.mode === "brief")).toBe(false);
    }
  });
});

describe("generator: determinism and lint over every level × 50 seeds", () => {
  it("every generated item lints, has a declared skill and the right difficulty", () => {
    const problems: string[] = [];
    for (const seed of SEEDS)
      for (let level = 0; level <= FP_MAX_LEVEL; level++)
        for (const ex of generateBand(flightPlan, level, seed, BAND)) {
          problems.push(...lintExercise(ex));
          if (ex.difficulty !== level + 1) problems.push(`${ex.id}: difficulty`);
          if (!flightPlan.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: skill ${ex.skillId}`);
          if (ex.skillId !== MODE_SKILL[modeOf(ex)]) problems.push(`${ex.id}: skill for mode`);
          if (!ex.id.endsWith(`-l${level}n${ex.id.split("n").pop()}`)) problems.push(`${ex.id}: id suffix`);
        }
    expect(problems).toEqual([]);
  });
  it("same (level, seed) → same round; another seed → different content", () => {
    for (let level = 0; level <= FP_MAX_LEVEL; level++) {
      expect(buildRound(flightPlan, { level, seed: 5 })).toEqual(buildRound(flightPlan, { level, seed: 5 }));
      expect(buildRound(flightPlan, { level, seed: 5 }).exercises).not.toEqual(buildRound(flightPlan, { level, seed: 6 }).exercises);
    }
    expect(generateFlightPlan(3, createRng(9), 2)).toEqual(generateFlightPlan(3, createRng(9), 2));
  });
  it("each item is solvable: its own correct value validates and the reducer accepts it", () => {
    for (const ex of ALL) {
      const v = correctValue(ex.answer);
      expect(validateAnswer(ex.answer, v).correct, ex.id).toBe(true);
      const st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: v });
      expect(st.feedback?.correct, ex.id).toBe(true);
    }
  });
  it("only the briefing is a closer, and every band has exactly one", () => {
    for (const seed of SEEDS.slice(0, 10))
      for (let level = 0; level <= FP_MAX_LEVEL; level++) {
        const band = generateBand(flightPlan, level, seed, BAND);
        expect(band.filter((e) => e.closer).map(modeOf)).toEqual(["brief"]);
      }
  });
});

describe("rounds: mixed inner games, ending with the go / no-go briefing (R5a)", () => {
  it("at every level and pace, the last item is the briefing and earlier items never are", () => {
    const cfg = flightPlan.progression;
    for (const seed of SEEDS.slice(0, 12))
      for (let level = 0; level <= FP_MAX_LEVEL; level++)
        for (const attempts of [1, 2, 3]) {
          const round = buildRound(flightPlan, { level, seed });
          let st = initialProgression(cfg, startDifficultyFor(level, cfg));
          const modes: string[] = [];
          while (!isRoundComplete(st, cfg)) {
            const ex = selectNextExercise(round, st, cfg)!;
            modes.push(modeOf(ex));
            st = applyResult(markPlayed(st, ex.id), { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts, firstTry: attempts === 1, hintsShown: attempts - 1 }, cfg);
          }
          const tag = `seed ${seed} L${level} attempts ${attempts}`;
          expect(modes, tag).toHaveLength(8);
          expect(modes.at(-1), tag).toBe("brief");
          expect(modes.slice(0, -1).includes("brief"), tag).toBe(false);
          const games = new Set(modes.slice(0, -1).map((mo) => GAME_OF[mo as keyof typeof GAME_OF]));
          expect(games.size, tag).toBeGreaterThanOrEqual(level >= 2 ? 3 : 2);
        }
  });
  it("level 0 starts with the tutorial (hand-pointer item)", () => {
    const round = buildRound(flightPlan, { level: 0, seed: 1 });
    expect(selectNextExercise(round, initialProgression(flightPlan.progression), flightPlan.progression)?.id).toBe("fp-tutorial-find");
  });
  it("inner games unlock across levels (tunnel + leg → weather → checklist → IMSAFE)", () => {
    const firstLevel = (pred: (m: string) => boolean) => LEVELS.findIndex((l) => l.slots.some((s) => pred(s.mode)));
    expect(firstLevel((m) => GAME_OF[m as keyof typeof GAME_OF] === "tunnel")).toBe(0);
    expect(firstLevel((m) => m === "time")).toBe(0);
    expect(firstLevel((m) => GAME_OF[m as keyof typeof GAME_OF] === "wx")).toBe(2);
    expect(firstLevel((m) => m === "order")).toBe(3);
    expect(firstLevel((m) => m === "imsafe")).toBe(4);
  });
});

describe("wind tunnel: the fictional wing and the stall-angle tolerance", () => {
  it("lift rises with angle up to the critical angle, then drops; the peak is the critical angle at every speed", () => {
    for (const crit of CRITS)
      for (const flaps of [false, true]) {
        const w = { crit: flaps ? crit - FLAP_DROP : crit, flaps };
        for (let s = SPEED_MIN; s <= SPEED_MAX; s += 10) {
          expect(peakAngle(w, s)).toBe(w.crit);
          for (let a = 1; a <= w.crit; a++) expect(liftPct(a, s, w)).toBeGreaterThan(liftPct(a - 1, s, w));
          expect(liftPct(w.crit + 1, s, w)).toBeLessThan(liftPct(w.crit, s, w) * 0.85); // a clear drop: visible on the meter
        }
        expect(isStalled(w.crit, w)).toBe(false);
        expect(isStalled(w.crit + 1, w)).toBe(true);
      }
  });
  it("more speed → more lift at the same angle; flaps give more lift but stall at a smaller angle", () => {
    const w = { crit: 16, flaps: false };
    expect(liftPct(6, 120, w)).toBeGreaterThan(liftPct(6, 60, w));
    const f = { crit: 14, flaps: true };
    expect(liftPct(8, 100, f)).toBeGreaterThan(liftPct(8, 100, w));
    expect(peakAngle(f)).toBeLessThan(peakAngle(w));
    expect(liftPct(AOA_MAX, SPEED_MAX, w)).toBeGreaterThan(0);
  });
  it("stall answers accept the critical angle ±1° and nothing further", () => {
    for (const ex of [...ofMode("find"), ...ofMode("flaps"), fpTutorial]) {
      if (ex.answer.kind !== "numeric") throw new Error("numeric expected");
      const c = ex.params!.crit!;
      expect(ex.answer.value).toBe(c);
      expect(ex.answer.tolerance).toBe(STALL_TOLERANCE);
      for (const v of [c - 1, c, c + 1]) expect(validateAnswer(ex.answer, v).correct, `${ex.id} ${v}`).toBe(true);
      expect(validateAnswer(ex.answer, c - 2)).toMatchObject({ correct: false, reason: "too-low" });
      expect(validateAnswer(ex.answer, c + 2)).toMatchObject({ correct: false, reason: "too-high" });
      if (modeOf(ex) === "flaps") expect(c).toBe(ex.params!.clean! - FLAP_DROP);
    }
  });
  it("tunnel choice items match the wing: fast items are past the critical angle, slow ones below it", () => {
    for (const ex of ofMode("speed")) {
      const { crit, aoa, v } = ex.params as Record<string, number>;
      if (ex.answer.kind !== "choice") throw new Error("choice");
      if (v === 0) expect(aoa! > crit! && ex.answer.correct === "stall").toBe(true);
      else expect(aoa! < crit! && ex.answer.correct === "nostall").toBe(true);
    }
    for (const ex of ofMode("recover")) expect(ex.params!.aoa! > ex.params!.crit!).toBe(true);
  });
});

describe("leg timer: time = distance ÷ groundspeed, rounding", () => {
  it("answers equal distance × 60 ÷ groundspeed, rounded per leg, summed for two legs", () => {
    for (const ex of ofMode("time")) {
      const { d, tas, wind, d2, gs, rnd } = ex.params as Record<string, number>;
      expect(gs).toBe(groundspeed(tas!, wind!));
      const exact = exactMinutes(d!, gs!);
      const expected = Math.round(exact) + (d2! > 0 ? Math.round(exactMinutes(d2!, gs!)) : 0);
      if (ex.answer.kind !== "number") throw new Error("number");
      expect(ex.answer.value, ex.id).toBe(expected);
      expect(ex.answer.value).toBe(legAnswer({ d: d!, tas: tas!, wind: wind!, d2: d2! }));
      if (!rnd) {
        expect(Number.isInteger(exact), `${ex.id} whole minutes`).toBe(true);
        if (d2! > 0) expect(Number.isInteger(exactMinutes(d2!, gs!))).toBe(true);
      } else {
        const f = exact % 1;
        expect(f > 0.15 && f < 0.85 && Math.abs(f - 0.5) > 0.14, `${ex.id} unambiguous rounding`).toBe(true);
      }
      expect(d!).toBeGreaterThanOrEqual(10);
      expect(ex.answer.value).toBeGreaterThan(0);
      expect(ex.answer.value).toBeLessThan(1000); // fits the 3-digit keypad
    }
  });
  it("worked examples (spot checks)", () => {
    expect(legAnswer({ d: 60, tas: 120, wind: 0, d2: 0 })).toBe(30);
    expect(legAnswer({ d: 45, tas: 90, wind: 0, d2: 0 })).toBe(30);
    expect(legAnswer({ d: 50, tas: 120, wind: -20, d2: 0 })).toBe(30);
    expect(legAnswer({ d: 70, tas: 120, wind: 20, d2: 0 })).toBe(30);
    expect(legAnswer({ d: 40, tas: 90, wind: 0, d2: 0 })).toBe(27); // 26.67 → 27
    expect(legAnswer({ d: 30, tas: 120, wind: 0, d2: 30 })).toBe(30);
    expect(roundDistances(120)).toEqual([]); // 120 kt always gives whole or half minutes: never used for rounding items
  });
  it("misconception answers are diagnosed (added, flipped, no wind, wind the wrong way)", () => {
    const s = { d: 50, tas: 120, wind: -20, d2: 0 };
    const ms = legMistakes(s);
    expect(ms.find((x) => x.why === "add")!.value).toBe(150);
    expect(ms.find((x) => x.why === "noWind")!.value).toBe(25);
    expect(ms.find((x) => x.why === "windWay")!.value).toBe(21);
    const ex = ofMode("time").find((e) => e.params!.wind! < 0)!;
    const s2 = ex.params as Record<string, number>;
    const wrong = legMistakes({ d: s2.d!, tas: s2.tas!, wind: s2.wind!, d2: s2.d2! }).find((x) => x.why === "noWind")!.value;
    if (wrong !== legAnswer({ d: s2.d!, tas: s2.tas!, wind: s2.wind!, d2: s2.d2! })) {
      const st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong });
      expect(hintFor(st)).toBe("fp.hint.noWind");
    }
  });
});

describe("weather: METARs this world generates parse back exactly, and decode correctly", () => {
  it("format → parse round-trips for every generated METAR", () => {
    for (const ex of [...ofMode("decode"), ...ofMode("call"), ...ofMode("brief")]) {
      const x = metarOf(ex.params!);
      const s = formatMetar(x);
      expect(parseMetar(s), s).toEqual(x);
      expect(metarParams(parseMetar(s))).toEqual(metarParams(x));
    }
  });
  it("parses groups as a pilot reads them (spot check)", () => {
    const x = parseMetar("METAR XPBF 261650Z 27010KT 10SM BKN035 18/12");
    expect(x).toMatchObject({ wdir: 270, wspd: 10, gust: 0, vis: 10, t: 18, dp: 12, time: 1650 });
    expect(x.layers).toEqual([{ cover: "BKN", base: 35 }]);
    expect(ceilingOf(x.layers)).toBe(35);
    expect(groupMeaning("wind", x).right).toBe("Wind from 270° at 10 knots");
    expect(groupMeaning("cloud", x).right).toBe("Broken clouds at 3,500 ft above the ground");
    const g = parseMetar("METAR XFES 261450Z 30014G25KT 4SM SCT012 BKN040 15/09");
    expect(g).toMatchObject({ gust: 25, vis: 4 });
    expect(ceilingOf(g.layers)).toBe(40); // a scattered layer is not a ceiling
    expect(cardFails(g, true)).toEqual(["vis", "gust"]);
    expect(() => parseMetar("METAR KJFK 261650Z 27010KT 10SM BKN035 18/12")).toThrow();
  });
  it("every METAR value stays inside the voice lines' vary lists", () => {
    for (const ex of [...ofMode("decode"), ...ofMode("call"), ...ofMode("brief")]) {
      const x = metarOf(ex.params!);
      expect(WDIRS as readonly number[]).toContain(x.wdir);
      expect(WSPDS as readonly number[]).toContain(x.wspd);
      if (x.gust) expect(GUSTS as readonly number[]).toContain(x.gust);
      expect(VISES as readonly number[]).toContain(x.vis);
      expect(TIMES as readonly number[]).toContain(x.time);
      expect(TEMPS as readonly number[]).toContain(x.t);
      expect(DEWS as readonly number[]).toContain(x.dp);
      expect(x.dp).toBeLessThan(x.t);
      for (const l of x.layers) if (l.cover !== "SKC") expect(BASES as readonly number[]).toContain(l.base);
      for (let i = 1; i < x.layers.length; i++) expect(x.layers[i]!.base).toBeGreaterThan(x.layers[i - 1]!.base);
    }
  });
  it("decode items: every METAR group item pairs with its plain-language tile; distractor tiles carry the misconception", () => {
    for (const ex of ofMode("decode")) {
      if (ex.answer.kind !== "match") throw new Error("match");
      const x = metarOf(ex.params!);
      const groups = metarGroups(x);
      for (const it of ex.answer.items) {
        const k = it.id.slice(2) as GroupKind;
        expect(it.text).toBe(groups.find((g) => g.kind === k)!.text);
        expect(ex.answer.targets.find((t) => t.id === ex.answer.pairs[it.id])!.text).toBe(groupMeaning(k, x).right);
      }
      const tiles = new Set(ex.answer.targets.map((t) => t.text));
      expect(tiles.size, ex.id).toBe(ex.answer.targets.length); // no two tiles read the same
      expect(ex.answer.targets.length).toBeGreaterThan(ex.answer.items.length);
    }
  });
  it("fly/wait items break at most one card line, and the right option names it", () => {
    for (const ex of ofMode("call")) {
      if (ex.answer.kind !== "choice") throw new Error("choice");
      const x = metarOf(ex.params!);
      const fails = cardFails(x, ex.params!.gr === 1);
      expect(fails.length, ex.id).toBeLessThanOrEqual(1);
      expect(ex.answer.correct).toBe(fails[0] ?? "fly");
      if (ex.params!.trap && !fails.includes("ceiling")) {
        expect(x.layers[0]!.cover === "FEW" || x.layers[0]!.cover === "SCT").toBe(true);
        expect(x.layers[0]!.base).toBeLessThan(CARD.ceiling);
      }
    }
  });
});

describe("checklist, IMSAFE and the briefing", () => {
  it("order items keep the one sensible order; skip cards are never in the answer", () => {
    for (const ex of ofMode("order")) {
      if (ex.answer.kind !== "sequence") throw new Error("sequence");
      const idx = ex.answer.order.map((id) => Number(id.slice(1)));
      expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      expect(ex.answer.order.every((id) => id.startsWith("s"))).toBe(true);
      expect(idx.every((i) => i >= 0 && i < STEPS.length)).toBe(true);
      expect(ex.answer.pieces.some((pc) => pc.id.startsWith("k"))).toBe(ex.params!.skip! >= 0);
    }
  });
  it("IMSAFE items: the right option matches the scenario; 'push through' is never right", () => {
    for (const ex of ofMode("imsafe")) {
      if (ex.answer.kind !== "choice") throw new Error("choice");
      expect(ex.answer.correct).toBe(PILOT_SCENES[ex.params!.sc!]!.why);
      expect(ex.answer.correct).not.toBe("push");
    }
  });
  it("briefings: at most one factor fails and the call matches it (fuel must cover trip + 30 min)", () => {
    const seen = new Set<string>();
    for (const ex of ofMode("brief")) {
      if (ex.answer.kind !== "choice") throw new Error("choice");
      const pr = ex.params as Record<string, number>;
      const fails: string[] = [];
      if (pr.fuel! < pr.trip! + 30) fails.push("fuel");
      if (pr.fw && cardFails(metarOf(pr), false).length) fails.push("wait");
      if (pr.fpi && PILOT_SCENES[pr.sc!]!.why !== "ready") fails.push("rest");
      if (pr.fpl && pr.pb) fails.push("fix");
      expect(fails.length, ex.id).toBeLessThanOrEqual(1);
      expect(ex.answer.correct, ex.id).toBe(fails[0] ?? "go");
      expect(ex.answer.options.length).toBe(3);
      if (ex.answer.correct === "go") expect(ex.answer.options.some((o) => o.id === "pressure")).toBe(false);
      seen.add(ex.answer.correct);
    }
    expect([...seen].sort()).toEqual(["fix", "fuel", "go", "rest", "wait"]);
  });
});

describe("hints, praise and models", () => {
  it("every mode explains, praises and models with lines that exist", () => {
    for (const ex of [...ALL, fpTutorial]) {
      expect(lines[explainFor(ex)], `${ex.id} explain ${explainFor(ex)}`).toBeDefined();
      for (const l of praiseFor(ex)) expect(lines[l], l).toBeDefined();
      expect(modelSteps(ex).length, ex.id).toBeGreaterThan(0);
    }
  });
  it("first-miss lines are diagnosed and exist for every wrong option", () => {
    for (const ex of ALL.slice(0, 2000)) {
      const a = ex.answer;
      const wrongs: unknown[] = [];
      if (a.kind === "choice") wrongs.push(...a.options.filter((o) => o.id !== a.correct).map((o) => o.id));
      if (a.kind === "numeric") wrongs.push(a.value - 3, a.value + 3);
      if (a.kind === "number") wrongs.push(...legMistakes({ d: ex.params!.d!, tas: ex.params!.tas!, wind: ex.params!.wind!, d2: ex.params!.d2! }).map((x) => x.value).filter((v) => v !== a.value && v >= 0), a.value + 7);
      if (a.kind === "sequence") wrongs.push([...a.order].reverse(), a.pieces.map((pc) => pc.id).slice(0, a.order.length));
      if (a.kind === "match") {
        const wrong = Object.fromEntries(a.items.map((it, i) => [it.id, a.targets[(a.targets.findIndex((t) => t.id === a.pairs[it.id]) + 1 + i) % a.targets.length]!.id]));
        wrongs.push(wrong);
      }
      for (const w of wrongs) {
        const st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: w as never });
        if (st.feedback?.correct !== false) continue;
        const line = hintFor(st);
        expect(lines[line], `${ex.id} → ${line}`).toBeDefined();
      }
    }
  });
  it("specific misconceptions get their own hint", () => {
    const fast = ofMode("speed").find((e) => e.params!.v === 0)!;
    expect(hintFor(exerciseReducer(initExercise(fast), { type: "SUBMIT", value: "fast" }))).toBe("fp.hint.anyspeed");
    expect(hintFor(exerciseReducer(initExercise(fast), { type: "SUBMIT", value: "engine" }))).toBe("fp.hint.engine");
    const rec = ofMode("recover")[0]!;
    expect(hintFor(exerciseReducer(initExercise(rec), { type: "SUBMIT", value: "pull" }))).toBe("fp.hint.pullup");
    const find = ofMode("find")[0]!;
    expect(hintFor(exerciseReducer(initExercise(find), { type: "SUBMIT", value: find.params!.crit! + 4 }))).toBe("fp.hint.high");
    expect(hintFor(exerciseReducer(initExercise(find), { type: "SUBMIT", value: find.params!.crit! - 4 }))).toBe("fp.hint.low");
    const dec = ofMode("decode").find((e) => e.answer.kind === "match" && e.answer.targets.some((t) => t.id === "x-wind"))!;
    if (dec.answer.kind !== "match") throw new Error("match");
    const swapped = { ...dec.answer.pairs, "g-wind": "x-wind" };
    expect(hintFor(exerciseReducer(initExercise(dec), { type: "SUBMIT", value: swapped }))).toBe("fp.hint.windTo");
    const imsafe = ofMode("imsafe").find((e) => e.answer.kind === "choice" && e.answer.options.some((o) => o.id === "push"))!;
    expect(hintFor(exerciseReducer(initExercise(imsafe), { type: "SUBMIT", value: "push" }))).toBe("fp.hint.push");
    const brief = ofMode("brief").find((e) => e.answer.kind === "choice" && e.answer.options.some((o) => o.id === "pressure"))!;
    expect(hintFor(exerciseReducer(initExercise(brief), { type: "SUBMIT", value: "pressure" }))).toBe("fp.hint.pressure");
  });
});

describe("story and voice", () => {
  it("3–5 intro beats, outro by the call (go / wait / sort it first), between lines at 2, 4, 6", () => {
    expect(fpIntro.length).toBeGreaterThanOrEqual(3);
    expect(fpIntro.length).toBeLessThanOrEqual(5);
    expect(outroFor("go")[0]!.line).toBe("fp.story.outro.go");
    expect(outroFor("wait")[0]!.line).toBe("fp.story.outro.wait");
    expect(outroFor("fix")[0]!.line).toBe("fp.story.outro.fix");
    expect(Object.keys(fpBetween)).toEqual(["2", "4", "6"]);
    for (const b of [...fpIntro, ...outroFor("go"), ...outroFor("wait"), ...outroFor("fix"), ...Object.values(fpBetween)]) expect(lines[b.line], b.line).toBeDefined();
  });
  it("every prompt line exists; prompts with vars are covered by vary lists", () => {
    for (const ex of [...ALL, fpTutorial]) {
      const pr = ex.prompt!;
      const l = lines[pr.line];
      expect(l, pr.line).toBeDefined();
      for (const [k, vals] of Object.entries(l!.vary ?? {})) expect(vals, `${pr.line} ${k}`).toContain(String(pr.vars?.[k]));
    }
  });
  it("all lines are prefixed fp., short, and never praise ability", () => {
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("fp."), id).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(26);
      expect(/\b(smart|genius|clever|brilliant)\b/i.test(l.text), id).toBe(false);
      const combos = Object.values(l.vary ?? {}).reduce((n, v) => n * v.length, 1);
      expect(combos, id).toBeLessThan(150);
      expect(renderLine(id, {}).length).toBeGreaterThan(0);
    }
  });
  it("METAR reading lines cover every spoken value (read naturally: 'two seven zero')", () => {
    expect(lines["fp.wx.wind"]!.vary!.dir).toHaveLength(WDIRS.length);
    expect(lines["fp.wx.wind"]!.vary!.dir).toContain("two seven zero");
    expect(lines["fp.wx.wind"]!.vary!.spd).toHaveLength(WSPDS.length);
    expect(lines["fp.wx.gust"]!.vary!.gst).toHaveLength(GUSTS.length);
    expect(lines["fp.wx.cloud"]!.vary!.base).toHaveLength(BASES.length);
    expect(lines["fp.wx.temp"]!.vary!.t).toHaveLength(TEMPS.length);
    expect(lines["fp.wx.temp"]!.vary!.dp).toHaveLength(DEWS.length);
    expect(lines["fp.wx.time"]!.vary!.time).toHaveLength(TIMES.length);
  });
  it("the intro and world notice say it's educational only", () => {
    expect(lines["fp.intro"]!.text.toLowerCase()).toContain("not real flight training");
    expect(MODES.every((mo) => GAME_OF[mo] !== undefined)).toBe(true);
    expect(gameOf({ params: { m: MODES.indexOf("brief") } })).toBe("brief");
  });
});

describe("METAR read aloud", () => {
  it("every generated METAR reads with values inside the vary lists", async () => {
    const { metarSpeech } = await import("../../src/games/flight-plan/logic");
    for (const ex of [...ofMode("decode"), ...ofMode("call"), ...ofMode("brief")]) {
      for (const [id, vars] of metarSpeech(metarOf(ex.params!))) {
        const l = lines[id];
        expect(l, id).toBeDefined();
        for (const [k, vals] of Object.entries(l!.vary ?? {})) expect(vals, `${id} ${k}=${vars[k]}`).toContain(vars[k]);
      }
    }
    expect(metarSpeech(parseMetar("METAR XPBF 261650Z 27010KT 10SM BKN035 18/12"))).toEqual([
      ["fp.wx.station", { st: "Pebble Field" }], ["fp.wx.time", { time: "one six five zero" }], ["fp.wx.wind", { dir: "two seven zero", spd: "ten" }],
      ["fp.wx.vis10", {}], ["fp.wx.cloud", { cover: "broken", base: "three thousand five hundred" }], ["fp.wx.temp", { t: "eighteen", dp: "twelve" }],
    ]);
  });
});
