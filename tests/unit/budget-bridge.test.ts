import { describe, expect, it } from "vitest";
import { createRng } from "../../src/engine/rng";
import { buildRound } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { explainFor, hintLineFor, praiseFor } from "../../src/games/budget-bridge/coach";
import { bridgeTutorial, budgetBridge } from "../../src/games/budget-bridge/definition";
import { BB_MAX_LEVEL, LEVELS, VEHICLE_WORD, generateBudgetBridge, puzzleProblems, roundUp5 } from "../../src/games/budget-bridge/generator";
import {
  type Cell, type Design, type Puzzle, type Site, BRACE_FACTOR, CAPACITY, COST, LOAD, PIECES, RULES, addPiece, bruteForceCheapest, capacity,
  cheapest, cheapestAllSteel, cheapestFix, clearCell, costOf, decodePuzzle, diagnose, encodePuzzle, grade, missingPieces, modelStart,
  placePiece, plansWithin, segmentsOf, segmentWords, siteWords,
} from "../../src/games/budget-bridge/logic";
import { bridgeBetween, bridgeIntro, bridgeOutro } from "../../src/games/budget-bridge/story";
import voice from "../../src/games/budget-bridge/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = 50;

const W = (brace = false): Cell => ({ deck: "wood", pillar: false, brace });
const S = (brace = false): Cell => ({ deck: "steel", pillar: false, brace });
const P = (deck: "wood" | "steel" = "wood"): Cell => ({ deck, pillar: true, brace: false });
const E: Cell = { deck: null, pillar: false, brace: false };
const site = (over: Partial<Site> = {}): Site => ({ gap: 4, ground: [true, true, true, true], vehicle: "truck", budget: 200, pieces: [...PIECES], ...over });
const levelItems = (level: number, seeds = SEEDS) =>
  Array.from({ length: seeds }, (_, s) => generateBudgetBridge(level, createRng(1000 + s * 7 + level), s));

describe("the bridge model (documented in docs/worlds/budget-bridge.md §3)", () => {
  it("uses the spec's capacity table, braced = × 3, and the spec's loads", () => {
    expect(CAPACITY.wood).toEqual([0, 4, 2, 1]);
    expect(CAPACITY.steel).toEqual([0, 10, 6, 3, 2]);
    expect(BRACE_FACTOR).toBe(3);
    expect(capacity("wood", 2, true)).toBe(6);
    expect(capacity("wood", 4, false)).toBe(0); // longer than wood's max span
    expect(LOAD).toEqual({ scooter: 1, car: 2, van: 4, truck: 5, bus: 8 });
    expect(COST).toEqual({ wood: 10, steel: 25, pillar: 30, brace: 10 });
  });
  it("splits the deck into spans at pillars on ground; a pillar in deep water holds nothing up", () => {
    const s = site();
    expect(segmentsOf(s, [W(), P(), W(), W()]).map((x) => [x.start, x.end, x.span])).toEqual([[0, 0, 1], [2, 3, 2]]);
    const deep = site({ ground: [true, false, true, true] });
    expect(segmentsOf(deep, [W(), P(), W(), W()]).map((x) => x.span)).toEqual([4]);
  });
  it("a span is as strong as its weakest piece, and braced only if every cell has a triangle", () => {
    const s = site({ gap: 2, ground: [true, true], vehicle: "car" });
    const mixed = segmentsOf(s, [W(), S()])[0]!;
    expect(mixed.mat).toBe("wood");
    expect(mixed.capacity).toBe(2);
    const half = segmentsOf(s, [W(true), W()])[0]!;
    expect(half.braced).toBe(false);
    expect(half.partialBrace).toBe(true);
    expect(segmentsOf(s, [W(true), W(true)])[0]!.capacity).toBe(6);
  });
  it("the five rules: deck, span, load, ground, budget", () => {
    const s = site({ budget: 115 });
    expect(grade(s, [W(true), P(), W(true), W(true)]).pass).toBe(true); // braced wood with one pillar: $100
    const g1 = grade(s, [W(), E, W(), W()]);
    expect(g1.rules.deck).toBe(false);
    expect(g1.holes).toEqual([1]);
    expect(grade(s, [W(), W(), W(), W()]).rules.span).toBe(false); // wood can't span 4
    expect(grade(s, [W(), P(), W(), W()]).rules.load).toBe(false); // wood spans of 1 and 2 can't hold a truck
    expect(grade(site({ ground: [true, false, true, true] }), [W(true), P(), W(true), W(true)]).rules.ground).toBe(false);
    const steel = [S(), P("steel"), S(), S()];
    expect(grade(s, steel).rules.load).toBe(true);
    expect(grade(s, steel).rules.budget).toBe(false); // $130 > $115
    expect(costOf(steel)).toBe(130);
  });
  it("describes the site and each span in words", () => {
    expect(siteWords(site({ ground: [true, false, false, true], budget: 150 }))).toBe(
      "A river gap 4 cells wide. Deep water under gaps 2, 3; pillars only fit on solid ground. The truck weighs 5. Budget 150 dollars.",
    );
    const [seg] = segmentsOf(site(), [W(true), W(true), P(), W()]);
    expect(segmentWords(site(), seg!)).toBe("Gaps 1 to 2: braced wood, holds 6; the truck weighs 5. OK.");
  });
});

