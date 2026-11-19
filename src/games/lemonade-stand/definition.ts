import type { Exercise, GameDefinition } from "../../engine/types";
import { LS_AGES, LS_MAX_LEVEL, SKILL, generateLemonade, payItem } from "./generator";

/**
 * Budge's Lemonade Stand — DATA only. Items are generated per round (./generator.ts); the guided tutorial is
 * authored. Skills (docs/curriculum/money.md §2, §4):
 *   money.coins.pay      pay an exact amount with US coins (2.MD.C.8; NSPFE Spending, gr. 4)
 *   money.coins.change   make change from $1 by counting up
 *   money.biz.profit     cost, revenue and profit (NSPFE Earning Income, gr. 4–8)
 *   money.biz.pricing    choose a price from a demand survey to make the most profit
 */
export const lemonadeTutorial: Exercise = {
  ...payItem(3, [1], { id: "ls-tutorial-pay-3", seed: 33, tutorial: true }),
  difficulty: 1,
};

export const lemonadeStand: GameDefinition = {
  id: "lemonade-stand",
  title: "Budge's Lemonade Stand",
  mascot: "budge",
  ages: LS_AGES,
  skillIds: [SKILL.pay, SKILL.change, SKILL.profit, SKILL.pricing],
  learningObjective:
    "Pay and give change with US coins, and work out cost, revenue and profit for a small lemonade business: profit = money in − costs, a loss when costs are bigger, and a price that balances price per cup against cups sold.",
  progression: { roundLength: 8, maxLevel: LS_MAX_LEVEL, stepUpAfter: 3, stepDownAtAttempts: 3 },
  exercises: [lemonadeTutorial],
  generate: generateLemonade,
  achievement: { id: "stand-star", title: "Stand Star" },
};
