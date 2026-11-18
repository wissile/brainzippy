import { describe, expect, it } from "vitest";
import { allWorlds, buildRegistry, checkRegistry, getWorld, registry, skillPrereqs, worldsBySubject, worldsForAge } from "../../src/content/registry";
import type { ContentPack } from "../../src/content/types";
import { buildRound } from "../../src/engine/round";
import { lintExercise } from "../../src/engine/validation";

describe("content registry integrity", () => {
  it("collects the core-math pack with its four worlds", () => {
    expect(registry.packs.map((p) => p.id)).toContain("core-math");
    for (const id of ["counting-adventure", "glow-cave-hops", "sky-balloon-race", "cookie-kitchen"]) expect(getWorld(id), id).toBeDefined();
  });

  it("has no structural problems: unique ids, known references, acyclic prerequisites", () => {
    expect(checkRegistry()).toEqual([]);
  });

  it("every world loads: definition matches the registry entry and its content lints", async () => {
    for (const w of registry.worlds) {
      const game = await w.loadDefinition();
      expect(game.id, w.id).toBe(w.id);
      expect(game.progression.maxLevel, `${w.id} maxLevel`).toBe(w.maxLevel);
      expect([...game.ages], `${w.id} ages`).toEqual([...w.ages]);
      expect([...game.skillIds].sort(), `${w.id} skills`).toEqual([...w.skills].sort());
      for (let level = 0; level <= w.maxLevel; level++) {
        const round = buildRound(game, { level, seed: 123 });
        expect(round.exercises.length, `${w.id} level ${level}`).toBeGreaterThanOrEqual(game.progression.roundLength);
        for (const ex of round.exercises) {
          expect(lintExercise(ex), ex.id).toEqual([]);
          expect(w.skills, `${ex.id} skill`).toContain(ex.skillId);
        }
      }
    }
  });

  it("every world's game component loads", async () => {
    for (const w of registry.worlds) {
      const mod = await w.load();
      expect(typeof mod.default, w.id).toBe("function");
    }
  });

  it("every world's voice file exists", async () => {
    const { existsSync } = await import("node:fs");
    for (const w of registry.worlds) expect(existsSync(w.voice), w.voice).toBe(true);
  });
});

describe("registry helpers", () => {
  it("worldsForAge uses inclusive age ranges (any number of worlds)", () => {
    // Property-based so new worlds from parallel agents never break this test.
    for (const age of [3, 4, 6, 9, 13]) {
      const expected = allWorlds().filter((w) => w.ages[0] <= age && age <= w.ages[1]).map((w) => w.id).sort();
      expect(worldsForAge(age).map((w) => w.id).sort(), `age ${age}`).toEqual(expected);
    }
    // The core worlds sit where their definitions say.
    expect(worldsForAge(4).map((w) => w.id)).toContain("counting-adventure");
    expect(worldsForAge(9).map((w) => w.id)).toContain("cookie-kitchen");
    expect(worldsForAge(9).map((w) => w.id)).not.toContain("counting-adventure");
  });

  it("worldsBySubject groups by subject", () => {
    expect(worldsBySubject().get("math")?.length).toBe(4);
  });

  it("skillPrereqs returns the transitive chain, learn-first", () => {
    expect(skillPrereqs("math.count.one-to-one")).toEqual([]);
    expect(skillPrereqs("math.count.make-set")).toEqual(["math.count.one-to-one", "math.count.cardinality"]);
    const chain = skillPrereqs("math.div.share-equally");
    expect(chain).toEqual(expect.arrayContaining(["math.count.one-to-one", "math.count.cardinality", "math.count.make-set", "math.add.number-line", "math.add.within-20"]));
    expect(chain.indexOf("math.count.one-to-one")).toBeLessThan(chain.indexOf("math.count.cardinality"));
    expect(chain.indexOf("math.add.number-line")).toBeLessThan(chain.indexOf("math.add.within-20"));
  });

  it("checkRegistry catches broken packs (duplicates, unknown refs, cycles, claims)", () => {
    const world = registry.worlds[0]!;
    const bad: ContentPack = {
      id: "bad",
      title: "Broken",
      subjects: [{ id: "x", title: "X", description: "x" }],
      topics: [{ id: "x.t", subject: "nope", title: "T" }],
      skills: [
        { id: "x.a", title: "A", topic: "x.t", ages: [5, 6], prerequisites: ["x.b"], objective: "a" },
        { id: "x.b", title: "B", topic: "x.t", ages: [5, 6], prerequisites: ["x.a"], objective: "b" },
      ],
      worlds: [{ ...world, subject: "x", topic: "x.t", skills: ["x.zzz"], characters: ["ghost"], parentDescription: "A proven method." }],
    };
    const problems = checkRegistry(buildRegistry([...registry.packs, bad]));
    expect(problems).toEqual(
      expect.arrayContaining([
        `duplicate world id: ${world.id}`,
        "topic x.t: unknown subject nope",
        expect.stringMatching(/^prerequisite cycle: x\.a → x\.b → x\.a|^prerequisite cycle: x\.b → x\.a → x\.b/),
        `world ${world.id}: unknown skill x.zzz`,
        `world ${world.id}: unknown character ghost`,
        `world ${world.id}: parentDescription must not claim proven results (D-020)`,
      ]),
    );
  });
});
