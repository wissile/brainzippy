import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { buildRegistry, registry } from "../../src/content/registry";
import type { ContentPack, Library, World } from "../../src/content/types";
import { ensurePlan } from "../../src/daily/store";
import { planDay, toStored } from "../../src/daily/planner";
import { emptyDailyLog, type DailyPlanStop } from "../../src/engine/progressSchema";
import { emptyPathsState } from "../../src/engine/pathProgress";
import { initPathsOverride, pathsEnabled, visiblePaths } from "../../src/paths/flags";
import { planWithPath, preferPathWorld } from "../../src/paths/plan";
import { allPaths, pathAgeGaps, pathWorlds, renderPathTitle, toPathDef } from "../../src/paths/registry";
import { childAge, childBand, currentPath, currentStop, isPathPlay, pathFocus, pickPath, recordRound, setPathPlay } from "../../src/paths/state";
import { noteLine, noteText } from "../../src/paths/PathGate";
import { clearState, loadState, saveState } from "../../src/services/storage";
import { artIdOf } from "../../src/paths/islands/data";
import { buildRound } from "../../src/engine/round";
import { applyResult, initialProgression, isRoundComplete, markPlayed, selectNextExercise, startDifficultyFor } from "../../src/engine/progression";

const OVERRIDE = "bz.paths.override";
const withOverride = (on: boolean) => {
  if (on) sessionStorage.setItem(OVERRIDE, "all");
  else sessionStorage.removeItem(OVERRIDE);
  initPathsOverride();
};

describe("path data in the packs", () => {
  const paths = allPaths();
  it("every library is a path whose title names its host", () => {
    expect(paths.map((p) => p.id).sort()).toEqual(registry.libraries.filter((l) => l.status === "live").map((l) => l.id).sort());
    for (const p of paths) {
      expect(p.library.path!.title).toContain("{host}");
      expect(p.title).toBe(renderPathTitle(p.library.path!.title, p.hostName));
      expect(p.title).toMatch(new RegExp(`with ${p.hostName}$`));
      expect(p.host).toBe(p.library.host); // swapping Library.host swaps the path's host
    }
    expect(paths.find((p) => p.id === "pilot")!.title).toBe("Learn to fly with Ziggy");
    expect(paths.find((p) => p.id === "math")!.title).toBe("Count and build with Bobbo");
  });
  it("every title has a voice line that says it, pre-rendered for the CURRENT host (re-render after a host swap)", () => {
    for (const p of paths) {
      const line = VOICE_LINES[p.line];
      expect(line, p.line).toBeDefined();
      expect(renderLine(p.line, { host: p.hostName })).toBe(`${p.title}!`);
      expect(line!.vary?.host, `${p.line}: vary.host must list ${p.hostName}`).toContain(p.hostName);
    }
  });
  it("owner rule (D-034): a live path has a world for every age 3–14", () => {
    for (const p of paths) if (p.live) expect(pathAgeGaps(p), `${p.id} is live but has no world for these ages`).toEqual([]);
  });
  it("coverage today (informational): which ages each path still needs", () => {
    const gaps = Object.fromEntries(paths.map((p) => [p.id, pathAgeGaps(p)]));
    // math has worlds for 4–13; English covers 3–14: 3–5 (Rhyme Lanterns), 6–8 (Paper Boat Post), 9–11 (Wordroot
    // Grove) and 12–14 (The Lantern Press). Whether the English path goes live is the owner's call (docs/PATHS.md).
    expect(gaps.math).toEqual([3, 10, 14]);
    expect(gaps.english).toEqual([]);
  });
  it("trail order is by age, and a world never comes before a world that teaches its prerequisite", () => {
    for (const p of paths) {
      const ws = p.worlds;
      for (let i = 1; i < ws.length; i++) expect(ws[i]!.ages[0]).toBeGreaterThanOrEqual(ws[i - 1]!.ages[0]);
      const teaches = new Map<string, number>();
      ws.forEach((w, i) => w.skills.forEach((s) => teaches.set(s, Math.min(teaches.get(s) ?? i, i))));
      ws.forEach((w, i) => {
        for (const s of w.skills) {
          for (const pre of registry.skills.find((k) => k.id === s)?.prerequisites ?? []) {
            const at = teaches.get(pre);
            if (at !== undefined && !w.skills.includes(pre)) expect(at, `${p.id}: ${w.id} needs ${pre}`).toBeLessThan(i);
          }
        }
      });
    }
  });
  it("an explicit order in the pack wins; unknown ids are skipped and other worlds follow by age", () => {
    const base = registry.libraries.find((l) => l.id === "math")!;
    const lib: Library = { ...base, path: { ...base.path!, worlds: ["sky-balloon-race", "nope"] } };
    expect(pathWorlds(lib).map((w) => w.id).slice(0, 2)).toEqual(["sky-balloon-race", "counting-adventure"]);
  });
  it("a synthetic registry: live flag, world-less libraries and the engine view", () => {
    const world = (id: string, ages: [number, number]): World => ({
      id, subject: "x", topic: "x.t", skills: ["x.t.s"], ages, maxLevel: 3, title: id, gameType: "game", blurb: "b", parentDescription: "p", characters: ["h"],
      load: async () => ({ default: () => null }), loadDefinition: async () => { throw new Error("unused"); }, voice: "",
    });
    const lib = (id: string, live: boolean): Library => ({
      id, title: id, kidTitle: id, host: "h", theme: { main: "#FF9F43", soft: "#FFF0E0", deep: "#8A4500" }, ages: [3, 14], pitch: "p", description: "d",
      status: "live", order: 1, path: { title: "Go with {host}", line: "path.x.title", live },
    });
    const pack: ContentPack = {
      id: "library-x", title: "x", libraries: [lib("x", true)], characters: [{ id: "h", name: "Hana" }],
      topics: [{ id: "x.t", subject: "x", title: "t" }], skills: [{ id: "x.t.s", title: "s", topic: "x.t", ages: [3, 14], prerequisites: [], objective: "o" }],
      worlds: [world("b", [9, 14]), world("a", [3, 8])],
    };
    const empty: ContentPack = { id: "library-y", title: "y", libraries: [lib("y", true)] };
    const hidden: ContentPack = { id: "library-z", title: "z", libraries: [{ ...lib("z", false) }], worlds: [{ ...world("c", [3, 14]), subject: "z" }] };
    const reg = buildRegistry([pack, empty, hidden]);
    expect(allPaths(reg).map((p) => p.id)).toEqual(["x", "z"]); // y has no world
    expect(visiblePaths(reg, false).map((p) => p.id)).toEqual(["x"]);
    expect(visiblePaths(reg, true).map((p) => p.id)).toEqual(["x", "z"]);
    const x = allPaths(reg)[0]!;
    expect(x.title).toBe("Go with Hana");
    expect(pathAgeGaps(x)).toEqual([]);
    expect(toPathDef(x)).toEqual({ id: "x", worlds: [{ id: "a", ages: [3, 8], maxLevel: 3, handoff: undefined, skills: ["x.t.s"] }, { id: "b", ages: [9, 14], maxLevel: 3, handoff: undefined, skills: ["x.t.s"] }] });
  });
});

