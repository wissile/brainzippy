/**
 * Voice-line catalogue. Data lives in voiceLines.json (shared with scripts/gen_voice.py); every spoken line is
 * also captioned, so the game works with sound off. Audio clips: public/audio/voice/<key>.mp3, listed in
 * public/audio/voice/manifest.json. Recorded human takes (via /studio) override generated ones.
 */
import data from "./voiceLines.json";

export interface VoiceLine {
  text: string;
  vary?: Record<string, (string | number)[]>;
}
interface Catalogue {
  objects?: Record<string, { one: string; many: string }>;
  lines: Record<string, VoiceLine>;
}

// Each game ships its own src/games/<id>/voice.json, and each feature its own src/<feature>/voice.json
// (e.g. src/daily/voice.json), so no shared-file edits are needed to add lines.
// Library packs carry their shelf pitch line (src/content/packs/library-<id>/voice.json, D-028).
const gameCatalogues = Object.values(import.meta.glob<Catalogue>(["../games/*/voice.json", "../*/voice.json", "../content/packs/*/voice.json"], { eager: true, import: "default" }));

export const VOICE_LINES: Record<string, VoiceLine> = Object.assign({}, data.lines as Record<string, VoiceLine>, ...gameCatalogues.map((c) => c.lines));
export const OBJECT_NAMES: Record<string, { one: string; many: string }> = Object.assign({}, data.objects, ...gameCatalogues.map((c) => c.objects ?? {}));
export const numberWord = (n: number) => data.numberWords[n] ?? String(n);

/** Stable audio key for a line + the variables that change its wording (mirrors gen_voice.py). */
export function voiceKey(id: string, vars: Record<string, string | number> = {}): string {
  const vary = VOICE_LINES[id]?.vary;
  if (!vary) return id;
  return [id, ...Object.keys(vary).sort().map((k) => `${k}-${vars[k] ?? ""}`)].join("__");
}

export function renderLine(id: string, vars: Record<string, string | number> = {}): string {
  const line = VOICE_LINES[id];
  if (!line) return "";
  const kind = typeof vars.kind === "string" ? OBJECT_NAMES[vars.kind] : undefined;
  const n = typeof vars.n === "number" ? vars.n : undefined;
  const all: Record<string, string> = {
    ...Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)])),
    one: kind?.one ?? "snack",
    many: kind?.many ?? "snacks",
    manyN: n === 1 ? (kind?.one ?? "snack") : (kind?.many ?? "snacks"),
    nWord: n !== undefined ? numberWord(n) : "",
  };
  const text = line.text.replace(/\{(\w+)\}/g, (_, k: string) => all[k] ?? "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
