import { describe, expect, it } from "vitest";
import { type ExerciseEvent, type ExerciseState, exerciseReducer, initExercise, toResult } from "../../src/engine/session";
import type { Answer, AnswerValue } from "../../src/engine/types";
import { ANSWERS, exerciseWith } from "./answerFixtures";

const run = (s: ExerciseState, ...events: ExerciseEvent[]) => events.reduce(exerciseReducer, s);
const submit = (value: AnswerValue): ExerciseEvent => ({ type: "SUBMIT", value });
const DONE: ExerciseEvent = { type: "FEEDBACK_DONE" };

/** A wrong first answer, a different wrong second answer, and the right one, for each kind. */
const CASES: { kind: Answer["kind"]; answer: Answer; wrong1: AnswerValue; wrong2: AnswerValue; right: AnswerValue; firstHints: string[]; eliminated1: (string | number)[] }[] = [
  { kind: "number", answer: ANSWERS.number, wrong1: 6, wrong2: 8, right: 7, firstHints: ["eliminate-choice"], eliminated1: [6] },
  { kind: "choice", answer: ANSWERS.choice, wrong1: "cat", wrong2: "sun", right: "ball", firstHints: ["eliminate-choice"], eliminated1: ["cat"] },
  { kind: "sequence", answer: ANSWERS.sequence, wrong1: ["b", "x", "o1", "k"], wrong2: ["k", "o1", "o2", "b"], right: ["b", "o2", "o1", "k"], firstHints: ["mark-parts", "eliminate-choice"], eliminated1: ["x"] },
  { kind: "set", answer: ANSWERS.set, wrong1: ["p1", "p2"], wrong2: ["p2"], right: ["p2", "p3"], firstHints: ["mark-parts", "eliminate-choice"], eliminated1: ["p1"] },
  { kind: "match", answer: ANSWERS.match, wrong1: { cow: "sea", fish: "sea", crab: "sea" }, wrong2: { cow: "farm", fish: "farm", crab: "sea" }, right: { cow: "farm", fish: "sea", crab: "sea" }, firstHints: ["mark-parts"], eliminated1: [] },
  { kind: "numeric", answer: ANSWERS.numeric, wrong1: 90, wrong2: 150, right: 118, firstHints: ["direction"], eliminated1: [] },
];

describe("feedback ladder for every answer kind", () => {
  for (const c of CASES) {
    it(`${c.kind}: miss 1 nudges, miss 2 models, correct solves`, () => {
      let s = initExercise(exerciseWith(c.answer));
      expect(s.hintStage).toBe(0);

      s = run(s, submit(c.wrong1));
      expect(s.phase).toBe("feedback");
      expect(s.feedback).toMatchObject({ correct: false, mascot: "retry", sfx: "retry" });
      expect(s.feedback?.hints).toEqual(c.firstHints);
      expect(s.hintStage).toBe(1);
      expect(s.eliminated).toEqual(c.eliminated1);
      expect(s.model).toBeNull();
      expect(s.lastAnswer).toEqual(c.wrong1);
      expect(s.check?.correct).toBe(false);
      // input is locked during feedback
      expect(exerciseReducer(s, submit(c.right))).toBe(s);

      s = run(s, DONE, submit(c.wrong2));
      expect(s.feedback?.hints).toEqual(["model-answer", "count-along"]);
      expect(s.feedback?.voice.id).toBe(c.kind === "number" ? "hint.model" : "hint.show");
      expect(s.hintStage).toBe(2);
      expect(s.model).toEqual(
        c.answer.kind === "choice" ? c.answer.correct : c.answer.kind === "set" ? c.answer.correct : c.answer.kind === "sequence" ? c.answer.order : c.answer.kind === "match" ? c.answer.pairs : c.answer.value,
      );

      s = run(s, DONE, submit(c.right));
      expect(s.feedback).toMatchObject({ correct: true, mascot: "celebrating" });
      expect(s.hintStage).toBe(2);
      s = run(s, DONE);
      expect(s.phase).toBe("solved");
      expect(toResult(s)).toMatchObject({ attempts: 3, firstTry: false, hintsShown: 2 });
    });

    it(`${c.kind}: first-try correct praises the process and records firstTry`, () => {
      const s = run(initExercise(exerciseWith(c.answer)), submit(c.right), DONE);
      expect(s.phase).toBe("solved");
      expect(s.hintStage).toBe(0);
      expect(s.feedback?.voice.id).toMatch(c.kind === "number" ? /^correct\./ : /^praise\./);
      expect(toResult(s)).toMatchObject({ attempts: 1, firstTry: true, hintsShown: 0 });
    });
  }

  it("modelled answer greys out everything that is not part of the answer", () => {
    const after2 = (a: Answer, w1: AnswerValue, w2: AnswerValue) => run(initExercise(exerciseWith(a)), submit(w1), DONE, submit(w2), DONE);
    expect(after2(ANSWERS.choice, "cat", "sun").eliminated.sort()).toEqual(["cat", "sun"]);
    expect(after2(ANSWERS.set, ["p1"], ["p4"]).eliminated.sort()).toEqual(["p1", "p4"]);
    expect(after2(ANSWERS.sequence, ["x", "b", "o1", "k"], ["k", "b", "o1", "o2"]).eliminated).toEqual(["x"]);
  });

  it("eliminated keys cannot be submitted again; malformed submissions are ignored, not wrong", () => {
    let s = run(initExercise(exerciseWith(ANSWERS.choice)), submit("cat"), DONE);
    expect(exerciseReducer(s, submit("cat"))).toBe(s);
    expect(exerciseReducer(s, submit(["ball"]))).toBe(s);
    expect(exerciseReducer(s, submit("nope"))).toBe(s);
    s = run(initExercise(exerciseWith(ANSWERS.set)), submit(["p1", "p2"]), DONE);
    expect(exerciseReducer(s, submit(["p1", "p3"]))).toBe(s);
    expect(s.attempts).toBe(1);
  });

  it("numeric and free-entry number: the first miss says which way (check.reason)", () => {
    const s = run(initExercise(exerciseWith(ANSWERS.numeric)), submit(200));
    expect(s.check?.reason).toBe("too-high");
    const n = run(initExercise(exerciseWith({ kind: "number", value: 12 })), submit(3));
    expect(n.feedback?.hints).toEqual(["direction"]);
    expect(n.check?.reason).toBe("too-low");
  });

  it("the deprecated CHOOSE event still works for number boards", () => {
    const s = run(initExercise(exerciseWith(ANSWERS.number)), { type: "CHOOSE", value: 7 });
    expect(s.feedback?.correct).toBe(true);
  });

  it("make-set ignores SUBMIT (it submits its basket with SUBMIT_SET)", () => {
    const s = initExercise(exerciseWith({ kind: "number", value: 3 }, { interaction: "make-set", poolSize: 5 }));
    expect(exerciseReducer(s, submit(3))).toBe(s);
  });
});