describe("the grader accepts ANY valid design, not just the solver's", () => {
  it("matches an independent brute-force check on every design of small sites, and accepts many designs", () => {
    const sites = [
      site({ gap: 3, ground: [true, false, true], vehicle: "car", budget: 120 }),
      site({ gap: 4, ground: [true, true, true, true], vehicle: "truck", budget: 140 }),
      site({ gap: 3, ground: [false, true, false], vehicle: "van", budget: 150 }),
    ];
    const cellsAll: Cell[] = [];
    for (const deck of [null, "wood", "steel"] as const) for (const pillar of [false, true]) for (const brace of [false, true]) cellsAll.push({ deck, pillar, brace });
    for (const s of sites) {
      let passing = 0;
      const shapes = new Set<string>();
      const rec = (d: Cell[]) => {
        if (d.length === s.gap) {
          // independent check, written from the rules in the spec (not reusing segmentsOf)
          let ok = d.every((c) => c.deck) && d.every((c, i) => !c.pillar || s.ground[i]) && costOf(d) <= s.budget;
          let run: Cell[] = [];
          const flush = () => {
            if (!run.length) return;
            const wood = run.some((c) => c.deck === "wood");
            const max = wood ? 3 : 4;
            const table = wood ? [0, 4, 2, 1] : [0, 10, 6, 3, 2];
            const cap = run.length > max ? 0 : table[run.length]! * (run.every((c) => c.brace) ? 3 : 1);
            if (cap < LOAD[s.vehicle]) ok = false;
            run = [];
          };
          d.forEach((c, i) => {
            if (c.pillar && s.ground[i]) flush();
            else run.push(c);
          });
          flush();
          const g = grade(s, d);
          expect(g.pass, JSON.stringify(d)).toBe(ok);
          const st = initExercise({ ...bridgeTutorial, params: encodePuzzle({ ...s, mode: "build", solution: d, given: null, weak: null, best: 0 }) });
          expect(validateAnswer(st.exercise.answer, g.passed).correct).toBe(ok);
          if (ok) {
            passing++;
            shapes.add(d.map((c) => (c.pillar ? "P" : c.deck![0])).join(""));
          }
          return;
        }
        for (const c of cellsAll) rec([...d, c]);
      };
      rec([]);
      expect(passing, JSON.stringify(s)).toBeGreaterThan(3);
      expect(shapes.size).toBeGreaterThan(1); // genuinely different designs pass, not one canonical answer
    }
  });
  it("a design that fails any rule never submits as correct", () => {
    const ex = levelItems(4, 1)[0]!;
    const pz = decodePuzzle(ex);
    const g = grade(pz, pz.solution.map((c) => ({ ...c, brace: false })));
    expect(g.pass).toBe(false);
    expect(validateAnswer(ex.answer, g.passed).correct).toBe(false);
    expect(validateAnswer(ex.answer, grade(pz, pz.solution).passed).correct).toBe(true);
  });
});

