import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { lintExercise, validateAnswer, correctValue } from "../../src/engine/validation";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { renderLine, VOICE_LINES } from "../../src/audio/voiceLines";
import { checkRegistry, getLibrary, getWorld, isPlayable } from "../../src/content";
import { rocketLab, rocketTutorial } from "../../src/games/rocket-lab/definition";
import { MASSES, ROCKET_LEVELS, ROCKET_MAX_LEVEL, SKILL, missionOk } from "../../src/games/rocket-lab/generator";
import {
  BAND_FLOORS,
  apogee,
  accelOf,
  bandOf,
  costOf,
  engineId,
  engineThrust,
  maxCrates,
  missionTable,
  missionWinners,
  outcomeOf,
  rankOrder,
  resultOf,
  scenarioOf,
  smallestLifter,
  speedUpChange,
  weightOf,
} from "../../src/games/rocket-lab/logic";
import { allowed, submission, type Lab } from "../../src/games/rocket-lab/store";
import { explain } from "../../src/games/rocket-lab/Board";
import { explainFor, hintFor, praiseFor } from "../../src/games/rocket-lab/RocketLab";
import voice from "../../src/games/rocket-lab/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const byLevel = (level: number) => SEEDS.flatMap((seed) => generateBand(rocketLab, level, seed, 8));
const ALL = Array.from({ length: ROCKET_MAX_LEVEL + 1 }, (_, l) => byLevel(l)).flat();

describe("Rocket Lab physics model", () => {
  it("weight = m × g with g = 10 on Earth and 1.6 on the Moon (whole newtons for multiples of 5 kg)", () => {
    expect(weightOf(20)).toBe(200);
    expect(weightOf(20, "moon")).toBe(32);
    for (const m of MASSES) expect(Number.isInteger(weightOf(m, "moon"))).toBe(true);
    for (const m of MASSES) expect(weightOf(m, "moon")).toBeCloseTo(m * 1.6, 10);
  });
  it("lifts off only when thrust > weight; equal is balanced (stays at rest)", () => {
    expect(outcomeOf(8, 5)).toBe("lift");
    expect(outcomeOf(5, 5)).toBe("balanced");
    expect(outcomeOf(4, 5)).toBe("stay");
  });
  it("a = (T − W) / m; heavier with bigger thrust can still be slower", () => {
    expect(accelOf(300, 20)).toBe(5);
    expect(accelOf(150, 10)).toBe(5);
    expect(accelOf(330, 30)).toBeLessThan(accelOf(150, 10));
  });
  it("cargo: the most crates that keep thrust strictly above weight", () => {
    expect(maxCrates(10, 4, 2)).toBe(2); // 4 + 2·2 = 8 < 10, 4 + 3·2 = 10 is balanced
    expect(maxCrates(11, 4, 2)).toBe(3);
    expect(smallestLifter([10, 12, 30], 11)).toBe(12);
  });
  it("speed-up change compares T/m exactly (no rounding)", () => {
    expect(speedUpChange(300, 20, 300, 15)).toBe("faster");
    expect(speedUpChange(300, 20, 300, 25)).toBe("slower");
    expect(speedUpChange(300, 20, 225, 15)).toBe("same");
  });
  it("mission heights grow with thrust and with fuel for the generated rockets; bands are 0/100/200/400 m", () => {
    expect(bandOf(99.9)).toBe(0);
    expect(bandOf(100)).toBe(1);
    expect(bandOf(399)).toBe(2);
    expect(bandOf(400)).toBe(3);
    expect(apogee(310, 10, 2)).toBeGreaterThan(apogee(310, 10, 1));
    expect(apogee(390, 10, 2)).toBeGreaterThan(apogee(310, 10, 2));
    // hand check of the integrator against the constant-mass bound: lighter-as-it-burns flies higher
    const constantMass = (t: number, m: number, tb: number) => { const a = t / m - 10; return 0.5 * a * tb * tb * (1 + a / 10); };
    expect(apogee(310, 10, 1)).toBeGreaterThan(constantMass(310, 15, 2));
    expect(apogee(310, 10, 1)).toBeLessThan(constantMass(310, 10, 2));
  });
});

