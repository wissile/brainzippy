# Budge's Lemonade Stand (`lemonade-stand`)

First world of the **Money** library (`money`, kid title "Market Square"). Host **Budge**; helper **Puff**, who counts in fives; cameos **Bobbo** (customer) and **Rumble** (lemon farmer). Ages 7–10. Spec: `docs/curriculum/money.md` §4.

## Objective
"Child can pay and give change with US coins, and work out cost, revenue and profit for a small business." Skills (pack `library-money`):

| Skill | Levels | Aligned with |
|---|---|---|
| `money.coins.pay` | 1–4 | CCSS 2.MD.C.8; NSPFE Spending, gr. 4 |
| `money.coins.change` | 5 | CCSS 2.MD.C.8; NSPFE Spending, gr. 4 |
| `money.biz.profit` | 6–9 | NSPFE Earning Income, gr. 4–8 |
| `money.biz.pricing` | 10 | NSPFE Earning Income, gr. 8 (stretch level for 10-year-olds) |

NSPFE = *National Standards for Personal Financial Education* (Council for Economic Education and Jump$tart, 2021). Benchmark numbers are added only after an educator checks them. The design follows the CFPB's building blocks of youth financial capability: financial knowledge and decision-making (cost, revenue, profit), and habits and norms (saving profit towards a goal). Source: https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/

## Why this interaction
The child runs a real stand rather than answering quiz cards. Every move works three ways: drag, one tap, or the keyboard (Tab, then Enter; Backspace takes the last coin back).
- **Coins** go from the till onto the counter. They are grouped into stacks by value, so the child sees "3 dimes" and can skip count. The running total is shown, put in a live region, and spoken from 1¢ to $1 when sound is on.
- **Supplies** (cost): the child moves lemons, sugar and cups into the stand, and the ledger writes a line for each one. The choice cards wait until all three are in.
- **Customers** (revenue): the child pours a cup for each customer. Each paid cup adds a price chip to the "money from cups" rows, which is the spec's hint of building revenue as rows of cups. The rows are never totalled before the child answers.
- **Savings jar** (profit): the child saves the profit in Budge's telescope jar using coins and notes. This uses the owner's own example ("save profits"), instead of the spec's number pad.
- **Price slider** (best price): four notches. As the slider moves, the survey row lights up and a crowd of cups on the price sign grows or shrinks, so the child sees demand fall as price rises.
- A small telescope-fund jar on the stand fills as the round progresses.

All money is integer cents in data and validation. Coin answers are submitted as the total value, so **any valid set of coins is correct**.

## Levels (generator: `src/games/lemonade-stand/generator.ts`)
| Level (screen) | Item | Values | Answer |
|---|---|---|---|
| 1 (L0) | tutorial: pay 3¢ with pennies (pointing hand); then pay 2–9¢ | pennies, nickels | coins = price |
| 2 | pay for a lemon, 5–20¢ | + dimes (nickel and dime both on the tray) | coins = price |
| 3 | pay for a bag, 21–50¢ | + quarters | coins = price |
| 4 | pay 51¢–$1.00 | + $1 note | coins = price |
| 5 | change from $1 for a cup priced 5–95¢ (5¢ steps) | nickels, dimes, quarters (no pennies needed) | coins = 100 − price |
| 6 | cost of a batch: 3 supplies at 25¢–$2.50 each (25¢ steps), total ≤ $5 | — | 3 cards |
| 7 | revenue: 2–10 cups × 25¢ / 50¢ / 75¢ / $1 | — | 3 cards |
| 8 | profit = revenue − cost, 25¢–$5 | nickel…$5 note | coins into the jar |
| 9 | rainy day: about 45% loss, 35% profit, 20% break even; amount ≤ $3 | nickel…$5 note | Profit / Loss / Break even + coins (signed) |
| 10 | best price: 4 prices, cups fall strictly as the price rises, cost per cup 10–25¢ | — | slider + Set price |

R0 levelling (≥ 50% first try → next level). `stepUpAfter: 3`, because each level is a new idea, so a level-1 round reaches level 4 at most.

**Constraints (unit-tested over 60 seeds × 8 items × 10 levels):**
- every pay amount can be made with its tray, and change never needs pennies;
- cost = sum of the supplies, revenue = cups × price, profit = revenue − cost (profit > 0 on level 8);
- rainy days produce all three outcomes;
- every survey is sensible (positive margins, falling demand) and has a unique best price that beats the next by ≥ 5%;
- in ≥ 50% of survey items, the best price is neither the highest price nor the price that sells the most cups;
- every prompt value is pre-rendered.

## Distractors and misconceptions
| Level | Distractor / diagnosis | Misconception |
|---|---|---|
| 2–4 | overpaying → Puff: "Count the value, not the number of coins. One dime is worth two nickels." | bigger coin = more value; counting coins instead of value |
| 5 | giving the price as change → "That's the price of the cup. Change is the rest…" | change = price |
| 6 | card = two supplies only → "Remember every supply…"; ±25¢ | forgetting one cost |
| 7 | card = cups + price (6 cups at 50¢ → 56¢) → "Each cup brings in the price…"; (cups ± 1) × price | adding instead of multiplying |
| 8 | revenue + cost → "Costs are taken away…"; revenue alone (direction note) | revenue = profit |
| 9 | right amount with the wrong sign → "When supplies cost more than the money that came in, that's a loss." | sign error |
| 10 | highest price → "A higher price means fewer cups sold"; lowest price → "Selling the most cups isn't always best…" | higher price always earns more; most cups = most profit |

## Hint ladder
- **First miss:** Puff explains the misconception, chosen from the actual answer. On pay and change items the coins **stay** on the counter (the spec says they return; keeping them lets the child fix the gap instead of starting over, which is kinder). A value bar appears with the live gap ("3¢ more", "5¢ too much"). For change, the bar counts up from the price to $1. For profit and loss, only a direction note is shown, so the amount isn't given away. A wrong card or price notch is greyed out.
- **Second miss (model):** the coins go down one by one, largest first, with the totals said aloud. For change they count up from the price ("40, 50, 75, one dollar"). The ledger rows, cash rows or survey profit column then fill step by step. The right card, notch or Pay button pulses, and the child taps it (errorless).

## Voice
`src/games/lemonade-stand/voice.json`: 49 line ids and 295 clips. This covers the story (10), prompts with `c` (cents) and `cups` variants, Puff's 7 concept lines and 6 diagnoses, 7 praise lines (process only), and running totals for 1–99¢ plus "one dollar". Budge never says "buy" to the child.

## Accuracy and safety
- **Play money only.** No purchases, brands, banks, apps or investing; the savings jar is a jar, not a bank product.
- **Original art.** Coins are stylised learning objects with value numerals and real relative sizes (dime < penny < nickel < quarter), not US Mint designs. Notes are toy notes (lemon emblem, "PLAY"). Legal counsel should confirm the art against 18 U.S.C. § 504 before launch (money.md §5).
- **Model, not reality.** For grown-ups: real stands may need local permission, and the survey is fictional.
- **Later worlds.** Saving in insured banks belongs to a later world: cite the FDIC (https://www.fdic.gov/resources/deposit-insurance) there. Interest and investing worlds should check their maths against investor.gov's calculator.
