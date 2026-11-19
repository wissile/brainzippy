import type { AnswerKey, AnswerValue } from "../../engine/types";
import { type Scenario, TANK_CHOICES, tanksId, thrustId } from "./logic";

/**
 * The child's build for the current exercise, shared by the board (parts, rocket) and the tray (prediction
 * cards, Launch). Keyed by exercise id: a stale build never leaks into the next experiment.
 */
export type Carry =
  | { kind: "engine"; id: string; from: "shelf" | "mount" }
  | { kind: "crate"; from: "shelf" | "bay" }
  | { kind: "tank"; from: "shelf" | "bay" }
  | { kind: "rocket"; id: string; from: number | "hangar" };

export interface Lab {
  exId: string;
  engine: string | null;
  crates: number;
  tanks: number;
  throttle: number;
  pick: string | number | null;
  slots: (string | null)[];
  carry: Carry | null;
  /** The engine has been attached at least once (lift mode unlocks the prediction cards). */
  built: boolean;
}

const fresh = (exId: string): Lab => ({ exId, engine: null, crates: 0, tanks: 0, throttle: 0, pick: null, slots: [null, null, null], carry: null, built: false });

let current: Lab = fresh("");
let spare: Lab = current; // a cached fresh build, so snapshots stay stable before the first change
const listeners = new Set<() => void>();

export const labStore = {
  get: (): Lab => current,
  /** The build for `exId` (a fresh one if the store still holds another exercise). */
  for(exId: string): Lab {
    if (current.exId === exId) return current;
    if (spare.exId !== exId) spare = fresh(exId);
    return spare;
  },
  update(exId: string, change: (l: Lab) => Partial<Lab>) {
    const base = current.exId === exId ? current : fresh(exId);
    current = { ...base, ...change(base) };
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/** What Launch would submit for this build, or null when the build isn't ready yet. */
export function submission(s: Scenario, lab: Lab): AnswerValue | null {
  switch (s.mode) {
    case "lift":
      return lab.engine && typeof lab.pick === "string" ? lab.pick : null;
    case "weight":
    case "moonMass":
    case "fuelNet":
      return typeof lab.pick === "number" ? lab.pick : null;
    case "fuelChange":
      return typeof lab.pick === "string" ? lab.pick : null;
    case "engine":
    case "engineKg":
    case "moonEngine":
      return lab.engine;
    case "cargo":
      return lab.crates >= 1 ? lab.crates : null;
    case "rank":
      return lab.slots.every((x) => x) ? (lab.slots as string[]) : null;
    case "mission":
      return lab.tanks >= 1 && (TANK_CHOICES as readonly number[]).includes(lab.tanks) ? [thrustId(lab.throttle), tanksId(lab.tanks)] : null;
  }
}

/** Can this value be submitted now? (Nothing greyed out by a hint; once modelled, only the model.) `ordered`: sequences. */
export function allowed(value: AnswerValue | null, eliminated: readonly AnswerKey[], model: AnswerValue | null, ordered = false): boolean {
  if (value === null) return false;
  const keys: AnswerKey[] = Array.isArray(value) ? [...(value as string[])] : typeof value === "object" ? [] : [value as AnswerKey];
  if (keys.some((k) => eliminated.includes(k))) return false;
  if (model === null) return true;
  if (Array.isArray(model) && Array.isArray(value)) {
    const a = [...(model as string[])];
    const b = [...(value as string[])];
    return ordered ? a.join() === b.join() : a.sort().join() === b.sort().join();
  }
  return model === value;
}
