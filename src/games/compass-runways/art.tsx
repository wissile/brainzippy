import { INK } from "../../characters/palette";
import { type Strength, fmtRunway, norm, vec } from "./logic";

/**
 * Compass Rose Runways — original SVG art: a fictional airport (Sky School Airport) seen from above, a compass rose
 * painted on the ground, runways, windsocks, a generic high-wing trainer seen from above, a leaf for hints, the
 * control tower (story) and the Compass Rose Pin sticker. No brands, no real airport layout, no emoji.
 * Palette: Critter Crew ink + Ziggy's kit (sky-blue headset, orange windsock, gold) over airfield greens.
 * Board coordinates: viewBox -500..500, north up, headings clockwise (see `vec`).
 */
export const CR = {
  ink: INK,
  sky: "#4FB3E8",
  skyDeep: "#1F6FA8",
  sock: "#FF7A2F",
  gold: "#FFD43B",
  grass: "#8CC96B",
  grassDk: "#74B556",
  field: "#A3D47E",
  asphalt: "#4F5568",
  asphaltDk: "#3E4354",
  paint: "#FFFFFF",
  leaf: "#6BCB77",
} as const;

export const BOARD_VIEW = "-500 -500 1000 1000";
export const ROSE_R = 440;
export const RUNWAY_HALF = 280;

const rot = (h: number) => `rotate(${norm(h) % 360})`;
const pt = (h: number, r: number): [number, number] => {
  const [x, y] = vec(h);
  return [x * r, y * r];
};

// ---------------------------------------------------------------- screen background

