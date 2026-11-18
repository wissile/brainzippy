import { Bobbo } from "../../characters/Bobbo";
import { CREW, INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";

/**
 * Original art for Balance Scale Island ("Bobbo's Night Market"). Critter Crew style (ink outlines, flat fills,
 * soft highlights) in a cooler, dusk palette for ages 11–13: deep harbour teal, indigo sky, brass and lantern gold.
 */
export const BI = {
  night: "#1C1A3D",
  dusk: "#2C3F73",
  teal: "#16525E",
  sea: "#0F3B47",
  brass: "#E3AE45",
  brassDark: "#B47B1F",
  brassLight: "#FFD98A",
  plum: "#6E4FA3",
  plumDark: "#4C3480",
  coral: "#FF7A6B",
  cream: "#FFF6DA",
  slate: "#22304A",
} as const;

/** A sealed mystery bag (the unknown x). Optional `tag` shows a tested/revealed weight on a swing tag. */
export function BagArt({ tag, tagState }: { tag?: string; tagState?: "test" | "known" }) {
  return (
    <svg viewBox="0 0 100 110" aria-hidden="true" className="bi-bag-art" overflow="visible">
      <path d="M22 44 C10 64 12 98 30 104 L70 104 C88 98 90 64 78 44 Z" fill={BI.plum} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 52 C24 66 24 86 32 96" fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" />
      <path d="M78 52 C84 70 82 90 74 100" fill="none" stroke={BI.plumDark} strokeWidth="5" strokeLinecap="round" />
      <path d="M34 44 C30 32 36 22 42 18 L58 18 C64 22 70 32 66 44 Z" fill={BI.plum} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 44 Q50 52 70 44" fill="none" stroke={BI.brass} strokeWidth="8" strokeLinecap="round" />
      <path d="M30 44 Q50 52 70 44" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
      <circle cx="50" cy="76" r="17" fill={BI.cream} stroke={INK} strokeWidth="4" />
      <text x="50" y="84" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight="700" fontSize="27" fill={BI.plumDark}>x</text>
      {tag && (
        <g className={`bi-tag ${tagState ?? ""}`}>
          <path d="M66 40 L80 26" stroke={INK} strokeWidth="3" />
          <rect x="70" y="2" width="40" height="26" rx="7" fill={tagState === "test" ? BI.coral : BI.brassLight} stroke={INK} strokeWidth="3.5" />
          <text x="90" y="21" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="16" fill={INK}>{tag}</text>
        </g>
      )}
    </svg>
  );
}

/** A brass five-kilogram bar (five ones grouped, so big numbers stay readable). */
export function FiveArt() {
  return (
    <svg viewBox="0 0 40 90" aria-hidden="true" className="bi-five-art">
      <rect x="4" y="4" width="32" height="82" rx="7" fill={BI.brass} stroke={INK} strokeWidth="4" />
      {[20, 36, 52, 68].map((y) => <path key={y} d={`M8 ${y} H32`} stroke={BI.brassDark} strokeWidth="2.5" />)}
      <rect x="9" y="9" width="6" height="72" rx="3" fill="#fff" opacity="0.35" />
      <text x="20" y="54" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="17" fill={INK}>5</text>
    </svg>
  );
}

/** A one-kilogram cube. */
export function OneArt() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="bi-one-art">
      <rect x="4" y="4" width="32" height="32" rx="6" fill={BI.brassLight} stroke={INK} strokeWidth="4" />
      <rect x="8" y="8" width="7" height="22" rx="3" fill="#fff" opacity="0.45" />
      <text x="21" y="27" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="15" fill={INK}>1</text>
    </svg>
  );
}

