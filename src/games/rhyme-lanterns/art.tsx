import { INK } from "../../characters/palette";
import { PICTURES, WordPicture } from "./pictures";

/**
 * Hoot's Rhyme Lanterns — original scene art: the night forest, paper lanterns, the "sleepy" basket,
 * yes/no lantern icons, story props and the Lantern Keeper sticker. All original SVG (no fonts, no stock).
 */

/** Paper colours for picture lanterns, by POSITION (never by rhyme family, so colour never gives away the answer). */
export const PAPER = ["#FF9F43", "#FF8FB1", "#2EC4B6", "#8E6CEF", "#4D96FF", "#6BCB77"] as const;
const HOOT_PAPER = "#FFD43B";

export function NightForest() {
  return (
    <svg className="scene-bg rl-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="rl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141038" />
          <stop offset="0.6" stopColor="#2A2168" />
          <stop offset="1" stopColor="#433488" />
        </linearGradient>
        <radialGradient id="rl-moonglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF6D0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF6D0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rl-fly" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="0.35" stopColor="#FFE27A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#rl-sky)" />
      <g fill="#fff">
        {Array.from({ length: 46 }, (_, i) => (
          <circle key={i} className="twinkle" cx={(i * 353) % 1600} cy={(i * 197) % 420} r={1.4 + (i % 3) * 0.9} style={{ animationDelay: `${(i % 9) * 0.35}s` }} />
        ))}
      </g>
      <circle cx="1310" cy="150" r="170" fill="url(#rl-moonglow)" />
      <circle cx="1310" cy="150" r="62" fill="#FFF6D0" />
      <circle cx="1290" cy="136" r="10" fill="#F1E3AE" /><circle cx="1330" cy="170" r="7" fill="#F1E3AE" />
      {/* far trees */}
      <g fill="#1E2A5C">
        {[60, 230, 420, 610, 820, 1010, 1190, 1380, 1550].map((x, i) => (
          <path key={x} d={`M${x} ${560 - (i % 3) * 40} L${x - 90} 760 L${x + 90} 760 Z`} />
        ))}
        <rect x="0" y="700" width="1600" height="200" />
      </g>
      {/* mid trees: round canopies */}
      <g fill="#20434F" stroke="#16323C" strokeWidth="6">
        {[120, 470, 1120, 1480].map((x, i) => (
          <g key={x}>
            <rect x={x - 16} y={560} width="32" height="200" fill="#2C2440" stroke="none" />
            <circle cx={x} cy={520 - (i % 2) * 30} r={120} />
            <circle cx={x - 80} cy={590 - (i % 2) * 30} r={70} />
            <circle cx={x + 80} cy={590 - (i % 2) * 30} r={70} />
          </g>
        ))}
      </g>
      {/* ground */}
      <path d="M0 740 Q400 690 800 720 T1600 710 L1600 900 L0 900 Z" fill="#24503D" />
      <path d="M0 800 Q420 760 820 790 T1600 780 L1600 900 L0 900 Z" fill="#1D4232" />
      <g fill="#2F6B4E">
        {Array.from({ length: 30 }, (_, i) => (
          <path key={i} d={`M${i * 56 + 10} 900 l10 -46 l10 46 Z`} />
        ))}
      </g>
      {/* glowing mushrooms */}
      {[[260, 800], [1380, 790], [700, 830]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-6" y="-18" width="12" height="22" rx="5" fill="#E8E0F5" />
          <path d="M-26 -16 Q0 -52 26 -16 Z" fill="#7FE3D8" stroke="#16323C" strokeWidth="4" />
          <circle r="40" cy="-20" fill="#7FE3D8" opacity="0.12" />
        </g>
      ))}
      {/* fireflies */}
      {[[180, 420], [560, 330], [900, 470], [1220, 380], [1460, 520], [340, 610], [1040, 610], [760, 250]].map(([x, y], i) => (
        <circle key={i} className="rl-firefly" cx={x} cy={y} r="22" fill="url(#rl-fly)" style={{ animationDelay: `${i * -0.9}s` }} />
      ))}
    </svg>
  );
}

