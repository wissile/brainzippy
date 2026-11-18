# BrainZippy Curriculum Framework

Owner: curriculum-designer. Status: **proposal (2026-11-17)**, not yet reviewed by an external educator.
This folder plans BrainZippy as a multi-library learning platform. It extends `docs/CURRICULUM.md` (the implemented maths skills) and follows `docs/GAME_AUTHORING.md` and `docs/agents/GAMES_BRIEF.md` (what a world is).

| File | Contents |
|---|---|
| `README.md` | Framework, age bands, mastery and review rules, daily planner, standards |
| `english.md` · `maths.md` · `computer-science.md` · `pilot.md` · `money.md` · `cyber.md` · `science.md` · `geography.md` · `social-emotional.md` · `engineering.md` · `nature.md` | One library each: topics, skills, world concepts, first world spec, accuracy and safety notes |
| `ROADMAP.md` | Build order, dependencies (engine, art, characters), voice-line estimates |
| `CHARACTERS.md` | New original hosts and cameo helpers per library |

Everything here is a design proposal. Learning rules are **hypotheses informed by research**, not validated outcomes (D-020). Standards mappings say **"aligned with"**; BrainZippy is not certified, endorsed or approved by any standards body.

---

## 1. Structure: library → topic → skill → world

```
Library (e.g. Maths)                      id: math
 └─ Topic, per age band (e.g. Fractions)  id: math.frac
     └─ Skill (atomic, testable)          id: math.frac.unit-on-line
         └─ practised in Worlds (story games), each world covers 1–4 skills across its levels
```

| Level | What it is | Required fields |
|---|---|---|
| **Library** | A subject shelf with one recurring host character | `id`, title, host, age range, standards it aligns with |
| **Topic** | A cluster of skills for one age band | `id` (`lib.topic`), age band, ordered skill list |
| **Skill** | One objective a child can show evidence of | `id` (`lib.topic.skill`), objective ("Child can…"), ages, prerequisites (hard / soft), misconceptions targeted, mastery level `Lm`, mastery count `N` (default 6), standards (aligned with) |
| **World** | A story-driven interactive game (GAMES_BRIEF) | `id`, host + helper, scene, story arc (intro 3–5 beats, between beats, outro), interaction, answer kind, generator with `maxLevel` 6–10, level → skill map, hint ladder, reward sticker, a11y alternative |

### IDs
- Format `lib.topic.skill`, lowercase, kebab-case inside each segment. IDs are **permanent**: progress is keyed by them. Rename = new id + migration note.
- Library ids: `ela` English · `math` Maths · `cs` Computer science · `pilot` Pilot ground school · `money` Money and financial literacy · `cyber` Digital safety · `sci` Science · `geo` Geography and cultures · `sel` Social and emotional skills · `engr` Engineering · `nature` Nature, oceans and environment.
- In a library's skills table, prerequisites from the same library may drop the library prefix (`shape.name` = `math.shape.name`); cross-library prerequisites are always written in full.
- Existing ids (`math.count.*`, `math.add.number-line`, `math.add.within-20`, `math.div.share-equally`) stay unchanged. The old candidate `literacy.letters.recognise` becomes `ela.letters.recognise`.

### Answer kinds (shared vocabulary for every world spec)
| Kind | Meaning | Validation |
|---|---|---|
| `number` | One exact number (integer or exact fraction) | equality; fractions compared as reduced numerator/denominator, money as integer cents |
| `choice` | Pick one option | equality with the target option id |
| `sequence` | An ordered list (steps, blocks, events) | either exact order, or **by simulation** (any program that reaches the goal passes) — the spec says which |
| `set-matching` | Put items into bins, select all items that apply, or build a configuration | compare to the accepted set, or run a **rule checker** (any valid build passes) |
| `numeric-tolerance` | A position or estimate | `|answer − target| ≤ tolerance`; tolerance declared per level |

Today's engine (`src/engine`) implements `choose`, tap-count and make-set. `sequence`, `set-matching` (rule checker) and `numeric-tolerance` are engine work, listed as dependencies in `ROADMAP.md`.

---

## 2. Age bands

