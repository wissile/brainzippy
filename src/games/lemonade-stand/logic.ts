/**
 * Budge's Lemonade Stand — pure money logic (no React, no DOM). All money is integer CENTS.
 * US coins and toy notes: penny 1¢, nickel 5¢, dime 10¢, quarter 25¢, $1 note, $5 note.
 */

export type Denom = 1 | 5 | 10 | 25 | 100 | 500;
export const DENOMS: readonly Denom[] = [1, 5, 10, 25, 100, 500];
export const DENOM_INFO: Record<Denom, { name: string; plural: string; note: boolean }> = {
  1: { name: "penny", plural: "pennies", note: false },
  5: { name: "nickel", plural: "nickels", note: false },
  10: { name: "dime", plural: "dimes", note: false },
  25: { name: "quarter", plural: "quarters", note: false },
  100: { name: "one-dollar bill", plural: "one-dollar bills", note: true },
  500: { name: "five-dollar bill", plural: "five-dollar bills", note: true },
};

/** Which item the exercise is, stored as `params.mode` (params are numbers only). */
export const MODES = ["pay", "change", "cost", "revenue", "profit", "loss", "price"] as const;
export type Mode = (typeof MODES)[number];
export const modeCode = (m: Mode) => MODES.indexOf(m);
export const modeOf = (params: Readonly<Record<string, number>> | undefined): Mode => MODES[params?.mode ?? 0] ?? "pay";
/** Modes answered by putting coins somewhere (the board submits the total). */
export const isCoinMode = (m: Mode) => m === "pay" || m === "change" || m === "profit" || m === "loss";

// ---------------------------------------------------------------- trays

/** A tray (which coins/notes the child can use) as a bitmask over DENOMS, so it fits in numeric params. */
export const trayMask = (ds: readonly Denom[]) => ds.reduce((m, d) => m | (1 << DENOMS.indexOf(d)), 0);
export const trayOf = (mask: number): Denom[] => DENOMS.filter((_, i) => (mask >> i) & 1);

// ---------------------------------------------------------------- formatting

/** "7¢" under a dollar, "$1.25" from a dollar up; negative amounts keep a minus sign. */
export function fmt(cents: number): string {
  const c = Math.abs(Math.round(cents));
  const sign = cents < 0 ? "−" : "";
  if (c < 100) return `${sign}${c}¢`;
  return `${sign}$${Math.floor(c / 100)}.${String(c % 100).padStart(2, "0")}`;
}
/** Screen-reader words: "7 cents", "1 dollar", "3 dollars and 50 cents". */
export function words(cents: number): string {
  const c = Math.abs(Math.round(cents));
  const d = Math.floor(c / 100);
  const r = c % 100;
  const dp = d === 1 ? "1 dollar" : `${d} dollars`;
  const cp = r === 1 ? "1 cent" : `${r} cents`;
  if (d === 0) return cp;
  return r === 0 ? dp : `${dp} and ${cp}`;
}
export const denomLabel = (d: Denom) => (d >= 100 ? `$${d / 100}` : `${d}¢`);
export const denomWords = (d: Denom) => `${DENOM_INFO[d].name}, ${words(d)}`;

// ---------------------------------------------------------------- coins

export const total = (coins: readonly Denom[]) => coins.reduce((s, c) => s + c, 0);

/** Can `amount` be made exactly from the tray (unlimited supply of each)? */
export function solvable(amount: number, tray: readonly Denom[]): boolean {
  if (amount < 0 || !Number.isInteger(amount)) return false;
  const ok = new Array<boolean>(amount + 1).fill(false);
  ok[0] = true;
  for (let v = 1; v <= amount; v++) ok[v] = tray.some((d) => d <= v && ok[v - d]);
  return ok[amount]!;
}

/** Largest coins first (US coins are a canonical system, so this is also the fewest coins). Null if impossible. */
export function greedy(amount: number, tray: readonly Denom[]): Denom[] | null {
  const out: Denom[] = [];
  let left = amount;
  for (const d of [...tray].sort((a, b) => b - a)) while (left >= d) { out.push(d); left -= d; }
  return left === 0 ? out : null;
}

/**
 * Change by counting up from the price to one dollar (how cashiers give change): small coins up to the next
 * quarter mark, then quarters. 35¢ → 5¢ (40), 10¢ (50), 25¢ (75), 25¢ ($1). Price must be a multiple of 5.
 */
