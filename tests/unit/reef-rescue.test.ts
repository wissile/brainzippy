import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { correctValue, lintExercise, validateAnswer } from "../../src/engine/validation";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { AnswerValue, Exercise } from "../../src/engine/types";
import { renderLine, VOICE_LINES } from "../../src/audio/voiceLines";
import { checkRegistry, getLibrary, getSkill, getWorld, isPlayable } from "../../src/content";
import { reefRescue, reefTutorial } from "../../src/games/reef-rescue/definition";
import {
  ACTIONS,
  ANIMALS,
  CHAINS3,
  CHAINS4,
  EATS,
  FACT_QS,
  GRAZERS,
  HOME_IDS,
  HOME_ITEMS,
  HOME_SETS_L0,
  HOME_SETS_L1,
  PLANT_COUNT,
  STORIES,
  USUAL_HIGH,
  ZONES,
  type ChainId,
  type HomeItemId,
  type ZoneId,
  chainValid,
  chartOk,
  eatsFood,
  homesFor,
  hottestWeek,
  riskiestRun,
  runId,
  runsOf,
  weeksAbove,
  wrongFoods,
  zoneMeets,
  zonesForL0,
} from "../../src/games/reef-rescue/facts";
import { MODE, REEF_LEVELS, REEF_MAX_LEVEL, SKILL, eatsAnimalIndex, modeOf } from "../../src/games/reef-rescue/generator";
import { FRAG_IDS, allowed, explain, keepAfterMiss, modelPlacement, placeCard, sceneOf, stepsOf, submission } from "../../src/games/reef-rescue/logic";
import { explainFor, hintFor, praiseFor } from "../../src/games/reef-rescue/ReefRescue";
import voice from "../../src/games/reef-rescue/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const byLevel = (level: number) => SEEDS.flatMap((seed) => generateBand(reefRescue, level, seed, 8));
const LEVELS = Array.from({ length: REEF_MAX_LEVEL + 1 }, (_, l) => byLevel(l));
const ALL = LEVELS.flat();

/** Arrange the board exactly as the answer says (what a perfect child does), through the board's own model. */
function solvedPlacement(ex: Exercise) {
  const s = sceneOf(ex);
  const steps = stepsOf(s, ex);
  return { s, place: modelPlacement(s, correctValue(ex.answer), steps) };
}

describe("Reef ecosystem fact table", () => {
  it("producers get energy from the sun; every chain link is food → eater; every authored chain is valid", () => {
    expect(EATS.algae).toEqual(["sun"]);
    expect(EATS.seagrass).toEqual(["sun"]);
    for (const c of [...CHAINS3, ...CHAINS4]) expect(chainValid(c), c.join(">")).toBe(true);
    expect(chainValid(["algae", "parrotfish"])).toBe(false); // must start with the sun
    expect(chainValid(["sun", "parrotfish", "algae"])).toBe(false); // reversed arrows
    expect(chainValid(["sun", "algae", "shark"])).toBe(false); // sharks don't eat algae
  });
  it("a food question never offers, as a wrong answer, something the animal really eats", () => {
    for (const a of ANIMALS) {
      expect(wrongFoods(a)).not.toContain(a.food);
      for (const f of a.alsoEats) expect(wrongFoods(a)).not.toContain(f);
      expect(wrongFoods(a).length).toBeGreaterThanOrEqual(2);
    }
    expect(ANIMALS.find((a) => a.id === "turtle")!.alsoEats).toContain("algae");
  });
  it("habitat needs: each item has exactly one meeting zone; deep, dark water meets nobody's needs", () => {
    for (const id of HOME_IDS) expect(homesFor(id), id).toHaveLength(1);
    expect(homesFor("coral")).toEqual(["rock"]);
    expect(homesFor("seagrass")).toEqual(["sand"]);
    expect(homesFor("cucumber")).toEqual(["sand"]);
    expect(homesFor("shrimp")).toEqual(["crevice"]);
    expect(HOME_IDS.some((i) => zoneMeets("deep", i))).toBe(false);
    for (const set of HOME_SETS_L0) {
      const zones = zonesForL0(set);
      expect(zones).toHaveLength(3);
      expect(zones).toContain("deep");
      for (const it of set) expect(homesFor(it, zones)).toHaveLength(1);
    }
  });
  it("chart model: runs above the line, the riskiest run is the longest with the most heat", () => {
    const t = [27, 30, 31, 30, 31, 27, 28, 32, 30, 27, 26, 28];
    const runs = runsOf(t);
    expect(runs.map((r) => [r.start, r.end, r.heat])).toEqual([[1, 4, 6], [7, 8, 4]]);
    expect(riskiestRun(t)?.start).toBe(1);
    expect(hottestWeek(t)).toBe(7);
    expect(weeksAbove(t)).toBe(6);
    expect(chartOk(t)).toBe(true);
    // a long spell of 30s beaten on heat by a short hot spell is not a fair chart
    expect(chartOk([27, 30, 30, 30, 27, 32, 31, 27, 27, 27, 27, 27])).toBe(false);
    expect(chartOk([27, 29, 31, 30, 27, 32, 27, 27, 27, 27, 27, 27])).toBe(false); // 29 sits on the line
  });
});

