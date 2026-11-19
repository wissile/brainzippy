import { Budge } from "../../characters/library/Budge";
import { CREW, INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import type { Denom } from "./logic";

/**
 * Budge's Lemonade Stand — original SVG art. Coins are stylised learning objects with value numerals and
 * distinct sizes/colours, NOT replicas of US Mint designs (no portraits, buildings or mottos); notes are
 * clearly toy notes ("PLAY") with a lemon emblem. See docs/curriculum/money.md §5.
 */
export const LS = {
  sky: "#8FD8FF",
  skyLow: "#FFF1C9",
  sea: "#3FB8D9",
  seaDeep: "#2A8FB8",
  foam: "#E8FBFF",
  sand: "#F6DDA0",
  sandDark: "#E7C27A",
  lemon: "#FFD84D",
  lemonDark: "#E9B323",
  lemonPale: "#FFF4B8",
  leaf: "#5DBB63",
  wood: "#D4985A",
  woodDark: "#A0652F",
  stripe: "#FFF8E4",
  copper: "#C9733A",
  copperLight: "#EBA06A",
  silver: "#C7D0DC",
  silverLight: "#F1F5FA",
  silverDark: "#8592A6",
  note: "#A8E0B4",
  noteDark: "#3C8A57",
  glass: "#DDF3FF",
  coral: "#FF7A6B",
} as const;
const FONT = "'Baloo 2', 'Nunito', system-ui, sans-serif";

// ---------------------------------------------------------------- money

const COIN_STYLE: Record<Exclude<Denom, 100 | 500>, { fill: string; light: string; dark: string; label: string; edge: "dots" | "plain" | "reeded" }> = {
  1: { fill: LS.copper, light: LS.copperLight, dark: "#8F4A1F", label: "1¢", edge: "dots" },
  5: { fill: LS.silver, light: LS.silverLight, dark: LS.silverDark, label: "5¢", edge: "plain" },
  10: { fill: LS.silver, light: LS.silverLight, dark: LS.silverDark, label: "10¢", edge: "reeded" },
  25: { fill: LS.silver, light: LS.silverLight, dark: LS.silverDark, label: "25¢", edge: "reeded" },
};

/** One coin (viewBox 100×100; the board sizes coins by real-life diameter: dime < penny < nickel < quarter). */
export function CoinArt({ d }: { d: 1 | 5 | 10 | 25 }) {
  const s = COIN_STYLE[d];
  return (
    <svg viewBox="0 0 100 100" className={`ls-coin-art ls-c${d}`} aria-hidden="true">
      <circle cx="50" cy="54" r="44" fill={INK} opacity="0.18" />
      <circle cx="50" cy="50" r="44" fill={s.fill} stroke={INK} strokeWidth="5" />
      {s.edge === "reeded" && (
        <g stroke={s.dark} strokeWidth="2.4" strokeLinecap="round">
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            return <line key={i} x1={50 + Math.cos(a) * 36} y1={50 + Math.sin(a) * 36} x2={50 + Math.cos(a) * 40} y2={50 + Math.sin(a) * 40} />;
          })}
        </g>
      )}
      {s.edge === "dots" && (
        <g fill={s.light}>
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i / 20) * Math.PI * 2;
            return <circle key={i} cx={50 + Math.cos(a) * 37} cy={50 + Math.sin(a) * 37} r="2.2" />;
          })}
        </g>
      )}
      <circle cx="50" cy="50" r={s.edge === "plain" ? 30 : 32} fill={s.light} stroke={s.dark} strokeWidth={s.edge === "plain" ? 6 : 3} />
      {d === 25 && <path d="M50 20 L53 28 L61 28 L55 33 L57 41 L50 36 L43 41 L45 33 L39 28 L47 28 Z" fill={s.dark} opacity="0.55" />}
      <text x="50" y={d === 25 ? 68 : 62} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize={s.label.length > 2 ? 27 : 31} fill={INK}>
        {s.label}
      </text>
      <path d="M22 36 A32 32 0 0 1 40 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** A toy note (viewBox 160×80): big numeral, lemon emblem, "PLAY". */