describe("island pictures and hand-off levels", () => {
  it("every live or coming-soon path has its own island (pre-readers tell journeys apart by their island, D-041)", () => {
    for (const p of allPaths()) if (p.live || p.library.path?.soon) expect(artIdOf(p.id), p.id).not.toBe("generic");
  });
  it("at most one path is marked as coming soon (the fogged island)", () => {
    expect(allPaths().filter((p) => p.library.path?.soon && !p.live).length).toBeLessThanOrEqual(1);
  });
  it("a world's hand-off level, when a pack sets one, is a level of that world", () => {
    for (const w of registry.worlds) if (w.handoff !== undefined) expect(Number.isInteger(w.handoff) && w.handoff >= 0 && w.handoff <= w.maxLevel, w.id).toBe(true);
  });
  it("U1 evidence cap applies to every world: an all-first-try round serves items two levels above the round's level", async () => {
    const short: string[] = [];
    for (const w of registry.worlds) {
      const game = await w.loadDefinition();
      for (const level of [0, Math.floor(game.progression.maxLevel / 2)]) {
        const round = buildRound(game, { level, seed: 7 });
        let st = initialProgression(game.progression, startDifficultyFor(level, game.progression));
        let top = 0;
        while (!isRoundComplete(st, game.progression)) {
          const ex = selectNextExercise(round, st);
          if (!ex) break;
          top = Math.max(top, ex.difficulty);
          st = applyResult(markPlayed(st, ex.id), { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }, game.progression);
        }
        // difficulty = level + 1, so a +2 skip needs an item at difficulty level + 3 (or the top)
        if (top < Math.min(game.progression.maxLevel + 1, level + 3)) short.push(`${w.id}@L${level}: top difficulty ${top}`);
      }
    }
    expect(short).toEqual([]);
  });
});

