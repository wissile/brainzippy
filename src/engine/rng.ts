/**
 * Small seeded random number generator (mulberry32) + string/number hashing.
 * Pure and deterministic: the same seed always yields the same sequence on every device,
 * so a day's exercises can be rebuilt exactly (resume, review, tests).
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [lo, hi] (inclusive). */
  int(lo: number, hi: number): number;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** True with probability p. */
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => {
    const l = Math.ceil(Math.min(lo, hi));
    const h = Math.floor(Math.max(lo, hi));
    return l + Math.floor(next() * (h - l + 1));
  };
  return {
    next,
    int,
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error("rng.pick: empty array");
      return items[int(0, items.length - 1)]!;
    },
    shuffle: <T,>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p: number) => next() < p,
  };
}

/** Combine strings and numbers into a 32-bit seed (FNV-1a over the joined parts). */
export function hashSeed(...parts: readonly (string | number)[]): number {
  let h = 0x811c9dc5;
  const s = parts.join("␟");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed for a calendar day ("YYYY-MM-DD", local to the child) plus optional extra parts (e.g. a profile slot). */
export function seedForDay(day: string, ...extra: readonly (string | number)[]): number {
  return hashSeed("day", day, ...extra);
}

/** A fresh, non-deterministic seed (for free play). Never used for anything security-relevant. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}
