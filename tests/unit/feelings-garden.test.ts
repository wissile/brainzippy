import { describe, expect, it } from "vitest";
import { getSkill, getWorld } from "../../src/content/registry";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { correctKeys, isSubmittable, lintExercise, validateAnswer } from "../../src/engine/validation";
import { ACTIONS, FEELINGS, FRIENDS, PROPS, SCENARIOS, TUTORIAL, isAction, isFeeling } from "../../src/games/feelings-garden/bank";
import { feelingsGarden, gardenTutorial } from "../../src/games/feelings-garden/definition";
import { BY_LEVEL, FG_LEVELS, FG_MAX_LEVEL, generateFeelingsGarden } from "../../src/games/feelings-garden/generator";
import { EXPLAIN_BY_LEVEL, acceptedByFriend, hintFor, modelLine, optionLine, praiseFor, scenarioOf } from "../../src/games/feelings-garden/logic";
import voice from "../../src/games/feelings-garden/voice.json";

const LINES = voice.lines as Record<string, { text: string; vary?: Record<string, string[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => 3000 + i * 7919);
const ALL = [TUTORIAL, ...SCENARIOS];
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

function allGenerated(): Exercise[] {
  const out: Exercise[] = [];
  for (let level = 0; level <= FG_MAX_LEVEL; level++) for (const seed of SEEDS) out.push(...generateBand(feelingsGarden, level, seed, 8));
  return out;
}
const GENERATED = allGenerated();
const accepted = (ex: Exercise) => acceptedByFriend(ex);

describe("engine: several right answers (choice.also, match.accept)", () => {
  const choice = { kind: "choice" as const, correct: "sad", also: ["angry"], options: [{ id: "sad", text: "Sad" }, { id: "angry", text: "Angry" }, { id: "happy", text: "Happy" }] };
  it("any accepted option is correct; the others are not; the model keeps every accepted option", () => {
    expect(validateAnswer(choice, "sad").correct).toBe(true);
    expect(validateAnswer(choice, "angry").correct).toBe(true);
    expect(validateAnswer(choice, "happy")).toEqual({ correct: false, reason: "wrong-choice" });
    expect(correctKeys(choice)).toEqual(["sad", "angry"]);
    const ex = { ...gardenTutorial, answer: choice };
    let s = initExercise(ex);
    s = exerciseReducer(s, { type: "SUBMIT", value: "happy" });
    expect(s.eliminated).toEqual(["happy"]);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: "happy" });
    expect(s.phase).toBe("answering"); // an eliminated option is ignored, never counted as wrong
    expect(s.attempts).toBe(1);
  });
  it("match.accept: each item may take any of its accepted targets; parts mark each item", () => {
    const m = {
      kind: "match" as const,
      pairs: { rumble: "happy", puff: "disappointed" },
      accept: { puff: ["sad"] },
      items: [{ id: "rumble", text: "Rumble" }, { id: "puff", text: "Puff" }],
      targets: ["happy", "disappointed", "sad", "angry"].map((id) => ({ id, text: id })),
    };
    expect(validateAnswer(m, { rumble: "happy", puff: "sad" }).correct).toBe(true);
    expect(validateAnswer(m, { rumble: "sad", puff: "sad" })).toMatchObject({ correct: false, parts: { rumble: false, puff: true } });
    expect(isSubmittable(m, { rumble: "happy", puff: "nope" })).toBe(false);
  });
  it("lint catches broken also/accept data", () => {
    const base = { ...gardenTutorial };
    expect(lintExercise({ ...base, answer: { ...choice, also: ["zzz"] } })).toContain(`${base.id}: also uses unknown option`);
    expect(lintExercise({ ...base, answer: { ...choice, also: ["sad"] } })).toContain(`${base.id}: also repeats a correct option`);
    expect(lintExercise({ ...base, answer: { ...choice, also: ["angry", "happy"] } })).toContain(`${base.id}: at least one option must be not correct`);
    const m = { kind: "match" as const, pairs: { a: "x" }, accept: { a: ["q"] }, items: [{ id: "a", text: "a" }, { id: "b", text: "b" }], targets: [{ id: "x", text: "x" }, { id: "y", text: "y" }] };
    expect(lintExercise({ ...base, answer: { ...m, pairs: { a: "x", b: "y" } } })).toContain(`${base.id}: accept uses unknown or repeated ids`);
  });
});