describe("Reef Rescue generator", () => {
  it("has 10 levels (0–9); the tutorial is 'the parrotfish eats algae' with a pointing hand", () => {
    expect(REEF_LEVELS).toHaveLength(10);
    expect(reefRescue.progression.maxLevel).toBe(9);
    expect(reefTutorial.tutorial).toBe(true);
    expect(reefTutorial.difficulty).toBe(1);
    expect(reefTutorial.answer).toMatchObject({ kind: "choice", correct: "algae" });
    expect(lintExercise(reefTutorial)).toEqual([]);
  });
  it("is deterministic: same seed → same round", () => {
    for (const level of [0, 4, 9]) {
      const a = buildRound(reefRescue, { level, seed: 77 });
      const b = buildRound(reefRescue, { level, seed: 77 });
      expect(a.exercises).toEqual(b.exercises);
      expect(buildRound(reefRescue, { level, seed: 78 }).exercises).not.toEqual(a.exercises);
    }
  });
  it("every level × 60 seeds lints, uses its level's declared skill, has unique ids; the correct answer validates", () => {
    LEVELS.forEach((items, level) => {
      const ids = new Set<string>();
      for (const ex of items) {
        expect(lintExercise(ex), ex.id).toEqual([]);
        expect(ex.skillId).toBe(REEF_LEVELS[level]!.skill);
        expect(getSkill(ex.skillId), ex.skillId).toBeDefined();
        expect(validateAnswer(ex.answer, correctValue(ex.answer)).correct).toBe(true);
        ids.add(ex.id);
      }
      for (let n = 0; n < 8; n++) expect(SEEDS.every((seed) => generateBand(reefRescue, level, seed, 8)[n]!.id.endsWith(`l${level}n${n}`))).toBe(true);
      expect(ids.size).toBeGreaterThan(1);
    });
  });
  it("modes follow the level table", () => {
    LEVELS.forEach((items, level) => {
      items.forEach((ex, k) => expect(modeOf(ex.params)).toBe(REEF_LEVELS[level]!.mode(k % 8)));
    });
  });
});

