import { INK } from "../../characters/palette";
import { PICTURES } from "../paper-boat-post/art";
import { N, S, T } from "../paper-boat-post/pictures-a";

/**
 * Wordroot Grove — original SVG art: the grove scene with the Leaf Library tree, leaves, the owner pictures for
 * apostrophe items (drawn from Paper Boat Post's picture bank, same style), the prompt icons and the Root Reader
 * badge. Everything is flat fills with the Critter Crew ink outline.
 */
const LEAF = "#7CCB6B";
const LEAF_DEEP = "#3F8F4A";
const BARK = "#9A6234";
const BARK_DEEP = "#6E4220";

/** A leaf in a 100-unit box, pointing up-right; `vein` draws the midrib. */
export function LeafShape({ fill = LEAF, vein = true, label }: { fill?: string; vein?: boolean; label?: string }) {
  return (
    <g>
      <path d="M14 88 Q8 40 46 18 Q70 6 92 8 Q94 34 82 56 Q60 92 14 88 Z" fill={fill} {...S} />
      {vein && <path d="M14 88 Q48 56 88 12 M36 66 Q34 52 40 40 M52 50 Q62 48 70 42 M44 58 Q56 60 64 56" {...N} strokeWidth={2.5} opacity={0.55} />}
      {label && <text x="52" y="58" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK} transform="rotate(-38 52 58)">{label}</text>}
    </g>
  );
}

