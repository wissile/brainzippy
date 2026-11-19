import type { Character, ContentPack, Library, Skill, Subject, Topic, World } from "./types";

/**
 * The content registry: every pack under ./packs/<pack>/index.ts (default export), merged.
 * Pure helpers over plain data; `buildRegistry` is exported so tests can check synthetic packs.
 */
export interface Registry {
  packs: readonly ContentPack[];
  /** Every library, by `order` then id (live and coming-soon). */
  libraries: readonly Library[];
  /** = libraries (a Library is a Subject; kept for code written before D-028). */
  subjects: readonly Subject[];
  topics: readonly Topic[];
  skills: readonly Skill[];
  characters: readonly Character[];
  worlds: readonly World[];
}

export function buildRegistry(packs: readonly ContentPack[]): Registry {
  const sorted = [...packs].sort((a, b) => a.id.localeCompare(b.id));
  const libraries = sorted.flatMap((p) => p.libraries ?? []).sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    packs: sorted,
    libraries,
    subjects: libraries,
    topics: sorted.flatMap((p) => p.topics ?? []),
    skills: sorted.flatMap((p) => p.skills ?? []),
    characters: sorted.flatMap((p) => p.characters ?? []),
    worlds: sorted.flatMap((p) => p.worlds ?? []),
  };
}

const modules = import.meta.glob<ContentPack>("./packs/*/index.ts", { eager: true, import: "default" });
export const registry: Registry = buildRegistry(Object.values(modules));

/** Pack folders whose pack id differs from the folder name (empty = valid; asserted by tests). */
export function packFolderProblems(mods: Record<string, ContentPack> = modules): string[] {
  return Object.entries(mods)
    .map(([path, pack]) => [path.split("/").at(-2) ?? path, pack?.id] as const)
    .filter(([folder, id]) => folder !== id)
    .map(([folder, id]) => `pack folder ${folder} exports pack id ${String(id)} (they must match)`);
}

// ---------------------------------------------------------------- lookups

export const allWorlds = (): readonly World[] => registry.worlds;
export const getWorld = (id: string): World | undefined => registry.worlds.find((w) => w.id === id);
export const getSkill = (id: string): Skill | undefined => registry.skills.find((s) => s.id === id);
export const getSubject = (id: string): Subject | undefined => registry.subjects.find((s) => s.id === id);
export const getLibrary = (id: string, reg: Registry = registry): Library | undefined => reg.libraries.find((l) => l.id === id);
/** The library a world belongs to. */
export const libraryOf = (w: Pick<World, "subject">, reg: Registry = registry): Library | undefined => getLibrary(w.subject, reg);
/** A world is playable from Explore and the daily trail only when its library is live. */
export const isPlayable = (w: Pick<World, "subject">, reg: Registry = registry): boolean => libraryOf(w, reg)?.status === "live";
/** Worlds of live libraries: the set Explore plays, the planner plans and the site may publish. */
export const playableWorlds = (reg: Registry = registry): World[] => reg.worlds.filter((w) => isPlayable(w, reg));

/** Every library (by `order`) with its worlds. Coming-soon libraries keep their worlds (in development). */
export function worldsByLibrary(reg: Registry = registry): { library: Library; worlds: World[] }[] {
  return reg.libraries.map((library) => ({ library, worlds: reg.worlds.filter((w) => w.subject === library.id) }));
}
export const getTopic = (id: string): Topic | undefined => registry.topics.find((t) => t.id === id);
export const getCharacter = (id: string): Character | undefined => registry.characters.find((c) => c.id === id);

/** Worlds suitable for a child of `age` (inclusive age range), in registry order (any library status). */
export function worldsForAge(age: number, reg: Registry = registry): World[] {
  return reg.worlds.filter((w) => w.ages[0] <= age && age <= w.ages[1]);
}

/** Worlds grouped by library id (libraries in registry order; libraries without worlds are omitted). */
export function worldsBySubject(reg: Registry = registry): Map<string, World[]> {
  const out = new Map<string, World[]>();
  for (const s of reg.subjects) {
    const ws = reg.worlds.filter((w) => w.subject === s.id);
    if (ws.length) out.set(s.id, ws);
  }
  return out;
}