export function NoteArt({ d }: { d: 100 | 500 }) {
  const n = d / 100;
  const fill = d === 100 ? LS.note : "#B9D7F5";
  const dark = d === 100 ? LS.noteDark : "#3F6FA8";
  return (
    <svg viewBox="0 0 160 80" className={`ls-note-art ls-n${d}`} aria-hidden="true">
      <rect x="4" y="7" width="152" height="70" rx="10" fill={INK} opacity="0.18" />
      <rect x="4" y="4" width="152" height="70" rx="10" fill={fill} stroke={INK} strokeWidth="5" />
      <rect x="14" y="13" width="132" height="52" rx="7" fill="none" stroke={dark} strokeWidth="3" strokeDasharray="8 5" />
      <ellipse cx="80" cy="39" rx="21" ry="17" fill={LS.lemon} stroke={INK} strokeWidth="3.5" />
      <path d="M80 26 Q88 18 95 22 Q88 28 80 26 Z" fill={LS.leaf} stroke={INK} strokeWidth="2.5" />
      <text x="80" y="47" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="22" fill={INK}>{`$${n}`}</text>
      <text x="30" y="37" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="22" fill={dark}>{n}</text>
      <text x="130" y="58" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="22" fill={dark}>{n}</text>
      <text x="130" y="30" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="10" letterSpacing="1.5" fill={dark}>PLAY</text>
    </svg>
  );
}

export function MoneyArt({ d }: { d: Denom }) {
  return d >= 100 ? <NoteArt d={d as 100 | 500} /> : <CoinArt d={d as 1 | 5 | 10 | 25} />;
}

// ---------------------------------------------------------------- supplies and stand objects

export function LemonArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="58" rx="36" ry="28" fill={LS.lemon} stroke={INK} strokeWidth="5" />
      <path d="M14 58 Q8 56 10 52 M86 58 Q92 56 90 52" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M50 30 Q60 14 76 18 Q66 32 50 30 Z" fill={LS.leaf} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 48 Q36 40 46 38" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

