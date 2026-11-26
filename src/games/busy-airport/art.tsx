import { useId } from "react";
import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import type { Colour, Signal, Tag } from "./generator";

/**
 * Original art for Ziggy's Busy Airport. Critter Crew style: ink outlines, flat bright fills, soft highlights.
 * Planes are original, generic cartoon airliners (no real manufacturer shape, registration or livery).
 * Colour is never the only cue: every bag colour has its own texture (red stripes, blue dots, yellow
 * diagonals, green checks) and every runway light colour its own lamp shape (red circle, blue square,
 * yellow star, green triangle). Tag emblems are ink on white, readable without colour.
 */
export const BA = {
  sky: "#8FD3FF",
  skyTop: "#5DB8F5",
  grass: "#86D67F",
  grassDark: "#5DB25A",
  tarmac: "#5A5670",
  tarmacDark: "#47435B",
  line: "#FFD43B",
  cream: "#FFF6E6",
  white: "#FFFFFF",
  steel: "#C9D3E3",
  steelDark: "#8C98AE",
  vest: "#FF8A2B",
  wand: "#FF6A1A",
  wandGlow: "#FFC56B",
} as const;
export const FILL: Record<Colour, string> = { red: "#F2545B", blue: "#4D96FF", yellow: "#FFD43B", green: "#5BC46A" };
export const DEEP: Record<Colour, string> = { red: "#B8323A", blue: "#2F6BC4", yellow: "#C99A00", green: "#3A9248" };
const isColour = (c: string): c is Colour => c in FILL;

// ---------------------------------------------------------------- tag emblems (ink on white)

