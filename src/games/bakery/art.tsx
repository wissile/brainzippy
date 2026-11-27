import { CREW, INK } from "../../characters/palette";

/**
 * Original art for Bobbo's Bakery. Critter Crew style: ink outlines, flat warm fills, soft highlights. Older register
 * (ages 9–11): calmer shapes, a real working bakery rather than a toy kitchen. No text in the art except the shop sign.
 */
export const BK = {
  ink: INK,
  dough: "#F3C47A",
  crust: "#D9893F",
  choc: "#5B321C",
  cream: "#FFF6E6",
  icing: "#FF8FB1",
  icingDeep: "#E2557F",
  berry: "#C2185B",
  tray: "#B7C1D3",
  trayIn: "#DCE3EE",
  wood: "#C98B55",
  woodDark: "#9A5F32",
  wall: "#FBE3C4",
  tile: "#F6D2A8",
  gold: "#FFD43B",
  mint: "#9FE3C7",
  sky: "#BFE6FA",
  bobbo: CREW.bobbo,
  puff: CREW.puff,
} as const;

/** The bakery kitchen behind the play board. */
export function BakeryBackground() {
  return (
    <svg className="bk-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="900" fill={BK.wall} />
      {/* tiled back wall */}
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={`t${i}`} x={i * 100} y="380" width="100" height="70" fill={i % 2 ? BK.tile : "#F9DDB9"} />
      ))}
      <rect y="450" width="1600" height="450" fill="#E9B98A" />
      <rect y="450" width="1600" height="16" fill={BK.woodDark} opacity="0.5" />
      {/* window with festival bunting */}
      <g transform="translate(560 70)">
        <rect width="480" height="260" rx="24" fill={BK.sky} stroke={INK} strokeWidth="10" />
        <path d="M0 190 Q120 150 240 175 T480 160 V260 H0 Z" fill="#9BD67F" />
        <circle cx="390" cy="70" r="34" fill="#FFE27A" />
        <line x1="240" y1="0" x2="240" y2="260" stroke={INK} strokeWidth="8" />
        <path d="M0 30 Q240 90 480 30" fill="none" stroke={INK} strokeWidth="4" />
        {Array.from({ length: 9 }, (_, i) => {
          const x = 30 + i * 52;
          const y = 30 + Math.sin((i / 8) * Math.PI) * 52;
          return <path key={i} d={`M${x - 16} ${y} L${x + 16} ${y} L${x} ${y + 30} Z`} fill={[BK.icing, BK.gold, BK.mint, "#8FC9FF"][i % 4]} stroke={INK} strokeWidth="3" />;
        })}
      </g>
      {/* shelves with loaves */}
      {[90, 1180].map((x) => (
        <g key={x} transform={`translate(${x} 120)`}>
          <rect y="110" width="330" height="18" rx="6" fill={BK.wood} stroke={INK} strokeWidth="6" />
          <rect y="240" width="330" height="18" rx="6" fill={BK.wood} stroke={INK} strokeWidth="6" />
          {[30, 130, 230].map((lx) => (
            <g key={lx} transform={`translate(${lx} 60)`}>
              <path d="M0 50 Q0 0 40 0 Q80 0 80 50 Z" fill={BK.crust} stroke={INK} strokeWidth="5" />
              <path d="M22 18 L30 34 M42 12 L48 30 M60 18 L64 34" stroke="#F7C57E" strokeWidth="5" strokeLinecap="round" />
            </g>
          ))}
          {[20, 120, 220].map((lx) => (
            <g key={lx} transform={`translate(${lx} 200)`}>
              <ellipse cx="45" cy="30" rx="44" ry="12" fill="#fff" stroke={INK} strokeWidth="4" />
              <path d="M12 28 Q14 6 45 6 Q76 6 78 28 Z" fill={BK.icing} stroke={INK} strokeWidth="4" />
              <circle cx="45" cy="2" r="7" fill={BK.berry} stroke={INK} strokeWidth="3" />
            </g>
          ))}
        </g>
      ))}
      {/* oven */}
      <g transform="translate(40 470)">
        <rect width="300" height="300" rx="28" fill="#8A93A8" stroke={INK} strokeWidth="10" />
        <rect x="40" y="70" width="220" height="150" rx="18" fill="#3A3150" stroke={INK} strokeWidth="8" />
        <rect x="55" y="85" width="190" height="120" rx="12" fill="#FF9F43" opacity="0.55" className="bk-oven-glow" />
        <rect x="60" y="30" width="180" height="16" rx="8" fill={INK} />
      </g>
      {/* counter */}
      <rect x="0" y="780" width="1600" height="120" fill={BK.wood} />
      <rect x="0" y="770" width="1600" height="26" fill={BK.woodDark} />
    </svg>
  );
}

