import { Toggle } from "../../characters/library";
import { INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import type { Dir } from "./logic";

/**
 * Toggle's Garden Path — original SVG art. Every grid thing differs by SHAPE as well as colour (colour-blind
 * safe, §4.10): lumpy grey rocks, a round berry bush, a tall arched leaf hut (home), paw-print footprints.
 * Command cards reuse Toggle's own body motif: a lime block with a chunky ink arrow; repeat cards are violet
 * with a loop arrow.
 */
const S = 4; // ink stroke in 100-unit boxes
export const LIME = "#A8D83F";
export const LIME_DK = "#7DAF22";
export const VIOLET = "#8E6CEF";

// ---------------------------------------------------------------- grid things (100×100 boxes)

export function RockArt() {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <ellipse cx="50" cy="86" rx="36" ry="7" fill="rgba(43,33,64,0.18)" />
      <path d="M16 76 C10 58 22 40 40 36 C48 22 72 22 80 40 C92 48 92 70 80 80 C66 88 30 88 16 76 Z" fill="#A9A3B8" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 50 C34 44 40 42 46 42" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d="M58 46 L54 58 L62 66" fill="none" stroke="#7D7690" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 72 C36 78 62 80 82 70" fill="none" stroke="#8C859E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BerryBushArt({ eaten = false }: { eaten?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <ellipse cx="50" cy="88" rx="34" ry="6" fill="rgba(43,33,64,0.18)" />
      <path d="M18 70 C8 54 22 36 36 40 C38 22 62 20 66 38 C82 34 94 54 82 70 C74 86 26 86 18 70 Z" fill="#5BC85A" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 52 C32 46 36 44 40 44" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      {!eaten && (
        <g stroke={INK} strokeWidth="3">
          <circle cx="40" cy="60" r="9" fill="#E8456B" /><circle cx="58" cy="56" r="9" fill="#E8456B" /><circle cx="50" cy="71" r="9" fill="#C8325A" />
          <circle cx="37" cy="57" r="2.4" fill="#fff" stroke="none" /><circle cx="55" cy="53" r="2.4" fill="#fff" stroke="none" /><circle cx="47" cy="68" r="2.4" fill="#fff" stroke="none" />
        </g>
      )}
      {eaten && <path d="M40 62 L46 66 L60 56" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />}
      <path d="M50 26 C52 16 60 12 68 14 C64 22 58 26 50 26 Z" fill="#7BD66F" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Toggle's home: a tall arched hut of leaves with a round door. */
export function HomeArt() {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <ellipse cx="50" cy="90" rx="34" ry="6" fill="rgba(43,33,64,0.18)" />
      <path d="M18 88 L18 50 C18 18 82 18 82 50 L82 88 Z" fill="#FFB45E" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 54 C30 46 40 50 50 42 C60 50 70 46 82 54" fill="none" stroke="#E08A2E" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 10 C40 14 36 24 40 30 C48 28 54 20 50 10 Z M50 10 C60 14 64 24 60 30 C52 28 46 20 50 10 Z" fill="#6BCB77" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M38 88 L38 70 C38 56 62 56 62 70 L62 88 Z" fill="#7A4A1E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="56" cy="76" r="2.6" fill="#FFD43B" />
      <circle cx="30" cy="66" r="5" fill="#FFF3C4" stroke={INK} strokeWidth="2.5" />
    </svg>
  );
}

/** Where Toggle starts: a ring of little flowers. */
export function StartArt() {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <circle cx="50" cy="56" r="30" fill="none" stroke="#FFF7D6" strokeWidth="6" strokeDasharray="2 11" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 30} cy={56 + Math.sin(a) * 30} r="4.5" fill={i % 2 ? "#FFD43B" : "#FF8FB1"} stroke={INK} strokeWidth="1.8" />;
      })}
    </svg>
  );
}

/** A footprint pair with the step number (the trace). */
export function FootprintArt({ n, model = false }: { n: number; model?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`gp-art gp-foot-art ${model ? "is-model" : ""}`} aria-hidden="true">
      <g fill={model ? "#fff" : "rgba(122,74,30,0.55)"} stroke={model ? INK : "none"} strokeWidth="2.5" strokeDasharray={model ? "4 3" : undefined}>
        <ellipse cx="34" cy="62" rx="9" ry="12" /><ellipse cx="66" cy="44" rx="9" ry="12" />
        <circle cx="28" cy="46" r="3.5" /><circle cx="36" cy="44" r="3.5" /><circle cx="60" cy="28" r="3.5" /><circle cx="68" cy="26" r="3.5" />
      </g>
      <circle cx="74" cy="74" r="15" fill={model ? VIOLET : "#FFF7D6"} stroke={INK} strokeWidth="3" />
      <text x="74" y="81" textAnchor="middle" fontSize="20" fill={model ? "#fff" : INK} style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>{n}</text>
    </svg>
  );
}

