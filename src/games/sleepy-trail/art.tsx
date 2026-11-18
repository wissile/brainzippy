import { CREW, INK } from "../../characters/palette";
import { useTrail } from "./store";

/** Rumble's Sleepy Trail — original SVG art: meadow at sunset, trail landmarks, pillows, fraction cards, sticker. */

// ---------------------------------------------------------------- colour helpers
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

/** The meadow with the Sleepy Trail; `dusk` 0 = golden afternoon … 1 = starry bedtime. */
export function TrailScene({ dusk = 0, className = "scene-bg", id = "stbg" }: { dusk?: number; className?: string; id?: string }) {
  const t = Math.max(0, Math.min(1, dusk));
  const top = mix("#7CC8F2", "#2A2366", t);
  const midc = mix("#BFE6FA", "#8A4C93", t);
  const low = mix("#FFE7B0", "#F59E6B", t);
  const hillFar = mix("#9BD98F", "#4E6F78", t);
  const hillNear = mix("#7FCB6E", "#3F6A4F", t);
  const sunY = 170 + t * 470;
  return (
    <svg className={className} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="0.6" stopColor={midc} /><stop offset="1" stopColor={low} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFF3B0" /><stop offset="1" stopColor="#FFC56B" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <g fill="#fff" opacity={Math.max(0, t * 1.4 - 0.4)}>
        {Array.from({ length: 34 }, (_, i) => <circle key={i} className="st-twinkle" cx={(i * 421) % 1600} cy={(i * 173) % 430} r={1.6 + (i % 3)} style={{ animationDelay: `${(i % 6) * 0.5}s` }} />)}
      </g>
      <g opacity={1 - t * 0.35}>
        <circle cx="1240" cy={sunY} r="180" fill={`url(#${id}-sun)`} />
        <circle cx="1240" cy={sunY} r="70" fill={mix("#FFE066", "#FF9A52", t)} />
      </g>
      {t > 0.55 && <g opacity={(t - 0.55) * 2.2}><circle cx="300" cy="150" r="46" fill="#FFF6D0" /><circle cx="322" cy="134" r="42" fill={top} /></g>}
      <g fill="#fff" opacity={0.75 - t * 0.5} className="st-clouds">
        <ellipse cx="300" cy="220" rx="120" ry="34" /><ellipse cx="370" cy="200" rx="70" ry="32" />
        <ellipse cx="980" cy="140" rx="110" ry="30" /><ellipse cx="1040" cy="122" rx="60" ry="28" />
      </g>
      <path d="M0 610 Q240 500 520 560 T1060 530 T1600 560 L1600 900 L0 900 Z" fill={hillFar} />
      <g fill={mix("#4BAE5C", "#2E5244", t)}>
        <circle cx="180" cy="560" r="48" /><rect x="172" y="580" width="16" height="60" rx="5" fill={mix("#8A5A3B", "#4A3328", t)} />
        <circle cx="1420" cy="548" r="56" /><rect x="1411" y="572" width="18" height="66" rx="5" fill={mix("#8A5A3B", "#4A3328", t)} />
      </g>
      <path d="M0 700 Q400 640 800 680 T1600 670 L1600 900 L0 900 Z" fill={hillNear} />
      <g fill="#FFE27A" opacity={Math.max(0, t * 1.6 - 0.6)}>
        {[[260, 720], [540, 770], [900, 710], [1180, 790], [1380, 730], [720, 820]].map(([x, y], i) => <circle key={i} className="st-firefly" cx={x} cy={y} r="5" style={{ animationDelay: `${i * 0.7}s` }} />)}
      </g>
    </svg>
  );
}

/** Play background: the sun sinks as pillows are placed. */
export function TrailBackground() {
  const { done } = useTrail();
  return <TrailScene dusk={done / 8} />;
}

// ---------------------------------------------------------------- landmarks at the whole numbers

export function Landmark({ m }: { m: number }) {
  switch (m) {
    case 0: // Mossy Rock
      return (
        <svg viewBox="0 0 100 80" className="st-landmark-art" aria-hidden="true">
          <path d="M8 74 Q6 40 30 28 Q50 14 72 26 Q96 38 92 74 Z" fill="#A9A3B8" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M18 40 Q34 22 56 24 Q72 26 82 38 Q66 34 52 40 Q34 34 18 40 Z" fill="#6BCB77" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="66" cy="56" r="5" fill="#8E88A0" /><circle cx="34" cy="60" r="4" fill="#8E88A0" />
        </svg>
      );
    case 1: // Big Tree
      return (
        <svg viewBox="0 0 100 110" className="st-landmark-art" aria-hidden="true">
          <path d="M42 106 Q44 76 38 58 L62 58 Q56 76 58 106 Z" fill="#8A5A3B" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="30" cy="44" r="24" fill="#3FA552" stroke={INK} strokeWidth="5" />
          <circle cx="70" cy="44" r="24" fill="#3FA552" stroke={INK} strokeWidth="5" />
          <circle cx="50" cy="28" r="26" fill="#4CB35E" stroke={INK} strokeWidth="5" />
          <circle cx="50" cy="48" r="20" fill="#4CB35E" />
          <circle cx="40" cy="22" r="5" fill="#8FE09A" />
        </svg>
      );
    case 2: // Far Hill
      return (
        <svg viewBox="0 0 100 90" className="st-landmark-art" aria-hidden="true">
          <path d="M4 86 Q30 26 50 24 Q72 24 96 86 Z" fill="#8FD88A" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M50 24 L50 4" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M50 5 L70 11 L50 17 Z" fill={CREW.bobbo} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="36" cy="60" r="4" fill="#FFF3A6" /><circle cx="62" cy="54" r="4" fill="#FF8FB1" />
        </svg>
      );
    default: // Cloud Peak
      return (
        <svg viewBox="0 0 100 100" className="st-landmark-art" aria-hidden="true">
          <path d="M4 96 L46 22 L60 44 L70 32 L96 96 Z" fill="#9C8FD0" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M36 40 L46 22 L56 38 L50 34 L44 42 Z" fill="#fff" />
          <g fill="#fff" stroke={INK} strokeWidth="3.5"><ellipse cx="58" cy="18" rx="18" ry="10" /><ellipse cx="74" cy="22" rx="14" ry="9" /></g>
        </svg>
      );
  }
}
export const LANDMARK_NAMES = ["Mossy Rock", "Big Tree", "Far Hill", "Cloud Peak"];

