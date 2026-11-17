import { describe, expect, it } from "vitest";
import { lintExercise, validateChoice, validateSet } from "../../src/engine/validation";
import { countingAdventure } from "../../src/games/counting-adventure/definition";

const byId = (id: string) => countingAdventure.exercises.find((e) => e.id === id)!;

describe("validation", () => {
  it("accepts only the target number for choices", () => {
    const ex = byId("ca-tap-4-carrot");
    expect(validateChoice(ex, 4)).toEqual({ correct: true, reason: "correct" });
    expect(validateChoice(ex, 3)).toEqual({ correct: false, reason: "wrong-number" });
    expect(validateChoice(ex, 5).correct).toBe(false);
  });

  it("classifies make-set submissions", () => {
    const ex = byId("ca-make-4-cookie");
    expect(validateSet(ex, 4).reason).toBe("correct");
    expect(validateSet(ex, 5).reason).toBe("too-many");
    expect(validateSet(ex, 2).reason).toBe("too-few");
    expect(validateSet(ex, 0).reason).toBe("incomplete");
  });

  it("all authored Counting Adventure exercises pass lint", () => {
    const problems = countingAdventure.exercises.flatMap(lintExercise);
    expect(problems).toEqual([]);
  });

  it("exercise ids are unique and every difficulty level has every interaction type", () => {
    const ids = countingAdventure.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of [1, 2, 3, 4]) {
      const types = new Set(countingAdventure.exercises.filter((e) => e.difficulty === d).map((e) => e.interaction));
      expect(types.has("tap-count") && types.has("make-set")).toBe(true);
    }
  });

  it("lint catches broken data", () => {
    const ex = byId("ca-choose-2-cookie");
    expect(lintExercise({ ...ex, choices: [1, 3] })).toContain("ca-choose-2-cookie: choices must include target");
    expect(lintExercise({ ...byId("ca-make-2-berry"), poolSize: 2 })).toContain("ca-make-2-berry: poolSize must exceed target");
  });
});
