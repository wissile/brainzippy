/**
 * Dabble's Rocket Lab — pure physics + scenario logic (no React, no DOM). One model is shared by the
 * generator, the board, the hints and the unit tests, so a prediction and the flight that tests it can
 * never disagree. Every simplification is documented in docs/worlds/rocket-lab.md and labelled in the UI.
 *
 * Model (simplified honestly for ages 8–12):
 *   weight W = m × g          g_Earth = 10 N/kg (rounded from 9.8), g_Moon = 1.6 N/kg
 *   net force F = T − W       thrust up minus weight down (one dimension, no air resistance)
 *   lift-off  ⇔ T > W         T = W is "balanced": a rocket at rest stays at rest; T < W: it stays on the pad
 *   acceleration a = F / m    (m/s², constant thrust)
 * Levels 0–3 use made-up whole-number force units ("pushes"); levels 4+ use newtons and kilograms.
 */

export const G_EARTH = 10;
export const G_MOON = 1.6;
export type Planet = "earth" | "moon";
export type Outcome = "lift" | "balanced" | "stay";

/** Weight in newtons. Moon weights are exact whole numbers for masses that are multiples of 5 kg (m × 8 / 5). */
export const weightOf = (m: number, planet: Planet = "earth"): number => (planet === "moon" ? (m * 8) / 5 : m * G_EARTH);
export const net = (thrust: number, weight: number): number => thrust - weight;
export const outcomeOf = (thrust: number, weight: number): Outcome => (thrust > weight ? "lift" : thrust === weight ? "balanced" : "stay");
/** a = (T − W) / m in m/s² (negative = would not lift; the pad holds it, so the board shows 0). */
export const accelOf = (thrust: number, m: number, planet: Planet = "earth"): number => (thrust - weightOf(m, planet)) / m;

// ---------------------------------------------------------------- modes (params.mode codes)

export const MODE = {
  lift: 1, // will it lift off? (pushes) — choice yes/no
  engine: 2, // pick the engine that lifts (pushes) — choice
  cargo: 3, // most crates while still lifting (pushes) — number (built by loading crates)
  weight: 4, // weight from mass on Earth (N) — number
  engineKg: 5, // pick the engine for a rocket given in kg (N) — choice
  moonMass: 6, // mass on the Moon — number
  moonEngine: 7, // smallest engine that lifts on the Moon — choice
  rank: 8, // rank 3 rockets by acceleration — sequence
  fuelNet: 9, // net force after fuel burns — number
  fuelChange: 10, // faster / slower / same speed-up — choice
  mission: 11, // thrust × fuel planner within budget — set
} as const;
export type ModeName = keyof typeof MODE;
export const modeName = (code: number | undefined): ModeName => (Object.keys(MODE) as ModeName[]).find((k) => MODE[k] === code) ?? "lift";

/** What the Launch button does in each mode (the "test" step of predict → test → observe → explain). */
export const TEST_KIND: Record<ModeName, "launch" | "weigh" | "race" | "compare"> = {
  lift: "launch", engine: "launch", cargo: "launch", weight: "weigh", engineKg: "launch", moonMass: "weigh",
  moonEngine: "launch", rank: "race", fuelNet: "compare", fuelChange: "compare", mission: "launch",
};
/** Modes in made-up "pushes"; the rest use newtons. */
export const usesPushes = (mode: ModeName) => mode === "lift" || mode === "engine" || mode === "cargo";
/** Modes where the weight is hidden (only the mass is shown) until Rumble weighs the rocket. */
export const weightHidden = (mode: ModeName) => mode === "engineKg" || mode === "moonEngine" || mode === "weight" || mode === "moonMass";

// ---------------------------------------------------------------- cargo

/** Most crates (each c) a rocket of weight w0 can carry with thrust t and still lift off: w0 + n·c < t. */
export const maxCrates = (t: number, w0: number, c: number): number => Math.max(0, Math.ceil((t - w0) / c) - 1);

// ---------------------------------------------------------------- engines

export const engineId = (thrust: number) => `eng-${thrust}`;
export const engineThrust = (id: string): number => Number(id.replace(/^eng-/, ""));
/** The smallest listed engine that lifts a rocket of this weight (null if none does). */
export function smallestLifter(thrusts: readonly number[], weight: number): number | null {
  const ok = thrusts.filter((t) => t > weight).sort((a, b) => a - b);
  return ok[0] ?? null;
}