// ---------------------------------------------------------------- command cards

const ROT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
/** Chunky arrow on a lime command block. */
export function ArrowCard({ d, ghost = false }: { d: Dir; ghost?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="gp-art gp-card-art" aria-hidden="true">
      <rect x="6" y="6" width="88" height="88" rx="26" fill={ghost ? "#F4FBE4" : LIME} stroke={INK} strokeWidth={S} strokeDasharray={ghost ? "8 6" : undefined} />
      {!ghost && <path d="M18 30 C20 20 28 15 38 14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />}
      <g transform={`rotate(${ROT[d]} 50 50)`}>
        <path d="M22 41 L52 41 L52 26 L80 50 L52 74 L52 59 L22 59 Z" fill={ghost ? LIME_DK : "#fff"} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" opacity={ghost ? 0.7 : 1} />
      </g>
    </svg>
  );
}

/** Loop arrow (repeat card face). */
export function RepeatIcon({ ghost = false }: { ghost?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="gp-art gp-card-art" aria-hidden="true">
      <rect x="6" y="6" width="88" height="88" rx="26" fill={ghost ? "#F1ECFF" : VIOLET} stroke={INK} strokeWidth={S} strokeDasharray={ghost ? "8 6" : undefined} />
      <path d="M68 36 A22 22 0 1 0 72 58" fill="none" stroke={ghost ? VIOLET : "#fff"} strokeWidth="9" strokeLinecap="round" />
      <path d="M58 30 L72 34 L70 20" fill="none" stroke={ghost ? VIOLET : "#fff"} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M68 36 A22 22 0 1 0 72 58" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

/** Go button face: a play triangle with Toggle-lime trim. */
export function GoIcon() {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <path d="M34 22 L80 50 L34 78 Z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- prompt icons (ObjectArt)

function BugArt() {
  return (
    <svg viewBox="0 0 100 100" className="gp-art" aria-hidden="true">
      <path d="M38 24 L30 12 M62 24 L70 12" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M24 52 L10 46 M24 66 L10 70 M76 52 L90 46 M76 66 L90 70" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="50" cy="60" rx="28" ry="30" fill="#FFB020" stroke={INK} strokeWidth={S} />
      <path d="M50 32 L50 90" stroke={INK} strokeWidth="3" />
      <circle cx="38" cy="58" r="5" fill={INK} /><circle cx="62" cy="58" r="5" fill={INK} /><circle cx="40" cy="76" r="4" fill={INK} /><circle cx="60" cy="76" r="4" fill={INK} />
      <ellipse cx="50" cy="30" rx="16" ry="11" fill="#5A4A7A" stroke={INK} strokeWidth="3.5" />
      <circle cx="44" cy="28" r="3.5" fill="#fff" /><circle cx="56" cy="28" r="3.5" fill="#fff" />
    </svg>
  );
}

export function GardenObject({ kind }: { kind: string }) {
  switch (kind) {
    case "home": return <HomeArt />;
    case "bug": return <BugArt />;
    case "repeat": return <RepeatIcon />;
    case "start": return <StartArt />;
    case "rock": return <RockArt />;
    default: return <BerryBushArt />;
  }
}

// ---------------------------------------------------------------- scene

export function GardenBackground() {
  return (
    <svg className="scene-bg gp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="gp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FF" />
          <stop offset="0.65" stopColor="#D8F1FF" />
          <stop offset="1" stopColor="#F4FBE4" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#gp-sky)" />
      <g className="cloud" fill="#fff" opacity="0.9"><ellipse cx="300" cy="140" rx="120" ry="38" /><ellipse cx="360" cy="118" rx="70" ry="42" /></g>
      <g className="cloud c2" fill="#fff" opacity="0.85"><ellipse cx="1240" cy="100" rx="130" ry="40" /><ellipse cx="1170" cy="84" rx="70" ry="38" /></g>
      <path d="M0 470 C220 380 420 420 620 450 C860 380 1120 390 1360 440 C1480 420 1560 430 1600 440 L1600 900 L0 900 Z" fill="#B8E68A" />
      <path d="M0 560 C300 500 600 540 900 520 C1200 500 1400 540 1600 520 L1600 900 L0 900 Z" fill="#94D46A" />
      {/* wooden fence */}
      <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <rect x="0" y="560" width="1600" height="16" fill="#E2A766" />
        <rect x="0" y="608" width="1600" height="16" fill="#E2A766" />
        {Array.from({ length: 17 }, (_, i) => <path key={i} d={`M${20 + i * 98} 650 L${20 + i * 98} 548 L${36 + i * 98} 532 L${52 + i * 98} 548 L${52 + i * 98} 650 Z`} fill="#F2C185" />)}
      </g>
      <rect x="0" y="650" width="1600" height="250" fill="#8A5A34" />
      <rect x="0" y="650" width="1600" height="22" fill="#A06B40" />
      {/* vegetable rows at the edges */}
      {[60, 170, 280, 1330, 1440, 1550].map((x, i) => (
        <g key={x} transform={`translate(${x} ${720 + (i % 2) * 70})`}>
          {i % 3 === 0 ? (
            <g><path d="M0 0 C-30 -20 -34 -54 -10 -60 C0 -40 4 -20 0 0 Z M0 0 C30 -20 34 -54 10 -60 C0 -40 -4 -20 0 0 Z" fill="#5BC85A" stroke={INK} strokeWidth="4" /><path d="M-14 0 L14 0 L4 44 L-4 44 Z" fill="#FF9F43" stroke={INK} strokeWidth="4" strokeLinejoin="round" /></g>
          ) : i % 3 === 1 ? (
            <g><circle cx="0" cy="0" r="34" fill="#9BDB7A" stroke={INK} strokeWidth="4" /><path d="M-20 -6 C-8 -20 8 -20 20 -6 M-14 10 C-4 0 4 0 14 10" fill="none" stroke="#6CB24E" strokeWidth="4" strokeLinecap="round" /></g>
          ) : (
            <g><path d="M0 40 L0 -40" stroke="#4E9A3A" strokeWidth="7" /><circle cx="0" cy="-58" r="26" fill="#FFD43B" stroke={INK} strokeWidth="4" /><circle cx="0" cy="-58" r="11" fill="#8A5A34" /></g>
          )}
        </g>
      ))}
    </svg>
  );
}

export function PathFinderSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Path Finder sticker: a leaf badge shaped like an arrow, with Toggle's glowing antenna bulb on top">
      <circle cx="120" cy="128" r="104" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="128" r="90" fill="#F1F9DD" />
      {/* leaf arrow */}
      <path d="M44 150 C44 112 70 96 104 96 L134 96 L134 70 L196 128 L134 186 L134 160 L104 160 C82 160 62 168 44 150 Z" fill={LIME} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M58 146 C90 132 120 128 170 128" fill="none" stroke={LIME_DK} strokeWidth="5" strokeLinecap="round" />
      {[78, 104, 130].map((x) => <path key={x} d={`M${x} ${142 - (x - 78) / 6} L${x + 10} ${120 - (x - 78) / 6}`} stroke={LIME_DK} strokeWidth="4" strokeLinecap="round" />)}
      <path d="M62 120 C70 108 82 102 96 101" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      {/* footprints along the arrow */}
      {[0, 1, 2].map((i) => <ellipse key={i} cx={72 + i * 30} cy={176 - i * 4} rx="6" ry="8" fill="#7A4A1E" opacity="0.55" />)}
      {/* antenna bulb */}
      <path d="M120 70 Q112 44 128 30" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <circle cx="130" cy="24" r="22" fill="#FFE98A" opacity="0.6" />
      <circle cx="130" cy="24" r="13" fill="#FFD43B" stroke={INK} strokeWidth="5" />
      <circle cx="126" cy="20" r="3.5" fill="#fff" />
      <path d="M38 196 L202 196 L214 222 L192 220 L120 230 L48 220 L26 222 Z" fill={VIOLET} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <text x="120" y="219" textAnchor="middle" fontSize="20" fill="#fff" letterSpacing="1.2" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>PATH FINDER</text>
    </svg>
  );
}

export function GardenToggle({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  return <Toggle state={state} talking={talking} size={size ?? "100%"} />;
}

export function NoBasket() {
  return <span aria-hidden="true" />;
}
