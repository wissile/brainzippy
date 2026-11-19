import { describe, expect, it } from "vitest";
import { createRng } from "../../src/engine/rng";
import { buildRound } from "../../src/engine/round";
import { initExercise, exerciseReducer } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { gardenPath, gardenTutorial } from "../../src/games/garden-path/definition";
import { addCard, cycleCount, firstHole, lastFilled, modelStart, moveCard, nextGhost, removeAt, setCount } from "../../src/games/garden-path/edit";
import { GP_MAX_LEVEL, LEVELS, generateGardenPath, puzzleProblems } from "../../src/games/garden-path/generator";
import { hintLineFor, markOf } from "../../src/games/garden-path/Board";
import {
  type Dir, type Program, type Puzzle, answerFor, blockChoices, blocksUsed, decodePuzzle, describeGarden, diagnose, encodePuzzle,
  expand, minBlocks, move, movesOf, repeat, run, shortestMoves,
} from "../../src/games/garden-path/logic";
import { gardenBetween, gardenIntro, gardenOutro } from "../../src/games/garden-path/story";
import voice from "../../src/games/garden-path/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = 60;

/** 5×5 garden: Toggle at row 3 square 1 (cell 10), berry bush at row 3 square 5 (cell 14), a rock at cell 12. */
const pz = (over: Partial<Puzzle> = {}): Puzzle => ({
  cols: 5, rows: 5, start: 10, goal: 14, rocks: [12], berries: [], slots: 8, palette: ["up", "right", "down", "left"],
  repeat: false, bodySlots: 1, mode: "build", solution: ["up", "right", "right", "right", "right", "down"].map((d) => move(d as Dir)), given: null, bug: null, ...over,
});
const P = (...ds: Dir[]): Program => ds.map(move);

describe("grid simulator", () => {
  it("runs moves in order, records the trail and reports success only on the goal", () => {
    const res = run(pz(), P("up", "right", "right", "right", "right", "down"));
    expect(res.success).toBe(true);
    expect(res.cells).toEqual([10, 5, 6, 7, 8, 9, 14]);
    expect(res.checkpoints).toEqual(["start", "goal"]);
  });
  it("stops at a rock or the fence (a bump) and never passes", () => {
    const rock = run(pz(), P("right", "right", "right", "right"));
    expect(rock.bump).toEqual({ step: 1, kind: "rock", target: 12 });
    expect(rock.end).toBe(11);
    expect(rock.success).toBe(false);
    const fence = run(pz(), P("left"));
    expect(fence.bump?.kind).toBe("edge");
    expect(fence.checkpoints).toEqual(["start"]);
  });
  it("must END on the goal: passing over it is not enough", () => {
    expect(run(pz({ rocks: [] }), P("right", "right", "right", "right")).success).toBe(true);
    expect(run(pz({ rocks: [], goal: 13 }), P("right", "right", "right", "right")).success).toBe(false);
  });
  it("berries count only in order; going home without one fails", () => {
    const via = pz({ rocks: [], berries: [0], goal: 14 });
    const good = run(via, P("up", "up", "right", "right", "right", "right", "down", "down"));
    expect(good.success).toBe(true);
    expect(good.checkpoints).toEqual(["start", "berry", "goal"]);
    const skip = run(via, P("right", "right", "right", "right"));
    expect(skip.success).toBe(false);
    expect(skip.checkpoints).toEqual(["start"]);
  });
  it("holes do nothing; repeat expands n × body; an empty program never passes", () => {
    expect(movesOf([move("up"), null, repeat(3, ["right", null])])).toEqual(["up", "right", "right", "right"]);
    expect(expand([repeat(2, ["right", "up"])]).map((s) => `${s.d}${s.iter}${s.body}`)).toEqual(["right00", "up01", "right10", "up11"]);
    expect(run(pz(), [null, null]).success).toBe(false);
  });
  it("shortest moves are measured by BFS around rocks and in berry order", () => {
    expect(shortestMoves(pz())).toBe(6);
    expect(shortestMoves(pz({ rocks: [] }))).toBe(4);
    expect(shortestMoves(pz({ rocks: [], berries: [0] }))).toBe(2 + 4 + 2);
  });
  it("params round-trip losslessly", () => {
    const a = pz({ mode: "debug-loop", repeat: true, bodySlots: 2, solution: [repeat(3, ["right", "up"]), move("down")], given: [repeat(4, ["right", "up"]), move("down")], bug: { top: 0, body: -1, kind: "count" }, slots: 2 });
    const b = decodePuzzle({ params: encodePuzzle(a) });
    expect(b).toEqual(a);
  });
  it("describes the garden in words for screen readers", () => {
    expect(describeGarden(pz())).toBe("Toggle is on row 3, square 1. Berry bush: row 3, square 5. Rock: row 3, square 3.");
  });
});

