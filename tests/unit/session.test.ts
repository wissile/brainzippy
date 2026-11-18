import { describe, expect, it } from "vitest";
import { type ExerciseState, exerciseReducer, initExercise, toResult } from "../../src/engine/session";
import { fixture } from "./fixtures";

const ex = fixture;
const run = (s: ExerciseState, ...events: Parameters<typeof exerciseReducer>[1][]) => events.reduce(exerciseReducer, s);

describe("exercise state machine", () => {
  it("tap-count: counting each object once moves to answering", () => {
    let s = initExercise(ex("ca-tap-3-apple"));
    expect(s.phase).toBe("counting");
    s = run(s, { type: "TAP_OBJECT", index: 0 }, { type: "TAP_OBJECT", index: 0 }, { type: "TAP_OBJECT", index: 2 });
    expect(s.tapped).toEqual([0, 2]);
    expect(s.phase).toBe("counting");
    s = run(s, { type: "TAP_OBJECT", index: 1 });
    expect(s.phase).toBe("answering");
    expect(s.tapped).toEqual([0, 2, 1]);
  });

  it("ignores answers while still counting and out-of-range taps", () => {
    const s0 = initExercise(ex("ca-tap-3-apple"));
    expect(exerciseReducer(s0, { type: "SUBMIT", value: 3 })).toBe(s0);
    expect(exerciseReducer(s0, { type: "TAP_OBJECT", index: 9 })).toBe(s0);
  });

  it("first wrong answer: retry feedback, eliminates the choice, cardinality hint", () => {
    let s = run(initExercise(ex("ca-tap-3-apple")), { type: "TAP_OBJECT", index: 0 }, { type: "TAP_OBJECT", index: 1 }, { type: "TAP_OBJECT", index: 2 });
    s = run(s, { type: "SUBMIT", value: 2 });
    expect(s.phase).toBe("feedback");
    expect(s.feedback).toMatchObject({ correct: false, mascot: "retry", sfx: "retry" });
    expect(s.eliminated).toEqual([2]);
    expect(s.activeHints).toContain("highlight-last-count");
    // input is locked during feedback
    expect(exerciseReducer(s, { type: "SUBMIT", value: 3 })).toBe(s);
    s = run(s, { type: "FEEDBACK_DONE" });
    expect(s.phase).toBe("answering");
    // a disabled choice cannot be picked again
    expect(exerciseReducer(s, { type: "SUBMIT", value: 2 })).toBe(s);
  });

  it("second wrong answer models the answer (errorless), then correct completes", () => {
    let s = initExercise(ex("ca-choose-5-apple"));
    s = run(s, { type: "SUBMIT", value: 4 }, { type: "FEEDBACK_DONE" }, { type: "SUBMIT", value: 6 });
    expect(s.feedback?.hints).toContain("model-answer");
    expect(s.model).toBe(5);
    expect([...s.eliminated].sort()).toEqual([4, 6]);
    s = run(s, { type: "FEEDBACK_DONE" }, { type: "SUBMIT", value: 5 });
    expect(s.feedback).toMatchObject({ correct: true, mascot: "celebrating" });
    s = run(s, { type: "FEEDBACK_DONE" });
    expect(s.phase).toBe("solved");
    expect(toResult(s)).toMatchObject({ attempts: 3, firstTry: false, hintsShown: 2 });
  });

  it("first-try correct records firstTry", () => {
    const s = run(initExercise(ex("ca-choose-2-cookie")), { type: "SUBMIT", value: 2 }, { type: "FEEDBACK_DONE" });
    expect(toResult(s)).toMatchObject({ attempts: 1, firstTry: true, hintsShown: 0 });
  });

  it("make-set: add/remove, too many / too few hints, slots after second miss", () => {
    let s = initExercise(ex("ca-make-4-cookie"));
    expect(exerciseReducer(s, { type: "SUBMIT_SET" }).feedback?.voice.id).toBe("hint.empty");
    s = run(s, ...[0, 1, 2, 3, 4].map((i) => ({ type: "ADD_TO_BASKET" as const, index: i })));
    expect(s.basket).toHaveLength(5);
    s = run(s, { type: "ADD_TO_BASKET", index: 0 });
    expect(s.basket).toHaveLength(5);
    s = run(s, { type: "SUBMIT_SET" });
    expect(s.feedback?.voice.id).toBe("hint.tooMany");
    s = run(s, { type: "FEEDBACK_DONE" }, { type: "REMOVE_FROM_BASKET", index: 4 }, { type: "REMOVE_FROM_BASKET", index: 3 }, { type: "SUBMIT_SET" });
    expect(s.feedback?.voice.id).toBe("hint.tooFew");
    expect(s.activeHints).toContain("show-slots");
    s = run(s, { type: "FEEDBACK_DONE" }, { type: "ADD_TO_BASKET", index: 6 }, { type: "SUBMIT_SET" });
    expect(s.feedback?.correct).toBe(true);
  });

  it("make-set: third miss models the answer — basket set to target, child still submits", () => {
    let s = initExercise(ex("ca-make-4-cookie"));
    s = run(s, { type: "ADD_TO_BASKET", index: 0 }, { type: "SUBMIT_SET" }, { type: "FEEDBACK_DONE" }, { type: "SUBMIT_SET" }, { type: "FEEDBACK_DONE" });
    s = run(s, ...[1, 2, 3, 4, 5].map((i) => ({ type: "ADD_TO_BASKET" as const, index: i })), { type: "SUBMIT_SET" });
    expect(s.attempts).toBe(3);
    expect(s.feedback?.hints).toEqual(expect.arrayContaining(["model-answer", "count-along"]));
    expect(s.basket).toHaveLength(4);
    s = run(s, { type: "FEEDBACK_DONE" });
    expect(s.phase).toBe("answering");
    s = run(s, { type: "SUBMIT_SET" });
    expect(s.feedback?.correct).toBe(true);
  });

  it("retry is unlimited and never ends the exercise without success", () => {
    let s = initExercise(ex("ca-choose-2-cookie"));
    s = run(s, { type: "SUBMIT", value: 1 }, { type: "FEEDBACK_DONE" }, { type: "SUBMIT", value: 3 }, { type: "FEEDBACK_DONE" });
    expect(s.phase).toBe("answering");
    expect(s.attempts).toBe(2);
  });
});
