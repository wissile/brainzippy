import type { AnswerKey, AnswerValue, Exercise } from "../../engine/types";
import {
  ACTIONS,
  type ActionId,
  type Animal,
  ANIMALS,
  CHAIN_NAMES,
  type ChainId,
  FACT_QS,
  type FactQ,
  FOODS,
  type FoodId,
  GRAZERS,
  GRAZER_NAMES,
  HOME_ITEMS,
  type HomeItemId,
  NOT_GRAZER_WHY,
  PLANT_COUNT,
  type Run,
  SLOT_COND,
  SLOT_IDS,
  SLOT_TEXT,
  STORIES,
  type SlotCond,
  type Story,
  USUAL_HIGH,
  WEEKS,
  ZONES,
  type ZoneId,
  riskiestRun,
  runId,
  runsOf,
  weeksAbove,
} from "./facts";
import { type ModeName, modeOf } from "./generator";

/**
 * The board's model of one item, independent of React: what can be moved (cards), where it can go
 * (targets), what the child's arrangement submits, the worked example, and the words that explain a result.
 * Every board interaction (drag, tap-tap, keyboard) goes through `placeCard`.
 */

export interface Card {
  id: string;
  label: string;
  art?: string;
}
export interface Target {
  id: string;
  label: string;
  art?: string;
  /** How many cards fit (1 = a slot that swaps; Infinity = a zone or bin). */
  cap: number;
  cond?: SlotCond;
}
export interface Scene {
  mode: ModeName;
  cards: Card[];
  targets: Target[];
  animal?: Animal;
  fact?: FactQ;
  story?: Story;
  temps?: number[];
  runs?: Run[];
  conds?: SlotCond[];
}
/** card id → target id */
export type Placement = Readonly<Record<string, string>>;

export const FRAG_IDS = Array.from({ length: PLANT_COUNT }, (_, i) => `frag-${i}`);

export function sceneOf(ex: Exercise): Scene {
  const p = ex.params;
  const mode = modeOf(p);
  const a = ex.answer;
  const opts = (xs: readonly { id: string; text?: string; art?: string }[]): Card[] => xs.map((o) => ({ id: o.id, label: o.text ?? o.id, art: o.art }));
  switch (mode) {
    case "eats": {
      const an = ANIMALS[p?.a ?? 0]!;
      const foods = a.kind === "choice" ? a.options : [];
      return { mode, animal: an, cards: [{ id: an.id, label: cap(an.name), art: an.id }], targets: foods.map((f) => ({ id: f.id, label: f.text ?? f.id, art: f.art, cap: 1 })) };
    }
    case "home":
    case "sort":
      if (a.kind !== "match") break;
      return { mode, cards: opts(a.items), targets: a.targets.map((t) => ({ id: t.id, label: t.text ?? t.id, art: t.art, cap: Infinity })) };
    case "chain":
    case "story": {
      if (a.kind !== "sequence") break;
      const story = mode === "story" ? STORIES[p?.s ?? 0] : undefined;
      return { mode, story, cards: opts(a.pieces), targets: a.order.map((_, i) => ({ id: `slot-${i}`, label: `Step ${i + 1}`, cap: 1 })) };
    }
    case "fact": {
      if (a.kind !== "choice") break;
      const fact = FACT_QS[p?.q ?? 0];
      return { mode, fact, cards: opts(a.options), targets: [{ id: "blank", label: "the gap", cap: 1 }] };
    }
    case "grazers":
      if (a.kind !== "set") break;
      return { mode, cards: opts(a.options), targets: [{ id: "reef", label: "the algae-covered coral", cap: Infinity }] };
    case "plant": {
      const conds = SLOT_IDS.map((_, i) => SLOT_COND[p?.[`s${i}`] ?? 0] ?? "good");
      return {
        mode,
        conds,
        cards: FRAG_IDS.map((id) => ({ id, label: "Coral piece", art: "coral" })),
        targets: SLOT_IDS.map((id, i) => ({ id, label: `Spot ${i + 1}, ${SLOT_TEXT[conds[i]!].label}`, cap: 1, cond: conds[i] })),
      };
    }
    case "risk":
    case "count": {
      const temps = Array.from({ length: WEEKS }, (_, i) => p?.[`t${i}`] ?? 0);
      const runs = runsOf(temps, p?.line ?? USUAL_HIGH);
      return { mode, temps, runs, cards: [], targets: [] };
    }
  }
  return { mode, cards: [], targets: [] };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cards currently on a target. */
export const cardsOn = (place: Placement, target: string) => Object.keys(place).filter((c) => place[c] === target);

/**
 * Put `card` on `target` ("shelf" = take it off). A full one-card slot swaps: its card goes where the moved
 * card came from (or back to the shelf). Returns a new placement.
 */
export function placeCard(scene: Scene, place: Placement, card: string, target: string): Record<string, string> {
  const next: Record<string, string> = { ...place };
  if (target === "shelf") {
    delete next[card];
    return next;
  }
  const t = scene.targets.find((x) => x.id === target);
  if (!t || !scene.cards.some((c) => c.id === card)) return next;
  const from = place[card];
  if (t.cap === 1) {
    for (const other of cardsOn(place, target)) {
      if (other === card) continue;
      if (from) next[other] = from;
      else delete next[other];
    }
  }
  next[card] = target;
  return next;
}

/** What Check would submit for this arrangement, or null while it isn't complete. */
export function submission(scene: Scene, place: Placement, pick: string | number | null): AnswerValue | null {
  switch (scene.mode) {
    case "eats":
      return scene.animal ? (place[scene.animal.id] ?? null) : null;
    case "fact":
      return cardsOn(place, "blank")[0] ?? null;
    case "home":
    case "sort":
      return scene.cards.every((c) => place[c.id]) ? Object.fromEntries(scene.cards.map((c) => [c.id, place[c.id]!])) : null;
    case "chain":
    case "story": {
      const order = scene.targets.map((t) => cardsOn(place, t.id)[0] ?? null);
      return order.every((x) => x) ? (order as string[]) : null;
    }
    case "grazers": {
      const on = scene.cards.filter((c) => place[c.id] === "reef").map((c) => c.id);
      return on.length ? on : null;
    }
    case "plant": {
      const slots = scene.targets.filter((t) => cardsOn(place, t.id).length > 0).map((t) => t.id);
      return slots.length === PLANT_COUNT ? slots : null;
    }
    case "risk":
      return typeof pick === "string" ? pick : null;
    case "count":
      return typeof pick === "number" ? pick : null;
  }
}

/** Can this value be submitted now? Nothing greyed out by a hint; once modelled, only the model. */
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
  if (typeof model === "object" && typeof value === "object") {
    const m = model as Record<string, string>;
    const v = value as Record<string, string>;
    return Object.keys(m).length === Object.keys(v).length && Object.keys(m).every((k) => m[k] === v[k]);
  }
  return model === value;
}