describe("validation by simulation: any working program passes", () => {
  it("every program that reaches the goal within the budget is accepted by the engine; failing ones never are", () => {
    const p = pz({ slots: 6 });
    const answer = answerFor(p);
    const passing = new Set<string>();
    const choices = blockChoices(p);
    const search = (prog: Program) => {
      const res = run(p, prog);
      const v = validateAnswer(answer, res.checkpoints);
      expect(v.correct, prog.map((b) => (b?.t === "move" ? b.d : "")).join(",")).toBe(res.success);
      if (res.success) passing.add(movesOf(prog).join(","));
      if (prog.length < p.slots) for (const b of choices) search([...prog, b]);
    };
    search([]);
    // the rock leaves eight 6-move routes round it (over or under, stepping aside early or late): all accepted,
    // not one canonical answer; nothing longer fits the 6 spaces
    expect(passing.size).toBe(8);
    expect(passing).toContain("up,right,right,right,right,down");
    expect(passing).toContain("right,down,right,right,up,right");
  });
  it("a failed run submits a strict prefix: the engine counts it wrong (never ignores it) and hints escalate", () => {
    const ex = { ...gardenTutorial };
    let s = initExercise(ex);
    s = exerciseReducer(s, { type: "SUBMIT", value: ["start"] });
    expect(s.attempts).toBe(1);
    expect(s.feedback?.correct).toBe(false);
    expect(s.eliminated).toEqual([]); // nothing greyed: every checkpoint is needed
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: ["start"] });
    expect(s.hintStage).toBe(2);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: run(decodePuzzle(ex), P("right")).checkpoints });
    expect(s.feedback?.correct).toBe(true);
  });
});

describe("first-miss diagnosis (first wrong step)", () => {
  const p = pz({ rocks: [] }); // straight: 4 × right
  it("wrong direction → away, at the first wrong card", () => {
    const d = diagnose(p, P("right", "up", "right", "right"));
    expect(d).toMatchObject({ kind: "away", step: 1, top: 1 });
    expect(hintLineFor(p, d)).toBe("gp.help.dir");
    expect(markOf(d)).toEqual({ top: 1, body: -1 });
  });
  it("one too few → short (marks the first empty space); one too many → tooFar", () => {
    expect(diagnose(p, [move("right"), move("right"), move("right"), null])).toEqual({ kind: "short", top: 3 });
    expect(diagnose(pz({ rocks: [], goal: 13 }), P("right", "right", "right", "right"))).toMatchObject({ kind: "tooFar", step: 3 });
  });
  it("bumping a rock or the fence → bump", () => {
    expect(diagnose(pz(), P("right", "right"))).toMatchObject({ kind: "bump", step: 1, what: "rock" });
    expect(diagnose(pz(), P("left"))).toMatchObject({ kind: "bump", what: "edge" });
  });
  it("repeat count one off → repeatCount (either way)", () => {
    const r = pz({ rocks: [], repeat: true, slots: 2 });
    expect(diagnose(r, [repeat(5, ["right"]), null])).toEqual({ kind: "repeatCount", top: 0, more: false });
    expect(diagnose(r, [repeat(3, ["right"]), null])).toEqual({ kind: "repeatCount", top: 0, more: true });
    expect(hintLineFor(r, { kind: "repeatCount", top: 0, more: true })).toBe("gp.help.repeatCount");
  });
  it("home without the berry → skipBerry (plan line); debug levels always get the debug line", () => {
    const via = pz({ rocks: [], berries: [0], mode: "via" });
    const d = diagnose(via, P("right", "right", "right", "right"));
    expect(d.kind).toBe("skipBerry");
    expect(hintLineFor(via, d)).toBe("gp.help.plan");
    expect(hintLineFor(pz({ mode: "debug" }), { kind: "away", step: 0, top: 0, body: -1, iter: 0 })).toBe("gp.help.debug");
  });
});

