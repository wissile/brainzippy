import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  BAND_FLOORS,
  BAND_LABELS,
  CHANGES,
  type Change,
  MODE,
  type ModeName,
  RANK_IDS,
  RANK_LABELS,
  TANK_CHOICES,
  apogee,
  accelOf,
  engineId,
  maxCrates,
  missionTable,
  missionWinners,
  outcomeOf,
  rankOrder,
  smallestLifter,
  speedUpChange,
  tanksId,
  thrustId,
  weightOf,
} from "./logic";

/**
 * Dabble's Rocket Lab — procedural experiments (pure: same level + rng + index → same exercise).
 * Spec: docs/curriculum/science.md §4.5; pedagogy and simplifications: docs/worlds/rocket-lab.md.
 *
 * Level (0-based) → experiment
 *   0  lift off?                 pushes, W 2–8, T = W ± 3–6 (never equal)               choice yes/no
 *   1  lift off?                 pushes, W 2–10, T = W ± 2–5; every 4th item T = W       choice yes/no
 *   2  pick the engine           pushes, W 4–15, engines {W − k, W, W + j}               choice
 *   3  most crates               pushes, rocket 4–8, crate 1–3, thrust 10–20             number (load crates)
 *   4  weight from mass / engine N, m 5–40 kg (×5), W = 10m; even items weigh, odd pick   number / choice
 *   5  Moon: mass / engine       W = 1.6m; even items ask the mass, odd the smallest engine number / choice
 *   6  rank 3 rockets            a = (T − 10m)/m ∈ 1–6, all different                    sequence
 *   7  fuel: net force / change  even items F after burning; odd faster/slower/same      number / choice
 *   8  mission planner           thrust setting × fuel tanks, target height, budget       set (thrust + tanks)
 */
export const ROCKET_AGES = [8, 12] as const;
export const SKILL = {
  balanced: "sci.force.balanced",
  weightMass: "sci.force.weight-mass",
  net: "sci.force.net",
} as const;

export interface LevelSpec {
  modes: readonly ModeName[];
  label: string;
}
export const ROCKET_LEVELS: readonly LevelSpec[] = [
  { modes: ["lift"], label: "Lift off? Big differences (pushes)" },
  { modes: ["lift"], label: "Lift off? Closer forces, sometimes balanced" },
  { modes: ["engine"], label: "Pick the one engine that lifts" },
  { modes: ["cargo"], label: "Most crates that still lift" },
  { modes: ["weight", "engineKg"], label: "Weight = mass × 10 N/kg; engine for a mass" },
  { modes: ["moonMass", "moonEngine"], label: "On the Moon: same mass, less weight" },
  { modes: ["rank"], label: "Rank rockets by speed-up (a = F ÷ m)" },
  { modes: ["fuelNet", "fuelChange"], label: "Fuel burns: net force and speed-up" },
  { modes: ["mission"], label: "Mission planner: height target within budget" },
];
export const ROCKET_MAX_LEVEL = ROCKET_LEVELS.length - 1;
/** Masses (kg) used from level 4: multiples of 5 so Moon weights are whole numbers. Voice clips cover exactly these. */
export const MASSES = [5, 10, 15, 20, 25, 30, 35, 40] as const;

const skillFor = (mode: ModeName) =>
  mode === "lift" || mode === "engine" || mode === "cargo" ? SKILL.balanced : mode === "weight" || mode === "engineKg" || mode === "moonMass" || mode === "moonEngine" ? SKILL.weightMass : SKILL.net;

type Base = Omit<Exercise, "difficulty" | "id" | "answer" | "params" | "prompt" | "a11yDescription" | "objective" | "skillId">;
const base = (seed: number, objectKind: string): Base => ({ ages: ROCKET_AGES, interaction: "choose", objectKind, seed });

/** Retry a deterministic draw until it satisfies `ok` (falls back to the last draw; tests check every case). */
function draw<T>(_rng: Rng, make: () => T, ok: (v: T) => boolean, tries = 200): T {
  let v = make();
  for (let i = 0; i < tries && !ok(v); i++) v = make();
  return v;
}

const YES_NO: readonly AnswerOption[] = [
  { id: "yes", text: "Lifts off" },
  { id: "no", text: "Stays on the pad" },
];

