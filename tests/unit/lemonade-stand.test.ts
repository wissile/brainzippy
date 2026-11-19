import { describe, expect, it } from "vitest";
import { renderLine } from "../../src/audio/voiceLines";
import { createRng } from "../../src/engine/rng";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { choicesOf, lintExercise, targetOf } from "../../src/engine/validation";
import { getWorld } from "../../src/content/registry";
import { diagnose, explainFor, praiseFor } from "../../src/games/lemonade-stand/coach";
import { lemonadeStand, lemonadeTutorial } from "../../src/games/lemonade-stand/definition";
import { LS_LEVELS, LS_MAX_LEVEL, MONEY_TRAY, REVENUE_PRICES, pickSurvey, splitCost } from "../../src/games/lemonade-stand/generator";
import {
  type Denom,
  bestIndex,
  costOf,
  countUpChange,
  fmt,
  greedy,
  ledgerOf,
  modeOf,
  modelCoins,
  modelStepCount,
  profit,
  revenue,
  sensibleSurvey,
  solvable,
  stacks,
  surveyOf,
  surveyProfits,
  total,
  trayMask,
  trayOf,
  words,
} from "../../src/games/lemonade-stand/logic";
import voice from "../../src/games/lemonade-stand/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 17);
const band = (level: number) => SEEDS.flatMap((seed) => generateBand(lemonadeStand, level, seed, 8));
const all = () => Array.from({ length: LS_MAX_LEVEL + 1 }, (_, l) => band(l)).flat();
const P = (ex: Exercise) => ex.params ?? {};

describe("Lemonade Stand money logic", () => {
  it("formats cents for the screen and for screen readers", () => {
    expect(fmt(7)).toBe("7¢");
    expect(fmt(100)).toBe("$1.00");
    expect(fmt(365)).toBe("$3.65");
    expect(fmt(-125)).toBe("−$1.25");
    expect(words(1)).toBe("1 cent");
    expect(words(100)).toBe("1 dollar");
    expect(words(350)).toBe("3 dollars and 50 cents");
  });

  it("trays round-trip through the numeric bitmask", () => {
    expect(trayOf(trayMask([1, 5, 10]))).toEqual([1, 5, 10]);
    expect(trayOf(trayMask(MONEY_TRAY))).toEqual([...MONEY_TRAY]);
  });

  it("greedy pays largest first and matches a brute-force solvability check", () => {
    expect(greedy(87, [1, 5, 10, 25])).toEqual([25, 25, 25, 10, 1, 1]);
    expect(greedy(7, [5, 10])).toBeNull();
    expect(solvable(7, [5, 10])).toBe(false);
    for (let a = 0; a <= 300; a += 5) expect(total(greedy(a, [5, 10, 25, 100])!)).toBe(a);
  });

  it("change counts up from the price to one dollar with nickels, dimes and quarters", () => {
    expect(countUpChange(35)).toEqual([5, 10, 25, 25]);
    for (let p = 5; p <= 95; p += 5) {
      const c = countUpChange(p);
      expect(total(c), `price ${p}`).toBe(100 - p);
      expect(c.every((d) => d !== 1)).toBe(true);
      // running "price + change so far" totals rise to exactly one dollar (what is said aloud)
      let at = p;
      for (const d of c) at += d;
      expect(at).toBe(100);
    }
  });

  it("stacks group coins by value, largest first", () => {
    expect(stacks([1, 25, 10, 25] as Denom[])).toEqual([{ d: 25, n: 2 }, { d: 10, n: 1 }, { d: 1, n: 1 }]);
  });

  it("profit = revenue − cost", () => {
    const l = { cups: 6, price: 50, items: [75, 50, 25] as [number, number, number] };
    expect(revenue(l)).toBe(300);
    expect(costOf(l)).toBe(150);
    expect(profit(l)).toBe(150);
  });

  it("splitCost gives three 25¢-step costs within 25¢–$2.50 that add up", () => {
    for (let units = 3; units <= 20; units++)
      for (const seed of SEEDS.slice(0, 10)) {
        const items = splitCost(units, createRng(seed + units));
        expect(items.reduce((a, b) => a + b, 0)).toBe(units * 25);
        for (const x of items) expect(x >= 25 && x <= 250 && x % 25 === 0).toBe(true);
      }
  });
});