describe("feelings garden: scenario bank", () => {
  it("ids are unique; every option is a known feeling or idea; accepted ⊂ options; at least one option does not fit", () => {
    expect(new Set(ALL.map((s) => s.id)).size).toBe(ALL.length);
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(60);
    for (const s of ALL) {
      expect(new Set(s.options).size, s.id).toBe(s.options.length);
      for (const o of s.options) expect(isFeeling(o) || isAction(o), `${s.id} ${o}`).toBe(true);
      for (const a of s.accepted) expect(s.options, `${s.id} accepts ${a}`).toContain(a);
      for (const a of s.second?.accepted ?? []) expect(s.options, `${s.id} second accepts ${a}`).toContain(a);
      const fits = new Set([...s.accepted, ...(s.second?.accepted ?? [])]);
      expect(s.options.some((o) => !fits.has(o)), `${s.id} needs an option that does not fit`).toBe(true);
      if (s.prop) expect(PROPS).toContain(s.prop);
    }
  });

  it("levels follow the spec: option counts, cue, view, accepted counts, kinds of options", () => {
    for (const s of SCENARIOS) {
      const spec = FG_LEVELS[s.level]!;
      expect(s.cue, s.id).toBe(spec.cue);
      expect(s.options.length, s.id).toBe(spec.options);
      expect(s.accepted.length, s.id).toBeLessThanOrEqual(spec.maxAccepted);
      expect(s.accepted.length, s.id).toBeGreaterThanOrEqual(1);
      if (s.level <= 2 || s.level >= 5) expect(s.view, s.id).toBe("front");
      if (s.level === 3 || s.level === 4) expect(s.view, s.id).toBe("back");
      if (s.level === 4) expect(s.prop, s.id).toBeNull();
      else expect(s.prop, s.id).not.toBeNull();
      if (s.level === 0) expect([...s.options].sort(), s.id).toEqual(["happy", "sad"]);
      if (s.level <= 4) for (const o of s.options) expect(["happy", "sad", "angry", "scared", "surprised"], `${s.id} ${o}`).toContain(o);
      if (s.level === 2) expect([...s.options].sort(), s.id).toEqual(["angry", "happy", "sad", "scared"]);
      if (s.level === 5 || s.level === 6) for (const o of s.options) expect(isAction(o), s.id).toBe(true);
      if (s.level === 5 || s.level === 6) for (const o of s.options) expect(ACTIONS[o as keyof typeof ACTIONS].kind, `${s.id} ${o}`).toBe(s.accepted.includes(o));
      if (s.level === 7) expect(s.accepted.some((a) => ["frustrated", "proud", "nervous", "excited", "disappointed", "lonely"].includes(a)), s.id).toBe(true);
      if (s.level === 8) {
        expect(s.second, s.id).toBeDefined();
        expect(s.second!.friend).not.toBe(s.friend);
        // perspective: the two friends' first feelings differ
        expect(s.second!.accepted![0]).not.toBe(s.accepted[0]);
      } else expect(s.second, s.id).toBeUndefined();
      // a front-view face item: the face drawn is one of the accepted feelings (the clue never contradicts the answer)
      if (s.view === "front" && s.cue !== "help" && s.cue !== "calm") expect(s.accepted, s.id).toContain(s.face);
      if (s.second) expect(s.second.accepted, s.id).toContain(s.second.face);
    }
  });

  it("every level has at least 8 scenarios and uses several friends and feelings", () => {
    for (let lv = 0; lv <= FG_MAX_LEVEL; lv++) {
      const pool = BY_LEVEL[lv]!;
      expect(pool.length, `level ${lv}`).toBeGreaterThanOrEqual(8);
      expect(new Set(pool.map((s) => s.friend)).size, `level ${lv}`).toBeGreaterThanOrEqual(4);
    }
    // every feeling is taught somewhere, every friend appears
    const taught = new Set(SCENARIOS.flatMap((s) => [...s.accepted, ...(s.second?.accepted ?? [])]));
    for (const f of FEELINGS) expect(taught.has(f), f).toBe(true);
    for (const f of FRIENDS) expect(SCENARIOS.some((s) => s.friend === f), f).toBe(true);
  });

  it("care: no clinical or shaming words; everyday, low-stakes situations only", () => {
    const banned = /\b(therapy|therapist|diagnos\w*|disorder|anxiety|depress\w*|trauma|abuse|bully\w*|hurt yourself|die|dead|death|divorce|hospital|sick|naughty|bad (boy|girl|kid)|stupid|smart|clever|genius|wrong)\b/i;
    for (const [id, l] of Object.entries(LINES)) expect(l.text, id).not.toMatch(banned);
    for (const s of ALL) expect(s.a11y, s.id).not.toMatch(banned);
  });
});

