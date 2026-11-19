import type { Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  type Denom,
  type Mode,
  type Survey,
  bestIndex,
  fmt,
  modeCode,
  sensibleSurvey,
  surveyProfits,
  trayMask,
  words,
} from "./logic";

/**
 * Budge's Lemonade Stand — procedural items (pure: same level + rng + index → same exercise).
 * Every item is BUILT from valid numbers (amounts in whole cents), so it is always solvable with its tray and
 * its economics are consistent (profit = revenue − cost, cups fall as price rises). Spec: docs/curriculum/money.md §4.4.
 *
 * Level (0-based) → item (docs/worlds/lemonade-stand.md):
 *   0  pay 2–9¢            pennies + nickels             (authored tutorial: 3¢, pennies only)
 *   1  pay 5–20¢           + dimes (nickel vs dime: value is not size)
 *   2  pay 21–50¢          + quarters
 *   3  pay 51¢–$1.00       + $1 note
 *   4  change from $1      price 5–95¢ in 5¢ steps; nickels, dimes, quarters (no pennies needed)
 *   5  cost of a batch     3 supplies, 25¢–$2.50 each (25¢ steps), total ≤ $5; 3 choices
 *   6  revenue             2–10 cups × 25¢ / 50¢ / 75¢ / $1; 3 choices
 *   7  profit              revenue − cost, 25¢ ≤ profit ≤ $5; coins into the savings jar
 *   8  rainy day           profit, loss or break even, then how much (signed answer)
 *   9  best price          4 prices with a falling demand survey; unique best price
 */
export const LS_AGES = [7, 10] as const;
export const SKILL = {
  pay: "money.coins.pay",
  change: "money.coins.change",
  profit: "money.biz.profit",
  pricing: "money.biz.pricing",
} as const;

export const MONEY_TRAY: readonly Denom[] = [5, 10, 25, 100, 500];
export interface LevelSpec {
  mode: Mode;
  min?: number;
  max?: number;
  tray?: readonly Denom[];
  label: string;
}
export const LS_LEVELS: readonly LevelSpec[] = [
  { mode: "pay", min: 2, max: 9, tray: [1, 5], label: "pay 2–9¢ with pennies and nickels" },
  { mode: "pay", min: 5, max: 20, tray: [1, 5, 10], label: "pay 5–20¢, + dimes" },
  { mode: "pay", min: 21, max: 50, tray: [1, 5, 10, 25], label: "pay 21–50¢, + quarters" },
  { mode: "pay", min: 51, max: 100, tray: [1, 5, 10, 25, 100], label: "pay 51¢–$1.00, + $1 note" },
  { mode: "change", min: 5, max: 95, tray: [5, 10, 25], label: "change from $1 (price 5–95¢, 5¢ steps)" },
  { mode: "cost", label: "cost of a batch: 3 supplies, choose the total" },
  { mode: "revenue", label: "revenue: cups × price, choose the total" },
  { mode: "profit", tray: MONEY_TRAY, label: "profit = revenue − cost, saved in the jar" },
  { mode: "loss", tray: MONEY_TRAY, label: "rainy day: profit, loss or break even, and how much" },
  { mode: "price", label: "best price from a demand survey" },
];
export const LS_MAX_LEVEL = LS_LEVELS.length - 1;

export const REVENUE_PRICES = [25, 50, 75, 100] as const;
export const SURVEY_COSTS = [10, 15, 20, 25] as const;
export const SURVEY_PRICES: readonly (readonly [number, number, number, number])[] = [
  [25, 50, 75, 100],
  [30, 40, 50, 60],
  [20, 40, 60, 80],
  [40, 60, 80, 100],
  [35, 50, 65, 80],
];

const AGES: Record<Mode, readonly [number, number]> = {
  pay: [7, 8], change: [7, 9], cost: [8, 10], revenue: [8, 10], profit: [8, 10], loss: [9, 10], price: [9, 10],
};
const SKILL_OF: Record<Mode, string> = {
  pay: SKILL.pay, change: SKILL.change, cost: SKILL.profit, revenue: SKILL.profit, profit: SKILL.profit, loss: SKILL.profit, price: SKILL.pricing,
};
const ICON: Record<Mode, string> = { pay: "lemon", change: "cup", cost: "crate", revenue: "pitcher", profit: "jar", loss: "rain", price: "sign" };