describe("visibility (live flag + dev override)", () => {
  afterEach(() => withOverride(false));
  it("with no live path, path UI is off; ?paths=all (dev / localhost only) shows every path", () => {
    withOverride(false);
    expect(visiblePaths().every((p) => p.live)).toBe(true);
    expect(pathsEnabled()).toBe(allPaths().some((p) => p.live));
    withOverride(true);
    expect(visiblePaths().length).toBe(allPaths().length);
    expect(pathsEnabled()).toBe(true);
  });
});

describe("PP1: today's plan prefers the path's current world", () => {
  const s = (w: string, k: DailyPlanStop["k"] = "practice", o?: string[]): DailyPlanStop => (o ? { w, k, o } : { w, k });
  it("puts the world on the first learning stop; reviews and the pick stay", () => {
    const plan = [s("r", "review"), s("a", "new"), s("b"), s("c", "stretch"), s("a", "pick", ["a", "d"])];
    expect(preferPathWorld(plan, "p", true)).toEqual([s("r", "review"), s("p", "new"), s("b"), s("c", "stretch"), s("a", "pick", ["a", "d"])]);
    expect(preferPathWorld(plan, "p", false)[1]).toEqual(s("p", "practice"));
  });
  it("moves an already planned stop forward instead of adding one", () => {
    const plan = [s("a", "new"), s("b"), s("p", "stretch"), s("c")];
    expect(preferPathWorld(plan, "p", false)).toEqual([s("p", "stretch"), s("b"), s("a", "new"), s("c")]);
  });
  it("never creates neighbouring stops of one world and never gives a world a 3rd stop", () => {
    expect(preferPathWorld([s("a"), s("p", "review")], "p", false)).toEqual([s("a"), s("p", "review")]);
    expect(preferPathWorld([s("p", "review"), s("a"), s("b")], "p", false)).toEqual([s("p", "review"), s("a"), s("p")]);
    const full = [s("a"), s("p", "review"), s("b"), s("p", "pick", ["p", "c"])];
    expect(preferPathWorld(full, "p", false)).toEqual(full);
    expect(preferPathWorld([], "p", false)).toEqual([]);
    expect(preferPathWorld([s("a")], undefined, false)).toEqual([s("a")]);
  });
  it("D1 warm-up: ONE stop of the previous world, badged like a review, before the path world when neighbours allow", () => {
    const plan = [s("r", "review"), s("a", "new"), s("b"), s("c", "stretch"), s("d", "pick", ["d", "e"])];
    expect(planWithPath(plan, { world: "p", warm: "q" }, false)).toEqual([s("r", "review"), s("q", "review"), s("p"), s("c", "stretch"), s("d", "pick", ["d", "e"])]);
    // already planned as a stretch: that stop becomes the warm-up instead of adding one
    expect(planWithPath([s("a"), s("b"), s("q", "stretch")], { world: "p", warm: "q" }, false)).toEqual([s("q", "review"), s("b"), s("p")]);
    expect(planWithPath(plan, { world: "p", warm: null }, false)).toEqual(preferPathWorld(plan, "p", false));
    expect(planWithPath(plan, null, false)).toEqual(plan);
  });
  it("on real plans (every path × band × limit) the stop count, reviews and P9 variety are kept", () => {
    const worlds = registry.worlds;
    for (const p of allPaths()) {
      for (const band of [[3, 5], [6, 8], [9, 11], [12, 14]] as const) {
        const focus = toPathDef(p).worlds[0]!.id;
        for (let limit = 3; limit <= 10; limit++) {
          const plan = planDay({ day: "2026-11-23", limit, band, worlds, skills: registry.skills, levels: {}, log: emptyDailyLog() }).map(toStored);
          const out = preferPathWorld(plan, focus, true);
          expect(out).toHaveLength(plan.length);
          expect(out.filter((x) => x.k === "review")).toEqual(plan.filter((x) => x.k === "review"));
          const adj = (a: DailyPlanStop[]) => a.filter((x, i) => i > 0 && (a[i - 1]!.o ?? [a[i - 1]!.w]).some((w) => (x.o ?? [x.w]).includes(w))).length;
          expect(adj(out)).toBeLessThanOrEqual(adj(plan));
          expect(out.filter((x) => (x.o ?? [x.w]).includes(focus)).length).toBeLessThanOrEqual(2);
          expect(out.some((x) => x.w === focus)).toBe(true);
        }
      }
    }
  });
});