describe("solvers", () => {
  it("the fast solver finds the same cheapest cost as the spec's exhaustive solver", () => {
    for (let level = 0; level <= BB_MAX_LEVEL; level++) {
      for (const ex of levelItems(level, 8)) {
        const pz = decodePuzzle(ex);
        if (pz.gap > 5) continue;
        expect(cheapest(pz)!.cost, ex.id).toBe(bruteForceCheapest(pz));
      }
    }
  });
  it("plansWithin lists only valid designs within the limit", () => {
    const s = site({ budget: 140 });
    const plans = plansWithin(s, 140);
    expect(plans.length).toBeGreaterThan(1);
    for (const p of plans) {
      expect(grade(s, p.design).pass).toBe(true);
      expect(costOf(p.design)).toBe(p.cost);
    }
  });
  it("cheapestFix changes only the given region", () => {
    const s = site({ budget: Infinity });
    const given = [W(), P(), W(), W()];
    // cell 0 (a wood span of 1 holds 4) is also too weak for a truck, so no fix of cells 2–3 alone can pass
    expect(cheapestFix(s, given, 2, 3)).toBeNull();
    const given2 = [S(), P(), W(), W()];
    const fix2 = cheapestFix(s, given2, 2, 3)!;
    expect(grade(s, fix2.design).pass).toBe(true);
    expect(fix2.design.slice(0, 2)).toEqual(given2.slice(0, 2));
    expect(fix2.design.slice(2)).toEqual([W(true), W(true)]);
  });
});

describe("generator (levels × seeds)", () => {
  it("has 9 levels (maxLevel 8) and a skill for every level", () => {
    expect(BB_MAX_LEVEL).toBe(8);
    expect(budgetBridge.progression.maxLevel).toBe(8);
    expect(LEVELS.map((l) => l.skill)).toEqual([
      "engr.struct.span-load", "engr.struct.span-load", "engr.struct.span-load", "engr.struct.triangle", "engr.struct.triangle",
      "engr.struct.span-load", "engr.design.criteria", "engr.design.iterate", "engr.design.iterate",
    ]);
  });
  it("is deterministic: same level + seed → same round", () => {
    for (const level of [0, 4, 7, 8]) {
      const a = buildRound(budgetBridge, { level, seed: 99 });
      const b = buildRound(budgetBridge, { level, seed: 99 });
      expect(a.exercises).toEqual(b.exercises);
    }
  });
  it("every item lints, is solvable within its budget, and meets its level's teaching constraint", () => {
    for (let level = 0; level <= BB_MAX_LEVEL; level++) {
      const spec = LEVELS[level]!;
      for (const ex of levelItems(level)) {
        expect(lintExercise({ ...ex, difficulty: level + 1 })).toEqual([]);
        const pz = decodePuzzle(ex);
        expect(puzzleProblems(pz, level), ex.id).toEqual([]);
        expect(pz.gap).toBeGreaterThanOrEqual(spec.gap[0]);
        expect(pz.gap).toBeLessThanOrEqual(spec.gap[1]);
        expect(spec.vehicles).toContain(pz.vehicle);
        expect(pz.pieces).toEqual(spec.pieces);
        // at least one solution within budget (the solver's), and the budget follows the slack rule
        const best = cheapest(pz)!;
        expect(best.cost).toBeLessThanOrEqual(pz.budget);
        expect(grade(pz, pz.solution).pass).toBe(true);
        if (spec.mode !== "improve") expect(pz.budget).toBe(roundUp5(best.cost * spec.slack));
        if (level === 4 || level === 8) expect(cheapestAllSteel(pz)).toBeGreaterThan(pz.budget);
        if (level === 5) {
          expect(pz.ground.some((g) => !g)).toBe(true);
          // no valid design uses a pillar in deep water
          for (const p of plansWithin(pz, pz.budget)) expect(p.design.every((c, i) => !c.pillar || pz.ground[i])).toBe(true);
        }
        if (level === 6) expect(plansWithin(pz, pz.budget, 2).length).toBe(2);
        if (level === 7) {
          const g = grade(pz, pz.given!);
          expect(g.passed).toEqual(["deck", "span", "ground", "budget"]); // fails exactly the load rule
          expect(g.segments.filter((s) => s.tooWeak).length).toBe(1);
          expect(costOf(pz.given!)).toBeLessThan(pz.budget);
          expect(cheapestFix(pz, pz.given!, pz.weak![0], pz.weak![1])!.cost).toBe(pz.budget);
        }
      }
    }
  });
  it("tutorial: one wood plank over one gap for a scooter, $20", () => {
    expect(lintExercise(bridgeTutorial)).toEqual([]);
    expect(bridgeTutorial.tutorial).toBe(true);
    expect(bridgeTutorial.difficulty).toBe(1);
    const pz = decodePuzzle(bridgeTutorial);
    expect(grade(pz, [W()]).pass).toBe(true);
    expect(grade(pz, [S()]).pass).toBe(false); // there is no steel at this level anyway, and it would cost $25
    expect(budgetBridge.exercises.filter((e) => e.tutorial)).toHaveLength(1);
  });
  it("params round-trip", () => {
    for (const ex of [...levelItems(7, 5), ...levelItems(5, 5)]) {
      const pz = decodePuzzle(ex);
      expect(decodePuzzle({ params: encodePuzzle(pz) })).toEqual(pz);
    }
  });
});