/** Number of worked-example steps the runner animates on the second miss. */
export function stepsOf(scene: Scene, ex: Exercise): number {
  const a = ex.answer;
  switch (scene.mode) {
    case "eats":
    case "fact":
      return 1;
    case "chain":
    case "story":
      return scene.targets.length;
    case "home":
    case "sort":
      return scene.cards.length;
    case "grazers":
      return a.kind === "set" ? a.correct.length : 1;
    case "plant":
      return PLANT_COUNT;
    case "risk":
      return Math.max(1, scene.runs?.length ?? 1);
    case "count":
      return Math.max(1, weeksAbove(scene.temps ?? []));
  }
}

/** The model arrangement after `k` worked-example steps (cards move into place one by one). */
export function modelPlacement(scene: Scene, model: AnswerValue | null, k: number): Record<string, string> {
  const out: Record<string, string> = {};
  if (model === null || k <= 0) return out;
  switch (scene.mode) {
    case "eats":
      if (scene.animal && typeof model === "string") out[scene.animal.id] = model;
      break;
    case "fact":
      if (typeof model === "string") out[model] = "blank";
      break;
    case "chain":
    case "story":
      (model as string[]).slice(0, k).forEach((id, i) => (out[id] = `slot-${i}`));
      break;
    case "home":
    case "sort": {
      const m = model as Record<string, string>;
      scene.cards.slice(0, k).forEach((c) => (out[c.id] = m[c.id]!));
      break;
    }
    case "grazers":
      (model as string[]).slice(0, k).forEach((id) => (out[id] = "reef"));
      break;
    case "plant":
      (model as string[]).slice(0, k).forEach((slot, i) => (out[FRAG_IDS[i]!] = slot));
      break;
    default:
      break;
  }
  return out;
}

/**
 * After a first miss: wrong cards float back to the shelf; right parts stay (marked is-ok).
 * `parts`: the engine's per-part check (sequence: slot index; set: option id; match: item id).
 */