/** A chocolate-chip cookie, centred in a 100 × 100 box. */
export function CookieShape({ x = 0, y = 0, r = 50, dim = false }: { x?: number; y?: number; r?: number; dim?: boolean }) {
  const s = r / 50;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={dim ? 0.35 : 1}>
      <circle r="44" fill={BK.crust} stroke={INK} strokeWidth="7" />
      <circle r="34" fill={BK.dough} />
      <circle cx="-14" cy="-10" r="6" fill={BK.choc} />
      <circle cx="12" cy="-16" r="5" fill={BK.choc} />
      <circle cx="4" cy="8" r="6" fill={BK.choc} />
      <circle cx="-16" cy="16" r="5" fill={BK.choc} />
      <circle cx="20" cy="14" r="5" fill={BK.choc} />
    </g>
  );
}

/** A muffin (side view), centred at x, y; `iced` adds pink icing and a berry. */
export function MuffinShape({ x = 0, y = 0, r = 50, iced = false }: { x?: number; y?: number; r?: number; iced?: boolean }) {
  const s = r / 50;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-34 4 L-26 44 L26 44 L34 4 Z" fill="#8FC9FF" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M-20 8 L-16 40 M0 8 V40 M20 8 L16 40" stroke="#5AA6E8" strokeWidth="4" />
      <path d="M-40 8 Q-44 -30 0 -36 Q44 -30 40 8 Z" fill={BK.crust} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      {iced && (
        <>
          <path d="M-36 -2 Q-38 -32 0 -38 Q38 -32 36 -2 Q24 6 12 -4 Q0 6 -12 -4 Q-24 6 -36 -2 Z" fill={BK.icing} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="0" cy="-40" r="8" fill={BK.berry} stroke={INK} strokeWidth="4" />
        </>
      )}
    </g>
  );
}

/** Head Baker's Hat sticker (the world's achievement). */
export function HatSticker() {
  return (
    <svg viewBox="0 0 200 200" className="bk-sticker" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill={BK.gold} stroke={INK} strokeWidth="8" />
      <circle cx="100" cy="100" r="76" fill="#FFF3BF" />
      <path d="M58 118 Q40 70 72 62 Q80 34 104 40 Q128 30 138 60 Q166 66 146 118 Z" fill="#fff" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <rect x="58" y="114" width="88" height="30" rx="8" fill="#fff" stroke={INK} strokeWidth="7" />
      <path d="M70 128 H134" stroke={BK.icing} strokeWidth="8" strokeLinecap="round" />
      <path d="M80 76 Q86 64 98 66" fill="none" stroke="#E8EEF7" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 164 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2 Z" fill={BK.icing} stroke={INK} strokeWidth="4" strokeLinejoin="round" transform="translate(0 -16) scale(1)" />
    </svg>
  );
}

