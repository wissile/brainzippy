import { describe, expect, it } from "vitest";
import { choicesOf, targetOf } from "../../src/engine/validation";
import { lintExercise } from "../../src/engine/validation";
import { cookieExercises, cookieKitchen } from "../../src/games/cookie-kitchen/definition";
import {
  alongSayFor,
  bestGrid,
  dealRoundRobin,
  emptyStacks,
  moveCookie,
  plateOf,
  plausibleDistractors,
  shareStatus,
  trayCookies,
} from "../../src/games/cookie-kitchen/sharing";
import voice from "../../src/games/cookie-kitchen/voice.json";

const lines = (voice as { lines: Record<string, { text: string; vary?: Record<string, (string | number)[]> }> }).lines;

describe("cookie-kitchen exercises", () => {
  it("all exercises pass lintExercise", () => {
    expect(cookieExercises.flatMap(lintExercise)).toEqual([]);
  });

  it("ids are unique and exactly one tutorial at difficulty 1", () => {
    expect(new Set(cookieExercises.map((e) => e.id)).size).toBe(cookieExercises.length);
    const tut = cookieExercises.filter((e) => e.tutorial);
    expect(tut).toHaveLength(1);
    expect(tut[0]!.difficulty).toBe(1);
    expect(tut[0]!.params).toEqual({ total: 4, groups: 2 });
  });

  it("every share is whole and the target is total / groups", () => {
    for (const e of cookieExercises) {
      const { total, groups } = e.params as { total: number; groups: number };
      expect(total % groups, e.id).toBe(0);
      expect(total / groups, e.id).toBe(targetOf(e));
      expect(e.prompt?.text).toBe(`Share ${total} cookies on ${groups} plates!`);
      expect(e.prompt?.vars).toEqual({ total, groups });
      expect(e.skillId).toBe("math.div.share-equally");
      expect(e.interaction).toBe("choose");
    }
  });

  it("difficulty bands follow the curriculum spec", () => {
    const at = (d: number) => cookieExercises.filter((e) => e.difficulty === d);
    expect(at(1).length).toBeGreaterThanOrEqual(8);
    for (const d of [2, 3, 4]) expect(at(d).length).toBeGreaterThanOrEqual(5);
    const p = (e: (typeof cookieExercises)[number]) => e.params as { total: number; groups: number };
    for (const e of at(1)) expect(p(e).groups === 2 && p(e).total >= 2 && p(e).total <= 8 && p(e).total % 2 === 0, e.id).toBe(true);
    for (const e of at(2)) expect([2, 3].includes(p(e).groups) && p(e).total <= 12, e.id).toBe(true);
    for (const e of at(3)) expect([3, 4].includes(p(e).groups) && p(e).total <= 16, e.id).toBe(true);
    for (const e of at(4)) expect([4, 5].includes(p(e).groups) && p(e).total <= 20, e.id).toBe(true);
  });

  it("choices are 3 unique, positive, sorted, and distractors come from plausible errors", () => {
    for (const e of cookieExercises) {
      const { total, groups } = e.params as { total: number; groups: number };
      const choices = [...(choicesOf(e) ?? [])];
      expect(choices, e.id).toHaveLength(3);
      expect(choices, e.id).toEqual([...choices].sort((a, b) => a - b));
      expect(choices.every((c) => c > 0 && c <= 9), e.id).toBe(true);
      const ok = plausibleDistractors(total, groups);
      for (const c of choices.filter((c) => c !== targetOf(e))) expect(ok, `${e.id} distractor ${c}`).toContain(c);
    }
  });

  it("progression config and achievement", () => {
    expect(cookieKitchen.progression).toEqual({ roundLength: 8, maxLevel: 3, stepUpAfter: 2, stepDownAtAttempts: 3 });
    expect(cookieKitchen.achievement).toEqual({ id: "fair-sharer", title: "Fair Sharer" });
  });
});

