import { describe, expect, it } from "vitest";
import { getSkill, getWorld } from "../../src/content/registry";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import type { Exercise } from "../../src/engine/types";
import { rhymeLanterns, rhymeTutorial } from "../../src/games/rhyme-lanterns/definition";
import { ELIGIBLE, RHYME_LEVELS, RHYME_MAX_LEVEL, generateRhymeLanterns } from "../../src/games/rhyme-lanterns/generator";
import { answerIsConsistent, correctIds, lanternsOf, modelSteps, modelWordAt, modelWords, namingWords } from "../../src/games/rhyme-lanterns/logic";
import { PICTURES } from "../../src/games/rhyme-lanterns/pictures";
import { FAMILIES, WORDS, candidates, rhymes, wordInfo } from "../../src/games/rhyme-lanterns/words";
import voice from "../../src/games/rhyme-lanterns/voice.json";

const LINES = voice.lines as Record<string, { text: string; speed?: number }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => 1000 + i * 7919);

function kindOf(target: string, w: string): "far" | "onset" | "vowel" | "rhyme" {
  const t = wordInfo(target);
  const x = wordInfo(w);
  if (t.rime === x.rime) return "rhyme";
  if (x.vowel === t.vowel) return "vowel";
  if (x.first === t.first) return "onset";
  return "far";
}

function allGenerated(): Exercise[] {
  const out: Exercise[] = [];
  for (let level = 0; level <= RHYME_MAX_LEVEL; level++) for (const seed of SEEDS) out.push(...generateBand(rhymeLanterns, level, seed, 8));
  return out;
}
const GENERATED = allGenerated();

describe("rhyme lanterns: word bank", () => {
  it("every word is unique, has an original picture, and its rime is its spelled ending", () => {
    expect(new Set(WORDS.map((w) => w.word)).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(PICTURES[w.word], w.word).toBeDefined();
      expect(w.word.endsWith(w.rime), w.word).toBe(true);
    }
    expect(Object.keys(PICTURES).sort()).toEqual(WORDS.map((w) => w.word).sort());
  });

  it("every family has at least two members; rhymes() follows families", () => {
    for (const [rime, fam] of FAMILIES) expect(fam.length, rime).toBeGreaterThanOrEqual(2);
    expect(rhymes("cat", "hat")).toBe(true);
    expect(rhymes("cat", "can")).toBe(false);
    expect(rhymes("cat", "cat")).toBe(false);
    expect(rhymes("frog", "log")).toBe(true);
    expect(rhymes("wig", "wing")).toBe(false);
  });

  it("distractor candidates never rhyme with the target and match their kind", () => {
    for (const w of WORDS) {
      for (const k of ["far", "onset", "vowel"] as const) {
        for (const c of candidates(k, w.word)) {
          expect(rhymes(w.word, c), `${w.word} ${k} ${c}`).toBe(false);
          expect(kindOf(w.word, c), `${w.word} ${k} ${c}`).toBe(k);
        }
      }
    }
    // near misses prefer the same first sound when there is one
    expect(candidates("vowel", "wig")).toEqual(["wing"]);
    expect(candidates("vowel", "snake")).toEqual(["snail"]);
  });

  it("every word has a whole-word clip line and a slowed line", () => {
    for (const w of WORDS) {
      expect(LINES[`rl.w.${w.word}`]?.text, w.word).toBe(w.word);
      expect(LINES[`rl.slow.${w.word}`]?.text, w.word).toBe(w.word);
      expect(LINES[`rl.slow.${w.word}`]?.speed, w.word).toBeLessThan(0.8);
    }
  });
});

