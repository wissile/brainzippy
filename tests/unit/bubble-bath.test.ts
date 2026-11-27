import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine, voiceKey } from "../../src/audio/voiceLines";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { initialProgression, selectNextExercise, applyResult } from "../../src/engine/progression";
import { exerciseReducer, initExercise, type ExerciseState } from "../../src/engine/session";
import type { AnswerValue, Exercise } from "../../src/engine/types";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { bathTutorial, bubbleBath } from "../../src/games/bubble-bath/definition";
import {
  BAND, BUBBLE_R, GAME_OF, GB_LEVELS, GB_MAX_LEVEL, MAX_DUCKS, MAX_LOOK, NUMBER_WORDS, SHAPES, WALL_THINGS, arrange, generateBubbleBath, holeShape,
  isTipped, modeOf, paradeForm, paradeSlots, parseSize, parseThing, parseToy, questionOf, spotsOf, type Mode,
} from "../../src/games/bubble-bath/generator";
import {
  alongSayFor, alongStepsFor, diagnoseCompare, diagnoseFind, diagnoseLook, diagnoseParade, diagnoseSize, diagnoseSort, explainFor, hintFor, idleFor, innerGameKey, praiseFor,
} from "../../src/games/bubble-bath/logic";
import { shouldExplain } from "../../src/game/explainRule";
import { duckRow } from "../../src/games/bubble-bath/MoreOrFewer";
import { groupRings } from "../../src/games/bubble-bath/QuickLook";
import { gridFor } from "../../src/games/bubble-bath/shared";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 3);
const all: Exercise[] = [];
for (const seed of SEEDS) for (let level = 0; level <= GB_MAX_LEVEL; level++) all.push(...generateBand(bubbleBath, level, seed, BAND));
const levelOf = (ex: Exercise) => Number(/-l(\d+)n\d+$/.exec(ex.id)![1]);
const indexOf = (ex: Exercise) => Number(/n(\d+)$/.exec(ex.id)![1]);
const byMode = (m: Mode) => all.filter((e) => modeOf(e) === m);
const submit = (s: ExerciseState, value: AnswerValue) => exerciseReducer(exerciseReducer(s, { type: "SUBMIT", value }), { type: "FEEDBACK_DONE" });
const lineExists = (id: string) => expect(VOICE_LINES[id], id).toBeDefined();