| Band | Ages | Platform rules (from CLAUDE.md and PRODUCT_REQUIREMENTS) |
|---|---|---|
| **A** | 3–5 | No reading required. Every prompt spoken + captioned. Tap targets ≥64 px. One instruction at a time. Max 2–4 choices. |
| **B** | 6–8 | Short text supported by voice. Targets ≥64 px up to age 7. Lines ≤14 words. |
| **C** | 9–11 | Text-led with voice on demand. Multi-step tasks. Targets ≥44 px. |
| **D** | 12–14 | Richer text, data, diagrams; abstract notation. |
| **T** | 14+ / adult | Content exists in the CS, pilot and geography libraries. **Product decision required** (see below). |

Library age ranges map onto these bands; a skill lists its own ages (e.g. `7–9`).

**Decision needed on band T.** The owner asked for CS 14+, pilot 14–adult and geography to adult. BrainZippy is designed as a child service (guest mode, parent-owned accounts). Teen/adult learners need their own UX (text-heavy, no mascot-led voice on every line) and their own privacy analysis: COPPA covers children under 13; GDPR digital-consent ages vary by EU country (13–16). Recommendation: build bands A–D first and treat band T as a later "Teen & Adult" track with its own review. The library files still plan T skills so the skill graph is complete.

---

## 3. Mastery model (deterministic)

All rules are pure functions of stored events, unit-testable with a fixed clock and seed. Speed is never an input. No rule is ever shown to the child as a loss.

### 3.1 Events
Each answered item stores `{ skillId, worldId, level, localDate (YYYY-MM-DD, device clock), outcome }`, where
- `first-try` = correct on the first submission with no hint shown;
- `assisted` = correct after the strategy hint (first miss);
- `modelled` = correct after the modelled answer (second miss).

Guest mode keeps events on the device (`src/services`); nothing identifies the child (P1, D-009).

### 3.2 Within a world (existing, keep)
- **R0 level-up:** a completed round raises the world's level by 1 (cap `maxLevel`), only if ≥50% of the round was `first-try` (D-019, D-022).
- **R1–R6:** in-round adaptivity as documented in `docs/GAME_ENGINE.md` (step up after 2 first-try, step down after ≥3 attempts, round = 8 items).

### 3.3 Skill states
`locked → available → practising → mastered`, plus a review schedule once mastered.

| Rule | Definition |
|---|---|
| **U1 unlock** | A skill is `available` when every **hard** prerequisite is `mastered` **or** has ≥ ⌈N/2⌉ first-try successes at or above its `Lm`. Soft prerequisites (often cross-library) are recommendations and never block. |
| **U2 age window** | The planner only offers skills whose ages overlap the child's band ±1 year. A parent can override per library. |
| **P practising** | First answered item moves `available → practising`. |
| **M1 mastery** | A skill is `mastered` when it has **N first-try successes** (default N = 6; per-skill override 4–10) on items at level ≥ `Lm`, spread across **≥2 distinct local dates**, with at least ⌈N/3⌉ of them on a date later than the first qualifying date. |
| **M2 no penalties** | `assisted` and `modelled` outcomes never subtract; they simply don't count toward M1. |
| **M3 evidence variety** | If the skill is practised in ≥2 worlds, at least one qualifying success must come from a second world or a second object set (varied practice; Vlach & Sandhofer 2012, cited in REFERENCE_RESEARCH.md). If only one world exists, M3 is waived. |

`Lm` (mastery level) is declared per skill in each world's level → skill map: the lowest level at which the full objective is exercised without scaffolds such as labels or pre-filled steps.

### 3.4 Spaced review
After mastery the skill enters a Leitner-style schedule. Expanding intervals follow the spacing effect (Cepeda et al., 2006, *Psychological Bulletin* meta-analysis on distributed practice; Dunlosky et al., 2013 rate distributed practice and practice testing as high-utility). The exact intervals below are a product hypothesis, to be tuned with data.

| Box | Next review after |
|---|---|
| 1 | 2 days |
| 2 | 4 days |
| 3 | 8 days |
| 4 | 16 days |
| 5 | 32 days (stays at 5) |

- **S1** On mastery, box = 1, `nextReview = today + 2 days`.
- **S2** A review = one short round (5 items) of that skill at level `Lm − 1 … Lm`, in any world that practises it (prefer a different world from last time).
- **S3** Review passed (≥3 of 5 `first-try`) → box + 1. Not passed → box − 1 (min 1). Two consecutive failed reviews in box 1 → state returns to `practising` quietly (the child sees only "Let's practise this again!"; parents see "practising again").
- **S4** A review never counts as new learning for the daily "new skill" limit.