describe("rhyme lanterns: generator", () => {
  it("has 8 levels (maxLevel 7), each with eligible targets", () => {
    expect(RHYME_LEVELS.length).toBe(8);
    expect(rhymeLanterns.progression.maxLevel).toBe(7);
    for (let l = 0; l <= RHYME_MAX_LEVEL; l++) expect(ELIGIBLE[l]!.length, `level ${l}`).toBeGreaterThanOrEqual(5);
  });

  it("is deterministic: same level, seed and index → same exercise", () => {
    for (let level = 0; level <= RHYME_MAX_LEVEL; level++) {
      const a = generateRhymeLanterns(level, createRng(42), 3);
      const b = generateRhymeLanterns(level, createRng(42), 3);
      expect(a).toEqual(b);
    }
    expect(buildRound(rhymeLanterns, { level: 4, seed: 9 })).toEqual(buildRound(rhymeLanterns, { level: 4, seed: 9 }));
  });

  it("every exercise at every level × 60 seeds lints, uses the declared skill and is correct by the rhyme rule", () => {
    expect(GENERATED.length).toBe(8 * 60 * 8);
    for (const ex of GENERATED) {
      expect(lintExercise(ex), ex.id).toEqual([]);
      expect(ex.skillId).toBe("english.phon.rhyme");
      expect(getSkill(ex.skillId)).toBeDefined();
      expect(answerIsConsistent(ex), ex.id).toBe(true);
      expect(LINES[ex.prompt!.line], ex.prompt!.line).toBeDefined();
      for (const w of [lanternsOf(ex).target, lanternsOf(ex).candidate, ...lanternsOf(ex).words]) if (w) expect(PICTURES[w], w).toBeDefined();
      if (ex.answer.kind === "choice" || ex.answer.kind === "set") for (const o of ex.answer.options) expect(LINES[o.say!], o.say).toBeDefined();
    }
  });

  it("levels follow the documented table: mode, option count and distractor kinds", () => {
    for (const ex of GENERATED) {
      const level = ex.difficulty - 1;
      const spec = RHYME_LEVELS[level]!;
      const l = lanternsOf(ex);
      expect(l.mode, ex.id).toBe(spec.mode);
      const right = correctIds(ex);
      if (spec.mode === "yesno") {
        expect(l.candidate).not.toBeNull();
        if (right[0] === "no") expect(kindOf(l.target!, l.candidate!), ex.id).toBe("far");
        continue;
      }
      // the distractors are the wrong options; in odd-one-out the "distractor" IS the answer
      const wrong = spec.mode === "odd" ? right : l.words.filter((w) => !right.includes(w));
      const kinds = wrong.map((w) => kindOf((l.target ?? ex.prompt!.vars!.a) as string, w)).sort();
      expect(kinds, ex.id).toEqual([...spec.distractors].sort());
      if (spec.mode === "pick") expect(l.words.length).toBe(spec.distractors.length + 1);
      if (spec.mode === "odd") expect(l.words.length).toBe(4);
      if (spec.mode === "chain") expect(right.length).toBe(spec.links! - 1);
      if (spec.blend) expect(wordInfo(l.target!).blend || wordInfo(right[0]!).blend, ex.id).toBe(true);
    }
  });

  it("yes/no items are balanced and a band of 8 never repeats a family when 8+ are eligible", () => {
    const yesno = GENERATED.filter((e) => e.difficulty === 1);
    const yes = yesno.filter((e) => correctIds(e)[0] === "yes").length / yesno.length;
    expect(yes).toBeGreaterThan(0.35);
    expect(yes).toBeLessThan(0.65);
    for (let level = 0; level <= RHYME_MAX_LEVEL; level++) {
      if (ELIGIBLE[level]!.length < 8) continue;
      for (const seed of SEEDS.slice(0, 20)) {
        const band = generateBand(rhymeLanterns, level, seed, 8);
        const fams = band.map((e) => wordInfo((e.prompt!.vars!.a as string)).rime);
        expect(new Set(fams).size, `level ${level} seed ${seed}`).toBe(8);
      }
    }
  });

  it("buildRound gives a full round at every level; the tutorial only at level 0", () => {
    for (let level = 0; level <= RHYME_MAX_LEVEL; level++) {
      const r = buildRound(rhymeLanterns, { level, seed: 77 });
      expect(r.exercises.length).toBeGreaterThanOrEqual(8);
      expect(r.exercises.some((e) => e.tutorial)).toBe(level === 0);
    }
  });
});