export function countUpChange(price: number, paid = 100): Denom[] {
  const out: Denom[] = [];
  let at = price;
  const gap = (25 - (at % 25)) % 25;
  if (gap % 10 === 5) { out.push(5); at += 5; }
  while (at % 25 !== 0 && at < paid) { out.push(10); at += 10; }
  while (at + 25 <= paid) { out.push(25); at += 25; }
  while (at + 5 <= paid) { out.push(5); at += 5; }
  return out;
}

/** Stacks for display: one entry per denomination present, largest first. */
export function stacks(coins: readonly Denom[]): { d: Denom; n: number }[] {
  return [...DENOMS].reverse().map((d) => ({ d, n: coins.filter((c) => c === d).length })).filter((s) => s.n > 0);
}

// ---------------------------------------------------------------- business maths

export interface Ledger {
  cups: number;
  price: number;
  /** Supply costs: lemons, sugar, cups. */
  items: [number, number, number];
}
export const revenue = (l: Pick<Ledger, "cups" | "price">) => l.cups * l.price;
export const costOf = (l: Pick<Ledger, "items">) => l.items[0] + l.items[1] + l.items[2];
/** Profit (negative = loss). */
export const profit = (l: Ledger) => revenue(l) - costOf(l);
export const SUPPLIES = [
  { id: "lemons", label: "Lemons", art: "lemons" },
  { id: "sugar", label: "Sugar", art: "sugar" },
  { id: "cups", label: "Cups", art: "cups" },
] as const;

export function ledgerOf(p: Readonly<Record<string, number>> | undefined): Ledger {
  return { cups: p?.cups ?? 0, price: p?.price ?? 0, items: [p?.a ?? 0, p?.b ?? 0, p?.c ?? 0] };
}

/** Best-price survey: four prices (ascending) with the cups a (fictional) survey says would sell at each. */
export interface Survey {
  cost: number;
  prices: [number, number, number, number];
  cups: [number, number, number, number];
}
export const surveyProfit = (s: Survey, i: number) => (s.prices[i]! - s.cost) * s.cups[i]!;
export const surveyProfits = (s: Survey) => s.prices.map((_, i) => surveyProfit(s, i));
/** Index of the unique best price, or -1 when two prices tie for best. */
export function bestIndex(s: Survey): number {
  const ps = surveyProfits(s);
  const max = Math.max(...ps);
  return ps.filter((p) => p === max).length === 1 ? ps.indexOf(max) : -1;
}
export function surveyOf(p: Readonly<Record<string, number>> | undefined): Survey {
  return {
    cost: p?.cost ?? 0,
    prices: [p?.p0 ?? 0, p?.p1 ?? 0, p?.p2 ?? 0, p?.p3 ?? 0],
    cups: [p?.n0 ?? 0, p?.n1 ?? 0, p?.n2 ?? 0, p?.n3 ?? 0],
  };
}

/** Is a demand table economically sensible: positive margins, cups fall strictly as price rises? */
export function sensibleSurvey(s: Survey): boolean {
  for (let i = 0; i < 4; i++) {
    if (!(s.prices[i]! > s.cost) || !(s.cups[i]! > 0) || !Number.isInteger(s.cups[i])) return false;
    if (i > 0 && !(s.prices[i]! > s.prices[i - 1]! && s.cups[i]! < s.cups[i - 1]!)) return false;
  }
  return true;
}

// ---------------------------------------------------------------- worked examples (hint stage 2)

/** The coins the modelled answer lays down, in order: change counts up from the price, everything else largest first. */
export function modelCoins(params: Readonly<Record<string, number>> | undefined, value: number): Denom[] {
  const mode = modeOf(params);
  if (mode === "change") return countUpChange(params?.price ?? 0, params?.paid ?? 100);
  return greedy(Math.abs(value), trayOf(params?.tray ?? trayMask(DENOMS))) ?? [];
}

/** Steps the runner animates on the modelled answer (one per coin, supply, served cup or survey row). */
export function modelStepCount(params: Readonly<Record<string, number>> | undefined, value: number): number {
  switch (modeOf(params)) {
    case "cost": return 3;
    case "revenue": return Math.max(1, params?.cups ?? 1);
    case "price": return 4;
    default: return Math.max(1, modelCoins(params, value).length);
  }
}
