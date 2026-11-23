/**
 * Voice cast: who says a line, how their name looks in captions, and how their voice is made.
 * Data lives in cast.json (shared with scripts/gen_voice.py, which renders each speaker's Kokoro voice).
 * The narrator is the default speaker for every line without a `speaker`.
 */
import data from "./cast.json";

export interface Speaker {
  id: string;
  /** Shown in dialogue captions. */
  name: string;
  /** Character colour (hex) for the caption name chip and stage highlight. */
  color: string;
  group: "narrator" | "crew" | "host";
  /** Character still in design: the voice may change once the voice brief lands. */
  provisional?: boolean;
  kokoroVoice: string;
  lang: string;
  speed: number;
  pitchSemitones?: number;
  formantSemitones?: number;
  tempo?: number;
  description: string;
}

type RawSpeaker = Omit<Speaker, "id">;

export const NARRATOR = "narrator";

export const SPEAKERS: Readonly<Record<string, Speaker>> = Object.fromEntries(
  Object.entries(data.speakers as Record<string, RawSpeaker>).map(([id, s]) => [id, { ...s, id }]),
);

/** The speaker for an id; unknown ids fall back to the narrator so captions and audio never fail. */
export function getSpeaker(id: string | undefined): Speaker {
  return (id && SPEAKERS[id]) || SPEAKERS[NARRATOR]!;
}

const INK = "#2B2140";

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function mixWithWhite(hex: string, t: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = (c: number) => Math.round(c + (255 - c) * t).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/**
 * Colours for a speaker's caption name chip with text contrast >= 4.5:1 (WCAG AA): the character colour with ink or
 * white text when that already reads well, otherwise the colour lightened just enough for ink text.
 */
export function nameChipStyle(hex: string): { background: string; color: string } {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return { background: "#FFFFFF", color: INK };
  if (contrastRatio(hex, INK) >= 4.5) return { background: hex, color: INK };
  if (contrastRatio(hex, "#FFFFFF") >= 4.5) return { background: hex, color: "#FFFFFF" };
  for (let t = 0.05; t < 1; t += 0.05) {
    const bg = mixWithWhite(hex, t);
    if (contrastRatio(bg, INK) >= 4.5) return { background: bg, color: INK };
  }
  return { background: "#FFFFFF", color: INK };
}

/**
 * Browser speech-synthesis settings for the last-resort fallback (no clip available), so characters still sound
 * different from each other and from the narrator. Pitch range 0-2, rate around 1.
 */
export function synthVoiceFor(id: string | undefined): { pitch: number; rate: number } {
  const s = getSpeaker(id);
  if (s.id === NARRATOR) return { pitch: 1.2, rate: 0.92 };
  const pitch = Math.min(2, 1.2 + (s.pitchSemitones ?? 0) * 0.07);
  const rate = Math.max(0.7, Math.min(1.2, 0.92 * (s.speed / 0.95) * (s.tempo ?? 1)));
  return { pitch: Math.round(pitch * 100) / 100, rate: Math.round(rate * 100) / 100 };
}