describe("Lemonade Stand content", () => {
  it("the tutorial is a 3¢ payment with pennies only", () => {
    expect(lintExercise(lemonadeTutorial)).toEqual([]);
    expect(lemonadeTutorial.tutorial).toBe(true);
    expect(targetOf(lemonadeTutorial)).toBe(3);
    expect(trayOf(P(lemonadeTutorial).tray!)).toEqual([1]);
  });

  it("the world entry matches the game and the money library is live", () => {
    const w = getWorld("lemonade-stand")!;
    expect(w.maxLevel).toBe(LS_MAX_LEVEL);
    expect(LS_MAX_LEVEL).toBe(9);
    expect(w.subject).toBe("money");
  });

  it("is deterministic: same level and seed → same round", () => {
    for (let level = 0; level <= LS_MAX_LEVEL; level++) {
      const a = buildRound(lemonadeStand, { level, seed: 4242 });
      const b = buildRound(lemonadeStand, { level, seed: 4242 });
      expect(a.exercises).toEqual(b.exercises);
    }
  });

  it("every generated item lints, uses a declared skill and its level's item type", () => {
    for (let level = 0; level <= LS_MAX_LEVEL; level++)
      for (const ex of band(level)) {
        expect(lintExercise({ ...ex }), ex.id).toEqual([]);
        expect(lemonadeStand.skillIds).toContain(ex.skillId);
        expect(modeOf(P(ex)), ex.id).toBe(LS_LEVELS[level]!.mode);
        expect(ex.id.endsWith(`-l${level}n${ex.id.split("n").pop()}`)).toBe(true);
      }
  });

  it("pay items stay in range and are solvable with their tray", () => {
    for (let level = 0; level <= 3; level++) {
      const spec = LS_LEVELS[level]!;
      for (const ex of band(level)) {
        const price = targetOf(ex);
        expect(price).toBeGreaterThanOrEqual(spec.min!);
        expect(price).toBeLessThanOrEqual(spec.max!);
        expect(trayOf(P(ex).tray!)).toEqual([...spec.tray!]);
        expect(solvable(price, trayOf(P(ex).tray!))).toBe(true);
        expect(total(modelCoins(P(ex), price))).toBe(price);
      }
    }
    // level 1 surfaces the nickel-vs-dime misconception: both are on the tray
    expect(trayOf(P(band(1)[0]!).tray!)).toEqual(expect.arrayContaining([5, 10]));
  });

  it("change items: 5¢ steps, never need pennies, and the model counts up to $1", () => {
    for (const ex of band(4)) {
      const price = P(ex).price!;
      expect(price % 5).toBe(0);
      expect(price >= 5 && price <= 95).toBe(true);
      expect(targetOf(ex)).toBe(100 - price);
      expect(trayOf(P(ex).tray!)).not.toContain(1);
      expect(solvable(targetOf(ex), [5, 10, 25])).toBe(true);
      expect(total(modelCoins(P(ex), targetOf(ex)))).toBe(targetOf(ex));
    }
  });

  it("cost items: three supplies in 25¢ steps, total ≤ $5, distractors include 'only two supplies'", () => {
    let twoOnly = 0;
    for (const ex of band(5)) {
      const l = ledgerOf(P(ex));
      for (const x of l.items) expect(x >= 25 && x <= 250 && x % 25 === 0).toBe(true);
      expect(targetOf(ex)).toBe(costOf(l));
      expect(costOf(l)).toBeLessThanOrEqual(500);
      const ch = choicesOf(ex);
      expect(new Set(ch).size).toBe(3);
      expect(ch).toContain(costOf(l));
      if (l.items.some((x) => ch.includes(costOf(l) - x))) twoOnly++;
    }
    expect(twoOnly).toBe(band(5).length);
  });

  it("revenue items: cups × price; 'cups + price' is a distractor", () => {
    for (const ex of band(6)) {
      const { cups, price } = ledgerOf(P(ex));
      expect(cups >= 2 && cups <= 10).toBe(true);
      expect(REVENUE_PRICES).toContain(price as (typeof REVENUE_PRICES)[number]);
      expect(targetOf(ex)).toBe(cups * price);
      expect(choicesOf(ex)).toContain(cups + price);
      expect(new Set(choicesOf(ex)).size).toBe(3);
    }
  });

  it("profit items: positive profit (25¢–$5) = revenue − cost, solvable with the jar tray", () => {
    for (const ex of band(7)) {
      const l = ledgerOf(P(ex));
      const v = targetOf(ex);
      expect(v).toBe(revenue(l) - costOf(l));
      expect(v).toBeGreaterThanOrEqual(25);
      expect(v).toBeLessThanOrEqual(500);
      expect(solvable(v, trayOf(P(ex).tray!))).toBe(true);
      expect(total(modelCoins(P(ex), v))).toBe(v);
    }
  });

  it("rainy-day items: signed answer = revenue − cost; losses, profits and break-evens all occur", () => {
    const seen = { profit: 0, loss: 0, even: 0 };
    for (const ex of band(8)) {
      const l = ledgerOf(P(ex));
      const v = targetOf(ex);
      expect(P(ex).rainy).toBe(1);
      expect(v).toBe(revenue(l) - costOf(l));
      expect(Math.abs(v)).toBeLessThanOrEqual(300);
      expect(costOf(l)).toBeGreaterThanOrEqual(75);
      expect(solvable(Math.abs(v), trayOf(P(ex).tray!))).toBe(true);
      expect(total(modelCoins(P(ex), v))).toBe(Math.abs(v));
      seen[v > 0 ? "profit" : v < 0 ? "loss" : "even"]++;
    }
    expect(seen.loss).toBeGreaterThan(band(8).length * 0.25);
    expect(seen.profit).toBeGreaterThan(band(8).length * 0.15);
    expect(seen.even).toBeGreaterThan(0);
  });

  it("best-price items: falling demand, unique best, and the misconceptions are usually wrong", () => {
    const items = band(9);
    let middle = 0;
    for (const ex of items) {
      const s = surveyOf(P(ex));
      expect(sensibleSurvey(s), ex.id).toBe(true);
      const b = bestIndex(s);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(targetOf(ex)).toBe(s.prices[b]);
      expect([...choicesOf(ex)]).toEqual([...s.prices]);
      const ps = surveyProfits(s);
      expect(ps.filter((x) => x === ps[b]).length).toBe(1);
      if (b !== 0 && b !== 3) middle++;
    }
    // highest price and most cups (= lowest price) are wrong in at least half of the items
    expect(middle / items.length).toBeGreaterThanOrEqual(0.5);
    expect(sensibleSurvey(pickSurvey(createRng(1), true))).toBe(true);
  });

  it("modelled answers have one step per coin, supply, customer or survey row", () => {
    for (const ex of all()) {
      const n = modelStepCount(P(ex), targetOf(ex));
      expect(n).toBeGreaterThanOrEqual(1);
      const m = modeOf(P(ex));
      if (m === "cost") expect(n).toBe(3);
      if (m === "revenue") expect(n).toBe(P(ex).cups);
      if (m === "price") expect(n).toBe(4);
    }
  });
});

