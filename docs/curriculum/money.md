# US money and financial literacy library (`money`)

Ages 7–14 (later band T). **Host:** Budge (new; a round, golden-mustard badger with a satchel and a pencil behind one ear, see `CHARACTERS.md`). Cameos: Bobbo (customer), Puff (counts in fives: nickels), Fenn (scam cross-over), Rumble (patient saver).
**Aligned with:** *National Standards for Personal Financial Education* (Council for Economic Education and Jump$tart Coalition, 2021), six standards: **Earning Income, Spending, Saving, Investing, Managing Credit, Managing Risk**, with benchmarks at grades 4, 8 and 12 (full text: https://www.ksde.gov/Portals/0/CSAS/CSAS%20Home/Financial%20Literacy/2021%20National%20Standards%20for%20Personal%20Financial%20Education.pdf). We cite standard area + grade benchmark (e.g. "Spending, gr. 4"); individual benchmark numbers are added after an educator checks them against that PDF. Maths computations also align with CCSS 2.MD.C.8 (coins), 7.RP.A.3 (percent, simple interest). Design is informed by the CFPB's building blocks of financial capability (executive function; financial habits and norms; financial knowledge and decision-making), https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/.

**House rules:** no real money, no purchases, no product, bank, app, brand or crypto recommendations; investing is taught as concepts only; game coins cannot be bought or exchanged; no random-reward or gambling-like mechanics.

## 1. Topics by age band

| Ages | Topic id | Topic | NSPFE area |
|---|---|---|---|
| 7–9 | `money.coins` | Coins, bills, paying and change | Spending (gr. 4) |
| 7–9 | `money.spend` | Needs and wants, choices and trade-offs | Spending (gr. 4) |
| 7–10 | `money.save` | Saving goals; save/spend/share | Saving (gr. 4) |
| 8–11 | `money.biz` | Entrepreneurship: cost, revenue, profit | Earning Income (gr. 4–8) |
| 8–11 | `money.earn` | Ways to earn; wages | Earning Income (gr. 4) |
| 9–12 | `money.budget` | Budgets, opportunity cost, comparing prices | Spending (gr. 4–8) |
| 10–13 | `money.save` | Interest: simple then compound; banks and deposit insurance | Saving (gr. 8) |
| 11–14 | `money.credit` | Borrowing, interest cost, credit cards (concepts) | Managing Credit (gr. 8) |
| 12–14 | `money.invest` | Risk and return, diversification, time (concepts) | Investing (gr. 8) |
| 12–14 | `money.risk` | Insurance as shared risk; scams and fraud | Managing Risk (gr. 8) |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `money.coins.pay` | pay an exact amount with coins | 7–8 | math.money.coins | bigger coin = more value (nickel > dime); counting coins instead of value | pay 7¢ | pay 87¢ with any coins | 2.MD.C.8; Spending gr. 4 |
| `money.coins.change` | make change by counting up | 7–9 | coins.pay | change = price; subtracting digit by digit with errors | change from 20¢ for 15¢ | change from $5 for $3.65 | 2.MD.C.8; Spending gr. 4 |
| `money.spend.needs-wants` | sort items into needs and wants and explain a choice | 7–9 | — | wants are bad; needs are only food | water vs toy | spend a fixed amount on a camping list | Spending gr. 4 |
| `money.spend.compare` | compare prices and unit prices to find better value | 9–11 | math.mult.arrays | bigger package = better deal; cheapest = best | 2 prices, same item | unit price of 3 sizes | Spending gr. 4–8 |
| `money.budget.plan` | build a budget where planned spending ≤ income and name the opportunity cost | 9–12 | spend.needs-wants, math.add.within-100 | budget = spending list; leftover money "disappears" | 3 items in $10 | monthly plan with a surprise cost | Spending gr. 8 |
| `money.save.goal` | find how long it takes to reach a saving goal | 7–10 | math.mult.arrays (soft) | saving means never spending | $2 a week for $10 | goal with a saving rate change midway | Saving gr. 4 |
| `money.save.jars` | split money into save/spend/share by a plan | 7–9 | coins.pay | splitting equally is the only fair split | $1 in halves | 10% share, 40% save of $20 | Saving gr. 4 |
| `money.save.simple-interest` | compute simple interest | 10–12 | math.solve.bar-model (soft) | interest is a fee you pay on savings | 10% of $10 for 1 year | $200 at 3% for 4 years | 7.RP.A.3; Saving gr. 8 |
| `money.save.compound` | explain compound growth and compare with simple interest | 11–14 | save.simple-interest | growth is the same every year; starting late doesn't matter | year 1 vs year 2 interest | two savers starting at different ages | Saving gr. 8; investor.gov |
| `money.save.banks` | explain why people keep savings in insured banks or credit unions | 10–13 | save.goal | money in a bank is spent by the bank and lost; jar is safer | bank vs jar story | what deposit insurance covers (concept) | Saving gr. 8; FDIC |
| `money.earn.wages` | compute earnings from hours × rate and know gross vs net (concept) | 9–12 | math.mult.arrays | net = gross | 3 hours × $5 | taxes withheld reduce take-home pay (concept) | Earning Income gr. 4–8 |
| `money.biz.profit` | compute cost, revenue and profit | 8–11 | coins.pay, math.mult.arrays | revenue = profit; costs only count once a day | revenue of 4 cups at 50¢ | profit or loss on a rainy day | Earning Income gr. 4–8 |
| `money.biz.pricing` | choose a price from a demand table to maximise profit | 10–13 | biz.profit | higher price always earns more | 2 prices compared | 4 prices with cost per cup | Earning Income gr. 8 |
| `money.credit.borrow` | explain borrowing, interest cost and why balances grow | 11–14 | save.simple-interest | borrowing is free money; minimum payment pays it off quickly | borrow $10, pay back $11 | balance after months of minimum payments (simplified) | Managing Credit gr. 8 |
| `money.invest.risk-return` | describe risk and return and why spreading money out reduces risk (concept) | 12–14 | save.compound | high return without risk exists; past results guarantee future | steady vs bumpy line | diversify across 3 orchards (concept game) | Investing gr. 8; investor.gov |
| `money.risk.insurance` | explain insurance as many people sharing the cost of rare events | 12–14 | budget.plan | insurance is wasted if nothing happens | 10 friends share a broken-bike fund | choose a sensible deductible in a story (concept) | Managing Risk gr. 8 |
| `money.risk.scams` | spot "too good to be true" money offers and tell a trusted adult | 9–13 | — | guaranteed big returns exist; sharing account details is fine with "officials" | "Win $1,000 now!" | "guaranteed 50% a month" investment pitch | Managing Risk gr. 8; FTC; cyber library |

## 3. World concepts (prioritised)

### 1. Budge's Lemonade Stand — **first world** (ages 7–10)
- **Host:** Budge · **Helper:** Puff (counts coins in fives) · **Scene:** a lemonade stand by the island beach.
- **Hook:** Budge is saving for a telescope, and her summer lemonade stand is the plan.
- **Interaction:** drag coins to pay and give change; tap tiles to compute cost, revenue and profit. **Answer kind:** set-matching (coins, any valid set) and number/choice.
- **Levels:** see §4 (9 levels).
- **Hints:** count up from the price; build revenue as rows of cups. **A11y:** coin buttons with values; running total shown and spoken.

### 2. Three Jars (ages 7–9)
- **Host:** Budge · **Cameo:** Rumble · **Scene:** Budge's burrow shelf with three jars: Save, Spend, Share.
- **Hook:** Budge's cousin got birthday money and wants to buy a kite, save for a bike and help the animal shelter.
- **Interaction:** drag coins into jars by a plan; read a goal chart. **Answer kind:** set-matching / number.
- **Levels:**
  1. split $1 in halves
  2. split by a picture plan (2 parts save, 1 spend)
  3. 10% share
  4. weeks to reach a goal
  5. goal changes
  6. choose a plan to reach a goal by a date
  7. compare two savers
- **Hints:** jar fill lines show the plan. **A11y:** plan shown as numbers and words.

### 3. Market Day Shopper (ages 8–11)
- **Host:** Budge · **Cameo:** Bobbo (always hungry) · **Scene:** weekend market stalls.
- **Hook:** Bobbo has $10 for a picnic for four friends, and he keeps wanting the giant cake.
- **Interaction:** drag items into a basket with a running budget bar. **Answer kind:** set-matching (rule check: needs covered, total ≤ budget).
- **Levels:**
  1. needs vs wants sort
  2. stay under budget
  3. compare 2 prices
  4. unit price
  5. a "sale" that isn't better value
  6. trade-off: what did you give up?
  7. plan for 4 people
- **Hints:** budget bar turns amber near the limit. **A11y:** total spoken after each change.

### 4. Budget Island (ages 9–12)
- **Host:** Budge · **Scene:** a month on an island hut: income on payday, costs during the month.
- **Hook:** Budge runs the island's hut for a month and has to make the money last until the next payday.
- **Interaction:** drag monthly income into category envelopes; respond to surprise events. **Answer kind:** set-matching (rule check).
- **Levels:**
  1. 3 envelopes
  2. 5 envelopes
  3. savings first
  4. surprise repair (emergency fund)
  5. adjust a category
  6. opportunity cost question
  7. plan a goal over 3 months
- **Hints:** a calendar strip shows when money runs out. **A11y:** envelope amounts in text.

### 5. Seed Bank Interest (ages 10–13)
- **Host:** Budge · **Cameo:** Hoot · **Scene:** a garden where savings seeds sprout interest leaves.
- **Hook:** Hoot's seed bank pays interest in new leaves, and leaves grow leaves of their own.
- **Interaction:** slide rate/years; predict balances; compare simple vs compound plants. **Answer kind:** number / numeric-tolerance (±$0.01 rounding).
- **Levels:**
  1. 10% of a round amount
  2. simple interest for 3 years
  3. compound year 2
  4. compare simple vs compound over 5 years
  5. start early vs start late
  6. rate vs time trade-off
  7. rule of thumb estimate, labelled "estimate"
- **Hints:** a year-by-year table builds row by row. **A11y:** chart has a data table. Numbers checked with the investor.gov compound interest formula.

### 6. The Borrowed Bike (ages 11–14)
- **Host:** Budge · **Cameo:** Fenn · **Scene:** a bike shop with a "pay later" sign.
- **Hook:** A shiny bike can be paid later, but how much will "later" really cost?
- **Interaction:** choose payment plans; watch a balance meter. **Answer kind:** number / choice.
- **Levels:**
  1. borrow and repay with a flat fee
  2. interest per month
  3. minimum payments stretch time
  4. compare save-first vs borrow
  5. credit score as a trust record (concept)
  6. spot a predatory offer (very high fees)
- Simplified monthly interest; labelled "simplified".

### 7. Budge's Craft Fair (ages 10–13)
- **Host:** Budge · **Cameo:** Brix · **Scene:** school craft fair booth.
- **Hook:** Budge and friends make bracelets to raise money for a class trip.
- **Interaction:** set prices, buy supplies, read a customer survey. **Answer kind:** number / choice.
- **Levels:**
  1. cost per bracelet
  2. revenue
  3. profit
  4. fixed vs per-item costs
  5. break-even count
  6. pricing from a survey
  7. reinvest or save the profit
- **Hints:** a profit bar splits into costs and earnings.

### 8. Orchard of Choices (investing concepts) (ages 12–14)
- **Host:** Budge · **Cameo:** Rumble · **Scene:** an orchard where tree types stand for kinds of saving and investing.
- **Hook:** Budge plants an orchard to feed the village in 10 years, and different trees grow in different ways.
- **Interaction:** allocate seedlings among steady, medium and bumpy trees; simulate seasons with **fixed, pre-written** scenarios (no randomness). **Answer kind:** choice / set-matching.
- **Levels:**
  1. steady vs bumpy growth
  2. higher possible growth comes with more ups and downs
  3. one tree type hit by frost → spread out
  4. long time smooths bumps (illustrative, not a guarantee)
  5. fees reduce growth
  6. "guaranteed huge harvest" pitch = warning sign
- Trees are metaphors; real products, tickers and brands are never named.

### 9. Rainy-Day Umbrella Club (insurance) (ages 12–14)
- **Host:** Budge · **Scene:** a village umbrella club pooling coins for storm repairs.
- **Hook:** Storms are rare but costly, so the villagers form a club to share the cost.
- **Interaction:** decide club contributions; resolve storm events. **Answer kind:** number / choice.
- **Levels:**
  1. pool vs alone
  2. premium
  3. claim
  4. deductible
  5. what's covered
  6. choose coverage for a story family

## 4. First world to build: **Budge's Lemonade Stand**

**Why first:** the owner named it; it joins concrete coin skills (7–8) to entrepreneurship (9–10) in one story; coins are the most common US financial-literacy entry point (2.MD.C.8, Spending gr. 4).

### 4.1 Objective and skills
"Child can pay and give change with US coins, and work out cost, revenue and profit for a small business." L0–L3 `money.coins.pay` (Lm 2); L4 `money.coins.change` (Lm 4); L5–L8 `money.biz.profit` (Lm 7); L9 `money.biz.pricing` (Lm 9).

### 4.2 Story
| Beat | Line (`ls.`) |
|---|---|
| intro1 | "Budge has a big dream: a telescope to see the stars." |
| intro2 | "So Budge opens a lemonade stand on the beach!" |
| intro3 | "First she has to buy lemons, and then sell lots of cups." |
| intro4 | "Can you help Budge count the money?" |
| between2 | "The first customers are smiling. Sip, sip!" |
| between4 | "Budge's money jar is filling up." |
| between6 | "Clouds are coming. Will people still buy lemonade?" |
| outro1 | "What a day at the stand!" |
| outro2 | "You counted coins carefully and worked out the profit." |
| outro3 | "Budge is closer to her telescope. Here's your Stand Star!" |

### 4.3 Board
- The stand with a price sign, a customer, a coin tray (penny 1¢, nickel 5¢, dime 10¢, quarter 25¢, $1 note, $5 note) and a "counter" drop zone.
- Coins are stylised with value numerals, distinct sizes (dime smallest, quarter largest of the silver coins) and copper/silver colours, but **not replicas** of US Mint designs; notes are clearly toy-like (see §5).
- Tap a coin → it goes on the counter; tap a counter coin → back. Running total is shown and spoken when it changes (unless muted).
- Business levels: a ledger card with tiles (cups, price, costs). The child answers with a number pad (≥64 px keys) or 3 choice cards, per level.
- All money is integer cents in data and validation.

### 4.4 Generator rules (seeded)
| Level | Item | Values | Answer | Validation | Distractor / misconception |
|---|---|---|---|---|---|
| 0 tutorial | pay | 3¢, pennies only | coins | sum = price | pointing hand |
| 1 | pay for a lemon | 5–20¢ (pennies, nickels, dimes) | coins | sum = price (any set) | tray includes a nickel and a dime of similar size: nickel > dime misconception surfaces as overpay |
| 2 | pay | 21–50¢, + quarters | coins | sum = price | — |
| 3 | pay | 51¢–$1.00 | coins | sum = price; L3 bonus prompt "fewest coins" is optional praise only | — |
| 4 | give change from $1 | price 5–95¢ in 5¢ steps | coins | sum = 100 − price | count-up hint; common errors: giving the price, off by 5¢/10¢ |
| 5 | cost of a batch | 3 ingredients, $0.25–$2.50 each (25¢ steps), total ≤ $5 | 3 choices | equals sum | distractors: sum of two items only; ±25¢ |
| 6 | revenue | cups 2–10 × price ∈ {25¢, 50¢, 75¢, $1} | 3 choices | cups × price | cups + price (adding instead of multiplying); ×1 cup off |
| 7 | profit | revenue (from L6 form) − cost (from L5 form), profit > 0 | number pad | exact | revenue (forgot costs); revenue + cost |
| 8 | profit or loss | rainy day: revenue may be < cost | choice (profit / loss / break even) then number pad | both correct | sign error (cost − revenue labelled profit) |
| 9 | best price | table of 4 prices → cups sold (fictional survey, decreasing), cost per cup fixed | choice | max of (price − cost) × cups; ties never generated | highest price; most cups sold |

Constraints (levels × 50 seeds): every pay item solvable with the tray; change items never need pennies at L4; profit values never negative at L7; L9 demand tables always decreasing with price and have a unique best price that is neither the highest price nor the price with most cups in ≥50% of items (so the misconceptions are tested).

### 4.5 Hint ladder
- **First miss:** coins return; Puff appears with the concept line; the counter shows the gap ("3¢ more").
- **Second miss (model):** coins slide one by one onto the counter while the total is counted aloud ("25, 35, 40, 41, 42"), largest first; the child taps "Pay" (errorless). Business levels: the ledger fills step by step (revenue row of cups, then cost subtracted).

### 4.6 Helper explanations (Puff)
- `ls.help.value` "Count the value, not the number of coins. One dime is worth two nickels."
- `ls.help.big-first` "Start with the biggest coins, then add smaller ones."
- `ls.help.count-up` "To give change, count up from the price to one dollar."
- `ls.help.cost` "Cost is what Budge spends to make the lemonade."
- `ls.help.revenue` "Revenue is all the money from selling: cups times price."
- `ls.help.profit` "Profit is what's left after paying the costs."
- `ls.help.price` "A higher price means fewer cups sold. Find the best mix."

### 4.7 Voice lines (prefix `ls.`; ≈45 ids)
Prompts: `ls.prompt.pay` "A lemon costs {amount}. Pay the farmer!" · `ls.prompt.change` "The customer gives one dollar for a {amount} cup. What change?" · `ls.prompt.cost` "How much does one batch cost?" · `ls.prompt.revenue` "Budge sold {n} cups at {amount}. How much money came in?" · `ls.prompt.profit` "What profit did Budge make?" · `ls.prompt.loss` "Rainy day. Profit or loss?" · `ls.prompt.price` "Which price earns the most profit?"
Praise: `ls.praise.1` "You counted the value of every coin!" · `ls.praise.2` "Counting up gave the right change." · `ls.praise.3` "You remembered to take away the costs." · `ls.praise.4` "You compared every price before choosing."
Retry: `ls.retry.1` "Let's count it together." · Idle: `ls.idle` "Tap a coin to put it on the counter."
Story 10, helper 7. Variables: `amount` (1¢–$5.00 in the values used; ≈160 phrases), `n` 2–10. **Estimate ≈ 45 ids, ≈ 260 clips.**

### 4.8 Reward
Sticker **"Stand Star"**: a round lemon-slice badge with Budge's pencil and a tiny star (original).

### 4.9 Accessibility
Coin buttons labelled by name and value ("quarter, 25 cents"); the total is in a live region; keyboard: Tab across coins, Enter adds, Backspace removes the last coin. Colour is never the only cue (value numerals on coins).

## 5. Accuracy notes (expert review required for credit, investing, insurance, taxes)
- Primary sources: CFPB youth financial education (building blocks), FDIC (deposit insurance: standard coverage is $250,000 per depositor, per insured bank, per ownership category; https://www.fdic.gov/resources/deposit-insurance), SEC Office of Investor Education (https://www.investor.gov, compound interest calculator: https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator), FTC (scams). Re-check figures yearly.
- A qualified financial educator reviews every item in credit, investing, insurance and tax topics before release; interest maths is unit-tested against the standard formulas.
- Money art: stylised coins and toy notes only. US rules restrict reproducing currency (e.g. 18 U.S.C. § 504 on illustrations of currency); our art is clearly not real currency. Legal counsel confirms before launch.
- Lemonade-stand realism note for grown-ups: real stands may need local permission; the game is a model.
- "Simplified" label on any model that omits fees, taxes or compounding frequency.

## 6. Age-appropriateness and safety
- No real money, purchases or upsells in child areas (PHASE1_BRIEF); game coins are learning objects only and can't be spent on rewards.
- No shaming of wants or of families' money situations; scenarios use small, everyday amounts and never depict poverty as a failure.
- No loot boxes, spins or random prizes; outcomes in simulations are pre-written and explained.
- Investing worlds never name real companies, funds, apps or cryptocurrencies and never imply guaranteed returns.