describe("Bubble Bath: levels, generator and determinism", () => {
  it("8 levels (maxLevel 7), one authored tutorial at difficulty 1 (a circle and a square, one per hole) that lints", () => {
    expect(GB_LEVELS).toHaveLength(8);
    expect(bubbleBath.progression.maxLevel).toBe(7);
    expect(bubbleBath.progression.roundLength).toBe(BAND);
    expect(bubbleBath.exercises.filter((e) => e.tutorial)).toEqual([bathTutorial]);
    expect(bathTutorial.difficulty).toBe(1);
    expect(lintExercise(bathTutorial)).toEqual([]);
    if (bathTutorial.answer.kind !== "match") throw new Error("match");
    expect(bathTutorial.answer.items.map((i) => parseToy(i.art).shape).sort()).toEqual(["circle", "square"]);
    expect(bathTutorial.answer.items.every((i) => parseToy(i.art).rot === 0)).toBe(true);
  });

  it("level 0 is Shape Splash only; each level unlocks at most one new inner game, the new one first; all five by level 3", () => {
    const games = (l: number) => new Set(GB_LEVELS[l]!.games.map((m) => GAME_OF[m]));
    expect([...games(0)]).toEqual(["shape-splash"]);
    for (let l = 1; l <= GB_MAX_LEVEL; l++) {
      const added = [...games(l)].filter((g) => !games(l - 1).has(g));
      expect(added.length, `level ${l}`).toBeLessThanOrEqual(1);
      if (added.length) expect(GAME_OF[GB_LEVELS[l]!.games[0]!], `level ${l} starts with its new game`).toBe(added[0]);
    }
    for (let l = 3; l <= GB_MAX_LEVEL; l++) expect(games(l).size + 1, `level ${l} (+ parade)`).toBe(5);
  });

  it(`every generated exercise (8 levels × 50 seeds × ${BAND}) lints, has a declared skill, ages 3–4 and difficulty = level + 1`, () => {
    const problems: string[] = [];
    for (const ex of all) {
      problems.push(...lintExercise(ex));
      if (!bubbleBath.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill ${ex.skillId}`);
      if (ex.difficulty !== levelOf(ex) + 1) problems.push(`${ex.id}: difficulty`);
      if (ex.ages[0] !== 3 || ex.ages[1] !== 4) problems.push(`${ex.id}: ages`);
      const m = modeOf(ex);
      if (m !== "parade" && !GB_LEVELS[levelOf(ex)]!.games.includes(m)) problems.push(`${ex.id}: mode not unlocked at its level`);
      // the finale is exactly index 7 of every band, and only it is a closer
      if ((indexOf(ex) === BAND - 1) !== (m === "parade") || !!ex.closer !== (m === "parade")) problems.push(`${ex.id}: closer placement`);
    }
    for (const seed of SEEDS.slice(0, 10)) for (let level = 0; level <= GB_MAX_LEVEL; level++) for (const ex of buildRound(bubbleBath, { level, seed }).exercises) problems.push(...lintExercise(ex));
    expect(problems).toEqual([]);
  });

  it("is deterministic: same (level, seed) → same round; the generator is pure; out-of-range levels clamp", () => {
    for (let level = 0; level <= GB_MAX_LEVEL; level++) {
      expect(buildRound(bubbleBath, { level, seed: 9 })).toEqual(buildRound(bubbleBath, { level, seed: 9 }));
      expect(buildRound(bubbleBath, { level, seed: 9 }).exercises).not.toEqual(buildRound(bubbleBath, { level, seed: 10 }).exercises);
      for (let i = 0; i < BAND; i++) expect(generateBubbleBath(level, createRng(42), i)).toEqual(generateBubbleBath(level, createRng(42), i));
    }
    expect(generateBubbleBath(99, createRng(1), 0).id).toMatch(/-l7n0$/);
    expect(generateBubbleBath(-3, createRng(1), 0).id).toMatch(/-l0n0$/);
  });

  it("a played round mixes inner games, never repeats one kind more than four times, and always ends with the parade", () => {
    for (const seed of SEEDS.slice(0, 20)) for (let level = 0; level <= GB_MAX_LEVEL; level++) {
      const round = buildRound(bubbleBath, { level, seed });
      let p = initialProgression(bubbleBath.progression, level + 1);
      const modes: Mode[] = [];
      for (let k = 0; k < BAND; k++) {
        const ex = selectNextExercise(round, p, bubbleBath.progression)!;
        modes.push(modeOf(ex));
        p = { ...p, played: [...p.played, ex.id] };
        // a child who answers everything first try (the fastest step-ups)
        p = applyResult(p, { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }, bubbleBath.progression);
      }
      expect(modes.at(-1), `L${level} s${seed}`).toBe("parade");
      expect(modes.slice(0, -1)).not.toContain("parade");
      const counts = new Map<Mode, number>();
      for (const m of modes) counts.set(m, (counts.get(m) ?? 0) + 1);
      expect(Math.max(...counts.values()), `L${level} s${seed}: ${modes.join(",")}`).toBeLessThanOrEqual(4);
      expect(new Set(modes.map((m) => GAME_OF[m])).size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("Bubble Bath: content is right and unambiguous at every level", () => {
  it("Shape Splash sort: holes are different shapes, each toy fits exactly one hole, every hole gets a toy; tipped/skinny only where allowed", () => {
    let tipped = 0;
    let skinny = 0;
    for (const ex of [bathTutorial, ...byMode("sort")]) {
      if (ex.answer.kind !== "match") throw new Error("match");
      const { pairs, items, targets } = ex.answer;
      const spec = GB_LEVELS[ex.tutorial ? 0 : levelOf(ex)]!.sort;
      const holeShapes = targets.map((t) => holeShape(t.art));
      expect(new Set(holeShapes).size).toBe(holeShapes.length);
      expect(holeShapes.sort()).toEqual([...SHAPES.slice(0, spec.shapes)].sort());
      for (const it of items) {
        const t = parseToy(it.art);
        const fits = targets.filter((h) => holeShape(h.art) === t.shape);
        expect(fits.map((h) => h.id), `${ex.id} ${it.id}`).toEqual([pairs[it.id]]);
        if (isTipped(t.shape, t.rot)) { tipped++; expect(spec.tipped, ex.id).toBe(true); }
        if (t.skinny || t.lopsided) { skinny++; expect(spec.skinny && t.shape === "triangle", ex.id).toBe(true); }
      }
      expect(new Set(Object.values(pairs)).size, ex.id).toBe(targets.length);
      expect(items.length).toBeGreaterThanOrEqual(spec.toys[0]);
      expect(items.length).toBeLessThanOrEqual(spec.toys[1]);
    }
    expect(tipped).toBeGreaterThan(50);
    expect(skinny).toBeGreaterThan(10);
  });

  it("Shape Splash find: exactly one thing has the asked shape; every thing's drawing is the shape it is filed under", () => {
    for (const ex of byMode("find")) {
      if (ex.answer.kind !== "choice") throw new Error("choice");
      const target = SHAPES[ex.params!.sh!]!;
      const shapes = ex.answer.options.map((o) => parseThing(o.art).shape);
      expect(shapes.filter((s) => s === target), ex.id).toHaveLength(1);
      const correct = ex.answer.correct;
      expect(parseThing(ex.answer.options.find((o) => o.id === correct)!.art).shape).toBe(target);
      expect(ex.objectKind).toBe(target);
      expect(ex.objective.toLowerCase(), ex.id).not.toContain(target); // the objective never names the answer
      const spec = GB_LEVELS[levelOf(ex)]!.find;
      expect(ex.answer.options).toHaveLength(spec.options);
      for (const s of shapes) expect(SHAPES.slice(0, spec.shapes)).toContain(s);
    }
    for (const [thing, shape] of Object.entries(WALL_THINGS)) expect(SHAPES).toContain(shape), expect(thing).toBeTruthy();
    // flat things only (no solids such as balls or boxes), and every triangle variant appears somewhere
    expect(Object.keys(WALL_THINGS).sort()).toEqual(["clock", "flag", "frame", "mat", "mirror", "sign", "tile", "window"]);
    const things = byMode("find").flatMap((e) => (e.answer.kind === "choice" ? e.answer.options.map((o) => parseThing(o.art)) : []));
    for (const t of things) {
      if (t.thing === "flag") expect([t.rot, t.variant]).toEqual([0, 2]); // a flag hangs from its pole, never turned
      if (t.skinny) expect(t.shape).toBe("triangle");
    }
    expect(things.some((t) => t.lopsided)).toBe(true);
    expect(things.some((t) => t.skinny)).toBe(true);
  });

  it("Quick Look: 1–5 bubbles in the level's range, no two overlap, all inside the picture; three neighbouring choices within 1–5", () => {
    for (const ex of byMode("look")) {
      if (ex.answer.kind !== "number") throw new Error("number");
      const n = ex.answer.value;
      const spec = GB_LEVELS[levelOf(ex)]!.look;
      expect(n).toBeGreaterThanOrEqual(spec.n[0]);
      expect(n).toBeLessThanOrEqual(spec.n[1]);
      const c = ex.answer.choices!;
      expect(c).toContain(n);
      expect(c).toEqual([c[0]!, c[0]! + 1, c[0]! + 2]);
      expect(c[0]).toBeGreaterThanOrEqual(1);
      expect(c[2]).toBeLessThanOrEqual(MAX_LOOK);
      expect(ex.params!.show).toBe(spec.showMs);
      expect(ex.params!.show!).toBeGreaterThanOrEqual(1500);
      const spots = spotsOf(ex);
      expect(spots).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        const s = spots[i]!;
        expect(s.x - BUBBLE_R, ex.id).toBeGreaterThanOrEqual(0);
        expect(s.y - BUBBLE_R, ex.id).toBeGreaterThanOrEqual(0);
        expect(s.x + BUBBLE_R, ex.id).toBeLessThanOrEqual(ex.params!.w!);
        expect(s.y + BUBBLE_R, ex.id).toBeLessThanOrEqual(ex.params!.h!);
        for (let j = i + 1; j < n; j++) expect(Math.hypot(s.x - spots[j]!.x, s.y - spots[j]!.y), `${ex.id} ${i}-${j}`).toBeGreaterThan(2 * BUBBLE_R);
      }
      // the objective never states how many
      expect(ex.objective, ex.id).not.toMatch(new RegExp(`\\b(${n}|${NUMBER_WORDS[n]})\\b`, "i"));
    }
  });

  it("Quick Look and the counting parade: the answer is not predictable by position (first, middle and last all occur)", () => {
    const numberItems = all.filter((e) => e.answer.kind === "number");
    const pos = (e: Exercise) => (e.answer.kind === "number" ? e.answer.choices!.indexOf(e.answer.value) : -1);
    expect(new Set(numberItems.map(pos))).toEqual(new Set([0, 1, 2]));
    // for every n with room on both sides, each position occurs
    for (const n of [3]) {
      const ps = new Set(numberItems.filter((e) => e.answer.kind === "number" && e.answer.value === n).map(pos));
      expect([...ps].sort(), `n=${n}`).toEqual([0, 1, 2]);
    }
    for (const n of [2, 4]) {
      const ps = new Set(byMode("look").filter((e) => e.answer.kind === "number" && e.answer.value === n).map(pos));
      expect(ps.size, `n=${n}`).toBeGreaterThanOrEqual(2);
    }
    // no single position dominates
    const counts = [0, 1, 2].map((k) => numberItems.filter((e) => pos(e) === k).length / numberItems.length);
    for (const c of counts) expect(c).toBeLessThan(0.6);
  });

  it("Quick Look group rings: every bubble sits inside its group's ring; clumps make two groups for n ≥ 2", () => {
    for (const arr of ["line", "dice", "clumps"] as const) for (let n = 1; n <= 5; n++) for (const seed of [1, 2, 3]) {
      const { spots } = arrange(n, arr, createRng(seed));
      const rings = groupRings(spots);
      const groups = [...new Set(spots.map((s) => s.g))];
      expect(rings).toHaveLength(groups.length);
      spots.forEach((s) => {
        const r = rings[groups.indexOf(s.g)]!;
        expect(Math.hypot(s.x - r.cx, s.y - r.cy) + BUBBLE_R).toBeLessThanOrEqual(r.r + 0.001);
      });
      if (arr === "clumps" && n >= 2) expect(groups).toHaveLength(2);
    }
  });

  it("More or Fewer: the answer follows the counts and the question; differences and ranges per level; 'same' only where offered", () => {
    let same = 0;
    let fewer = 0;
    for (const ex of byMode("compare")) {
      if (ex.answer.kind !== "choice") throw new Error("choice");
      const { a, b, spread } = ex.params as { a: number; b: number; spread: number };
      const q = questionOf(ex);
      const spec = GB_LEVELS[levelOf(ex)]!.compare;
      expect(a).toBeGreaterThanOrEqual(1);
      expect(Math.max(a, b)).toBeLessThanOrEqual(Math.min(spec.max, MAX_DUCKS));
      const want = a === b ? "same" : (q === "more") === a > b ? "a" : "b";
      expect(ex.answer.correct, ex.id).toBe(want);
      if (a !== b) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(spec.minDiff);
      expect(ex.answer.options.some((o) => o.id === "same")).toBe(spec.same);
      if (a === b) { same++; expect(spec.same).toBe(true); }
      if (q === "fewer") { fewer++; expect(spec.fewer).toBe(true); }
      // long-line trap: the spread-out tub is never the one with more
      if (spread) {
        expect(spec.spread).toBe(true);
        const longCount = spread === 1 ? a : b;
        const shortCount = spread === 1 ? b : a;
        expect(longCount).toBeLessThanOrEqual(shortCount);
        const long = duckRow(longCount, shortCount, true, true);
        const short = duckRow(shortCount, longCount, true, false);
        expect(long.xs.at(-1)!, ex.id).toBeGreaterThan(short.xs.at(-1)!); // it really looks longer
      } else expect(spec.spread).toBe(false);
    }
    expect(same).toBeGreaterThan(20);
    expect(fewer).toBeGreaterThan(50);
  });

  it("Size Line: the order runs strictly smallest → biggest, pieces start out of order, sizes as the level says", () => {
    for (const ex of byMode("size")) {
      if (ex.answer.kind !== "sequence") throw new Error("sequence");
      const { order, pieces } = ex.answer;
      const sizes = order.map((id) => parseSize(pieces.find((p) => p.id === id)!.art).size);
      expect(sizes, ex.id).toEqual(GB_LEVELS[levelOf(ex)]!.size.sizes);
      for (let i = 1; i < sizes.length; i++) expect(sizes[i]! / sizes[i - 1]!, ex.id).toBeGreaterThanOrEqual(1.18);
      expect(pieces.map((p) => p.id), ex.id).not.toEqual(order);
      expect(validateAnswer(ex.answer, order).correct).toBe(true);
      expect(new Set(pieces.map((p) => p.art)).size).toBe(pieces.length);
    }
  });

  it("Bubble Parade: levels 0–3 pop-and-count (one-to-one, how many?), levels 4–7 numerals 1…n in order", () => {
    for (const ex of byMode("parade")) {
      const spec = GB_LEVELS[levelOf(ex)]!.parade;
      expect(paradeForm(ex), ex.id).toBe(spec.form);
      expect(spec.form).toBe(levelOf(ex) <= 3 ? "count" : "order");
      if (spec.form === "count") {
        if (ex.answer.kind !== "number") throw new Error("number");
        expect(ex.answer.value).toBe(spec.n);
        expect(ex.skillId).toBe("math.count.one-to-one");
        continue;
      }
      if (ex.answer.kind !== "sequence") throw new Error("sequence");
      expect(ex.skillId).toBe("math.count.sequence");
      expect(ex.answer.order).toEqual(Array.from({ length: spec.n }, (_, i) => `b${i + 1}`));
      const slots = paradeSlots(ex).map((s) => s.slot);
      expect([...slots].sort()).toEqual(Array.from({ length: spec.n }, (_, i) => i));
      expect(slots, ex.id).not.toEqual(Array.from({ length: spec.n }, (_, i) => i));
      expect(ex.params!.dots).toBe(spec.dots ? 1 : 0);
    }
  });
});

describe("Bubble Bath: diagnosed hints, ladder and voice", () => {
  const find = (m: Mode, pred: (e: Exercise) => boolean = () => true) => all.find((e) => modeOf(e) === m && pred(e))!;

  it("diagnoses typical wrong answers (each reaches the reducer: never blocked by input validation)", () => {
    expect(diagnoseLook(3, 4)).toBe("over");
    expect(diagnoseLook(3, 2)).toBe("under");
    expect(diagnoseCompare({ params: { a: 3, b: 3, q: 0 } }, "a")).toBe("same");
    expect(diagnoseCompare({ params: { a: 2, b: 4, q: 0 } }, "same")).toBe("notSame");
    expect(diagnoseCompare({ params: { a: 2, b: 4, q: 0, spread: 1 } }, "a")).toBe("long");
    expect(diagnoseCompare({ params: { a: 4, b: 2, q: 1, spread: 2 } }, "a")).toBe("long");
    expect(diagnoseCompare({ params: { a: 4, b: 2, q: 1 } }, "a")).toBe("fewer");
    expect(diagnoseCompare({ params: { a: 4, b: 2, q: 0 } }, "b")).toBe("more");
    expect(diagnoseSize(["p1", "p2", "p3"], ["p3", "p2", "p1"])).toBe("reverse");
    expect(diagnoseSize(["p1", "p2", "p3", "p4"], ["p1", "p3", "p2", "p4"])).toBe("middle");
    expect(diagnoseSize(["p1", "p2", "p3"], ["p2", "p1", "p3"])).toBe("start");
    const parade = { params: { n: 3, s0: 2, s1: 0, s2: 1 } }; // left to right: 2, 3, 1
    expect(diagnoseParade(parade, ["b2", "b3", "b1"])).toBe("place");
    expect(diagnoseParade(parade, ["b1", "b3", "b2"])).toBe("skip");
    // shapes: tipped and skinny toys get their own hint; otherwise the shape's corner rule
    const firstTipped = (e: Exercise) => { if (e.answer.kind !== "match") return false; const t = parseToy(e.answer.items[0]!.art); return isTipped(t.shape, t.rot) && !t.skinny; };
    const sortTipped = find("sort", firstTipped);
    if (sortTipped.answer.kind !== "match") throw new Error("match");
    const st = sortTipped.answer;
    const first = st.items[0]!.id;
    expect(diagnoseSort(sortTipped, { ...st.pairs, [first]: st.targets.find((h) => h.id !== st.pairs[first])!.id })).toBe("tipped");
    if (bathTutorial.answer.kind !== "match") throw new Error("match");
    const tut = bathTutorial.answer;
    const swapped = Object.fromEntries(tut.items.map((i) => [i.id, tut.targets.find((t) => t.id !== tut.pairs[i.id])!.id]));
    expect(diagnoseSort(bathTutorial, swapped)).toBe(parseToy(tut.items[0]!.art).shape);
    const findUpright = find("find", (e) => diagnoseFind(e) === "triangle");
    expect(findUpright.objectKind).toBe("triangle");
    expect(all.some((e) => modeOf(e) === "find" && diagnoseFind(e) === "tipped")).toBe(true);
    expect(all.some((e) => modeOf(e) === "find" && diagnoseFind(e) === "skinny")).toBe(true);
  });

  it("first miss → hintStage 1 with a diagnosed helper line; second miss → modelled answer; the model is submittable", () => {
    for (const m of ["look", "compare", "find", "size", "sort", "parade"] as Mode[]) {
      // choices: one with three options, so a second wrong answer is still possible after the first is greyed out
      const ex = find(m, (e) => e.answer.kind !== "choice" || e.answer.options.length >= 3);
      let s = initExercise(ex);
      const a = ex.answer;
      const wrong: AnswerValue[] =
        a.kind === "number" ? (a.choices ?? []).filter((c) => c !== a.value).slice(0, 2)
        : a.kind === "choice" ? a.options.filter((o) => o.id !== a.correct).map((o) => o.id).slice(0, 2)
        : a.kind === "sequence" ? [[...a.order].reverse(), [...a.order].reverse()]
        : a.kind === "match" ? [Object.fromEntries(a.items.map((it) => [it.id, a.targets.find((t) => t.id !== a.pairs[it.id])!.id])), Object.fromEntries(a.items.map((it) => [it.id, a.targets.find((t) => t.id !== a.pairs[it.id])!.id]))]
        : [];
      s = submit(s, wrong[0]!);
      expect(s.attempts, `${m} first wrong answer counted`).toBe(1);
      expect(s.hintStage).toBe(1);
      const line = hintFor({ ...s, phase: "feedback" });
      lineExists(line);
      expect(line, m).toMatch(/^gb\.hint\./);
      s = submit(s, wrong[1] ?? wrong[0]!);
      expect(s.hintStage, m).toBe(2);
      expect(s.model, m).not.toBeNull();
      s = submit(s, s.model!);
      expect(s.phase, m).toBe("solved");
      expect(alongStepsFor(ex), m).toBeGreaterThan(0);
    }
  });

  it("every line the world can say exists, its variables are pre-rendered, and praise is about process", () => {
    const ids = new Set<string>(["gb.ready", "gb.back", "gb.check", "gb.idle", "gb.retry", "gb.hint.show", "gb.hint.countAlong", "gb.hint.yourTurn"]);
    for (const ex of [bathTutorial, ...all]) {
      const promptVars = { ...ex.prompt?.vars, kind: ex.objectKind, ...(ex.answer.kind === "number" ? { n: ex.answer.value } : {}) };
      expect(VOICE_LINES[ex.prompt!.line], ex.prompt!.line).toBeDefined();
      const vary = VOICE_LINES[ex.prompt!.line]!.vary ?? {};
      for (const [k, vals] of Object.entries(vary)) expect(vals, `${ex.id} ${k}`).toContain((promptVars as Record<string, unknown>)[k]);
      expect(renderLine(ex.prompt!.line, promptVars), ex.id).toBe(ex.prompt!.text); // the pill says what the voice says
      ids.add(explainFor(ex));
      const praiseVars: Record<string, string | number> = { ...ex.params, kind: ex.objectKind, ...(ex.answer.kind === "number" ? { n: ex.answer.value } : {}) };
      for (const p of praiseFor(ex)) {
        ids.add(p);
        for (const [k, vals] of Object.entries(VOICE_LINES[p]?.vary ?? {})) expect(vals, `${p} ${k} for ${ex.id}`).toContain(praiseVars[k]);
        expect(voiceKey(p, praiseVars)).toBeTruthy();
      }
      for (let i = 0; i < alongStepsFor(ex); i++) {
        const say = alongSayFor(ex, i);
        if (say !== null) expect(say).toBeLessThanOrEqual(5);
      }
    }
    for (const id of ["tooMany", "tooFew"]) ids.add(`gb.hint.look.${id}`);
    for (const ex of all) { const idle = idleFor(ex); if (idle) ids.add(idle); }
    ids.add("gb.parade.howMany");
    for (const id of ["same", "notSame", "long", "fewer", "more"]) ids.add(`gb.hint.compare.${id}`);
    for (const id of ["reverse", "middle", "start"]) ids.add(`gb.hint.size.${id}`);
    for (const id of ["circle", "square", "triangle", "tipped", "skinny", "lopsided"]) ids.add(`gb.hint.shape.${id}`);
    for (const id of ["numbers", "skip", "last"]) ids.add(`gb.hint.parade.${id}`);
    for (const id of ids) lineExists(id);
    const mine = Object.entries(VOICE_LINES).filter(([id]) => id.startsWith("gb."));
    expect(mine.length).toBeGreaterThan(50);
    for (const [id, l] of mine) {
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      if (id.startsWith("gb.praise")) expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|fast|quick/);
    }
  });

  it("each inner game is explained the first time it appears in a round (runner rule + this world's key)", () => {
    const round = buildRound(bubbleBath, { level: 3, seed: 5 });
    const pick = (m: string) => round.exercises.find((e) => innerGameKey(e) === m)!;
    const look = pick("look");
    const look2 = round.exercises.find((e) => innerGameKey(e) === "look" && e.id !== look.id)!;
    const size = pick("size");
    expect(shouldExplain(look, [look.id], round.exercises, 0, innerGameKey)).toBe(true); // round start
    expect(shouldExplain(size, [look.id, size.id], round.exercises, 1, innerGameKey)).toBe(true); // a new game mid-round
    expect(shouldExplain(look2, [look.id, size.id, look2.id], round.exercises, 2, innerGameKey)).toBe(false); // seen already
    expect(shouldExplain(size, [look.id, size.id], round.exercises, 1)).toBe(false); // no key: only the first item (old behaviour)
    expect(innerGameKey(round.exercises.find((e) => modeOf(e) === "parade")!)).toBe("parade-count");
  });

  it("stepUpAfter 3: a first-try level-0 round meets at most two new inner games (each explained), and still reaches level + 3 for U1", () => {
    expect(bubbleBath.progression.stepUpAfter).toBe(3);
    const round = buildRound(bubbleBath, { level: 0, seed: 1 });
    let p = initialProgression(bubbleBath.progression, 1);
    const keys = new Set<string>();
    let top = 0;
    for (let k = 0; k < BAND; k++) {
      const ex = selectNextExercise(round, p, bubbleBath.progression)!;
      keys.add(GAME_OF[modeOf(ex)]);
      top = Math.max(top, ex.difficulty);
      p = applyResult({ ...p, played: [...p.played, ex.id] }, { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }, bubbleBath.progression);
    }
    const fresh = [...keys].filter((g) => g !== "shape-splash" && g !== "bubble-parade");
    expect(fresh.length).toBeLessThanOrEqual(2);
    expect(top).toBe(3);
  });

  it("layout helpers: grids never go below 64 px cells; duck rows stay inside the tub", () => {
    for (const [n, w, h] of [[4, 600, 80], [3, 300, 500], [5, 900, 400], [2, 120, 70]] as const) expect(gridFor(n, w, h).cell).toBeGreaterThanOrEqual(64);
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (const spread of [false, true]) {
      const r = duckRow(a, b, spread, a <= b);
      expect(r.xs).toHaveLength(a);
      for (const x of r.xs) {
        expect(x - r.width / 2).toBeGreaterThanOrEqual(-0.01);
        expect(x + r.width / 2).toBeLessThanOrEqual(100.01);
      }
    }
  });
});
