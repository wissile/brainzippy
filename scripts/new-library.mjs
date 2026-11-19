#!/usr/bin/env node
/**
 * Scaffold a new learning library (D-029, docs/GAME_AUTHORING.md "Add a new library").
 *
 *   node scripts/new-library.mjs <library-id> --title "Music" --kid-title "Song Garden" --host melo \
 *        [--host-name "Melo"] [--host-blurb "…"] [--ages 5-10] [--colour "#7C5CFF"] [--pitch "…"] \
 *        [--description "…"] [--world music-start] [--world-title "Melo's First Notes"] [--root <dir>] [--force]
 *
 * Writes (relative to --root, default: this repo):
 *   src/content/packs/library-<id>/index.ts    the library (status "coming-soon"), host, a starter topic + skill + world
 *   src/content/packs/library-<id>/voice.json  the shelf pitch line  lib.<id>.pitch
 *   src/games/<world>/definition.ts            a playable placeholder picture-choice world (generator, 3 levels)
 *   src/games/<world>/<World>.tsx              GameRunner wiring with stub art
 *   src/games/<world>/voice.json               the world's spoken lines
 * Nothing else changes: the registry, Explore, the planner and the site pick the folder up by themselves.
 * The output passes checkRegistry() immediately (tests/unit/new-library.test.ts runs this script).
 * The library starts "coming-soon": a teaser shelf only. Replace the placeholder world, then flip status to "live".
 * Plain Node (no dependencies). Never overwrites files unless --force.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`new-library: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force" || a === "--help" || a === "-h") out[a.replace(/^-+/, "")] = true;
    else if (a.startsWith("--")) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) fail(`${a} needs a value`);
      out[a.slice(2)] = v;
      i++;
    } else out._.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- colour helpers (WCAG contrast)
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
const lum = (h) => {
  const c = hex(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
/** main → { main, soft (light tint), deep (darkened until ≥ 5:1 on white and on soft) }. */
export function themeFrom(main) {
  const soft = mix(main, "#FFFFFF", 0.86);
  let deep = main;
  for (let t = 0.3; t <= 0.95 && (contrast(deep, "#FFFFFF") < 5 || contrast(deep, soft) < 5); t += 0.05) deep = mix(main, "#1A1426", t);
  return { main: main.toUpperCase(), soft, deep };
}

