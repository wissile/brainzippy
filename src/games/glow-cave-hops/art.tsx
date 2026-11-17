import { Gloop, Zuzu } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import { useCart } from "./cart";

/**
 * Glow Cave Hops — original SVG art (BrainZippy Critter Crew style).
 * Background is flat, layered and outline-free (depth); interactive/foreground pieces carry the ink outline.
 * Light comes from radial gradients (no SVG blur filters, which are slow on low-end tablets).
 */

type Hue = "blue" | "pink" | "teal";
const LIT: Record<Hue, [string, string]> = { blue: ["#9BF0FF", "#3D8BFF"], pink: ["#FFB8EC", "#C25BE6"], teal: ["#A6FFF1", "#2EC4B6"] };
const DIM: Record<Hue, [string, string]> = { blue: ["#4A5BB0", "#2C2F78"], pink: ["#7A4AA8", "#4A2B7A"], teal: ["#3C6E8E", "#2A3F6E"] };

function Grads({ id }: { id: string }) {
  return (
    <>
      {(Object.keys(LIT) as Hue[]).map((h) => (
        <g key={h}>
          <linearGradient id={`${id}-${h}-on`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={LIT[h][0]} /><stop offset="1" stopColor={LIT[h][1]} /></linearGradient>
          <linearGradient id={`${id}-${h}-off`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={DIM[h][0]} /><stop offset="1" stopColor={DIM[h][1]} /></linearGradient>
        </g>
      ))}
      <radialGradient id={`${id}-glow-teal`}><stop offset="0" stopColor="#5CF2E0" stopOpacity="0.75" /><stop offset="1" stopColor="#5CF2E0" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glow-pink`}><stop offset="0" stopColor="#FF8FE0" stopOpacity="0.7" /><stop offset="1" stopColor="#FF8FE0" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glow-blue`}><stop offset="0" stopColor="#7FD8FF" stopOpacity="0.75" /><stop offset="1" stopColor="#7FD8FF" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-glow-gold`}><stop offset="0" stopColor="#FFE9A0" stopOpacity="0.9" /><stop offset="1" stopColor="#FFD43B" stopOpacity="0" /></radialGradient>
    </>
  );
}

/** One crystal prism. (x, y) = base centre. */
function Prism({ g, x, y, w, h, hue, lit, r = 0, outline = false }: { g: string; x: number; y: number; w: number; h: number; hue: Hue; lit: boolean; r?: number; outline?: boolean }) {
  const hw = w / 2;
  const shoulder = y - h * 0.78;
  return (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <path
        d={`M${x - hw} ${y} L${x - hw} ${shoulder} L${x} ${y - h} L${x + hw} ${shoulder} L${x + hw} ${y} Z`}
        fill={`url(#${g}-${hue}-${lit ? "on" : "off"})`}
        stroke={outline ? INK : "none"}
        strokeWidth={outline ? 4 : 0}
        strokeLinejoin="round"
      />
      {/* facet: lighter left face + a sparkle edge */}
      <path d={`M${x - hw} ${y} L${x - hw} ${shoulder} L${x} ${y - h} L${x - hw * 0.15} ${shoulder + h * 0.08} L${x - hw * 0.15} ${y} Z`} fill="#fff" opacity={lit ? 0.32 : 0.1} />
      <path d={`M${x - hw * 0.55} ${y - h * 0.2} L${x - hw * 0.55} ${shoulder + h * 0.05}`} stroke="#fff" strokeOpacity={lit ? 0.75 : 0.15} strokeWidth={Math.max(2, w * 0.09)} strokeLinecap="round" />
    </g>
  );
}

/** A cluster of crystals with a soft pool of light under it. */
function Cluster({ g, x, y, s = 1, hues, lit, flip = false }: { g: string; x: number; y: number; s?: number; hues: [Hue, Hue, Hue]; lit: boolean; flip?: boolean }) {
  const k = flip ? -1 : 1;
  return (
    <g className={`gc-cluster ${lit ? "on" : ""}`}>
      <ellipse cx={x} cy={y - 40 * s} rx={150 * s} ry={120 * s} fill={`url(#${g}-glow-${hues[1] === "pink" ? "pink" : "blue"})`} opacity={lit ? 0.9 : 0.18} className="gc-pool" />
      <Prism g={g} x={x - 40 * s * k} y={y} w={44 * s} h={120 * s} hue={hues[0]} lit={lit} r={-14 * k} />
      <Prism g={g} x={x + 44 * s * k} y={y} w={40 * s} h={104 * s} hue={hues[2]} lit={lit} r={16 * k} />
      <Prism g={g} x={x} y={y + 4} w={60 * s} h={190 * s} hue={hues[1]} lit={lit} />
    </g>
  );
}

function Mushroom({ g, x, y, s = 1, lit }: { g: string; x: number; y: number; s?: number; lit: boolean }) {
  return (
    <g className="gc-shroom">
      <circle cx={x} cy={y - 34 * s} r={70 * s} fill={`url(#${g}-glow-teal)`} opacity={lit ? 0.85 : 0.45} />
      <path d={`M${x - 9 * s} ${y} L${x - 7 * s} ${y - 30 * s} L${x + 7 * s} ${y - 30 * s} L${x + 9 * s} ${y} Z`} fill="#E9E4FF" />
      <path d={`M${x - 40 * s} ${y - 28 * s} Q${x} ${y - 78 * s} ${x + 40 * s} ${y - 28 * s} Q${x} ${y - 36 * s} ${x - 40 * s} ${y - 28 * s} Z`} fill="#62E8D6" />
      <path d={`M${x - 26 * s} ${y - 40 * s} Q${x - 10 * s} ${y - 58 * s} ${x + 6 * s} ${y - 60 * s}`} stroke="#E6FFFB" strokeOpacity="0.8" strokeWidth={5 * s} fill="none" strokeLinecap="round" />
      <circle cx={x + 14 * s} cy={y - 46 * s} r={4 * s} fill="#E6FFFB" />
    </g>
  );
}

const MOTES = Array.from({ length: 16 }, (_, i) => ({ x: (i * 383 + 140) % 1560 + 20, y: 160 + ((i * 227) % 520), r: 3 + (i % 3) * 1.5, d: (i % 6) * 0.9 }));

/** The glowing crystal cave. `lit` 0..8 = how many crystal clusters have woken up. */
export function CaveScene({ lit = 0, className = "scene-bg", id = "gcbg" }: { lit?: number; className?: string; id?: string }) {
  const L = Math.max(0, Math.min(8, lit));
  const on = (k: number) => k < L;
  return (
    <svg className={`${className} gc-cave`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-lit={L}>
      <defs>
        <Grads id={id} />
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#170F33" /><stop offset="0.55" stopColor="#2A1D5E" /><stop offset="1" stopColor="#1A1240" /></linearGradient>
        <radialGradient id={`${id}-haze-l`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#3FA7C2" stopOpacity="0.55" /><stop offset="1" stopColor="#3FA7C2" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-haze-r`} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#B04FB8" stopOpacity="0.45" /><stop offset="1" stopColor="#B04FB8" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-vignette`} cx="0.5" cy="0.55" r="0.75"><stop offset="0.55" stopColor="#0B0720" stopOpacity="0" /><stop offset="1" stopColor="#0B0720" stopOpacity="0.85" /></radialGradient>
        <linearGradient id={`${id}-ice`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A9F1FF" /><stop offset="1" stopColor="#3D8BFF" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <ellipse className="gc-haze" cx="440" cy="430" rx="620" ry="420" fill={`url(#${id}-haze-l)`} style={{ opacity: 0.55 + L * 0.06 }} />
      <ellipse className="gc-haze" cx="1240" cy="400" rx="560" ry="400" fill={`url(#${id}-haze-r)`} style={{ opacity: 0.5 + L * 0.06 }} />

      {/* far cave wall + rim-lit ridges */}
      <path d="M0 0 L0 520 Q120 300 60 140 Q40 60 0 0 Z" fill="#140D30" />
      <path d="M1600 0 L1600 560 Q1460 380 1540 180 Q1580 80 1600 0 Z" fill="#140D30" />
      <path d="M0 640 Q180 520 380 560 Q560 470 760 520 Q960 440 1140 500 Q1330 450 1600 520 L1600 900 L0 900 Z" fill="#2B1F61" />
      <path d="M0 640 Q180 520 380 560 Q560 470 760 520 Q960 440 1140 500 Q1330 450 1600 520" fill="none" stroke="#45C6D6" strokeOpacity={0.35 + L * 0.06} strokeWidth="5" />
      <path d="M0 730 Q260 650 520 690 Q800 610 1080 680 Q1340 630 1600 660 L1600 900 L0 900 Z" fill="#241A52" />

      {/* stalactites + hanging ice crystals */}
      <path d="M0 0 L1600 0 L1600 40 L1540 40 L1500 150 L1460 50 L1380 60 L1330 210 L1280 60 L1180 50 L1120 120 L1060 40 L860 40 L820 100 L780 40 L560 40 L500 170 L440 46 L320 40 L270 140 L220 40 L120 40 L80 110 L40 30 L0 30 Z" fill="#110A28" />
      {[[372, 40, 26, 120], [1700 - 300, 40, 22, 110], [980, 36, 18, 80], [640, 40, 14, 64]].map(([x, y, w, h], i) => (
        <g key={i} className="gc-ice" style={{ animationDelay: `${i * 0.7}s` }}>
          <path d={`M${x! - w! / 2} ${y} L${x! + w! / 2} ${y} L${x} ${y! + h!} Z`} fill={`url(#${id}-ice)`} opacity={0.65 + L * 0.04} />
          <path d={`M${x! - w! / 4} ${y} L${x} ${y! + h! * 0.8}`} stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />
        </g>
      ))}

      {/* crystal clusters wake up one by one (8 = whole round) */}
      <Cluster g={id} x={230} y={800} s={1.25} hues={["blue", "blue", "pink"]} lit={on(0)} />
      <Cluster g={id} x={1470} y={700} s={0.95} hues={["pink", "blue", "blue"]} lit={on(1)} flip />
      <Cluster g={id} x={760} y={540} s={0.5} hues={["pink", "pink", "blue"]} lit={on(2)} />
      <Cluster g={id} x={1130} y={520} s={0.55} hues={["blue", "teal", "pink"]} lit={on(3)} flip />
      <Cluster g={id} x={90} y={560} s={0.6} hues={["teal", "blue", "blue"]} lit={on(4)} />
      <Cluster g={id} x={1560} y={880} s={0.9} hues={["blue", "pink", "pink"]} lit={on(5)} flip />
      <Cluster g={id} x={470} y={575} s={0.42} hues={["blue", "teal", "blue"]} lit={on(6)} />
      <Cluster g={id} x={1300} y={500} s={0.45} hues={["pink", "blue", "teal"]} lit={on(7)} />

      <Mushroom g={id} x={420} y={830} s={1} lit={L > 0} />
      <Mushroom g={id} x={500} y={845} s={0.7} lit={L > 0} />
      <Mushroom g={id} x={1250} y={668} s={0.8} lit={L > 3} />
      <Mushroom g={id} x={960} y={512} s={0.5} lit={L > 5} />

      <g className="gc-motes">
        {MOTES.map((m, i) => (
          <g key={i} className="gc-mote" style={{ animationDelay: `${m.d}s` }}>
            <circle cx={m.x} cy={m.y} r={m.r * 2.2} fill="#7FF5E6" opacity="0.12" />
            <circle cx={m.x} cy={m.y} r={m.r} fill="#B8FFF6" />
          </g>
        ))}
      </g>

      <rect className="gc-warm" width="1600" height="900" fill={`url(#${id}-glow-gold)`} style={{ opacity: L * 0.05 }} />
      <rect width="1600" height="900" fill={`url(#${id}-vignette)`} style={{ opacity: Math.max(0.2, 1 - L * 0.1) }} />
    </svg>
  );
}

/** In-game background: brightens as the child solves exercises. */
export function CaveBackground() {
  const { lit } = useCart();
  return <CaveScene lit={lit} />;
}

/** Prompt icon / object art. */
export function CrystalArt(_: { kind: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs><Grads id="gcico" /></defs>
      <circle cx="50" cy="56" r="44" fill="url(#gcico-glow-blue)" />
      <Prism g="gcico" x={30} y={88} w={20} h={50} hue="pink" lit r={-16} outline />
      <Prism g="gcico" x={70} y={88} w={20} h={46} hue="teal" lit r={16} outline />
      <Prism g="gcico" x={50} y={90} w={28} h={78} hue="blue" lit outline />
    </svg>
  );
}

/** Shared gradient defs for the board's crystals (render once per board). */
export function BoardDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs><Grads id="gcst" /></defs>
    </svg>
  );
}

/** Board crystal: one per stop; lights up when the cart lands there on a correct answer. */
export function StopCrystal({ lit, hue }: { lit: boolean; hue: Hue }) {
  return (
    <svg viewBox="0 0 60 70" aria-hidden="true" overflow="visible">
      <Prism g="gcst" x={20} y={68} w={14} h={36} hue={hue} lit={lit} r={-14} outline />
      <Prism g="gcst" x={40} y={68} w={13} h={30} hue={hue === "pink" ? "blue" : "pink"} lit={lit} r={14} outline />
      <Prism g="gcst" x={30} y={69} w={18} h={56} hue={hue} lit={lit} outline />
    </svg>
  );
}

export const BasketStub = () => <svg aria-hidden="true" />;

/** The mine cart (viewBox units: 200 wide, cart body from y=120 to 250). */
function CartShape({ moving }: { moving: boolean }) {
  return (
    <g>
      <defs>
        <linearGradient id="gc-cart-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFB062" /><stop offset="1" stopColor="#E8702A" /></linearGradient>
      </defs>
      <path d="M26 140 L174 140 L158 222 L42 222 Z" fill="url(#gc-cart-body)" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <rect x="12" y="124" width="176" height="24" rx="10" fill="#FFC88A" stroke={INK} strokeWidth="6" />
      <path d="M44 180 L156 180" stroke="#B9531C" strokeWidth="7" strokeLinecap="round" />
      <path d="M40 160 L160 160" stroke="#FFD7A8" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
      {[52, 148].map((x) => <circle key={x} cx={x} cy={200} r="5" fill="#B9531C" />)}
      {[64, 136].map((x) => (
        <g key={x} className={`gc-wheel ${moving ? "spin" : ""}`}>
          <circle cx={x} cy={228} r="18" fill="#3B2F5E" stroke={INK} strokeWidth="6" />
          <path d={`M${x - 11} 228 L${x + 11} 228 M${x} 217 L${x} 239`} stroke="#8D7BD6" strokeWidth="4" strokeLinecap="round" />
          <circle cx={x} cy={228} r="5" fill="#C9BBFF" />
        </g>
      ))}
    </g>
  );
}

/** Gloop riding the mine cart. Wheels sit on y=246 of a 200×250 box. */
export function GloopCart({ state = "idle", moving = false }: { state?: MascotState; moving?: boolean }) {
  return (
    <svg className="gc-cartsvg" viewBox="0 0 200 250" overflow="visible" aria-hidden="true">
      <g transform="translate(26 -4)"><Gloop size={148} state={state} /></g>
      <CartShape moving={moving} />
    </svg>
  );
}

/** Zuzu with her glowing lantern (replaces her pencil for this game). Same props as the Crew characters. */
export function ZuzuLantern({ state = "idle", talking = false, size = 160 }: { state?: MascotState; talking?: boolean; size?: number | string }) {
  const bright = state === "celebrating" || state === "greeting";
  return (
    <svg
      className={`gc-zuzu state-${state} ${talking ? "is-talking" : ""} ${bright ? "bright" : ""}`}
      viewBox="0 0 230 230"
      width={size}
      overflow="visible"
      role="img"
      aria-label="Zuzu, a purple three-eyed monster holding a glowing lantern"
    >
      <defs>
        <radialGradient id="gc-lantern-glow"><stop offset="0" stopColor="#FFF2B0" stopOpacity="0.95" /><stop offset="0.45" stopColor="#FFD43B" stopOpacity="0.45" /><stop offset="1" stopColor="#FFB52E" stopOpacity="0" /></radialGradient>
      </defs>
      <circle className="gc-lantern-halo" cx="178" cy="138" r="62" fill="url(#gc-lantern-glow)" />
      <Zuzu size={200} state={state} talking={talking} />
      <g className="gc-lantern">
        <path d="M170 112 Q178 100 186 112" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <rect x="166" y="112" width="24" height="8" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="4" />
        <rect x="164" y="119" width="28" height="34" rx="9" fill="#FFF3B8" stroke={INK} strokeWidth="4.5" />
        <path className="gc-flame" d="M178 146 Q170 137 178 126 Q186 137 178 146 Z" fill="#FFB52E" />
        <path d="M170 124 L170 146" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        <rect x="166" y="152" width="24" height="8" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="4" />
      </g>
    </svg>
  );
}

/** Achievement sticker: "Cave Explorer". */
export function CaveExplorerSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Cave Explorer sticker: glowing crystals and a lantern">
      <defs>
        <Grads id="gcsk" />
        <radialGradient id="gcsk-bg" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stopColor="#4A3A9A" /><stop offset="1" stopColor="#1E1548" /></radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="url(#gcsk-bg)" />
      <circle cx="120" cy="112" r="70" fill="url(#gcsk-glow-blue)" />
      <Prism g="gcsk" x={88} y={158} w={30} h={72} hue="pink" lit r={-18} outline />
      <Prism g="gcsk" x={152} y={158} w={28} h={66} hue="teal" lit r={18} outline />
      <Prism g="gcsk" x={120} y={162} w={40} h={112} hue="blue" lit outline />
      <g transform="translate(150 58)">
        <circle cx="16" cy="30" r="30" fill="url(#gcsk-glow-gold)" />
        <path d="M8 6 Q16 -6 24 6" fill="none" stroke={INK} strokeWidth="4" />
        <rect x="4" y="6" width="24" height="7" rx="3" fill="#FF9F43" stroke={INK} strokeWidth="3.5" />
        <rect x="2" y="12" width="28" height="30" rx="8" fill="#FFF3B8" stroke={INK} strokeWidth="4" />
        <path d="M16 36 Q9 28 16 18 Q23 28 16 36 Z" fill="#FFB52E" />
      </g>
      <path d="M60 172 Q120 150 180 172" stroke="#5CF2E0" strokeWidth="6" fill="none" strokeDasharray="2 12" strokeLinecap="round" />
      <path id="gc-sticker-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill="#fff" letterSpacing="1.5">
        <textPath href="#gc-sticker-arc" startOffset="50%" textAnchor="middle">CAVE EXPLORER</textPath>
      </text>
    </svg>
  );
}

/** Story prop: a short glowing number line with hop arcs (0..n). */
export function StoryTrack({ n = 6, from = 1, hops = 3, glow = false }: { n?: number; from?: number; hops?: number; glow?: boolean }) {
  const sp = 1000 / (n + 1);
  const x = (i: number) => (i + 0.5) * sp;
  return (
    <svg viewBox="0 0 1000 260" aria-hidden="true" className="gc-storytrack">
      <rect x="0" y="70" width="1000" height="10" rx="5" fill="#C9BBFF" />
      {Array.from({ length: n + 1 }, (_, i) => <rect key={`s${i}`} x={x(i) - 26} y="80" width="52" height="14" rx="4" fill="#7A4A2E" />)}
      {Array.from({ length: hops }, (_, i) => {
        const a = x(from + i), b = x(from + i + 1);
        return (
          <g key={`a${i}`} className={glow ? "gc-story-arc" : ""} style={{ animationDelay: `${i * 0.5}s` }}>
            <path d={`M${a} 160 Q${(a + b) / 2} 100 ${b} 160`} fill="none" stroke="#FFD43B" strokeWidth="7" strokeDasharray="12 10" strokeLinecap="round" />
            <text x={(a + b) / 2} y="122" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="34" fill="#FFE27A">+1</text>
          </g>
        );
      })}
      {Array.from({ length: n + 1 }, (_, i) => {
        const isStart = i === from;
        const isEnd = i === from + hops;
        return (
          <g key={`n${i}`}>
            <circle cx={x(i)} cy="205" r="40" fill={isStart ? "#2EC4B6" : isEnd && glow ? "#FFD43B" : "#3A2A7A"} stroke={INK} strokeWidth="6" />
            <text x={x(i)} y="221" textAnchor="middle" fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="46" fill={isEnd && glow ? INK : "#fff"}>{i}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Story composition: the number-line track with Gloop's cart riding on it (and Zuzu on a ledge), so they stay on the rail at any aspect ratio. */
export function StoryRide({ n = 6, from = 1, hops = 0, glow = false, cart, zuzu }: {
  n?: number; from?: number; hops?: number; glow?: boolean;
  cart?: { state: MascotState; at?: number };
  zuzu?: { state: MascotState; talking?: boolean; enter?: boolean };
}) {
  return (
    <div className="gc-ride">
      <StoryTrack n={n} from={from} hops={hops} glow={glow} />
      {cart && (
        <div className="gc-ride-cart" style={{ left: `${(((cart.at ?? from) + 0.5) / (n + 1)) * 100}%` }}>
          <GloopCart state={cart.state} />
        </div>
      )}
      {zuzu && (
        <div className={`gc-ride-zuzu ${zuzu.enter ? "enter" : ""}`}>
          <ZuzuLantern state={zuzu.state} talking={zuzu.talking} size="100%" />
          <svg viewBox="0 0 200 40" className="gc-ledge" aria-hidden="true">
            <path d="M8 8 Q100 -6 192 8 L178 36 Q100 44 22 36 Z" fill="#3A2A7A" stroke="#2B2140" strokeWidth="5" strokeLinejoin="round" />
            <path d="M30 10 Q100 2 170 10" stroke="#5CF2E0" strokeOpacity="0.6" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