describe("program strip editing", () => {
  it("cards fill the next empty space; repeat bodies fill right after their card", () => {
    let p: Program = [null, null, null];
    p = addCard(p, "right", 1)!.program;
    p = addCard(p, "repeat", 2)!.program;
    expect(firstHole(p, "up")).toEqual({ top: 1, body: 0 });
    p = addCard(p, "up", 2)!.program;
    p = addCard(p, "right", 2)!.program;
    p = addCard(p, "down", 2)!.program;
    expect(p).toEqual([move("right"), repeat(2, ["up", "right"]), move("down")]);
    expect(addCard(p, "left", 2)).toBeNull();
  });
  it("taking a card out leaves its space empty for the next card (debug fix = tap, tap)", () => {
    const fixed = addCard(removeAt(P("right", "up", "right"), { top: 1, body: -1 }), "right", 1)!.program;
    expect(fixed).toEqual(P("right", "right", "right"));
    expect(lastFilled([move("up"), repeat(3, ["left", null]), null])).toEqual({ top: 1, body: 0 });
  });
  it("repeat counts stay within 2–5 (the button cycles)", () => {
    expect([2, 3, 4, 5].map((n) => cycleCount(n))).toEqual([3, 4, 5, 2]);
    expect(cycleCount(2, -1)).toBe(5);
    expect(setCount([repeat(5, ["up"])], 0, 9)).toEqual([repeat(5, ["up"])]);
  });
  it("dragging swaps top-level cards and moves body cards", () => {
    expect(moveCard(P("up", "down"), { top: 0, body: -1 }, { top: 1, body: -1 })).toEqual(P("down", "up"));
    expect(moveCard([move("up"), repeat(2, [null])], { top: 0, body: -1 }, { top: 1, body: 0 })).toEqual([null, repeat(2, ["up"])]);
  });
  it("model mode keeps matching cards, empties the rest and offers ghosts in order", () => {
    const sol = P("up", "right", "right");
    const m = modelStart([move("up"), move("left"), move("right"), move("down")], sol, 4);
    expect(m).toEqual([move("up"), null, move("right"), null]);
    expect(nextGhost(m, sol)).toEqual({ top: 1, block: move("right") });
  });
});