### 3.5 Daily planner (deterministic)
Inputs: child band, enabled libraries, cap `K` (default 5, parent range 3–10, PHASE1_BRIEF), skill states, review dates, today's local date.

| Rule | Definition |
|---|---|
| **D1 plan once** | The plan is computed at the first open of a local day and saved. Reopening the app shows the same plan. |
| **D2 slots** | A day has `K` slots. One slot = one round of one world. |
| **D3 reviews** | Due set = mastered skills with `nextReview ≤ today`, sorted by days overdue (desc), then box (asc), then skill id. Review slots = `min(|due|, max(1, floor(0.4 × K)))`; K=3 → 1, K=5 → 2, K=10 → 4. Zero if nothing is due. |
| **D4 learning** | Remaining slots go first to `practising` skills (most recently played first, so a skill is finished before a new one starts), then to new `available` skills. Max **1** brand-new skill per day for ages ≤7, **2** for ages ≥8. |
| **D5 variety** | ≤2 slots per library per day unless only one library is enabled. Two consecutive slots never use the same world. |
| **D6 order** | Slot 1 = a review if any (an easy, familiar start); then alternate learning and review; **the last slot is the child's pick** from two planned options (agency). |
| **D7 fill** | If content runs out, remaining slots become free choice among unlocked worlds. |
| **D8 no carry-over** | Unplayed slots expire at midnight. No streaks, no "you missed a day" messages, no guilt mechanics. After K rounds: "come back tomorrow". |
| **D9 ties** | Any remaining tie is broken by skill id, then world id (alphabetical), so tests are reproducible. |

Example for K = 5, two reviews due, one skill practising: `[review A, practising B, review C, new D, child picks (B or D)]`.

Tests to write when this is implemented (owned by game-engineer): `tests/unit/mastery.test.ts`, `tests/unit/planner.test.ts`. Cover M1 day-spreading, M2 no penalty, S3 demotion, D3 slot counts for K = 3/5/10, D5 variety, D8 expiry, all with a fixed clock.

---

## 4. Instructional rules for every world
1. **Demonstrate → do together → do alone.** Level 1 starts with a pointing-hand tutorial item.
2. **Hint ladder (existing).** First miss: the helper explains the concept and gives a strategy; the wrong option greys out. Second miss: a modelled or worked answer on the board, which the child still completes (errorless).
3. **Distractors target named misconceptions**, never random. Each library file lists the misconception behind every distractor rule.
4. **Difficulty grows by documented parameters**: range, number of steps, how similar the distractors are, and how much scaffolding is removed. Time pressure is **never** a parameter.
5. **Praise process, not ability.** No "smart" or "genius".
6. **Every world is fully playable muted, by keyboard, and without drag**, with a reduced-motion path and no overflow at 390×844, 915×412, 1024×1366 and 1280×800.

---

## 5. Standards each library is aligned with

We say "aligned with" and cite the version. We cite a standard code only if it was checked against the publisher's text (2026-11-17). Before any public "standards" page, a qualified educator must review the mapping.