/** Live libraries that have at least one world, in registry order (for copy that must not go stale). */
export function liveSubjects(reg: Registry = registry): Library[] {
  const by = worldsBySubject(reg);
  return reg.libraries.filter((l) => l.status === "live" && by.has(l.id));
}

/** "a", "a and b", "a, b and c". */
export const joinAnd = (xs: readonly string[]): string => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** All prerequisites of a skill, transitively, in learn-first order (deepest first). Unknown ids are skipped. */
export function skillPrereqs(skillId: string, reg: Registry = registry): string[] {
  const byId = new Map(reg.skills.map((s) => [s.id, s]));
  const out: string[] = [];
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (out.includes(id) || visiting.has(id)) return;
    visiting.add(id);
    for (const p of byId.get(id)?.prerequisites ?? []) visit(p);
    visiting.delete(id);
    out.push(id);
  };
  for (const p of byId.get(skillId)?.prerequisites ?? []) visit(p);
  return out;
}

// ---------------------------------------------------------------- integrity

const ID = /^[a-z0-9][a-z0-9.\-]*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
/** WCAG contrast ratio between two #rrggbb colours (1–21). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

/** Structural problems in a registry (empty = valid). Asserted by tests/unit/registry.test.ts and by scripts/new-library.mjs output. */
export function checkRegistry(reg: Registry = registry): string[] {
  const p: string[] = [];
  const dupes = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) p.push(`duplicate ${label} id: ${id}`);
      seen.add(id);
      if (!ID.test(id)) p.push(`${label} id must be lowercase a-z0-9 . -: ${id}`);
    }
  };
  dupes("pack", reg.packs.map((x) => x.id));
  dupes("library", reg.libraries.map((x) => x.id));
  dupes("topic", reg.topics.map((x) => x.id));
  dupes("skill", reg.skills.map((x) => x.id));
  dupes("character", reg.characters.map((x) => x.id));
  dupes("world", reg.worlds.map((x) => x.id));

  const libraries = new Map(reg.libraries.map((l) => [l.id, l]));
  const topics = new Map(reg.topics.map((t) => [t.id, t]));
  const skills = new Map(reg.skills.map((s) => [s.id, s]));
  const characters = new Set(reg.characters.map((c) => c.id));
  const ages = (label: string, a: readonly [number, number]) => {
    if (!(a[0] >= 3 && a[1] <= 14 && a[0] <= a[1])) p.push(`${label}: ages must be within 3–14 and ordered`);
  };
  const claims = (label: string, text: string) => {
    if (/\bproven\b|guarantee/i.test(text)) p.push(`${label}: must not claim proven results (D-020)`);
  };

  // libraries: one per `library-<id>` pack folder, with a host, a theme and kid-facing copy (D-028)
  for (const pack of reg.packs) {
    const libs = pack.libraries ?? [];
    const m = /^library-(.+)$/.exec(pack.id);
    if (!m && libs.length) p.push(`pack ${pack.id}: only a library-<id> pack may declare a library`);
    // a library-<id> pack declares exactly that one library (a characters-only pack like library-hosts declares none)
    if (m && libs.length && (libs.length !== 1 || libs[0]!.id !== m[1])) p.push(`pack ${pack.id}: must declare exactly one library, with id ${m[1]}`);
  }
  for (const l of reg.libraries) {
    const at = `library ${l.id}`;
    if (!/^[a-z][a-z0-9-]*$/.test(l.id)) p.push(`${at}: id must be lowercase kebab-case without dots (it prefixes topic and skill ids)`);
    if (!l.title?.trim() || !l.kidTitle?.trim() || !l.pitch?.trim() || !l.description?.trim()) p.push(`${at}: needs title, kidTitle, pitch and description`);
    if ((l.pitch ?? "").split(/\s+/).length > 12) p.push(`${at}: pitch must be 12 words or fewer`);
    claims(at, `${l.description} ${l.pitch}`);
    if (!l.host) p.push(`${at}: needs a host character`);
    else if (!characters.has(l.host)) p.push(`${at}: unknown host character ${l.host}`);
    const t = l.theme;
    if (!t || ![t.main, t.soft, t.deep].every((c) => HEX.test(c ?? ""))) p.push(`${at}: theme needs main, soft and deep as #rrggbb`);
    else {
      if (contrast(t.deep, "#ffffff") < 4.5) p.push(`${at}: theme.deep needs ≥ 4.5:1 contrast on white`);
      if (contrast(t.deep, t.soft) < 4.5) p.push(`${at}: theme.deep needs ≥ 4.5:1 contrast on theme.soft`);
    }
    ages(at, l.ages);
    if (l.status !== "live" && l.status !== "coming-soon") p.push(`${at}: status must be "live" or "coming-soon"`);
    if (!Number.isFinite(l.order)) p.push(`${at}: order must be a number`);
    if (l.status === "live" && !reg.worlds.some((w) => w.subject === l.id)) p.push(`${at}: a live library needs at least one world (or set status "coming-soon")`);
  }

  for (const t of reg.topics) {
    if (!libraries.has(t.subject)) p.push(`topic ${t.id}: unknown library ${t.subject}`);
    else if (!t.id.startsWith(`${t.subject}.`)) p.push(`topic ${t.id}: id must start with its library id "${t.subject}."`);
  }
  for (const s of reg.skills) {
    if (!topics.has(s.topic)) p.push(`skill ${s.id}: unknown topic ${s.topic}`);
    ages(`skill ${s.id}`, s.ages);
    for (const q of s.prerequisites) if (!skills.has(q)) p.push(`skill ${s.id}: unknown prerequisite ${q}`);
    if (!s.objective.trim()) p.push(`skill ${s.id}: missing objective`);
  }
  // prerequisites must be acyclic
  const state = new Map<string, 1 | 2>();
  const dfs = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      p.push(`prerequisite cycle: ${[...path.slice(path.indexOf(id)), id].join(" → ")}`);
      return;
    }
    state.set(id, 1);
    for (const q of skills.get(id)?.prerequisites ?? []) dfs(q, [...path, id]);
    state.set(id, 2);
  };
  for (const s of reg.skills) dfs(s.id, []);

  for (const w of reg.worlds) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(w.id)) p.push(`world ${w.id}: id must be kebab-case (it is the /play/<id> route and folder name)`);
    const lib = libraries.get(w.subject);
    if (!lib) p.push(`world ${w.id}: belongs to no library (unknown library ${w.subject})`);
    else if (!(lib.ages[0] <= w.ages[0] && w.ages[1] <= lib.ages[1])) p.push(`world ${w.id}: ages ${w.ages[0]}–${w.ages[1]} must sit inside library ${lib.id} ages ${lib.ages[0]}–${lib.ages[1]}`);
    const topic = topics.get(w.topic);
    if (!topic) p.push(`world ${w.id}: unknown topic ${w.topic}`);
    else if (topic.subject !== w.subject) p.push(`world ${w.id}: topic ${w.topic} is not in library ${w.subject}`);
    if (w.skills.length === 0) p.push(`world ${w.id}: needs at least one skill`);
    for (const s of w.skills) if (!skills.has(s)) p.push(`world ${w.id}: unknown skill ${s}`);
    if (w.characters.length === 0) p.push(`world ${w.id}: needs a host character`);
    for (const c of w.characters) if (!characters.has(c)) p.push(`world ${w.id}: unknown character ${c}`);
    ages(`world ${w.id}`, w.ages);
    if (!Number.isInteger(w.maxLevel) || w.maxLevel < 0) p.push(`world ${w.id}: maxLevel must be an integer ≥ 0`);
    if (!w.title.trim() || !w.blurb.trim() || !w.parentDescription.trim() || !w.gameType.trim()) p.push(`world ${w.id}: needs title, gameType, blurb and parentDescription`);
    if (/\bproven\b|guarantee/i.test(w.parentDescription)) p.push(`world ${w.id}: parentDescription must not claim proven results (D-020)`);
    if (w.map && !(w.map.x >= 0 && w.map.x <= 100 && w.map.y >= 0 && w.map.y <= 100)) p.push(`world ${w.id}: map position must be within 0–100 %`);
  }
  return p;
}