/** Prompt icon / ObjectArt by key. */
export function BkObject({ kind }: { kind: string }) {
  return (
    <svg viewBox="-60 -60 120 120" aria-hidden="true" className="bk-object">
      {kind === "cake" ? <CakeIcon /> : kind === "bar" || kind === "order" ? <OrderIcon /> : kind === "grid" ? <GridIcon /> : <CookieShape r={48} />}
    </svg>
  );
}
function CakeIcon() {
  return (
    <g>
      <circle r="46" fill={BK.cream} stroke={INK} strokeWidth="6" />
      <path d="M0 0 L0 -46 A46 46 0 0 1 46 0 Z" fill={BK.icing} stroke={INK} strokeWidth="5" />
      <line x1="-46" y1="0" x2="46" y2="0" stroke={INK} strokeWidth="5" />
      <line x1="0" y1="-46" x2="0" y2="46" stroke={INK} strokeWidth="5" />
    </g>
  );
}
function GridIcon() {
  return (
    <g>
      <rect x="-46" y="-34" width="92" height="68" rx="6" fill={BK.trayIn} stroke={INK} strokeWidth="6" />
      {[-23, 0, 23].map((x) => <line key={x} x1={x} y1="-34" x2={x} y2="34" stroke={INK} strokeWidth="3" />)}
      <line x1="-46" y1="0" x2="46" y2="0" stroke={INK} strokeWidth="3" />
    </g>
  );
}
function OrderIcon() {
  return (
    <g>
      <rect x="-36" y="-48" width="72" height="96" rx="8" fill="#fff" stroke={INK} strokeWidth="6" />
      {[-26, -8, 10].map((y) => <rect key={y} x="-24" y={y} width="48" height="8" rx="4" fill={BK.tile} />)}
      <path d="M-20 32 l8 8 16 -16" fill="none" stroke="#2EAD5B" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

export const NoBasket = () => <span aria-hidden="true" />;

// ---------------------------------------------------------------- story props

/** Bobbo's shop front (story). */
export function ShopFront({ busy = false }: { busy?: boolean }) {
  return (
    <svg viewBox="0 0 800 520" className="bk-shop" aria-hidden="true">
      <rect x="60" y="120" width="680" height="400" fill="#FFE8C7" stroke={INK} strokeWidth="10" />
      <path d="M40 120 L760 120 L720 40 L80 40 Z" fill={BK.icing} stroke={INK} strokeWidth="10" strokeLinejoin="round" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${60 + i * 85} 120 q42 50 85 0`} fill={i % 2 ? "#fff" : BK.icing} stroke={INK} strokeWidth="6" />
      ))}
      <rect x="230" y="186" width="340" height="70" rx="16" fill={BK.wood} stroke={INK} strokeWidth="8" />
      <text x="400" y="234" textAnchor="middle" className="bk-sign">Bobbo's Bakery</text>
      <rect x="110" y="290" width="220" height="170" rx="14" fill={BK.sky} stroke={INK} strokeWidth="8" />
      <rect x="470" y="290" width="200" height="230" rx="14" fill={BK.wood} stroke={INK} strokeWidth="8" />
      <circle cx="640" cy="410" r="9" fill={BK.gold} stroke={INK} strokeWidth="4" />
      {[150, 220, 290].map((x) => <MuffinShape key={x} x={x} y={420} r={busy ? 28 : 24} iced={busy} />)}
    </svg>
  );
}

/** The festival order: a long paper scroll that rolls past the bottom of the screen. */
export function OrderScroll() {
  return (
    <svg viewBox="0 0 300 420" className="bk-scroll" aria-hidden="true">
      <rect x="40" y="30" width="220" height="380" rx="10" fill="#fff" stroke={INK} strokeWidth="8" />
      <rect x="20" y="10" width="260" height="40" rx="20" fill={BK.wood} stroke={INK} strokeWidth="8" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <circle cx="76" cy={84 + i * 36} r="8" fill={[BK.crust, BK.icing, BK.mint][i % 3]} stroke={INK} strokeWidth="3" />
          <rect x="96" y={78 + i * 36} width={120 - (i % 3) * 22} height="12" rx="6" fill={BK.tile} />
        </g>
      ))}
    </svg>
  );
}

/** The festival cart, loaded with boxes (outro). */
export function FestivalCart({ loaded = true }: { loaded?: boolean }) {
  return (
    <svg viewBox="0 0 420 300" className="bk-cart" aria-hidden="true">
      {loaded && (
        <g>
          {[[70, 70], [160, 70], [250, 70], [115, 10], [205, 10]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect width="86" height="64" rx="8" fill={["#fff", "#FFE0EA", "#E3F6FF"][i % 3]} stroke={INK} strokeWidth="6" />
              <path d="M43 0 V64 M0 30 H86" stroke={BK.icing} strokeWidth="6" />
            </g>
          ))}
        </g>
      )}
      <rect x="40" y="134" width="320" height="80" rx="14" fill={BK.wood} stroke={INK} strokeWidth="8" />
      <path d="M360 160 L410 130" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      {[110, 290].map((x) => (
        <g key={x} className="bk-wheel" transform={`translate(${x} 236)`}>
          <circle r="44" fill="#fff" stroke={INK} strokeWidth="8" />
          <path d="M-36 0 H36 M0 -36 V36 M-25 -25 L25 25 M25 -25 L-25 25" stroke={INK} strokeWidth="5" />
          <circle r="9" fill={BK.gold} stroke={INK} strokeWidth="4" />
        </g>
      ))}
    </svg>
  );
}

/** Bobbo's head-baker hat for the child (story beat 4). */
export function HatProp() {
  return (
    <svg viewBox="0 0 200 170" className="bk-hat" aria-hidden="true">
      <path d="M40 110 Q14 50 56 40 Q64 6 100 14 Q136 4 146 40 Q190 48 160 110 Z" fill="#fff" stroke={INK} strokeWidth="8" strokeLinejoin="round" />
      <rect x="40" y="104" width="120" height="44" rx="10" fill="#fff" stroke={INK} strokeWidth="8" />
      <path d="M54 126 H146" stroke={BK.icing} strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
