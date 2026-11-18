import type { Character, ContentPack, Skill, Subject, Topic, World } from "./types";

/**
 * The content registry: every pack under ./packs/<pack>/index.ts (default export), merged.
 * Pure helpers over plain data; `buildRegistry` is exported so tests can check synthetic packs.
 */
export interface Registry {
  packs: readonly ContentPack[];
  subjects: readonly Subject[];
  topics: readonly Topic[];
  skills: readonly Skill[];
  characters: readonly Character[];
  worlds: readonly World[];
}

export function buildRegistry(packs: readonly ContentPack[]): Registry {
  const sorted = [...packs].sort((a, b) => a.id.localeCompare(b.id));
  return {
    packs: sorted,
    subjects: sorted.flatMap((p) => p.subjects ?? []),
    topics: sorted.flatMap((p) => p.topics ?? []),
    skills: sorted.flatMap((p) => p.skills ?? []),
    characters: sorted.flatMap((p) => p.characters ?? []),
    worlds: sorted.flatMap((p) => p.worlds ?? []),
  };
}

const modules = import.meta.glob<ContentPack>("./packs/*/index.ts", { eager: true, import: "default" });
export const registry: Registry = buildRegistry(Object.values(modules));

// ---------------------------------------------------------------- lookups

export const allWorlds = (): readonly World[] => registry.worlds;
export const getWorld = (id: string): World | undefined => registry.worlds.find((w) => w.id === id);
export const getSkill = (id: string): Skill | undefined => registry.skills.find((s) => s.id === id);
export const getSubject = (id: string): Subject | undefined => registry.subjects.find((s) => s.id === id);
export const getTopic = (id: string): Topic | undefined => registry.topics.find((t) => t.id === id);
export const getCharacter = (id: string): Character | undefined => registry.characters.find((c) => c.id === id);

/** Worlds suitable for a child of `age` (inclusive age range), in registry order. */
export function worldsForAge(age: number, reg: Registry = registry): World[] {
  return reg.worlds.filter((w) => w.ages[0] <= age && age <= w.ages[1]);
}

/** Worlds grouped by subject id (subjects in registry order; subjects without worlds are omitted). */
export function worldsBySubject(reg: Registry = registry): Map<string, World[]> {
  const out = new Map<string, World[]>();
  for (const s of reg.subjects) {
    const ws = reg.worlds.filter((w) => w.subject === s.id);
    if (ws.length) out.set(s.id, ws);
  }
  return out;
}

/** Subjects that have at least one playable world, in registry order (for copy that must not go stale). */
export function liveSubjects(reg: Registry = registry): Subject[] {
  const by = worldsBySubject(reg);
  return reg.subjects.filter((s) => by.has(s.id));
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

/** Structural problems in a registry (empty = valid). Asserted by tests/unit/registry.test.ts. */
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
  dupes("subject", reg.subjects.map((x) => x.id));
  dupes("topic", reg.topics.map((x) => x.id));
  dupes("skill", reg.skills.map((x) => x.id));
  dupes("character", reg.characters.map((x) => x.id));
  dupes("world", reg.worlds.map((x) => x.id));

  const subjects = new Set(reg.subjects.map((s) => s.id));
  const topics = new Map(reg.topics.map((t) => [t.id, t]));
  const skills = new Map(reg.skills.map((s) => [s.id, s]));
  const characters = new Set(reg.characters.map((c) => c.id));
  const ages = (label: string, a: readonly [number, number]) => {
    if (!(a[0] >= 3 && a[1] <= 14 && a[0] <= a[1])) p.push(`${label}: ages must be within 3–14 and ordered`);
  };

  for (const t of reg.topics) if (!subjects.has(t.subject)) p.push(`topic ${t.id}: unknown subject ${t.subject}`);
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
    if (!subjects.has(w.subject)) p.push(`world ${w.id}: unknown subject ${w.subject}`);
    const topic = topics.get(w.topic);
    if (!topic) p.push(`world ${w.id}: unknown topic ${w.topic}`);
    else if (topic.subject !== w.subject) p.push(`world ${w.id}: topic ${w.topic} is not in subject ${w.subject}`);
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