describe("feelings garden: generator", () => {
  it("has 9 levels (maxLevel 8) matching the registry entry", () => {
    expect(FG_LEVELS).toHaveLength(9);
    expect(feelingsGarden.progression.maxLevel).toBe(8);
    expect(getWorld("feelings-garden")?.maxLevel).toBe(8);
  });

  it("is deterministic: same level, seed and index → same exercise; same round", () => {
    for (let level = 0; level <= FG_MAX_LEVEL; level++) expect(generateFeelingsGarden(level, createRng(42), 3)).toEqual(generateFeelingsGarden(level, createRng(42), 3));
    expect(buildRound(feelingsGarden, { level: 4, seed: 9 })).toEqual(buildRound(feelingsGarden, { level: 4, seed: 9 }));
  });

  it("every exercise at every level × 60 seeds lints, uses a declared skill, and its answer matches the bank", () => {
    expect(GENERATED.length).toBe(9 * 60 * 8);
    for (const ex of GENERATED) {
      const sc = scenarioOf(ex);
      expect(lintExercise(ex), ex.id).toEqual([]);
      expect(ex.difficulty - 1, ex.id).toBe(sc.level);
      expect(ex.skillId).toBe(FG_LEVELS[sc.level]!.skill);
      expect(getSkill(ex.skillId), ex.skillId).toBeDefined();
      expect(ex.id.startsWith(`fg-${sc.id}-`)).toBe(true);
      expect(LINES[ex.prompt!.line], ex.prompt!.line).toBeDefined();
      expect(LINES[modelLine(ex)], modelLine(ex)).toBeDefined();
      for (const [friend, acc] of Object.entries(accepted(ex))) {
        for (const a of acc) {
          const value = sc.second ? { [sc.friend]: friend === sc.friend ? a : sc.accepted[0]!, [sc.second.friend]: friend === sc.second.friend ? a : sc.second.accepted![0]! } : a;
          expect(validateAnswer(ex.answer, value).correct, `${ex.id} ${friend} ${a}`).toBe(true);
        }
      }
      const opts = ex.answer.kind === "choice" ? ex.answer.options : ex.answer.kind === "match" ? ex.answer.targets : [];
      for (const o of opts) {
        expect(LINES[o.say!], o.say).toBeDefined();
        expect(o.say).toBe(optionLine(o.id));
        if (!sc.second) expect(validateAnswer(ex.answer, o.id).correct, `${ex.id} ${o.id}`).toBe(sc.accepted.includes(o.id));
      }
    }
  });

  it("a round's band never repeats a scenario, uses ≥2 friends and ≥3 feelings, never the same feeling 3 times in a row", () => {
    for (let level = 0; level <= FG_MAX_LEVEL; level++) {
      for (const seed of SEEDS) {
        const band = generateBand(feelingsGarden, level, seed, 8).map(scenarioOf);
        expect(new Set(band.map((s) => s.id)).size, `level ${level} seed ${seed}`).toBe(8);
        expect(new Set(band.map((s) => s.friend)).size).toBeGreaterThanOrEqual(2);
        if (level <= 4 || level >= 7) expect(new Set(band.map((s) => s.accepted[0])).size, `level ${level}`).toBeGreaterThanOrEqual(level <= 1 ? 2 : 3);
        for (let i = 2; i < band.length; i++) {
          const k = (j: number) => band[j]!.accepted[0];
          expect(k(i) === k(i - 1) && k(i) === k(i - 2), `level ${level} seed ${seed} at ${i}`).toBe(false);
        }
      }
    }
  });

  it("options are shuffled: the first accepted answer is not always in the same place", () => {
    for (let level = 0; level <= FG_MAX_LEVEL; level++) {
      const band = GENERATED.filter((e) => e.difficulty === level + 1);
      const spots = new Set(
        band.map((e) => {
          const a = e.answer;
          if (a.kind === "choice") return a.options.findIndex((o) => o.id === a.correct);
          if (a.kind === "match") return a.targets.findIndex((t) => t.id === Object.values(a.pairs)[0]);
          return -1;
        }),
      );
      expect(spots.size, `level ${level}`).toBeGreaterThan(1);
    }
  });

  it("buildRound gives a full round at every level; the tutorial only at level 0", () => {
    for (let level = 0; level <= FG_MAX_LEVEL; level++) {
      const r = buildRound(feelingsGarden, { level, seed: 77 });
      expect(r.exercises.length).toBeGreaterThanOrEqual(8);
      expect(r.exercises.some((e) => e.tutorial)).toBe(level === 0);
    }
    expect(lintExercise(gardenTutorial)).toEqual([]);
    expect(gardenTutorial.difficulty).toBe(1);
    expect(feelingsGarden.exercises.filter((e) => e.tutorial)).toHaveLength(1);
  });
});