function LemonsArt() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true">
      <path d="M14 46 L106 46 L98 92 L22 92 Z" fill="#E6F2D9" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 60 L98 60 M24 76 L96 76 M42 46 L44 92 M60 46 L60 92 M78 46 L76 92" stroke={LS.leaf} strokeWidth="3" />
      {([[34, 40], [60, 34], [86, 40]] as [number, number][]).map(([x, y]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx="18" ry="14" fill={LS.lemon} stroke={INK} strokeWidth="4" />
          <path d={`M${x - 8} ${y - 4} Q${x - 4} ${y - 9} ${x + 2} ${y - 10}`} stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

function SugarArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M24 26 Q50 16 76 26 L82 88 Q50 96 18 88 Z" fill="#FFFDF6" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M26 26 Q34 14 40 22 Q46 12 52 20 Q60 12 64 22 Q70 14 74 26" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="46" width="40" height="24" rx="6" fill="#8ED1F2" stroke={INK} strokeWidth="3.5" />
      {([[40, 58], [50, 54], [60, 60], [46, 64], [56, 50]] as [number, number][]).map(([x, y]) => <rect key={`${x}${y}`} x={x - 3} y={y - 3} width="6" height="6" rx="1" fill="#fff" stroke={INK} strokeWidth="1.5" />)}
    </svg>
  );
}

function CupsArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M28 ${22 + i * 12} L72 ${22 + i * 12} L66 ${46 + i * 12} L34 ${46 + i * 12} Z`} fill={i % 2 ? "#FFE58A" : "#fff"} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      ))}
      <path d="M30 94 L70 94" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function CupArt({ full = true }: { full?: boolean }) {
  return (
    <svg viewBox="0 0 100 120" aria-hidden="true">
      <path d="M62 8 L54 50" stroke={LS.coral} strokeWidth="7" strokeLinecap="round" />
      <path d="M22 34 L78 34 L70 110 L30 110 Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {full && <path d="M26 46 L74 46 L69 104 L31 104 Z" fill={LS.lemon} />}
      {full && <circle cx="38" cy="44" r="10" fill={LS.lemonPale} stroke={LS.lemonDark} strokeWidth="3" />}
      <path d="M22 34 L78 34 L70 110 L30 110 Z" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M30 60 L33 96" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function PitcherArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M86 40 Q112 44 104 70 Q98 86 82 84" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M26 20 L90 20 L84 108 Q58 116 32 108 Z" fill={LS.glass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M29 42 L87 42 L83 104 Q58 111 33 104 Z" fill={LS.lemon} opacity="0.9" />
      <circle cx="46" cy="62" r="11" fill={LS.lemonPale} stroke={LS.lemonDark} strokeWidth="3" />
      <circle cx="68" cy="82" r="9" fill={LS.lemonPale} stroke={LS.lemonDark} strokeWidth="3" />
      <rect x="54" y="50" width="10" height="10" rx="2" fill="#fff" opacity="0.8" />
      <path d="M26 20 L90 20 L84 108 Q58 116 32 108 Z" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M18 18 L28 26" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M36 32 L40 96" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Budge's savings jar; `fill` 0..1 shows coins inside, with a little telescope on the label. */
export function JarArt({ fill = 0 }: { fill?: number }) {
  const f = Math.max(0, Math.min(1, fill));
  const top = 112 - f * 72;
  return (
    <svg viewBox="0 0 120 130" className="ls-jar-art" aria-hidden="true">
      <rect x="30" y="8" width="60" height="16" rx="6" fill={LS.woodDark} stroke={INK} strokeWidth="5" />
      <path d="M48 12 L72 12" stroke={LS.lemon} strokeWidth="4" strokeLinecap="round" />
      <path d="M28 26 Q16 34 16 54 L16 108 Q16 122 32 122 L88 122 Q104 122 104 108 L104 54 Q104 34 92 26 Z" fill={LS.glass} stroke={INK} strokeWidth="5" />
      {f > 0 && (
        <g>
          <path d={`M19 ${top} Q60 ${top - 8} 101 ${top} L101 108 Q101 119 88 119 L32 119 Q19 119 19 108 Z`} fill={LS.silver} />
          {Array.from({ length: Math.ceil(f * 9) }, (_, i) => (
            <ellipse key={i} cx={30 + ((i * 23) % 62)} cy={Math.min(112, top + 6 + (i % 3) * 10)} rx="9" ry="5" fill={i % 3 === 0 ? LS.copperLight : LS.silverLight} stroke={INK} strokeWidth="2" />
          ))}
        </g>
      )}
      <rect x="32" y="56" width="56" height="30" rx="6" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <g transform="translate(44 62) rotate(-18)">
        <rect x="0" y="4" width="26" height="9" rx="3" fill={CREW.rumble} stroke={INK} strokeWidth="2.5" />
        <rect x="24" y="2" width="6" height="13" rx="2" fill={CREW.rumble} stroke={INK} strokeWidth="2.5" />
      </g>
      <path d="M58 82 L54 92 M58 82 L62 92" stroke={INK} strokeWidth="2.5" />
      <path d="M26 44 Q24 70 26 100" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.7" fill="none" />
    </svg>
  );
}

function CrateArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect x="12" y="40" width="76" height="50" rx="6" fill={LS.wood} stroke={INK} strokeWidth="5" />
      <path d="M12 58 L88 58 M12 74 L88 74" stroke={LS.woodDark} strokeWidth="4" />
      {([[30, 34], [50, 28], [70, 34]] as [number, number][]).map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="14" ry="11" fill={LS.lemon} stroke={INK} strokeWidth="4" />)}
    </svg>
  );
}

function RainArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M24 60 Q8 60 10 46 Q12 32 28 34 Q32 16 52 18 Q70 18 74 34 Q92 32 92 48 Q92 60 78 60 Z" fill="#E4ECF7" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {([[32, 72], [52, 80], [72, 72]] as [number, number][]).map(([x, y]) => <path key={x} d={`M${x} ${y} Q${x - 5} ${y + 9} ${x} ${y + 12} Q${x + 5} ${y + 9} ${x} ${y} Z`} fill="#62B6F0" stroke={INK} strokeWidth="3" />)}
    </svg>
  );
}

function SignArt() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 8 L50 30" stroke={INK} strokeWidth="5" />
      <rect x="14" y="28" width="72" height="50" rx="10" fill={LS.lemonPale} stroke={INK} strokeWidth="5" />
      <text x="50" y="62" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="26" fill={INK}>¢?</text>
      <path d="M30 88 L70 88" stroke={LS.woodDark} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** Prompt icons and supply pictures. */
export function StandObject({ kind }: { kind: string }) {
  switch (kind) {
    case "lemon": return <LemonArt />;
    case "lemons": return <LemonsArt />;
    case "sugar": return <SugarArt />;
    case "cups": return <CupsArt />;
    case "cup": return <CupArt />;
    case "pitcher": return <PitcherArt />;
    case "jar": return <JarArt fill={0.5} />;
    case "crate": return <CrateArt />;
    case "rain": return <RainArt />;
    case "sign": return <SignArt />;
    default: return <CoinArt d={25} />;
  }
}

// ---------------------------------------------------------------- the stand

/** Scalloped yellow-and-white awning (stretches horizontally). */
export function AwningArt() {
  const n = 8;
  const w = 400 / n;
  return (
    <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="ls-awning-art" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * w} 0 L${(i + 1) * w} 0 L${(i + 1) * w} 44 Q${(i + 0.5) * w} 68 ${i * w} 44 Z`} fill={i % 2 ? LS.stripe : LS.lemon} stroke={INK} strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      ))}
      <rect x="0" y="0" width="400" height="10" fill={LS.lemonDark} />
    </svg>
  );
}