describe("Reef Rescue: every generated item is solvable and true to the fact table", () => {
  it("levels 0–1 food: the answer is the animal's food, no wrong option is something it eats; L0 2 options, L1 3; a band covers ≥ 4 animals", () => {
    for (const level of [0, 1]) {
      for (const seed of SEEDS) {
        const band = generateBand(reefRescue, level, seed, 8);
        const eats = band.filter((e) => modeOf(e.params) === "eats");
        expect(new Set(eats.map((e) => e.params!.a)).size).toBeGreaterThanOrEqual(4);
        for (const ex of eats) {
          const a = ANIMALS[ex.params!.a!]!;
          if (ex.answer.kind !== "choice") throw new Error("eats must be a choice");
          expect(ex.answer.correct).toBe(a.food);
          expect(ex.answer.options).toHaveLength(level === 0 ? 2 : 3);
          for (const o of ex.answer.options) if (o.id !== a.food) expect(wrongFoods(a)).toContain(o.id);
        }
      }
    }
    expect(new Set([0, 1, 3, 4, 6, 7].map(eatsAnimalIndex)).size).toBe(6);
  });
  it("levels 0–1 habitats: each species' target zone meets all its needs and no other offered zone does", () => {
    for (const ex of [...LEVELS[0]!, ...LEVELS[1]!].filter((e) => modeOf(e.params) === "home")) {
      if (ex.answer.kind !== "match") throw new Error("home must be a match");
      const zones = ex.answer.targets.map((t) => t.id as ZoneId);
      expect(zones.length).toBe(ex.params!.lv === 0 ? 3 : 4);
      for (const it of ex.answer.items) {
        const target = ex.answer.pairs[it.id] as ZoneId;
        expect(zoneMeets(target, it.id as HomeItemId)).toBe(true);
        expect(homesFor(it.id as HomeItemId, zones)).toEqual([target]);
      }
    }
    expect(HOME_SETS_L1.every((s) => s.length === 3)).toBe(true);
  });
  it("levels 2–3 chains: the answer is a valid chain from the sun; a reversed or shark-swapped order is not", () => {
    for (const level of [2, 3]) {
      for (const ex of LEVELS[level]!) {
        if (ex.answer.kind !== "sequence") throw new Error("chain");
        const order = ex.answer.order as ChainId[];
        expect(order).toHaveLength(level === 2 ? 3 : 4);
        expect(chainValid(order)).toBe(true);
        expect(validateAnswer(ex.answer, [...order].reverse()).correct).toBe(false);
        // exactly one ordering of the pieces is a valid chain of the right length
        const pieces = ex.answer.pieces.map((p) => p.id as ChainId);
        const perms = permutations(pieces, order.length).filter((p) => chainValid(p));
        expect(perms.map((p) => p.join())).toEqual([order.join()]);
      }
    }
  });
  it("level 4 coral facts: answers follow NOAA (animal; algae give food and colour; coral gives a home; algae need light)", () => {
    expect(FACT_QS.map((f) => f.correct)).toEqual(["animal", "food", "home", "sun"]);
    const qs = new Set(LEVELS[4]!.map((e) => e.params!.q));
    expect(qs.size).toBe(4);
  });
  it("level 5 stories: bleaching is warm → algae out → white → weak; the 'bleach chemicals' card never belongs; recovery is hopeful", () => {
    expect(STORIES[0]!.order).toEqual(["warm", "expel", "white", "weak"]);
    for (const ex of LEVELS[5]!) {
      if (ex.answer.kind !== "sequence") throw new Error("story");
      const st = STORIES[ex.params!.s!]!;
      expect(ex.answer.pieces.map((p) => p.id).sort()).toEqual([...st.order, st.distractor].sort());
      expect(ex.answer.order).not.toContain(st.distractor);
    }
    expect(STORIES[1]!.order[0]).toBe("cool");
  });
  it("level 6 sorting: 6 cards, ≥ 2 helps and ≥ 2 harms, pairs follow the action table", () => {
    for (const ex of LEVELS[6]!) {
      if (ex.answer.kind !== "match") throw new Error("sort");
      expect(ex.answer.items).toHaveLength(6);
      const vals = Object.values(ex.answer.pairs);
      expect(vals.filter((v) => v === "help").length).toBeGreaterThanOrEqual(2);
      expect(vals.filter((v) => v === "harm").length).toBeGreaterThanOrEqual(2);
      for (const [id, t] of Object.entries(ex.answer.pairs)) expect(t).toBe(ACTIONS[id as keyof typeof ACTIONS].helps ? "help" : "harm");
    }
    expect(ACTIONS.touch.helps).toBe(false);
  });
  it("level 7 grazers: the answer is exactly the algae eaters among 5 animals; the reef shark is always offered", () => {
    for (const ex of LEVELS[7]!) {
      if (ex.answer.kind !== "set") throw new Error("grazers");
      expect(ex.answer.options).toHaveLength(5);
      const ids = ex.answer.options.map((o) => o.id);
      expect(ids).toContain("shark");
      expect([...ex.answer.correct].sort()).toEqual(ids.filter((id) => (GRAZERS as readonly string[]).includes(id)).sort());
      for (const g of ex.answer.correct) expect(eatsFood(g as ChainId, "algae")).toBe(true);
    }
  });
  it("level 8 planting: exactly 4 good spots out of 8, each bad spot has one problem, all four problems appear", () => {
    for (const ex of LEVELS[8]!) {
      if (ex.answer.kind !== "set") throw new Error("plant");
      const s = sceneOf(ex);
      expect(s.conds!.filter((c) => c === "good")).toHaveLength(PLANT_COUNT);
      expect(new Set(s.conds!.filter((c) => c !== "good"))).toEqual(new Set(["deep", "shade", "algae", "sand"]));
      expect([...ex.answer.correct].sort()).toEqual(s.targets.filter((t) => t.cond === "good").map((t) => t.id).sort());
    }
  });
  it("level 9 charts: fair charts; the riskiest spell is unique, longest and hottest-in-total; distinct from the hottest week in ≥ 50% of risk items", () => {
    const risk = LEVELS[9]!.filter((e) => modeOf(e.params) === "risk");
    let distinct = 0;
    for (const ex of LEVELS[9]!) {
      const s = sceneOf(ex);
      expect(chartOk(s.temps!), s.temps!.join()).toBe(true);
      expect(s.temps!.every((t) => t >= 26 && t <= 32)).toBe(true);
      if (ex.answer.kind === "choice") {
        const best = riskiestRun(s.temps!)!;
        expect(ex.answer.correct).toBe(runId(best));
        expect(ex.answer.options.map((o) => o.id)).toEqual(s.runs!.map(runId));
        if (!best.hottest) distinct++;
      } else if (ex.answer.kind === "number") {
        expect(ex.answer.value).toBe(weeksAbove(s.temps!));
        expect(ex.params!.line).toBe(USUAL_HIGH);
      } else throw new Error("chart");
    }
    expect(distinct / risk.length).toBeGreaterThanOrEqual(0.5);
    expect(distinct).toBeLessThan(risk.length); // sometimes the hottest week IS in the longest spell
  });
});