type Base = Pick<Exercise, "id" | "seed" | "answer" | "params" | "prompt" | "a11yDescription" | "objective">;
function finish(mode: Mode, b: Base): Omit<Exercise, "difficulty"> {
  return { ...b, skillId: SKILL_OF[mode], ages: AGES[mode], interaction: "choose", objectKind: ICON[mode], params: { mode: modeCode(mode), ...b.params } };
}

// ---------------------------------------------------------------- builders (also used by tests and the tutorial)

export function payItem(price: number, tray: readonly Denom[], opts: { id: string; seed: number; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const big = price > 20;
  const prompt = opts.tutorial
    ? { line: "ls.prompt.tutorial", text: "A lemon costs 3¢. Put 3 pennies on the counter!" }
    : price === 100
      ? { line: "ls.prompt.pay.dollar", text: "A big bag of lemons costs $1.00. Pay the farmer!" }
      : { line: big ? "ls.prompt.pay2" : "ls.prompt.pay1", vars: { c: price }, text: `${big ? "A bag of lemons" : "A lemon"} costs ${fmt(price)}. Pay the farmer!` };
  return {
    ...finish("pay", {
      id: opts.id,
      seed: opts.seed,
      objective: `Pay exactly ${fmt(price)} with coins`,
      answer: { kind: "number", value: price },
      params: { price, tray: trayMask(tray) },
      prompt,
      a11yDescription: `The farmer sells ${big ? "a bag of lemons" : "a lemon"} for ${words(price)}. Put coins on the counter until they add up to exactly ${words(price)}, then press Pay.`,
    }),
    ...(opts.tutorial ? { tutorial: true } : {}),
  };
}

export function changeItem(price: number, opts: { id: string; seed: number }) {
  const change = 100 - price;
  return finish("change", {
    id: opts.id,
    seed: opts.seed,
    objective: `Give ${fmt(change)} change from $1 for a ${fmt(price)} cup by counting up`,
    answer: { kind: "number", value: change },
    params: { price, paid: 100, tray: trayMask([5, 10, 25]) },
    prompt: { line: "ls.prompt.change", vars: { c: price }, text: `Bobbo pays $1 for a ${fmt(price)} cup. Give him his change!` },
    a11yDescription: `A cup costs ${words(price)}. Bobbo pays with a one-dollar bill. Put his change on the counter, then press Give change.`,
  });
}

/** Three choices: the right amount first in `wanted`, then distractors; deduplicated, positive, shuffled. */
function choices(rng: Rng, correct: number, distractors: number[]): number[] {
  const out = [correct];
  for (const d of distractors) if (d > 0 && !out.includes(d) && out.length < 3) out.push(d);
  for (let k = 1; out.length < 3; k++) if (!out.includes(correct + 25 * k)) out.push(correct + 25 * k);
  return rng.shuffle(out);
}

export function costItem(items: [number, number, number], rng: Rng, opts: { id: string; seed: number }) {
  const total = items[0] + items[1] + items[2];
  const skip = rng.int(0, 2);
  const twoOnly = total - items[skip]!;
  const near = rng.chance(0.5) ? [total + 25, total - 25] : [total - 25, total + 25];
  return finish("cost", {
    id: opts.id,
    seed: opts.seed,
    objective: `Add three supply costs (${items.map(fmt).join(" + ")}) to find the cost of a batch`,
    answer: { kind: "number", value: total, choices: choices(rng, total, [twoOnly, ...near]) },
    params: { a: items[0], b: items[1], c: items[2] },
    prompt: { line: "ls.prompt.cost", text: "Move the supplies into the stand. What does one batch cost?" },
    a11yDescription: `Supplies for one batch: lemons ${words(items[0])}, sugar ${words(items[1])}, cups ${words(items[2])}. Move each into the stand, then choose the total cost.`,
  });
}

export function revenueItem(cups: number, price: number, rng: Rng, opts: { id: string; seed: number }) {
  const rev = cups * price;
  const offByOne = rng.chance(0.5) && cups > 2 ? (cups - 1) * price : (cups + 1) * price;
  const dollar = price === 100;
  return finish("revenue", {
    id: opts.id,
    seed: opts.seed,
    objective: `Find revenue as cups × price (${cups} × ${fmt(price)})`,
    answer: { kind: "number", value: rev, choices: choices(rng, rev, [cups + price, offByOne]) },
    params: { cups, price },
    prompt: dollar
      ? { line: "ls.prompt.revenue.dollar", vars: { cups }, text: `Serve ${cups} cups at $1 each. How much money came in?` }
      : { line: "ls.prompt.revenue", vars: { cups, c: price }, text: `Serve ${cups} cups at ${fmt(price)} each. How much money came in?` },
    a11yDescription: `${cups} customers are waiting. Each cup costs ${words(price)}. Serve every customer, then choose how much money came in.`,
  });
}

export function profitItem(cups: number, price: number, items: [number, number, number], opts: { id: string; seed: number; rainy?: boolean }) {
  const rev = cups * price;
  const cost = items[0] + items[1] + items[2];
  const p = rev - cost;
  const mode: Mode = opts.rainy ? "loss" : "profit";
  const result = p > 0 ? `a profit of ${words(p)}` : p < 0 ? `a loss of ${words(-p)}` : "break even";
  return finish(mode, {
    id: opts.id,
    seed: opts.seed,
    objective: opts.rainy
      ? `Decide profit, loss or break even, and how much (${fmt(rev)} − ${fmt(cost)} = ${result})`
      : `Find profit = revenue − cost (${fmt(rev)} − ${fmt(cost)}) and save it`,
    answer: { kind: "number", value: p },
    params: { cups, price, a: items[0], b: items[1], c: items[2], tray: trayMask(MONEY_TRAY), ...(opts.rainy ? { rainy: 1 } : {}) },
    prompt: opts.rainy
      ? { line: "ls.prompt.loss", text: "Rainy day! Was it a profit or a loss? How much?" }
      : { line: "ls.prompt.profit", text: "What profit did Budge make? Save it in her jar!" },
    a11yDescription: `${opts.rainy ? "A rainy day. " : ""}Budge sold ${cups} cups at ${words(price)}: ${words(rev)} came in. Supplies cost ${words(cost)}. ${
      opts.rainy ? "Choose profit, loss or break even, then put the amount on the ledger with coins." : "Put the profit in the savings jar with coins."
    }`,
  });
}

export function priceItem(s: Survey, opts: { id: string; seed: number }) {
  const best = bestIndex(s);
  const ps = surveyProfits(s);
  return finish("price", {
    id: opts.id,
    seed: opts.seed,
    objective: `Choose the price with the most profit: (price − ${fmt(s.cost)}) × cups sold, best ${fmt(s.prices[best]!)} = ${fmt(ps[best]!)}`,
    answer: { kind: "number", value: s.prices[best]!, choices: [...s.prices] },
    params: { cost: s.cost, p0: s.prices[0], p1: s.prices[1], p2: s.prices[2], p3: s.prices[3], n0: s.cups[0], n1: s.cups[1], n2: s.cups[2], n3: s.cups[3] },
    prompt: { line: "ls.prompt.price", text: "Slide the price. Which price makes the most profit?" },
    a11yDescription: `Each cup costs Budge ${words(s.cost)} to make. A survey says: ${s.prices.map((p, i) => `at ${words(p)}, ${s.cups[i]} cups sell`).join("; ")}. Choose the price that makes the most profit.`,
  });
}

// ---------------------------------------------------------------- number pickers

/** Three supply costs in 25¢ steps (each 25¢–$2.50) adding to `units` × 25¢ (3 ≤ units ≤ 20). */
export function splitCost(units: number, rng: Rng): [number, number, number] {
  const a = rng.int(Math.max(1, units - 20), Math.min(10, units - 2));
  const b = rng.int(Math.max(1, units - a - 10), Math.min(10, units - a - 1));
  const c = units - a - b;
  return rng.shuffle([a * 25, b * 25, c * 25]) as [number, number, number];
}

function pickProfit(rng: Rng): { cups: number; price: number; items: [number, number, number] } {
  for (let k = 0; k < 60; k++) {
    const cups = rng.int(3, 10);
    const price = rng.pick([50, 75, 100] as const);
    const units = rng.int(3, 12);
    const p = cups * price - units * 25;
    if (p >= 25 && p <= 500) return { cups, price, items: splitCost(units, rng) };
  }
  return { cups: 6, price: 50, items: [75, 50, 25] };
}

export type Outcome = "profit" | "loss" | "even";
function pickRainy(rng: Rng): { cups: number; price: number; items: [number, number, number]; outcome: Outcome } {
  const r = rng.next();
  const outcome: Outcome = r < 0.45 ? "loss" : r < 0.8 ? "profit" : "even";
  for (let k = 0; k < 80; k++) {
    const cups = rng.int(1, 6);
    const price = rng.pick(REVENUE_PRICES);
    const ru = (cups * price) / 25; // revenue in quarters
    let units: number;
    if (outcome === "even") units = ru;
    else if (outcome === "loss") units = rng.int(ru + 1, Math.min(12, ru + 12));
    else units = rng.int(3, Math.min(12, ru - 1));
    if (units < 3 || units > 12) continue;
    if (outcome === "loss" && units <= ru) continue;
    if (outcome === "profit" && units >= ru) continue;
    if (Math.abs(ru - units) > 12) continue; // a rainy day's profit or loss stays within $3
    return { cups, price, items: splitCost(units, rng), outcome };
  }
  return { cups: 2, price: 50, items: [75, 50, 50], outcome: "loss" };
}

/**
 * A falling demand survey with a unique best price. About three items in four put the best price in the middle
 * (neither the highest price nor the price that sells most cups), so both misconceptions are tested.
 */
export function pickSurvey(rng: Rng, wantMiddle: boolean): Survey {
  for (let k = 0; k < 400; k++) {
    const cost = rng.pick(SURVEY_COSTS);
    const options = SURVEY_PRICES.filter((ps) => ps[0] > cost);
    const prices = [...rng.pick(options)] as Survey["prices"];
    const n0 = rng.int(24, 40);
    const d = [rng.int(2, 12), rng.int(2, 12), rng.int(2, 12)];
    const cups = [n0, n0 - d[0]!, n0 - d[0]! - d[1]!, n0 - d[0]! - d[1]! - d[2]!] as Survey["cups"];
    const s: Survey = { cost, prices, cups };
    if (!sensibleSurvey(s)) continue;
    const b = bestIndex(s);
    if (b < 0 || (wantMiddle && (b === 0 || b === 3))) continue;
    const sorted = surveyProfits(s).sort((x, y) => y - x);
    if (sorted[0]! - sorted[1]! < Math.max(10, sorted[0]! * 0.05)) continue; // the best is clearly best
    return s;
  }
  return { cost: 20, prices: [25, 50, 75, 100], cups: [40, 30, 14, 6] };
}

// ---------------------------------------------------------------- the generator

export const generateLemonade: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(LS_MAX_LEVEL, level));
  const spec = LS_LEVELS[lv]!;
  const seed = rng.int(1, 999_999);
  const tag = `l${lv}n${index}`;
  switch (spec.mode) {
    case "pay": {
      const price = rng.int(spec.min!, spec.max!);
      return payItem(price, spec.tray!, { id: `ls-pay-${price}-${tag}`, seed });
    }
    case "change": {
      const price = rng.int(1, 19) * 5;
      return changeItem(price, { id: `ls-change-${price}-${tag}`, seed });
    }
    case "cost": {
      const items = splitCost(rng.int(3, 20), rng);
      return costItem(items, rng, { id: `ls-cost-${items.join("-")}-${tag}`, seed });
    }
    case "revenue": {
      const cups = rng.int(2, 10);
      const price = rng.pick(REVENUE_PRICES);
      return revenueItem(cups, price, rng, { id: `ls-revenue-${cups}x${price}-${tag}`, seed });
    }
    case "profit": {
      const { cups, price, items } = pickProfit(rng);
      return profitItem(cups, price, items, { id: `ls-profit-${cups}x${price}-${items.join("-")}-${tag}`, seed });
    }
    case "loss": {
      const { cups, price, items } = pickRainy(rng);
      return profitItem(cups, price, items, { id: `ls-loss-${cups}x${price}-${items.join("-")}-${tag}`, seed, rainy: true });
    }
    case "price": {
      const s = pickSurvey(rng, index % 4 !== 3);
      return priceItem(s, { id: `ls-price-${s.cost}-${s.prices[0]}-${s.cups.join("-")}-${tag}`, seed });
    }
  }
};