/** The sign on the front of the counter. */
export function StandSignArt() {
  return (
    <svg viewBox="0 0 240 60" className="ls-standsign-art" aria-hidden="true">
      <rect x="4" y="4" width="232" height="52" rx="14" fill={LS.stripe} stroke={INK} strokeWidth="5" />
      <ellipse cx="34" cy="30" rx="16" ry="13" fill={LS.lemon} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="206" cy="30" rx="16" ry="13" fill={LS.lemon} stroke={INK} strokeWidth="3.5" />
      <text x="120" y="41" textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="30" fill={LS.woodDark} letterSpacing="1">Lemonade</text>
    </svg>
  );
}

export function TelescopeArt() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true">
      <path d="M60 58 L40 94 M60 58 L80 94 M60 58 L60 94" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <g transform="rotate(-24 60 50)">
        <rect x="18" y="38" width="70" height="22" rx="8" fill={CREW.rumble} stroke={INK} strokeWidth="5" />
        <rect x="84" y="32" width="18" height="34" rx="6" fill="#7FB2FF" stroke={INK} strokeWidth="5" />
        <rect x="8" y="42" width="14" height="14" rx="4" fill="#3C6FD1" stroke={INK} strokeWidth="4" />
      </g>
      <path d="M100 10 L103 18 L111 18 L105 23 L107 31 L100 26 L93 31 L95 23 L89 18 L97 18 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- scene

