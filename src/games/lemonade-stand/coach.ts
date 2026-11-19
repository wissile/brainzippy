import type { AnswerValue, Exercise } from "../../engine/types";
import { costOf, ledgerOf, modeOf, revenue, surveyOf } from "./logic";

/**
 * What Puff says (docs/curriculum/money.md §4.6): the concept at round start, and on a first miss a line
 * chosen from the miss itself, so each common misconception gets its own explanation. Pure; unit-tested.
 */
export function explainFor(ex: Exercise): string {
  const p = ex.params ?? {};
  switch (modeOf(p)) {
    case "pay": return (p.price ?? 0) <= 20 ? "ls.help.value" : "ls.help.big-first";
    case "change": return "ls.help.count-up";
    case "cost": return "ls.help.cost";
    case "revenue": return "ls.help.revenue";
    case "profit":
    case "loss": return "ls.help.profit";
    case "price": return "ls.help.price";
  }
}

export function diagnose(ex: Exercise, last: AnswerValue | null): string {
  const p = ex.params ?? {};
  const v = typeof last === "number" ? last : NaN;
  const led = ledgerOf(p);
  switch (modeOf(p)) {
    case "pay":
      // overpaying usually means coins were counted (or sized) instead of valued: a nickel is not worth more than a dime
      return v > (p.price ?? 0) ? "ls.help.value" : "ls.help.big-first";
    case "change":
      return v === p.price ? "ls.help.not-price" : "ls.help.count-up";
    case "cost": {
      const twoOnly = led.items.some((x) => costOf(led) - x === v);
      return twoOnly ? "ls.help.all-three" : "ls.help.cost";
    }
    case "revenue":
      return v === led.cups + led.price ? "ls.help.times" : "ls.help.revenue";
    case "profit":
      return v === revenue(led) + costOf(led) ? "ls.help.take-away" : "ls.help.profit";
    case "loss": {
      const right = revenue(led) - costOf(led);
      if (Math.sign(v) !== Math.sign(right)) return right < 0 ? "ls.help.loss" : "ls.help.profit";
      return v === revenue(led) + costOf(led) ? "ls.help.take-away" : "ls.help.profit";
    }
    case "price": {
      const s = surveyOf(p);
      return v === s.prices[0] ? "ls.help.most-cups" : "ls.help.price";
    }
  }
}

export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex.params)) {
    case "pay": return ["ls.praise.1", "ls.praise.5"];
    case "change": return ["ls.praise.2"];
    case "cost": return ["ls.praise.6"];
    case "revenue": return ["ls.praise.7"];
    case "profit":
    case "loss": return ["ls.praise.3"];
    case "price": return ["ls.praise.4"];
  }
}
