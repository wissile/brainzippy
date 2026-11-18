import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type Plugin, build } from "vite";

/**
 * Build-time PWA support (hand-written instead of vite-plugin-pwa/Workbox; see docs/DECISIONS.md).
 *
 * After the client bundle is written it:
 *  1. writes offline.html (src/pwa/offline.html) to the output,
 *  2. computes the precache list (entry JS + its static imports + CSS + fonts + SFX + shell files) from the
 *     real bundle, so hashed filenames are always right,
 *  3. computes per-world bundles (game chunk + deps + CSS, its music, its voice clips) so the service worker
 *     can cache a world the first time a child opens it,
 *  4. compiles src/pwa/sw.ts into /sw.js with that data inlined (any change → new sw.js bytes → update).
 */

export interface WorldBundle {
  entry: string;
  assets: string[];
  music: string[];
  voice: string[];
}
export interface SwBuildData {
  version: string;
  precache: string[];
  assets: string[];
  worlds: Record<string, WorldBundle>;
  shared: { voice: string[]; music: string[] };
  revs: Record<string, string>;
}

interface ChunkLike {
  type: "chunk";
  fileName: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  facadeModuleId: string | null;
  imports: string[];
  viteMetadata?: { importedCss: Set<string>; importedAssets: Set<string> };
}
interface AssetLike {
  type: "asset";
  fileName: string;
}
type Output = ChunkLike | AssetLike;

const hash = (data: Buffer | string, n = 10) => createHash("sha256").update(data).digest("hex").slice(0, n);
const url = (fileName: string) => `/${fileName.replace(/\\/g, "/")}`;

/** Shell files from public/ that must work offline (relative to the output dir). */
const SHELL_FILES = ["manifest.webmanifest", "favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/badge-96.png", "audio/voice/manifest.json"];