describe("cookie-kitchen voice lines", () => {
  it("all ids are prefixed ck.", () => {
    expect(Object.keys(lines).every((k) => k.startsWith("ck."))).toBe(true);
  });
  it("prompt variants cover every exercise and stay under 150 combos", () => {
    const vary = lines["ck.prompt"]!.vary!;
    for (const e of cookieExercises) {
      expect(vary.total).toContain(e.params!.total);
      expect(vary.groups).toContain(e.params!.groups);
    }
    expect(vary.total!.length * vary.groups!.length).toBeLessThanOrEqual(150);
  });
  it("praise and model lines pre-render every possible answer, and praise process not ability", () => {
    const targets = [...new Set(cookieExercises.map((e) => targetOf(e)))];
    for (const id of ["ck.praise.1", "ck.praise.2", "ck.praise.3", "ck.praise.4", "ck.hint.modelTap"]) {
      for (const t of targets) expect(lines[id]!.vary!.n, id).toContain(t);
      expect(lines[id]!.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });
  it("lines are short enough for young readers (≤ 18 words)", () => {
    for (const [id, l] of Object.entries(lines)) expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(18);
  });
});

describe("cookie-kitchen sharing logic", () => {
  it("deals round-robin, one cookie at a time", () => {
    expect(dealRoundRobin(12, 3, 12)).toEqual([[0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11]]);
    expect(dealRoundRobin(12, 3, 4)).toEqual([[0, 3], [1], [2]]);
    expect(dealRoundRobin(4, 2, 0)).toEqual([[], []]);
    expect(dealRoundRobin(4, 2, 99)).toEqual([[0, 2], [1, 3]]);
  });

  it("a complete deal of every exercise is fair with target cookies each", () => {
    for (const e of cookieExercises) {
      const { total, groups } = e.params as { total: number; groups: number };
      expect(shareStatus(total, dealRoundRobin(total, groups, total)), e.id).toEqual({ allShared: true, equal: true, each: targetOf(e) });
    }
  });

  it("moves cookies between tray and plates without mutating", () => {
    const s0 = emptyStacks(3);
    const s1 = moveCookie(s0, 5, 1);
    expect(s0).toEqual([[], [], []]);
    expect(s1).toEqual([[], [5], []]);
    const s2 = moveCookie(s1, 5, 2);
    expect(s2).toEqual([[], [], [5]]);
    expect(plateOf(s2, 5)).toBe(2);
    const s3 = moveCookie(s2, 5, -1);
    expect(s3).toEqual([[], [], []]);
    expect(plateOf(s3, 5)).toBe(-1);
    expect(moveCookie(s2, 5, 2)).toBe(s2);
    expect(moveCookie(s2, 5, 7)).toBe(s2);
    expect(trayCookies(6, s2)).toEqual([0, 1, 2, 3, 4]);
  });

  it("share status: incomplete, unequal and fair", () => {
    expect(shareStatus(4, [[0], [1]])).toEqual({ allShared: false, equal: true, each: null });
    expect(shareStatus(4, [[0, 1, 2], [3]])).toEqual({ allShared: true, equal: false, each: null });
    expect(shareStatus(4, [[3, 0], [1, 2]])).toEqual({ allShared: true, equal: true, each: 2 });
  });

  it("worked example speaks the per-plate count at the end of each round of dealing", () => {
    const said = Array.from({ length: 12 }, (_, i) => alongSayFor(3, i));
    expect(said).toEqual([null, null, 1, null, null, 2, null, null, 3, null, null, 4]);
    expect(alongSayFor(2, 1)).toBe(1);
  });

  it("plausible distractors exclude the target and non-positive values", () => {
    expect(plausibleDistractors(12, 3).sort((a, b) => a - b)).toEqual([3, 3, 5, 6, 9]);
    expect(plausibleDistractors(2, 2)).toEqual([2, 3, 2]);
  });

  it("tray grid fills the box sensibly", () => {
    expect(bestGrid(20, 5)).toEqual({ cols: 10, rows: 2 });
    expect(bestGrid(20, 1.6)).toEqual({ cols: 5, rows: 4 });
    expect(bestGrid(4, 1)).toEqual({ cols: 2, rows: 2 });
    for (const n of [2, 5, 12, 16, 20]) for (const a of [0.5, 1, 2, 4]) {
      const g = bestGrid(n, a);
      expect(g.cols * g.rows).toBeGreaterThanOrEqual(n);
    }
  });
});