// ---------------------------------------------------------------- ranking

export interface RankRocket {
  id: string;
  label: string;
  m: number;
  t: number;
}
export const RANK_IDS = ["rocket-a", "rocket-b", "rocket-c"] as const;
export const RANK_LABELS = ["A", "B", "C"] as const;
/** Fastest speed-up first. */
export const rankOrder = (rs: readonly RankRocket[]): string[] => [...rs].sort((x, y) => accelOf(y.t, y.m) - accelOf(x.t, x.m)).map((r) => r.id);

// ---------------------------------------------------------------- fuel change

export type Change = "burn" | "load" | "throttle";
export const CHANGES: readonly Change[] = ["burn", "load", "throttle"];
export type SpeedUp = "faster" | "slower" | "same";
/** Compare the speed-up before (t, m) and after (t2, m2), on Earth. */
export function speedUpChange(t: number, m: number, t2: number, m2: number): SpeedUp {
  // compare a = t/m − 10 without floating error: t2/m2 vs t/m  ⇔  t2·m vs t·m2
  const l = t2 * m;
  const r = t * m2;
  return l > r ? "faster" : l < r ? "slower" : "same";
}

// ---------------------------------------------------------------- mission planner

/** Fuel per tank (kg) and burn rate (kg/s): each tank burns for 2 s. */
export const TANK_KG = 5;
export const BURN_KG_PER_S = 2.5;
/** Engine settings cost 2 / 5 / 8 coins; each fuel tank costs 1 coin, so every combination has a different cost. */
export const ENGINE_COST = [2, 5, 8] as const;
export const TANK_COST = 1;
export const TANK_CHOICES = [1, 2, 3] as const;
/** Height bands (metres): 0 = under 100, 1 = 100–199, 2 = 200–399, 3 = 400 and up. */
export const BAND_FLOORS = [0, 100, 200, 400] as const;
export const BAND_LABELS = ["under 100 m", "100–199 m", "200–399 m", "400 m +"] as const;
export const BAND_SHORT = ["< 100 m", "100–199 m", "200–399 m", "400 m +"] as const;
export const BAND_NAMES = ["treetops", "hilltop", "clouds", "high sky"] as const;

/**
 * Highest point (m) for constant thrust t, dry mass m0 and `tanks` of fuel on Earth, no air resistance.
 * The rocket gets lighter as fuel burns (mass is integrated step by step, dt = 0.01 s), then coasts up.
 */
export function apogee(t: number, m0: number, tanks: number): number {
  let fuel = tanks * TANK_KG;
  let h = 0;
  let v = 0;
  const dt = 0.01;
  for (let i = 0; i < 100_000 && fuel > 1e-9; i++) {
    const a = t / (m0 + fuel) - G_EARTH;
    if (h <= 0 && a <= 0) {
      fuel -= BURN_KG_PER_S * dt; // held by the pad
      continue;
    }
    v += a * dt;
    h += v * dt;
    fuel -= BURN_KG_PER_S * dt;
  }
  return Math.max(0, h + (v > 0 ? (v * v) / (2 * G_EARTH) : 0));
}
export const bandOf = (h: number): number => (h >= BAND_FLOORS[3] ? 3 : h >= BAND_FLOORS[2] ? 2 : h >= BAND_FLOORS[1] ? 1 : 0);
export const thrustId = (i: number) => `thrust-${i}`;
export const tanksId = (n: number) => `tanks-${n}`;
export const costOf = (engine: number, tanks: number) => ENGINE_COST[engine]! + tanks * TANK_COST;

export interface MissionCell {
  engine: number;
  tanks: number;
  h: number;
  band: number;
  cost: number;
}
export function missionTable(thrusts: readonly number[], m0: number): MissionCell[] {
  const out: MissionCell[] = [];
  for (let e = 0; e < thrusts.length; e++)
    for (const n of TANK_CHOICES) {
      const h = apogee(thrusts[e]!, m0, n);
      out.push({ engine: e, tanks: n, h, band: bandOf(h), cost: costOf(e, n) });
    }
  return out;
}
/** The combinations that meet the mission: reach the target band and cost no more than the budget. */
export const missionWinners = (cells: readonly MissionCell[], target: number, budget: number) => cells.filter((c) => c.band >= target && c.cost <= budget);