/** The grove: a hilly glade, the great Leaf Library tree with roots above ground, smaller word trees, drifting leaves. */
export function GroveScene() {
  return (
    <svg className="scene-bg wg-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="wg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#CFEFD9" /><stop offset="1" stopColor="#F4FBEA" /></linearGradient>
        <linearGradient id="wg-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FD07E" /><stop offset="1" stopColor="#6DB866" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#wg-sky)" />
      {/* far trees */}
      <g opacity="0.55">
        {[120, 330, 1250, 1460].map((x, i) => (
          <g key={x} transform={`translate(${x} ${300 + (i % 2) * 30})`}>
            <rect x="-10" y="60" width="20" height="160" fill={BARK} />
            <ellipse cx="0" cy="40" rx="90" ry="80" fill="#9BD58C" />
          </g>
        ))}
      </g>
      <path d="M0 560 Q400 500 800 540 T1600 520 L1600 900 L0 900 Z" fill="url(#wg-ground)" />
      {/* the great tree: trunk, roots spreading over the ground, a round library door */}
      <g transform="translate(1330 230) scale(0.6)">
        <path d="M-90 640 Q-70 420 -60 300 L60 300 Q70 420 90 640 Z" fill={BARK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <path d="M-90 630 Q-180 650 -280 700 M-60 640 Q-120 700 -150 760 M90 630 Q190 650 300 690 M60 640 Q130 700 170 770 M0 640 L0 740" fill="none" stroke={BARK_DEEP} strokeWidth="18" strokeLinecap="round" />
        <path d="M-90 630 Q-180 650 -280 700 M-60 640 Q-120 700 -150 760 M90 630 Q190 650 300 690 M60 640 Q130 700 170 770 M0 640 L0 740" fill="none" stroke={BARK} strokeWidth="10" strokeLinecap="round" />
        <path d="M-34 640 L-34 560 Q0 520 34 560 L34 640 Z" fill="#5B3518" stroke={INK} strokeWidth="5" />
        <circle cx="18" cy="600" r="4" fill="#FFD43B" />
        <path d="M-40 420 Q-20 400 0 420 M10 470 Q30 452 46 470" fill="none" stroke={BARK_DEEP} strokeWidth="5" strokeLinecap="round" />
        {/* canopy of word leaves */}
        <ellipse cx="0" cy="200" rx="360" ry="190" fill="#8ED17B" stroke={INK} strokeWidth="6" />
        <ellipse cx="-200" cy="250" rx="170" ry="120" fill="#7CCB6B" stroke={INK} strokeWidth="6" />
        <ellipse cx="210" cy="240" rx="180" ry="125" fill="#7CCB6B" stroke={INK} strokeWidth="6" />
        {[[-250, 150], [-120, 110], [30, 90], [170, 130], [280, 190], [-60, 230], [110, 250], [-300, 270], [300, 290]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x! - 24} ${y! - 24}) scale(0.48) rotate(${(i * 37) % 60 - 30} 50 50)`}>
            <LeafShape fill={i % 3 === 0 ? "#B5E48C" : i % 3 === 1 ? "#5FB35A" : "#A0DB7C"} />
          </g>
        ))}
      </g>
      {/* a few drifting leaves (motion: CSS, off under reduced motion) */}
      <g className="wg-drift">
        {[[260, 420], [1340, 380], [520, 300], [1100, 470]].map(([x, y], i) => (
          <g key={i} className="wg-drift-leaf" style={{ animationDelay: `${-i * 2.3}s` }} transform={`translate(${x} ${y}) scale(0.36)`}>
            <LeafShape fill={i % 2 ? "#F2C14E" : "#B5E48C"} vein={false} />
          </g>
        ))}
      </g>
      {/* mushrooms and stones */}
      <g stroke={INK} strokeWidth="5">
        <path d="M200 700 q20 -40 50 0 z" fill="#E86A5C" /><rect x="214" y="700" width="22" height="26" rx="6" fill="#FFF3E0" />
        <ellipse cx="1380" cy="720" rx="40" ry="20" fill="#B9C2C9" />
      </g>
    </svg>
  );
}

/** One picture from Paper Boat Post's bank at (x, y) with scale s (100-unit drawings). */
const at = (key: string, s: number, x: number, y: number, k?: string | number) => (
  <g key={k} transform={`translate(${x} ${y}) scale(${s})`}>{PICTURES[key] ?? <g />}</g>
);

/**
 * Apostrophe picture: ONE owner with three of its things, or THREE owners with one thing each. The count of owners
 * is what the child reads off the picture (docs §3 L8); the things sit right beside their owner so ownership is clear.
 */
export function OwnerPicture({ owner, thing, many }: { owner: string; thing: string; many: boolean }) {
  return (
    <svg className="wg-owner-pic" viewBox="0 0 300 130" role="img" aria-label={many ? `three ${owner}s, each with one ${thing}` : `one ${owner} with three ${thing}s`}>
      <ellipse cx="150" cy="124" rx="140" ry="5" fill={INK} opacity="0.1" />
      {many
        ? [0, 1, 2].map((i) => (
            <g key={i}>
              {at(owner, 0.74, 8 + i * 98, 18)}
              {at(thing, 0.36, 56 + i * 98, 84)}
            </g>
          ))
        : (
          <>
            {at(owner, 1.1, 24, 8)}
            {[0, 1, 2].map((i) => at(thing, 0.42, 150 + i * 46, 40 + (i % 2) * 32, i))}
          </>
        )}
    </svg>
  );
}

/** Owner icons for the second-miss model: one or several little owners beside the rule. */
export function OwnerIcons({ owner, many }: { owner: string; many: boolean }) {
  return (
    <svg className="wg-owner-icons" viewBox={many ? "0 0 150 50" : "0 0 50 50"} aria-hidden="true">
      {(many ? [0, 1, 2] : [0]).map((i) => at(owner, 0.5, i * 50, 0, i))}
    </svg>
  );
}

/** Prompt-pill icon: a leaf (word items) or a root (root items). Never shows an answer. */
export function GroveObject({ kind }: { kind: string }) {
  if (kind === "root") {
    return (
      <svg className="wg-icon" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M50 8 L50 52 M50 52 Q30 62 18 86 M50 52 Q52 74 46 94 M50 52 Q70 64 84 84" {...N} stroke={BARK_DEEP} strokeWidth={10} />
        <path d="M50 8 L50 52 M50 52 Q30 62 18 86 M50 52 Q52 74 46 94 M50 52 Q70 64 84 84" {...N} stroke={BARK} strokeWidth={5} />
        <circle cx="50" cy="12" r="9" fill={LEAF} {...T} />
      </svg>
    );
  }
  return <svg className="wg-icon" viewBox="0 0 100 100" aria-hidden="true"><LeafShape /></svg>;
}
export const NoBasket = () => <svg viewBox="0 0 10 10" aria-hidden="true" />;

/** Root Reader badge: an oak leaf with a word root carved along its vein, on a round bark badge. */
export function RootReaderBadge() {
  return (
    <svg className="sticker-svg" viewBox="0 0 200 200" role="img" aria-label="Root Reader badge: an oak leaf with a word root carved in its vein">
      <circle cx="100" cy="100" r="92" fill="#F5E6C8" stroke={INK} strokeWidth="7" />
      <circle cx="100" cy="100" r="76" fill="#E3F4D7" stroke={INK} strokeWidth="4" />
      <path
        d="M100 30 Q112 40 108 52 Q124 46 128 58 Q120 66 124 74 Q140 70 142 84 Q130 92 134 102 Q150 104 146 118 Q130 120 126 130 Q118 146 100 150 Q82 146 74 130 Q70 120 54 118 Q50 104 66 102 Q70 92 58 84 Q60 70 76 74 Q80 66 72 58 Q76 46 92 52 Q88 40 100 30 Z"
        fill={LEAF} stroke={INK} strokeWidth="5" strokeLinejoin="round"
      />
      <path d="M100 40 L100 170" stroke={LEAF_DEEP} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 150 Q92 162 84 170 M100 150 Q108 162 116 170" fill="none" stroke={BARK} strokeWidth="5" strokeLinecap="round" />
      <rect x="70" y="88" width="60" height="26" rx="10" fill="#FFF7E6" stroke={INK} strokeWidth="3.5" />
      <text x="100" y="107" textAnchor="middle" fontSize="18" fontWeight="900" fill={INK} fontFamily="inherit">root</text>
    </svg>
  );
}

/** Gloop's magnifying glass, held up in the story. */
export function Magnifier() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="wg-magnifier">
      <circle cx="40" cy="40" r="28" fill="#DFF7FF" fillOpacity="0.6" stroke={INK} strokeWidth="7" />
      <path d="M60 60 L88 88" stroke={BARK} strokeWidth="12" strokeLinecap="round" />
      <path d="M60 60 L88 88" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M26 30 Q30 20 40 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