describe("Rocket Lab generator", () => {
  it("has 9 levels (0–8) and the tutorial is the spec's T = 6, W = 3 lift-off", () => {
    expect(ROCKET_LEVELS).toHaveLength(9);
    expect(rocketLab.progression.maxLevel).toBe(8);
    expect(rocketTutorial.tutorial).toBe(true);
    expect(rocketTutorial.params).toMatchObject({ t: 6, w: 3 });
    expect(rocketTutorial.answer).toMatchObject({ kind: "choice", correct: "yes" });
    expect(lintExercise(rocketTutorial)).toEqual([]);
  });

  it("is deterministic: same seed → same round", () => {
    for (let level = 0; level <= ROCKET_MAX_LEVEL; level++) {
      const a = buildRound(rocketLab, { level, seed: 42 }).exercises;
      const b = buildRound(rocketLab, { level, seed: 42 }).exercises;
      expect(a).toEqual(b);
    }
  });

  it("every level × 60 seeds lints, uses a declared skill for its level, unique ids", () => {
    const ids = new Set<string>();
    for (let level = 0; level <= ROCKET_MAX_LEVEL; level++) {
      for (const seed of SEEDS) {
        const band = generateBand(rocketLab, level, seed, 8);
        for (const ex of band) {
          expect(lintExercise(ex), ex.id).toEqual([]);
          const want = level <= 3 ? SKILL.balanced : level <= 5 ? SKILL.weightMass : SKILL.net;
          expect(ex.skillId, ex.id).toBe(want);
          expect(ex.id.endsWith(`-l${level}n${band.indexOf(ex)}`)).toBe(true);
        }
        for (const ex of band) ids.add(`${seed}:${ex.id}`);
      }
    }
    expect(ids.size).toBe(SEEDS.length * 8 * (ROCKET_MAX_LEVEL + 1));
  });

  it("modes follow the level table, alternating within two-part levels", () => {
    for (let level = 0; level <= ROCKET_MAX_LEVEL; level++) {
      const band = generateBand(rocketLab, level, 7, 8);
      band.forEach((ex, i) => expect(scenarioOf(ex.params).mode).toBe(ROCKET_LEVELS[level]!.modes[i % ROCKET_LEVELS[level]!.modes.length]));
    }
  });
});

