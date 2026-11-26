import { INK } from "../../characters/palette";
import { LEGS, PLACES } from "./logic";

/**
 * Ziggy's Flight Plan — original SVG art: the flight-planning room at Sky School (window onto the airfield with a
 * windsock, cork board, desk), a generic high-wing trainer, the fictional island chart (watermarked "not for
 * navigation"), prompt icons and the Co-pilot's Clipboard sticker. Flat fills with the Critter Crew ink outline in a
 * calmer, older palette (slate navy, sky, paper, wood, windsock orange) for ages 12–14. No real charts, brands,
 * registrations or liveries.
 */
export const FP = {
  navy: "#1F3352",
  slate: "#33496B",
  wall: "#DCE6EE",
  wallDeep: "#C3D2DE",
  sky: "#8FD0F5",
  skyLight: "#D8F0FC",
  paper: "#F8F4EA",
  paperDeep: "#E9E1CC",
  wood: "#9A6B45",
  woodDeep: "#6E4A2E",
  blue: "#4FB3E8",
  blueDeep: "#1C6FA8",
  orange: "#FF7A2F",
  gold: "#FFD43B",
  green: "#7DBE6E",
  sea: "#BFE2F0",
  seaDeep: "#9ACFE4",
  land: "#EADFBF",
  landEdge: "#C9B98E",
  red: "#D6454B",
} as const;
const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A generic high-wing trainer, side view (original; no real type, registration or livery). 200 × 90 box, nose right. */
export function Trainer({ tilt = 0 }: { tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} 100 45)`}>
      <path d="M22 44 L4 22 H18 L40 40 Z" fill={FP.blue} {...S} strokeWidth={4} />
      <path d="M20 46 Q60 34 130 36 Q170 38 182 48 Q170 60 130 60 Q70 62 20 50 Z" fill="#FFFFFF" {...S} strokeWidth={4} />
      <path d="M60 52 Q110 54 176 50" stroke={FP.blue} strokeWidth="6" fill="none" />
      <path d="M108 38 Q118 26 142 28 L150 38 Z" fill={FP.skyLight} {...S} strokeWidth={3.5} />
      <path d="M70 30 H160 L156 22 H76 Z" fill={FP.blue} {...S} strokeWidth={4} />
      <path d="M128 30 L120 40 M138 30 L132 40" stroke={INK} strokeWidth="3" />
      <rect x="180" y="38" width="6" height="22" rx="3" fill="#9AA3B5" stroke={INK} strokeWidth="3" />
      <path d="M118 60 L112 74 M150 58 L156 74" stroke={INK} strokeWidth="4" />
      <circle cx="111" cy="77" r="7" fill="#4A4F63" stroke={INK} strokeWidth="3" />
      <circle cx="157" cy="77" r="7" fill="#4A4F63" stroke={INK} strokeWidth="3" />
    </g>
  );
}

/** The flight-planning room: window onto the airfield (windsock, runway), cork board with a pinned chart, desk. */
export function PlanningRoom() {
  return (
    <svg className="scene-bg fp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6FC1F0" /><stop offset="1" stopColor={FP.skyLight} /></linearGradient>
        <linearGradient id="fp-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={FP.wall} /><stop offset="1" stopColor={FP.wallDeep} /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#fp-wall)" />
      <path d="M0 640 H1600" stroke="#B3C3D1" strokeWidth="6" />
      {/* the big window onto the airfield */}
      <g transform="translate(560 90)">
        <rect width="720" height="400" rx="16" fill="url(#fp-sky)" stroke={INK} strokeWidth="10" />
        <path d="M0 300 Q180 284 360 292 T720 286 V400 H0 Z" fill="#9ED38C" />
        <path d="M60 352 L660 330 L680 360 L40 388 Z" fill="#6F7A8C" stroke={INK} strokeWidth="4" />
        <path d="M120 366 L180 364 M260 361 L320 359 M400 356 L460 354 M540 351 L600 349" stroke="#FFFFFF" strokeWidth="5" />
        <g transform="translate(560 200)">
          <path d="M0 0 V96" stroke={INK} strokeWidth="6" />
          <g className="fp-sock">
            <path d="M2 6 L70 14 Q74 20 70 26 L2 34 Z" fill="#FFFFFF" />
            <path d="M2 6 L18 8 V32 L2 34 Z M34 10 L50 12 V28 L34 30 Z M62 13 L70 14 Q74 20 70 26 L62 27 Z" fill={FP.orange} />
            <path d="M2 6 L70 14 Q74 20 70 26 L2 34 Z" fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          </g>
        </g>
        <g transform="translate(90 120) scale(1.2)" className="fp-cloud"><path d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -2 76 18 Q96 20 92 36 H4 Z" fill="#FFFFFF" opacity="0.92" /></g>
        <g transform="translate(420 60)" className="fp-cloud c2"><path d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -2 76 18 Q96 20 92 36 H4 Z" fill="#FFFFFF" opacity="0.85" /></g>
        <g transform="translate(150 230) scale(0.7)"><Trainer tilt={-2} /></g>
        <path d="M360 0 V400 M0 200 H720" stroke={INK} strokeWidth="8" />
      </g>
      {/* cork board with a pinned (fictional) chart and the practice card */}
      <g transform="translate(70 120)">
        <rect width="420" height="330" rx="12" fill="#C9A36E" stroke={INK} strokeWidth="8" />
        <g transform="translate(26 26) rotate(-2)">
          <rect width="250" height="170" fill={FP.sea} stroke={INK} strokeWidth="4" />
          <path d="M30 120 Q50 70 100 80 Q130 60 150 100 Q140 150 80 150 Q40 150 30 120 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
          <path d="M170 40 Q200 30 220 60 Q210 90 180 80 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
          <path d="M70 120 L130 95 L195 60" stroke="#B43A6B" strokeWidth="4" strokeDasharray="10 6" fill="none" />
          <circle cx="125" cy="0" r="7" fill={FP.red} stroke={INK} strokeWidth="3" />
        </g>
        <g transform="translate(296 40) rotate(4)">
          <rect width="100" height="130" fill={FP.paper} stroke={INK} strokeWidth="4" />
          <path d="M14 26 H86 M14 50 H86 M14 74 H70 M14 98 H80" stroke="#7A8698" strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="0" r="7" fill={FP.gold} stroke={INK} strokeWidth="3" />
        </g>
        <g transform="translate(60 222) rotate(3)">
          <rect width="300" height="80" fill="#FFF6C9" stroke={INK} strokeWidth="4" />
          <path d="M18 28 H230 M18 52 H180" stroke="#9A8A4E" strokeWidth="5" strokeLinecap="round" />
          <circle cx="150" cy="0" r="7" fill={FP.blue} stroke={INK} strokeWidth="3" />
        </g>
      </g>
      {/* a wall clock (a quiet reminder that planning takes the time it needs — no timer anywhere) */}
      <g transform="translate(1420 170)">
        <circle r="70" fill="#FFFFFF" stroke={INK} strokeWidth="8" />
        <path d="M0 0 V-44 M0 0 L32 14" stroke={INK} strokeWidth="7" strokeLinecap="round" />
        <circle r="7" fill={INK} />
      </g>
      {/* the desk */}
      <rect x="-20" y="700" width="1640" height="60" fill={FP.wood} stroke={INK} strokeWidth="8" />
      <rect x="-20" y="760" width="1640" height="160" fill={FP.woodDeep} />
      <g transform="translate(1340 560)">
        <path d="M60 140 L40 40 L110 10" fill="none" stroke="#4A4F63" strokeWidth="10" strokeLinecap="round" />
        <path d="M90 -10 L150 20 L120 60 Z" fill={FP.blue} {...S} />
        <ellipse cx="60" cy="142" rx="56" ry="10" fill="#4A4F63" stroke={INK} strokeWidth="5" />
      </g>
      <g transform="translate(180 610)">
        <rect width="70" height="90" rx="10" fill={FP.orange} {...S} />
        <path d="M70 24 Q100 30 96 52 Q92 70 70 70" fill="none" stroke={INK} strokeWidth="6" />
      </g>
    </svg>
  );
}

/** Outside: Pebble Field airfield, for the story (morning; optional low clouds for "wait"). */
export function AirfieldScene({ clouds = false, flying = false }: { clouds?: boolean; flying?: boolean }) {
  return (
    <svg className="scene-bg fp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fp-sky2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={clouds ? "#9FB3C6" : "#5DB8EE"} /><stop offset="1" stopColor={clouds ? "#DCE4EA" : "#E4F5FD"} /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#fp-sky2)" />
      <path d="M0 640 Q400 610 800 625 T1600 615 V900 H0 Z" fill="#9ED38C" />
      <path d="M0 700 Q500 680 1000 690 T1600 680 V900 H0 Z" fill="#86C376" />
      <path d="M120 780 L1480 730 L1520 800 L80 860 Z" fill="#6F7A8C" stroke={INK} strokeWidth="6" />
      <path d="M260 812 L360 808 M520 802 L620 798 M780 792 L880 788 M1040 782 L1140 778" stroke="#FFFFFF" strokeWidth="8" />
      <g transform="translate(1300 520)">
        <path d="M0 0 V140" stroke={INK} strokeWidth="8" />
        <g className="fp-sock">
          <path d="M3 8 L100 20 Q106 28 100 36 L3 48 Z" fill="#FFFFFF" />
          <path d="M3 8 L26 11 V45 L3 48 Z M50 14 L72 17 V39 L50 42 Z M90 19 L100 20 Q106 28 100 36 L90 37 Z" fill={FP.orange} />
          <path d="M3 8 L100 20 Q106 28 100 36 L3 48 Z" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </g>
      </g>
      {/* hangar */}
      <g transform="translate(140 430)">
        <path d="M0 220 V90 Q160 -20 320 90 V220 Z" fill="#B9C7D4" stroke={INK} strokeWidth="8" />
        <rect x="70" y="120" width="180" height="100" fill="#4A4F63" stroke={INK} strokeWidth="6" />
        <text x="160" y="80" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="34" fill={FP.navy}>SKY SCHOOL</text>
      </g>
      {clouds ? (
        <g opacity="0.95">
          {[[80, 230, 2.6], [520, 260, 3], [980, 220, 2.8], [1320, 270, 2.4]].map(([x, y, s], i) => (
            <path key={i} transform={`translate(${x} ${y}) scale(${s})`} d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -2 76 18 Q96 20 92 36 H4 Z" fill="#EEF2F5" stroke="#B9C3CC" strokeWidth="2" />
          ))}
        </g>
      ) : (
        <>
          <path className="fp-cloud" transform="translate(260 160) scale(1.6)" d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -2 76 18 Q96 20 92 36 H4 Z" fill="#FFFFFF" />
          <path className="fp-cloud c2" transform="translate(1040 120) scale(1.3)" d="M0 30 Q0 10 22 12 Q30 -6 52 4 Q72 -2 76 18 Q96 20 92 36 H4 Z" fill="#FFFFFF" />
        </>
      )}
      {flying && <g transform="translate(820 260) scale(2.2)"><Trainer tilt={-8} /></g>}
    </svg>
  );
}

/** Festival Isle (outro): bunting, tents and a little grass strip. */
export function FestivalScene() {
  return (
    <svg className="scene-bg fp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1600" height="900" fill="#7CC6F0" />
      <path d="M0 560 Q400 520 800 540 T1600 530 V900 H0 Z" fill={FP.seaDeep} />
      <path d="M180 640 Q500 520 900 560 Q1300 520 1480 650 Q1300 760 820 760 Q360 770 180 640 Z" fill={FP.land} stroke={INK} strokeWidth="6" />
      <path d="M300 640 Q700 600 1300 630" stroke="#9ED38C" strokeWidth="60" fill="none" strokeLinecap="round" />
      {[[520, 560, FP.orange], [700, 548, FP.blue], [880, 552, FP.gold]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 60 L50 0 L100 60 Z" fill={c as string} {...S} />
          <path d="M50 0 V-20" stroke={INK} strokeWidth="4" />
        </g>
      ))}
      <path d="M420 470 Q800 540 1180 470" fill="none" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 11 }, (_, i) => {
        const t = i / 10;
        const x = 420 + t * 760, y = 470 + Math.sin(t * Math.PI) * 50;
        return <path key={i} d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 28} Z`} fill={[FP.orange, FP.blue, FP.gold, FP.green][i % 4]} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
      })}
      <g transform="translate(1040 280) scale(1.8)"><Trainer tilt={6} /></g>
    </svg>
  );
}