describe("app glue: storage, rounds, plan", () => {
  beforeEach(() => {
    clearState();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 9, 30));
    saveState({ ageBand: "ages-6-8" });
    withOverride(true);
  });
  afterEach(() => {
    vi.useRealTimers();
    withOverride(false);
  });
  const pilot = () => visiblePaths().find((p) => p.id === "pilot")!;
  const math = () => visiblePaths().find((p) => p.id === "math")!;
  /** A round: `first` items right first try at difficulty `d` (two-option items have chance 0.5). */
  const results = (first: number, n = 8, d = 1) => Array.from({ length: n }, (_, i) => ({ exerciseId: `e${i}`, skillId: "s", difficulty: d, attempts: i < first ? 1 : 2, firstTry: i < first, hintsShown: i < first ? 0 : 1, chance: 0 }));

  it("A1 from the stored band; picking a path stores it and starts the world at level 0 (A3)", () => {
    expect(childAge()).toBe(7);
    expect(childAge(null)).toBe(4);
    expect(childBand()).toEqual([6, 8]);
    pickPath(math());
    expect(loadState().paths.cur).toBe("math");
    expect(currentPath()?.id).toBe("math");
    const stop = currentStop(math());
    expect(stop.world.id).toBe("glow-cave-hops"); // nearest + younger for 7: Glow Cave Hops (5–7)
    expect(stop.level).toBe(0);
    expect(loadState().progress.levels?.["glow-cave-hops"]).toBe(0);
    expect(pathFocus()).toEqual({ path: "math", world: "glow-cave-hops", warm: null });
  });
  it("switching path keeps both paths' stops", () => {
    pickPath(math());
    pickPath(pilot());
    expect(loadState().paths.cur).toBe("pilot");
    expect(loadState().paths.by.math?.w).toBe("glow-cave-hops");
    expect(loadState().paths.by.pilot?.w).toBe("sky-hoops");
    pickPath(math());
    expect(currentStop(math()).world.id).toBe("glow-cave-hops");
  });
  /** What GameRunner does first: store the R0 level for the round (≥ 50 % first try → + 1). */
  const r0 = (world: string, level: number) => saveState({ progress: { ...loadState().progress, levels: { ...loadState().progress.levels, [world]: level } } });
  const lv = (world: string) => loadState().progress.levels?.[world];

  it("records rounds: placement — one easy round in a new world skips ahead as far as the round showed", () => {
    pickPath(pilot());
    expect(lv("sky-hoops")).toBe(0);
    r0("sky-hoops", 1);
    const r = recordRound({ gameId: "sky-hoops", level: 0, results: results(8, 8, 3) }); // answered difficulty 3 = level 2
    expect(r?.note).toEqual({ kind: "skip", world: "sky-hoops", level: 2 });
    expect(lv("sky-hoops")).toBe(2);
    expect(noteText(r!.note)).toBe("Zoom! You're ready for a bigger challenge!");
  });
  it("records rounds: hand forward at the top level; the 3rd round of the run offers another path after a drop", () => {
    pickPath(math());
    r0("glow-cave-hops", 3);
    expect(recordRound({ gameId: "glow-cave-hops", level: 2, results: results(8) })?.note).toBeNull(); // nothing above level 2 answered: no skip
    const r = recordRound({ gameId: "glow-cave-hops", level: 3, results: results(6) }); // top level, 75 %
    expect(r?.note).toEqual({ kind: "next-world", world: "sky-balloon-race", level: 0 });
    expect(noteText(r!.note)).toBe("You're ready for the next stop on your path!");
    expect(currentStop(math()).world.id).toBe("sky-balloon-race");
    expect(lv("sky-balloon-race")).toBe(0);
    expect(r?.offer).toBeNull();
    expect(recordRound({ gameId: "sky-balloon-race", level: 0, results: results(5) })?.offer).toBe("tired"); // 62.5 % vs 100 %
    expect(recordRound({ gameId: "sky-balloon-race", level: 0, results: results(1) })?.offer).toBeNull(); // once a day
    expect(recordRound({ gameId: "nope", level: 0, results: results(8) })).toBeNull();
  });
  it("records rounds: two struggling rounds go one level down; at level 0–1 of a later world a warm-up joins the next plan", () => {
    pickPath(pilot());
    r0("sky-hoops", 2);
    recordRound({ gameId: "sky-hoops", level: 2, results: results(2) });
    const r = recordRound({ gameId: "sky-hoops", level: 2, results: results(1) });
    expect(r?.note).toEqual({ kind: "down", world: "sky-hoops", level: 1, warm: null });
    expect(noteText(r!.note)).toBe("Great practice! Next time: a warm-up round!");
    expect(lv("sky-hoops")).toBe(1);
    pickPath(math());
    r0("glow-cave-hops", 3);
    recordRound({ gameId: "glow-cave-hops", level: 3, results: results(6) }); // → Sky Balloon Race, level 0
    recordRound({ gameId: "sky-balloon-race", level: 0, results: results(2) });
    const w = recordRound({ gameId: "sky-balloon-race", level: 0, results: results(2) });
    expect(w?.note).toEqual({ kind: "down", world: "sky-balloon-race", level: 0, warm: "glow-cave-hops" });
    expect(pathFocus()).toEqual({ path: "math", world: "sky-balloon-race", warm: "glow-cave-hops" });
    expect(lv("glow-cave-hops")).toBe(2); // Hn − 1
    vi.setSystemTime(new Date(2026, 10, 24, 9, 30));
    const plan = ensurePlan("2026-11-24");
    expect(plan.stops.filter((x) => x.w === "glow-cave-hops" && x.k === "review")).toHaveLength(1);
    expect(plan.stops.find((x) => x.k !== "review" && x.k !== "pick")?.w).toBe("sky-balloon-race");
  });
  it("migration: a device saved before paths existed keeps its progress and gets an empty path state", async () => {
    localStorage.setItem("bz.v1", JSON.stringify({ ageBand: "ages-6-8", muted: true, progress: { v: 1, stickers: ["s"], roundsCompleted: 4, skills: {}, levels: { "sky-hoops": 3 } } }));
    vi.resetModules();
    const fresh = await import("../../src/services/storage");
    const st = fresh.loadState();
    expect(st.paths).toEqual(emptyPathsState());
    expect(st.progress.levels).toEqual({ "sky-hoops": 3 });
    expect(st.muted).toBe(true);
  });
  it("a corrupt path state is dropped without touching the rest", async () => {
    localStorage.setItem("bz.v1", JSON.stringify({ ageBand: "ages-6-8", progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "sky-hoops": 1 } }, paths: { v: 1, cur: 42, by: "x", run: [] } }));
    vi.resetModules();
    const fresh = await import("../../src/services/storage");
    expect(fresh.loadState().paths).toEqual(emptyPathsState());
    expect(fresh.loadState().progress.levels).toEqual({ "sky-hoops": 1 });
  });
  it("today's plan puts the chosen path's world first and re-plans when the child switches path", () => {
    const plain = ensurePlan("2026-11-23");
    pickPath(pilot());
    const withPath = ensurePlan("2026-11-23");
    expect(withPath.reg).not.toBe(plain.reg);
    const first = withPath.stops.find((x) => x.k !== "review" && x.k !== "pick");
    expect(first?.w).toBe("sky-hoops");
    expect(ensurePlan("2026-11-23")).toBe(withPath); // stable until something changes
  });
  it("without a visible path the plan is exactly the planner's", () => {
    pickPath(visiblePaths().find((p) => p.id === "cs")!); // a path that is not live, chosen while the dev override showed it…
    withOverride(false); // …but no path is visible now
    expect(pathFocus()).toBeNull();
    const plan = ensurePlan("2026-11-23");
    expect(plan.stops).toEqual(planDay({ day: "2026-11-23", limit: 5, band: [6, 8], worlds: registry.worlds.filter((w) => registry.libraries.find((l) => l.id === w.subject)?.status === "live"), skills: registry.skills, levels: loadState().progress.levels ?? {}, log: emptyDailyLog() }).map(toStored));
  });
  it("remembers rounds started from the path view (per tab)", () => {
    setPathPlay("sky-hoops");
    expect(isPathPlay("sky-hoops")).toBe(true);
    expect(isPathPlay("glow-cave-hops")).toBe(false);
    setPathPlay(null);
    expect(isPathPlay("sky-hoops")).toBe(false);
  });
});

describe("reward notes never frame a step down as failure", () => {
  it("shows exactly the spoken line, in kind words", () => {
    const notes = [
      { kind: "skip", world: "sky-hoops", level: 4 },
      { kind: "next-world", world: "sky-hoops", level: 0 },
      { kind: "down", world: "sky-hoops", level: 1, warm: null },
      { kind: "down", world: "sky-hoops", level: 0, warm: "x" },
      { kind: "path-end", world: "sky-hoops" },
    ] as const;
    const texts = notes.map((n) => noteText(n));
    expect(texts).toEqual([
      "Zoom! You're ready for a bigger challenge!",
      "You're ready for the next stop on your path!",
      "Great practice! Next time: a warm-up round!",
      "Great practice! Next time: a warm-up round!",
      "You explored the whole path!",
    ]);
    notes.forEach((n, i) => expect(renderLine(noteLine(n)!)).toBe(texts[i]));
    for (const t of texts) expect(t!.toLowerCase()).not.toMatch(/fail|wrong|too hard|easier|smart|clever|level \d/);
    expect(noteText(null)).toBeUndefined();
  });
});
