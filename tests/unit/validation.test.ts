import { describe, expect, it } from "vitest";
import type { Answer, Exercise } from "../../src/engine/types";
import { correctValue, isSubmittable, lintExercise, nudgeKey, validateAnswer, validateChoice, validateSet } from "../../src/engine/validation";
import { fixture, fixtureExercises } from "./fixtures";
import { ANSWERS, exerciseWith } from "./answerFixtures";

describe("validation: counting (number answers)", () => {
  it("accepts only the target number for choices", () => {
    const ex = fixture("ca-tap-4-carrot");
    expect(validateChoice(ex, 4)).toEqual({ correct: true, reason: "correct" });
    expect(validateChoice(ex, 3)).toEqual({ correct: false, reason: "wrong-number" });
    expect(validateChoice(ex, 5).correct).toBe(false);
  });

  it("classifies make-set submissions", () => {
    const ex = fixture("ca-make-4-cookie");
    expect(validateSet(ex, 4).reason).toBe("correct");
    expect(validateSet(ex, 5).reason).toBe("too-many");
    expect(validateSet(ex, 2).reason).toBe("too-few");
    expect(validateSet(ex, 0).reason).toBe("incomplete");
  });

  it("all fixture exercises pass lint", () => {
    expect(fixtureExercises.flatMap(lintExercise)).toEqual([]);
  });

  it("lint catches broken counting data", () => {
    const ex = fixture("ca-choose-2-cookie");
    expect(lintExercise({ ...ex, answer: { kind: "number", value: 2, choices: [1, 3] } })).toContain("ca-choose-2-cookie: choices must include target");
    expect(lintExercise({ ...fixture("ca-make-2-berry"), poolSize: 2 })).toContain("ca-make-2-berry: poolSize must exceed target");
    expect(lintExercise({ ...ex, answer: ANSWERS.choice })).toContain("ca-choose-2-cookie: choose-count needs a number answer");
  });
});

