import { describe, expect, it } from "vitest";
import { createRng, hashSeed, seedForDay } from "../../src/engine/rng";

const draw = (seed: number, n = 20) => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe("seeded rng", () => {
  it("is deterministic per seed and differs across seeds", () => {
    expect(draw(42)).toEqual(draw(42));
    expect(draw(42)).not.toEqual(draw(43));
  });

  it("matches a fixed reference sequence (same on every device and release)", () => {
    const r = createRng(12345);
    const seq = Array.from({ length: 5 }, () => r.int(1, 100));
    expect(seq).toEqual([98, 31, 49, 82, 51]);
  });

  it("next() stays in [0, 1); int() stays in range and hits both ends", () => {
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const k = r.int(3, 6);
      expect(k).toBeGreaterThanOrEqual(3);
      expect(k).toBeLessThanOrEqual(6);
      seen.add(k);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it("shuffle is a deterministic permutation; pick returns members", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng(9).shuffle(items);
    expect(a).toEqual(createRng(9).shuffle(items));
    expect([...a].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
    const r = createRng(1);
    for (let i = 0; i < 50; i++) expect(items).toContain(r.pick(items));
    expect(() => r.pick([])).toThrow();
  });

  it("hashSeed / seedForDay are stable and sensitive to every part", () => {
    expect(hashSeed("a", 1)).toBe(hashSeed("a", 1));
    expect(hashSeed("a", 1)).not.toBe(hashSeed("a", 2));
    expect(hashSeed("ab", 1)).not.toBe(hashSeed("a", "b1"));
    expect(seedForDay("2026-11-17")).toBe(seedForDay("2026-11-17"));
    expect(seedForDay("2026-11-17")).not.toBe(seedForDay("2026-11-18"));
    expect(Number.isInteger(seedForDay("2026-11-17"))).toBe(true);
  });
});