describe("Reef Rescue board model (drag, tap-tap and keyboard all use placeCard)", () => {
  it("the solved arrangement of every generated item submits the correct answer", () => {
    for (const ex of [reefTutorial, ...ALL]) {
      const { s, place } = solvedPlacement(ex);
      const pick = s.mode === "risk" || s.mode === "count" ? (correctValue(ex.answer) as string | number) : null;
      const v = submission(s, place, pick);
      expect(v, ex.id).not.toBeNull();
      expect(validateAnswer(ex.answer, v!).correct, ex.id).toBe(true);
      expect(explain(s, v, true).length).toBeGreaterThan(5);
    }
  });
  it("one-card slots swap; zones and bins hold many; nothing submits until complete", () => {
    const chain = LEVELS[3]![0]!;
    const s = sceneOf(chain);
    let p = placeCard(s, {}, "sun", "slot-0");
    p = placeCard(s, p, "algae", "slot-0"); // sun goes back to the shelf
    expect(p).toEqual({ algae: "slot-0" });
    p = placeCard(s, p, "sun", "slot-1");
    p = placeCard(s, p, "sun", "slot-0"); // move within the strip: swap
    expect(p).toEqual({ sun: "slot-0", algae: "slot-1" });
    expect(submission(s, p, null)).toBeNull();
    const sort = sceneOf(LEVELS[6]![0]!);
    let q = {};
    for (const c of sort.cards) q = placeCard(sort, q, c.id, "help");
    expect(Object.keys(q)).toHaveLength(6);
    expect(submission(sort, q, null)).not.toBeNull();
    const plant = sceneOf(LEVELS[8]![0]!);
    let r = placeCard(plant, {}, FRAG_IDS[0]!, "slot-a");
    expect(submission(plant, r, null)).toBeNull(); // needs all 4 pieces
    r = placeCard(plant, r, FRAG_IDS[0]!, "shelf");
    expect(r).toEqual({});
  });
  it("first miss: wrong cards float back, right parts stay; second miss: the model is placed and only it submits", () => {
    const ex = LEVELS[3]![1]!;
    const s = sceneOf(ex);
    const order = correctValue(ex.answer) as string[];
    const wrong = [order[0]!, order[2]!, order[1]!, order[3]!];
    let st = initExercise(ex);
    st = exerciseReducer(st, { type: "SUBMIT", value: wrong });
    expect(st.hintStage).toBe(1);
    const place = Object.fromEntries(wrong.map((id, i) => [id, `slot-${i}`]));
    expect(keepAfterMiss(s, place, st.check?.parts)).toEqual({ [order[0]!]: "slot-0", [order[3]!]: "slot-3" });
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: wrong });
    expect(st.hintStage).toBe(2);
    expect(st.model).toEqual(order);
    const m = modelPlacement(s, st.model, stepsOf(s, ex));
    expect(submission(s, m, null)).toEqual(order);
    expect(allowed(order, st.eliminated, st.model, true)).toBe(true);
    expect(allowed(wrong, st.eliminated, st.model, true)).toBe(false);
    // match: object model compare
    const sortEx = LEVELS[6]![0]!;
    const pairs = correctValue(sortEx.answer) as Record<string, string>;
    expect(allowed({ ...pairs }, [], pairs)).toBe(true);
    const flipped = Object.fromEntries(Object.entries(pairs).map(([k, v], i) => [k, i === 0 ? (v === "help" ? "harm" : "help") : v]));
    expect(allowed(flipped, [], pairs)).toBe(false);
  });
  it("first miss on a choice greys out the wrong food; on the plant frame the wrong spot", () => {
    const ex = LEVELS[1]![0]!;
    if (ex.answer.kind !== "choice") throw new Error();
    const wrong = ex.answer.options.find((o) => o.id !== (ex.answer as { correct: string }).correct)!.id;
    const st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong });
    expect(st.eliminated).toEqual([wrong]);
    const pe = LEVELS[8]![0]!;
    const ps = sceneOf(pe);
    const bad = ps.targets.find((t) => t.cond !== "good")!.id;
    const good = ps.targets.filter((t) => t.cond === "good").map((t) => t.id).slice(0, 3);
    const st2 = exerciseReducer(initExercise(pe), { type: "SUBMIT", value: [...good, bad] as AnswerValue });
    expect(st2.eliminated).toEqual([bad]);
    expect(explain(ps, [...good, bad], false)).toMatch(/dark|shade|smother|bury/);
  });
});

