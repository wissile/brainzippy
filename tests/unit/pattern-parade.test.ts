import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { getSkill } from "../../src/content";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { correctValue, lintExercise, validateAnswer } from "../../src/engine/validation";
import { patternParade, patternTutorial } from "../../src/games/pattern-parade/definition";
import { LEVELS, MAX_LEN, MAX_LEVEL } from "../../src/games/pattern-parade/generator";
import { alongSay, alongSteps, chunks, decodeParade, kindOut, kindsOf, rowLayout, valueFor } from "../../src/games/pattern-parade/logic";
import { FAMILY_KINDS, MAX_TOWER, token, towerSize } from "../../src/games/pattern-parade/tokens";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 13);
const all = (level: number) => SEEDS.flatMap((s) => generateBand(patternParade, level, s, 8));
const familyOf = (k: string) => (Object.entries(FAMILY_KINDS).find(([, ks]) => (ks as readonly string[]).includes(k))?.[0] ?? (towerSize(k) ? "tower" : "?"));

describe("Pattern Parade content", () => {
  it("the tutorial is a valid AB 'what comes next' with a non-copy answer", () => {
    expect(lintExercise(patternTutorial)).toEqual([]);
    expect(patternParade.exercises.filter((e) => e.tutorial)).toHaveLength(1);
    expect(patternTutorial.difficulty).toBe(1);
    const p = decodeParade(patternTutorial);
    expect(p.row.map((c) => c.kind)).toEqual(["star", "heart", "star", "heart", "star", "heart"]);
    expect(p.answer).toEqual(["heart"]);
    expect(p.answer[0]).not.toBe(p.row[4]!.kind); // copying the last float would be wrong
  });

  it("maxLevel matches the level table (6–10 levels)", () => {
    expect(patternParade.progression.maxLevel).toBe(MAX_LEVEL);
    expect(LEVELS.length).toBeGreaterThanOrEqual(7);
    expect(LEVELS.length).toBeLessThanOrEqual(11);
  });

  it("same seed → same round; different seeds vary", () => {
    for (let l = 0; l <= MAX_LEVEL; l++) {
      expect(buildRound(patternParade, { level: l, seed: 99 })).toEqual(buildRound(patternParade, { level: l, seed: 99 }));
    }
    const ids = new Set(SEEDS.map((s) => generateBand(patternParade, 2, s, 1)[0]!.id.replace(/-l\dn\d+$/, "")));
    expect(ids.size).toBeGreaterThan(3);
  });

  for (let level = 0; level <= MAX_LEVEL; level++) {
    it(`level ${level} (${LEVELS[level]!.summary}): 50 seeds lint, decode and stay correct`, () => {
      const lv = LEVELS[level]!;
      for (const ex of all(level)) {
        expect(lintExercise(ex), ex.id).toEqual([]);
        expect(ex.difficulty).toBe(level + 1);
        expect(ex.skillId).toBe(lv.skill);
        expect(getSkill(ex.skillId), ex.skillId).toBeDefined();
        expect(ex.ages).toEqual([4, 6]);

        const p = decodeParade(ex);
        expect(p.mode, ex.id).toBe(lv.mode);
        expect(p.row.length).toBeLessThanOrEqual(MAX_LEN);
        // the engine's correct answer is exactly the marchers that belong in the gaps
        expect(kindsOf(ex, correctValue(ex.answer)), ex.id).toEqual(p.answer);
        expect(validateAnswer(ex.answer, valueFor(ex, p.answer)!).correct, ex.id).toBe(true);
        // every right marcher is in the cart, and the cart only holds one family
        for (const k of p.answer) expect(p.cart, ex.id).toContain(k);
        expect(new Set(p.cart.map(familyOf)).size, ex.id).toBe(1);
        expect(new Set(p.cart).size).toBe(p.cart.length);
        for (const k of [...p.cart, ...p.row.map((c) => c.kind), ...(p.source ?? [])]) expect(token(k), k).toBeDefined();
        expect(p.cart.length).toBeLessThanOrEqual(4);

        if (lv.mode === "grow") {
          // growing by one each step, towers 1..7
          p.row.forEach((c, i) => {
            expect(towerSize(c.kind)).toBe(towerSize(p.row[0]!.kind)! + i);
            expect(towerSize(c.kind)).toBeLessThanOrEqual(MAX_TOWER);
          });
          for (const k of p.cart) expect(towerSize(k)!).toBeLessThanOrEqual(MAX_TOWER);
        } else {
          // a true repeating pattern: every marcher equals the one a unit earlier
          p.row.forEach((c, i) => i >= p.unit && expect(c.kind, ex.id).toBe(p.row[i - p.unit]!.kind));
          const unitKinds = new Set(p.row.slice(0, p.unit).map((c) => c.kind));
          expect(unitKinds.size).toBe(p.unit === 2 ? 2 : new Set(p.row.slice(0, 3).map((c) => c.kind)).size);
          // at least one whole unit is visible before the first gap
          expect(p.row.findIndex((c) => c.gap >= 0), ex.id).toBeGreaterThanOrEqual(p.unit);
        }
        if (lv.mode === "translate") {
          expect(p.source).not.toBeNull();
          p.source!.forEach((k, i) => i >= p.unit && expect(k).toBe(p.source![i - p.unit]));
          expect(familyOf(p.source![0]!)).not.toBe(familyOf(p.row[0]!.kind));
          // same structure: equal source marchers ↔ equal parade marchers
          for (let i = 0; i < p.row.length; i++) for (let j = 0; j < p.row.length; j++) expect(p.source![i] === p.source![j]).toBe(p.row[i]!.kind === p.row[j]!.kind);
        }
        if (lv.mode === "next") expect(p.row.slice(-p.answer.length).every((c) => c.gap >= 0)).toBe(true);
        if (lv.mode === "missing") expect(p.row[p.row.length - 1]!.gap).toBe(-1);
        if (level === 0) {
          expect(ex.answer.kind).toBe("choice");
          expect(p.cart).toHaveLength(2);
        }
        // one gap → choice, several → sequence of interchangeable copies
        expect(ex.answer.kind).toBe(p.answer.length === 1 ? "choice" : "sequence");

        // prompt: catalogued, and every vary value it uses is pre-rendered
        const line = VOICE_LINES[ex.prompt!.line];
        expect(line, ex.prompt!.line).toBeDefined();
        for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values).toContain(ex.prompt!.vars?.[k]);
        expect(renderLine(ex.prompt!.line, ex.prompt!.vars ?? {})).toBe(ex.prompt!.text);
      }
    });
  }

  it("distractor marchers target misconceptions (copy-last for growing; a new marcher for repeating)", () => {
    for (const ex of all(7)) {
      const p = decodeParade(ex);
      const last = towerSize(p.row[p.row.length - 2]!.kind)!;
      expect(p.cart.map((k) => towerSize(k)).sort()).toEqual([last, last + 1, last + 2]);
    }
    for (const ex of all(1)) {
      const p = decodeParade(ex);
      const inPattern = new Set(p.row.map((c) => c.kind));
      expect(p.cart.filter((k) => !inPattern.has(k))).toHaveLength(1);
    }
  });
});

