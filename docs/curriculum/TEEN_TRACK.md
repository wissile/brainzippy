# Teen track (band T, 14+): "BrainZippy Lab"

Owner: curriculum-designer. Status: **proposal (2026-11-22)**. The owner approved a 14+ track; this file proposes how to build it. Nothing here has been reviewed by an external educator, an instructor or a lawyer yet.
It extends `README.md` (framework, band T row, mastery and planner rules), the library files, `ROADMAP.md` and `CHARACTERS.md`, and follows `docs/GAME_AUTHORING.md` (answer kinds, generators, boards).
As everywhere in this folder, learning rules are **hypotheses informed by research**, not validated outcomes (D-020). Standards mappings say **"aligned with"**. BrainZippy is not certified or endorsed by CSTA, the College Board, the FAA or any other body.

Current host names come from the shipped code (`src/content/packs/library-hosts`): **Toggle** is the CS host (planned in the library files as Loopi) and **Yonder** is the geography host (planned as Pico).

## 0. Summary of recommendations

| Question | Recommendation |
|---|---|
| Teen UX | A separate **Lab mode** inside the same app and account model. It has its own shell, theme and routes (`/lab/...`) and reuses the engine, mastery and planner unchanged. A parent turns it on per profile from the dashboard; a Lab profile opens straight into the Lab. (§1.5) |
| Name | "Lab", not "Studio": `/studio` is already the dev-only voice studio, and "teen" in a UI label tends to feel patronising. |
| Code execution | **Python:** Pyodide, self-hosted, in a locked-down Web Worker, loaded lazily. **JavaScript logic:** QuickJS compiled to WebAssembly (quickjs-emscripten) in a Worker. **HTML/CSS/DOM:** a sandboxed `srcdoc` iframe with an opaque origin and a CSP that blocks all network. All of it runs on the device, at $0 server cost. (§3) |
| Auto-checking | The board runs hidden test cases and submits the ids of the tests that passed as a **`set`** answer whose correct set is every test. This needs no new answer kind. Most items do not execute code at all: predict-the-output (`choice`), Parsons line ordering (`sequence` with distractor lines), trace tables (`match`/`number`). (§3.5) |
| First 6 worlds | 1 **Python Workbench** (CS) · 2 **METAR & TAF Desk** (pilot) · 3 **Web Workshop** (CS) · 4 **Chart Room: Airspace & Sectionals** (pilot) · 5 **Interest & Loans Desk** (money) · 6 **Graph Lab: Linear & Exponential** (maths). (§4) |
| v1 scope | Ship worlds 1, 2, 3 and 5 as Lab v1.0. Worlds 4 and 6 follow in v1.1: world 4 needs large original chart art and the heaviest instructor review. Pilot v1 covers weather and airspace only, and the product says plainly that it is not a complete ground school. (§6) |

---

## 1. Positioning and tone

### 1.1 Who it is for
- **Primary:** learners aged 14–17 using a profile under a parent-owned account (PHASE1_BRIEF). Adults can use a Lab profile that the account owner creates. v1 has no separate adult accounts.
- **Promise:** real skills with real tools. Learners write real Python, decode real-format METARs and work real interest formulas, with the same patient, never-punishing feedback as the kids' product.
- **Not:** a certification course, exam prep that promises a pass, or a social platform.

### 1.2 Visual and interaction register