/** The pan: a shallow brass dish with three chains up to a hook. Drawn in a 200×200 box; dish at the bottom. */
export function PanArt() {
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true" className="bi-pan-art">
      <g stroke={INK} strokeWidth="2.6" strokeDasharray="7 4" opacity="0.9">
        <path d="M100 2 L8 200" vectorEffect="non-scaling-stroke" />
        <path d="M100 2 L192 200" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
export function DishArt() {
  return (
    <svg viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true" className="bi-dish-art">
      <path d="M4 8 L196 8 Q186 40 100 40 Q14 40 4 8 Z" fill={BI.brass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M4 8 L196 8" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M30 18 Q100 30 170 18" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** The beam (stretched to its box). */
export function BeamArt() {
  return (
    <svg viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true" className="bi-beam-art">
      <rect x="3" y="5" width="394" height="14" rx="7" fill={BI.brass} stroke={INK} strokeWidth="5" />
      <rect x="20" y="8" width="360" height="3.5" rx="2" fill="#fff" opacity="0.45" />
    </svg>
  );
}
/** End hooks + pivot cap, kept round (not stretched). */
export function PivotArt() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true" className="bi-pivot-art">
      <circle cx="30" cy="30" r="20" fill={BI.brass} stroke={INK} strokeWidth="5" />
      <circle cx="30" cy="30" r="8" fill={BI.brassDark} stroke={INK} strokeWidth="3" />
      <path d="M18 22 Q24 14 34 14" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
export function HookArt() {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className="bi-hook-art">
      <circle cx="15" cy="15" r="9" fill={BI.brassLight} stroke={INK} strokeWidth="4" />
    </svg>
  );
}
/** The stand: a post from the pivot down to a stepped wooden base. Stretched vertically. */
export function StandArt() {
  return (
    <svg viewBox="0 0 120 300" preserveAspectRatio="none" aria-hidden="true" className="bi-stand-art">
      <rect x="50" y="0" width="20" height="270" rx="6" fill={BI.brassDark} stroke={INK} strokeWidth="5" vectorEffect="non-scaling-stroke" />
      <rect x="55" y="6" width="5" height="250" rx="2" fill="#fff" opacity="0.3" />
      <path d="M20 270 L100 270 L110 296 L10 296 Z" fill="#7A4B2A" stroke={INK} strokeWidth="5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Prompt icon / object art. */
export function BalanceObject({ kind }: { kind: string }) {
  if (kind === "bag") return <BagArt />;
  return <OneArt />;
}

/** Bobbo, the stall keeper, in a market apron (drawn in his 200×230 box so it rides with his animation). */
export function StallBobbo({ state = "idle", talking = false, size = 160 }: { state?: MascotState; talking?: boolean; size?: number | string }) {
  return (
    <div className="bi-bobbo">
      <Bobbo state={state} talking={talking} size={size} />
      <svg className={`critter bi-apron state-${state}`} viewBox="0 0 200 230" width={size} aria-hidden="true">
        <g className="critter-body">
          <path d="M70 150 Q100 142 130 150 L134 200 Q100 210 66 200 Z" fill={BI.teal} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M82 166 H118" stroke={BI.brassLight} strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="182" r="7" fill={BI.brass} stroke={INK} strokeWidth="3" />
        </g>
      </svg>
    </div>
  );
}

export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

const STARS = Array.from({ length: 46 }, (_, i) => ({ x: (i * 353) % 1600, y: (i * 197) % 360, r: 1.2 + (i % 3) * 0.9 }));
const LANTERNS = [140, 330, 520, 710, 900, 1090, 1280, 1470];
const lanternY = (x: number) => 150 + Math.sin(((x - 40) / 1520) * Math.PI) * 70;

export function HarbourBackground() {
  return (
    <svg className="scene-bg bi-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="bi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BI.night} />
          <stop offset="0.55" stopColor={BI.dusk} />
          <stop offset="1" stopColor="#5B5C9C" />
        </linearGradient>
        <linearGradient id="bi-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BI.teal} />
          <stop offset="1" stopColor={BI.sea} />
        </linearGradient>
        <radialGradient id="bi-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE9A8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE9A8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bi-sky)" />
      <g fill="#fff">
        {STARS.map((s, i) => <circle key={i} className="twinkle" cx={s.x} cy={s.y} r={s.r} opacity={0.75} style={{ animationDelay: `${(i % 7) * 0.5}s` }} />)}
      </g>
      <g>
        <circle cx="1320" cy="120" r="46" fill="#FFF3C9" />
        <circle cx="1342" cy="104" r="42" fill={BI.night} opacity="0.9" />
      </g>
      {/* far island + lighthouse */}
      <path d="M0 520 Q180 450 380 500 Q520 470 640 520 L640 560 L0 560 Z" fill="#26386A" />
      <g transform="translate(250 380)">
        <path d="M-14 120 L-8 0 L8 0 L14 120 Z" fill={BI.cream} stroke={INK} strokeWidth="4" />
        <path d="M-11 40 L11 40 M-12 80 L12 80" stroke={BI.coral} strokeWidth="10" />
        <rect x="-12" y="-16" width="24" height="16" fill="#FFE27A" stroke={INK} strokeWidth="4" />
        <path d="M-16 -16 L0 -32 L16 -16 Z" fill={BI.coral} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path className="bi-beam-light" d="M0 -8 L-260 -60 L-260 30 Z" fill="#FFF3C9" opacity="0.12" />
      </g>
      {/* sea */}
      <rect y="540" width="1600" height="360" fill="url(#bi-sea)" />
      <g stroke="#7FD3D6" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" fill="none">
        {[[120, 600], [520, 640], [980, 610], [1380, 660], [300, 700], [760, 720], [1200, 740]].map(([x, y]) => <path key={`${x}${y}`} className="bi-wave" d={`M${x} ${y} q30 -12 60 0 t60 0`} />)}
      </g>
      {/* market stalls along the quay */}
      <rect y="760" width="1600" height="140" fill="#3B2A4A" />
      <rect y="756" width="1600" height="14" fill="#6B4A3A" stroke={INK} strokeWidth="4" />
      {[60, 440, 1120, 1450].map((x, k) => (
        <g key={x} transform={`translate(${x} 600)`}>
          <rect x="0" y="40" width="10" height="120" fill="#5A3A2A" />
          <rect x="170" y="40" width="10" height="120" fill="#5A3A2A" />
          <path d="M-14 40 L194 40 L180 0 L0 0 Z" fill={k % 2 ? BI.teal : BI.coral} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${8 + i * 40} 0 L${2 + i * 40} 40 L${22 + i * 40} 40 L${26 + i * 40} 0 Z`} fill={BI.cream} opacity="0.85" />)}
          <rect x="-6" y="120" width="192" height="40" rx="6" fill="#7A4B2A" stroke={INK} strokeWidth="5" />
        </g>
      ))}
      {/* lantern string */}
      <path d={`M40 150 Q800 290 1560 150`} fill="none" stroke={INK} strokeWidth="4" opacity="0.8" />
      {LANTERNS.map((x, i) => (
        <g key={x} transform={`translate(${x} ${lanternY(x)})`} className="bi-lantern" style={{ animationDelay: `${i * 0.3}s` }}>
          <circle r="46" fill="url(#bi-glow)" />
          <path d="M0 -10 L0 0" stroke={INK} strokeWidth="3" />
          <ellipse cx="0" cy="18" rx="14" ry="18" fill={i % 3 === 0 ? BI.coral : "#FFD43B"} stroke={INK} strokeWidth="4" />
          <path d="M-8 2 H8 M-8 34 H8" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

export function BalanceKeeperSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Balance Keeper sticker: a level brass scale with a mystery bag on one pan and weights on the other">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="#DCEFF2" />
      <g fill="#fff" opacity="0.8">{[[64, 70], [176, 66], [120, 40], [48, 124], [192, 120]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" />)}</g>
      <rect x="114" y="66" width="12" height="96" rx="4" fill={BI.brassDark} stroke={INK} strokeWidth="4" />
      <path d="M84 166 L156 166 L162 180 L78 180 Z" fill="#7A4B2A" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="44" y="70" width="152" height="10" rx="5" fill={BI.brass} stroke={INK} strokeWidth="4" />
      <circle cx="120" cy="75" r="9" fill={BI.brass} stroke={INK} strokeWidth="4" />
      <path d="M58 80 L40 128 M58 80 L76 128 M182 80 L164 128 M182 80 L200 128" stroke={INK} strokeWidth="2.5" />
      <path d="M32 128 L84 128 Q80 142 58 142 Q36 142 32 128 Z" fill={BI.brass} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M156 128 L208 128 Q204 142 182 142 Q160 142 156 128 Z" fill={BI.brass} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <g transform="translate(43 96) scale(0.3)"><BagArtPaths /></g>
      <rect x="166" y="108" width="14" height="20" rx="3" fill={BI.brass} stroke={INK} strokeWidth="3" />
      <rect x="184" y="114" width="14" height="14" rx="3" fill={BI.brassLight} stroke={INK} strokeWidth="3" />
      <path d="M120 22 L127 38 L144 39 L131 50 L135 67 L120 58 L105 67 L109 50 L96 39 L113 38 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path id="bi-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="20" fill={INK} letterSpacing="2">
        <textPath href="#bi-arc" startOffset="50%" textAnchor="middle">BALANCE KEEPER</textPath>
      </text>
    </svg>
  );
}

/** The bag's shapes without its own <svg>, for composing inside other art. */
function BagArtPaths() {
  return (
    <g>
      <path d="M22 44 C10 64 12 98 30 104 L70 104 C88 98 90 64 78 44 Z" fill={BI.plum} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M34 44 C30 32 36 22 42 18 L58 18 C64 22 70 32 66 44 Z" fill={BI.plum} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M30 44 Q50 52 70 44" fill="none" stroke={BI.brass} strokeWidth="9" strokeLinecap="round" />
      <circle cx="50" cy="76" r="17" fill={BI.cream} stroke={INK} strokeWidth="5" />
      <text x="50" y="85" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="28" fill={BI.plumDark}>x</text>
    </g>
  );
}