describe("Pattern Parade answers and hints", () => {
  const seq = all(1).find((e) => e.answer.kind === "sequence")!;

  it("copies of the same marcher are interchangeable; order matters", () => {
    const ex = all(6)[0]!; // 3 gaps
    const p = decodeParade(ex);
    const a = ex.answer;
    if (a.kind !== "sequence") throw new Error("expected sequence");
    // use the highest-numbered copy of each kind: still correct
    const used = new Set<string>();
    const alt = p.answer.map((k) => {
      const id = [...a.pieces].reverse().find((pc) => pc.text === k && !used.has(pc.id))!.id;
      used.add(id);
      return id;
    });
    expect(validateAnswer(a, alt).correct).toBe(true);
    const swapped = [...p.answer].reverse();
    if (swapped.join() !== p.answer.join()) {
      const r = validateAnswer(a, valueFor(ex, swapped)!);
      expect(r.correct).toBe(false);
      expect(r.parts).toBeDefined();
    }
  });

  it("valueFor waits until every gap is filled", () => {
    expect(valueFor(seq, [decodeParade(seq).answer[0]!, null])).toBeNull();
    expect(valueFor(seq, [])).toBeNull();
  });

  it("miss 1 greys out a distractor marcher, miss 2 models the answer; the modelled answer is submittable", () => {
    const p = decodeParade(seq);
    const distractor = p.cart.find((k) => !p.answer.includes(k))!;
    let s = initExercise(seq);
    s = exerciseReducer(s, { type: "SUBMIT", value: valueFor(seq, [distractor, distractor])! });
    expect(s.feedback?.correct).toBe(false);
    expect(s.hintStage).toBe(1);
    expect(kindOut(seq, s.eliminated, distractor)).toBe(true);
    for (const k of p.answer) expect(kindOut(seq, s.eliminated, k)).toBe(false);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    const wrongOrder = [p.answer[1]!, p.answer[0]!];
    s = exerciseReducer(s, { type: "SUBMIT", value: valueFor(seq, p.answer[0] === p.answer[1] ? [distractor, distractor] : wrongOrder, s.eliminated) ?? valueFor(seq, wrongOrder, [])! });
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    expect(s.hintStage).toBe(2);
    expect(kindsOf(seq, s.model)).toEqual(p.answer);
    s = exerciseReducer(s, { type: "SUBMIT", value: valueFor(seq, p.answer, s.eliminated)! });
    expect(s.feedback?.correct).toBe(true);
  });

  it("choice: a wrong pick is greyed out, never punished", () => {
    const ex = all(2)[0]!;
    const p = decodeParade(ex);
    const wrong = p.cart.find((k) => k !== p.answer[0])!;
    let s = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong });
    expect(kindOut(ex, s.eliminated, wrong)).toBe(true);
    s = exerciseReducer(exerciseReducer(s, { type: "FEEDBACK_DONE" }), { type: "SUBMIT", value: wrong });
    expect(s.phase).toBe("answering"); // eliminated pick is ignored, not counted
  });

  it("hint boxes cover the row in unit-sized chunks; growing rows have none", () => {
    const ex = all(2)[0]!;
    const p = decodeParade(ex);
    const b = chunks(p);
    expect(b[0]).toMatchObject({ start: 0, end: p.unit - 1 });
    expect(b.some((c) => c.hasGap)).toBe(true);
    expect(chunks(decodeParade(all(7)[0]!))).toEqual([]);
  });

  it("worked example walks the whole row; growing towers are counted aloud", () => {
    const g = all(7)[0]!;
    const p = decodeParade(g);
    expect(alongSteps(g)).toBe(p.row.length);
    expect(alongSay(g, 0)).toBe(towerSize(p.row[0]!.kind));
    expect(alongSay(all(0)[0]!, 0)).toBeNull();
  });

  it("row layout keeps gaps ≥ 64 px on a 390 px phone and in a 915×412 landscape board", () => {
    for (const n of [4, 5, 6, 7, 8]) {
      const phone = rowLayout(n, 340, 360, 1);
      expect(phone.cell).toBeGreaterThanOrEqual(64);
      expect(phone.perLine * phone.cell + (phone.perLine - 1) * 8).toBeLessThanOrEqual(340);
      expect(rowLayout(n, 700, 150, 1).cell).toBeGreaterThanOrEqual(64);
    }
    const tr = rowLayout(6, 340, 360, 2);
    expect(tr.cell).toBeGreaterThanOrEqual(64);
    expect(tr.lines * 2 * tr.cell).toBeLessThanOrEqual(360);
    expect(rowLayout(6, 700, 150, 2).cell).toBeGreaterThanOrEqual(64);
  });

  it("voice lines praise process, stay short, and every catalogued line has a caption", () => {
    for (const [id, l] of Object.entries(VOICE_LINES).filter(([id]) => id.startsWith("pp."))) {
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });
});

export type { Exercise };