describe("validation: every answer kind", () => {
  it("number with choices: only listed choices are submittable", () => {
    const a = ANSWERS.number;
    expect(isSubmittable(a, 7)).toBe(true);
    expect(isSubmittable(a, 9)).toBe(false);
    expect(isSubmittable(a, "7")).toBe(false);
    expect(validateAnswer(a, 7)).toEqual({ correct: true, reason: "correct" });
    expect(validateAnswer(a, 6)).toEqual({ correct: false, reason: "wrong-number" });
  });

  it("number without choices (free entry): too high / too low", () => {
    const a: Answer = { kind: "number", value: 12 };
    expect(isSubmittable(a, 99)).toBe(true);
    expect(validateAnswer(a, 15).reason).toBe("too-high");
    expect(validateAnswer(a, 3).reason).toBe("too-low");
    expect(validateAnswer(a, 12).correct).toBe(true);
  });

  it("choice: one labelled option", () => {
    const a = ANSWERS.choice;
    expect(validateAnswer(a, "ball")).toEqual({ correct: true, reason: "correct" });
    expect(validateAnswer(a, "cat")).toEqual({ correct: false, reason: "wrong-choice" });
    expect(isSubmittable(a, "zebra")).toBe(false);
    expect(isSubmittable(a, 1)).toBe(false);
    expect(nudgeKey(a, "cat")).toBe("cat");
    expect(nudgeKey(a, "ball")).toBeNull();
  });

  it("sequence: order matters; same-text pieces are interchangeable; parts mark each slot", () => {
    const a = ANSWERS.sequence; // b o o k  (+ distractor x)
    expect(validateAnswer(a, ["b", "o1", "o2", "k"]).correct).toBe(true);
    expect(validateAnswer(a, ["b", "o2", "o1", "k"]).correct).toBe(true);
    const wrong = validateAnswer(a, ["b", "o1", "k", "o2"]);
    expect(wrong).toMatchObject({ correct: false, reason: "wrong-order", parts: { "0": true, "1": true, "2": false, "3": false } });
    expect(validateAnswer(a, ["b", "o1"]).reason).toBe("incomplete");
    expect(isSubmittable(a, ["b", "b"])).toBe(false); // a piece can be used once
    expect(isSubmittable(a, [])).toBe(false);
    expect(nudgeKey(a, ["b", "x", "o1", "k"])).toBe("x"); // the distractor is greyed out first
    expect(nudgeKey(a, ["b", "o1", "k", "o2"])).toBeNull();
  });

  it("set: all correct options and nothing else, order free", () => {
    const a = ANSWERS.set; // correct: p2, p3
    expect(validateAnswer(a, ["p3", "p2"]).correct).toBe(true);
    expect(validateAnswer(a, ["p2"])).toMatchObject({ correct: false, reason: "too-few", parts: { p2: true } });
    expect(validateAnswer(a, ["p1", "p2", "p3"])).toMatchObject({ correct: false, reason: "too-many", parts: { p1: false, p2: true, p3: true } });
    expect(validateAnswer(a, []).reason).toBe("incomplete");
    expect(nudgeKey(a, ["p1", "p2"])).toBe("p1");
    expect(isSubmittable(a, ["nope"])).toBe(false);
  });

  it("match: every item to its target (pairs and sorting)", () => {
    const a = ANSWERS.match; // cow→farm, fish→sea, crab→sea
    expect(validateAnswer(a, { cow: "farm", fish: "sea", crab: "sea" }).correct).toBe(true);
    expect(validateAnswer(a, { cow: "sea", fish: "sea", crab: "sea" })).toMatchObject({ correct: false, reason: "wrong-match", parts: { cow: false, fish: true, crab: true } });
    expect(validateAnswer(a, { cow: "farm" }).reason).toBe("incomplete");
    expect(isSubmittable(a, { cow: "moon" })).toBe(false);
    expect(isSubmittable(a, ["cow"])).toBe(false);
  });

  it("numeric: accepted within tolerance, else too high / too low", () => {
    const a = ANSWERS.numeric; // 120 ± 5
    expect(validateAnswer(a, 120).correct).toBe(true);
    expect(validateAnswer(a, 125).correct).toBe(true);
    expect(validateAnswer(a, 114.9)).toEqual({ correct: false, reason: "too-low" });
    expect(validateAnswer(a, 126)).toEqual({ correct: false, reason: "too-high" });
    expect(isSubmittable(a, Number.NaN)).toBe(false);
  });

  it("the modelled value is always a correct submission", () => {
    for (const a of Object.values(ANSWERS)) {
      expect(isSubmittable(a, correctValue(a))).toBe(true);
      expect(validateAnswer(a, correctValue(a)).correct).toBe(true);
    }
  });

  it("lint accepts the sample of each kind and catches broken data", () => {
    for (const [kind, a] of Object.entries(ANSWERS)) expect(lintExercise(exerciseWith(a)), kind).toEqual([]);
    const lint = (a: Answer) => lintExercise(exerciseWith(a));
    expect(lint({ kind: "choice", correct: "q", options: [{ id: "a", text: "a" }, { id: "b", text: "b" }] })).toContain("x-1: correct option missing");
    expect(lint({ kind: "choice", correct: "a", options: [{ id: "a", text: "a" }, { id: "a", text: "b" }] })).toContain("x-1: duplicate options ids");
    expect(lint({ kind: "choice", correct: "a", options: [{ id: "a", text: "a" }, { id: "b" }] })).toContain('x-1: options "b" needs text or art');
    expect(lint({ kind: "sequence", order: ["a", "z"], pieces: [{ id: "a", text: "a" }, { id: "b", text: "b" }] })).toContain("x-1: order uses unknown piece");
    expect(lint({ kind: "set", correct: [], options: [{ id: "a", text: "a" }, { id: "b", text: "b" }] })).toContain("x-1: set needs at least one correct option");
    expect(lint({ kind: "match", pairs: { a: "t1" }, items: [{ id: "a", text: "a" }, { id: "b", text: "b" }], targets: [{ id: "t1", text: "1" }, { id: "t2", text: "2" }] })).toContain("x-1: every item needs a target");
    expect(lint({ kind: "numeric", value: 5, tolerance: -1 })).toContain("x-1: tolerance must be ≥ 0");
    expect(lint({ kind: "numeric", value: 50, tolerance: 1, min: 0, max: 10 })).toContain("x-1: value outside min..max");
    const bad: Exercise = { ...exerciseWith(ANSWERS.choice), id: "Bad Id", difficulty: 0 };
    expect(lintExercise(bad)).toEqual(expect.arrayContaining(["Bad Id: id must be lowercase a-z0-9 . -", "Bad Id: difficulty must be an integer ≥ 1"]));
  });
});