/** Aerial farmland around the airport (quiet, low contrast). */
export function AirfieldBackground() {
  const patches: [number, number, number, number, string, number][] = [
    [-40, 40, 420, 300, "#9DD07A", -8], [360, -30, 380, 330, "#B5DB8C", 6], [760, 60, 420, 280, "#94C973", -4],
    [1180, -20, 460, 340, "#A9D584", 9], [-60, 380, 380, 320, "#B1D98A", 5], [300, 340, 460, 300, "#8FC56F", -7],
    [780, 380, 400, 300, "#BBDE95", 3], [1180, 360, 460, 320, "#98CC77", -5], [-40, 720, 460, 320, "#A0D37D", 8],
    [420, 700, 420, 340, "#B7DC90", -3], [840, 720, 420, 320, "#93C872", 6], [1240, 700, 400, 340, "#ADD887", -6],
  ];
  return (
    <svg className="scene-bg bg cr-bg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="1000" fill="#A6D683" />
      {patches.map(([x, y, w, h, c, r], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx="18" fill={c} transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`} />
      ))}
      {/* field furrows */}
      {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${380 + i * 26} 20 l60 300`} stroke="#9CCB78" strokeWidth="6" opacity="0.6" />)}
      {/* a country road and a stream */}
      <path d="M-20 610 C300 560 520 700 820 640 S1300 560 1620 620" fill="none" stroke="#E9DDBF" strokeWidth="26" />
      <path d="M-20 610 C300 560 520 700 820 640 S1300 560 1620 620" fill="none" stroke="#D8C9A2" strokeWidth="3" strokeDasharray="20 18" />
      <path d="M1120 -20 C1060 200 1180 330 1110 520 S1020 820 1080 1020" fill="none" stroke="#8ED0F0" strokeWidth="18" opacity="0.9" />
      {/* tree clumps */}
      {[[140, 300], [210, 330], [1450, 240], [1400, 270], [620, 900], [660, 930], [1300, 860], [90, 880], [980, 180]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y! + 6} r="24" fill="#5E9E45" opacity="0.5" /><circle cx={x} cy={y} r="22" fill="#6BAF4E" /></g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- compass rose

/** The giant compass rose painted on the airfield. `labels`: every 30° or every 10°. */
export function CompassRose({ labels = "thirty", glowHeadings = [], northGlow = false }: { labels?: "thirty" | "ten"; glowHeadings?: number[]; northGlow?: boolean }) {
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5);
  const lbl = labels === "ten" ? Array.from({ length: 36 }, (_, i) => (i + 1) * 10) : Array.from({ length: 12 }, (_, i) => (i + 1) * 30);
  const card: Record<number, string> = { 360: "N", 90: "E", 180: "S", 270: "W" };
  return (
    <g className="cr-rose">
      <circle r={ROSE_R + 14} fill="rgba(255,255,255,0.16)" />
      <circle r={ROSE_R} fill="none" stroke={CR.paint} strokeWidth="10" />
      <circle r={ROSE_R - 62} fill="none" stroke={CR.paint} strokeWidth="5" opacity="0.9" />
      {/* 8-point star in the middle */}
      <g opacity="0.55">
        {[0, 90, 180, 270].map((h) => <path key={h} d="M0 -170 L26 -26 L0 0 Z M0 -170 L-26 -26 L0 0 Z" fill={CR.paint} transform={rot(h)} />)}
        {[45, 135, 225, 315].map((h) => <path key={h} d="M0 -110 L16 -16 L0 0 L-16 -16 Z" fill={CR.paint} transform={rot(h)} />)}
      </g>
      {ticks.map((t) => {
        const major = t % 30 === 0;
        const mid = t % 10 === 0;
        if (!mid && !major && labels !== "ten") return null;
        const len = major ? 40 : mid ? 24 : 12;
        const [x1, y1] = pt(t, ROSE_R - 4);
        const [x2, y2] = pt(t, ROSE_R - 4 - len);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={major ? CR.ink : "rgba(43,33,64,0.65)"} strokeWidth={major ? 6 : 3.5} strokeLinecap="round" />;
      })}
      {glowHeadings.map((g) => {
        const [x1, y1] = pt(g, ROSE_R + 8);
        const [x2, y2] = pt(g, ROSE_R - 70);
        return <line key={`g${g}`} className="cr-tick-glow" x1={x1} y1={y1} x2={x2} y2={y2} stroke={CR.gold} strokeWidth="14" strokeLinecap="round" />;
      })}
      {lbl.map((h) => {
        const isCard = h in card;
        const [x, y] = pt(h, labels === "ten" ? ROSE_R - 92 : ROSE_R - 100);
        const thirty = h % 30 === 0;
        return (
          <text key={h} x={x} y={y} className={`cr-rose-label ${isCard ? "is-card" : ""} ${h === 360 && northGlow ? "is-glow" : ""}`} textAnchor="middle" dominantBaseline="central"
            fontSize={isCard ? 50 : labels === "ten" ? (thirty ? 26 : 19) : 30} fontWeight={isCard || thirty ? 800 : 700} fill={isCard ? (h === 360 ? "#C2410C" : CR.ink) : labels === "ten" && !thirty ? "rgba(43,33,64,0.8)" : CR.ink}
            stroke="rgba(255,255,255,0.85)" strokeWidth={isCard ? 8 : 6} paintOrder="stroke">
            {isCard ? card[h] : String(h).padStart(3, "0")}
          </text>
        );
      })}
      {northGlow && (
        <g className="cr-north-glow">
          <circle cx="0" cy={-(ROSE_R - 100)} r="44" fill="none" stroke={CR.gold} strokeWidth="10" />
          <text x="0" y={-(ROSE_R - 170)} textAnchor="middle" fontSize="30" fontWeight="800" fill={CR.ink} stroke="#fff" strokeWidth="7" paintOrder="stroke">360 = 0</text>
        </g>
      )}
    </g>
  );
}

/** A gold arc on the rose from heading `from`, `deg` degrees right (dir 1) or left (dir -1). `frac` draws part of it. */
export function TurnArc({ from, deg, dir, r = 300, frac = 1, arrow = true, className = "" }: { from: number; deg: number; dir: 1 | -1; r?: number; frac?: number; arrow?: boolean; className?: string }) {
  const sweep = deg * Math.max(0, Math.min(1, frac));
  const to = from + dir * sweep;
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  const large = sweep > 180 ? 1 : 0;
  const d = `M${x1} ${y1} A${r} ${r} 0 ${large} ${dir === 1 ? 1 : 0} ${x2} ${y2}`;
  // arrowhead tangent to the circle at the end
  const [tx, ty] = vec(to + dir * 90);
  const [nx, ny] = vec(to);
  const head = `M${x2 + tx * 26} ${y2 + ty * 26} L${x2 - nx * 22} ${y2 - ny * 22} L${x2 + nx * 22} ${y2 + ny * 22} Z`;
  return (
    <g className={`cr-arc ${className}`}>
      <path d={d} fill="none" stroke={CR.ink} strokeWidth="22" strokeLinecap="round" opacity="0.35" />
      <path d={d} fill="none" stroke={CR.gold} strokeWidth="14" strokeLinecap="round" />
      {arrow && sweep > 4 && <path d={head} fill={CR.gold} stroke={CR.ink} strokeWidth="4" strokeLinejoin="round" />}
    </g>
  );
}

// ---------------------------------------------------------------- runway

/**
 * A runway through the rose centre. `h` = landing heading of the "near" end: planes landing on it fly toward heading h,
 * so its number is painted at the opposite side (where they touch down). `near`/`far` = painted numbers (null = blank).
 */
export function RunwayArt({ h, near, far, arrow = false, nearClass = "", farClass = "", testId, ghost = false }: {
  h: number; near: number | null; far: number | null; arrow?: boolean; nearClass?: string; farClass?: string; testId?: string; ghost?: boolean;
}) {
  const L = RUNWAY_HALF;
  return (
    <g transform={rot(h)} className={`cr-runway ${ghost ? "is-ghost" : ""}`} data-testid={testId}>
      <rect x="-38" y={-L - 4} width="76" height={2 * L + 8} rx="8" fill={CR.ink} opacity="0.35" transform="translate(6 8)" />
      <rect x="-36" y={-L} width="72" height={2 * L} rx="6" fill={CR.asphalt} stroke={CR.ink} strokeWidth="5" />
      {/* centreline */}
      <line x1="0" y1={-L + 92} x2="0" y2={L - 92} stroke={CR.paint} strokeWidth="5" strokeDasharray="30 22" />
      {/* threshold "piano keys" at both ends */}
      {[-1, 1].map((e) => (
        <g key={e}>
          {[-26, -16, -6, 6, 16, 26].map((x) => <rect key={x} x={x - 3} y={e > 0 ? L - 30 : -L + 8} width="6" height="22" fill={CR.paint} />)}
        </g>
      ))}
      {/* painted numbers: near end (landing toward -y) reads upright from below */}
      <RunwayNumber n={near} y={L - 74} className={nearClass} />
      <g transform="rotate(180)"><RunwayNumber n={far} y={L - 74} className={farClass} /></g>
      {arrow && (
        <g className="cr-land-arrow">
          {[0, 1, 2].map((i) => <path key={i} d={`M-22 ${120 - i * 90} L0 ${92 - i * 90} L22 ${120 - i * 90}`} fill="none" stroke={CR.sky} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />)}
        </g>
      )}
    </g>
  );
}

function RunwayNumber({ n, y, className = "" }: { n: number | null; y: number; className?: string }) {
  if (n === null) return <rect className={`cr-blank ${className}`} x="-26" y={y - 26} width="52" height="44" rx="6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeDasharray="8 6" />;
  return (
    <text className={`cr-rwnum ${className}`} x="0" y={y} textAnchor="middle" dominantBaseline="central" fontSize="46" fontWeight="800" fill={CR.paint} letterSpacing="-1">
      {fmtRunway(n)}
    </text>
  );
}

// ---------------------------------------------------------------- windsocks

/** A windsock seen from above at (x, y), streaming toward heading `to`. */
export function SockTop({ to, strength, x = 0, y = 0, scale = 1, idle = false }: { to: number; strength: Strength; x?: number; y?: number; scale?: number; idle?: boolean }) {
  if (strength === 0) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} className="cr-sock is-limp" data-cr-idle={idle || undefined}>
        <circle r="34" fill="rgba(43,33,64,0.18)" />
        <path d="M-14 -6 Q-4 -22 10 -10 Q22 2 8 14 Q-8 22 -14 -6 Z" fill={CR.sock} stroke={CR.ink} strokeWidth="5" />
        <path d="M-6 -12 Q2 -2 -2 12" fill="none" stroke="#fff" strokeWidth="6" />
        <circle r="9" fill={CR.ink} />
      </g>
    );
  }
  const len = strength === 2 ? 190 : 120;
  const droop = strength === 2 ? 0 : 0.5;
  const tipW = strength === 2 ? 15 : 12;
  const bands = 5;
  const pts = (i: number) => {
    const f = i / bands;
    return { y: -f * len, w: 26 - (26 - tipW) * f - droop * f * 6 };
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} data-cr-idle={idle || undefined}>
      <g transform={rot(to)} className={`cr-sock ${strength === 2 ? "is-full" : "is-half"}`}>
        <path d={`M-30 6 L${-tipW - 4} ${-len - 6} L${tipW + 4} ${-len - 6} L30 6 Z`} fill="rgba(43,33,64,0.18)" transform="translate(8 10)" />
        <g className="cr-sock-body">
          {Array.from({ length: bands }, (_, i) => {
            const a = pts(i), b = pts(i + 1);
            return <path key={i} d={`M${-a.w} ${a.y} L${-b.w} ${b.y} L${b.w} ${b.y} L${a.w} ${a.y} Z`} fill={i % 2 === 0 ? CR.sock : "#fff"} />;
          })}
          <path d={`M-26 0 L${-tipW} ${-len} L${tipW} ${-len} L26 0 Z`} fill="none" stroke={CR.ink} strokeWidth="5" strokeLinejoin="round" />
          <ellipse cx="0" cy="0" rx="27" ry="8" fill="#FFB27A" stroke={CR.ink} strokeWidth="5" />
        </g>
        <circle r="9" fill={CR.ink} />
      </g>
    </g>
  );
}