/** An emblem centred on (0,0) with radius ~r. */
export function Emblem({ tag, r = 10, fill = INK }: { tag: Tag | string; r?: number; fill?: string }) {
  switch (tag) {
    case "circle":
      return <circle r={r * 0.8} fill={fill} />;
    case "triangle":
      return <path d={`M0 ${-r} L${r * 0.95} ${r * 0.72} L${-r * 0.95} ${r * 0.72} Z`} fill={fill} strokeLinejoin="round" />;
    case "heart":
      return <path d={`M0 ${r * 0.85} C${-r * 1.25} ${-r * 0.05} ${-r * 0.6} ${-r * 1.05} 0 ${-r * 0.35} C${r * 0.6} ${-r * 1.05} ${r * 1.25} ${-r * 0.05} 0 ${r * 0.85} Z`} fill={fill} />;
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r * 1.05 : r * 0.45;
        return `${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
      });
      return <path d={`M${pts.join("L")}Z`} fill={fill} strokeLinejoin="round" />;
    }
    default:
      return null;
  }
}

/** Texture lines for a colour (white, low opacity), drawn inside a clip. */
function Texture({ colour, w, h }: { colour: Colour; w: number; h: number }) {
  const s = "rgba(255,255,255,0.55)";
  if (colour === "red") return <g>{Array.from({ length: Math.ceil(h / 12) }, (_, i) => <rect key={i} x={0} y={i * 12 + 4} width={w} height={4} fill={s} />)}</g>;
  if (colour === "blue")
    return (
      <g>
        {Array.from({ length: Math.ceil(h / 12) }, (_, r) =>
          Array.from({ length: Math.ceil(w / 12) }, (_, c) => <circle key={`${r}-${c}`} cx={c * 12 + (r % 2 ? 10 : 4)} cy={r * 12 + 6} r={2.6} fill={s} />),
        )}
      </g>
    );
  if (colour === "yellow") return <g>{Array.from({ length: Math.ceil((w + h) / 14) }, (_, i) => <path key={i} d={`M${i * 14 - h} ${h} L${i * 14} 0`} stroke="rgba(255,255,255,0.7)" strokeWidth={4} />)}</g>;
  return (
    <g>
      {Array.from({ length: Math.ceil(h / 10) }, (_, r) =>
        Array.from({ length: Math.ceil(w / 10) }, (_, c) => ((r + c) % 2 ? <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width={10} height={10} fill="rgba(255,255,255,0.4)" /> : null)),
      )}
    </g>
  );
}

// ---------------------------------------------------------------- suitcase

export function Bag({ colour, tag, className = "" }: { colour: Colour | string; tag: Tag | string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const c = isColour(colour) ? colour : "blue";
  return (
    <svg viewBox="0 0 100 100" className={`ba-bag-art ${className}`} aria-hidden="true" overflow="visible">
      <defs>
        <clipPath id={`bag-${id}`}><rect x="12" y="30" width="72" height="56" rx="12" /></clipPath>
      </defs>
      {/* handle */}
      <path d="M36 31 V20 Q36 13 43 13 H53 Q60 13 60 20 V31" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M36 31 V20 Q36 13 43 13 H53 Q60 13 60 20 V31" fill="none" stroke={BA.steelDark} strokeWidth="2.5" strokeLinecap="round" />
      {/* wheels */}
      <circle cx="26" cy="90" r="5.5" fill={INK} />
      <circle cx="70" cy="90" r="5.5" fill={INK} />
      {/* body */}
      <rect x="12" y="30" width="72" height="56" rx="12" fill={FILL[c]} />
      <g clipPath={`url(#bag-${id})`}>
        <Texture colour={c} w={100} h={100} />
        <rect x="12" y="74" width="72" height="12" fill={DEEP[c]} opacity="0.35" />
      </g>
      {/* straps */}
      <rect x="30" y="30" width="7" height="56" fill={DEEP[c]} opacity="0.8" />
      <rect x="59" y="30" width="7" height="56" fill={DEEP[c]} opacity="0.8" />
      <rect x="12" y="30" width="72" height="56" rx="12" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M20 40 Q21 35 27 35" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="3.5" strokeLinecap="round" />
      {/* luggage tag with the emblem */}
      {tag !== "none" && (
        <g className="ba-tag">
          <path d="M60 22 Q74 22 78 34" fill="none" stroke={INK} strokeWidth="2.5" />
          <rect x="66" y="32" width="30" height="30" rx="7" fill="#fff" stroke={INK} strokeWidth="4" transform="rotate(8 81 47)" />
          <g transform="translate(81 48) rotate(8)"><Emblem tag={tag} r={9} /></g>
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- side-view plane (Bag Drop targets, story)

/** A chubby original airliner, nose to the right. `colour` paints tail, wing and stripe ("white" = neutral). */
export function Plane({ colour, tag, className = "", door = false, windows = true }: { colour: Colour | "white" | string; tag: Tag | "none" | string; className?: string; door?: boolean; windows?: boolean }) {
  const id = useId().replace(/:/g, "");
  const c = isColour(colour) ? colour : null;
  const main = c ? FILL[c] : BA.steel;
  const deep = c ? DEEP[c] : BA.steelDark;
  return (
    <svg viewBox="0 0 220 120" className={`ba-plane-art ${className}`} aria-hidden="true" overflow="visible">
      <defs>
        <clipPath id={`tail-${id}`}><path d="M22 60 L14 14 Q14 8 21 8 L42 8 Q48 8 52 14 L80 54 Z" /></clipPath>
      </defs>
      {/* far wing */}
      <path d="M96 52 L118 30 L134 30 L126 52 Z" fill={deep} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* tail fin */}
      <path d="M22 60 L14 14 Q14 8 21 8 L42 8 Q48 8 52 14 L80 54 Z" fill={main} />
      {c && <g clipPath={`url(#tail-${id})`}><Texture colour={c} w={90} h={70} /></g>}
      <path d="M22 60 L14 14 Q14 8 21 8 L42 8 Q48 8 52 14 L80 54 Z" fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {tag !== "none" && (
        <g>
          <circle cx="36" cy="30" r="15" fill="#fff" stroke={INK} strokeWidth="4" />
          <g transform="translate(36 31)"><Emblem tag={tag} r={10} /></g>
        </g>
      )}
      {/* fuselage */}
      <path d="M16 70 C16 54 34 48 62 48 L170 48 C192 48 208 58 212 72 C208 86 192 94 170 94 L50 94 C28 94 16 84 16 70 Z" fill={BA.white} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 80 C40 86 60 88 90 88 L196 88 C190 92 182 94 170 94 L50 94 C36 94 26 89 22 80 Z" fill={main} opacity="0.9" />
      <path d="M36 56 C60 52 120 52 170 53" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="4" strokeLinecap="round" />
      {/* cockpit window */}
      <path d="M180 58 Q196 60 204 68 L186 68 Q180 66 180 58 Z" fill="#9FDBFF" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {windows && [72, 92, 112, 132, 152].map((x) => <circle key={x} cx={x} cy="66" r="5.5" fill="#9FDBFF" stroke={INK} strokeWidth="3" />)}
      {door && <rect x="48" y="56" width="16" height="30" rx="5" fill={BA.tarmacDark} stroke={INK} strokeWidth="3" />}
      {/* near wing + engine */}
      <path d="M92 76 L140 76 L118 112 Q116 116 110 116 L100 116 Q96 116 98 110 Z" fill={main} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <rect x="104" y="92" width="34" height="16" rx="8" fill={BA.steel} stroke={INK} strokeWidth="4" />
      <ellipse cx="138" cy="100" rx="4" ry="7" fill={INK} />
    </svg>
  );
}

/** The big All Aboard plane (two rows of five windows = a ten-frame), door and steps at the back. */
export function JumboPlane({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" className={`ba-jumbo-art ${className}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet" overflow="visible">
      {/* far wing */}
      <path d="M210 92 L250 52 L280 52 L262 92 Z" fill="#3B7FE0" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {/* tail */}
      <path d="M40 112 L26 26 Q26 16 36 16 L66 16 Q74 16 80 24 L130 96 Z" fill="#4D96FF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M38 34 L70 34" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      {/* fuselage with upper-deck hump */}
      <path d="M24 128 C24 98 50 86 92 86 L250 86 C270 60 312 56 346 72 C376 86 392 108 394 134 C390 160 368 176 336 176 L84 176 C48 176 24 160 24 128 Z" fill="#fff" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M30 150 C52 164 80 166 120 166 L386 152 C380 168 362 176 336 176 L84 176 C58 176 40 166 30 150 Z" fill="#4D96FF" />
      <path d="M60 98 C120 92 220 92 262 92" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      {/* cockpit */}
      <path d="M344 86 Q370 92 382 108 L352 108 Q344 102 344 86 Z" fill="#9FDBFF" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {/* door at the back */}
      <rect x="86" y="100" width="30" height="58" rx="9" fill={BA.tarmacDark} stroke={INK} strokeWidth="4.5" />
      <rect x="92" y="106" width="18" height="16" rx="4" fill="#9FDBFF" opacity="0.8" />
      {/* steps down to the tarmac */}
      <path d="M84 158 L118 158 L84 200 L44 200 Z" fill={BA.steel} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${80 - i * 9} ${166 + i * 9} L${112 - i * 9} ${166 + i * 9}`} stroke={INK} strokeWidth="3" />)}
      {/* near wing + engines */}
      <path d="M184 154 L262 154 L230 198 L204 198 Z" fill="#4D96FF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="206" y="170" width="46" height="20" rx="10" fill={BA.steel} stroke={INK} strokeWidth="4.5" />
    </svg>
  );
}

// ---------------------------------------------------------------- passengers (Critter Crew)

const CREW = [Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff] as const;
export const CREW_NAMES = ["Bobbo", "Zuzu", "Gloop", "Hoot", "Rumble", "Puff"] as const;
export function Passenger({ who, state = "idle" }: { who: number; state?: MascotState }) {
  const C = CREW[((who % 6) + 6) % 6]!;
  return <C state={state} size="100%" />;
}

// ---------------------------------------------------------------- runway lamps

const LAMP: Record<Colour, (r: number) => React.ReactNode> = {
  red: (r) => <circle r={r} />,
  blue: (r) => <rect x={-r * 0.9} y={-r * 0.9} width={r * 1.8} height={r * 1.8} rx={r * 0.25} />,
  yellow: (r) => <Emblem tag="star" r={r * 1.18} fill="currentColor" />,
  green: (r) => <path d={`M0 ${-r * 1.1} L${r * 1.05} ${r * 0.8} L${-r * 1.05} ${r * 0.8} Z`} strokeLinejoin="round" />,
};
export const LAMP_SHAPE: Record<Colour, string> = { red: "circle", blue: "square", yellow: "star", green: "triangle" };

/** A runway light (lens shape per colour). `lit` adds the glow halo. */
export function Lamp({ colour, lit = true }: { colour: Colour | string; lit?: boolean }) {
  const c = isColour(colour) ? colour : "red";
  return (
    <svg viewBox="-30 -30 60 60" className="ba-lamp-art" aria-hidden="true" overflow="visible">
      {lit && <circle className="ba-halo" r="27" fill={FILL[c]} opacity="0.35" />}
      <rect x="-16" y="12" width="32" height="12" rx="4" fill={BA.tarmacDark} stroke={INK} strokeWidth="3" />
      <g fill={FILL[c]} stroke={INK} strokeWidth="3.5" style={{ color: FILL[c] }}>{LAMP[c](15)}</g>
      <circle cx="-5" cy="-6" r="3.2" fill="#fff" opacity="0.85" />
    </svg>
  );
}
export function EmptySocket() {
  return (
    <svg viewBox="-30 -30 60 60" className="ba-lamp-art" aria-hidden="true">
      <rect x="-16" y="12" width="32" height="12" rx="4" fill={BA.tarmacDark} stroke={INK} strokeWidth="3" />
      <circle r="16" fill="rgba(255,255,255,0.18)" stroke="#fff" strokeWidth="3.5" strokeDasharray="6 5" />
      <text y="7" textAnchor="middle" className="ba-q" fill="#fff">?</text>
    </svg>
  );
}

// ---------------------------------------------------------------- marshaller

/** Arm angles (degrees, clockwise from pointing straight down) for the viewer's-left and viewer's-right arm. */
interface ArmPose { upper: number; fore: number; wave?: number }
const POSES: Record<Signal, { l: ArmPose; r: ArmPose }> = {
  // the marshaller faces the pilot: their right arm (on our left) points to the pilot's left
  left: { l: { upper: 90, fore: 0 }, r: { upper: -90, fore: -90, wave: -45 } },
  right: { l: { upper: 90, fore: 90, wave: 45 }, r: { upper: -90, fore: 0 } },
  ahead: { l: { upper: 90, fore: 90, wave: 45 }, r: { upper: -90, fore: -90, wave: -45 } },
  stop: { l: { upper: 172, fore: 43 }, r: { upper: -172, fore: -43 } },
  slow: { l: { upper: 28, fore: 30, wave: 35 }, r: { upper: -28, fore: -30, wave: -35 } },
};

function Arm({ x, pose, still }: { x: number; pose: ArmPose; still: boolean }) {
  return (
    <g transform={`translate(${x} 74) rotate(${pose.upper})`}>
      <line x1="0" y1="0" x2="0" y2="24" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <line x1="0" y1="0" x2="0" y2="24" stroke={BA.vest} strokeWidth="7" strokeLinecap="round" />
      <g transform={`translate(0 24) rotate(${pose.fore})`}>
        <g className={`ba-fore ${pose.wave && !still ? "is-waving" : ""}`} style={{ "--w": `${pose.wave ?? 0}deg` } as React.CSSProperties}>
          <line x1="0" y1="0" x2="0" y2="20" stroke={INK} strokeWidth="12" strokeLinecap="round" />
          <line x1="0" y1="0" x2="0" y2="20" stroke="#E9B98F" strokeWidth="6.5" strokeLinecap="round" />
          <rect x="-6" y="20" width="12" height="44" rx="6" fill={BA.wand} stroke={INK} strokeWidth="3.5" />
          <rect x="-2.5" y="25" width="5" height="32" rx="2.5" fill={BA.wandGlow} />
        </g>
      </g>
    </g>
  );
}

/** The marshaller (ground crew in a hi-vis vest and ear defenders), showing one signal. Body in 0..200; arms reach −10..210. */
export function Marshaller({ signal, still = false, className = "" }: { signal: Signal | null; still?: boolean; className?: string }) {
  const pose = signal ? POSES[signal] : { l: { upper: 10, fore: 0 }, r: { upper: -10, fore: 0 } };
  return (
    <svg viewBox="-24 -14 248 214" className={`ba-marshaller ${className}`} aria-hidden="true" overflow="visible" data-signal={signal ?? "none"}>
      <ellipse cx="100" cy="192" rx="40" ry="7" fill={INK} opacity="0.18" />
      {/* legs */}
      <rect x="80" y="140" width="15" height="48" rx="7" fill="#4A4F63" stroke={INK} strokeWidth="4" />
      <rect x="105" y="140" width="15" height="48" rx="7" fill="#4A4F63" stroke={INK} strokeWidth="4" />
      <ellipse cx="86" cy="188" rx="12" ry="6" fill={INK} />
      <ellipse cx="114" cy="188" rx="12" ry="6" fill={INK} />
      {/* body + hi-vis vest */}
      <path d="M66 82 Q66 66 82 66 L118 66 Q134 66 134 82 L134 140 Q134 150 124 150 L76 150 Q66 150 66 140 Z" fill={BA.vest} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M68 108 H132 M68 124 H132" stroke="#E8EEF6" strokeWidth="6" />
      <path d="M92 66 L100 92 L108 66" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {/* head */}
      <circle cx="100" cy="40" r="26" fill="#E9B98F" stroke={INK} strokeWidth="5" />
      <path d="M76 34 Q80 12 100 12 Q120 12 124 34 Q112 24 100 24 Q88 24 76 34 Z" fill="#5A3B2A" />
      {/* ear defenders */}
      <path d="M72 38 Q72 6 100 6 Q128 6 128 38" fill="none" stroke={INK} strokeWidth="6" />
      <rect x="66" y="32" width="14" height="22" rx="6" fill="#4FB3E8" stroke={INK} strokeWidth="4" />
      <rect x="120" y="32" width="14" height="22" rx="6" fill="#4FB3E8" stroke={INK} strokeWidth="4" />
      <circle cx="91" cy="42" r="3.6" fill={INK} />
      <circle cx="109" cy="42" r="3.6" fill={INK} />
      <path d="M92 52 Q100 58 108 52" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="84" cy="50" r="4" fill="#FF8FB1" opacity="0.6" />
      <circle cx="116" cy="50" r="4" fill="#FF8FB1" opacity="0.6" />
      {/* arms last: raised wands (stop) stay visible above the head */}
      <Arm x={70} pose={pose.l} still={still} />
      <Arm x={130} pose={pose.r} still={still} />
    </svg>
  );
}

/** A small plane seen from behind (the child follows it on the taxiway). viewBox 160 × 90. */
export function PlaneBehind({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={`ba-behind ${className}`} aria-hidden="true" overflow="visible">
      <ellipse cx="80" cy="84" rx="62" ry="5" fill={INK} opacity="0.2" />
      <path d="M6 52 L154 52 Q158 52 156 57 L104 62 L56 62 L4 57 Q2 52 6 52 Z" fill={FILL.red} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <rect x="34" y="58" width="20" height="16" rx="8" fill={BA.steel} stroke={INK} strokeWidth="3.5" />
      <rect x="106" y="58" width="20" height="16" rx="8" fill={BA.steel} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="80" cy="56" rx="22" ry="22" fill="#fff" stroke={INK} strokeWidth="4.5" />
      <path d="M62 30 L74 4 Q76 0 80 0 Q84 0 86 4 L98 30 Z" fill={FILL.red} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 36 L110 36 Q114 36 112 40 L48 40 Q46 36 50 36 Z" fill={FILL.red} stroke={INK} strokeWidth="3.5" />
      <circle cx="80" cy="60" r="7" fill={BA.steelDark} stroke={INK} strokeWidth="3" />
      <rect x="76" y="76" width="8" height="10" rx="3" fill={INK} />
    </svg>
  );
}

/** Two crossed wands (prompt icon for the Marshaller game). */
export function Wands() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <g transform="rotate(-35 30 30)"><rect x="25" y="4" width="10" height="52" rx="5" fill={BA.wand} stroke={INK} strokeWidth="3.5" /><rect x="28" y="8" width="4" height="30" rx="2" fill={BA.wandGlow} /></g>
      <g transform="rotate(35 30 30)"><rect x="25" y="4" width="10" height="52" rx="5" fill={BA.wand} stroke={INK} strokeWidth="3.5" /><rect x="28" y="8" width="4" height="30" rx="2" fill={BA.wandGlow} /></g>
    </svg>
  );
}

// ---------------------------------------------------------------- background

function Cloud({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} className="cloud">
      <path d="M-90 30 Q-100 -6 -60 -10 Q-50 -48 -6 -40 Q20 -66 56 -40 Q100 -44 100 -6 Q124 6 104 30 Z" fill="#fff" />
    </g>
  );
}

/** Ziggy's airport on holiday morning: terminal, control tower, windsock, parked planes and the runway. */
export function AirportBackground() {
  return (
    <svg className="scene-bg bg ba-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ba-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BA.skyTop} /><stop offset="0.65" stopColor="#B4E3FF" /><stop offset="1" stopColor="#EAF8FF" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ba-sky)" />
      <circle cx="1380" cy="140" r="60" fill="#FFE27A" />
      <circle cx="1380" cy="140" r="96" fill="#FFE27A" opacity="0.25" />
      <Cloud x={240} y={150} s={1.1} />
      <Cloud x={800} y={100} s={0.75} o={0.9} />
      <Cloud x={1130} y={260} s={0.6} o={0.85} />
      {/* hills */}
      <path d="M0 610 Q200 520 420 580 Q640 500 900 570 Q1180 500 1600 580 L1600 900 L0 900 Z" fill="#A6E39A" />
      {/* terminal */}
      <g transform="translate(160 430)">
        <path d="M0 170 L0 70 Q220 0 440 70 L440 170 Z" fill={BA.cream} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <path d="M-10 74 Q220 -6 450 74" fill="none" stroke="#FF9F43" strokeWidth="18" strokeLinecap="round" />
        {[40, 120, 200, 280, 360].map((x) => <rect key={x} x={x} y="84" width="56" height="64" rx="8" fill="#9FDBFF" stroke={INK} strokeWidth="5" />)}
      </g>
      {/* control tower (Hoot's lookout) */}
      <g transform="translate(1180 300)">
        <rect x="40" y="90" width="44" height="210" fill={BA.cream} stroke={INK} strokeWidth="6" />
        <path d="M0 90 L124 90 L108 40 L16 40 Z" fill="#9FDBFF" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <path d="M6 40 L118 40 L104 16 L20 16 Z" fill="#6BCB77" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <line x1="62" y1="16" x2="62" y2="-14" stroke={INK} strokeWidth="5" />
        <circle cx="62" cy="-18" r="7" fill="#FF6B6B" stroke={INK} strokeWidth="4" className="ba-beacon" />
      </g>
      {/* windsock */}
      <g transform="translate(1440 520)">
        <line x1="0" y1="0" x2="0" y2="100" stroke={INK} strokeWidth="6" />
        <g className="ba-sock">
          <path d="M0 4 L70 14 L70 30 L0 40 Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M18 7 L34 9 L34 35 L18 37 Z M50 12 L66 14 L66 29 L50 31 Z" fill="#FF7A2F" />
        </g>
      </g>
      {/* apron + runway */}
      <path d="M0 700 L1600 690 L1600 900 L0 900 Z" fill={BA.tarmac} />
      <path d="M0 700 L1600 690" stroke={INK} strokeWidth="5" opacity="0.4" />
      {[80, 300, 520, 740, 960, 1180, 1400].map((x) => <rect key={x} x={x} y="790" width="120" height="14" rx="7" fill="#fff" opacity="0.85" />)}
      {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={50 + i * 100} cy="712" r="7" fill={i % 2 ? "#FFE27A" : "#fff"} className="ba-edge-light" style={{ animationDelay: `${i * 0.12}s` }} />)}
    </svg>
  );
}

// ---------------------------------------------------------------- sticker

/** "Ground Crew" sticker: a round badge, a little plane climbing away over two crossed marshalling wands; name on the rim. */
export function GroundCrewSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Ground Crew sticker: a little plane taking off over two crossed orange wands">
      <circle cx="120" cy="120" r="114" fill="#2F6BC4" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="88" fill="#DDF3FF" stroke={INK} strokeWidth="4" />
      <path d="M33 140 Q120 118 207 140 A88 88 0 0 1 33 140 Z" fill="#A6E39A" />
      <path d="M54 168 Q120 150 186 168 L178 186 Q120 204 62 186 Z" fill={BA.tarmac} />
      <path d="M78 176 H98 M112 172 H130 M144 174 H162" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      {/* crossed wands (an X, glowing tips up) */}
      <g transform="translate(120 146)">
        {[-34, 34].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect x="-7" y="-50" width="14" height="78" rx="7" fill={BA.wand} stroke={INK} strokeWidth="4" />
            <rect x="-3" y="-44" width="6" height="40" rx="3" fill={BA.wandGlow} />
            <rect x="-8" y="14" width="16" height="16" rx="4" fill="#4A4F63" stroke={INK} strokeWidth="3" />
          </g>
        ))}
      </g>
      {/* the plane climbing away, with speed lines */}
      <g transform="translate(86 46) rotate(-16) scale(0.46)"><Plane colour="yellow" tag="star" /></g>
      <path d="M66 86 Q52 90 42 96 M70 98 Q58 104 50 110" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="74" cy="56" r="12" fill="#FFE27A" stroke={INK} strokeWidth="3" />
      <path id="ba-arc" d="M14.7 132 A106 106 0 0 0 225.3 132" fill="none" />
      <text className="ba-sticker-text" fill="#fff"><textPath href="#ba-arc" startOffset="50%" textAnchor="middle">GROUND CREW</textPath></text>
    </svg>
  );
}

// ---------------------------------------------------------------- prompt icons, basket stub

export function AirportIcon({ kind }: { kind: string }) {
  if (kind === "passenger") return <Bobbo state="idle" size="100%" />;
  if (kind === "light") return <Lamp colour="yellow" />;
  if (kind === "wands") return <Wands />;
  return <Bag colour="blue" tag="none" />;
}
export function NoBasket() {
  return <span className="ba-no-basket" aria-hidden="true" />;
}
