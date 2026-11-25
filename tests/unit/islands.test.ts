import { describe, expect, it } from "vitest";
import { artIdOf, dockOf, oceanLayout, sailPath, spotsOf, stopWindow, stopsForAge, trailPoints, type Box } from "../../src/paths/islands/data";
import islands from "../../src/paths/islands/islands.json";

// maxLevel = the highest 0-based level; handoff = the level where the path moves on to the next world
const world = (id: string, maxLevel: number, handoff?: number) => ({ id, maxLevel, handoff }) as never;
const path = { worlds: [world("a", 4, 2), world("b", 3), world("c", 1)] }; // stops: a0 a1 a2 | b0 b1 b2 b3 | c0 c1
const overlap = (p: Box, q: Box, pad = 0) => p.x < q.x + q.w + pad && q.x < p.x + p.w + pad && p.y < q.y + q.h + pad && q.y < p.y + p.h + pad;

describe("island data (D-041)", () => {
  it("every island art has a stop band and two character spots inside the art", () => {
    for (const [id, d] of Object.entries(islands)) {
      expect(d.line.length, id).toBeGreaterThanOrEqual(2);
      expect(d.spots.length, id).toBe(2);
      for (const [x, y] of [...d.line, ...d.spots]) {
        expect(x).toBeGreaterThan(0.05);
        expect(x).toBeLessThan(0.95);
        expect(y).toBeGreaterThan(0.05);
        expect(y).toBeLessThan(0.95);
      }
    }
  });

  it("libraries map to their island, unknown ones to the generic island", () => {
    expect(artIdOf("english")).toBe("word-woods");
    expect(artIdOf("pilot")).toBe("sky-school");
    expect(artIdOf("geo")).toBe("generic");
    expect(spotsOf("nope")).toEqual(spotsOf("generic"));
  });

  it("trail points: n evenly spread stops from the band's start to its end", () => {
    for (const n of [5, 6, 7, 8]) {
      const pts = trailPoints("word-woods", n);
      expect(pts).toHaveLength(n);
      expect(pts[0]!.x).toBeCloseTo(islands["word-woods"].line[0]![0]!, 3);
      const gaps = pts.slice(1).map((p, i) => Math.hypot((p.x - pts[i]!.x) * 480, (p.y - pts[i]!.y) * 300));
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(mean * 0.25); // equal spacing along the band (chords at bends are a little shorter)
      expect(Math.min(...gaps)).toBeGreaterThan(32); // stops never touch (the generator checks 36+ along the band)
    }
  });

  it("more stops for older children, never more than the band was checked for", () => {
    expect(stopsForAge([3, 5])).toBe(5);
    expect(stopsForAge([6, 8])).toBe(7);
    expect(stopsForAge([9, 11])).toBe(8);
    expect(stopsForAge([12, 14])).toBe(8);
  });

  it("stop window: two done stops behind, the current one, today's next ones, then later", () => {
    // the child is at b1 (index 4)
    const w = stopWindow(path, { index: 1, level: 1 }, 7, 3);
    expect(w.map((s) => `${(s.world as { id: string }).id}${s.level}:${s.state}`)).toEqual(["a2:done", "b0:done", "b1:here", "b2:today", "b3:today", "c0:later", "c1:later"]);
    expect(w.at(-1)!.last).toBe(true);
  });

  it("stop window shows only as many stops behind as were really played", () => {
    expect(stopWindow(path, { index: 1, level: 1 }, 5, 3, 0)[0]!.state).toBe("here");
    expect(stopWindow(path, { index: 1, level: 1 }, 5, 3, 1).map((s) => s.state).slice(0, 2)).toEqual(["done", "here"]);
  });

  it("stop window at the very start and at the end of a path", () => {
    const start = stopWindow(path, { index: 0, level: 0 }, 5, 5);
    expect(start.map((s) => s.state)).toEqual(["here", "today", "today", "today", "today"]);
    const end = stopWindow(path, { index: 2, level: 1 }, 5, 1);
    expect(end.map((s) => s.state)).toEqual(["done", "done", "done", "done", "here"]);
    expect(end.at(-1)!.last).toBe(true);
    // a stored level beyond the hand-off level counts as the world's last stop on the path
    expect(stopWindow(path, { index: 0, level: 4 }, 5, 2).find((s) => s.state === "here")!.level).toBe(2);
    // the last world runs to its top level
    expect(stopWindow({ worlds: [world("z", 5, 2)] }, { index: 0, level: 0 }, 8, 1)).toHaveLength(6);
    // no rounds left today: only the current stop glows
    expect(stopWindow(path, { index: 0, level: 0 }, 5, 0).filter((s) => s.state !== "later").length).toBe(1);
  });

  it("ocean layout: islands and the home islet never overlap and stay on the stage, for 1–12 islands", () => {
    for (const portrait of [false, true]) {
      for (let n = 1; n <= 12; n++) {
        const { stage, islands: boxes, home } = oceanLayout(n, portrait);
        expect(boxes).toHaveLength(n);
        const all = [...boxes, home];
        all.forEach((b, i) => {
          expect(b.x, `${portrait} ${n} #${i}`).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(60); // room for the island name plaques above the bottom edge
          expect(b.x + b.w).toBeLessThanOrEqual(stage.w);
          expect(b.y + b.h + 60).toBeLessThanOrEqual(stage.h);
          all.slice(i + 1).forEach((c, j) => expect(overlap(b, c, 20), `${portrait ? "portrait" : "landscape"} n=${n}: ${i} vs ${i + j + 1}`).toBe(false));
        });
      }
    }
  });

  it("docks sit at the island's shore and the sail path joins them", () => {
    const box = { x: 100, y: 100, w: 480, h: 300 };
    expect(dockOf(box)).toEqual({ x: 100 + 480 * 0.02, y: 100 + 300 * 0.62 });
    const p = sailPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(p).toMatch(/^M0 0 Q50 25 100 0$/);
  });
});