export function liftExercise(t: number, w: number, opts: { id: string; seed: number; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const out = outcomeOf(t, w);
  return {
    ...base(opts.seed, "rocket"),
    id: opts.id,
    skillId: SKILL.balanced,
    objective: `Predict lift-off by comparing a push up of ${t} with a pull down of ${w}`,
    ...(opts.tutorial ? { tutorial: true } : {}),
    answer: { kind: "choice", correct: out === "lift" ? "yes" : "no", options: YES_NO },
    params: { mode: MODE.lift, t, w },
    prompt: opts.tutorial
      ? { line: "rl.prompt.tutorial", text: "Drag the engine onto the rocket. Will it lift off?" }
      : { line: "rl.prompt.liftoff", text: "Attach the engine. Will this rocket lift off?" },
    a11yDescription: `A rocket on the launch pad. Gravity pulls it down with ${w} pushes. Its engine pushes up with ${t} pushes. Attach the engine, predict, then launch.`,
  };
}

function engineOptions(thrusts: readonly number[], unit: string): AnswerOption[] {
  return thrusts.map((t) => ({ id: engineId(t), text: `${t} ${unit}` }));
}

export const generateRocketLab: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(ROCKET_MAX_LEVEL, level));
  const spec = ROCKET_LEVELS[lv]!;
  const mode = spec.modes[index % spec.modes.length]!;
  const seed = rng.int(1, 999_999);
  const sfx = `l${lv}n${index}`;
  const kb = base(seed, "rocket");
  const skillId = skillFor(mode);

  switch (mode) {
    case "lift": {
      if (lv === 0) {
        const { w, t } = draw(rng, () => {
          const w = rng.int(2, 8);
          const k = rng.int(3, 6);
          return { w, t: rng.chance(0.5) ? w + k : w - k };
        }, (v) => v.t >= 1 && v.t <= 20);
        return liftExercise(t, w, { id: `rl-lift-${t}-${w}-${sfx}`, seed });
      }
      const balanced = index % 4 === 3;
      const { w, t } = draw(rng, () => {
        const w = rng.int(2, 10);
        const k = rng.int(2, 5);
        return { w, t: balanced ? w : rng.chance(0.5) ? w + k : w - k };
      }, (v) => v.t >= 1 && v.t <= 20);
      return liftExercise(t, w, { id: `rl-lift-${t}-${w}-${sfx}`, seed });
    }

    case "engine": {
      const w = rng.int(4, 15);
      const k = rng.int(1, Math.min(4, w - 1));
      const j = rng.int(1, 4);
      const thrusts = rng.shuffle([w - k, w, w + j]);
      return {
        ...kb, objectKind: "engine", id: `rl-engine-${w}-${w - k}-${w + j}-${sfx}`, skillId,
        objective: `Choose an engine whose push up beats a pull down of ${w}`,
        answer: { kind: "choice", correct: engineId(w + j), options: engineOptions(thrusts, "pushes") },
        params: { mode: MODE.engine, w, e0: thrusts[0]!, e1: thrusts[1]!, e2: thrusts[2]! },
        prompt: { line: "rl.prompt.engine", text: "Pick an engine that can lift this rocket." },
        a11yDescription: `Gravity pulls the rocket down with ${w} pushes. Three engines: ${thrusts.join(", ")} pushes. Attach one and launch.`,
      };
    }

    case "cargo": {
      const v = draw(rng, () => {
        const w0 = rng.int(4, 8);
        const c = rng.int(1, 3);
        const n = rng.int(1, 6);
        // balanced at n + 1 crates most of the time, so the "equal counts as lift" mistake is testable
        const r = rng.chance(0.6) ? c : rng.int(1, c);
        return { w0, c, n, t: w0 + n * c + r };
      }, (x) => x.t >= 10 && x.t <= 20);
      const shelf = v.n + 2;
      const n = maxCrates(v.t, v.w0, v.c);
      return {
        ...kb, objectKind: "crate", id: `rl-cargo-${v.t}-${v.w0}-${v.c}-${sfx}`, skillId,
        objective: `Load the most ${v.c}-push crates onto a ${v.w0}-push rocket that a ${v.t}-push engine can still lift`,
        answer: { kind: "number", value: n, choices: Array.from({ length: shelf }, (_, i) => i + 1) },
        params: { mode: MODE.cargo, t: v.t, w: v.w0, c: v.c, shelf },
        prompt: { line: "rl.prompt.cargo", text: "How many crates can we add and still lift off?" },
        a11yDescription: `The engine pushes up with ${v.t} pushes. The empty rocket weighs ${v.w0} pushes and each seed crate adds ${v.c}. Load crates, then launch.`,
      };
    }

    case "weight": {
      const m = rng.pick(MASSES);
      const w = weightOf(m);
      const choices = rng.shuffle([m, m + 10, w, w + 10]);
      return {
        ...kb, objectKind: "scale", id: `rl-weight-${m}-${sfx}`, skillId,
        objective: `Work out that ${m} kg weighs ${w} N on Earth (W = m × 10 N/kg)`,
        answer: { kind: "number", value: w, choices },
        params: { mode: MODE.weight, m },
        prompt: { line: "rl.prompt.weight", vars: { m }, text: `This rocket has a mass of ${m} kg. What does it weigh on Earth?` },
        a11yDescription: `A rocket with a mass of ${m} kilograms on Earth, where gravity pulls 10 newtons on every kilogram. Choose its weight, then weigh it.`,
      };
    }

    case "engineKg": {
      const m = rng.pick(MASSES);
      const w = weightOf(m);
      const k = rng.int(1, 4);
      const j = rng.int(1, 4);
      const thrusts = rng.shuffle([w - 10 * k, w, w + 10 * j]);
      return {
        ...kb, objectKind: "engine", id: `rl-enginekg-${m}-${w - 10 * k}-${w + 10 * j}-${sfx}`, skillId,
        objective: `Work out the weight of ${m} kg (${w} N) and pick an engine that beats it`,
        answer: { kind: "choice", correct: engineId(w + 10 * j), options: engineOptions(thrusts, "N") },
        params: { mode: MODE.engineKg, m, e0: thrusts[0]!, e1: thrusts[1]!, e2: thrusts[2]! },
        prompt: { line: "rl.prompt.engineKg", vars: { m }, text: `Mass ${m} kg. Pick an engine that can lift it.` },
        a11yDescription: `A rocket with a mass of ${m} kilograms on Earth (10 newtons per kilogram). Engines: ${thrusts.join(", ")} newtons. Attach one and launch.`,
      };
    }

    case "moonMass": {
      const m = rng.pick(MASSES);
      const choices = rng.shuffle([m, weightOf(m, "moon"), weightOf(m)]);
      return {
        ...kb, objectKind: "moon", id: `rl-moonmass-${m}-${sfx}`, skillId,
        objective: `Know that a ${m} kg rocket still has a mass of ${m} kg on the Moon`,
        answer: { kind: "number", value: m, choices },
        params: { mode: MODE.moonMass, m, planet: 1 },
        prompt: { line: "rl.prompt.moon", text: `On Earth this rocket has a mass of ${m} kg. What is its mass on the Moon?` },
        a11yDescription: `The same rocket, now on the Moon. On Earth its mass was ${m} kilograms. On the Moon gravity pulls 1.6 newtons on every kilogram. Choose its mass here, then weigh it.`,
      };
    }

    case "moonEngine": {
      const m = rng.pick(MASSES);
      const w = weightOf(m, "moon");
      const low = w <= 16 || rng.chance(0.5) ? w : w - 8 * rng.int(1, 2); // balanced, or too weak
      const best = w + 8 * rng.int(1, 3);
      const earth = weightOf(m) + 10; // an engine sized for Earth: lifts here too, but far bigger than needed
      const thrusts = rng.shuffle([low, best, earth]);
      return {
        ...kb, objectKind: "moon", id: `rl-moonengine-${m}-${low}-${best}-${sfx}`, skillId,
        objective: `Use the Moon weight of ${m} kg (${w} N) to pick the smallest engine that lifts it`,
        answer: { kind: "choice", correct: engineId(smallestLifter(thrusts, w)!), options: engineOptions(thrusts, "N") },
        params: { mode: MODE.moonEngine, m, planet: 1, e0: thrusts[0]!, e1: thrusts[1]!, e2: thrusts[2]! },
        prompt: { line: "rl.prompt.moonEngine", text: `Mass ${m} kg, on the Moon. Pick the smallest engine that lifts it.` },
        a11yDescription: `A rocket with a mass of ${m} kilograms on the Moon (1.6 newtons per kilogram). Engines: ${thrusts.join(", ")} newtons. Attach the smallest one that lifts it, then launch.`,
      };
    }

    case "rank": {
      const rockets = draw(rng, () => {
        const as = rng.shuffle([1, 2, 3, 4, 5, 6]).slice(0, 3);
        return as.map((a, i) => {
          const m = rng.pick([5, 10, 15, 20, 25]);
          return { id: RANK_IDS[i]!, label: RANK_LABELS[i]!, m, t: m * (10 + a) };
        });
      }, (rs) => {
        if (rs.some((r) => r.t > 400)) return false;
        const order = rankOrder(rs);
        const byThrust = [...rs].sort((x, y) => y.t - x.t).map((r) => r.id);
        const byMass = [...rs].sort((x, y) => y.m - x.m).map((r) => r.id);
        const trap = rs.some((x) => rs.some((y) => x.m > y.m && x.t > y.t && accelOf(x.t, x.m) < accelOf(y.t, y.m)));
        return trap && order.join() !== byThrust.join() && order.join() !== byMass.join() && new Set(rs.map((r) => r.t)).size === 3;
      });
      const order = rankOrder(rockets);
      const p: Record<string, number> = { mode: MODE.rank };
      rockets.forEach((r, i) => {
        p[`m${i}`] = r.m;
        p[`t${i}`] = r.t;
      });
      return {
        ...kb, objectKind: "race", id: `rl-rank-${rockets.map((r) => `${r.m}x${r.t}`).join("-")}-${sfx}`, skillId,
        objective: "Rank rockets by acceleration using a = (thrust − weight) ÷ mass",
        answer: { kind: "sequence", order, pieces: rockets.map((r) => ({ id: r.id, text: `Rocket ${r.label}` })) },
        params: p,
        prompt: { line: "rl.prompt.rank", text: "Which rocket speeds up fastest? Put them in order." },
        a11yDescription: `Three rockets on Earth. ${rockets.map((r) => `Rocket ${r.label}: mass ${r.m} kilograms, thrust ${r.t} newtons`).join(". ")}. Put them in order, fastest speed-up first.`,
      };
    }

    case "fuelNet":
    case "fuelChange": {
      const change: Change = mode === "fuelNet" ? "burn" : CHANGES[Math.floor(index / 2) % 3]!;
      const v = draw(rng, () => {
        const m = rng.pick([10, 15, 20, 25, 30]);
        const a = rng.int(1, 4);
        const d = rng.pick([5, 10]);
        return { m, a, d, t: m * (10 + a) };
      }, (x) => x.t <= 400 && x.d < x.m && (change !== "load" || x.a * x.m > 10 * x.d));
      const { m, a, d, t } = v;
      const m2 = change === "load" ? m + d : m - d;
      const t2 = change === "throttle" ? m2 * (10 + a) : t;
      const p = { mode: MODE[mode], t, m, d, t2, m2, change: CHANGES.indexOf(change) };
      if (mode === "fuelNet") {
        const f = t - weightOf(m);
        const f2 = t2 - weightOf(m2);
        return {
          ...kb, objectKind: "fuel", id: `rl-fuelnet-${t}-${m}-${d}-${sfx}`, skillId,
          objective: `After burning ${d} kg of fuel, find the new net force: ${t} − 10 × ${m2} = ${f2} N`,
          answer: { kind: "number", value: f2, choices: rng.shuffle([f, f2, f + d]) },
          params: p,
          prompt: { line: "rl.prompt.fuelNet", text: `${d} kg of fuel burned. What is the net force now?` },
          a11yDescription: `Before: thrust ${t} newtons, mass ${m} kilograms, net force ${f} newtons. Then ${d} kilograms of fuel burn away; the thrust stays ${t} newtons. Choose the new net force, then run the test.`,
        };
      }
      const correct = speedUpChange(t, m, t2, m2);
      const prompt =
        change === "burn"
          ? { line: "rl.prompt.fuel", text: "The fuel is burning. What happens to the speed-up?" }
          : change === "load"
            ? { line: "rl.prompt.load", text: "Dabble adds more cargo. What happens to the speed-up?" }
            : { line: "rl.prompt.throttle", text: "Fuel burns and the engine is turned down. What happens to the speed-up?" };
      return {
        ...kb, objectKind: "fuel", id: `rl-fuel-${change}-${t}-${m}-${d}-${sfx}`, skillId,
        objective: "Predict how a change in mass or thrust changes acceleration (a = F ÷ m)",
        answer: {
          kind: "choice",
          correct,
          options: [
            { id: "faster", text: "Speeds up faster" },
            { id: "slower", text: "Speeds up slower" },
            { id: "same", text: "Same speed-up" },
          ],
        },
        params: p,
        prompt,
        a11yDescription: `Before: thrust ${t} newtons, mass ${m} kilograms. After: thrust ${t2} newtons, mass ${m2} kilograms. Predict the speed-up, then run the test.`,
      };
    }

    case "mission": {
      const v = draw(rng, () => {
        const m0 = rng.pick([10, 15, 20]);
        const s0 = rng.pick([30, 60, 90]);
        const step = rng.pick([40, 60, 80]);
        const b = 10 * (m0 + 15) + s0;
        const thrusts = [b, b + step, b + 2 * step];
        const target = rng.int(1, 3);
        return { m0, thrusts, target };
      }, (x) => missionOk(x.thrusts, x.m0, x.target));
      const cells = missionTable(v.thrusts, v.m0);
      const reach = cells.filter((c) => c.band >= v.target).sort((a, b) => a.cost - b.cost);
      const win = reach[0]!;
      const options: AnswerOption[] = [
        ...v.thrusts.map((t, i) => ({ id: thrustId(i), text: `Thrust ${t} N` })),
        ...TANK_CHOICES.map((n) => ({ id: tanksId(n), text: `${n} fuel ${n === 1 ? "tank" : "tanks"}` })),
      ];
      return {
        ...kb, objectKind: "planner", id: `rl-mission-${v.m0}-${v.thrusts.join("-")}-${v.target}-${sfx}`, skillId,
        objective: `Use test data to choose the cheapest thrust and fuel that still reach ${BAND_LABELS[v.target]}`,
        answer: { kind: "set", correct: [thrustId(win.engine), tanksId(win.tanks)], options },
        params: { mode: MODE.mission, m: v.m0, k0: v.thrusts[0]!, k1: v.thrusts[1]!, k2: v.thrusts[2]!, target: v.target, budget: win.cost },
        prompt: { line: "rl.prompt.mission", text: `Reach ${BAND_FLOORS[v.target]} m or higher. Budget: ${win.cost} coins.` },
        a11yDescription: `Mission planner. Dry rocket mass ${v.m0} kilograms. Reach at least ${BAND_FLOORS[v.target]} metres and spend no more than ${win.cost} coins. Set the thrust, load fuel tanks, then launch.`,
      };
    }
  }
};

/**
 * A mission is fair when: every combination lifts off, no height sits within 3 m of a band edge (no
 * rounding surprises), at least two combinations reach the target (so cost matters), the winner is not the
 * biggest engine with the most fuel, and at least one cheaper combination falls short.
 */
export function missionOk(thrusts: readonly number[], m0: number, target: number): boolean {
  const cells = missionTable(thrusts, m0);
  if (cells.some((c) => c.h <= 0 || BAND_FLOORS.some((f) => f > 0 && Math.abs(c.h - f) < 3))) return false;
  const reach = cells.filter((c) => c.band >= target).sort((a, b) => a.cost - b.cost);
  if (reach.length < 2) return false;
  const win = reach[0]!;
  if (win.engine === 2 && win.tanks === 3) return false;
  if (missionWinners(cells, target, win.cost).length !== 1) return false;
  return cells.some((c) => c.cost < win.cost && c.band < target) && apogee(thrusts[0]!, m0, 1) > 0;
}
