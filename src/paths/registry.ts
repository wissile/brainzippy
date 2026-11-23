import { getCharacter, isPlayable, registry, type Registry } from "../content/registry";
import type { Library, World } from "../content/types";
import type { PathDef } from "../engine/pathProgress";

/**
 * Learning paths from the content registry (docs/PATHS.md, D-034). A path is a library with a `path` field: the
 * child-facing title names the library's host ("Learn to fly with Zephy"), the trail is the library's playable worlds
 * in age order. Pure helpers over registry data; visibility (the `live` flag + dev override) is in ./flags.
 */
export interface LearningPath {
  /** = library id. */
  id: string;
  library: Library;
  /** Host character id (= library.host, so swapping the host is a one-line data change). */
  host: string;
  hostName: string;
  /** "Learn to fly with Zephy". */
  title: string;
  /** Voice line id that says the title; speak it with `{ host: hostName }`. */
  line: string;
  live: boolean;
  /** Playable worlds in trail order. */
  worlds: World[];
}

export const PATH_AGES = [3, 14] as const;

const byAge = (a: World, b: World) => a.ages[0] - b.ages[0] || a.ages[1] - b.ages[1] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Worlds of a library in trail order: the pack's explicit order first (unknown ids skipped), then the rest by age. */
export function pathWorlds(library: Library, reg: Registry = registry): World[] {
  const own = reg.worlds.filter((w) => w.subject === library.id && isPlayable(w, reg));
  const explicit = (library.path?.worlds ?? []).flatMap((id) => own.find((w) => w.id === id) ?? []);
  return [...explicit, ...own.filter((w) => !explicit.includes(w)).sort(byAge)];
}

export const renderPathTitle = (template: string, hostName: string): string => template.replace(/\{host\}/g, hostName);

/** Every library that declares a path and has at least one playable world (live or not), in shelf order. */
export function allPaths(reg: Registry = registry): LearningPath[] {
  return reg.libraries.flatMap((library) => {
    if (!library.path) return [];
    const worlds = pathWorlds(library, reg);
    if (!worlds.length) return [];
    const hostName = reg.characters.find((c) => c.id === library.host)?.name ?? getCharacter(library.host)?.name ?? library.host;
    return [{ id: library.id, library, host: library.host, hostName, title: renderPathTitle(library.path.title, hostName), line: library.path.line, live: library.path.live, worlds }];
  });
}

/** Ages 3–14 that no world of the path covers (empty = the path may go live). */
export function pathAgeGaps(path: Pick<LearningPath, "worlds">): number[] {
  const out: number[] = [];
  for (let age = PATH_AGES[0]; age <= PATH_AGES[1]; age++) if (!path.worlds.some((w) => w.ages[0] <= age && age <= w.ages[1])) out.push(age);
  return out;
}

/** The engine's view of a path (ids, ages, levels only). */
export const toPathDef = (p: LearningPath): PathDef => ({ id: p.id, worlds: p.worlds.map((w) => ({ id: w.id, ages: w.ages, maxLevel: w.maxLevel, handoff: w.handoff, skills: w.skills })) });

export function pathOfWorld(worldId: string, paths: readonly LearningPath[]): LearningPath | undefined {
  return paths.find((p) => p.worlds.some((w) => w.id === worldId));
}