describe("rhyme lanterns: tutorial, validation and hints", () => {
  it("the tutorial is a single level-1 yes/no that lints", () => {
    expect(lintExercise(rhymeTutorial)).toEqual([]);
    expect(rhymeLanterns.exercises.filter((e) => e.tutorial)).toHaveLength(1);
    expect(rhymeTutorial.difficulty).toBe(1);
    expect(answerIsConsistent(rhymeTutorial)).toBe(true);
  });

  it("validation edge cases: unknown ids are ignored, a chain needs every rhyme and no extras", () => {
    const chain = GENERATED.find((e) => e.difficulty === 7)!;
    const right = correctIds(chain);
    const wrong = lanternsOf(chain).words.find((w) => !right.includes(w))!;
    expect(validateAnswer(chain.answer, right).correct).toBe(true);
    expect(validateAnswer(chain.answer, [...right].reverse()).correct).toBe(true);
    expect(validateAnswer(chain.answer, right.slice(0, 1)).reason).toBe("too-few");
    expect(validateAnswer(chain.answer, [...right.slice(1), wrong]).reason).toBe("too-many");
    let s = initExercise(chain);
    s = exerciseReducer(s, { type: "SUBMIT", value: ["not-a-word"] });
    expect(s.phase).toBe("answering");
    s = exerciseReducer(s, { type: "SUBMIT", value: [right[0]!, wrong] });
    expect(s.phase).toBe("feedback");
    expect(s.check?.parts).toEqual({ [right[0]!]: true, [wrong]: false });
    expect(s.eliminated).toEqual([wrong]);
  });

  it("first miss greys out the wrong lantern; second miss models the answer", () => {
    const ex = GENERATED.find((e) => e.difficulty === 3)!;
    const [answer] = correctIds(ex);
    const wrongs = lanternsOf(ex).words.filter((w) => w !== answer);
    let s = initExercise(ex);
    s = exerciseReducer(s, { type: "SUBMIT", value: wrongs[0]! });
    expect(s.hintStage).toBe(1);
    expect(s.eliminated).toEqual([wrongs[0]]);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    s = exerciseReducer(s, { type: "SUBMIT", value: wrongs[1]! });
    expect(s.hintStage).toBe(2);
    expect(s.model).toBe(answer);
  });

  it("the model says Hoot's word then its rhyme(s) slowly; odd-one-out ends with the odd word", () => {
    const pick = GENERATED.find((e) => e.difficulty === 2)!;
    expect(modelWords(pick)).toEqual([lanternsOf(pick).target, correctIds(pick)[0]]);
    expect(modelSteps(pick)).toBe(4);
    expect(modelWordAt(pick, 0)).toBe(lanternsOf(pick).target);
    expect(modelWordAt(pick, 1)).toBeNull();
    const odd = GENERATED.find((e) => e.difficulty === 5)!;
    const mw = modelWords(odd);
    expect(mw).toHaveLength(4);
    expect(mw[3]).toBe(correctIds(odd)[0]);
    expect(rhymes(mw[0]!, mw[1]!) && rhymes(mw[1]!, mw[2]!)).toBe(true);
    const yn = rhymeTutorial;
    expect(modelWords(yn)).toEqual(["cat", "hat"]);
  });

  it("naming says Hoot's word first, then every picture still in play", () => {
    const ex = GENERATED.find((e) => e.difficulty === 4)!;
    const l = lanternsOf(ex);
    expect(namingWords(ex)).toEqual([l.target, ...l.words]);
    expect(namingWords(ex, [l.words[0]!])).toEqual([l.target, ...l.words.slice(1)]);
    expect(namingWords(rhymeTutorial)).toEqual(["cat", "hat"]);
  });
});

describe("rhyme lanterns: registry and voice", () => {
  it("is registered in the English library with the right metadata", () => {
    const w = getWorld("rhyme-lanterns")!;
    expect(w.subject).toBe("english");
    expect(w.maxLevel).toBe(rhymeLanterns.progression.maxLevel);
    expect(w.characters[0]).toBe("hoot");
  });

  it("praise is about process, never ability; lines stay short", () => {
    for (const [id, line] of Object.entries(LINES)) {
      expect(line.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
      expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
    }
  });
});