describe("editing", () => {
  it("decks replace the other material; pillar and triangle toggle; add never removes; clear empties", () => {
    let d: Design = [E, E];
    d = placePiece(d, 0, "wood");
    expect(d[0]!.deck).toBe("wood");
    d = placePiece(d, 0, "steel");
    expect(d[0]!.deck).toBe("steel");
    d = placePiece(d, 0, "steel");
    expect(d[0]!.deck).toBe(null);
    d = placePiece(placePiece(d, 1, "pillar"), 1, "brace");
    expect(d[1]).toEqual({ deck: null, pillar: true, brace: true });
    expect(addPiece(d, 1, "pillar")[1]!.pillar).toBe(true);
    expect(clearCell(d, 1)[1]).toEqual(E);
  });
  it("model: keeps agreeing pieces, ghosts the rest", () => {
    const sol = [W(true), P(), W(true)];
    const start = modelStart([S(true), P(), W()], sol);
    expect(start).toEqual([{ deck: null, pillar: false, brace: true }, P(), W()]);
    expect(missingPieces(start[0]!, sol[0]!)).toEqual(["wood"]);
    expect(missingPieces(start[2]!, sol[2]!)).toEqual(["brace"]);
  });
});

describe("diagnosis → helper lines (spec §4.5)", () => {
  const s = site({ budget: 115 });
  it("names the misconception behind the miss", () => {
    expect(diagnose(site({ ground: [true, false, true, true] }), [W(true), P(), W(true), W(true)])).toBe("ground");
    expect(diagnose(s, [W(true), P(), W(true), W()])).toBe("brace");
    expect(diagnose(s, [W(), P(), W(), W()])).toBe("span");
    expect(diagnose(s, [S(), P("steel"), S(), S()])).toBe("budget");
    expect(diagnose(s, [W(true), P(), W(true), W(true)])).toBe("ok");
    const given = [S(), P(), W(), W()];
    expect(diagnose(s, [W(), P(), W(true), W(true)], { given, weak: [2, 3] })).toBe("improve");
    expect(diagnose(s, [S(), P(), W(true), W()], { given, weak: [2, 3] })).toBe("brace");
  });
  it("maps every diagnosis and level to a voiced line", () => {
    for (const d of ["ground", "brace", "span", "budget", "improve", "ok"] as const) expect(lines[hintLineFor(d)], d).toBeDefined();
    for (let level = 0; level <= BB_MAX_LEVEL; level++) expect(lines[explainFor({ ...bridgeTutorial, difficulty: level + 1 })]).toBeDefined();
  });
  it("praises the process the child used", () => {
    const pz: Puzzle = { ...site(), mode: "build", solution: [], given: null, weak: null, best: 0 };
    expect(praiseFor(pz, [W(true), P(), W(true), W(true)])).toEqual(["bb.praise.1"]);
    expect(praiseFor(pz, [S(), P(), S(), S()])).toEqual(["bb.praise.4"]);
    expect(praiseFor({ ...pz, gap: 2, ground: [true, true] }, [W(), W()])).toEqual(["bb.praise.5"]);
    expect(praiseFor({ ...pz, mode: "improve" }, null)).toEqual(["bb.praise.3"]);
  });
});

