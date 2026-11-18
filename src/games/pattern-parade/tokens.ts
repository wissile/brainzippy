import type { SfxId } from "../../engine/types";

/**
 * Puff's Pattern Parade — the marchers (pure data, no React).
 * Every marcher differs in SHAPE as well as colour (colour-blind friendly), and has its own optional sound
 * so a pattern can also be heard ("boom, ding, boom, ding"). Sounds reuse the shared SFX buffers at different
 * playback rates, so they follow the global mute and never block play.
 */
export type Family = "float" | "animal" | "band" | "tower";

export interface Token {
  id: string;
  /** Spoken/aria name: "star float", "duck", "drum", "tower of 3 blocks". */
  label: string;
  family: Family;
  sound: { sfx: SfxId; rate: number; gain: number };
}

/** Major-pentatonic ratios (same scale as the counting ticks): tower n plays note n. */
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];

export const FAMILY_KINDS = {
  float: ["star", "heart", "moon", "leaf"],
  animal: ["duck", "frog", "pig", "bunny"],
  band: ["drum", "bell", "shaker", "xylophone"],
} as const;
export type PatternFamily = keyof typeof FAMILY_KINDS;

export const MAX_TOWER = 7;

const BASE: Token[] = [
  { id: "star", label: "star float", family: "float", sound: { sfx: "count", rate: 1, gain: 0.6 } },
  { id: "heart", label: "heart float", family: "float", sound: { sfx: "count", rate: 5 / 4, gain: 0.6 } },
  { id: "moon", label: "moon float", family: "float", sound: { sfx: "count", rate: 3 / 2, gain: 0.6 } },
  { id: "leaf", label: "leaf float", family: "float", sound: { sfx: "count", rate: 5 / 3, gain: 0.6 } },
  { id: "duck", label: "duck", family: "animal", sound: { sfx: "pickup", rate: 1.5, gain: 0.55 } },
  { id: "frog", label: "frog", family: "animal", sound: { sfx: "count", rate: 0.5, gain: 0.7 } },
  { id: "pig", label: "pig", family: "animal", sound: { sfx: "retry", rate: 1.3, gain: 0.55 } },
  { id: "bunny", label: "bunny", family: "animal", sound: { sfx: "count", rate: 2, gain: 0.55 } },
  { id: "drum", label: "drum", family: "band", sound: { sfx: "drop", rate: 0.6, gain: 0.9 } },
  { id: "bell", label: "bell", family: "band", sound: { sfx: "star", rate: 1, gain: 0.55 } },
  { id: "shaker", label: "shaker", family: "band", sound: { sfx: "tap", rate: 1.6, gain: 0.7 } },
  { id: "xylophone", label: "xylophone", family: "band", sound: { sfx: "count", rate: 2, gain: 0.6 } },
];
const TOWERS: Token[] = Array.from({ length: MAX_TOWER }, (_, i) => ({
  id: `tower-${i + 1}`,
  label: `tower of ${i + 1} ${i === 0 ? "block" : "blocks"}`,
  family: "tower" as const,
  sound: { sfx: "count" as const, rate: PENTA[i] ?? 1, gain: 0.6 },
}));

/** Stable order: exercise params store marchers as indices into this list. Append only. */
export const TOKENS: readonly Token[] = [...BASE, ...TOWERS];
export const TOKEN_IDS: readonly string[] = TOKENS.map((t) => t.id);
const BY_ID = new Map(TOKENS.map((t) => [t.id, t]));

export const tokenIndex = (id: string): number => {
  const i = TOKEN_IDS.indexOf(id);
  if (i < 0) throw new Error(`unknown marcher ${id}`);
  return i;
};
export const tokenAt = (i: number): Token => TOKENS[i] ?? TOKENS[0]!;
export const token = (id: string): Token | undefined => BY_ID.get(id);
export const labelOf = (id: string): string => BY_ID.get(id)?.label ?? id;
export const towerId = (n: number) => `tower-${n}`;
export const towerSize = (id: string): number | null => (id.startsWith("tower-") ? Number(id.slice(6)) : null);

/** What the family is called in prompts: "Copy the pattern with {to}!" */
export const FAMILY_WORD: Record<PatternFamily, string> = { float: "floats", animal: "animals", band: "instruments" };