describe("Reef Rescue voice and registry", () => {
  it("every line the world can speak exists, with vary covering every value; ≤ 20 words; process praise; no doom words", () => {
    const used = new Set<string>(["rr.ready", "rr.back", "rr.idle", "rr.retry.1", "rr.hint.model", "rr.hint.check", "rr.coach.check"]);
    for (const n of ["1", "2", "3", "4"]) used.add(`rr.intro${n}`);
    for (const n of ["2", "4", "6"]) used.add(`rr.between${n}`);
    for (const n of ["1", "2", "3"]) used.add(`rr.outro${n}`);
    for (const ex of [reefTutorial, ...ALL]) {
      const p = ex.prompt!;
      used.add(p.line);
      expect(lines[p.line], p.line).toBeDefined();
      for (const [k, v] of Object.entries(p.vars ?? {})) expect(lines[p.line]!.vary?.[k], `${p.line} ${k}`).toContain(v);
      expect(renderLine(p.line, { ...p.vars })).not.toMatch(/\{/);
      used.add(explainFor(ex));
      for (const id of praiseFor(ex)) used.add(id);
      const s = sceneOf(ex);
      const tries: AnswerValue[] =
        ex.answer.kind === "choice" ? ex.answer.options.map((o) => o.id) :
        ex.answer.kind === "number" ? [...(ex.answer.choices ?? [])] :
        ex.answer.kind === "set" ? ex.answer.options.map((o) => [o.id]) :
        ex.answer.kind === "sequence" ? [[...ex.answer.order].reverse(), ex.answer.pieces.map((x) => x.id).slice(0, ex.answer.order.length)] :
        ex.answer.kind === "match" ? [Object.fromEntries(ex.answer.items.map((it) => [it.id, (ex.answer as unknown as { targets: { id: string }[] }).targets[0]!.id]))] : [];
      for (const v of tries) {
        used.add(hintFor({ ...initExercise(ex), lastAnswer: v, attempts: 1 }));
        expect(explain(s, v, false)).not.toMatch(/undefined/);
      }
    }
    for (const id of used) expect(VOICE_LINES[id], id).toBeDefined();
    for (const id of Object.keys(lines)) expect(used.has(id), `unused line ${id}`).toBe(true);
    for (const [id, l] of Object.entries(lines)) {
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(20); // spec helper lines for ages 8–12 run to 20 words
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|proven|dying|dead|doom|destroy|your fault/);
    }
    expect(lines["rr.prompt.eats"]!.vary!.animal!.sort()).toEqual(ANIMALS.map((a) => a.name).sort());
  });

  it("the nature library is live with Reef Rescue playable; the registry is clean", () => {
    expect(checkRegistry()).toEqual([]);
    expect(getLibrary("nature")?.status).toBe("live");
    const w = getWorld("reef-rescue")!;
    expect(w.subject).toBe("nature");
    expect(isPlayable(w)).toBe(true);
    expect(w.maxLevel).toBe(reefRescue.progression.maxLevel);
    for (const id of Object.values(SKILL)) expect(getSkill(id), id).toBeDefined();
    expect(MODE.eats).toBe(0);
    expect(Object.keys(ZONES)).toHaveLength(4);
    expect(Object.keys(HOME_ITEMS)).toHaveLength(4);
  });
});

function permutations<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)], k - 1).map((p) => [x, ...p]));
}