| Library | Primary framework (aligned with) | Source | Notes |
|---|---|---|---|
| English (`ela`) | Common Core State Standards for ELA/Literacy, Reading Foundational Skills (RF), Language (L), Reading (RL/RI), Writing (W) | corestandards.org | Ages 3–4 are pre-K; CCSS starts at kindergarten. |
| Maths (`math`) | Common Core State Standards for Mathematics, plus the Standards for Mathematical Practice (MP1–MP8) | corestandards.org; IES/WWC practice guide *Developing Effective Fractions Instruction for K–8* (https://ies.ed.gov/ncee/wwc/PracticeGuide/15) for the fractions design | CCSS has no kindergarten "patterns" standard; patterns align with MP7 (structure) and 4.OA.C.5. |
| Computer science (`cs`) | **2026 CSTA PK-12 Computer Science Standards** (released at the CSTA conference on 14 July 2026); the **2017 CSTA K-12 standards** are cross-referenced because many states still use them | https://csteachers.org/2026-csta-pk-12-computer-science-standards/ · 2017: https://portal.ct.gov/-/media/sde/cte/csta-k12-computer-science-standards-revised-2017.pdf | 2026 codes look like `E2-ALG-PS-01` (grade band, concept, subconcept, number). Elementary is now per grade (EK, E1–E5), then MS and HS. |
| Science (`sci`) | Next Generation Science Standards (NGSS), physical, life and earth science performance expectations | nextgenscience.org | |
| Engineering (`engr`) | NGSS Engineering, Technology and Applications of Science (ETS1: K-2-ETS1, 3-5-ETS1, MS-ETS1, HS-ETS1) plus engineering-tagged PEs | nextgenscience.org | |
| Nature (`nature`) | NGSS life science (LS2 ecosystems, LS4) and earth and human activity (ESS3) | nextgenscience.org; NOAA for reef facts | |
| Money (`money`) | **National Standards for Personal Financial Education** (Council for Economic Education and Jump$tart Coalition, 2021): Earning Income, Spending, Saving, Investing, Managing Credit, Managing Risk; benchmarks at grades 4, 8 and 12 | https://www.councilforeconed.org/6-core-areas-of-personal-finance/ · full text: https://www.ksde.gov/Portals/0/CSAS/CSAS%20Home/Financial%20Literacy/2021%20National%20Standards%20for%20Personal%20Financial%20Education.pdf | Also CFPB "building blocks of financial capability" (executive function; habits and norms; knowledge and decision-making): https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/ |
| Geography (`geo`) | **National Geography Standards** (*Geography for Life*, 2nd ed., 2012): 18 standards in 6 essential elements | https://ncge.org/resources/national-geography-standards | |
| Social-emotional (`sel`) | **CASEL 5** competencies: self-awareness, self-management, social awareness, relationship skills, responsible decision-making | https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/ | CASEL is a framework, not a standard with codes. |
| Pilot (`pilot`) | **FAA-S-ACS-6C**, Private Pilot Airplane Airman Certification Standards (effective 31 May 2024) and **FAA-H-8083-25C**, Pilot's Handbook of Aeronautical Knowledge | https://www.faa.gov/training_testing/testing/acs | ACS element codes look like `PA.I.C.K1` (certificate, Area of Operation, Task, element). Educational only; see `pilot.md`. |
| Cyber (`cyber`) | **CISA "Secure Our World"** (recognise and report phishing; strong passwords and a password manager; multifactor authentication; update software), **FTC** consumer guidance on phishing and scams, **Common Sense Education** digital citizenship topics (privacy and security, digital footprint, relationships and communication, cyberbullying and online harms, news and media literacy, media balance), and CSTA 2026 Systems & Security standards | https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-4-Easy-Ways-Stay-Safe-Online-Tip-Sheet.pdf · https://consumer.ftc.gov/consumer-alerts/2025/04/protect-yourself-phishing-scams · https://www.commonsense.org/education/digital-citizenship | The NICE Framework (NIST) describes cybersecurity work roles; it is relevant only as career context for band T. |

### Verified codes used in library files
CSTA 2026: `EK-ALG-PS-01`, `E1-ALG-PS-01`, `E2-ALG-PS-01`, `E3-ALG-PS-01`, `E4-ALG-PS-01`, `E5-ALG-PS-01`, `MS-ALG-PS-01` … `MS-ALG-PS-05`, `MS-SYS-SE-32`, `HS-SYS-SE-33`, `HS-ALG-PS-02`.
CSTA 2017: `1A-AP-08`, `1A-AP-10`, `1A-AP-11`, `1A-AP-14`, `1A-NI-04`, `1B-AP-10`, `1B-AP-15`, `1B-NI-05`, `2-AP-11`, `2-AP-12`, `2-NI-05`, `2-IC-23`, `3A-AP-13`, `3A-AP-16`.
NGSS: `5-PS2-1`, `MS-LS2-1` … `MS-LS2-5`, `MS-ESS3-1` … `MS-ESS3-5` checked on nextgenscience.org; other NGSS and CCSS codes in the library files are standard published codes. Before publication, the educational-content-validation review re-checks each code against the publisher's text.

---

## 6. Evidence caveat
The mastery, review and planner rules are deterministic product rules informed by learning research (spacing, retrieval practice, worked examples, errorless completion). BrainZippy's effect on learning has **not** been measured. Do not market outcomes. Mark rule changes in `docs/DECISIONS.md`.