/** Lantern frame in a 120×150 box; the picture sits in the round window. */
export function Lantern({ word, paper = HOOT_PAPER, lit = false, empty = false, hoot = false }: { word?: string; paper?: string; lit?: boolean; empty?: boolean; hoot?: boolean }) {
  if (empty) {
    return (
      <svg className="rl-lantern-svg is-empty" viewBox="0 0 120 150" aria-hidden="true">
        <path d="M60 2 L60 14" stroke="#FFF6DA" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        <rect x="16" y="20" width="88" height="106" rx="40" fill="rgba(255,246,218,0.08)" stroke="#FFF6DA" strokeWidth="5" strokeDasharray="10 9" strokeLinecap="round" />
        <path d="M52 64 L68 64 M60 56 L60 72" stroke="#FFF6DA" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      </svg>
    );
  }
  return (
    <svg className={`rl-lantern-svg ${lit ? "is-lit" : ""}`} viewBox="0 0 120 150" aria-hidden="true">
      <path d="M60 0 L60 14" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="8" r="5" fill="none" stroke={INK} strokeWidth="3.5" />
      <rect x="38" y="14" width="44" height="10" rx="4" fill={hoot ? "#6BCB77" : "#5A5070"} stroke={INK} strokeWidth="4" />
      <rect className="rl-paper" x="12" y="22" width="96" height="104" rx="42" fill={paper} stroke={INK} strokeWidth="5" />
      <path d="M36 26 Q24 74 36 122 M84 26 Q96 74 84 122" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="3" />
      <circle className="rl-window" cx="60" cy="74" r="38" fill="#FFFDF6" stroke={INK} strokeWidth="4" />
      {word && PICTURES[word] && (
        <svg x="26" y="40" width="68" height="68" viewBox="0 0 100 100">
          {PICTURES[word]}
        </svg>
      )}
      <rect className="rl-dim" x="12" y="22" width="96" height="104" rx="42" fill="#141038" />
      <rect x="38" y="124" width="44" height="9" rx="4" fill={hoot ? "#6BCB77" : "#5A5070"} stroke={INK} strokeWidth="4" />
      <path d="M60 133 L60 140" stroke={INK} strokeWidth="3" />
      <path d="M54 140 L66 140 L63 150 L57 150 Z" fill={hoot ? "#6BCB77" : paper} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** Basket for the lantern that does not rhyme (odd-one-out drop zone). */
export function SleepyBasket() {
  return (
    <svg className="rl-basket-svg" viewBox="0 0 160 110" aria-hidden="true">
      <path d="M30 40 Q80 -14 130 40" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M30 40 Q80 -14 130 40" fill="none" stroke="#B5814A" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 42 L150 42 L134 102 Q132 106 126 106 L34 106 Q28 106 26 102 Z" fill="#D9A066" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M18 60 L142 60 M22 78 L138 78 M26 94 L134 94" stroke="#9A6234" strokeWidth="4" />
      <path d="M50 42 L56 106 M80 42 L80 106 M110 42 L104 106" stroke="#9A6234" strokeWidth="4" />
      <rect x="6" y="34" width="148" height="14" rx="7" fill="#E8C08A" stroke={INK} strokeWidth="5" />
      <path d="M118 22 Q124 16 130 20 M128 12 Q134 6 140 10" fill="none" stroke="#FFF6DA" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
/** skin.Basket (required by the runner; the board uses SleepyBasket directly). */
export const BasketArt = () => <SleepyBasket />;

/** Small lantern used for the yes/no buttons and story props. */
function MiniLantern({ x, lit, paper, sleepy = false }: { x: number; lit: boolean; paper: string; sleepy?: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {lit && <circle cx="0" cy="52" r="34" fill="#FFE27A" opacity="0.35" />}
      <path d="M0 6 L0 18" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="-24" y="18" width="48" height="62" rx="22" fill={lit ? paper : "#3A3366"} stroke={INK} strokeWidth="5" />
      {sleepy ? (
        <g>
          <path d="M-12 46 Q-8 50 -4 46 M4 46 Q8 50 12 46" fill="none" stroke="#B9B3C9" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M-5 60 Q0 62 5 60" fill="none" stroke="#B9B3C9" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="-8" cy="45" r="3.5" fill={INK} /><circle cx="8" cy="45" r="3.5" fill={INK} />
          <path d="M-8 56 Q0 64 8 56" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}
      <rect x="-12" y="78" width="24" height="7" rx="3" fill="#5A5070" stroke={INK} strokeWidth="3" />
    </g>
  );
}

/** "Yes, they rhyme": two lanterns, both glowing and smiling. */
export function YesIcon() {
  return (
    <svg className="rl-yn-svg" viewBox="0 0 140 96" aria-hidden="true">
      <path d="M40 14 Q70 26 100 14" fill="none" stroke="#FFF6DA" strokeWidth="3" strokeLinecap="round" />
      <MiniLantern x={40} lit paper="#FF9F43" />
      <MiniLantern x={100} lit paper="#FF8FB1" />
      <path d="M62 50 L78 50" stroke="#FFE27A" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
/** "No, they don't rhyme": one lantern glows, the other stays dark and sleepy. */
export function NoIcon() {
  return (
    <svg className="rl-yn-svg" viewBox="0 0 140 96" aria-hidden="true">
      <MiniLantern x={40} lit paper="#FF9F43" />
      <MiniLantern x={100} lit={false} paper="#FF8FB1" sleepy />
      <text x="116" y="26" fill="#B9B3C9" fontSize="16" fontWeight="800" fontFamily="system-ui, sans-serif">z</text>
    </svg>
  );
}

/** A sagging string of lanterns for story scenes; the first `lit` glow. */
export function LanternString({ count = 5, lit = 0, words = [] as string[] }: { count?: number; lit?: number; words?: string[] }) {
  const w = 1000;
  const xs = Array.from({ length: count }, (_, i) => 80 + (i * (w - 160)) / Math.max(1, count - 1));
  const sag = (x: number) => 40 + Math.sin((x / w) * Math.PI) * 60;
  return (
    <svg viewBox="0 0 1000 300" aria-hidden="true" className="rl-string">
      <path d={`M0 30 Q500 ${180} 1000 30`} fill="none" stroke="#FFF6DA" strokeWidth="5" opacity="0.85" />
      {xs.map((x, i) => (
        <svg key={i} x={x - 52} y={sag(x) - 4} width="104" height="130" viewBox="0 0 120 150" overflow="visible">
          {i < lit && <circle cx="60" cy="74" r="80" fill="#FFE27A" opacity="0.22" />}
          <Lantern word={words[i]} paper={PAPER[i % PAPER.length]} lit={i < lit} />
        </svg>
      ))}
    </svg>
  );
}

/** Prompt icon / story objects: a word picture, or a glowing lantern for "lantern". */
export function RhymeObject({ kind }: { kind: string }) {
  if (PICTURES[kind]) return <WordPicture word={kind} />;
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true">
      <circle cx="60" cy="76" r="58" fill="#FFE27A" opacity="0.35" />
      <Lantern paper={HOOT_PAPER} lit hoot />
    </svg>
  );
}

export function LanternKeeperSticker() {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label="Lantern Keeper sticker: a glowing lantern under the moon">
      <defs>
        <radialGradient id="rl-st-glow" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="1" stopColor="#FFE27A" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill="#FFD43B" stroke={INK} strokeWidth="8" />
      <circle cx="120" cy="120" r="96" fill="#2A2168" stroke={INK} strokeWidth="5" />
      {([[64, 70], [170, 62], [184, 140], [56, 150], [100, 52]] as const).map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`} fill="#FFF6DA" />
      ))}
      <path d="M160 42 Q134 50 134 74 Q136 98 162 102 Q146 90 146 72 Q146 54 160 42 Z" fill="#FFF6D0" stroke={INK} strokeWidth="4" />
      <circle cx="116" cy="140" r="70" fill="url(#rl-st-glow)" />
      <svg x="74" y="64" width="92" height="115" viewBox="0 0 120 150" overflow="visible">
        <Lantern word="star" paper="#FF9F43" lit hoot />
      </svg>
      <path d="M40 196 Q120 170 200 196 L200 210 Q120 232 40 210 Z" fill="#6BCB77" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}
