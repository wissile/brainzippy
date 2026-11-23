import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { buildRegistry, registry } from "../../src/content/registry";
import type { ContentPack, Library, World } from "../../src/content/types";
import { ensurePlan } from "../../src/daily/store";
import { planDay, toStored } from "../../src/daily/planner";
import { emptyDailyLog, type DailyPlanStop } from "../../src/engine/progressSchema";
import { emptyPathsState } from "../../src/engine/pathProgress";
import { initPathsOverride, pathsEnabled, visiblePaths } from "../../src/paths/flags";
import { preferPathWorld } from "../../src/paths/plan";
import { allPaths, pathAgeGaps, pathWorlds, renderPathTitle, toPathDef } from "../../src/paths/registry";
import { childAge, currentPath, currentStop, isPathPlay, pathFocus, pickPath, recordRound, setPathPlay } from "../../src/paths/state";
import { noteText } from "../../src/paths/PathGate";
import { clearState, loadState, saveState } from "../../src/services/storage";

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
    expect(paths.find((p) => p.id === "pilot")!.title).toBe("Learn to fly with Zephy");
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
    // math has worlds for 4–13; English only for 3–5 (first in line for new games)
    expect(gaps.math).toEqual([3, 10, 14]);
    expect(gaps.english).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].filter((a) => a > 5));
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
    expect(toPathDef(x)).toEqual({ id: "x", worlds: [{ id: "a", ages: [3, 8], maxLevel: 3 }, { id: "b", ages: [9, 14], maxLevel: 3 }] });
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
  const results = (first: number, n = 8) => Array.from({ length: n }, (_, i) => ({ exerciseId: `e${i}`, skillId: "s", difficulty: 1, attempts: i < first ? 1 : 2, firstTry: i < first, hintsShown: i < first ? 0 : 1 }));

  it("A1 from the stored band; picking a path stores it and seeds the start world's level", () => {
    expect(childAge()).toBe(7);
    expect(childAge(null)).toBe(4);
    pickPath(math());
    expect(loadState().paths.cur).toBe("math");
    expect(currentPath()?.id).toBe("math");
    const stop = currentStop(math());
    expect(stop.world.id).toBe("glow-cave-hops"); // first math world containing 7 (5–7)
    expect(stop.level).toBe(2);
    expect(loadState().progress.levels?.["glow-cave-hops"]).toBe(2);
    expect(pathFocus()).toEqual({ path: "math", world: "glow-cave-hops" });
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

  it("records rounds: two easy rounds in a row skip ahead (+2) and the stored level follows", () => {
    pickPath(pilot());
    expect(lv("sky-hoops")).toBe(2); // age 7 in 6–9, levels 0..9
    r0("sky-hoops", 3);
    expect(recordRound({ gameId: "sky-hoops", level: 2, results: results(8) })?.note).toBeNull();
    r0("sky-hoops", 4);
    const r = recordRound({ gameId: "sky-hoops", level: 3, results: results(8) });
    expect(r?.note).toEqual({ kind: "skip", world: "sky-hoops", level: 5 });
    expect(lv("sky-hoops")).toBe(5);
    expect(noteText(r!.note)).toBe("Zoom! You're ready for Level 6!");
  });
  it("records rounds: the top level moves to the next world; the 3rd path round of the day offers another path", () => {
    pickPath(math());
    r0("glow-cave-hops", 3);
    expect(recordRound({ gameId: "glow-cave-hops", level: 2, results: results(8) })?.note).toBeNull();
    const r = recordRound({ gameId: "glow-cave-hops", level: 3, results: results(6) }); // top level, 75 %
    expect(r?.note).toEqual({ kind: "next-world", world: "sky-balloon-race", level: 1 });
    expect(noteText(r!.note)).toBe("Next stop on your path: Sky Balloon Race!");
    expect(currentStop(math()).world.id).toBe("sky-balloon-race");
    expect(lv("sky-balloon-race")).toBe(1);
    expect(r?.offer).toBeNull();
    expect(recordRound({ gameId: "sky-balloon-race", level: 1, results: results(5) })?.offer).toBe("tired");
    expect(recordRound({ gameId: "nope", level: 0, results: results(8) })).toBeNull();
  });
  it("records rounds: two struggling rounds go one level down", () => {
    pickPath(pilot());
    recordRound({ gameId: "sky-hoops", level: 2, results: results(2) });
    const r = recordRound({ gameId: "sky-hoops", level: 2, results: results(1) });
    expect(r?.note).toEqual({ kind: "down", world: "sky-hoops", level: 1 });
    expect(lv("sky-hoops")).toBe(1);
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
    pickPath(pilot()); // chosen while visible…
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
  it("uses kind words for every note", () => {
    const texts = [
      noteText({ kind: "skip", world: "sky-hoops", level: 4 }),
      noteText({ kind: "next-world", world: "sky-hoops", level: 0 }),
      noteText({ kind: "down", world: "sky-hoops", level: 1 }),
      noteText({ kind: "back-world", world: "sky-hoops", level: 9 }),
      noteText({ kind: "path-end", world: "sky-hoops" }),
    ];
    expect(texts).toEqual([
      "Zoom! You're ready for Level 5!",
      "Next stop on your path: Zephy's Sky Hoops!",
      "Great practice! Next time: a warm-up on Level 2.",
      "Great practice! Next time: a warm-up in Zephy's Sky Hoops.",
      "You explored the whole path!",
    ]);
    for (const t of texts) expect(t!.toLowerCase()).not.toMatch(/fail|wrong|too hard|easier|smart|clever/);
    expect(noteText(null)).toBeUndefined();
  });
});