// ---------------------------------------------------------------- the fictional chart
/** Chart positions (viewBox 0 0 400 260). */
export const PLACE_XY: readonly (readonly [number, number])[] = [[60, 205], [125, 120], [205, 172], [250, 68], [322, 132], [345, 222]];
function PlaceSymbol({ i }: { i: number }) {
  const [x, y] = PLACE_XY[i]!;
  switch (i) {
    case 0: // home airfield: ring with a runway
    case 5:
      return (
        <g transform={`translate(${x} ${y})`}>
          <circle r="11" fill="none" stroke="#B43A6B" strokeWidth="3.5" />
          <path d="M-8 6 L8 -6" stroke="#B43A6B" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 1: // lighthouse
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-5 9 L-3 -9 H3 L5 9 Z" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" />
          <path d="M-4 -2 H4" stroke={FP.red} strokeWidth="3" />
          <circle cy="-11" r="3" fill={FP.gold} stroke={INK} strokeWidth="2" />
        </g>
      );
    case 2: // twin lakes
      return (
        <g transform={`translate(${x} ${y})`}>
          <ellipse cx="-7" rx="7" ry="5" fill={FP.blue} stroke={INK} strokeWidth="2" />
          <ellipse cx="7" cy="2" rx="6" ry="4.5" fill={FP.blue} stroke={INK} strokeWidth="2" />
        </g>
      );
    case 3: // gullrock (rocky islet with a strip)
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-10 6 L-4 -8 L3 -2 L9 -9 L12 6 Z" fill="#9AA3B5" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    default: // old mill
      return (
        <g transform={`translate(${x} ${y})`}>
          <path d="M-5 9 V-2 L0 -6 L5 -2 V9 Z" fill="#E7D7B0" stroke={INK} strokeWidth="2.5" />
          <path d="M0 -4 L-10 -14 M0 -4 L10 -14 M0 -4 L-10 6 M0 -4 L10 6" stroke={INK} strokeWidth="2.5" />
        </g>
      );
  }
}

