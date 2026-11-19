import type { ComponentType } from "react";
import type { GameDefinition } from "../engine/types";

/**
 * Content registry types. A content pack (src/content/packs/<pack>/index.ts) declares libraries, topics,
 * skills, characters and worlds; the registry collects every pack with import.meta.glob, so a new library is
 * a new folder with no central edits (D-028). Pack files hold METADATA ONLY: game code, art and exercise data
 * are loaded lazily through `World.load` / `World.loadDefinition`.
 *
 * Hierarchy: Library → Topic → Skill, practised in Worlds. A library is declared by exactly one pack folder,
 * `packs/library-<id>/`; worlds (in that pack or any other) join it through `World.subject = <library id>`.
 */

export type AgeRange = readonly [number, number];

export interface Subject {
  /** Permanent id, e.g. "math", "english", "cs", "sci". Topic, skill and progress ids are namespaced by it. */
  id: string;
  /** Grown-up title: "Maths", "Computer science". */
  title: string;
  /** Parent description: 1–2 factual sentences for grown-ups and search engines. No efficacy claims (D-020). */
  description: string;
}

/** `live`: worlds are playable, planned and published. `coming-soon`: a gentle teaser only (no play, no public page). */
export type LibraryStatus = "live" | "coming-soon";

/**
 * A library's colours, exposed to CSS as `--lib-main`, `--lib-soft` and `--lib-deep` on its shelf.
 * Values are `#rrggbb` so they can be contrast-checked; `token` names the tokens.css colour `main` comes from.
 */
export interface LibraryTheme {
  /** Accent: shelf band, host halo. Usually the host's colour. */
  main: string;
  /** Light tint behind the shelf's cards. */
  soft: string;
  /** Text and outline colour on white and on `soft` (≥ 4.5:1 contrast, checked). */
  deep: string;
  /** e.g. "--bobbo": src/styles/tokens.css custom property whose value equals `main` (checked when given). */
  token?: string;
}

/**
 * A learning library (D-028): a Subject plus everything the child-facing shelf, the planner and the public
 * site need. `World.subject` and `Topic.subject` hold the library id, so existing ids and progress stay valid.
 */
export interface Library extends Subject {
  /** What a child sees on the shelf: "Number Hill", "Code Garden". */
  kidTitle: string;
  /** Character id of the recurring host (declared by some pack). Referenced by id only; art lives in src/characters. */
  host: string;
  theme: LibraryTheme;
  /** Ages the library is planned for (3–14). Its worlds must sit inside this range. */
  ages: AgeRange;
  /** Short kid pitch, said or read on the shelf: "Count, add and share with Bobbo." (≤ 12 words) */
  pitch: string;
  status: LibraryStatus;
  /** Shelf order (ascending); ties by id. */
  order: number;
  /** Optional key of the library's island/map art (e.g. "island-number-hill"); unused keys fall back to the default. */
  art?: string;
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
  /** Library id (D-028; the field keeps its historical name). */
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
  /** Folder name, e.g. "core-math" (checked). */
  id: string;
  title: string;
  /** Only in a `library-<id>` pack, and then exactly one library whose id is <id> (checked). */
  libraries?: readonly Library[];
  topics?: readonly Topic[];
  skills?: readonly Skill[];
  characters?: readonly Character[];
  worlds?: readonly World[];
}
