/**
 * Static catalogue shared by the parent dashboard and the Worker (digest email, validation).
 * Pure data: no React, no DOM. Keep in step with src/games/* (a unit test checks the world ids).
 */
export const WORLDS = [
  { id: "counting-adventure", name: "Bobbo's Breakfast", ages: "4–6", maxLevel: 3 },
  { id: "glow-cave-hops", name: "Glow Cave Hops", ages: "5–7", maxLevel: 3 },
  { id: "sky-balloon-race", name: "Sky Balloon Race", ages: "6–8", maxLevel: 3 },
  { id: "cookie-kitchen", name: "Cookie Kitchen", ages: "7–9", maxLevel: 3 },
] as const;
export type WorldId = (typeof WORLDS)[number]["id"];
export const WORLD_IDS: readonly string[] = WORLDS.map((w) => w.id);
export const worldName = (id: string) => WORLDS.find((w) => w.id === id)?.name ?? id;

/** Parent-facing skill names (ids from docs/CURRICULUM.md). */
export const SKILL_LABELS: Record<string, string> = {
  "math.count.one-to-one": "Counting each object once",
  "math.count.cardinality": "Knowing the last number tells how many",
  "math.count.subitize": "Seeing small amounts at a glance",
  "math.count.make-set": "Counting out a set",
  "math.add.number-line": "Adding on a number line",
  "math.add.within-20": "Adding within 20",
  "math.div.share-equally": "Sharing equally (early division)",
};
export const skillLabel = (id: string) => SKILL_LABELS[id] ?? id;

/** Which world practises which skill (used for "what to practise next" suggestions). */
export const SKILL_WORLD: Record<string, WorldId> = {
  "math.count.one-to-one": "counting-adventure",
  "math.count.cardinality": "counting-adventure",
  "math.count.subitize": "counting-adventure",
  "math.count.make-set": "counting-adventure",
  "math.add.number-line": "glow-cave-hops",
  "math.add.within-20": "sky-balloon-race",
  "math.div.share-equally": "cookie-kitchen",
};

export const AGE_BAND_IDS = ["ages-3-5", "ages-6-8", "ages-9-11", "ages-12-14"] as const;
export type AgeBandId = (typeof AGE_BAND_IDS)[number];
export const ageBandLabel = (id: string) => id.replace(/^ages-(\d+)-(\d+)$/, "Ages $1–$2");

/** Monster part ids: mirrors src/characters/Monster.tsx (unit test asserts equality) so the Worker needn't import React code. */
export const MONSTER_PARTS = {
  body: ["egg", "round", "bean", "jelly", "block"],
  color: ["orange", "purple", "teal", "green", "blue", "pink", "yellow", "red"],
  eyes: ["two", "one", "three", "sleepy", "specs"],
  mouth: ["smile", "laugh", "fang", "o", "tongue"],
  arms: ["tiny", "wave", "claws", "wings", "noodle"],
  top: ["horns", "ears", "antenna", "leaves", "none"],
} as const;