/** Ziggy's fictional island chart: legs as magenta lines; the active legs drawn bold with a distance label. */
export function Chart({ active = [], labels = [], windAngle = null, title = true }: {
  /** Indices into LEGS drawn as the leg(s) being timed. */
  active?: readonly { from: number; to: number }[];
  labels?: readonly string[];
  /** Wind arrow direction in degrees on screen (0 = arrow pointing right), or null. */
  windAngle?: number | null;
  title?: boolean;
}) {
  const xy = (i: number) => PLACE_XY[i]!;
  return (
    <svg className="fp-chart" viewBox="0 0 400 260" role="img" aria-label={`Ziggy's fictional chart of the islands (not to scale, not for navigation)${active.length ? `: ${active.map((l) => `${PLACES[l.from]} to ${PLACES[l.to]}`).join(", then ")}` : ""}`}>
      <rect width="400" height="260" rx="10" fill={FP.sea} />
      <g stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1">
        {Array.from({ length: 7 }, (_, i) => <path key={`v${i}`} d={`M${i * 60 + 20} 0 V260`} />)}
        {Array.from({ length: 5 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 60 + 10} H400`} />)}
      </g>
      <path d="M22 230 Q30 168 90 158 Q120 92 175 104 Q238 120 236 182 Q226 238 150 240 Q70 252 22 230 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
      <path d="M232 52 Q262 30 292 50 Q300 86 262 90 Q234 84 232 52 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
      <path d="M296 118 Q330 98 360 120 Q372 150 336 156 Q300 150 296 118 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
      <path d="M318 214 Q344 196 372 210 Q380 236 348 242 Q320 240 318 214 Z" fill={FP.land} stroke={FP.landEdge} strokeWidth="3" />
      {LEGS.map(([a, b], i) => {
        const [x1, y1] = xy(a), [x2, y2] = xy(b);
        return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#B43A6B" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray="6 5" />;
      })}
      {active.map((l, i) => {
        const [x1, y1] = xy(l.from), [x2, y2] = xy(l.to);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const label = labels[i];
        return (
          <g key={i} className="fp-leg">
            <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#FFFFFF" strokeWidth="9" strokeLinecap="round" />
            <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke="#B43A6B" strokeWidth="5" strokeLinecap="round" />
            {label && (
              <g transform={`translate(${mx} ${my})`}>
                <rect x="-30" y="-13" width="60" height="26" rx="13" fill="#FFFFFF" stroke="#B43A6B" strokeWidth="3" />
                <text y="6" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="800" fontSize="16" fill={INK}>{label}</text>
              </g>
            )}
          </g>
        );
      })}
      {PLACES.map((name, i) => {
        const [x, y] = xy(i);
        const below = y < 100;
        return (
          <g key={name}>
            <PlaceSymbol i={i} />
            <text x={x} y={below ? y + 26 : y - 16} textAnchor="middle" fontFamily="var(--font-body)" fontWeight="700" fontSize="12.5" fill={INK} paintOrder="stroke" stroke="#FFFFFF" strokeWidth="3.5">{name}</text>
          </g>
        );
      })}
      {windAngle !== null && (
        <g transform={`translate(52 46) rotate(${windAngle})`} className="fp-wind">
          <circle r="26" fill="#FFFFFF" stroke={INK} strokeWidth="2.5" opacity="0.9" />
          <path d="M-16 0 H10 M2 -9 L13 0 L2 9" fill="none" stroke={FP.blueDeep} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {title && (
        <text x="392" y="252" textAnchor="end" fontFamily="var(--font-body)" fontWeight="800" fontSize="10.5" fill="#5C6B80" letterSpacing="0.6">FICTIONAL CHART · NOT TO SCALE · NOT FOR NAVIGATION</text>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- prompt icons
/** Prompt-pill icon per inner game. Never shows an answer. */
export function FpObject({ kind }: { kind: string }) {
  const box = (children: React.ReactNode) => <svg className="fp-icon" viewBox="0 0 100 100" aria-hidden="true">{children}</svg>;
  switch (kind) {
    case "tunnel":
      return box(<>
        <path d="M8 40 H40 M8 58 H34 M8 76 H40" stroke={FP.blueDeep} strokeWidth="5" strokeLinecap="round" />
        <path d="M34 66 Q52 38 92 46 Q72 58 34 66 Z" fill="#FFFFFF" {...S} transform="rotate(-10 60 56)" />
      </>);
    case "chart":
      return box(<>
        <path d="M10 22 L36 14 L64 22 L90 14 V80 L64 88 L36 80 L10 88 Z" fill={FP.sea} {...S} />
        <path d="M36 14 V80 M64 22 V88" stroke={INK} strokeWidth="3" />
        <path d="M22 70 L50 48 L78 34" stroke="#B43A6B" strokeWidth="5" strokeLinecap="round" strokeDasharray="8 6" />
      </>);
    case "metar":
      return box(<>
        <rect x="8" y="18" width="84" height="64" rx="8" fill={FP.navy} {...S} />
        <path d="M20 38 H48 M54 38 H80 M20 54 H40 M46 54 H74 M20 68 H58" stroke="#9FE3B0" strokeWidth="5" strokeLinecap="round" />
      </>);
    case "pilot":
      return box(<>
        <path d="M22 60 Q20 18 50 18 Q80 18 78 60" fill="none" stroke="#4A4F63" strokeWidth="8" strokeLinecap="round" />
        <rect x="12" y="52" width="20" height="30" rx="9" fill={FP.blue} {...S} strokeWidth={4} />
        <rect x="68" y="52" width="20" height="30" rx="9" fill={FP.blue} {...S} strokeWidth={4} />
        <path d="M22 80 Q30 92 46 90" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </>);
    case "brief":
      return box(<>
        <rect x="18" y="14" width="64" height="78" rx="6" fill={FP.paper} {...S} />
        <rect x="38" y="8" width="24" height="12" rx="4" fill={FP.gold} stroke={INK} strokeWidth="4" />
        <circle cx="34" cy="42" r="8" fill={FP.green} stroke={INK} strokeWidth="3" />
        <circle cx="34" cy="66" r="8" fill={FP.red} stroke={INK} strokeWidth="3" />
        <path d="M48 42 H70 M48 66 H70" stroke="#7A8698" strokeWidth="5" strokeLinecap="round" />
      </>);
    default: // checklist
      return box(<>
        <rect x="18" y="14" width="64" height="78" rx="6" fill={FP.paper} {...S} />
        <rect x="38" y="8" width="24" height="12" rx="4" fill="#4A4F63" stroke={INK} strokeWidth="4" />
        <path d="M28 40 l5 5 l9 -10 M28 62 l5 5 l9 -10" fill="none" stroke={FP.green} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M50 42 H72 M50 64 H72 M30 82 H60" stroke="#7A8698" strokeWidth="5" strokeLinecap="round" />
      </>);
  }
}
export const NoBasket = () => <svg viewBox="0 0 10 10" aria-hidden="true" />;

// ---------------------------------------------------------------- sticker
/** Co-pilot's Clipboard: a round badge with a kneeboard clipboard, a tick, a tiny windsock and stubby wings (original). */
export function ClipboardSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Co-pilot's Clipboard sticker: a clipboard with a tick, a tiny windsock and a pair of wings">
      <circle cx="120" cy="120" r="112" fill={FP.navy} stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="94" fill={FP.skyLight} stroke={FP.gold} strokeWidth="6" />
      {[1, -1].map((s) => (
        <path key={s} transform={`translate(120 132) scale(${s} 1)`} d="M40 -10 C62 -26 86 -30 98 -24 C104 -16 98 -8 90 -6 C98 0 94 10 82 10 C84 18 70 22 58 16 C50 12 44 6 40 4 Z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      ))}
      <rect x="78" y="62" width="84" height="110" rx="10" fill="#4A4F63" stroke={INK} strokeWidth="6" />
      <rect x="88" y="76" width="64" height="86" rx="4" fill={FP.paper} />
      <rect x="104" y="54" width="32" height="16" rx="5" fill={FP.gold} stroke={INK} strokeWidth="4" />
      <path d="M98 112 l10 10 l22 -26" fill="none" stroke={FP.green} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M98 142 H142 M98 152 H128" stroke="#7A8698" strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(150 40)">
        <path d="M0 0 V34" stroke={INK} strokeWidth="4" />
        <path d="M2 2 L32 7 Q34 11 32 15 L2 20 Z" fill="#FFFFFF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M2 2 L10 3.5 V18.5 L2 20 Z M18 4.5 L25 5.8 V15.8 L18 17 Z" fill={FP.orange} />
      </g>
      <path id="fp-arc" d="M44 176 A84 84 0 0 0 196 176" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill="#FFFFFF" letterSpacing="2" stroke={INK} strokeWidth="1">
        <textPath href="#fp-arc" startOffset="50%" textAnchor="middle">CO-PILOT</textPath>
      </text>
    </svg>
  );
}