/** The heart of the world: for every generated experiment, the answer and the simulated outcome agree. */
describe("Rocket Lab: predictions and outcomes are consistent for every generated level", () => {
  const solved = (ex: Exercise) => resultOf(scenarioOf(ex.params), correctValue(ex.answer));

  it("levels 0–1 lift-off: 'yes' exactly when thrust > weight; pushes stay 1–20; level 0 never balanced, level 1 sometimes", () => {
    let balanced = 0;
    for (const level of [0, 1]) for (const ex of byLevel(level)) {
      const s = scenarioOf(ex.params);
      expect(s.t).toBeGreaterThanOrEqual(1);
      expect(s.t).toBeLessThanOrEqual(20);
      expect(s.w).toBeGreaterThanOrEqual(2);
      const r = solved(ex);
      expect(r.kind).toBe("launch");
      if (r.kind === "launch") expect(ex.answer.kind === "choice" && ex.answer.correct === "yes").toBe(r.outcome === "lift");
      if (s.t === s.w) {
        expect(level).toBe(1);
        balanced++;
      }
      if (level === 0) expect(Math.abs(s.t - s.w)).toBeGreaterThanOrEqual(3);
    }
    expect(balanced).toBeGreaterThan(0);
  });

  it("level 2 engines: exactly one lifts (the answer); one is balanced; one is weaker", () => {
    for (const ex of byLevel(2)) {
      const s = scenarioOf(ex.params);
      const lifts = s.engines.filter((t) => outcomeOf(t, s.w) === "lift");
      expect(lifts).toHaveLength(1);
      expect(s.engines.filter((t) => t === s.w)).toHaveLength(1);
      expect(Math.min(...s.engines)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...s.engines)).toBeLessThanOrEqual(20);
      expect(ex.answer.kind === "choice" && ex.answer.correct).toBe(engineId(lifts[0]!));
      const r = solved(ex);
      expect(r.kind === "launch" && r.outcome).toBe("lift");
      for (const t of s.engines.filter((x) => x !== lifts[0])) expect((resultOf(s, engineId(t)) as { outcome: string }).outcome).not.toBe("lift");
    }
  });

  it("level 3 cargo: the answer lifts, one more crate doesn't; answer ≥ 1; thrust 10–20; the shelf has spare crates", () => {
    let balancedTrap = 0;
    for (const ex of byLevel(3)) {
      const s = scenarioOf(ex.params);
      const n = ex.answer.kind === "number" ? ex.answer.value : -1;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(s.t).toBeGreaterThanOrEqual(10);
      expect(s.t).toBeLessThanOrEqual(20);
      expect(s.shelf).toBeGreaterThan(n);
      expect(s.shelf).toBeLessThanOrEqual(8);
      expect((resultOf(s, n) as { outcome: string }).outcome).toBe("lift");
      expect((resultOf(s, n + 1) as { outcome: string }).outcome).not.toBe("lift");
      if (s.w + (n + 1) * s.c === s.t) balancedTrap++;
    }
    expect(balancedTrap).toBeGreaterThan(SEEDS.length * 2); // the "balanced counts as lift" mistake is usually testable
  });

  it("level 4: weight = 10 × mass with 'weight = mass' as a distractor; engine items have exactly one lifter", () => {
    for (const ex of byLevel(4)) {
      const s = scenarioOf(ex.params);
      expect(MASSES).toContain(s.m);
      if (s.mode === "weight") {
        expect(ex.answer).toMatchObject({ kind: "number", value: 10 * s.m });
        expect(ex.answer.kind === "number" && ex.answer.choices).toContain(s.m);
        const r = solved(ex);
        expect(r.kind === "weigh" && r.weight).toBe(10 * s.m);
      } else {
        expect(s.mode).toBe("engineKg");
        expect(s.engines.filter((t) => t > s.w)).toHaveLength(1);
        expect(s.engines).toContain(s.w);
        expect((solved(ex) as { outcome: string }).outcome).toBe("lift");
      }
    }
  });

  it("level 5 Moon: mass is unchanged; the answer is the smallest engine that lifts; the Earth-sized engine is a lifting distractor", () => {
    for (const ex of byLevel(5)) {
      const s = scenarioOf(ex.params);
      expect(s.planet).toBe("moon");
      if (s.mode === "moonMass") {
        expect(ex.answer).toMatchObject({ kind: "number", value: s.m });
        const ch = ex.answer.kind === "number" ? ex.answer.choices! : [];
        expect(ch).toContain(weightOf(s.m, "moon"));
        expect(ch).toContain(weightOf(s.m));
        for (const c of ch) expect(Number.isInteger(c)).toBe(true);
      } else {
        const w = weightOf(s.m, "moon");
        expect(Number.isInteger(w)).toBe(true);
        const correct = ex.answer.kind === "choice" ? engineThrust(ex.answer.correct) : 0;
        expect(correct).toBe(smallestLifter(s.engines, w));
        expect(s.engines.filter((t) => t > w).length).toBe(2);
        expect(s.engines.some((t) => t <= w)).toBe(true);
        expect(Math.max(...s.engines)).toBeGreaterThan(weightOf(s.m)); // sized for Earth
      }
    }
  });

  it("level 6 ranking: a ∈ 1–6 all different, order fastest first, and neither thrust nor mass order gives it away", () => {
    for (const ex of byLevel(6)) {
      const s = scenarioOf(ex.params);
      const as = s.rockets.map((r) => accelOf(r.t, r.m));
      for (const a of as) {
        expect(Number.isInteger(a)).toBe(true);
        expect(a).toBeGreaterThanOrEqual(1);
        expect(a).toBeLessThanOrEqual(6);
      }
      expect(new Set(as).size).toBe(3);
      expect(ex.answer.kind === "sequence" && ex.answer.order).toEqual(rankOrder(s.rockets));
      for (const r of s.rockets) expect(r.t).toBeLessThanOrEqual(400);
      const trap = s.rockets.some((x) => s.rockets.some((y) => x.m > y.m && x.t > y.t && accelOf(x.t, x.m) < accelOf(y.t, y.m)));
      expect(trap).toBe(true);
      const byThrust = [...s.rockets].sort((x, y) => y.t - x.t).map((r) => r.id);
      expect(rankOrder(s.rockets)).not.toEqual(byThrust);
      const r = solved(ex);
      if (r.kind === "race") {
        const order = Object.entries(r.accels).sort((x, y) => y[1] - x[1]).map(([id]) => id);
        expect(order).toEqual(rankOrder(s.rockets));
      }
    }
  });

  it("level 7 fuel: net force after burning = T − 10(m − Δ); faster/slower/same matches the simulated speed-ups; all three answers occur", () => {
    const seen = new Set<string>();
    for (const ex of byLevel(7)) {
      const s = scenarioOf(ex.params);
      expect(s.t).toBeLessThanOrEqual(400);
      const r = solved(ex);
      if (r.kind !== "compare") throw new Error("compare expected");
      expect(r.before).toBeGreaterThan(0);
      expect(r.after).toBeGreaterThan(0);
      if (s.mode === "fuelNet") {
        expect(ex.answer).toMatchObject({ kind: "number", value: s.t - 10 * (s.m - s.d) });
        expect(s.t2).toBe(s.t);
        expect(r.after).toBeGreaterThan(r.before);
        const ch = ex.answer.kind === "number" ? ex.answer.choices! : [];
        expect(ch).toContain(s.t - 10 * s.m); // "same thrust, same net force"
      } else {
        const want = r.after > r.before + 1e-9 ? "faster" : r.after < r.before - 1e-9 ? "slower" : "same";
        expect(ex.answer.kind === "choice" && ex.answer.correct).toBe(want);
        seen.add(want);
      }
    }
    expect([...seen].sort()).toEqual(["faster", "same", "slower"]);
  });

  it("level 8 missions: exactly one combination reaches the target within budget, it is the answer, and the biggest combination is over budget", () => {
    for (const ex of byLevel(8)) {
      const s = scenarioOf(ex.params);
      expect(missionOk(s.thrusts, s.m, s.target)).toBe(true);
      const cells = missionTable(s.thrusts, s.m);
      const winners = missionWinners(cells, s.target, s.budget);
      expect(winners).toHaveLength(1);
      const w = winners[0]!;
      expect(ex.answer.kind === "set" && [...ex.answer.correct].sort()).toEqual([`tanks-${w.tanks}`, `thrust-${w.engine}`]);
      const r = solved(ex);
      expect(r.kind === "mission" && r.band >= s.target && r.cost <= s.budget && r.outcome === "lift").toBe(true);
      expect(costOf(2, 3)).toBeGreaterThan(s.budget);
      expect(cells.find((c) => c.engine === 2 && c.tanks === 3)!.band).toBeGreaterThanOrEqual(s.target);
      for (const c of cells) {
        expect(c.h).toBeGreaterThan(0);
        for (const f of BAND_FLOORS.slice(1)) expect(Math.abs(c.h - f)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("every outcome has a child-readable explanation, and a correct answer always validates", () => {
    for (const ex of ALL) {
      const v = correctValue(ex.answer);
      expect(validateAnswer(ex.answer, v).correct, ex.id).toBe(true);
      const text = explain(scenarioOf(ex.params), resultOf(scenarioOf(ex.params), v), v, true);
      expect(text.length, ex.id).toBeGreaterThan(10);
      expect(text).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});

describe("Rocket Lab hints and build state", () => {
  const ex = generateBand(rocketLab, 2, 11, 1)[0]!;
  const s = scenarioOf(ex.params);
  const wrong = s.engines.filter((t) => t <= s.w).map(engineId);

  it("first miss greys out the wrong engine; second miss models the lifting engine (errorless)", () => {
    let st = initExercise(ex);
    st = exerciseReducer(st, { type: "SUBMIT", value: wrong[0]! });
    expect(st.hintStage).toBe(1);
    expect(st.eliminated).toEqual([wrong[0]]);
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: wrong[1]! });
    expect(st.hintStage).toBe(2);
    expect(st.model).toBe(correctValue(ex.answer));
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    expect(allowed(wrong[0]!, st.eliminated, st.model)).toBe(false);
    expect(allowed(st.model, st.eliminated, st.model)).toBe(true);
  });

  it("Launch submits the build: nothing until it's ready; rank keeps order; mission sends thrust + tanks", () => {
    const lab = (p: Partial<Lab>): Lab => ({ exId: "x", engine: null, crates: 0, tanks: 0, throttle: 0, pick: null, slots: [null, null, null], carry: null, built: false, ...p });
    const lift = scenarioOf(rocketTutorial.params);
    expect(submission(lift, lab({ pick: "yes" }))).toBeNull(); // engine not attached yet
    expect(submission(lift, lab({ pick: "yes", engine: "eng-6" }))).toBe("yes");
    expect(submission(s, lab({ engine: "eng-9" }))).toBe("eng-9");
    const cargo = scenarioOf(generateBand(rocketLab, 3, 1, 1)[0]!.params);
    expect(submission(cargo, lab({ crates: 0 }))).toBeNull();
    expect(submission(cargo, lab({ crates: 2 }))).toBe(2);
    const rank = scenarioOf(generateBand(rocketLab, 6, 1, 1)[0]!.params);
    expect(submission(rank, lab({ slots: ["rocket-b", null, "rocket-a"] }))).toBeNull();
    expect(submission(rank, lab({ slots: ["rocket-b", "rocket-c", "rocket-a"] }))).toEqual(["rocket-b", "rocket-c", "rocket-a"]);
    expect(allowed(["rocket-a", "rocket-b", "rocket-c"], [], ["rocket-b", "rocket-c", "rocket-a"], true)).toBe(false);
    const mission = scenarioOf(generateBand(rocketLab, 8, 1, 1)[0]!.params);
    expect(submission(mission, lab({ throttle: 1, tanks: 0 }))).toBeNull();
    expect(submission(mission, lab({ throttle: 1, tanks: 2 }))).toEqual(["thrust-1", "tanks-2"]);
    expect(allowed(["tanks-2", "thrust-1"], [], ["thrust-1", "tanks-2"])).toBe(true);
  });
});

describe("Rocket Lab voice and registry", () => {
  it("every line the world can speak exists, with vary covering every value; ≤ 17 words (ages 8–12); process praise only", () => {
    const used = new Set<string>(["rl.ready", "rl.back", "rl.idle", "rl.retry.1", "rl.hint.model", "rl.hint.modelTap", "rl.coach.predict", "rl.coach.launch"]);
    for (const n of ["1", "2", "3", "4"]) used.add(`rl.intro${n}`);
    for (const n of ["2", "4", "6"]) used.add(`rl.between${n}`);
    for (const n of ["1", "2", "3"]) used.add(`rl.outro${n}`);
    for (const ex of [rocketTutorial, ...ALL]) {
      const p = ex.prompt!;
      used.add(p.line);
      expect(lines[p.line], p.line).toBeDefined();
      for (const [k, v] of Object.entries(p.vars ?? {})) expect(lines[p.line]!.vary?.[k], `${p.line} ${k}`).toContain(v);
      expect(renderLine(p.line, { ...p.vars })).not.toMatch(/\{/);
      used.add(explainFor(ex));
      for (const id of praiseFor(ex)) used.add(id);
      for (const v of ex.answer.kind === "choice" ? ex.answer.options.map((o) => o.id) : ex.answer.kind === "number" ? ex.answer.choices ?? [] : ex.answer.kind === "set" ? [0, 1, 2].flatMap((e) => [1, 2, 3].map((n) => [`thrust-${e}`, `tanks-${n}`])) : [correctValue(ex.answer)]) {
        const st = { ...initExercise(ex), lastAnswer: v as never, attempts: 1 };
        used.add(hintFor(st));
      }
    }
    for (const id of used) expect(VOICE_LINES[id], id).toBeDefined();
    for (const id of Object.keys(lines)) expect(used.has(id), `unused line ${id}`).toBe(true);
    for (const [id, l] of Object.entries(lines)) {
      // the ≤ 14-word rule is for ages 4–8; this world is 8–12 and keeps the spec's helper lines (up to 17 words)
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(17);
      expect(l.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant|proven/);
    }
  });

  it("the science library is live with Rocket Lab playable; the registry is clean", () => {
    expect(checkRegistry()).toEqual([]);
    expect(getLibrary("sci")?.status).toBe("live");
    const w = getWorld("rocket-lab")!;
    expect(w.subject).toBe("sci");
    expect(isPlayable(w)).toBe(true);
    expect(w.maxLevel).toBe(rocketLab.progression.maxLevel);
  });
});