export function keepAfterMiss(scene: Scene, place: Placement, parts: Readonly<Record<string, boolean>> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const ok = (k: string) => parts?.[k] === true;
  for (const [card, target] of Object.entries(place)) {
    switch (scene.mode) {
      case "chain":
      case "story":
        if (ok(target.replace("slot-", ""))) out[card] = target;
        break;
      case "home":
      case "sort":
      case "grazers":
        if (ok(card)) out[card] = target;
        break;
      case "plant":
        if (ok(target)) out[card] = target;
        break;
      default:
        break; // choices: the card floats back; the wrong spot is greyed out
    }
  }
  return out;
}

/** Is this spot/card greyed out (cannot be used) by a hint? */
export const isOut = (eliminated: readonly AnswerKey[], id: string) => eliminated.includes(id);

// ---------------------------------------------------------------- words

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The "explain" step after Check: what is true and why, in words a child can read (also announced). */
export function explain(scene: Scene, value: AnswerValue | null, correct: boolean): string {
  switch (scene.mode) {
    case "eats": {
      const a = scene.animal!;
      if (correct) return a.fact;
      const f = typeof value === "string" ? FOODS[value as FoodId] : undefined;
      return `Not ${f ? f.say : "that"}. Look at the ${a.name}'s mouth: ${a.clue.toLowerCase()}.`;
    }
    case "home": {
      if (correct) return "Every one has what it needs: light, the right ground or a place to hide.";
      const v = (value ?? {}) as Record<string, string>;
      const wrong = Object.keys(v).find((k) => !HOME_ITEMS[k as HomeItemId]?.needs.every((n) => ZONES[v[k] as ZoneId]?.gives.includes(n)));
      return wrong ? `${HOME_ITEMS[wrong as HomeItemId].why}` : "Check what each one needs.";
    }
    case "chain": {
      const order = (value as string[] | null) ?? [];
      const names = order.map((id) => CHAIN_NAMES[id as ChainId]);
      return correct ? `${names.join(" → ")}: the energy flows from food to eater.` : "Start with the sun, then each eater comes after its food.";
    }
    case "fact": {
      const f = scene.fact!;
      const right = f.options.find((o) => o.id === f.correct)!.text;
      return correct ? `${f.stem.replace("…", "")} ${right}.` : "Look inside the coral polyp with Dabble's lens.";
    }
    case "story":
      return scene.story?.key === "bleach"
        ? correct
          ? "If the water cools again, the algae can move back in and the coral can recover."
          : "Bleaching isn't from bleach. It starts when the water stays too warm."
        : correct
          ? "Cooler water lets the algae return, and the coral gets its food and colour back."
          : "It starts when the water cools down.";
    case "sort": {
      const v = (value ?? {}) as Record<string, string>;
      if (correct) return "Clean, cool water and plenty of grazers help a reef recover.";
      const wrong = Object.keys(v).find((k) => (ACTIONS[k as ActionId]?.helps ? "help" : "harm") !== v[k]);
      return wrong ? `${ACTIONS[wrong as ActionId].text}: ${ACTIONS[wrong as ActionId].helps ? "helps" : "harms"}, because ${ACTIONS[wrong as ActionId].why}.` : "Sort every card.";
    }
    case "grazers": {
      const v = (value as string[] | null) ?? [];
      const names = GRAZERS.filter((g) => v.includes(g)).map((g) => GRAZER_NAMES[g]!);
      if (correct) return `${list(names)} eat the algae, so the coral gets light again.`;
      const wrong = v.find((id) => !(GRAZERS as readonly string[]).includes(id));
      return wrong ? NOT_GRAZER_WHY[wrong]! : "One more animal eats algae.";
    }
    case "plant": {
      const v = (value as string[] | null) ?? [];
      if (correct) return "Sunny, clean and steady: the new coral can grow.";
      const bad = scene.targets.find((t) => v.includes(t.id) && t.cond !== "good");
      return bad?.cond ? SLOT_TEXT[bad.cond].why : "Check every spot for light and a steady base.";
    }
    case "risk": {
      const best = riskiestRun(scene.temps ?? []);
      if (!best) return "";
      const span = best.len === 1 ? `Week ${best.start + 1}` : `Weeks ${best.start + 1} to ${best.end + 1}`;
      if (correct) return `${span}: ${best.len} warm weeks in a row. Heat that lasts is hardest on coral.`;
      const picked = scene.runs?.find((r) => runId(r) === value);
      return picked?.hottest ? "That week was the hottest, but it didn't last long. Find the longest warm spell." : "Look for the most weeks in a row above the dashed line.";
    }
    case "count": {
      const n = weeksAbove(scene.temps ?? []);
      return correct ? `${n} weeks above the usual high.` : "Count every bar that rises above the dashed line.";
    }
  }
}