/** A windsock seen from the side (strength items): limp, half filled or straight out. */
export function SockSide({ strength, flip = false }: { strength: Strength; flip?: boolean }) {
  const angle = [76, 34, 4][strength]!; // degrees below horizontal
  const len = 300;
  const bands = 5;
  return (
    <g className="cr-sock-side" transform={flip ? "scale(-1 1)" : undefined} data-cr-idle="true">
      {/* ground */}
      <ellipse cx="0" cy="330" rx="420" ry="60" fill={CR.grassDk} opacity="0.55" />
      <ellipse cx="-60" cy="332" rx="90" ry="20" fill={CR.ink} opacity="0.2" />
      {/* pole */}
      <rect x="-74" y="-250" width="18" height="580" rx="9" fill="#E7EBF2" stroke={CR.ink} strokeWidth="6" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x="-74" y={-180 + i * 120} width="18" height="30" fill="#E5484D" stroke={CR.ink} strokeWidth="4" />)}
      <circle cx="-65" cy="-258" r="14" fill={CR.gold} stroke={CR.ink} strokeWidth="5" />
      {/* the sock */}
      <g transform={`translate(-58 -220) rotate(${angle})`} className={`cr-sock-side-body s${strength}`}>
        {Array.from({ length: bands }, (_, i) => {
          const f0 = i / bands, f1 = (i + 1) / bands;
          const w0 = 46 - 26 * f0, w1 = 46 - 26 * f1;
          const sag = strength === 0 ? 10 : 0;
          return <path key={i} d={`M${f0 * len} ${-w0} Q${(f0 + f1) * len / 2} ${-w0 + sag} ${f1 * len} ${-w1} L${f1 * len} ${w1} Q${(f0 + f1) * len / 2} ${w0 + sag} ${f0 * len} ${w0} Z`} fill={i % 2 === 0 ? CR.sock : "#fff"} stroke={CR.ink} strokeWidth="5" strokeLinejoin="round" />;
        })}
        <ellipse cx="0" cy="0" rx="12" ry="46" fill="#FFB27A" stroke={CR.ink} strokeWidth="5" />
      </g>
      {/* wind streaks: none when calm */}
      {strength > 0 && [0, 1, 2].slice(0, strength === 2 ? 3 : 1).map((i) => (
        <path key={i} className="cr-streak" style={{ "--i": i } as React.CSSProperties} d={`M-380 ${-150 + i * 90} q60 -18 120 0 t120 0`} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.85" />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- plane, leaf, wind streaks

/** A generic high-wing trainer seen from above, nose toward -y (rotate it to a heading). Original, no livery. */
export function PlaneTop({ h = 360, x = 0, y = 0, scale = 1, ghost = false, className = "", testId }: { h?: number; x?: number; y?: number; scale?: number; ghost?: boolean; className?: string; testId?: string }) {
  return (
    <g transform={`translate(${x} ${y}) ${rot(h)} scale(${scale})`} className={`cr-plane ${ghost ? "is-ghost" : ""} ${className}`} data-testid={testId}>
      <g transform="translate(10 14)" opacity={ghost ? 0 : 0.22}>
        <path d="M-96 -18 H96 V6 H-96 Z M-8 -70 H8 V70 H-8 Z M-36 50 H36 V62 H-36 Z" fill={CR.ink} />
      </g>
      {/* tailplane */}
      <path d="M-38 48 Q-38 42 -32 42 H32 Q38 42 38 48 V58 Q38 62 32 62 H-32 Q-38 62 -38 58 Z" fill="#fff" stroke={CR.ink} strokeWidth="5" />
      {/* fuselage */}
      <path d="M0 -76 C12 -76 15 -56 15 -40 L11 60 Q10 70 0 72 Q-10 70 -11 60 L-15 -40 C-15 -56 -12 -76 0 -76 Z" fill="#fff" stroke={CR.ink} strokeWidth="5" />
      <path d="M0 -40 V60" stroke={CR.sky} strokeWidth="6" />
      {/* high wing (covers the cabin) */}
      <path d="M-100 -26 Q-104 -26 -104 -20 V2 Q-104 8 -98 8 H98 Q104 8 104 2 V-20 Q104 -26 98 -26 Z" fill="#fff" stroke={CR.ink} strokeWidth="5" />
      <path d="M-104 -20 V2 Q-104 8 -98 8 H-78 V-26 H-98 Q-104 -26 -104 -20 Z M104 -20 V2 Q104 8 98 8 H78 V-26 H98 Q104 -26 104 -20 Z" fill={CR.sky} stroke={CR.ink} strokeWidth="4" />
      {/* fin seen from above + propeller */}
      <path d="M0 40 V70" stroke={CR.ink} strokeWidth="7" strokeLinecap="round" />
      <path d="M-22 -80 H22" stroke={CR.ink} strokeWidth="6" strokeLinecap="round" />
      <circle cx="0" cy="-78" r="6" fill={CR.gold} stroke={CR.ink} strokeWidth="3" />
    </g>
  );
}

export function Leaf({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <g className={`cr-leaf ${className}`} style={style}>
      <path d="M-22 0 C-12 -18 14 -18 24 0 C14 18 -12 18 -22 0 Z" fill={CR.leaf} stroke={CR.ink} strokeWidth="4" />
      <path d="M-22 0 H20" stroke={CR.ink} strokeWidth="3" />
    </g>
  );
}

/** Dashed streaks across the field showing the wind flowing FROM `from` (with arrowheads). */
export function WindStreaks({ from, still = false }: { from: number; still?: boolean }) {
  const to = norm(from + 180);
  return (
    <g transform={rot(to)} className={`cr-wind ${still ? "is-still" : ""}`} aria-hidden="true">
      {[-300, -100, 100, 300].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? 40 : -40})`}>
          <line x1="0" y1="200" x2="0" y2="-180" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray="34 30" className="cr-wind-line" opacity="0.8" />
          <path d="M-16 -170 L0 -200 L16 -170" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

/** Field decor outside the rose: a little apron, hangar and tower top-down in the corners (fictional layout). */
export function FieldDecor() {
  return (
    <g className="cr-decor" aria-hidden="true">
      <rect x="-500" y="-500" width="1000" height="1000" fill={CR.grass} />
      {[[-430, -430], [430, -430], [-430, 430], [430, 430]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="70" fill={CR.grassDk} opacity="0.55" />)}
      {/* apron + hangar (bottom right) */}
      <rect x="330" y="360" width="190" height="160" rx="10" fill="#C9CED8" stroke={CR.ink} strokeWidth="4" />
      <rect x="370" y="410" width="120" height="70" rx="6" fill="#E9EDF3" stroke={CR.ink} strokeWidth="4" />
      <path d="M370 445 H490" stroke={CR.ink} strokeWidth="3" opacity="0.5" />
      {/* tower from above (top left) */}
      <rect x="-490" y="-490" width="150" height="130" rx="10" fill="#C9CED8" stroke={CR.ink} strokeWidth="4" />
      <circle cx="-415" cy="-425" r="34" fill="#E9EDF3" stroke={CR.ink} strokeWidth="5" />
      <circle cx="-415" cy="-425" r="18" fill={CR.sky} stroke={CR.ink} strokeWidth="4" />
    </g>
  );
}

// ---------------------------------------------------------------- story + prompt icons + sticker

/** Control tower, side view (story). */
export function TowerArt() {
  return (
    <svg viewBox="0 0 200 320" className="cr-tower" aria-hidden="true">
      <path d="M78 300 L86 120 H114 L122 300 Z" fill="#E9EDF3" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {[160, 200, 240].map((y) => <rect key={y} x="92" y={y} width="16" height="18" rx="3" fill={CR.sky} stroke={INK} strokeWidth="3" />)}
      <path d="M40 120 H160 L148 70 H52 Z" fill="#9FD8F5" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {[70, 100, 130].map((x) => <path key={x} d={`M${x} 72 L${x - 4} 118`} stroke={INK} strokeWidth="4" />)}
      <rect x="44" y="58" width="112" height="14" rx="5" fill="#C9CED8" stroke={INK} strokeWidth="5" />
      <path d="M100 58 V24" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M100 24 L132 30 L100 38 Z" fill={CR.sock} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="20" y="296" width="160" height="14" rx="7" fill={CR.grassDk} />
    </svg>
  );
}

/** Small storm cloud (story intro). */
export function StormCloud({ dark = true }: { dark?: boolean }) {
  return (
    <svg viewBox="0 0 220 120" className="cr-cloud" aria-hidden="true">
      <path d="M40 100 Q8 100 10 74 Q12 50 40 50 Q48 18 84 20 Q112 4 136 26 Q170 18 182 48 Q214 52 210 80 Q206 102 178 100 Z" fill={dark ? "#8C93A8" : "#fff"} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {dark && <path d="M98 100 L86 118 L100 116 L92 132" fill="none" stroke={CR.gold} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** The airport from above for the story: blank or painted runway ends. */
export function AirportStory({ painted = false, planes = 0, sock = 2 }: { painted?: boolean; planes?: number; sock?: Strength }) {
  return (
    <svg viewBox={BOARD_VIEW} className="cr-story-airport" aria-hidden="true">
      <FieldDecor />
      <CompassRose />
      <RunwayArt h={270} near={painted ? 27 : null} far={painted ? 9 : null} />
      <RunwayArt h={360} near={painted ? 36 : null} far={painted ? 18 : null} />
      <SockTop to={90} strength={sock} x={250} y={-250} scale={0.7} />
      {planes > 0 && <PlaneTop h={270} x={420} y={-40} scale={0.7} />}
      {planes > 1 && <PlaneTop h={360} x={-60} y={420} scale={0.6} />}
      {planes > 2 && <PlaneTop h={225} x={380} y={-380} scale={0.55} />}
    </svg>
  );
}

export function CompassObject({ kind }: { kind: string }) {
  const body = (() => {
    switch (kind) {
      case "windsock":
        return (<g transform="translate(14 8)"><rect x="0" y="0" width="6" height="52" rx="3" fill="#E7EBF2" stroke={INK} strokeWidth="3" /><path d="M6 6 L44 12 L44 22 L6 28 Z" fill={CR.sock} stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M20 8 V26 M32 10 V24" stroke="#fff" strokeWidth="5" /></g>);
      case "runway":
        return (<g transform="rotate(35 32 32)"><rect x="22" y="4" width="20" height="56" rx="3" fill={CR.asphalt} stroke={INK} strokeWidth="3" /><path d="M32 14 V50" stroke="#fff" strokeWidth="3" strokeDasharray="6 5" /></g>);
      case "dial":
        return (<g><circle cx="32" cy="32" r="26" fill="#fff" stroke={INK} strokeWidth="3" /><rect x="28" y="10" width="8" height="44" rx="2" fill={CR.asphalt} transform="rotate(40 32 32)" /><path d="M32 6 l4 6 h-8 z" fill="#C2410C" /></g>);
      case "plane":
        return (<g transform="translate(32 32) scale(0.28)"><PlaneTop h={45} /></g>);
      case "tower":
      default:
        return (<g><rect x="26" y="26" width="12" height="32" fill="#E9EDF3" stroke={INK} strokeWidth="3" /><path d="M14 26 H50 L46 12 H18 Z" fill="#9FD8F5" stroke={INK} strokeWidth="3" strokeLinejoin="round" /><path d="M46 36 q6 4 0 10 M52 32 q10 8 0 18" fill="none" stroke={CR.skyDeep} strokeWidth="3" strokeLinecap="round" /></g>);
    }
  })();
  return <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">{body}</svg>;
}

/** Sticker: the Compass Rose Pin — a round pin with a compass rose, a runway and Ziggy's little orange windsock. */
export function CompassRosePin() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art cr-pin" role="img" aria-label="Compass Rose Pin sticker: a round gold pin with a compass rose, a runway and a little orange windsock">
      <circle cx="120" cy="124" r="104" fill={INK} opacity="0.2" />
      <circle cx="120" cy="116" r="104" fill={CR.gold} stroke={INK} strokeWidth="7" />
      <circle cx="120" cy="116" r="86" fill={CR.sky} stroke={INK} strokeWidth="5" />
      <circle cx="120" cy="116" r="70" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="3 8.2" />
      <g transform="translate(120 116)">
        {[0, 90, 180, 270].map((h) => <path key={h} d="M0 -66 L12 -12 L0 0 Z M0 -66 L-12 -12 L0 0 Z" fill={h === 0 ? "#fff" : "#E3F3FC"} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" transform={`rotate(${h})`} />)}
        <g transform="rotate(-50)">
          <rect x="-11" y="-58" width="22" height="116" rx="4" fill={CR.asphalt} stroke={INK} strokeWidth="4" />
          <path d="M0 -40 V40" stroke="#fff" strokeWidth="3" strokeDasharray="9 7" />
        </g>
        <text x="0" y="-74" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" stroke={INK} strokeWidth="4" paintOrder="stroke">N</text>
      </g>
      <g transform="translate(168 58)">
        <path d="M0 0 V40" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M2 2 L34 8 L34 18 L2 22 Z" fill={CR.sock} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M14 4 V20 M25 6 V18" stroke="#fff" strokeWidth="4" />
      </g>
      <path d="M58 70 a76 76 0 0 1 40 -44" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export const NoBasket = () => <span aria-hidden="true" />;