// ---------------------------------------------------------------- scenario (decoded from exercise params)

export interface Scenario {
  mode: ModeName;
  planet: Planet;
  /** thrust of the fixed engine (lift, cargo, fuel) */
  t: number;
  /** weight of the rocket (pushes or N) before cargo */
  w: number;
  /** mass in kg (N levels) */
  m: number;
  /** engine thrusts on the shelf (engine modes) */
  engines: number[];
  /** crate weight and number of crates on the shelf (cargo) */
  c: number;
  shelf: number;
  rockets: RankRocket[];
  /** fuel change */
  change: Change;
  d: number;
  t2: number;
  m2: number;
  /** mission */
  thrusts: number[];
  target: number;
  budget: number;
}

type P = Readonly<Record<string, number>> | undefined;
export function scenarioOf(p: P): Scenario {
  const g = (k: string) => p?.[k] ?? 0;
  const mode = modeName(p?.mode);
  const planet: Planet = g("planet") === 1 ? "moon" : "earth";
  const m = g("m");
  const engines = [g("e0"), g("e1"), g("e2")].filter((x) => x > 0);
  const rockets: RankRocket[] = RANK_IDS.map((id, i) => ({ id, label: RANK_LABELS[i]!, m: g(`m${i}`), t: g(`t${i}`) })).filter((r) => r.m > 0);
  const change = CHANGES[g("change")] ?? "burn";
  const w = mode === "lift" || mode === "engine" || mode === "cargo" ? g("w") : weightOf(m, planet);
  return {
    mode, planet, t: g("t"), w, m, engines, c: g("c"), shelf: g("shelf"), rockets, change, d: g("d"), t2: g("t2"), m2: g("m2"),
    thrusts: [g("k0"), g("k1"), g("k2")].filter((x) => x > 0), target: g("target"), budget: g("budget"),
  };
}

/** What the child sees happen when they test a submitted value (the flight never lies). */
export type Result =
  | { kind: "launch"; outcome: Outcome; thrust: number; weight: number }
  | { kind: "weigh"; weight: number; mass: number; planet: Planet }
  | { kind: "race"; accels: Record<string, number> }
  | { kind: "compare"; before: number; after: number }
  | { kind: "mission"; h: number; band: number; cost: number; outcome: Outcome };

export function resultOf(s: Scenario, value: unknown): Result {
  switch (s.mode) {
    case "lift":
      return { kind: "launch", outcome: outcomeOf(s.t, s.w), thrust: s.t, weight: s.w };
    case "engine":
    case "engineKg":
    case "moonEngine": {
      const thrust = typeof value === "string" ? engineThrust(value) : 0;
      return { kind: "launch", outcome: outcomeOf(thrust, s.w), thrust, weight: s.w };
    }
    case "cargo": {
      const n = typeof value === "number" ? value : 0;
      const weight = s.w + n * s.c;
      return { kind: "launch", outcome: outcomeOf(s.t, weight), thrust: s.t, weight };
    }
    case "weight":
      return { kind: "weigh", weight: weightOf(s.m, "earth"), mass: s.m, planet: "earth" };
    case "moonMass":
      return { kind: "weigh", weight: weightOf(s.m, "moon"), mass: s.m, planet: "moon" };
    case "rank":
      return { kind: "race", accels: Object.fromEntries(s.rockets.map((r) => [r.id, accelOf(r.t, r.m)])) };
    case "fuelNet":
    case "fuelChange":
      return { kind: "compare", before: accelOf(s.t, s.m), after: accelOf(s.t2, s.m2) };
    case "mission": {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      const e = Number(ids.find((x) => x.startsWith("thrust-"))?.slice(7) ?? 0);
      const n = Number(ids.find((x) => x.startsWith("tanks-"))?.slice(6) ?? 1);
      const thrust = s.thrusts[e] ?? 0;
      const h = apogee(thrust, s.m, n);
      return { kind: "mission", h, band: bandOf(h), cost: costOf(e, n), outcome: outcomeOf(thrust, weightOf(s.m + n * TANK_KG)) };
    }
  }
}

/** Format an acceleration for display: whole numbers as is, otherwise one decimal place. */
export const fmtA = (a: number) => (Number.isInteger(a) ? String(a) : (Math.round(a * 10) / 10).toFixed(1));