describe("feelings garden: helper, hints and praise", () => {
  const find = (lv: number, pred: (e: Exercise) => boolean = () => true) => GENERATED.find((e) => e.difficulty === lv + 1 && pred(e))!;
  it("first miss names the clue to look at (never the answer)", () => {
    expect(hintFor({ exercise: find(1), lastAnswer: "x" })).toBe("fg.help.face");
    expect(hintFor({ exercise: find(4), lastAnswer: "happy" })).toBe("fg.help.body");
    expect(hintFor({ exercise: find(8), lastAnswer: {} })).toBe("fg.help.different");
    const tower = find(3, (e) => scenarioOf(e).id === "tower");
    expect(hintFor({ exercise: tower, lastAnswer: "happy" })).toBe("fg.help.okay"); // "some feelings are bad"
    expect(hintFor({ exercise: tower, lastAnswer: "scared" })).toBe("fg.help.situation");
  });
  it("a less kind idea gets a gentle 'How might … feel?' question; an unsafe one a calm, safe nudge", () => {
    const help = find(5);
    const unkind = scenarioOf(help).options.find((o) => isAction(o) && !ACTIONS[o].kind)!;
    expect(hintFor({ exercise: help, lastAnswer: unkind })).toBe("fg.hint.action");
    expect(LINES["fg.hint.action"]!.text).toMatch(/How might \{one\} feel/);
    const calm = find(6);
    const unsafe = scenarioOf(calm).options.find((o) => isAction(o) && !ACTIONS[o].kind)!;
    expect(hintFor({ exercise: calm, lastAnswer: unsafe })).toBe("fg.hint.calm");
    // the friend's name comes from objectKind: every friend has a pre-rendered variant
    expect(LINES["fg.hint.action"]!.vary!.kind).toEqual(FRIENDS.map((f) => `fg-${f}`));
    expect((voice.objects as Record<string, { one: string }>)[help.objectKind]).toBeDefined();
  });
  it("first and second miss: the chosen flower dims, then every fitting flower stays and the rest dim", () => {
    const ex = find(3, (e) => scenarioOf(e).accepted.length === 2);
    const sc = scenarioOf(ex);
    const wrong = sc.options.filter((o) => !sc.accepted.includes(o));
    let s = initExercise(ex);
    s = exerciseReducer(s, { type: "SUBMIT", value: wrong[0]! });
    expect(s.hintStage).toBe(1);
    expect(s.eliminated).toEqual([wrong[0]]);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: wrong[1]! });
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    expect(s.hintStage).toBe(2);
    expect(s.eliminated.sort()).toEqual([...wrong].sort());
    s = exerciseReducer(s, { type: "SUBMIT", value: sc.accepted[1]! }); // errorless: either fitting flower works
    expect(s.feedback?.correct).toBe(true);
  });
  it("praise is about process; explanations exist for every level; every line ≤ 14 words", () => {
    for (const ex of GENERATED.slice(0, 400)) for (const id of praiseFor(ex)) expect(LINES[id], id).toBeDefined();
    for (const id of EXPLAIN_BY_LEVEL) expect(LINES[id], id).toBeDefined();
    for (const [id, l] of Object.entries(LINES)) {
      if (id.startsWith("fg.praise")) expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|good (boy|girl)/);
      expect(words(l.text), `${id}: ${l.text}`).toBeLessThanOrEqual(14);
    }
  });
});