describe("Lemonade Stand voice and coaching", () => {
  const varsOk = (id: string, vars: Record<string, string | number> = {}) => {
    const line = lines[id];
    expect(line, id).toBeDefined();
    for (const [k, list] of Object.entries(line!.vary ?? {})) expect(list, `${id} ${k}=${vars[k]}`).toContain(vars[k]);
  };

  it("every prompt the generator can produce is pre-rendered (vary covers every value)", () => {
    for (const ex of [lemonadeTutorial, ...all()]) varsOk(ex.prompt!.line, ex.prompt!.vars as Record<string, number>);
  });

  it("running totals up to a dollar are covered", () => {
    for (let c = 1; c <= 99; c++) varsOk("ls.total", { c });
    expect(renderLine("ls.total", { c: 37 })).toBe("37 cents.");
    expect(lines["ls.total.dollar"]).toBeDefined();
  });

  it("every helper, praise and hint line exists, and praise is about process", () => {
    for (const ex of all()) {
      varsOk(explainFor(ex));
      for (const id of praiseFor(ex)) {
        varsOk(id);
        expect(lines[id]!.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant/);
      }
      varsOk(diagnose(ex, targetOf(ex) + 25));
    }
    for (const id of ["ls.retry.1", "ls.hint.model", "ls.hint.modelTap", "ls.idle", "ls.supplies.in", "ls.served"]) varsOk(id);
    for (const t of Object.values(lines)) expect(t.text.split(/\s+/).length, t.text).toBeLessThanOrEqual(16);
    for (const t of Object.values(lines)) expect(t.text).not.toMatch(/\bbuy (it|now)\b|bank|invest/i);
  });

  it("diagnoses the common misconceptions on a first miss", () => {
    const find = (level: number) => band(level)[0]!;
    const change = find(4);
    expect(diagnose(change, P(change).price!)).toBe("ls.help.not-price");
    const cost = find(5);
    const l = ledgerOf(P(cost));
    expect(diagnose(cost, costOf(l) - l.items[0])).toBe("ls.help.all-three");
    const rev = find(6);
    expect(diagnose(rev, P(rev).cups! + P(rev).price!)).toBe("ls.help.times");
    const pr = find(7);
    const lp = ledgerOf(P(pr));
    expect(diagnose(pr, revenue(lp) + costOf(lp))).toBe("ls.help.take-away");
    const rainy = band(8).find((e) => targetOf(e) < 0)!;
    expect(diagnose(rainy, -targetOf(rainy))).toBe("ls.help.loss");
    const price = find(9);
    expect(diagnose(price, surveyOf(P(price)).prices[0])).toBe("ls.help.most-cups");
    const pay = find(2);
    expect(diagnose(pay, targetOf(pay) + 10)).toBe("ls.help.value");
  });
});

describe("Lemonade Stand answers through the engine", () => {
  it("any coin set with the right value is accepted; a wrong total nudges, then the answer is modelled", () => {
    const ex = band(2)[0]!;
    const v = targetOf(ex);
    let st = initExercise(ex);
    st = exerciseReducer(st, { type: "SUBMIT", value: v + 5 });
    expect(st.feedback?.correct).toBe(false);
    expect(st.check?.reason).toBe("too-high");
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: v - 1 });
    expect(st.hintStage).toBe(2);
    expect(st.model).toBe(v);
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: total(modelCoins(P(ex), v)) });
    expect(st.feedback?.correct).toBe(true);
  });

  it("a rainy-day loss must be submitted as a loss (sign matters)", () => {
    const ex = band(8).find((e) => targetOf(e) < 0)!;
    let st = initExercise(ex);
    st = exerciseReducer(st, { type: "SUBMIT", value: -targetOf(ex) });
    expect(st.feedback?.correct).toBe(false);
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: targetOf(ex) });
    expect(st.feedback?.correct).toBe(true);
  });
});
