import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VOICE_LINES } from "../../src/audio/voiceLines";
import { buildRegistry, checkRegistry, contrast, getLibrary, isPlayable, packFolderProblems, playableWorlds, registry, worldsByLibrary } from "../../src/content/registry";
import type { ContentPack, Library } from "../../src/content/types";
import { buildRound } from "../../src/engine/round";
import { lintExercise } from "../../src/engine/validation";

/** Library layer (D-029): every world belongs to a library; every library has a host, a theme and kid copy. */
const ELEVEN = ["math", "english", "cs", "pilot", "money", "cyber", "sci", "geo", "sel", "engr", "nature"];

describe("library registry integrity", () => {
  it("registers the eleven planned libraries, each from its own library-<id> pack folder", () => {
    expect(registry.libraries.map((l) => l.id).sort()).toEqual([...ELEVEN].sort());
    for (const l of registry.libraries) expect(registry.packs.find((p) => p.libraries?.some((x) => x.id === l.id))?.id, l.id).toBe(`library-${l.id}`);
    expect(packFolderProblems()).toEqual([]);
    expect(checkRegistry()).toEqual([]);
  });

  it("every world belongs to a library and sits inside its age range", () => {
    for (const w of registry.worlds) {
      const lib = getLibrary(w.subject);
      expect(lib, `${w.id} library`).toBeDefined();
      expect(lib!.ages[0] <= w.ages[0] && w.ages[1] <= lib!.ages[1], w.id).toBe(true);
    }
    expect(worldsByLibrary().reduce((n, g) => n + g.worlds.length, 0)).toBe(registry.worlds.length);
  });

  it("every library has a declared host, a readable theme, kid copy and a spoken pitch", () => {
    const chars = new Set(registry.characters.map((c) => c.id));
    const tokens = readFileSync("src/styles/tokens.css", "utf8");
    for (const l of registry.libraries) {
      expect(chars.has(l.host), `${l.id} host ${l.host}`).toBe(true);
      expect(contrast(l.theme.deep, "#ffffff"), `${l.id} deep on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(l.theme.deep, l.theme.soft), `${l.id} deep on soft`).toBeGreaterThanOrEqual(4.5);
      if (l.theme.token) expect(tokens.toLowerCase(), `${l.id} token ${l.theme.token}`).toContain(`${l.theme.token}: ${l.theme.main.toLowerCase()};`);
      expect(l.kidTitle.trim() && l.pitch.trim() && l.description.trim(), l.id).toBeTruthy();
      expect(l.description).not.toMatch(/\bproven\b|guarantee/i);
      // the shelf pitch is spoken for pre-readers: lib.<id>.pitch in the pack's voice.json, same words
      expect(VOICE_LINES[`lib.${l.id}.pitch`]?.text, `${l.id} pitch line`).toBe(l.pitch);
    }
    // hosts are distinct across libraries (one recurring host each)
    expect(new Set(registry.libraries.map((l) => l.host)).size).toBe(registry.libraries.length);
  });

  it("live libraries have worlds; libraries without worlds are coming-soon; only live worlds are playable", () => {
    for (const { library, worlds } of worldsByLibrary()) {
      if (library.status === "live") expect(worlds.length, library.id).toBeGreaterThan(0);
      if (worlds.length === 0) expect(library.status, library.id).toBe("coming-soon");
    }
    expect(registry.libraries.filter((l) => l.status === "live").map((l) => l.id)).toEqual(expect.arrayContaining(["math", "english"]));
    for (const w of playableWorlds()) expect(getLibrary(w.subject)?.status).toBe("live");
  });

  it("checkRegistry catches library mistakes", () => {
    const lib: Library = { ...getLibrary("cs")!, id: "zz", status: "live", host: "nobody", theme: { main: "#ffffff", soft: "#ffffff", deep: "#eeeeee" }, pitch: "one two three four five six seven eight nine ten eleven twelve thirteen" };
    const world = { ...registry.worlds[0]!, id: "zz-world", subject: "zz", ages: [3, 14] as const };
    const packs: ContentPack[] = [
      { id: "wrong-folder", title: "x", libraries: [{ ...lib, id: "yy" }] },
      { id: "library-zz", title: "x", libraries: [lib] },
      { id: "zz-worlds", title: "x", topics: [{ id: "zz.t", subject: "zz", title: "T" }], worlds: [{ ...world, topic: "zz.t" }] },
      { id: "library-empty", title: "x", libraries: [{ ...lib, id: "empty", host: "bobbo", theme: getLibrary("cs")!.theme, pitch: "Hi.", status: "live" }] },
    ];
    const problems = checkRegistry(buildRegistry([...registry.packs, ...packs]));
    expect(problems).toEqual(
      expect.arrayContaining([
        "pack wrong-folder: only a library-<id> pack may declare a library",
        "library zz: unknown host character nobody",
        "library zz: theme.deep needs ≥ 4.5:1 contrast on white",
        "library zz: pitch must be 12 words or fewer",
        expect.stringMatching(/^world zz-world: ages 3–14 must sit inside library zz/),
        'library empty: a live library needs at least one world (or set status "coming-soon")',
      ]),
    );
    expect(isPlayable({ subject: "geo" })).toBe(false); // coming soon
    expect(isPlayable({ subject: "pilot" })).toBe(true); // live since Zephy's Sky Hoops
    expect(isPlayable({ subject: "cs" })).toBe(true); // live since Toggle's Garden Path
    expect(isPlayable({ subject: "math" })).toBe(true);
  });
});

describe("scripts/new-library.mjs", () => {
  it("scaffolds a library pack + starter world that pass the registry checks and lint at every level", async () => {
    // a temp dir INSIDE the worktree, so Vite can import the generated TypeScript; always removed
    const tmp = mkdtempSync(join(process.cwd(), ".tmp-new-library-"));
    try {
      const out = execFileSync("node", ["scripts/new-library.mjs", "music", "--title", "Music", "--kid-title", "Song Garden", "--host", "melo", "--host-name", "Melo", "--ages", "4-9", "--colour", "#7C5CFF", "--root", tmp], { encoding: "utf8" });
      expect(out).toContain('created library "music"');
      for (const f of ["src/content/packs/library-music/index.ts", "src/content/packs/library-music/voice.json", "src/games/music-start/definition.ts", "src/games/music-start/MusicStart.tsx", "src/games/music-start/voice.json"])
        expect(existsSync(join(tmp, f)), f).toBe(true);

      const pack = (await import(/* @vite-ignore */ join(tmp, "src/content/packs/library-music/index.ts"))).default as ContentPack;
      expect(pack.id).toBe("library-music");
      const reg = buildRegistry([...registry.packs, pack]);
      expect(checkRegistry(reg)).toEqual([]);
      const lib = reg.libraries.find((l) => l.id === "music")!;
      expect(lib.status).toBe("coming-soon"); // a scaffold never goes live by itself
      expect(reg.characters.some((c) => c.id === "melo")).toBe(true);
      expect(contrast(lib.theme.deep, lib.theme.soft)).toBeGreaterThanOrEqual(4.5);
      expect(JSON.parse(readFileSync(join(tmp, "src/content/packs/library-music/voice.json"), "utf8")).lines["lib.music.pitch"].text).toBe(lib.pitch);

      // the starter world's definition is real: it matches its entry and every round lints
      const w = reg.worlds.find((x) => x.subject === "music")!;
      const def = (await import(/* @vite-ignore */ join(tmp, "src/games/music-start/definition.ts"))).musicStart;
      expect(def.id).toBe(w.id);
      expect(def.progression.maxLevel).toBe(w.maxLevel);
      const voice = JSON.parse(readFileSync(join(tmp, "src/games/music-start/voice.json"), "utf8")).lines;
      for (let level = 0; level <= w.maxLevel; level++)
        for (const seed of [1, 2, 3]) {
          const round = buildRound(def, { level, seed });
          expect(round.exercises.length).toBeGreaterThanOrEqual(8);
          for (const ex of round.exercises) {
            expect(lintExercise(ex), ex.id).toEqual([]);
            expect(w.skills).toContain(ex.skillId);
            expect(voice[ex.prompt!.line].vary.thing).toContain(ex.prompt!.vars!.thing);
          }
        }

      // an existing host is reused, not redeclared; clashes are refused
      const tmp2 = join(tmp, "second");
      execFileSync("node", ["scripts/new-library.mjs", "art", "--title", "Art", "--kid-title", "Paint Pier", "--host", "zuzu", "--root", tmp2]);
      expect(readFileSync(join(tmp2, "src/content/packs/library-art/index.ts"), "utf8")).not.toMatch(/characters: \[\{ id:/);
      expect(() => execFileSync("node", ["scripts/new-library.mjs", "math", "--title", "M", "--kid-title", "M", "--host", "bobbo", "--root", join(tmp, "third")], { stdio: "pipe" })).toThrow();
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