// ---------------------------------------------------------------- existing ids (to avoid clashes)
function existing(root) {
  const ids = { libraries: new Set(), characters: new Set(), worlds: new Set() };
  for (const base of new Set([REPO, root])) {
    const packs = join(base, "src/content/packs");
    if (!existsSync(packs)) continue;
    for (const dir of readdirSync(packs)) {
      const f = join(packs, dir, "index.ts");
      if (!existsSync(f)) continue;
      const src = readFileSync(f, "utf8");
      if (dir.startsWith("library-")) ids.libraries.add(dir.slice("library-".length));
      for (const m of src.matchAll(/\{\s*id:\s*"([a-z0-9-]+)",\s*name:/g)) ids.characters.add(m[1]);
    }
    const games = join(base, "src/games");
    if (existsSync(games)) for (const d of readdirSync(games)) ids.worlds.add(d);
  }
  return ids;
}

const pascal = (s) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const q = (s) => JSON.stringify(s);

// ---------------------------------------------------------------- templates
function packTemplate(o) {
  const hostDecl = o.declareHost ? `\n  characters: [{ id: ${q(o.host)}, name: ${q(o.hostName)}, blurb: ${q(o.hostBlurb)} }],` : "";
  return `import type { ContentPack } from "../../types";

/**
 * ${o.title} library (${o.kidTitle}). Scaffolded by scripts/new-library.mjs — see docs/GAME_AUTHORING.md "Add a new library".
 * Coming soon: a teaser shelf in Explore only (no play, no planner, no public page). When the first real world is
 * ready, replace the placeholder world below and set \`status: "live"\`.
 * Host art: add \`${o.host}\` to LIBRARY_HOSTS in src/characters/library once its SVG exists (until then Explore shows a neutral egg in the library colour).
 */
const pack: ContentPack = {
  id: "library-${o.id}",
  title: ${q(`${o.title} library`)},
  libraries: [
    {
      id: ${q(o.id)},
      title: ${q(o.title)},
      kidTitle: ${q(o.kidTitle)},
      host: ${q(o.host)},
      theme: { main: ${q(o.theme.main)}, soft: ${q(o.theme.soft)}, deep: ${q(o.theme.deep)} },
      ages: [${o.ages[0]}, ${o.ages[1]}],
      pitch: ${q(o.pitch)},
      description: ${q(o.description)},
      status: "coming-soon",
      order: ${o.order},
    },
  ],${hostDecl}
  topics: [{ id: ${q(`${o.id}.start`)}, subject: ${q(o.id)}, title: "Getting started", description: "Placeholder topic created by the library scaffold." }],
  skills: [
    {
      id: ${q(`${o.id}.start.first`)},
      title: "First steps",
      topic: ${q(`${o.id}.start`)},
      ages: [${o.ages[0]}, ${o.ages[1]}],
      prerequisites: [],
      objective: "Placeholder: replace with one objective a child can show evidence of (\\"Child can…\\").",
    },
  ],
  worlds: [
    {
      id: ${q(o.world)},
      subject: ${q(o.id)},
      topic: ${q(`${o.id}.start`)},
      skills: [${q(`${o.id}.start.first`)}],
      ages: [${o.ages[0]}, ${o.ages[1]}],
      maxLevel: 2,
      title: ${q(o.worldTitle)},
      gameType: "picture game",
      blurb: ${q(`Help ${o.hostName} find the right picture!`)},
      parentDescription: "Placeholder world from the library scaffold: children find a named picture among two to four. Replace it with the library's first real world.",
      characters: [${q(o.host)}],
      load: () => import("../../../games/${o.world}/${o.component}"),
      loadDefinition: () => import("../../../games/${o.world}/definition").then((m) => m.${o.defName}),
      voice: "src/games/${o.world}/voice.json",
    },
  ],
};

export default pack;
`;
}

function definitionTemplate(o) {
  return `import type { Exercise, ExerciseGenerator, GameDefinition } from "../../engine/types";

/**
 * ${o.worldTitle} — DATA only (scaffolded placeholder; replace with the library's first real world).
 * Pure generator: same (level, rng, index) → same exercise. Level 1 = 2 pictures, level 2 = 3, level 3 = 4.
 */
export const SKILL = ${q(`${o.id}.start.first`)};
export const AGES = [${o.ages[0]}, ${o.ages[1]}] as const;
export const THINGS = ["star", "circle", "square", "heart"] as const;
export const LEVELS = [{ options: 2 }, { options: 3 }, { options: 4 }] as const;
export const MAX_LEVEL = LEVELS.length - 1;

export const generate${o.component}: ExerciseGenerator = (level, rng, index) => {
  const p = LEVELS[Math.min(level, MAX_LEVEL)]!;
  const shown = rng.shuffle(THINGS).slice(0, p.options);
  const target = shown[0]!;
  const options = rng.shuffle(shown).map((t) => ({ id: t, art: t }));
  return {
    id: \`${o.prefix}-\${target}-l\${level}n\${index}\`,
    skillId: SKILL,
    objective: \`Find the \${target} among \${p.options} pictures\`,
    ages: AGES,
    interaction: "choose",
    answer: { kind: "choice", correct: target, options },
    objectKind: target,
    seed: rng.int(1, 1_000_000),
    prompt: { line: "${o.prefix}.prompt", vars: { thing: target }, text: \`Find the \${target}!\` },
    a11yDescription: \`\${p.options} pictures: \${shown.join(", ")}. Choose the \${target}.\`,
  };
};

export const tutorial: Exercise = {
  id: "${o.prefix}-star-tutorial",
  skillId: SKILL,
  objective: "Find the star among 2 pictures",
  ages: AGES,
  difficulty: 1,
  interaction: "choose",
  answer: { kind: "choice", correct: "star", options: [{ id: "circle", art: "circle" }, { id: "star", art: "star" }] },
  objectKind: "star",
  seed: 7,
  tutorial: true,
  prompt: { line: "${o.prefix}.prompt", vars: { thing: "star" }, text: "Find the star!" },
  a11yDescription: "Two pictures: a circle and a star. Choose the star.",
};

export const ${o.defName}: GameDefinition = {
  id: ${q(o.world)},
  title: ${q(o.worldTitle)},
  mascot: ${q(o.host)},
  ages: AGES,
  skillIds: [SKILL],
  learningObjective: "Placeholder: find a named picture among two to four.",
  progression: { roundLength: 8, maxLevel: MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [tutorial],
  generate: generate${o.component},
  achievement: { id: ${q(`${o.world}-sticker`)}, title: ${q(`${o.kidTitle} Explorer`)} },
};
`;
}

function componentTemplate(o) {
  return `import { HostEgg } from "../../daily/critters";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { ${o.defName} } from "./definition";

/** ${o.worldTitle} (scaffolded placeholder). Stub art in the library colour; replace with original art (art.tsx). */
const MAIN = ${q(o.theme.main)};
const SOFT = ${q(o.theme.soft)};

function Background() {
  return (
    <svg className="scene-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="900" fill={SOFT} />
      <ellipse cx="800" cy="900" rx="1100" ry="260" fill={MAIN} opacity="0.35" />
    </svg>
  );
}

function ObjectArt({ kind }: { kind: string }) {
  const shape =
    kind === "star" ? <path d="M50 8 L61 38 L93 38 L67 57 L77 89 L50 70 L23 89 L33 57 L7 38 L39 38 Z" /> :
    kind === "circle" ? <circle cx="50" cy="50" r="40" /> :
    kind === "square" ? <rect x="12" y="12" width="76" height="76" rx="8" /> :
    <path d="M50 88 C20 66 8 50 8 32 C8 18 19 9 31 9 C40 9 46 14 50 21 C54 14 60 9 69 9 C81 9 92 18 92 32 C92 50 80 66 50 88 Z" />;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <g fill={MAIN} stroke="#2B2140" strokeWidth="5" strokeLinejoin="round">{shape}</g>
    </svg>
  );
}

const Host = () => <HostEgg color={MAIN} />;

const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  numberKeys: false,
  Background,
  ObjectArt,
  Basket: () => <></>,
  Sticker: () => <ObjectArt kind="star" />,
  Mascot: Host,
  praise: ["${o.prefix}.praise.1", "${o.prefix}.praise.2"],
  hintVoice: { "hint.show": "${o.prefix}.hint.show" },
};

export default function ${o.component}() {
  return <GameRunner game={${o.defName}} skin={skin} />;
}
`;
}

function worldVoice(o) {
  return {
    lines: {
      [`${o.prefix}.prompt`]: { text: "Find the {thing}!", vary: { thing: ["star", "circle", "square", "heart"] } },
      [`${o.prefix}.praise.1`]: { text: "You looked at every picture. Well found!" },
      [`${o.prefix}.praise.2`]: { text: "You checked carefully. That's it!" },
      [`${o.prefix}.hint.show`]: { text: "Here it is. Now you tap it!" },
    },
  };
}

// ---------------------------------------------------------------- main
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length !== 1) {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    process.exit(args.help ? 0 : 1);
  }
  const id = args._[0];
  if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`library id must be lowercase kebab-case without dots: ${id}`);
  const root = resolve(args.root ?? REPO);
  const ids = existing(root);
  if (ids.libraries.has(id) && !args.force) fail(`library ${id} already exists`);
  for (const k of ["title", "kid-title", "host"]) if (!args[k]) fail(`--${k} is required`);
  const host = args.host;
  if (!/^[a-z][a-z0-9-]*$/.test(host)) fail(`host must be a character id (lowercase): ${host}`);
  const declareHost = !ids.characters.has(host);
  const hostName = args["host-name"] ?? host[0].toUpperCase() + host.slice(1);
  const agesArg = (args.ages ?? "5-10").split("-").map(Number);
  if (agesArg.length !== 2 || !(agesArg[0] >= 3 && agesArg[1] <= 14 && agesArg[0] <= agesArg[1])) fail("--ages must be like 5-10, within 3–14");
  const colour = args.colour ?? args.color ?? "#7C5CFF";
  if (!/^#[0-9a-fA-F]{6}$/.test(colour)) fail("--colour must be #rrggbb");
  const world = args.world ?? `${id}-start`;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(world)) fail(`world id must be kebab-case: ${world}`);
  if (ids.worlds.has(world) && !args.force) fail(`world folder src/games/${world} already exists`);
  const component = pascal(world);
  const o = {
    id,
    title: args.title,
    kidTitle: args["kid-title"],
    host,
    hostName,
    hostBlurb: args["host-blurb"] ?? `${hostName}, host of the ${args.title} library (concept pending creative-director review).`,
    declareHost,
    theme: themeFrom(colour),
    ages: agesArg,
    pitch: args.pitch ?? `Explore ${args["kid-title"]} with ${hostName}.`,
    description: args.description ?? `Story games for ${args.title.toLowerCase()}, planned for ages ${agesArg[0]}–${agesArg[1]}. Placeholder description: replace with 1–2 factual sentences for grown-ups.`,
    order: Number(args.order ?? 100),
    world,
    worldTitle: args["world-title"] ?? `${hostName}'s First Steps`,
    component,
    defName: component[0].toLowerCase() + component.slice(1),
    prefix: world.replace(/-/g, ""),
  };
  if (o.pitch.split(/\s+/).length > 12) fail("--pitch must be 12 words or fewer");

  const files = {
    [`src/content/packs/library-${id}/index.ts`]: packTemplate(o),
    [`src/content/packs/library-${id}/voice.json`]: JSON.stringify({ lines: { [`lib.${id}.pitch`]: { text: o.pitch } } }, null, 2) + "\n",
    [`src/games/${world}/definition.ts`]: definitionTemplate(o),
    [`src/games/${world}/${component}.tsx`]: componentTemplate(o),
    [`src/games/${world}/voice.json`]: JSON.stringify(worldVoice(o), null, 2) + "\n",
  };
  for (const rel of Object.keys(files)) if (existsSync(join(root, rel)) && !args.force) fail(`${rel} exists (use --force to overwrite)`);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  console.log(`new-library: created library "${id}" (${o.kidTitle}, host ${host}${declareHost ? " — declared as a new character" : ""}) with placeholder world ${world}:`);
  for (const rel of Object.keys(files)) console.log(`  ${rel}`);
  console.log(`Next: npx vitest run tests/unit/registry.test.ts · render voice clips (scripts/gen_voice.py) · build the real first world · set status "live".`);
}

main();