describe("generator", () => {
  it("has 9 levels (0–8) matching the definition and the spec table", () => {
    expect(LEVELS).toHaveLength(9);
    expect(gardenPath.progression.maxLevel).toBe(GP_MAX_LEVEL);
    expect(LEVELS.map((l) => l.mode)).toEqual(["build", "build", "build", "build", "via", "debug", "repeat", "stairs", "debug-loop"]);
  });

  it("is deterministic: same seed → same round", () => {
    for (let level = 0; level <= GP_MAX_LEVEL; level++) {
      expect(buildRound(gardenPath, { level, seed: 99 })).toEqual(buildRound(gardenPath, { level, seed: 99 }));
    }
  });

  it("every level × seeds: lints, declared skill, valid puzzle, solvable within the budget at the intended minimal length", () => {
    for (let level = 0; level <= GP_MAX_LEVEL; level++) {
      const ids = new Set<string>();
      for (let s = 0; s < SEEDS; s++) {
        const ex = { ...generateGardenPath(level, createRng(1000 + s), s), difficulty: level + 1 };
        expect(lintExercise(ex), ex.id).toEqual([]);
        expect(gardenPath.skillIds).toContain(ex.skillId);
        expect(ex.skillId).toBe(LEVELS[level]!.skill);
        expect(ids.has(ex.id), ex.id).toBe(false);
        ids.add(ex.id);
        const p = decodePuzzle(ex);
        expect(puzzleProblems(p), ex.id).toEqual([]);
        expect(p.mode).toBe(LEVELS[level]!.mode);
        const moves = movesOf(p.solution).length;
        // the intended program passes and is no longer than the budget
        expect(run(p, p.solution).success, ex.id).toBe(true);
        expect(blocksUsed(p.solution)).toBeLessThanOrEqual(p.slots);
        // engine answer: the intended run's checkpoints are exactly the answer
        expect(validateAnswer(ex.answer, run(p, p.solution).checkpoints).correct).toBe(true);
        // minimal length: no shorter program exists
        expect(shortestMoves(p), ex.id).toBe(moves);
        if (p.repeat) expect(minBlocks(p, blocksUsed(p.solution)), ex.id).toBe(blocksUsed(p.solution));
        // rocks never on the path; goal ≠ start; berries reachable
        const path = run(p, p.solution).cells;
        expect(p.rocks.some((r) => path.includes(r))).toBe(false);
        expect(p.goal).not.toBe(p.start);
        for (const b of p.berries) expect(path).toContain(b);
        // per-level parameters (docs/worlds/garden-path.md)
        const spec: Record<number, () => void> = {
          0: () => { expect(p.rows).toBe(1); expect(moves).toBeGreaterThanOrEqual(1); expect(moves).toBeLessThanOrEqual(2); expect(p.palette).toHaveLength(1); expect(p.slots).toBe(moves); },
          1: () => { expect(p.rows).toBe(1); expect(moves).toBeLessThanOrEqual(3); expect([...p.palette].sort()).toEqual(["left", "right"]); expect(p.slots).toBe(moves); },
          2: () => { expect(moves).toBeGreaterThanOrEqual(3); expect(moves).toBeLessThanOrEqual(4); expect(p.rocks).toHaveLength(0); expect(p.slots).toBe(moves); },
          3: () => { expect(moves).toBeGreaterThanOrEqual(4); expect(moves).toBeLessThanOrEqual(6); expect(p.rocks.length).toBeGreaterThanOrEqual(1); expect(p.slots).toBe(moves + 2); },
          4: () => { expect(p.berries).toHaveLength(1); expect(moves).toBeGreaterThanOrEqual(5); expect(moves).toBeLessThanOrEqual(7); expect(p.slots).toBe(moves + 2); },
          5: () => { expect(p.given).not.toBeNull(); expect(p.slots).toBe(moves); },
          6: () => { expect(p.repeat).toBe(true); expect(p.slots).toBeLessThan(moves); expect(p.slots).toBeGreaterThanOrEqual(2); expect(p.slots).toBeLessThanOrEqual(3); },
          7: () => { expect(p.slots).toBe(2); expect(p.bodySlots).toBe(2); expect(p.solution[0]).toMatchObject({ t: "repeat" }); },
          8: () => { expect(p.given).not.toBeNull(); expect(p.slots).toBe(p.solution.length); },
        };
        spec[level]!();
        // debug levels: the given program fails, and its first wrong step is the planted bug
        if (p.given) {
          expect(run(p, p.given).success, ex.id).toBe(false);
          const d = diagnose(p, p.given);
          expect("top" in d && d.top, ex.id).toBe(p.bug!.top);
        }
      }
    }
  });

  it("the tutorial is one right move on a strip, guided at difficulty 1", () => {
    expect(gardenTutorial.tutorial).toBe(true);
    expect(gardenTutorial.difficulty).toBe(1);
    expect(lintExercise(gardenTutorial)).toEqual([]);
    const p = decodePuzzle(gardenTutorial);
    expect(p.palette).toEqual(["right"]);
    expect(run(p, P("right")).success).toBe(true);
  });
});

describe("voice", () => {
  it("every prompt, story beat and repeat count used by the content is in voice.json", () => {
    const used = new Set<string>([gardenTutorial.prompt!.line, ...gardenIntro.map((b) => b.line), ...gardenOutro.map((b) => b.line), ...Object.values(gardenBetween).map((b) => b.line)]);
    for (let level = 0; level <= GP_MAX_LEVEL; level++) for (let s = 0; s < 20; s++) used.add(generateGardenPath(level, createRng(s), s).prompt!.line);
    for (const id of used) expect(lines[id], id).toBeDefined();
    expect(lines["gp.block.times"]!.vary!.n).toEqual([2, 3, 4, 5]);
  });
  it("every helper line the diagnosis can pick exists; lines are short and praise the process", () => {
    for (const id of ["gp.help.start", "gp.help.step", "gp.help.plan", "gp.help.debug", "gp.help.repeat", "gp.help.staircase", "gp.help.dir", "gp.help.tooFar", "gp.help.short", "gp.help.repeatCount"]) expect(lines[id], id).toBeDefined();
    for (const [id, l] of Object.entries(lines)) {
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(id.startsWith("gp."), id).toBe(true);
      expect(/\bsmart\b|\bclever\b|genius/i.test(l.text), id).toBe(false);
    }
  });
});