| Aspect | Kids' UI (bands A–D) | Lab (band T) |
|---|---|---|
| Frame | Monster Island map, story intro beats, stickers | **Desk/workbench screens** ("Briefing desk", "Workbench", "Chart room"); a skill map instead of an island |
| Hosts | Full-body animated mascots, 7 states | Each library host appears as a small **mentor mark**: a simplified line glyph in the library colour, shown beside short notes. No bounce or full-body animation. Creative-director designs it; no new characters are needed for v1. |
| Story | 4 intro beats, between-beats, outro | One-line context ("Saturday trip: decode the 0950Z report before the go/no-go call."). The story is skippable and never repeats once seen. |
| Typography/density | Large, ≤14-word lines | System UI font stack (no external fonts), body 16–18 px, monospace for code/METARs, data tables, two-pane layouts on ≥900 px |
| Targets | ≥64 px under 7, ≥44 px always | ≥44 px always; a code-token strip of ≥44 px buttons on touch devices |
| Motion | Playful character motion | Functional motion only (state changes, run playback); reduced-motion path still required |
| Rewards | Stickers, celebration | **Skill marks** on the skill map, plus a short process summary ("4 of 4 tests pass; you handled the empty list"). We avoid "certificate", which pilot learners could confuse with FAA certificates. |
| Praise | Process praise | Process praise, terse and specific. No "smart" or "genius", and no exclamation flood. |
| Colour/theme | Bright library palettes | Neutral dark and light themes (learner's choice) with library colour accents; contrast ≥4.5:1 checked on both |

### 1.3 Voice: less narration, optional
- **Off by default in the Lab.** Text is the primary channel. This is a separate setting from the kids' mute.
- A **"Read aloud"** button on every prompt, note and hint serves accessibility and learners who prefer listening. It uses the AudioEngine fallback chain. Lab text is **not** added to `voiceLines.json`; otherwise the clip-coverage test would demand pre-rendered clips for hundreds of technical strings. Audio-designer decides whether a different, older-sounding Kokoro voice is used for the few pre-rendered Lab lines: about 10 per world for errors and summaries. (Decision ET-7.)
- Feedback sounds are subtle and optional; they never carry meaning that the text doesn't also carry.

### 1.4 Privacy and safety: still a minors' product
- **COPPA** protects children **under 13**, so it does not formally apply to a 13+ learner. BrainZippy still treats Lab users as **minors**:
  - The **UK Age Appropriate Design Code** covers under-18s.
  - EU **GDPR** digital-consent ages vary by country (13–16).
  - Several US states have teen-specific online-safety laws.

  The security-privacy-reviewer and counsel must review the Lab **before launch**; this document is not legal analysis.
- **No new data.** The Lab uses exactly the guest/parent model: progress events `{skillId, worldId, level, localDate, outcome}`, local by default and synced only under a parent account.
- **Learner code is free text, so it never leaves the device.** Code is kept in local storage per item, is never synced to D1 and is never sent to any service. Code may contain names or other personal data, so we treat it like the child's name. Run results are reduced to pass/fail per test id before they reach the engine.
- **No social features beyond what parents allow.** No public profiles, chat, comments or code sharing (not even friends-only) in v1. Friends-only leaderboards stay behind `FRIENDS_ENABLED` and parent opt-in, exactly as for kids.
- **No generative AI and no external AI calls.** The AI-fundamentals world uses tiny in-browser models on game data.
- **Purchases and settings:** the kids' parent gate (2-digit × 1-digit multiplication) does **not** stop a 14-year-old. Lab profiles must reach billing and profile settings only through a parent sign-in (magic link to the parent email). (ET-9.)
- No ads, trackers, external CDNs or fonts. The code runtimes are **self-hosted** static assets (§3).

### 1.5 How the Lab coexists with the kids' UI

| Option | Description | For | Against |
|---|---|---|---|
| A. **Lab mode** (separate shell) | Band-T profiles open `/lab`: own layout, theme, skill map and settings. Same engine, content registry, mastery, planner and storage. | Clean break in tone; kids' UI stays untouched; siblings on one device each see their own world; lazy-loaded, so kids never download Lab code | One more shell to maintain (≈ ux-designer M + game-engineer M) |
| B. Age-band theming | Same Monster Island UI with a "grown-up" skin for band T | Cheapest | The island, the story frame and the mascots *are* the kids' product; reskinning still reads as young; risk of teens bouncing off |
| C. Entry from the parent dashboard only | Parent opens teen content from the dashboard | Strong parental control | It is an entry point, not a UX; a teen should not need a parent present to practise |

**Recommendation: A, gated by C.** The parent turns on the Lab for a profile in the dashboard (or creates a band-T profile). That profile then opens straight into the Lab. Parents of 12–13-year-olds may also enable individual Lab libraries, which uses the existing U2 per-library override. The profile picker shows a Lab profile with a plain geometric avatar option instead of a monster, and the nickname stays on the device as before.

### 1.6 What stays the same
- README §3 mastery (M1–M3), spaced review (S1–S4) and planner (D1–D9). The daily cap K applies to the Lab; whether teens get unplanned "free practice" after the plan is an owner decision (§7).
- The hint ladder: miss 1 → strategy; miss 2 → modelled answer the learner still completes (errorless). Retries are unlimited and nothing is subtracted.
- **No timers on answers.** Code execution has a **program** time limit (§3.4); that limit protects the device and never measures the learner.
- Fully playable muted, by keyboard and without drag; no overflow at the four viewports.

---

## 2. Libraries and topics for 14+

Codes below were checked on 2026-11-22: CSTA 2017 level 3A against CSTA's own progression chart, 3B against Washington OSPI's adoption of the CSTA standards, and the AP CSP big ideas against College Board AP Central. Other codes (CCSS HS, NGSS HS, CCSS ELA 9–10) are standard published codes, re-checked during educational-content-validation.

### 2.1 Computer science (`cs`), priority
AP CSP big ideas: **1 Creative Development · 2 Data · 3 Algorithms and Programming · 4 Computer Systems and Networks · 5 Impact of Computing**.
The docs-only id `cs.py.basics` (never shipped) is split into the finer skills below. No migration is needed.

| Topic | skill_id | Objective (learner can…) | Prereqs | Misconceptions targeted | Aligned with |
|---|---|---|---|---|---|
| Python | `cs.py.values` | predict output of `print`, strings, ints, floats, `+` on str vs int | cs.game.nested (soft) | `"3" + 4` works; `print` returns a value | 3A-AP-13 · CSP 3 |
| | `cs.py.cond` | trace and write `if/elif/else` with comparisons and `and/or/not` | py.values | `=` vs `==`; `elif` runs after a true `if`; indentation is cosmetic | 3A-AP-15 · CSP 3 |
| | `cs.py.loops` | trace and write `for … in range()` and `while` with accumulators | py.cond | `range(5)` includes 5; loop variable keeps the start value | 3A-AP-15 · CSP 3 |
| | `cs.py.lists` | index, slice, append and iterate lists | py.loops | first index is 1; `list[-1]` is an error | 3A-AP-14 · CSP 3 |
| | `cs.py.functions` | define functions with parameters and `return`; use them in tests | py.loops | `print` = `return`; a variable inside a function is visible outside | 3A-AP-17, 3A-AP-18 · CSP 3 |
| | `cs.py.dicts` | use dictionaries and string methods to process text data | py.lists | dict order is index-based; strings mutate in place | 3A-AP-14 · CSP 2, 3 |
| | `cs.py.test` | read a failing test, locate and fix a bug; write a test case | py.functions | one passing test proves correctness | 3B-AP-21, 3A-CS-03 · CSP 3 |
| Web | `cs.web.html` | structure a page with semantic HTML (landmarks, heading order, lists, links, `alt`) | — | `div` for everything; headings chosen by size | 3A-AP-21 · CSP 1 |
| | `cs.web.css` | select elements and style them; box model; contrast; flex layout | web.html | CSS changes content; `width` includes padding by default | 3A-AP-21 · CSP 1 |
| | `cs.js.basics` | JS values, `let/const`, functions, arrays (logic only) | py.functions (soft) | `==` vs `===`; `const` arrays cannot change | 3A-AP-13 · CSP 3 |
| | `cs.js.events` | select an element, attach a click handler, update the DOM | js.basics, web.html | code runs top-to-bottom once; handler is called at attach time (`f()` vs `f`) | 3A-AP-16 · CSP 3 |
| Algorithms & data structures | `cs.alg.search` | linear vs binary search; count steps | py.lists | binary search works on unsorted data | 3B-AP-10, 3B-AP-11 · CSP 3 |
| | `cs.alg.sort` | trace selection/insertion sort; compare step counts | alg.search | fewer lines = faster | 3B-AP-10, 3B-AP-11 |
| | `cs.ds.structures` | choose list, dict, stack or queue for a task | py.dicts | one structure fits everything | 3B-AP-12 |
| | `cs.alg.growth` | compare how step counts grow (constant, linear, quadratic, log), informally | alg.sort | doubling the input doubles every algorithm's time | 3B-AP-11 · CSP 3 |
| | `cs.alg.recursion` | trace a short recursive function | py.functions | recursion is a loop without a base case | 3B-AP-13 |
| AI fundamentals | `cs.ai.train` | explain training on examples, train/test split and accuracy | cs.ai.examples | a model "understands"; high training accuracy = good model | 3B-AP-08 · CSP 2, 5 |
| | `cs.ai.bias` | find how unrepresentative data produces unfair errors, and pick a fix | ai.train | bias comes only from programmers' intent; more data always fixes it | 3A-IC-25, 3B-IC-25 · CSP 5 |
| | `cs.ai.ethics` | apply safe and ethical use: verify outputs, protect personal data, follow school rules on AI, label generated media | ai.train, cyber.ai.safe-use | AI output is authoritative; pasting personal info is harmless | 3A-IC-24, 3A-IC-29 · CSP 5 |
| Systems | `cs.net.basics` | packets, IP addresses, DNS, HTTPS (concepts) | — | the internet is one cable; HTTPS means a site is trustworthy | 3A-NI-04 · CSP 4 |

### 2.2 Pilot ground school (`pilot`), priority
> **Educational only.** Not FAA-approved ground training. It does not replace a certificated flight or ground instructor, does not count toward any certificate, rating, logbook entry or knowledge-test endorsement, and is no substitute for the FAA knowledge test. Charts are fictional and **not for navigation**. Shown at the start of each Lab pilot world and on its parent page (`pilot.md` notice, unchanged).

Aligned with **FAA-S-ACS-6C** (Private Pilot, Airplane; effective 31 May 2024) at Task level, and with **FAA-H-8083-25C** (PHAK) chapters by name, the **AIM** and **14 CFR** sections. Element codes (`PA.I.C.K1`…) are added only after an instructor maps each item. Area I tasks A–H were checked in `pilot.md`. VI Navigation (A Pilotage and Dead Reckoning, B Navigation Systems and Radar Services, C Diversion, D Lost Procedures) and III Airport Operations come from an ACS outline whose edition was not stated, so the instructor re-checks them against the 6C text.

| Knowledge area | Topic id | Key skills (ids) | ACS task | Primary source |
|---|---|---|---|---|
| Aerodynamics | `pilot.aero` | `aero.aoa` (exists), `aero.load-factor` (bank vs load factor, stall speed rises), `aero.stability` | PA.I.F | PHAK *Principles of Flight*, *Aerodynamics of Flight* |
| Systems & instruments | `pilot.sys` | `sys.engine` (mixture, carb heat, ignition), `sys.pitot-static` (blockage effects), `sys.gyro` | PA.I.G | PHAK *Aircraft Systems*, *Flight Instruments* |
| Weather | `pilot.wx` | `wx.metar` (exists), `wx.taf`, `wx.category` (VFR/MVFR/IFR/LIFR), `wx.hazards` (icing, thunderstorms, fog) | PA.I.C | PHAK *Weather Theory*, *Aviation Weather Services*; FAA-H-8083-28 *Aviation Weather Handbook* |
| Airspace & charts | `pilot.airspace` · `pilot.chart` | `chart.sectional` (exists), `airspace.classes` (dimensions, entry requirements), `reg.vfr-mins` (exists), `airspace.special-use` | PA.I.D, PA.I.E | PHAK *Airspace*; AIM ch. 3; FAA *Aeronautical Chart Users' Guide*; 14 CFR 91.155 |
| Navigation | `pilot.nav` | `nav.tsd` (exists), `nav.wind-triangle` (WCA, groundspeed), `nav.true-mag` (variation, deviation), `nav.fuel` | PA.I.D, PA.VI.A | PHAK *Navigation* |
| Regulations | `pilot.reg` | `reg.preflight` (91.103), `reg.currency` (61.56 flight review, 61.57 recency), `reg.privileges` (61.113), `reg.medical` (61.23), `reg.equipment` (91.205), `reg.alcohol` (91.17) | PA.I.A, PA.I.B | 14 CFR Parts 61 and 91 (eCFR, current text) |
| Performance & W&B | `pilot.perf` | `perf.wb` (exists), `perf.density-alt` (exists) | PA.I.F | PHAK *Weight and Balance*, *Aircraft Performance* |
| Aeromedical | `pilot.med` | `med.hypoxia`, `med.disorientation` (spatial disorientation, illusions), `med.fitness` (IMSAFE, alcohol, medication) | PA.I.H | PHAK *Aeromedical Factors*; AIM ch. 8 |
| ADM | `pilot.adm` | `adm.risk` (exists: PAVE, IMSAFE, DECIDE), `adm.attitudes` (hazardous attitudes and antidotes), `adm.minimums` (personal minimums) | PA.I.H + risk-management elements | PHAK *Aeronautical Decision-Making* |

### 2.3 Other libraries (brief)

| Library | Band-T topics | Aligned with |
|---|---|---|
| Maths (`math`) | Algebra I: linear equations and inequalities, systems, exponents, quadratics (factor, complete the square, formula). Algebra II: polynomials, rational and exponential functions, logarithms. **Functions**: domain/range, rate of change, transformations, linear vs exponential models. **Geometry proofs**: congruence and similarity proofs as ordered reasons, coordinate proofs. **Statistics**: distributions, spread, correlation ≠ causation, sampling and bias, two-way tables, basic probability | CCSS HS: A-SSE, A-CED, A-REI, F-IF, F-BF, F-LE, G-CO.C (9–11), G-SRT, S-ID, S-IC, S-CP; MP1–MP8 |
| English (`ela`) | **Argument and rhetoric**: claim/counterclaim, evidence quality, ethos/pathos/logos, fallacies, rhetorical choices in speeches. **Research skills**: question formation, lateral reading, source credibility, quoting vs paraphrasing, citation, avoiding plagiarism (including AI-generated text policies) | CCSS ELA 9–10: RI.9-10.6, RI.9-10.8, W.9-10.1, W.9-10.7, W.9-10.8, SL.9-10.3 |
| Money (`money`) | **Credit**: scores (concept), APR, card minimums. **Loans**: amortisation, student and auto loan concepts, total cost. **Taxes**: gross vs net, withholding, W-4/W-2 concepts, progressive brackets (marginal vs average). **Investing basics**: risk/return, diversification, index vs single stock (concepts, no products), fees. **Compound interest**, APY | NSPFE 2021 grade-12 benchmarks: Earning Income, Saving, Investing, Managing Credit, Managing Risk; CCSS F-LE.A.2, A-SSE.B.3c |
| Cyber (`cyber`) | **Account security**: password managers, MFA types, recovery codes, passkeys (concept). **Threat modelling**: assets, threats, likelihood/impact, layered defences for *your own* accounts. **Privacy law basics**: what COPPA, GDPR and state privacy laws give people (rights, not legal advice). Social engineering and sextortion awareness (child-safety specialist gate), data brokers | CISA Secure Our World; FTC; CSTA 3A-NI-05…08, 3B-NI-04, 3A-IC-29, 3A-IC-30 |
| Science (`sci`) | Newton's laws quantitatively (F = ma), momentum, energy conservation, waves and the EM spectrum, chemical reactions and conservation of mass, cells to systems, genetics basics, Earth systems and climate data | NGSS HS-PS2-1, HS-PS3-1, HS-PS4-1, HS-PS1-7, HS-LS1-1, HS-LS3-1, HS-ESS2-4 |
| Engineering (`engr`) | Design under constraints with trade-off matrices, tension/compression in trusses, Ohm's law and circuits, gear ratios, failure analysis, systems decomposition | NGSS HS-ETS1-1…4 |
| Geography (`geo`) | Population pyramids, migration, urbanisation, trade networks, resources and hazards, map projections and GIS-style layers, reading choropleths critically | National Geography Standards 1, 9, 11, 12, 14–18 |

---

## 3. Code execution for CS

### 3.1 Constraints
1. **$0 to run.** Everything executes on the learner's device. Runtimes are static assets on Cloudflare Workers Static Assets: 25 MiB maximum per file, and 20,000 files per version on the free plan.
2. **No network from learner code.** No `fetch`, sockets or package installs, and no access to our origin's cookies or storage.
3. **No external CDN** (CLAUDE.md), so the runtimes are self-hosted.
4. **Never blocks gameplay.** If a runtime is still loading, or fails on an old device, the item falls back to a non-executing variant (§3.6).
5. **Offline after first load** where possible: the runtime is cached with the Cache API.
6. **Infinite loops cannot freeze the page.**
7. **Real language behaviour.** Teens should see real Python errors and tracebacks, because transfer to real tools is the point.

### 3.2 Options compared (facts verified 2026-11-22; sizes change, re-check before adopting)

| Option | Licence | Size / load | Fidelity | Isolation | Verdict |
|---|---|---|---|---|---|
| **Pyodide** (CPython compiled to WebAssembly) | MPL-2.0 | Version 314.0.7 (Python 3.14.2): core ≈13.5 MB raw, ≈6.2 MB brotli (third-party measurement). Estimated first load 2–4 s on desktop broadband and 7–10 s on a mid-range phone over 4G (estimates, not measurements). Cached loads are much faster. | Real CPython 3.14, real tracebacks, full stdlib | Good inside a dedicated Worker after hardening (§3.4): no DOM; the network has to be blocked explicitly | **Choose for Python.** Load lazily, only on write/run levels. |
| **Skulpt** (Python interpreted in JS) | MIT or PSF-2.0 (runtime) | Small (JS only; not measured here) | The README calls it an implementation of Python 2.x, with Python 3 behind a flag. The site says master builds against the Python 3.7.3 grammar with "lots of things to implement". | Runs in our JS realm and needs its own sandboxing | Reject: incomplete Python 3 teaches wrong behaviour |
| **Brython** (Python → JS transpiler) | BSD-3-Clause | npm package 8.5 MB unpacked (v3.13.1; PyPI already lists 3.14.x) | Tracks the CPython version number, but semantics and errors come from a JS translation | Designed for DOM scripting on the main thread; locking it down is hard | Reject for exercises; its DOM-first design runs against our isolation goals |
| **JS in a plain Worker** | n/a | 0 KB | Real V8/SpiderMonkey | Same-origin: learner code can reach `fetch` and our `/api` unless every network global is removed, which is fragile | Reject as the only barrier |
| **QuickJS → WebAssembly** (quickjs-emscripten) | Not confirmed from the pages fetched; licence must be checked in the repo LICENSE before adoption | Release sync variant ≈640 KB; minimal install ≈1.3 MB | Modern ES, but not the browser engine, so error text differs | Real isolate: "by default, no host functionality is exposed"; interrupt handler and memory/stack limits. The project says it "has not been audited". | **Choose for JS logic** |
| **Sandboxed `srcdoc` iframe** | n/a | 0 KB | Real browser DOM/CSS | `sandbox="allow-scripts"` without `allow-same-origin` gives an opaque origin (no cookies or storage); CSP `default-src 'none'` blocks the network; scripts share the main thread, so loops need guarding | **Choose for HTML/CSS/DOM** |
| **Block-to-text bridge** (blocks beside text) | n/a | — | — | — | Use as a *teaching* device, not a runtime: Parsons items and a side-by-side "blocks ↔ Python" view in Python Workbench L0–L1 connect Game Maker Garage (band D) to text. No Blockly dependency in v1. |

### 3.3 Recommendation
A runtime layer `src/runtime/` (game-engineer owns it; it is not engine logic) with one async interface:
```ts
run(lang: "python" | "js" | "dom", source: string, tests: TestCase[], limits: { wallMs: number; outputChars: number })
  → Promise<{ results: { id: string; pass: boolean; got?: string; error?: string }[]; status: "ok" | "timeout" | "unavailable" }>
```
- **Python:** a Pyodide worker. The wasm, stdlib zip and loader ship as same-origin static assets, each under 25 MiB. **No packages and no micropip**; only the stdlib.
- **JS:** a QuickJS worker (≈640 KB, loaded on JS levels).
- **DOM:** a sandboxed iframe plus a checker script that posts `results` back with `postMessage` (structured data only).
- A **mock runner** for unit tests and e2e (deterministic, no wasm), so CI stays fast.

### 3.4 Sandbox hardening (security-privacy-reviewer must review)
- **Pyodide worker:**
  - Load the runtime first, then delete `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `Worker`, `indexedDB` and `caches` from the worker global scope.
  - Block the `js` and `pyodide.ffi` modules for learner code (`sys.modules["js"] = None`, and remove the ffi import hooks) so Python can't reach JS globals.
  - Serve the worker script with CSP `default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'` (same-origin only, needed for the runtime files).
  - Monkey-patch `input()` to read the test case's stdin.
- **Time limit:** wall clock 3 s per test batch, then the host **terminates the worker** and respawns it from cache. The learner sees "Your program ran for more than 3 seconds. Check your loop's stopping condition." It is a program limit, never a learner timer. Output is capped at 10,000 characters.
- **QuickJS:** `setInterruptHandler` deadline 1 s, `setMemoryLimit` 32 MB, `setMaxStackSize`. Only a `console.log` shim and the test harness are exposed.
- **DOM iframe:** `sandbox="allow-scripts"` with no other tokens. The CSP meta is `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:`. Learner JS is passed through a **loop-guard transform** before injection: a small parser inserts an iteration counter into every loop that throws after 100,000 iterations. The parser is a dependency choice for game-engineer (e.g. acorn; verify its size and licence). Scripts are enabled only on `cs.js.events` levels.
- Escape tests in CI: learner programs that try `fetch`, `import js`, `open('/etc/passwd')`, `while True` or a 1 GB list must each fail safely.

### 3.5 How exercises are auto-checked (mapped to engine answer kinds)

| Item mode | What the learner does | Answer kind | Needs runtime? | Check |
|---|---|---|---|---|
| **Predict** | read code, pick its output | `choice` | No | Outputs are precomputed at build time and **golden-tested** in real CPython/Node (§3.7) |
| **Parsons** | order lines (and indentation) from a set that includes 1–2 distractor lines | `sequence` | No | Exact order, with interchangeable identical lines; or by simulation for order-free pairs |
| **Fix-token** | pick the token or line that fixes a bug | `choice` | No | Golden-tested |
| **Trace** | fill a variable table across iterations | `match` (row → value) or `number` | No | Precomputed |
| **Write / Fix-and-run** | edit code in the CodeBoard, press Run tests | **`set`**: `options` = test cases, `correct` = every test id | Yes | The board runs the hidden tests in the runtime and submits the ids that passed. All passing = correct. `check.parts` marks passing tests; the board lists the failing ones (input, expected, got). |
| **DOM build** | edit HTML/CSS/JS; run the checker | **`set`** of DOM rules (e.g. `h1-first`, `img-alt`, `label-for`, `contrast-4.5`) | DOM iframe | Rule checker inside the iframe |

Notes:
- **Why `set`:** `validateAnswer` stays pure and synchronous. Only the board does async work, and the engine receives a deterministic value. Hint stage 2 (`model`) is shown by the board as a **worked solution** taken from the item bank (keyed by exercise id; `params` are numbers only). The learner steps through it line by line and then presses Run (errorless).
- **Write items are authored banks** (E6) with parametrised test values. They need ≥12 items per write level so a struggling learner's round never repeats. Each item has 3–6 visible tests and 2–4 hidden ones, the hidden ones testing the same behaviour (no gotchas).
- **Any correct program passes.** There is no style policing in checking; style tips are optional notes.

### 3.6 Fallback when the runtime is unavailable
While Pyodide loads (prefetched when the world opens, during Predict/Parsons items), and on devices where it fails, a write item renders its **Parsons twin**: the same task, assembled from lines. The result is recorded against that level's Parsons skill evidence, not the write evidence, so mastery stays honest. Status is shown quietly ("Python is getting ready; this one uses line cards").

### 3.7 Content verification (game-engineer, CI)
Every Predict, Fix-token or Trace template × 50 seeds × all levels is executed in **real CPython** (`python3` is already a dev dependency for `gen_sfx.py`) and in Node for JS. The test asserts that the precomputed answer equals the real output. A mismatch fails CI. This prevents the classic error of the answer key disagreeing with the language.

---

## 4. First 6 worlds

Order = build priority. Worlds 2 and 5 need no runtime, so they can start in parallel with the runtime work (ET-3).
All worlds use: `roundLength` 8, or **6** for Python Workbench and Web Workshop (write items take minutes; this is a per-game setting); `stepUpAfter` 2; `stepDownAtAttempts` 3; R0 level-up at ≥50% first-try.
Ages `[14, 18]` require ET-1 (registry age cap). Level numbers are 0-based (L0 = "Level 1" on screen).

### 4.1 World T1: **Python Workbench** (`python-workbench`, prefix `pw.`)
- **Mentor:** Toggle (mentor mark). Context: "The island's weather station logs data; Toggle needs small Python tools to process it." It reuses the METAR world's data for cross-library flavour; all data is fictional.
- **Board:** custom `CodeBoard`, two panes ≥900 px, stacked below that:
  - **Left:** prompt, examples, and a test panel (each test a row: input → expected; after a run, pass/fail with got).
  - **Right:** editor (plain `<textarea>` with monospace, line numbers, Tab = 4 spaces, **Esc releases focus** so Tab moves on: no keyboard trap), a Run tests button, and an output console (`aria-live="polite"`).
  - **Touch:** a token strip (`:` `(` `)` `[` `]` `"` `=` `==` indent, dedent).
  - The predict, Parsons and trace modes use `OptionBoard`/`SequenceBoard`, styled for the Lab.
- **Skills → levels:**

| L | Skill (Lm) | Mode mix per round | Content |
|---|---|---|---|
| 0 | `cs.py.values` | predict, Parsons (blocks ↔ text view) | `print`, strings, `+`, `str()`; tutorial item |
| 1 | `cs.py.values` (Lm 1) | predict, fix-token | variables, reassignment, int/float/str, `TypeError` on `"3" + 4` |
| 2 | `cs.py.cond` (Lm 3) | predict, Parsons | `if/elif/else`, comparisons, `and/or` |
| 3 | `cs.py.cond` | write (2), predict | write `category(temp)` with thresholds; boundary tests |
| 4 | `cs.py.loops` (Lm 5) | trace, predict | `for i in range(a, b, s)`; accumulators; off-by-one distractors |
| 5 | `cs.py.loops` | write, fix-and-run | `while` with a stopping condition; sum/count/max |
| 6 | `cs.py.lists` (Lm 6) | predict, write | indexing incl. negative, slicing, `append`, iterate |
| 7 | `cs.py.functions` (Lm 7) | Parsons, write | parameters, `return` vs `print` (distractor), calling from tests |
| 8 | `cs.py.dicts` (Lm 8) | write | count words / tally readings into a dict; `.split()`, `.lower()` |
| 9 | `cs.py.test` (Lm 9) | fix-and-run, choose-a-test | a function fails 1 of 5 tests: locate and fix; then pick the test input that would have caught a second bug |

- **Generator rules:**
  - Predict, Parsons, fix-token and trace are **template generators**. Each template is a TS function with seeded slots: integers 0–20, step ±1/2/3, list lengths 3–6, and variable names from a safe word list (`temp`, `count`, `total`, `reading`, `wind`…).
  - Each template returns code text, the precomputed answer and distractors from named misconceptions:
    - range off-by-one: includes the stop value, or misses the first value;
    - `=`/`==`;
    - `print` vs `return` (`None` printed);
    - string concatenation vs addition;
    - integer vs float division (`7 / 2` = 3.5 vs `7 // 2` = 3);
    - first index 1.
  - Constraints: outputs ≤6 lines; no randomness or time in programs; distractors never equal the answer; ≤2 items from the same template in a row; golden test (§3.7) over levels × 50 seeds.
  - Write items are an authored bank of ≥12 per write level, with test values drawn by seed.
- **Hint ladder:**
  - **Miss 1:** failing tests are highlighted. A strategy note is matched to a diagnosed error class: `IndentationError` → "Python uses indentation to group lines…"; off-by-one → "range(1, 5) stops before 5…"; `None` in output → "print shows a value; return hands it back…". Predict items grey out the chosen distractor and show the misconception note.
  - **Miss 2:** worked solution, revealed line by line with a one-line comment per line. The learner presses Run (errorless). Predict items show a step-by-step **variable trace table**, then the answer.
  - A voluntary "Hint" button (ET-5) shows the miss-1 note early and records the item as `assisted`.
- **Accessibility:**
  - The editor is a native textarea, so screen readers work. Run results are announced ("3 of 4 tests pass. Failing: input 0, expected 'calm', got 'breezy'").
  - Parsons uses tap-to-place plus keyboard reorder (Alt+↑/↓). Indentation uses ← → buttons with `aria-label` "Indent line 3".
  - Everything is playable without a keyboard on touch (token strip) and on phones in portrait.
  - Text is scalable to 200%, and code wraps visually without changing indentation semantics.
- **Reward:** skill mark "Workbench: Python I".

### 4.2 World T2: **METAR & TAF Desk** (`metar-desk`, prefix `md.`)
- **Mentor:** Zephy (mentor mark). Context: a planning desk for a fictional Saturday trip, with a go/no-go at the end of each round.
- **Board:** custom `MetarBoard`.
  - A raw report in monospace at the top, each group a focusable `<button>`.
  - Decode tiles below. `match` items: tap a group, then a tile (or keyboard: Enter on a group, arrows to a tile, Enter).
  - Number items use a numeric pad; choice items are cards.
  - A "Decoded so far" side panel builds the plain-language briefing as groups are solved.
- **Stations:** fictional 4-letter ids using a prefix **not allocated to any ICAO region**. Candidates are checked against ICAO Doc 7910 before release; reviewer task. Each report is labelled "Fictional training report".
- **Skills:** `pilot.wx.metar` (L0–L6, Lm 5), `pilot.wx.category` (L7, Lm 7), `pilot.wx.taf` (L8, Lm 8), `pilot.adm.minimums` (L9, Lm 9).

| L | Item | Answer kind | Distractor / misconception |
|---|---|---|---|
| 0 | station + `DDHHMMZ` time → "day 14, 09:53 UTC" | match | time is local; `Z` ignored |
| 1 | wind `dddffKT` → direction **from** (degrees true), speed (kt) | match / number | wind "toward"; magnetic vs true (METAR is true) |
| 2 | gusts `G`, variable `VRB` and `dddVddd`, calm `00000KT` | match | gust read as average speed |
| 3 | visibility in SM, incl. fractions `1 1/2SM`, `P6SM`, `M1/4SM` | match | km; `P6SM` = exactly 6 |
| 4 | weather groups: intensity `-`/`+`, `VC`, `RA SN BR FG TS SH` | match | `BR` = rain; `+` = "light" |
| 5 | sky: `FEW SCT BKN OVC VV`, heights ×100 ft AGL; **ceiling** = lowest BKN/OVC/VV | number (ft AGL) | lowest layer of any kind = ceiling; MSL |
| 6 | temp/dewpoint `M02/M05`, spread; altimeter `A2992` → 29.92 inHg | number / match | `M` ignored; spread ≤ 3 °C noted as fog/low-cloud risk (hint text) |
| 7 | flight category from ceiling + visibility | choice VFR/MVFR/IFR/LIFR | uses visibility only; boundary values (exactly 3,000 ft / 5 SM) appear in ≥25% of items |
| 8 | TAF: `FM`, `TEMPO`, `PROB30/40`, `BECMG`; "what is forecast at 1500Z?" | choice / match | TEMPO read as prevailing; FM vs BECMG |
| 9 | go/no-go vs stated personal minimums (e.g. ceiling ≥3,000, vis ≥5, crosswind ≤10) across METAR + TAF window | choice (go / no-go / delay) + set (which factors) | "the TAF improves later, so go now"; ignoring gusts |

- **Generator:** solution-first.
  1. Draw a consistent **weather state**: wind 0–35 kt with gusts ≥ wind + 5; visibility from {¼ … 10}; layers sorted ascending with heights in hundreds of feet; temp −20…35 °C, dewpoint ≤ temp; altimeter 29.50–30.50.
  2. **Encode** it with one deterministic encoder that follows the AIM/Aviation Weather Handbook format.
  3. The answers come from the state, not from parsing.

  Consistency rules: `BR` only when visibility is 5/8–6 SM and the spread ≤ 3 °C; `FG` when visibility is < 5/8 SM; `TS` implies a CB layer; `SN` only at temp ≤ 2 °C; `VV` (indefinite ceiling) only with visibility ≤ 1 SM. The last two are generator simplifications, not reporting rules, and the instructor confirms them.

  Category rules, encoded as data and reviewed by an instructor:
  - **LIFR:** ceiling < 500 ft and/or visibility < 1 SM
  - **IFR:** ceiling 500 to < 1,000 ft and/or visibility 1 to < 3 SM
  - **MVFR:** ceiling 1,000–3,000 ft and/or visibility 3–5 SM
  - **VFR:** ceiling > 3,000 ft and visibility > 5 SM

  Constraints over levels × 50 seeds: a round contains ≥2 categories; items are never identical; units are always present.
- **Hint ladder:** miss 1: a format card for that group type ("Wind: 3 digits = direction FROM, true; 2–3 digits = knots"), and the wrong tile greys out. Miss 2: the group is decoded character by character with arrows, then the learner places the tile.
- **Accessibility:** groups are read with spelled-out characters on demand ("two seven zero one zero K T"). Tiles are buttons, and there is no drag-only path. Colour never encodes the category (it is a text label and an icon).
- **Reward:** skill mark "Briefing: Weather I".

### 4.3 World T3: **Web Workshop** (`web-workshop`, prefix `ww.`)
- **Mentor:** Toggle. Context: the island bakery needs an accessible website before opening day; each round builds one page section.
- **Board:** custom `WebBoard` with three tabs (HTML, CSS, JS from L8), a live **preview** in the sandboxed iframe, and a rule checklist. Narrow screens get tabs plus a preview toggle. Structure levels also offer a **tag palette** (tap to insert a snippet) so phone users aren't forced to type angle brackets.
- **Skills:** `cs.web.html` (L0–L3, Lm 3), `cs.web.css` (L4–L7, Lm 6), `cs.js.events` (L8–L9, Lm 9).

| L | Task | Answer kind | Checker / distractors |
|---|---|---|---|
| 0 | order page skeleton tags (`header`, `main`, `h1`, `p`, `footer`) | sequence | Parsons with a `div` distractor |
| 1 | heading levels in order (no skipping h2 → h4) | sequence / choice | "pick headings by size" |
| 2 | lists, links with meaningful text | DOM `set` | rules `ul-li`, `link-text-not-click-here` |
| 3 | images with `alt`; decorative `alt=""` | DOM `set` / choice | `alt` that repeats "image of" |
| 4 | selectors: type, class, id, descendant | choice (which elements turn blue?) | specificity order |
| 5 | box model: rendered width with padding/border; `box-sizing` | number (px) | forgets border; counts margin |
| 6 | colour contrast: pick a text colour meeting 4.5:1 | choice | relies on hue; 3:1 (large-text threshold) |
| 7 | flex layout: match the target layout | DOM `set` | rules on computed positions (`justify`, `gap`, `wrap`) |
| 8 | click handler toggles a menu (`addEventListener`) | DOM `set` | `f()` passed instead of `f`; wrong element selected |
| 9 | fix an inaccessible order form (labels, button type, focus order) | DOM `set` | placeholder as label; `div` as button |

- **Generator:** structure and CSS items come from templates (seeded content from a fictional bakery word list; colours from a palette with precomputed WCAG ratios; box sizes 100–400 px in steps of 10). The contrast maths is the WCAG 2.x relative-luminance formula, unit-tested against known pairs. DOM tasks come from an authored bank of ≥12 per level, each with starter code and 3–6 rules.
- **Hint ladder:** miss 1: failing rules highlighted, with an explanation note and the relevant element outlined in the preview. Miss 2: a diff view of the model fix, applied line by line by the learner (errorless), then re-check.
- **Accessibility:** the preview also has a "structure view" (outline of landmarks and headings as text). Rule results are announced. All editing works by keyboard. Contrast items show numeric ratios and never rely on colour perception alone.
- **Reward:** "Workbench: Web I".

### 4.4 World T4: **Chart Room: Airspace & Sectionals** (`chart-room`, prefix `cr.`)
- **Mentor:** Zephy. Context: plan a fictional VFR trip across an original sectional-style chart of a fictional region, watermarked **"FICTIONAL — NOT FOR NAVIGATION"**.
- **Board:** custom `ChartBoard`:
  - an SVG chart with pan/zoom (buttons + keyboard; pinch optional) and a feature list (every symbol is a focusable button with a text description);
  - a side-view **airspace profile** panel for altitude questions.
- **Art:** an original chart in sectional *conventions* (blue/magenta airport symbols, solid and dashed airspace boundaries, shaded vignettes, maximum elevation figures, airport data blocks), drawn from the FAA *Aeronautical Chart Users' Guide* conventions. It must not trace or copy any real chart. Size: L, creative-director plus a pilot reviewer.
- **Skills:** `pilot.chart.sectional` (L0–L3, Lm 2), `pilot.airspace.classes` (L4–L6, Lm 5), `pilot.reg.vfr-mins` (L7–L8, Lm 8), `pilot.airspace.special-use` (L9).

| L | Item | Answer kind | Misconception targeted |
|---|---|---|---|
| 0 | airport symbol: towered (blue) vs non-towered (magenta), hard-surfaced vs other | choice | colour = size |
| 1 | airport data block: elevation, CTAF/tower frequency, runway length, lighting | match | elevation read as pattern altitude |
| 2 | maximum elevation figure (thousands + hundreds, MSL) in a quadrant | number (ft MSL) | AGL; reads one digit only |
| 3 | AGL ↔ MSL: aircraft altitude − terrain elevation | number | adds instead of subtracts |
| 4 | identify the airspace class at a point and altitude (B, C, D, E, G) from boundary styles and floor/ceiling labels (hundreds of feet MSL) | choice | dashed blue vs dashed magenta; floor/ceiling order |
| 5 | entry requirements: B (clearance), C (two-way radio communication), D (two-way radio communication), E/G (none for VFR) | match | "talk to tower" = clearance |
| 6 | Class E floor: surface (dashed magenta boundary), 700 ft AGL (magenta vignette) or 1,200 ft AGL (blue vignette) | choice | everything uncontrolled below 1,200 ft |
| 7 | VFR visibility and cloud clearance by class and altitude (14 CFR 91.155 table) | match / choice | the same minimums everywhere |
| 8 | given a METAR (from T2) and a planned altitude, are VFR minimums met? | choice + set (failing factor) | ignoring cloud clearance |
| 9 | special-use airspace: prohibited, restricted, MOA, alert, TFR (concept: check NOTAMs) | choice | MOA = no-fly |

- **Generator:** the chart is fixed art with a **feature table** (id, type, position, attributes). Items are drawn from the table by level using seeded selection (E6 bank + selector) with question templates. The profile panel generates altitude/terrain pairs (terrain 0–4,000 ft, altitudes in 500 ft steps), constrained so the airspace answer is never ambiguous at a boundary. Constraint: ≥2 classes per round.
- **Hint ladder:** miss 1: a legend card for that symbol type, with the relevant chart region outlined. Miss 2: the answer is shown on the profile panel with each layer labelled; the learner taps it.
- **Accessibility:** the full feature list doubles as a text alternative to the chart. Altitude questions always show the side-view profile as an SVG with text labels and a data table. Colour-coded symbols also carry a pattern/label legend.
- **Instructor gate:** every item, plus the chart art, is reviewed by a CFI/AGI before release.

### 4.5 World T5: **Interest & Loans Desk** (`interest-desk`, prefix `id.`)
- **Mentor:** Budge (mentor mark). Context: the learner advises fictional islanders on a savings account, a first car loan and a credit card offer. Lenders are fictional; there are no brands or products. Every model shows **"Simplified model: real accounts and loans have more terms, fees and rules."**
- **Board:** custom `LedgerBoard`:
  - a scenario card;
  - a growing **year-by-year or month-by-month table**, where the learner fills the highlighted cell;
  - a calculator strip (+ − × ÷ ^ and parentheses). The calculator is allowed; the skill is setting up the calculation.
  - a chart with a data table alternative.
- **Money is integer cents.** Rounding: half-up to the cent **at each period**, stated in the item. Tolerance: `numeric` ±1¢ for single steps, ±$1 for multi-year totals, as stated per level.
- **Skills:** `money.save.simple-interest` (L0–L1, review), `money.save.compound` (L2–L5, Lm 4), `money.credit.borrow` (L6–L8, Lm 7), `money.credit.compare` (new: compare total cost of credit offers; L9, Lm 9).

| L | Item | Formula / rule | Answer | Misconception |
|---|---|---|---|---|
| 0 | percent of an amount | P × r | numeric ±1¢ | 5% = 0.5 |
| 1 | simple interest over t years | I = P·r·t | numeric | compounds by mistake |
| 2 | compound, annual, fill year 2 and 3 rows | Bₙ = Bₙ₋₁(1 + r) | numeric ±1¢ | adds the same interest each year |
| 3 | compound with n periods/year | A = P(1 + r/n)^(nt) | numeric ±$1 | uses r instead of r/n |
| 4 | APR vs APY: which account pays more? | APY = (1 + APR/n)^n − 1 | choice | higher APR always wins (different n) |
| 5 | start early vs late (same deposits, different years) | table / formula | choice + numeric | starting age doesn't matter |
| 6 | first-month interest on a loan | B × APR/12 | numeric ±1¢ | uses annual rate monthly |
| 7 | amortised payment and total interest: 3-year vs 5-year term | M = P·i / (1 − (1 + i)^−N), i = APR/12 | choice (lower total cost) + numeric | lower payment = cheaper |
| 8 | credit card: fixed minimum payment, months to pay off and total paid (simplified schedule) | iterate: B ← B(1 + i) − pay | numeric (months exact; total ±$1) | minimum payment pays off fast |
| 9 | compare two offers incl. an up-front fee; spot the predatory one (very high APR, fees) | total cost | choice + set (reasons) | "no payments for 6 months" = free |

- **Generator constraints:**
  - Principals of $100–$20,000 in round steps.
  - Rates from a fixed list (1%–29.99% APR for credit; 0.5%–5% for savings).
  - Terms of 12–72 months.
  - Payoff ≤ 120 months, and the minimum payment always exceeds the first month's interest (no infinite schedules).
  - Answers are computed with integer-cent iteration in TS and **cross-checked** in unit tests against the standard closed forms (investor.gov compound-interest formula; the amortisation formula) within the stated tolerance.
  - L7/L9 never generate ties. The cheaper option is the one with the higher payment in ≥50% of items, which tests the misconception.
- **Hint ladder:** miss 1: the formula card with variables labelled from the scenario ("P = $2,000, i = 0.06/12"), and `direction` too high/too low. Miss 2: the table fills step by step to the answer; the learner enters it.
- **Accessibility:** tables are real `<table>`s, and the chart has a data table. The calculator is keyboard-operable. Amounts are read as currency ("two thousand dollars").
- **Financial-educator gate** (credit, APR, minimum payments).

### 4.6 World T6: **Graph Lab: Linear & Exponential** (`graph-lab`, prefix `gl.`)
- **Mentor:** Bobbo (mentor mark, toned-down "older" styling, approved by creative-director). Context: modelling real-shaped fictional data: a phone battery draining, a savings balance (links to T5), a plant's growth.
- **Board:** custom `GraphBoard`: a coordinate plane with a snap grid, and a draggable point/line **plus steppers** (x/y buttons, arrow keys) so dragging is never required. Next to it: a table of values and an equation display (exact rationals, e.g. `y = −3/4x + 6`).
- **Skills (new ids):** `math.func.rate` (L0–L2, Lm 2), `math.func.linear-forms` (L3–L5, Lm 4), `math.func.exp-vs-lin` (L6–L7, Lm 7), `math.func.model` (L8–L9, Lm 9).
- **Alignment:** 8.F.A.3, 8.F.B.4, F-IF.B.4, F-IF.B.6, F-IF.C.7a, F-LE.A.1, F-LE.A.2, A-REI.C.6 and A-REI.D.11 (re-check at validation).

| L | Item | Answer kind | Distractor / misconception |
|---|---|---|---|
| 0 | read a point / complete a table from a rule | number | swaps x and y |
| 1 | rate of change from a table (constant differences) | number (exact fraction) | Δx/Δy |
| 2 | slope from two points, incl. negative | number (fraction) | sign error; run/rise |
| 3 | match equation ↔ graph (4 of each) | match | intercept read as slope |
| 4 | plot a line from y = mx + b (place 2 points) | set (grid point ids) | moves m up then 1 right |
| 5 | interpret slope and intercept in context | choice | intercept = "rate" |
| 6 | linear or exponential? from a table (differences vs ratios) | choice | "it grows, so it's exponential" |
| 7 | exponential rule y = a·bˣ from a table: find b, then a | number | b = difference |
| 8 | solve a system by intersection | set (the intersection grid point) | picks a y-intercept |
| 9 | pick the model for a context and its parameters (savings at r% → exponential with b = 1 + r) | choice + number | linear model for compound growth |

- **Generator:** integer intercepts −10…10. Slopes come from {±1/4, ±1/3, ±1/2, ±2/3, ±1, ±3/2, ±2, ±3}, chosen so that ≥2 lattice points fall on the visible grid. Exponential b comes from {1/2, 2, 3, 1.1, 1.5} with a from 1…10. Values are exact rationals (no floats in validation). System intersections are lattice points only. Constraints: no repeated equation in a round; L6 tables include both families in equal measure; L3 graph sets contain one slope-sign confusion and one intercept confusion.
- **Hint ladder:** miss 1: a rise/run staircase drawn on the learner's line (or differences/ratios column added to the table). Miss 2: the line is drawn from the intercept step by step; the learner confirms the points.
- **Accessibility:** the graph has a text description and a point table. Steppers announce coordinates ("Point A at x 2, y 5"). Lines differ by dash pattern as well as colour.

---

## 5. Expert review per library (gates before release)

| Library | Reviewer | Reviews | Gate? |
|---|---|---|---|
| CS | Secondary CS teacher with Python/JS classroom experience (AP CSP or similar) | Skill sequence, misconception notes, every authored write item and its tests, AI-fundamentals wording | Yes for AI topics; light for the rest |
| CS runtime | security-privacy-reviewer (internal) + an external web-security reviewer before public launch | §3.4 sandbox, escape tests, CSP | **Yes** |
| Pilot | Current FAA-certificated flight or ground instructor (CFI/AGI/IGI) | Every item, the METAR encoder rules, flight-category table, chart art and feature table, 14 CFR citations against current eCFR, ACS element mapping | **Yes**, per world and yearly re-check |
| Maths | Secondary maths teacher | Generator ranges, notation (exact fractions, function notation), CCSS mapping | Light |
| English | Secondary ELA teacher; librarian for research skills | Rhetoric examples (balanced, non-partisan), source-credibility items | Yes for argument topics (sensitive content) |
| Money | Qualified financial educator (e.g. holding a recognised financial-education credential) | Formulas, "simplified" labels, credit/tax wording; no advice or product language | **Yes** |
| Cyber | Cybersecurity educator + child-safety specialist | Account-security accuracy (current CISA guidance), threat-modelling scope (defence only), sextortion/social-engineering wording | **Yes** |
| Science / Engineering | Secondary physics/chemistry teacher; engineering educator | Quantitative accuracy, simplifications labelled | Light |
| Geography | Geography teacher + cultural reviewers | Data sources and dates, non-stereotyped framing | Yes for culture/migration topics |
| All Lab | Teen user testing (with parental consent, via a research partner; no real child data in dev/tests) | Tone, not-babyish check, mobile typing load | Yes, before v1.0 |
| All Lab | Counsel + security-privacy-reviewer | §1.4 minor treatment (UK AADC, GDPR, state teen laws), parent-login gate | **Yes** |

---

## 6. Risks and v1 scope

| Risk | Impact | Mitigation |
|---|---|---|
| **Ground school is huge.** The ACS Area I alone has 8 knowledge tasks; PHAK, AIM, 14 CFR and weather add hundreds of facts. | Scope never ends; thin coverage looks like a complete course | v1 pilot = **weather (T2) + airspace/charts (T4)** only. Library page lists covered and *not* covered areas. Next: navigation/E6B ("Dead Reckoning Desk"), regulations, ADM briefing room, then aeromedical and systems |
| Pilot accuracy and currency (ACS revisions, 14 CFR changes, chart symbology updates) | Teaching wrong rules | CFI gate; edition table in `pilot.md`; yearly re-check task in DECISIONS; facts stored as data tables, not prose |
| Learners mistaking Lab content for certified training | Safety and trust | Disclaimer per world; never "prepares you to pass"; no FAA-style badges or wings |
| Pyodide size (≈6 MB compressed) on low-end phones | Slow first run; data cost | Lazy load only on write levels; prefetch during predict items; Cache API; Parsons-twin fallback; show the size in the grown-ups notes |
| Sandbox escape or same-origin access | Security incident | §3.4 hardening, CI escape tests, external review; QuickJS is unaudited, so it gets defence in depth (Worker + no host functions) |
| Pyodide versioning churn (now `314.x`, tracking CPython) | Upgrade breakage | Pin the version; golden tests run against the pinned runtime and CI CPython of the same minor version |
| Answer keys disagree with real language behaviour | Teaches errors | §3.7 golden tests in real CPython/Node |
| Teens find it babyish | Abandonment | Lab shell (§1.5); teen testing gate; mentor marks instead of mascots |
| Typing code on phones | Frustration | Token strip, tag palette, Parsons twin; promote tablet/desktop in grown-ups copy |
| Free-text code containing personal data | Privacy | Never synced or sent (§1.4); cleared with the profile |
| Parent gate too easy for teens | Unauthorised billing/settings changes | Parent sign-in for Lab settings (ET-9) |
| Registry/engine assume ages 3–14 | Lab worlds fail `checkRegistry()` | ET-1 before any Lab world merges |
| Money content read as financial advice | Trust/legal | "Simplified model" labels; no products or brands; educator gate |
| AI topic dates quickly | Stale content | Concept-level items; yearly review; no claims about specific products |
| Voice catalogue scale | Clip test failures, cost | Lab text is not voice lines; read-aloud via fallback chain (ET-7) |

**Recommended v1 scope.**
- **Lab v1.0:** Lab shell + runtime layer + **T1 Python Workbench, T2 METAR & TAF Desk, T3 Web Workshop, T5 Interest & Loans Desk**. That is two CS, one pilot and one money world, and it exercises every new platform piece (runtime, CodeBoard, DOM checker, Lab theme).
- **v1.1:** **T4 Chart Room** (chart art + instructor review) and **T6 Graph Lab**.
- **Later:** Dead Reckoning Desk (E6B wind triangle, true/magnetic), Algorithms Arena (search/sort step counting), AI Training Ground (train/test, bias), Rhetoric Room, Tax Basics, Account Security Lab.
- Rough size: shell M, runtime L, each world M–L (T4 L). Voice is small (≈10 pre-rendered lines per world).

---

## 7. Platform dependencies and decisions

| # | Work | Owner |
|---|---|---|
| ET-1 | Allow band T in the registry: ages up to 18 in `checkRegistry()`, `Library.ages` and U2 | game-engineer |
| ET-2 | Lab shell: `/lab` routes, theme tokens (dark/light), skill map, Lab settings, voice-off default | ux-designer + game-engineer |
| ET-3 | Runtime layer `src/runtime/` (Pyodide, QuickJS, DOM iframe, mock), Cache API, escape tests | game-engineer, reviewed by security-privacy-reviewer |
| ET-4 | `CodeBoard` and `WebBoard` (editor, token strip, test panel) submitting `set` answers | game-engineer |
| ET-5 | Voluntary hint event recorded as `assisted` | game-engineer (engine + unit tests) |
| ET-6 | Golden-test harness (CPython/Node) for template generators | game-engineer |
| ET-7 | Read-aloud for non-catalogue Lab text; Lab voice choice | audio-designer |
| ET-8 | Profile band T, Lab enablement and geometric avatar in the parent dashboard | ux-designer + cloudflare-engineer (no new personal data) |
| ET-9 | Parent sign-in (not the arithmetic gate) for Lab billing/settings | cloudflare-engineer + security-privacy-reviewer |

**Owner decisions needed:**
1. Approve **Lab mode gated by parent enablement** (§1.5).
2. Daily cap for Lab profiles: same K as kids, or K plus optional free practice?
3. `roundLength` 6 for code worlds.
4. Budget for a CFI/AGI, a financial educator, a CS teacher, an external web-security review, and teen user testing through a research partner.
5. v1.0 = T1, T2, T3, T5; v1.1 = T4, T6.
6. Adult learners: profiles under the account owner only (recommended) or separate adult accounts later.

## Sources checked for this document (2026-11-22)
- Pyodide licence (MPL-2.0): Pyodide "About" docs (readthedocs mirror). Pyodide releases page (versions 0.29.x → 314.x). Core size ≈13.5 MB raw / ≈6.2 MB brotli for 314.0.7, from a third-party measurement in a public GitHub issue (JamesMConroy/dungeon-dsl #3); phone load times there are estimates. Two official Pyodide pages (deployment docs, a size issue) could not be fetched this session; re-check sizes there before adoption.
- Skulpt: skulpt.org (MIT or PSF-2.0; Python 3.7.3 grammar on master, incomplete) and the GitHub README ("Python 2.x").
- Brython: npm package page (BSD-3-Clause, v3.13.1, 8.52 MB unpacked); PyPI lists 3.14.x.
- quickjs-emscripten: GitHub README (sizes, interrupt and memory limits, "not audited"). Licence not stated in the fetched text; check before adoption.
- Cloudflare Workers Static Assets limits: Cloudflare changelog 2025-09-02 (25 MiB per file; 20,000 files free / 100,000 paid). Static-asset request billing: check Cloudflare pricing docs.
- CSTA 2017 level 3A: CSTA progression chart (csteachers.org). Level 3B: Washington OSPI grade 11–12 CS standards (CSTA adoption). The CT-hosted CSTA PDF could not be fetched this session.
- AP CSP big ideas and practices: College Board AP Central course page.
- ACS Areas of Operation outline (edition not stated); Area I tasks were verified earlier in `pilot.md`.
