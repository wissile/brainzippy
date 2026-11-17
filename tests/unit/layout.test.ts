import { describe, expect, it } from "vitest";
import { OBJECT_FRACTION, layoutObjects } from "../../src/game/layout";

describe("object layout", () => {
  const aspects = [0.5, 0.8, 1, 1.6, 2.4, 4, 5.5];
  it("never overlaps objects and keeps them inside the field (counts 1–10, many seeds and aspects)", () => {
    for (let count = 1; count <= 10; count++) {
      for (const aspect of aspects) {
        for (let seed = 1; seed < 40; seed++) {
          const { positions, cols, rows } = layoutObjects(count, "scatter", seed, aspect);
          expect(positions).toHaveLength(count);
          // object box in % of field
          const w = (100 / cols) * OBJECT_FRACTION;
          const h = (100 / rows) * OBJECT_FRACTION;
          for (const p of positions) {
            expect(p.x - w / 2).toBeGreaterThanOrEqual(-0.01);
            expect(p.x + w / 2).toBeLessThanOrEqual(100.01);
            expect(p.y - h / 2).toBeGreaterThanOrEqual(-0.01);
            expect(p.y + h / 2).toBeLessThanOrEqual(100.01);
          }
          for (let i = 0; i < count; i++)
            for (let j = i + 1; j < count; j++) {
              const a = positions[i]!, b = positions[j]!;
              const overlapX = Math.abs(a.x - b.x) < w;
              const overlapY = Math.abs(a.y - b.y) < h;
              expect(overlapX && overlapY, `count ${count} aspect ${aspect} seed ${seed}`).toBe(false);
            }
        }
      }
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(layoutObjects(7, "scatter", 3, 1.6)).toEqual(layoutObjects(7, "scatter", 3, 1.6));
  });

  it("wide fields get more columns than tall fields", () => {
    expect(layoutObjects(8, "scatter", 1, 4).cols).toBeGreaterThan(layoutObjects(8, "scatter", 1, 0.6).cols);
  });
});