export function bzPwa(): Plugin {
  let root = process.cwd();
  return {
    name: "bz-pwa",
    apply: "build",
    applyToEnvironment: (env) => env.name === "client",
    configResolved(c) {
      root = c.root;
    },
    async writeBundle(options, bundle) {
      const outDir = options.dir ?? path.join(root, "dist/client");
      fs.copyFileSync(path.join(root, "src/pwa/offline.html"), path.join(outDir, "offline.html"));

      const outputs = Object.values(bundle) as unknown as Output[];
      const chunks = new Map(outputs.filter((o): o is ChunkLike => o.type === "chunk").map((c) => [c.fileName, c]));
      const closure = (start: ChunkLike[]) => {
        const seen = new Set<string>();
        const walk = (c: ChunkLike) => {
          if (seen.has(c.fileName)) return;
          seen.add(c.fileName);
          for (const i of c.imports) {
            const d = chunks.get(i);
            if (d) walk(d);
          }
        };
        start.forEach(walk);
        return seen;
      };
      const withCss = (files: Set<string>) => {
        const out = new Set(files);
        for (const f of files) {
          const m = chunks.get(f)?.viteMetadata;
          m?.importedCss.forEach((x) => out.add(x));
          m?.importedAssets.forEach((x) => out.add(x));
        }
        return out;
      };

      // 1. precache: entry closure + its CSS + woff2 fonts + SFX + shell
      const entryFiles = withCss(closure([...chunks.values()].filter((c) => c.isEntry)));
      const precache = new Set<string>(["/", "/offline.html"]);
      for (const f of entryFiles) if (!f.endsWith(".woff")) precache.add(url(f));
      for (const o of outputs) if (o.fileName.endsWith(".woff2")) precache.add(url(o.fileName));
      const sfxDir = path.join(outDir, "audio/sfx");
      if (fs.existsSync(sfxDir)) for (const f of fs.readdirSync(sfxDir).sort()) if (f.endsWith(".mp3")) precache.add(`/audio/sfx/${f}`);
      for (const f of SHELL_FILES) if (fs.existsSync(path.join(outDir, f))) precache.add(url(f));
      else this.warn(`bz-pwa: shell file missing from build: ${f}`);

      // 2. worlds: every src/games/<id>/ dynamic entry
      const gamesDir = path.join(root, "src/games");
      const voiceManifestPath = path.join(outDir, "audio/voice/manifest.json");
      const clips: Record<string, string> = fs.existsSync(voiceManifestPath) ? ((JSON.parse(fs.readFileSync(voiceManifestPath, "utf8")) as { clips?: Record<string, string> }).clips ?? {}) : {};
      const musicDir = path.join(outDir, "audio/music");
      const allMusic = fs.existsSync(musicDir) ? fs.readdirSync(musicDir).filter((f) => f.endsWith(".mp3")).sort() : [];
      const worlds: Record<string, WorldBundle> = {};
      const worldLine = new Map<string, string>();
      const worldMusic = new Set<string>();
      for (const id of fs.readdirSync(gamesDir).sort()) {
        const dir = path.join(gamesDir, id);
        if (!fs.statSync(dir).isDirectory()) continue;
        const chunk = [...chunks.values()].find((c) => c.isDynamicEntry && c.facadeModuleId?.replace(/\\/g, "/").includes(`/src/games/${id}/`));
        if (!chunk) continue;
        const files = withCss(closure([chunk]));
        const assets = [...files].filter((f) => f !== chunk.fileName && !f.endsWith(".woff") && !precache.has(url(f))).map(url).sort();
        const voiceJson = path.join(dir, "voice.json");
        if (fs.existsSync(voiceJson)) for (const line of Object.keys((JSON.parse(fs.readFileSync(voiceJson, "utf8")) as { lines?: object }).lines ?? {})) worldLine.set(line, id);
        const music: string[] = [];
        for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".tsx"))) {
          const m = fs.readFileSync(path.join(dir, f), "utf8").match(/\bmusic:\s*"([a-z0-9-]+)"/);
          if (m && allMusic.includes(`${m[1]}.mp3`)) {
            music.push(`/audio/music/${m[1]}.mp3`);
            worldMusic.add(`${m[1]}.mp3`);
          }
        }
        worlds[id] = { entry: url(chunk.fileName), assets, music, voice: [] };
      }
      const sharedVoice: string[] = [];
      for (const [key, file] of Object.entries(clips).sort(([a], [b]) => a.localeCompare(b))) {
        const w = worldLine.get(key.split("__")[0] ?? key);
        const u = `/audio/voice/${file}`;
        if (w && worlds[w]) worlds[w].voice.push(u);
        else sharedVoice.push(u);
      }
      const sharedMusic = allMusic.filter((f) => !worldMusic.has(f)).map((f) => `/audio/music/${f}`);

      // 3. content revisions for un-hashed media (so a re-rendered clip replaces the cached copy)
      const revs: Record<string, string> = {};
      for (const u of [...sharedVoice, ...sharedMusic, ...Object.values(worlds).flatMap((w) => [...w.voice, ...w.music])]) {
        const p = path.join(outDir, u);
        if (fs.existsSync(p)) revs[u] = hash(fs.readFileSync(p));
      }
      const precacheRevs = [...precache].map((u) => {
        const p = path.join(outDir, u === "/" ? "index.html" : u);
        return `${u}@${fs.existsSync(p) ? hash(fs.readFileSync(p)) : "?"}`;
      });

      const assets = outputs.map((o) => o.fileName).filter((f) => f.startsWith("assets/")).map(url).sort();
      const body = { precache: [...precache], assets, worlds, shared: { voice: sharedVoice, music: sharedMusic }, revs };
      const data: SwBuildData = { version: hash(JSON.stringify({ ...body, precacheRevs }) + fs.readFileSync(path.join(root, "src/pwa/sw.ts"), "utf8"), 12), ...body };

      // 4. compile the service worker (separate, dependency-free IIFE bundle; no app chunks shared)
      await build({
        configFile: false,
        root,
        logLevel: "warn",
        publicDir: false,
        plugins: [
          {
            name: "bz-sw-data",
            resolveId: (id) => (id === "virtual:bz-sw-data" ? "\0bz-sw-data" : null),
            load: (id) => (id === "\0bz-sw-data" ? `export default ${JSON.stringify(data)};` : null),
          },
        ],
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          sourcemap: false,
          minify: true,
          lib: { entry: path.join(root, "src/pwa/sw.ts"), formats: ["iife"], name: "bzServiceWorker", fileName: () => "sw.js" },
        },
      });
      const worldSummary = Object.entries(worlds).map(([id, w]) => `${id}: ${w.assets.length} assets, ${w.voice.length} clips`).join("; ");
      this.info?.(`bz-pwa: sw.js v${data.version} · precache ${precache.size} · ${worldSummary}`);
    },
  };
}
