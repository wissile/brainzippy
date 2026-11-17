import type { ComponentType } from "react";
import type { GameDefinition } from "../engine/types";

/**
 * Content registry types. A content pack (src/content/packs/<pack>/index.ts) declares subjects, topics,
 * skills, characters and worlds; the registry collects every pack with import.meta.glob, so a new library is
 * a new folder with no central edits. Pack files hold METADATA ONLY: game code, art and exercise data are
 * loaded lazily through `World.load` / `World.loadDefinition`.
 */

export type AgeRange = readonly [number, number];

export interface Subject {
  /** e.g. "math", "english", "computing", "aviation", "money", "cyber", "science" */
  id: string;
  title: string;
  /** One sentence for grown-ups / SEO hub pages. */
  description: string;
}

export interface Topic {
  /** Namespaced by subject, e.g. "math.counting". */
  id: string;
  subject: string;
  title: string;
  description?: string;
}

export interface Skill {
  /** Stable id used in exercises and progress, e.g. "math.count.cardinality". Never rename once shipped. */
  id: string;
  title: string;
  topic: string;
  ages: AgeRange;
  /** Skill ids that should be secure first (acyclic; checked by tests). */
  prerequisites: readonly string[];
  /** What the child can do afterwards, in plain words. */
  objective: string;
}

export interface Character {
  id: string;
  name: string;
  /** Short personality line (for docs, parent pages and art briefs). */
  blurb?: string;
}

export interface World {
  /** = GameDefinition.id = the route /play/<id> = folder src/games/<id>. */
  id: string;
  subject: string;
  topic: string;
  skills: readonly string[];
  ages: AgeRange;
  /** Highest 0-based level; must equal the game's progression.maxLevel. */
  maxLevel: number;
  title: string;
  /** What kind of game, for page titles: "counting game", "addition game"... */
  gameType: string;
  /** One line a child (or a grown-up reading aloud) understands: "Help Bobbo count his breakfast!" */
  blurb: string;
  /** 1–3 factual sentences for grown-ups and search engines: what is practised and how. No efficacy claims. */
  parentDescription: string;
  /** Character ids (declared by some pack); the first is the world's host on maps and cards. */
  characters: readonly string[];
  /** Lazy game component (code + art), e.g. () => import("../../../games/<id>/<Game>"). */
  load: () => Promise<{ default: ComponentType }>;
  /** Lazy game DATA (no React), for daily learning, sitemaps and tests. */
  loadDefinition: () => Promise<GameDefinition>;
  /** Repo-relative glob of the world's voice catalogues, e.g. "src/games/<id>/voice.json". */
  voice: string;
  /** Position on the Monster Island map, in % of the map (omit to keep the world off the map). */
  map?: { x: number; y: number };
}

export interface ContentPack {
  /** Folder name, e.g. "core-math". */
  id: string;
  title: string;
  subjects?: readonly Subject[];
  topics?: readonly Topic[];
  skills?: readonly Skill[];
  characters?: readonly Character[];
  worlds?: readonly World[];
}
