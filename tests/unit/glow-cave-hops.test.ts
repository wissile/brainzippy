import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateChoice } from "../../src/engine/validation";
import { glowCaveHops } from "../../src/games/glow-cave-hops/definition";
import {
  MIN_SPACING, cameraLeft, clampPos, hopLandings, hopsTaken, snapToStop, stopX, trackGeometry, trackLayout,
} from "../../src/games/glow-cave-hops/logic";

const exercises = glowCaveHops.exercises;
const p = (e: (typeof exercises)[number]) => e.params as { start: number; hops: number; max: number };

describe("Glow Cave Hops content", () => {
  it("every exercise passes lint", () => {
    expect(exercises.flatMap(lintExercise)).toEqual([]);
  });

  it("ids are unique and exactly one tutorial (difficulty 1, one hop from 2)", () => {
    const ids = exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tut = exercises.filter((e) => e.tutorial);
    expect(tut).toHaveLength(1);
    expect(tut[0]!.difficulty).toBe(1);
    expect(p(tut[0]!)).toMatchObject({ start: 2, hops: 1 });
    expect(tut[0]!.prompt!.text).toBe("Hop 1 space from 2!");
  });

  it("target = start + hops, stays on the line, and choices are every stop 0..max", () => {
    for (const e of exercises) {
      const { start, hops, max } = p(e);
      expect(e.target, e.id).toBe(start + hops);
      expect(e.target, e.id).toBeLessThanOrEqual(max);
      expect(start, e.id).toBeGreaterThanOrEqual(0);
      expect(e.choices, e.id).toEqual(Array.from({ length: max + 1 }, (_, i) => i));
      expect(e.skillId).toBe("math.add.number-line");
      expect(e.interaction).toBe("choose");
    }
  });

  it("difficulty bands: line length, hop range and item counts", () => {
    const bands = { 1: { max: 5, hops: [1, 2], min: 8 }, 2: { max: 10, hops: [2, 4], min: 5 }, 3: { max: 10, hops: [3, 6], min: 5 }, 4: { max: 20, hops: [4, 9], min: 5 } } as const;
    for (const [d, band] of Object.entries(bands)) {
      const items = exercises.filter((e) => e.difficulty === Number(d));
      expect(items.length, `difficulty ${d}`).toBeGreaterThanOrEqual(band.min);
      for (const e of items) {
        expect(p(e).max, e.id).toBe(band.max);
        expect(p(e).hops, e.id).toBeGreaterThanOrEqual(band.hops[0]);
        expect(p(e).hops, e.id).toBeLessThanOrEqual(band.hops[1]);
      }
    }
  });

  it("prompts use catalogued lines whose vary lists cover every value used", () => {
    for (const e of exercises) {
      const line = VOICE_LINES[e.prompt!.line];
      expect(line, e.id).toBeDefined();
      for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values, `${e.id} ${k}`).toContain(e.prompt!.vars![k]);
      expect(renderLine(e.prompt!.line, e.prompt!.vars as Record<string, number>)).toBe(e.prompt!.text);
    }
  });

  it("praise / model lines cover every target and stay under 150 variants each", () => {
    const targets = [...new Set(exercises.map((e) => e.target))];
    for (const id of ["gc.praise.1", "gc.praise.2", "gc.praise.3", "gc.hint.modelTap"]) {
      for (const t of targets) expect(VOICE_LINES[id]!.vary!.n, `${id} n=${t}`).toContain(t);
    }
    for (const [id, line] of Object.entries(VOICE_LINES).filter(([k]) => k.startsWith("gc."))) {
      const combos = Object.values(line.vary ?? {}).reduce((a, v) => a * v.length, 1);
      expect(combos, id).toBeLessThanOrEqual(150);
      expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(line.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });

  it("the engine accepts only the landing stop and models it after two misses", () => {
    const e = exercises.find((x) => x.id === "gc-3-plus-4-to-10")!;
    expect(validateChoice(e, 7).correct).toBe(true);
    expect(validateChoice(e, 6).correct).toBe(false);
    let s = exerciseReducer(initExercise(e), { type: "CHOOSE", value: 6 });
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    expect(s.disabledChoices).toEqual([6]);
    s = exerciseReducer(s, { type: "CHOOSE", value: 8 });
    expect(s.modelChoice).toBe(7);
    expect(s.feedback!.hints).toContain("count-along");
  });
});

describe("Glow Cave Hops number-line logic", () => {
  it("cart moves only forward from the start and never past the end", () => {
    expect(clampPos(2, 3, 10)).toBe(3);
    expect(clampPos(11, 3, 10)).toBe(10);
    expect(clampPos(6.4, 3, 10)).toBe(6);
    expect(hopsTaken(7, 3)).toBe(4);
    expect(hopsTaken(2, 3)).toBe(0);
    expect(hopLandings(3, 7)).toEqual([4, 5, 6, 7]);
    expect(hopLandings(3, 3)).toEqual([]);
  });

  it("snaps a dragged x to the nearest stop", () => {
    const sp = 80;
    expect(stopX(0, sp)).toBe(40);
    expect(stopX(5, sp)).toBe(440);
    expect(snapToStop(440, sp, 0, 10)).toBe(5);
    expect(snapToStop(479, sp, 0, 10)).toBe(5); // just under half-way to 6
    expect(snapToStop(481, sp, 0, 10)).toBe(6);
    expect(snapToStop(0, sp, 3, 10)).toBe(3); // can't go behind the start
    expect(snapToStop(5000, sp, 3, 10)).toBe(10);
  });

  it("stops are evenly spaced, never closer than the minimum, and pan only when needed", () => {
    expect(trackGeometry(10, 1100)).toMatchObject({ total: 11, spacing: 100, fits: true });
    const phone = trackGeometry(20, 360);
    expect(phone.spacing).toBe(MIN_SPACING);
    expect(phone.fits).toBe(false);
    expect(trackGeometry(5, 2000).spacing).toBeLessThanOrEqual(150);
  });

  it("camera centres a fitting line, keeps the start in view, then follows the cart", () => {
    const fit = trackGeometry(10, 1100);
    expect(cameraLeft({ start: 3, focus: 7, spacing: fit.spacing, stripWidth: fit.stripWidth, viewportWidth: 1100 })).toBe(0);
    const g = trackGeometry(20, 360); // spacing 58, strip 1218
    const atStart = cameraLeft({ start: 8, focus: 8, spacing: g.spacing, stripWidth: g.stripWidth, viewportWidth: 360 });
    expect(stopX(8, g.spacing) - atStart).toBeGreaterThan(0); // start visible
    const far = cameraLeft({ start: 8, focus: 13, spacing: g.spacing, stripWidth: g.stripWidth, viewportWidth: 360 });
    expect(stopX(13, g.spacing) - far).toBeLessThan(360); // cart visible
    expect(far).toBeGreaterThan(atStart);
    expect(cameraLeft({ start: 13, focus: 20, spacing: g.spacing, stripWidth: g.stripWidth, viewportWidth: 360 })).toBe(g.stripWidth - 360); // clamped at the end
  });

  it("vertical layout keeps tap targets ≥ 44px and stacks cart above arcs above numbers", () => {
    for (const [sp, h] of [[58, 200], [100, 420], [150, 600]] as const) {
      const l = trackLayout(sp, h);
      expect(l.stopSize).toBeGreaterThanOrEqual(44);
      expect(l.numY + l.stopSize / 2).toBeLessThanOrEqual(h);
      expect(l.arcBase).toBeLessThan(l.numY);
      expect(l.railY).toBeLessThan(l.arcBase - l.arcHeight);
    }
  });
});

import { fitTrack } from "../../src/games/glow-cave-hops/logic";
describe("Glow Cave Hops track fitting", () => {
  it("the cart is never clipped at the first or last stop, and a 0–5 line fits a phone without panning", () => {
    for (const [max, w, h] of [[5, 358, 470], [10, 358, 470], [20, 960, 480], [10, 740, 160], [20, 1000, 900]] as const) {
      const { geo, lay } = fitTrack(max, w, h);
      expect(stopX(0, geo.spacing, geo.pad) - lay.cartWidth / 2, `${max}@${w}`).toBeGreaterThanOrEqual(0);
      expect(stopX(max, geo.spacing, geo.pad) + lay.cartWidth / 2, `${max}@${w}`).toBeLessThanOrEqual(geo.stripWidth);
      expect(lay.railY - lay.cartWidth * 1.22, `${max}@${w}x${h} cart fits above the rail`).toBeGreaterThanOrEqual(-4);
    }
    expect(fitTrack(5, 358, 470).geo.fits).toBe(true);
  });
});