// ---------------------------------------------------------------- props

export function Pillow({ glow = false }: { glow?: boolean }) {
  return (
    <svg viewBox="0 0 100 64" className={`st-pillow-art ${glow ? "glow" : ""}`} aria-hidden="true">
      <path d="M10 18 Q4 8 14 8 Q50 14 86 8 Q96 8 90 18 Q96 32 90 46 Q96 56 86 56 Q50 50 14 56 Q4 56 10 46 Q4 32 10 18 Z" fill="#FFF6E0" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 22 Q50 26 78 22" fill="none" stroke="#FFB3C7" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 42 Q50 38 78 42" fill="none" stroke="#FFB3C7" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 26 L53 31 L59 32 L54 36 L56 42 L50 39 L44 42 L46 36 L41 32 L47 31 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** A fraction written the way it is in books: top number, bar, bottom number. */
export function FracGlyph({ a, d, className = "" }: { a: number; d: number; className?: string }) {
  return (
    <span className={`st-frac ${className}`} aria-hidden="true">
      <span className="st-frac-top">{a}</span>
      <span className="st-frac-bar" />
      <span className="st-frac-bot">{d}</span>
    </span>
  );
}

/** Prompt icon: the fraction to find (never shown for "name the fraction", where it would give the answer away). */
export function FractionArt({ kind }: { kind: string }) {
  const f = /^st-f(\d+)-(\d+)$/.exec(kind);
  if (f) return <span className="st-prompt-frac"><FracGlyph a={Number(f[1])} d={Number(f[2])} /></span>;
  const c = /^st-c(\d+)-(\d+)-(\d+)-(\d+)$/.exec(kind);
  if (c) return <span className="st-prompt-frac pair"><FracGlyph a={Number(c[1])} d={Number(c[2])} /><FracGlyph a={Number(c[3])} d={Number(c[4])} /></span>;
  return <Pillow />;
}

export const BasketStub = () => <svg aria-hidden="true" />;

// ---------------------------------------------------------------- sticker

/** "Trail Marker": a wooden signpost with a tiny pillow and Rumble's star horn. */
export function TrailMarkerSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Trail Marker sticker: a wooden signpost with a tiny pillow and a gold star">
      <defs>
        <radialGradient id="stsk-bg" cx="0.5" cy="0.35" r="0.7"><stop offset="0" stopColor="#5B4BB0" /><stop offset="1" stopColor="#241B5C" /></radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="url(#stsk-bg)" />
      <g fill="#fff">{[[70, 64], [168, 58], [184, 110], [56, 118], [150, 40]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3" />)}</g>
      <path d="M40 176 Q120 150 200 176 L200 200 Q120 214 40 200 Z" fill="#4CB35E" />
      <rect x="111" y="78" width="18" height="112" rx="6" fill="#B07A4F" stroke={INK} strokeWidth="5" />
      <path d="M64 84 L160 84 L178 102 L160 120 L64 120 Z" fill="#D9A06A" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <text x="114" y="111" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="28" fill={INK}>3/4</text>
      <path d="M120 30 L128 46 L146 48 L132 60 L136 78 L120 69 L104 78 L108 60 L94 48 L112 46 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <g transform="translate(132 132) scale(0.62)"><Pillow /></g>
      <path id="st-sticker-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill="#fff" letterSpacing="1.5">
        <textPath href="#st-sticker-arc" startOffset="50%" textAnchor="middle">TRAIL MARKER</textPath>
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- story prop

/**
 * A short story trail (0 → 1) in `parts` equal parts, with pillows on some posts.
 * Used by the cinematic intro/outro (no interaction).
 */
export function StoryTrail({ parts = 4, pillows = [], labels = false }: { parts?: number; pillows?: number[]; labels?: boolean }) {
  const x0 = 60, x1 = 540, y = 70;
  const px = (k: number) => x0 + ((x1 - x0) * k) / parts;
  return (
    <svg viewBox="0 0 600 130" className="st-storytrail" aria-hidden="true">
      <path d={`M${x0 - 30} ${y} L${x1 + 30} ${y}`} stroke="#C99A62" strokeWidth="22" strokeLinecap="round" />
      <path d={`M${x0 - 30} ${y} L${x1 + 30} ${y}`} stroke="#E8C48E" strokeWidth="12" strokeLinecap="round" />
      {Array.from({ length: parts + 1 }, (_, k) => (
        <g key={k}>
          <rect x={px(k) - 5} y={y - (k === 0 || k === parts ? 30 : 22)} width="10" height={k === 0 || k === parts ? 44 : 34} rx="3" fill="#8A5A3B" stroke={INK} strokeWidth="3" />
          {labels && (k === 0 || k === parts) && <text x={px(k)} y={y + 50} textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="26" fill="#fff" stroke={INK} strokeWidth="5" paintOrder="stroke">{k === 0 ? 0 : 1}</text>}
        </g>
      ))}
      {pillows.map((k) => <g key={k} transform={`translate(${px(k) - 26} ${y - 66}) scale(0.52)`}><Pillow /></g>)}
    </svg>
  );
}
