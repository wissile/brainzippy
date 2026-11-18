import { Puff } from "../../characters/Crew";
import { CREW, INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import { towerSize } from "./tokens";

/**
 * Puff's Pattern Parade — original SVG art. Every marcher is drawn in a 100×100 box and differs in
 * silhouette as well as colour (floats: star / heart / moon / leaf; animals; instruments; block towers).
 */
const S = 3.5; // ink stroke for marchers

// ---------------------------------------------------------------- floats
function Wagon({ skirt }: { skirt: string }) {
  return (
    <g>
      <path d="M12 68 L88 68 L84 84 L16 84 Z" fill="#FFF5E1" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M16 76 Q22 82 28 76 Q34 82 40 76 Q46 82 52 76 Q58 82 64 76 Q70 82 76 76 Q82 82 86 76" fill="none" stroke={skirt} strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="88" r="7" fill={INK} /><circle cx="28" cy="88" r="2.6" fill="#FFF5E1" />
      <circle cx="72" cy="88" r="7" fill={INK} /><circle cx="72" cy="88" r="2.6" fill="#FFF5E1" />
    </g>
  );
}
const starPath = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return `${i ? "L" : "M"}${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }).join(" ") + " Z";

function FloatArt({ shape }: { shape: "star" | "heart" | "moon" | "leaf" }) {
  const c = { star: "#FFD43B", heart: "#FF6FA3", moon: "#4D96FF", leaf: "#5BC85A" }[shape];
  return (
    <g>
      <path d="M50 66 L50 58" stroke={INK} strokeWidth={S} />
      {shape === "star" && <path d={starPath(50, 36, 29, 13)} fill={c} stroke={INK} strokeWidth={S} strokeLinejoin="round" />}
      {shape === "heart" && <path d="M50 62 C22 44 14 30 22 18 C30 8 44 10 50 22 C56 10 70 8 78 18 C86 30 78 44 50 62 Z" fill={c} stroke={INK} strokeWidth={S} strokeLinejoin="round" />}
      {shape === "moon" && <path d="M60 8 A28 28 0 1 0 60 64 A22 22 0 1 1 60 8 Z" fill={c} stroke={INK} strokeWidth={S} strokeLinejoin="round" />}
      {shape === "leaf" && (
        <g>
          <path d="M50 6 C80 18 82 48 50 62 C18 48 20 18 50 6 Z" fill={c} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
          <path d="M50 14 L50 56 M50 30 L38 22 M50 40 L62 32 M50 48 L40 42" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      <ellipse cx="38" cy="24" rx="5" ry="8" transform="rotate(-25 38 24)" fill="#fff" opacity="0.45" />
      <Wagon skirt={c} />
    </g>
  );
}

// ---------------------------------------------------------------- animals
const Eye = ({ x, y, r = 4 }: { x: number; y: number; r?: number }) => (
  <g><circle cx={x} cy={y} r={r} fill={INK} /><circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#fff" /></g>
);
function Duck() {
  return (
    <g>
      <path d="M36 86 L36 92 M60 86 L60 92" stroke="#FF9F43" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 93 L42 93 M54 93 L66 93" stroke="#FF9F43" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 62 C18 46 34 44 46 50 L70 52 C84 54 86 76 72 84 C58 92 30 90 22 80 C14 74 12 66 18 62 Z" fill="#FFD43B" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M30 66 C38 60 50 62 54 70 C46 76 36 76 30 66 Z" fill="#FFC21A" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="60" cy="34" r="17" fill="#FFD43B" stroke={INK} strokeWidth={S} />
      <path d="M74 34 L92 38 L74 44 Z" fill="#FF9F43" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <Eye x={64} y={30} />
    </g>
  );
}
function Frog() {
  return (
    <g>
      <path d="M14 72 C14 52 30 44 50 44 C70 44 86 52 86 72 C86 86 70 92 50 92 C30 92 14 86 14 72 Z" fill="#5BC85A" stroke={INK} strokeWidth={S} />
      <circle cx="32" cy="42" r="13" fill="#5BC85A" stroke={INK} strokeWidth={S} />
      <circle cx="68" cy="42" r="13" fill="#5BC85A" stroke={INK} strokeWidth={S} />
      <circle cx="32" cy="42" r="8" fill="#fff" /><circle cx="68" cy="42" r="8" fill="#fff" />
      <Eye x={33} y={43} r={4.4} /><Eye x={69} y={43} r={4.4} />
      <path d="M30 66 Q50 80 70 66" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <ellipse cx="24" cy="64" rx="5" ry="3" fill="#FF8FB1" opacity="0.7" /><ellipse cx="76" cy="64" rx="5" ry="3" fill="#FF8FB1" opacity="0.7" />
      <path d="M50 92 L50 84" stroke={INK} strokeWidth="2" opacity="0.4" />
    </g>
  );
}
function Pig() {
  return (
    <g>
      <path d="M34 82 L34 93 M66 82 L66 93" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M34 82 L34 92 M66 82 L66 92" stroke="#FF8FB1" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 30 L20 10 L40 22 Z M76 30 L80 10 L60 22 Z" fill="#FF8FB1" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <circle cx="50" cy="54" r="32" fill="#FF8FB1" stroke={INK} strokeWidth={S} />
      <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FFB8CF" stroke={INK} strokeWidth="3" />
      <ellipse cx="45" cy="62" rx="2.6" ry="3.6" fill={INK} /><ellipse cx="55" cy="62" rx="2.6" ry="3.6" fill={INK} />
      <Eye x={38} y={44} /><Eye x={62} y={44} />
    </g>
  );
}
function Bunny() {
  return (
    <g>
      <ellipse cx="40" cy="20" rx="7" ry="18" fill="#C9B6FF" stroke={INK} strokeWidth={S} />
      <ellipse cx="60" cy="20" rx="7" ry="18" fill="#C9B6FF" stroke={INK} strokeWidth={S} />
      <ellipse cx="40" cy="22" rx="3" ry="11" fill="#FFB8CF" /><ellipse cx="60" cy="22" rx="3" ry="11" fill="#FFB8CF" />
      <ellipse cx="50" cy="74" rx="25" ry="20" fill="#C9B6FF" stroke={INK} strokeWidth={S} />
      <ellipse cx="50" cy="78" rx="13" ry="11" fill="#fff" opacity="0.8" />
      <circle cx="50" cy="46" r="19" fill="#C9B6FF" stroke={INK} strokeWidth={S} />
      <Eye x={43} y={44} r={3.6} /><Eye x={57} y={44} r={3.6} />
      <path d="M47 52 L53 52 L50 56 Z" fill="#FF6FA3" />
      <path d="M50 56 Q46 60 43 58 M50 56 Q54 60 57 58" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------- band
function Drum() {
  return (
    <g>
      <path d="M30 14 L48 34 M70 14 L52 34" stroke="#C98444" strokeWidth="5" strokeLinecap="round" />
      <circle cx="30" cy="14" r="5" fill="#FFF5E1" stroke={INK} strokeWidth="2.6" /><circle cx="70" cy="14" r="5" fill="#FFF5E1" stroke={INK} strokeWidth="2.6" />
      <path d="M18 42 L18 80 C18 88 82 88 82 80 L82 42 Z" fill="#FF5A4E" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M18 46 L30 78 L42 46 L54 78 L66 46 L78 78" fill="none" stroke="#FFF5E1" strokeWidth="3" strokeLinejoin="round" />
      <path d="M18 80 C18 88 82 88 82 80" fill="none" stroke="#FFD43B" strokeWidth="5" />
      <ellipse cx="50" cy="42" rx="32" ry="10" fill="#FFF5E1" stroke={INK} strokeWidth={S} />
    </g>
  );
}
function Bell() {
  return (
    <g>
      <rect x="44" y="6" width="12" height="20" rx="5" fill="#C98444" stroke={INK} strokeWidth={S} />
      <path d="M26 74 C26 44 32 26 50 26 C68 26 74 44 74 74 L82 82 L18 82 Z" fill="#FFD43B" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <path d="M36 70 C36 48 40 36 48 32" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <circle cx="50" cy="88" r="6" fill="#C98444" stroke={INK} strokeWidth="3" />
      <path d="M8 46 Q4 54 8 62 M92 46 Q96 54 92 62" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
    </g>
  );
}
function Shaker() {
  return (
    <g>
      <path d="M58 60 L78 92" stroke={INK} strokeWidth="11" strokeLinecap="round" />
      <path d="M58 60 L78 92" stroke="#C98444" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="44" cy="38" rx="24" ry="30" transform="rotate(-32 44 38)" fill="#5BC85A" stroke={INK} strokeWidth={S} />
      <path d="M26 46 Q44 30 60 22" fill="none" stroke="#FFD43B" strokeWidth="5" strokeLinecap="round" />
      {[[34, 28], [50, 48], [30, 54], [56, 30]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill="#FFF5E1" />)}
      <path d="M8 22 L14 26 M10 40 L16 40 M76 8 L72 14" stroke={INK} strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
    </g>
  );
}
function Xylophone() {
  const bars = ["#FF5A4E", "#FF9F43", "#FFD43B", "#5BC85A", "#4D96FF"];
  return (
    <g>
      <path d="M8 46 L92 34 M8 82 L92 64" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M8 46 L92 34 M8 82 L92 64" stroke="#C98444" strokeWidth="2.4" strokeLinecap="round" />
      {bars.map((c, i) => {
        const x = 12 + i * 16;
        const top = 30 - i * 2.4 + 12;
        const h = 50 - i * 6;
        return <rect key={c} x={x} y={top} width="12" height={h} rx="3" fill={c} stroke={INK} strokeWidth="3" />;
      })}
      <path d="M62 22 L84 6" stroke="#C98444" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="24" r="6" fill="#FF8FB1" stroke={INK} strokeWidth="2.8" />
    </g>
  );
}

// ---------------------------------------------------------------- growing towers
function Tower({ n }: { n: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const y = 78 - (i + 1) * 9.6;
        return (
          <g key={i}>
            <rect x="34" y={y} width="32" height="9.6" rx="2" fill={i % 2 ? "#A98BFF" : CREW.zuzu} stroke={INK} strokeWidth="2.6" />
            <rect x="37" y={y + 2} width="10" height="2.4" rx="1.2" fill="#fff" opacity="0.5" />
          </g>
        );
      })}
      <path d="M22 78 L78 78 L74 86 L26 86 Z" fill="#FFF5E1" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
      <circle cx="32" cy="90" r="6" fill={INK} /><circle cx="68" cy="90" r="6" fill={INK} />
    </g>
  );
}

/** Prompt icon: Puff's parade pennant. */
function Pennant() {
  return (
    <g>
      <path d="M26 92 L26 8" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M28 12 L86 28 L28 46 Z" fill={CREW.puff} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M36 22 L60 28 L36 36" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="8" r="6" fill="#FFD43B" stroke={INK} strokeWidth="3" />
    </g>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  star: () => <FloatArt shape="star" />,
  heart: () => <FloatArt shape="heart" />,
  moon: () => <FloatArt shape="moon" />,
  leaf: () => <FloatArt shape="leaf" />,
  duck: Duck,
  frog: Frog,
  pig: Pig,
  bunny: Bunny,
  drum: Drum,
  bell: Bell,
  shaker: Shaker,
  xylophone: Xylophone,
  parade: Pennant,
};

/** Any marcher (or the prompt pennant) by art key. */
export function MarcherArt({ kind }: { kind: string }) {
  const n = towerSize(kind);
  const Art = ART[kind];
  return (
    <svg className="pp-art" viewBox="0 0 100 100" aria-hidden="true" overflow="visible">
      {n !== null ? <Tower n={n} /> : Art ? <Art /> : <Pennant />}
    </svg>
  );
}

// ---------------------------------------------------------------- scene
function Bunting({ y, sag, seed }: { y: number; sag: number; seed: number }) {
  const colors = ["#FF5A4E", "#FFD43B", "#4D96FF", "#6BCB77", "#FF8FB1", "#8E6CEF"];
  const n = 16;
  return (
    <g>
      <path d={`M-20 ${y} Q800 ${y + sag * 2} 1620 ${y}`} fill="none" stroke={INK} strokeWidth="4" opacity="0.8" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const x = -20 + t * 1640;
        const yy = y + 4 * sag * t * (1 - t);
        return <path key={i} d={`M${x - 26} ${yy} L${x + 26} ${yy} L${x} ${yy + 46} Z`} fill={colors[(i + seed) % colors.length]} stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
      })}
    </g>
  );
}

function House({ x, w, h, color, roof }: { x: number; w: number; h: number; color: string; roof: string }) {
  const base = 640;
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill={color} stroke={INK} strokeWidth="5" />
      <path d={`M${x - 14} ${base - h} L${x + w / 2} ${base - h - 70} L${x + w + 14} ${base - h} Z`} fill={roof} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {[0, 1].map((r) =>
        [0, 1].map((c) => <rect key={`${r}${c}`} x={x + 22 + c * (w - 74)} y={base - h + 28 + r * 70} width="30" height="38" rx="6" fill="#FFF3C4" stroke={INK} strokeWidth="4" />),
      )}
    </g>
  );
}

export function ParadeBackground() {
  return (
    <svg className="scene-bg pp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="pp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7CC8FF" />
          <stop offset="0.6" stopColor="#C6EBFF" />
          <stop offset="1" stopColor="#FFF1D6" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#pp-sky)" />
      <g className="cloud" fill="#fff" opacity="0.9">
        <ellipse cx="260" cy="150" rx="110" ry="38" /><ellipse cx="320" cy="126" rx="70" ry="44" />
      </g>
      <g className="cloud c2" fill="#fff" opacity="0.85">
        <ellipse cx="1180" cy="110" rx="130" ry="40" /><ellipse cx="1110" cy="92" rx="70" ry="40" />
      </g>
      <House x={40} w={220} h={250} color="#FFB8CF" roof="#8E6CEF" />
      <House x={330} w={190} h={300} color="#A9DCFF" roof="#FF5A4E" />
      <House x={590} w={240} h={230} color="#FFE08A" roof="#2EC4B6" />
      <House x={900} w={200} h={290} color="#C9F0C2" roof="#FF9F43" />
      <House x={1170} w={230} h={250} color="#E2D6FF" roof="#FF6FA3" />
      <House x={1460} w={200} h={310} color="#FFD3B0" roof="#4D96FF" />
      <Bunting y={250} sag={40} seed={0} />
      <rect x="0" y="640" width="1600" height="260" fill="#B7A8D9" />
      <rect x="0" y="640" width="1600" height="26" fill="#D9CFF0" stroke={INK} strokeWidth="5" />
      <path d="M0 790 L1600 790" stroke="#fff" strokeWidth="10" strokeDasharray="70 60" opacity="0.6" />
    </svg>
  );
}

export function ParadeStarSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Parade Star sticker: a gold star with a drum and a bell">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="96" fill="#FF8FB1" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <path key={i} d={`M120 120 L${120 + Math.cos(a) * 96} ${120 + Math.sin(a) * 96} L${120 + Math.cos(a + 0.26) * 96} ${120 + Math.sin(a + 0.26) * 96} Z`} fill="#FFB8CF" />;
      })}
      <path d={starPath(120, 104, 70, 32)} fill="#FFD43B" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <g transform="translate(64 108) scale(0.5)"><Drum /></g>
      <g transform="translate(126 108) scale(0.5)"><Bell /></g>
      <circle cx="120" cy="120" r="96" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M34 168 L206 168 L218 196 L196 194 L120 204 L44 194 L22 196 Z" fill="#8E6CEF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M34 168 L22 196 L8 178 Z M206 168 L218 196 L232 178 Z" fill="#6B4FD1" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <text x="120" y="192" textAnchor="middle" fontSize="20" fill="#fff" letterSpacing="1.2" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>PARADE STAR</text>
    </svg>
  );
}

export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

/** Puff, the parade host (mascot slot, intro card, celebration). */
export function ParadePuff({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  return <Puff state={state} talking={talking} size={size ?? "100%"} />;
}
