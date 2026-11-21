import { Brix } from "../../characters/library";
import { INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import type { Mat, Piece, Vehicle } from "./logic";

/**
 * Brix's Budget Bridge — original SVG art. Pieces differ by SHAPE as well as colour (colour-blind safe):
 * wood = grain lines and round nail heads; steel = an I-beam with square rivets; pillar = a stacked-stone pier;
 * triangle brace = an open truss in Brix's hard-hat yellow. Vehicles are chunky toys with one round headlight.
 * Brix's palette is navy + yellow (never yellow + black).
 */
export const BB = {
  navy: "#34557A",
  navyLt: "#7896BA",
  hat: "#FFD43B",
  hatDk: "#E8B81A",
  wood: "#D99A5B",
  woodDk: "#A8693A",
  woodLt: "#F0C08A",
  steel: "#9DB3CC",
  steelDk: "#5D7694",
  stone: "#B9B2C6",
  stoneDk: "#8C859E",
  water: "#58AEE8",
  waterDk: "#2F6FB8",
  earth: "#A0784A",
  earthDk: "#7E5A35",
  grass: "#7FC66A",
  grassDk: "#5BA84A",
  road: "#6E6A80",
} as const;
const S = 4;

// ---------------------------------------------------------------- bridge pieces (drawn inside the board's SVG, 100-unit cells)

/** A deck plank for one cell: x 0..100, y 0..16 (the road surface is y = 0). */
export function PlankShape({ mat, ghost = false }: { mat: Mat; ghost?: boolean }) {
  const fill = mat === "wood" ? BB.wood : BB.steel;
  const dark = mat === "wood" ? BB.woodDk : BB.steelDk;
  return (
    <g className={`bb-plank is-${mat} ${ghost ? "is-ghost" : ""}`}>
      <rect x="1" y="0" width="98" height="16" rx="4" fill={ghost ? "#fff" : fill} fillOpacity={ghost ? 0.5 : 1} stroke={ghost ? "#8E6CEF" : INK} strokeWidth={S} strokeDasharray={ghost ? "7 5" : undefined} />
      {!ghost && mat === "wood" && (
        <>
          <path d="M12 6 C30 4 46 9 64 6 S88 5 92 7" fill="none" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 11 C36 13 54 10 80 12" fill="none" stroke={BB.woodLt} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="9" cy="8" r="2.6" fill={INK} /><circle cx="91" cy="8" r="2.6" fill={INK} />
        </>
      )}
      {!ghost && mat === "steel" && (
        <>
          <rect x="4" y="5.5" width="92" height="5" fill={dark} opacity="0.55" />
          {[12, 34, 56, 78].map((x) => <rect key={x} x={x} y="2.5" width="5" height="5" fill={INK} opacity="0.75" />)}
          {[22, 44, 66, 88].map((x) => <rect key={x} x={x - 4} y="9" width="5" height="5" fill={INK} opacity="0.75" />)}
        </>
      )}
    </g>
  );
}

/** A stone pier under one cell: x 20..80, from y = 0 (deck underside) to y = h. `sunk` = in deep water (tilted). */
export function PillarShape({ h, ghost = false, sunk = false }: { h: number; ghost?: boolean; sunk?: boolean }) {
  const rows = Math.max(2, Math.round(h / 22));
  return (
    <g className={`bb-pillar ${ghost ? "is-ghost" : ""} ${sunk ? "is-sunk" : ""}`} transform={sunk ? "rotate(7 50 0) translate(0 14)" : undefined}>
      <rect x="22" y="0" width="56" height={h} rx="6" fill={ghost ? "#fff" : BB.stone} fillOpacity={ghost ? 0.5 : 1} stroke={ghost ? "#8E6CEF" : INK} strokeWidth={S} strokeDasharray={ghost ? "7 5" : undefined} />
      {!ghost && Array.from({ length: rows - 1 }, (_, k) => {
        const y = ((k + 1) * h) / rows;
        return <path key={k} d={`M24 ${y} H76 M${k % 2 ? 40 : 58} ${y} V${y + h / rows}`} stroke={BB.stoneDk} strokeWidth="2.5" />;
      })}
      {!ghost && <path d="M28 8 V30" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />}
    </g>
  );
}

/** A triangle truss over one cell: x 0..100, from y = -h (apex row) to y = 0 (the deck). */
export function BraceShape({ h = 44, ghost = false }: { h?: number; ghost?: boolean }) {
  const stroke = ghost ? "#8E6CEF" : INK;
  return (
    <g className={`bb-brace ${ghost ? "is-ghost" : ""}`}>
      <path d={`M4 0 L50 ${-h} L96 0`} fill="none" stroke={stroke} strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={ghost ? "8 7" : undefined} opacity={ghost ? 0.7 : 1} />
      {!ghost && <path d={`M4 0 L50 ${-h} L96 0`} fill="none" stroke={BB.hat} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />}
      {!ghost && <path d={`M50 ${-h} V-2`} stroke={INK} strokeWidth="7" strokeLinecap="round" />}
      {!ghost && <path d={`M50 ${-h} V-2`} stroke={BB.hatDk} strokeWidth="3" strokeLinecap="round" />}
      {!ghost && <circle cx="50" cy={-h} r="4.5" fill={BB.navy} stroke={INK} strokeWidth="2.5" />}
    </g>
  );
}

// ---------------------------------------------------------------- vehicles (bottom-centre at 0,0; facing right)

export const VEHICLE_WIDTH: Record<Vehicle, number> = { scooter: 48, car: 72, van: 80, truck: 92, bus: 98 };

function Wheel({ x, r = 9 }: { x: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={-r} r={r} fill={INK} />
      <circle cx={x} cy={-r} r={r * 0.42} fill="#D8D3E6" />
    </g>
  );
}
function Lamp({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r="4.2" fill="#FFF3A6" stroke={INK} strokeWidth="2.5" />;
}

export function VehicleShape({ kind }: { kind: Vehicle }) {
  switch (kind) {
    case "scooter":
      return (
        <g className="bb-vehicle-shape">
          <path d="M-18 -14 H14 L18 -22" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M-20 -14 C-20 -24 -10 -26 -2 -26 L4 -26 C8 -26 8 -14 4 -14 Z" fill="#FF8F6B" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M16 -18 L12 -40 L4 -40" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <Lamp x={15} y={-34} />
          <Wheel x={-15} r={7} /><Wheel x={16} r={7} />
        </g>
      );
    case "car":
      return (
        <g className="bb-vehicle-shape">
          <path d="M-34 -12 C-36 -24 -30 -28 -20 -29 L-12 -42 C-8 -46 12 -46 16 -42 L26 -29 C34 -28 37 -22 35 -12 Z" fill="#2EC4B6" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M-8 -40 H2 V-30 H-14 Z M6 -40 H13 L20 -30 H6 Z" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <Lamp x={30} y={-21} />
          <Wheel x={-20} /><Wheel x={20} />
        </g>
      );
    case "van":
      return (
        <g className="bb-vehicle-shape">
          <path d="M-38 -12 V-48 C-38 -52 -34 -54 -30 -54 H18 C24 -54 28 -50 30 -44 L38 -28 V-12 Z" fill="#8E6CEF" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M18 -48 L28 -30 H14 V-48 Z" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="-30" y="-46" width="36" height="14" rx="4" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" />
          <path d="M-36 -24 H36" stroke="#B9A2FF" strokeWidth="4" />
          <Lamp x={33} y={-20} />
          <Wheel x={-22} /><Wheel x={22} />
        </g>
      );
    case "truck":
      return (
        <g className="bb-vehicle-shape">
          <rect x="-44" y="-30" width="58" height="16" rx="3" fill={BB.navy} stroke={INK} strokeWidth="4" />
          <rect x="-40" y="-50" width="22" height="20" rx="3" fill={BB.wood} stroke={INK} strokeWidth="3" />
          <rect x="-16" y="-46" width="20" height="16" rx="3" fill={BB.woodLt} stroke={INK} strokeWidth="3" />
          <path d="M14 -12 V-46 C14 -50 17 -52 21 -52 H32 C36 -52 38 -50 40 -46 L46 -30 V-12 Z" fill="#FF9F43" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M22 -46 H32 L38 -32 H22 Z" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <Lamp x={41} y={-20} />
          <Wheel x={-30} /><Wheel x={-6} /><Wheel x={30} />
        </g>
      );
    case "bus":
      return (
        <g className="bb-vehicle-shape">
          <path d="M-48 -12 V-54 C-48 -58 -45 -60 -41 -60 H38 C44 -60 47 -56 48 -50 L49 -12 Z" fill={BB.hat} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          {[-40, -24, -8, 8].map((x) => <rect key={x} x={x} y="-52" width="12" height="14" rx="3" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" />)}
          <path d="M26 -52 H40 C43 -52 45 -50 45 -47 V-36 H26 Z" fill="#D9F6FF" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M-47 -30 H48" stroke={BB.navy} strokeWidth="5" />
          <Lamp x={44} y={-20} />
          <Wheel x={-30} r={10} /><Wheel x={30} r={10} />
        </g>
      );
  }
}

/** Standalone vehicle (prompt icon, story). */
export function VehicleArt({ kind }: { kind: Vehicle }) {
  return (
    <svg viewBox="-56 -66 112 72" className="bb-art" aria-hidden="true">
      <VehicleShape kind={kind} />
    </svg>
  );
}

// ---------------------------------------------------------------- tray icons (100×100)

export function PieceIcon({ piece }: { piece: Piece | "erase" }) {
  return (
    <svg viewBox="0 0 100 100" className="bb-art bb-piece-art" aria-hidden="true">
      {piece === "wood" && <g transform="translate(0 42)"><PlankShape mat="wood" /></g>}
      {piece === "steel" && <g transform="translate(0 42)"><PlankShape mat="steel" /></g>}
      {piece === "pillar" && <g transform="translate(0 14) scale(1 1)"><PillarShape h={72} /></g>}
      {piece === "brace" && <g transform="translate(6 78) scale(0.88)"><BraceShape h={60} /><rect x="1" y="0" width="98" height="10" rx="3" fill="#E9E4F4" stroke={INK} strokeWidth="3" /></g>}
      {piece === "erase" && (
        <g transform="rotate(-30 50 50)">
          <rect x="22" y="36" width="56" height="28" rx="7" fill="#FF8FB1" stroke={INK} strokeWidth={S} />
          <rect x="22" y="36" width="20" height="28" rx="6" fill="#fff" stroke={INK} strokeWidth={S} />
        </g>
      )}
    </svg>
  );
}

/** Test button face: a little flag on a check-mark ramp. */
export function TestIcon() {
  return (
    <svg viewBox="0 0 100 100" className="bb-art" aria-hidden="true">
      <path d="M20 74 H80" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M34 74 V22" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M36 24 L72 34 L36 46 Z" fill={BB.hat} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

/** Segment result badges: OK = check in a circle; too weak = a sagging line in a rounded square (shape differs, not just colour). */
export function OkBadge() {
  return (
    <g className="bb-badge is-ok">
      <circle r="15" fill="#6BCB77" stroke={INK} strokeWidth="3.5" />
      <path d="M-7 0 L-2 6 L8 -6" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
export function WeakBadge() {
  return (
    <g className="bb-badge is-weak">
      <rect x="-15" y="-15" width="30" height="30" rx="8" fill="#FF9F43" stroke={INK} strokeWidth="3.5" />
      <path d="M-9 -4 Q0 10 9 -4" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------- scene background (river valley)

export function BridgeBackground() {
  return (
    <svg className="scene-bg bb-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="bb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FF" />
          <stop offset="0.7" stopColor="#D6EEFF" />
          <stop offset="1" stopColor="#EAF6E0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bb-sky)" />
      <g className="cloud" fill="#fff" opacity="0.9"><ellipse cx="260" cy="130" rx="120" ry="36" /><ellipse cx="320" cy="108" rx="70" ry="40" /></g>
      <g className="cloud c2" fill="#fff" opacity="0.85"><ellipse cx="1260" cy="96" rx="130" ry="40" /><ellipse cx="1190" cy="80" rx="70" ry="36" /></g>
      {/* far hills and a little village on the far side */}
      <path d="M0 470 C220 390 420 420 640 450 C860 390 1120 400 1360 440 C1480 425 1560 430 1600 440 L1600 900 L0 900 Z" fill="#B7E28E" />
      {[1180, 1260, 1330].map((x, i) => (
        <g key={x} transform={`translate(${x} ${438 - i * 4})`} stroke={INK} strokeWidth="4" strokeLinejoin="round">
          <rect x="-26" y="-34" width="52" height="38" fill={["#FFE7C2", "#FFD6E0", "#E4EBF3"][i]} />
          <path d="M-34 -32 L0 -60 L34 -32 Z" fill={["#FF8F6B", BB.navy, "#6BCB77"][i]} />
          <rect x="-7" y="-16" width="14" height="20" fill={BB.woodDk} />
        </g>
      ))}
      {/* valley sides */}
      <path d="M0 560 C180 540 360 560 520 600 L620 900 L0 900 Z" fill={BB.grass} />
      <path d="M1600 560 C1420 540 1240 560 1080 600 L980 900 L1600 900 Z" fill={BB.grass} />
      <path d="M0 610 C200 600 380 620 500 660 L560 900 L0 900 Z" fill={BB.earth} opacity="0.35" />
      <path d="M1600 610 C1400 600 1220 620 1100 660 L1040 900 L1600 900 Z" fill={BB.earth} opacity="0.35" />
      {/* the river */}
      <path d="M520 600 C640 640 960 640 1080 600 L1040 900 L560 900 Z" fill={BB.water} />
      <g className="bb-ripples" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.55" fill="none">
        <path d="M640 700 q30 -10 60 0" /><path d="M860 760 q30 -10 60 0" /><path d="M740 830 q30 -10 60 0" />
      </g>
      {/* reeds */}
      {[90, 170, 1440, 1520].map((x) => (
        <g key={x} stroke={BB.grassDk} strokeWidth="7" strokeLinecap="round"><path d={`M${x} 700 q-8 -50 -2 -80`} /><path d={`M${x + 16} 702 q6 -40 14 -66`} /></g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- story props

/** A side view of the river for the story: broken stumps (intro) or a finished truss bridge with a vehicle on it. */
export function StoryRiver({ broken = false, vehicle, at = 0.5 }: { broken?: boolean; vehicle?: Vehicle; at?: number }) {
  const deckY = 120;
  return (
    <svg viewBox="0 0 600 240" className="bb-art bb-story-river" aria-hidden="true">
      <path d="M0 120 H150 L170 240 H0 Z" fill={BB.grass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M600 120 H450 L430 240 H600 Z" fill={BB.grass} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M0 132 H152 M600 132 H448" stroke={BB.earth} strokeWidth="10" />
      <path d="M160 170 Q300 160 440 170 L430 240 H170 Z" fill={BB.water} />
      <path d="M220 196 q20 -8 40 0 M330 212 q20 -8 40 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.6" />
      {broken ? (
        <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
          <path d="M150 120 L208 128 L200 140 L150 134 Z" fill={BB.wood} />
          <path d="M450 120 L398 132 L404 144 L450 134 Z" fill={BB.wood} />
          <path d="M282 184 L318 176 L322 186 L286 194 Z" fill={BB.wood} />
        </g>
      ) : (
        <g>
          <g transform={`translate(150 ${deckY})`}>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 100} 0)`}><BraceShape h={48} /><PlankShape mat="wood" /></g>)}</g>
          <g transform={`translate(250 ${deckY + 16})`}><PillarShape h={48} /></g>
          <g transform={`translate(350 ${deckY + 16})`}><PillarShape h={48} /></g>
        </g>
      )}
      {vehicle && <g className="bb-story-vehicle" transform={`translate(${40 + at * 520} ${deckY})`}><VehicleShape kind={vehicle} /></g>}
    </svg>
  );
}

/** Budge's notebook budget for the story: a big price tag. */
export function BudgetTagArt() {
  return (
    <svg viewBox="0 0 120 80" className="bb-art" aria-hidden="true">
      <path d="M10 14 H84 L110 40 L84 66 H10 Z" fill="#FFF1C9" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="84" cy="40" r="6" fill="#fff" stroke={INK} strokeWidth="4" />
      <text x="44" y="51" textAnchor="middle" fontSize="30" fill={BB.navy} style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>$</text>
    </svg>
  );
}

// ---------------------------------------------------------------- reward, mascot, prompt icon

/** "Bridge Builder": a round badge with a tiny triangle-truss bridge and Brix's hard hat on top. */
export function BridgeBuilderSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Bridge Builder sticker: a round badge with a little triangle bridge over a river and a yellow hard hat">
      <circle cx="120" cy="128" r="104" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="128" r="90" fill="#E4EBF3" />
      <path d="M38 150 Q120 140 202 150 L196 182 Q120 196 44 182 Z" fill={BB.water} />
      <path d="M78 168 q12 -6 24 0 M134 174 q12 -6 24 0" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
      <g transform="translate(45 132) scale(0.5)">
        {[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 100} 0)`}><BraceShape h={56} /><PlankShape mat="steel" /></g>)}
      </g>
      <g transform="translate(95 140) scale(0.5)"><PillarShape h={56} /></g>
      <g transform="translate(145 140) scale(0.5)"><PillarShape h={56} /></g>
      {/* hard hat */}
      <path d="M72 70 C72 34 168 34 168 70 Z" fill={BB.hat} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M58 70 H182 C186 70 186 82 182 82 H58 C54 82 54 70 58 70 Z" fill={BB.hatDk} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M120 38 V68" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M88 56 C90 48 96 44 104 42" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <path d="M38 198 L202 198 L214 224 L192 222 L120 232 L48 222 L26 224 Z" fill={BB.navy} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <text x="120" y="221" textAnchor="middle" fontSize="19" fill="#fff" letterSpacing="1.2" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>BRIDGE BUILDER</text>
    </svg>
  );
}

export function BrixMascot({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  return <Brix state={state} talking={talking} size={size ?? "100%"} />;
}

export function BridgeObject({ kind }: { kind: string }) {
  const v = (["scooter", "car", "van", "truck", "bus"] as const).find((k) => k === kind);
  return v ? <VehicleArt kind={v} /> : <PieceIcon piece="brace" />;
}

export function NoBasket() {
  return <span aria-hidden="true" />;
}