describe("engine integration", () => {
  it("a failing design is a miss with a gentle ladder; a passing one is correct", () => {
    const ex = { ...levelItems(4, 1)[0]!, difficulty: 5 };
    const pz = decodePuzzle(ex);
    let st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: grade(pz, [S(), P("steel"), S(), S(), ...pz.solution.slice(4)]).passed });
    expect(st.feedback?.correct).toBe(false);
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    expect(st.hintStage).toBe(1);
    expect(st.eliminated).toEqual([]);
    st = exerciseReducer(st, { type: "SUBMIT", value: ["deck"] });
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    expect(st.hintStage).toBe(2);
    st = exerciseReducer(st, { type: "SUBMIT", value: grade(pz, pz.solution).passed });
    expect(st.feedback?.correct).toBe(true);
  });
});

describe("voice", () => {
  it("covers every vehicle and every budget the generator can produce", () => {
    const vehicles = lines["bb.prompt.build"]!.vary!.vehicle!;
    const amounts = lines["bb.budget"]!.vary!.amount!;
    for (let level = 0; level <= BB_MAX_LEVEL; level++) {
      for (const ex of levelItems(level)) {
        const pz = decodePuzzle(ex);
        expect(vehicles).toContain(VEHICLE_WORD[pz.vehicle]);
        expect(amounts, ex.id).toContain(pz.budget);
        if (ex.prompt?.line) expect(lines[ex.prompt.line], ex.prompt.line).toBeDefined();
      }
    }
    expect(lines["bb.test.pass"]!.vary!.vehicle).toEqual(vehicles);
    expect(lines["bb.prompt.deep"]!.vary!.vehicle).toEqual(vehicles);
  });
  it("story, helper and hint lines exist; every id is prefixed; lines are short and praise process", () => {
    for (const b of [...bridgeIntro, ...bridgeOutro]) expect(lines[b.line], b.line).toBeDefined();
    for (const b of Object.values(bridgeBetween)) expect(lines[b.line]).toBeDefined();
    for (const id of ["bb.hint.model", "bb.hint.modelTap", "bb.retry.1", "bb.idle", "bb.test.sag", "bb.test.gap", "bb.prompt.test", "bb.ready", "bb.back"]) expect(lines[id], id).toBeDefined();
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("bb.")).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(16);
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|wrong|fail/);
    }
    const combos = Object.values(lines).reduce((n, l) => n + (l.vary ? Object.values(l.vary).reduce((m, v) => m * v.length, 1) : 1), 0);
    expect(combos).toBeLessThan(150);
  });
});

describe("rules list", () => {
  it("the set answer is exactly the five rules", () => {
    const ex = levelItems(0, 1)[0]!;
    expect(ex.answer.kind).toBe("set");
    if (ex.answer.kind === "set") {
      expect(ex.answer.correct).toEqual([...RULES]);
      expect(ex.answer.options.map((o) => o.id)).toEqual([...RULES]);
    }
  });
});
