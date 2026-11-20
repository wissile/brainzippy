import { Fenn } from "../../characters/library";
import { INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";

/**
 * Fenn's Message Mystery — original SVG art. Byteberry Town's post office on a cosy street, a soft grey fog
 * (friendly, never spooky) that thins as the round goes on, the two bins and the Detective Badge.
 * The bins differ by SHAPE as well as colour (colour-blind safe): a round green mailbag with a tick tag (Safe)
 * and a tall indigo "help desk" with a big grown-up and a small child holding hands (Ask a grown-up).
 */
export const INDIGO = "#4F5BD5";
export const INDIGO_DK = "#2E379A";
export const LAV = "#C7C2FF";
export const GOLD = "#FFD43B";
export const BAG = "#6BCB77";
const S = 4;

// ---------------------------------------------------------------- icons (100×100)

export function EnvelopeIcon({ open = false }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <rect x="10" y="24" width="80" height="56" rx="10" fill="#FFF8E7" stroke={INK} strokeWidth={S} />
      {open ? (
        <path d="M12 30 L50 8 L88 30" fill="#FFE9B8" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      ) : (
        <path d="M14 28 L50 56 L86 28" fill="none" stroke={INK} strokeWidth={S} strokeLinejoin="round" strokeLinecap="round" />
      )}
      <path d="M14 76 L40 52 M86 76 L60 52" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <circle cx="78" cy="34" r="7" fill={INDIGO} stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

export function MagnifierIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <path d="M62 62 L88 88" stroke={INK} strokeWidth="14" strokeLinecap="round" />
      <path d="M62 62 L88 88" stroke="#B5793C" strokeWidth="7" strokeLinecap="round" />
      <circle cx="42" cy="42" r="28" fill="#E8F6FF" stroke={GOLD} strokeWidth="9" />
      <circle cx="42" cy="42" r="28" fill="none" stroke={INK} strokeWidth="3" />
      <circle cx="42" cy="42" r="33" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M28 34 C30 28 35 24 41 23" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <path d="M18 40 L34 40 L54 22 L54 78 L34 60 L18 60 Z" fill={INDIGO} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M66 36 C74 44 74 56 66 64 M76 26 C90 40 90 60 76 74" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <rect x="10" y="36" width="44" height="28" rx="14" fill="none" stroke={INDIGO} strokeWidth="9" />
      <rect x="46" y="36" width="44" height="28" rx="14" fill="none" stroke={INDIGO_DK} strokeWidth="9" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <path d="M24 10 L62 10 L80 28 L80 90 L24 90 Z" fill="#fff" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M62 10 L62 28 L80 28" fill="#E8E6FF" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M34 46 H70 M34 58 H70 M34 70 H58" stroke={LAV} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <circle cx="50" cy="50" r="40" fill="#fff" stroke={INK} strokeWidth={S} />
      <path d="M30 52 L44 66 L72 36" fill="none" stroke="#2F9E44" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A tall grown-up and a small child holding hands (the "Ask a grown-up" symbol). */
export function GrownUpIcon() {
  return (
    <svg viewBox="0 0 100 100" className="mm-art" aria-hidden="true">
      <circle cx="36" cy="22" r="12" fill="#FFE0B8" stroke={INK} strokeWidth="3.5" />
      <path d="M22 92 L24 50 C24 40 48 40 48 50 L50 92 Z" fill={GOLD} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="70" cy="46" r="9" fill="#FFE0B8" stroke={INK} strokeWidth="3.5" />
      <path d="M60 92 L61 66 C61 58 79 58 79 66 L80 92 Z" fill="#FF8FB1" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M48 62 C54 66 58 68 62 70" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- bins (120×120)

export function SafeBagArt({ full = false }: { full?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="mm-art" aria-hidden="true">
      <ellipse cx="60" cy="110" rx="40" ry="6" fill="rgba(43,33,64,0.18)" />
      {full && <rect x="36" y="18" width="40" height="28" rx="5" fill="#FFF8E7" stroke={INK} strokeWidth="3.5" transform="rotate(-8 56 32)" />}
      <path d="M22 50 C18 84 26 106 60 106 C94 106 102 84 98 50 Z" fill={BAG} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M20 46 C40 38 80 38 100 46 C102 54 18 54 20 46 Z" fill="#4FAE5C" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M32 64 C32 58 36 56 40 56" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <g transform="translate(64 62)">
        <rect x="0" y="0" width="30" height="30" rx="8" fill="#fff" stroke={INK} strokeWidth="3" />
        <path d="M7 15 L13 21 L23 9" fill="none" stroke="#2F9E44" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function AskDeskArt({ full = false }: { full?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="mm-art" aria-hidden="true">
      <ellipse cx="60" cy="112" rx="42" ry="6" fill="rgba(43,33,64,0.18)" />
      {full && <rect x="42" y="4" width="36" height="24" rx="5" fill="#FFF8E7" stroke={INK} strokeWidth="3.5" transform="rotate(6 60 16)" />}
      <path d="M18 108 L18 40 C18 22 102 22 102 40 L102 108 Z" fill={INDIGO} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M40 26 L80 26 L74 36 L46 36 Z" fill="#2B2140" opacity="0.5" />
      <rect x="30" y="44" width="60" height="56" rx="12" fill="#E8EAFA" stroke={INK} strokeWidth="3.5" />
      <g transform="translate(34 46) scale(0.52)"><GrownUpGlyph /></g>
      <path d="M26 46 C26 38 30 34 36 33" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
function GrownUpGlyph() {
  return (
    <g>
      <circle cx="36" cy="22" r="12" fill="#FFE0B8" stroke={INK} strokeWidth="4" />
      <path d="M22 92 L24 50 C24 40 48 40 48 50 L50 92 Z" fill={GOLD} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="70" cy="46" r="9" fill="#FFE0B8" stroke={INK} strokeWidth="4" />
      <path d="M60 92 L61 66 C61 58 79 58 79 66 L80 92 Z" fill="#FF8FB1" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 62 C54 66 58 68 62 70" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------- prompt icons

export function MessageObject({ kind }: { kind: string }) {
  switch (kind) {
    case "magnifier": return <MagnifierIcon />;
    case "action": return <GrownUpIcon />;
    case "inbox": return <SafeBagArt full />;
    default: return <EnvelopeIcon />;
  }
}

// ---------------------------------------------------------------- scene

/** Byteberry Town: rolling hills, little round-roofed houses, the post office with its big mailbox. */
export function TownBackground({ fog = 0.5 }: { fog?: number }) {
  return (
    <svg className="scene-bg mm-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="mm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9C4FF" />
          <stop offset="0.6" stopColor="#E6E9FF" />
          <stop offset="1" stopColor="#FFF4E0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#mm-sky)" />
      <path d="M0 520 C240 430 460 470 700 500 C940 440 1200 440 1600 500 L1600 900 L0 900 Z" fill="#A9DE8E" />
      {/* houses */}
      {[
        { x: 90, c: "#FFB45E", r: "#E0703A" },
        { x: 300, c: "#8EC9FF", r: "#4D96FF" },
        { x: 1180, c: "#FF9FBF", r: "#E2588A" },
        { x: 1390, c: "#C8F07A", r: "#7DAF22" },
      ].map((h, i) => (
        <g key={h.x} transform={`translate(${h.x} ${470 + (i % 2) * 24})`} stroke={INK} strokeWidth="5" strokeLinejoin="round">
          <rect x="0" y="40" width="150" height="130" rx="14" fill={h.c} />
          <path d="M-14 50 C10 -12 140 -12 164 50 Z" fill={h.r} />
          <rect x="54" y="100" width="42" height="70" rx="20" fill="#7A4A1E" />
          <circle cx="32" cy="80" r="14" fill="#FFF3C4" />
          <circle cx="118" cy="80" r="14" fill="#FFF3C4" />
        </g>
      ))}
      {/* post office */}
      <g transform="translate(560 330)" stroke={INK} strokeWidth="6" strokeLinejoin="round">
        <rect x="0" y="90" width="480" height="260" rx="20" fill="#FFF1D6" />
        <path d="M-20 100 L240 0 L500 100 Z" fill={INDIGO} />
        <rect x="150" y="128" width="180" height="46" rx="23" fill={GOLD} />
        <path d="M206 151 L274 151 M218 140 L262 140" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <rect x="190" y="210" width="100" height="140" rx="48" fill="#7A4A1E" />
        <rect x="40" y="200" width="100" height="80" rx="16" fill="#D8F1FF" />
        <rect x="340" y="200" width="100" height="80" rx="16" fill="#D8F1FF" />
        {/* the big round mailbox out front */}
        <rect x="520" y="230" width="24" height="120" fill="#7A4A1E" />
        <path d="M470 160 L600 160 L600 240 L470 240 Z" fill={INDIGO_DK} />
        <path d="M470 160 C470 110 600 110 600 160 Z" fill={INDIGO} />
        <rect x="500" y="176" width="70" height="14" rx="7" fill={INK} />
        <path d="M600 150 L600 110 L640 120 L600 132" fill="#FF6B6B" />
      </g>
      <rect x="0" y="720" width="1600" height="180" fill="#E9D4B0" />
      <rect x="0" y="720" width="1600" height="16" fill="#D8BE94" />
      {/* soft fog that thins out as the round goes on */}
      <g className="mm-fog" opacity={Math.max(0, Math.min(1, fog))} fill="#fff">
        <ellipse cx="160" cy="640" rx="320" ry="70" opacity="0.7" />
        <ellipse cx="1460" cy="610" rx="340" ry="80" opacity="0.7" />
        <ellipse cx="820" cy="760" rx="520" ry="60" opacity="0.55" />
        <ellipse cx="420" cy="300" rx="260" ry="46" opacity="0.5" />
        <ellipse cx="1240" cy="260" rx="280" ry="50" opacity="0.5" />
      </g>
    </svg>
  );
}

export function MessageBackground() {
  return <TownBackground fog={0.35} />;
}

export function DetectiveBadgeSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Detective Badge sticker: a round indigo badge with Fenn's big ears and a gold magnifier">
      <circle cx="120" cy="128" r="104" fill="#fff" stroke={INK} strokeWidth="6" />
      {/* Fenn's ears */}
      <path d="M70 92 C54 70 44 44 46 22 C64 28 86 48 98 72 Z" fill={INDIGO} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M74 80 C64 64 58 48 58 36 C70 44 82 56 88 70 Z" fill={LAV} />
      <path d="M170 92 C186 70 196 44 194 22 C176 28 154 48 142 72 Z" fill={INDIGO} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M166 80 C176 64 182 48 182 36 C170 44 158 56 152 70 Z" fill={LAV} />
      <circle cx="120" cy="134" r="78" fill={INDIGO} stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="134" r="64" fill="none" stroke={LAV} strokeWidth="5" strokeDasharray="10 9" />
      {/* magnifier */}
      <path d="M140 154 L168 182" stroke={INK} strokeWidth="16" strokeLinecap="round" />
      <path d="M140 154 L168 182" stroke="#B5793C" strokeWidth="8" strokeLinecap="round" />
      <circle cx="116" cy="128" r="34" fill="#E8F6FF" stroke={GOLD} strokeWidth="10" />
      <circle cx="116" cy="128" r="34" fill="none" stroke={INK} strokeWidth="3.5" />
      <path d="M100 118 C102 110 108 104 116 103" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M104 132 L114 142 L132 120" fill="none" stroke="#2F9E44" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 196 L202 196 L214 222 L192 220 L120 230 L48 220 L26 222 Z" fill={GOLD} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <text x="120" y="219" textAnchor="middle" fontSize="19" fill={INK} letterSpacing="1.2" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>DETECTIVE</text>
    </svg>
  );
}

export function MessageFenn({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  return <Fenn state={state} talking={talking} size={size ?? "100%"} />;
}

export function NoBasket() {
  return <span aria-hidden="true" />;
}