export function BeachBackground() {
  return (
    <svg className="scene-bg ls-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LS.sky} />
          <stop offset="1" stopColor={LS.skyLow} />
        </linearGradient>
        <linearGradient id="ls-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={LS.seaDeep} />
          <stop offset="1" stopColor={LS.sea} />
        </linearGradient>
        <radialGradient id="ls-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="1" stopColor="#FFE066" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ls-sky)" />
      <circle cx="1280" cy="160" r="180" fill="url(#ls-sun)" />
      <circle cx="1280" cy="160" r="70" fill="#FFE066" />
      <g className="cloud" fill="#fff" opacity="0.9">
        <ellipse cx="300" cy="140" rx="110" ry="34" />
        <ellipse cx="360" cy="118" rx="70" ry="38" />
      </g>
      <g className="cloud c2" fill="#fff" opacity="0.8">
        <ellipse cx="880" cy="96" rx="90" ry="26" />
        <ellipse cx="930" cy="80" rx="54" ry="28" />
      </g>
      <path d="M0 470 L1600 470 L1600 640 L0 640 Z" fill="url(#ls-sea)" />
      <g className="ls-waves" stroke={LS.foam} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M80 520 q30 -14 60 0 t60 0" />
        <path d="M520 560 q30 -14 60 0 t60 0" />
        <path d="M1040 510 q30 -14 60 0 t60 0" />
        <path d="M1380 580 q30 -14 60 0 t60 0" />
      </g>
      <path d="M1180 460 l40 0 l-12 14 l-18 0 z M1198 420 l0 40 M1198 424 l22 28 l-22 0 z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <g stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round">
        <path d="M640 220 q12 -12 24 0 q12 -12 24 0" />
        <path d="M720 260 q9 -9 18 0 q9 -9 18 0" />
      </g>
      <path d="M0 610 Q400 580 800 612 T1600 600 L1600 900 L0 900 Z" fill={LS.sand} />
      <path d="M0 610 Q400 580 800 612 T1600 600" fill="none" stroke={LS.foam} strokeWidth="10" opacity="0.9" />
      <g fill={LS.sandDark}>
        {([[220, 760], [520, 820], [980, 780], [1320, 840], [1460, 720], [700, 700]] as [number, number][]).map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="16" ry="6" />)}
      </g>
      {/* palm */}
      <path d="M140 900 Q150 700 210 560" fill="none" stroke="#9C6B3C" strokeWidth="30" strokeLinecap="round" />
      <path d="M140 900 Q150 700 210 560" fill="none" stroke={INK} strokeWidth="4" strokeDasharray="2 34" />
      <g fill={LS.leaf} stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <path d="M210 560 Q120 500 40 560 Q130 520 210 560 Z" />
        <path d="M210 560 Q260 470 360 500 Q270 500 210 560 Z" />
        <path d="M210 560 Q180 450 240 400 Q210 480 210 560 Z" />
        <path d="M210 560 Q300 560 340 640 Q280 580 210 560 Z" />
      </g>
      {/* beach umbrella far right */}
      <path d="M1470 820 L1430 600" stroke={INK} strokeWidth="8" />
      <path d="M1330 640 Q1420 520 1540 580 Z" fill={LS.coral} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M1390 606 Q1430 570 1470 590" fill="none" stroke="#fff" strokeWidth="8" opacity="0.6" />
    </svg>
  );
}

// ---------------------------------------------------------------- characters

export function BudgeMascot({ state = "idle", talking = false, size = 160 }: { state?: MascotState; talking?: boolean; size?: number | string }) {
  return <Budge state={state} talking={talking} size={size} />;
}

export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

// ---------------------------------------------------------------- reward

/** "Stand Star": a round lemon-slice badge with Budge's pencil and a tiny star. */
export function StandStarSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Stand Star sticker: a lemon slice badge with a pencil and a little star">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill={LS.lemon} stroke={LS.lemonDark} strokeWidth="6" />
      <circle cx="120" cy="120" r="82" fill={LS.lemonPale} />
      <g stroke="#fff" strokeWidth="6" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <line key={i} x1={120 + Math.cos(a) * 14} y1={120 + Math.sin(a) * 14} x2={120 + Math.cos(a) * 76} y2={120 + Math.sin(a) * 76} />;
        })}
      </g>
      <g fill={LS.lemon} opacity="0.85">
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i + 0.5) / 10) * Math.PI * 2;
          return <ellipse key={i} cx={120 + Math.cos(a) * 46} cy={120 + Math.sin(a) * 46} rx="14" ry="22" transform={`rotate(${(a * 180) / Math.PI + 90} ${120 + Math.cos(a) * 46} ${120 + Math.sin(a) * 46})`} />;
        })}
      </g>
      <circle cx="120" cy="120" r="16" fill="#fff" stroke={LS.lemonDark} strokeWidth="4" />
      <g transform="rotate(-38 120 120)">
        <rect x="58" y="110" width="104" height="20" rx="4" fill="#FF9F43" stroke={INK} strokeWidth="5" />
        <rect x="58" y="110" width="18" height="20" rx="3" fill="#FF8FB1" stroke={INK} strokeWidth="5" />
        <path d="M162 110 L188 120 L162 130 Z" fill="#FBE3B8" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M180 117 L188 120 L180 123 Z" fill={INK} />
      </g>
      <path d="M176 36 L182 52 L199 53 L186 63 L190 80 L176 71 L162 80 L166 63 L153 53 L170 52 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path id="ls-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily={FONT} fontWeight="800" fontSize="21" fill={INK} letterSpacing="2">
        <textPath href="#ls-arc" startOffset="50%" textAnchor="middle">STAND STAR</textPath>
      </text>
    </svg>
  );
}
