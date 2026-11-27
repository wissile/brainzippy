import { Bobbo } from "../../characters/Bobbo";
import { Gloop } from "../../characters/Crew";
import { CREW, INK } from "../../characters/palette";
import { type Shape, type SizeKind, type ToyColour, type Variant, type WallThing, parseSize, parseThing, parseToy } from "./generator";

/**
 * Original art for Gloop's Bubble Bath. Critter Crew style: ink outlines, flat bright fills, soft white highlights.
 * Every shape is drawn from one geometry (shapePoints) so the toys, the holes, the wall things and the corner hints
 * always agree. Size Line pieces sit on a shared baseline so only their size differs. No text in the art except the
 * sticker rim and the numerals the children count.
 */
export const GB = {
  wall: "#D8F4EF",
  wallLine: "#B7E6DE",
  floor: "#F7D9B5",
  water: "#9EE3F0",
  waterDeep: "#5FC6DC",
  foam: "#FFFFFF",
  tub: "#FFFDF8",
  tubShade: "#E4EEF2",
  night: "#3B3F86",
  duck: "#FFD43B",
  duckDeep: "#E9A700",
  beak: "#FF8A2B",
  wood: "#E7A86A",
  woodDeep: "#B9763F",
  sponge: "#FFE27A",
  spongeDeep: "#E8B730",
  boat: "#FF6B6B",
  boatDeep: "#C8424A",
} as const;
export const TOY_FILL: Record<ToyColour, string> = { red: "#F2545B", blue: "#4D96FF", yellow: "#FFD43B", green: "#5BC46A" };

// ---------------------------------------------------------------- shape geometry (100 × 100 box, centre 50,50)

/** Triangles: 0 regular (equal sides) · 1 long and thin · 2 lopsided (right angle top-left, all sides different). */
export function shapePoints(shape: Shape, variant: Variant = 0): [number, number][] {
  if (shape === "square") return [[20, 20], [80, 20], [80, 80], [20, 80]];
  if (shape === "triangle") return variant === 1 ? [[50, 6], [70, 92], [30, 92]] : variant === 2 ? [[24, 14], [88, 14], [24, 58]] : [[50, 16], [88, 82], [12, 82]];
  return [];
}
const poly = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(" L")} Z`;
/** The outline of a shape as a path (circle r 38). */
export const shapePath = (shape: Shape, variant: Variant = 0) => (shape === "circle" ? "M12 50 A38 38 0 1 0 88 50 A38 38 0 1 0 12 50 Z" : poly(shapePoints(shape, variant)));

/** Numbered corner dots (the hint that counts corners). `upTo` = how many are lit (−1 = all). */
function Corners({ shape, variant, upTo = -1 }: { shape: Shape; variant: Variant; upTo?: number }) {
  return (
    <g className="gb-corners">
      {shapePoints(shape, variant).map(([x, y], i) => (upTo < 0 || i <= upTo) && (
        <circle key={i} cx={x} cy={y} r="7" fill="#FFD43B" stroke={INK} strokeWidth="3" className={i === upTo ? "is-now" : ""} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- foam bath toys and the toy-box holes

export function FoamToy({ art, className = "" }: { art: string | undefined; className?: string }) {
  const t = parseToy(art);
  const fill = TOY_FILL[t.colour] ?? TOY_FILL.red;
  const s = t.scale / 100;
  return (
    <svg viewBox="0 0 100 100" className={`gb-toy ${className}`} aria-hidden="true">
      <g transform={`translate(50 50) scale(${s}) rotate(${t.rot}) translate(-50 -50)`}>
        <path d={shapePath(t.shape, t.variant)} fill={fill} stroke={INK} strokeWidth={6 / s} strokeLinejoin="round" />
        <path d={shapePath(t.shape, t.variant)} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth={5 / s} strokeLinejoin="round" transform="translate(50 50) scale(0.72) translate(-50 -50)" />
        {/* foam pores */}
        <circle cx="44" cy="58" r="3" fill="#fff" opacity="0.4" /><circle cx="58" cy="50" r="2.4" fill="#fff" opacity="0.4" />
      </g>
    </svg>
  );
}

export function Hole({ shape }: { shape: Shape }) {
  return (
    <svg viewBox="0 0 100 100" className="gb-hole-art" aria-hidden="true">
      <path d={shapePath(shape)} fill="#2E3F66" stroke={INK} strokeWidth="6" strokeLinejoin="round" transform="translate(50 50) scale(0.86) translate(-50 -50)" />
      <path d={shapePath(shape)} fill="none" stroke="#13203D" strokeWidth="8" opacity="0.5" transform="translate(50 54) scale(0.74) translate(-50 -50)" />
    </svg>
  );
}

// ---------------------------------------------------------------- things on the bathroom wall (Shape Splash: find)

export function WallThingArt({ art, corners = false, upTo = -1, className = "" }: { art: string | undefined; corners?: boolean; upTo?: number; className?: string }) {
  const { thing, shape, rot, variant } = parseThing(art);
  return (
    <svg viewBox="0 0 100 100" className={`gb-thing ${className}`} aria-hidden="true">
      <g transform={`rotate(${rot} 50 50)`}>
        <ThingBody thing={thing} variant={variant} />
        {corners && shape !== "circle" && <Corners shape={shape} variant={variant} upTo={upTo} />}
      </g>
      {corners && shape === "circle" && upTo >= 0 && <path d={shapePath("circle")} fill="none" stroke="#FFD43B" strokeWidth="7" strokeDasharray="10 8" className="gb-trace" />}
    </svg>
  );
}

/** Flat things only: each one's outline is exactly its shape (no balls, boxes or other solids). */
function ThingBody({ thing, variant }: { thing: WallThing; variant: Variant }) {
  switch (thing) {
    case "mirror":
      return <>
        <path d={shapePath("circle")} fill="#F7C948" stroke={INK} strokeWidth="6" />
        <circle cx="50" cy="50" r="29" fill="#BFEAF5" stroke={INK} strokeWidth="4" />
        <path d="M36 40 L48 28 M38 52 L58 32" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      </>;
    case "clock":
      return <>
        <path d={shapePath("circle")} fill="#fff" stroke={INK} strokeWidth="6" />
        {[0, 90, 180, 270].map((a) => <rect key={a} x="48" y="17" width="4" height="9" rx="2" fill={INK} transform={`rotate(${a} 50 50)`} />)}
        <path d="M50 50 L50 30 M50 50 L64 56" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill={CREW.puff} stroke={INK} strokeWidth="2" />
      </>;
    case "mat":
      // a round bath mat lying flat: rings, no shading
      return <>
        <path d={shapePath("circle")} fill={CREW.puff} stroke={INK} strokeWidth="6" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="6 6" />
        <circle cx="50" cy="50" r="12" fill="#FFD1E1" />
      </>;
    case "window":
      return <>
        <path d={shapePath("square")} fill={GB.night} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <circle cx="64" cy="34" r="7" fill="#FFE27A" />
        <circle cx="34" cy="62" r="2.5" fill="#fff" /><circle cx="66" cy="68" r="2" fill="#fff" />
        <path d="M50 20 V80 M20 50 H80" stroke="#fff" strokeWidth="6" />
        <path d={shapePath("square")} fill="none" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      </>;
    case "tile":
      return <>
        <path d={shapePath("square")} fill="#8FE0D6" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <path d="M30 30 H70 V70 H30 Z" fill="none" stroke="#fff" strokeWidth="4" opacity="0.8" />
        <path d="M38 52 Q50 40 62 52 L58 52 Q50 46 42 52 Z" fill={CREW.gloop} />
        <circle cx="66" cy="44" r="3" fill="#fff" />
      </>;
    case "frame":
      // a square picture frame with a little boat picture
      return <>
        <path d={shapePath("square")} fill={GB.wood} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <rect x="31" y="31" width="38" height="38" fill="#DDF3FF" stroke={INK} strokeWidth="3.5" />
        <path d="M36 58 H64 L60 64 H40 Z" fill={GB.boat} />
        <path d="M50 38 V56 L60 56 Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </>;
    case "flag":
      // a pennant hanging from its pole: the cloth is a lopsided triangle (right angle at the pole)
      return <>
        <path d="M24 8 V94" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <circle cx="24" cy="8" r="5" fill={CREW.sparkle} stroke={INK} strokeWidth="3" />
        <path d={shapePath("triangle", 2)} fill={CREW.bobbo} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <circle cx="42" cy="28" r="5" fill="#fff" opacity="0.85" />
      </>;
    case "sign":
      // a bath-time sign: a duck picture inside a triangle, no words
      return <>
        <path d={shapePath("triangle", variant)} fill={CREW.sparkle} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <g transform={variant === 1 ? "translate(41 54) scale(0.18)" : "translate(37 50) scale(0.26)"}><Duck /></g>
      </>;
  }
}

// ---------------------------------------------------------------- ducks, boats, sponges, bubbles

export function Duck({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 100 90" className={`gb-duck ${className}`} aria-hidden="true">
      <g transform={flip ? "translate(100 0) scale(-1 1)" : undefined}>
        <path d="M14 52 Q12 84 50 84 Q86 84 88 58 Q90 44 76 46 Q70 50 60 48 L40 48 Q22 46 14 52 Z" fill={GB.duck} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M30 62 Q46 72 62 60" fill="none" stroke={GB.duckDeep} strokeWidth="5" strokeLinecap="round" />
        <circle cx="38" cy="32" r="20" fill={GB.duck} stroke={INK} strokeWidth="5" />
        <path d="M18 34 Q6 34 4 40 Q12 46 22 42 Z" fill={GB.beak} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="34" cy="28" r="4.5" fill={INK} /><circle cx="35.5" cy="26.5" r="1.5" fill="#fff" />
        <path d="M44 20 Q50 18 54 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

/** A Size Line piece: drawn at `size` % on a shared baseline so only the size differs between pieces. */
export function SizePiece({ art, ghost = false, className = "" }: { art: string | undefined; ghost?: boolean; className?: string }) {
  const { kind, size } = parseSize(art);
  const s = size / 100;
  return (
    <svg viewBox="0 0 100 100" className={`gb-piece-art ${ghost ? "is-ghost" : ""} ${className}`} aria-hidden="true">
      <g transform={`translate(50 94) scale(${s}) translate(-50 -94)`}>{kind === "boat" ? <Boat ghost={ghost} /> : <Sponge ghost={ghost} />}</g>
    </svg>
  );
}
function Boat({ ghost }: { ghost: boolean }) {
  if (ghost) return <path d="M8 66 L92 66 L80 94 L20 94 Z M48 10 L48 62 L84 62 Z" fill="rgba(43,33,64,0.12)" stroke={INK} strokeOpacity="0.45" strokeWidth="4" strokeDasharray="8 6" strokeLinejoin="round" />;
  return <>
    <path d="M48 10 L48 62 L84 62 Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M44 14 L44 62 L18 62 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M8 66 L92 66 L80 94 L20 94 Z" fill={GB.boat} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M18 76 H82" stroke="#fff" strokeWidth="4" opacity="0.6" />
    <circle cx="36" cy="82" r="4" fill="#fff" stroke={INK} strokeWidth="2.5" /><circle cx="64" cy="82" r="4" fill="#fff" stroke={INK} strokeWidth="2.5" />
  </>;
}
function Sponge({ ghost }: { ghost: boolean }) {
  if (ghost) return <rect x="10" y="34" width="80" height="60" rx="14" fill="rgba(43,33,64,0.12)" stroke={INK} strokeOpacity="0.45" strokeWidth="4" strokeDasharray="8 6" />;
  return <>
    <rect x="10" y="34" width="80" height="60" rx="14" fill={GB.sponge} stroke={INK} strokeWidth="5" />
    <rect x="10" y="34" width="80" height="16" rx="8" fill="#6BCB77" stroke={INK} strokeWidth="5" />
    {[[30, 66, 6], [56, 74, 5], [72, 60, 4], [42, 82, 4], [24, 84, 3]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={GB.spongeDeep} />)}
  </>;
}

/** A parade bubble with its numeral and (lower levels) that many dots. */
export function ParadeBubble({ k, dots, popped = false }: { k: number | null; dots: boolean; popped?: boolean }) {
  const DOT: Record<number, [number, number][]> = { 1: [[50, 0]], 2: [[42, 0], [58, 0]], 3: [[34, 0], [50, 0], [66, 0]], 4: [[42, -6], [58, -6], [42, 6], [58, 6]], 5: [[34, -6], [50, -6], [66, -6], [42, 6], [58, 6]] };
  return (
    <svg viewBox="0 0 100 100" className={`gb-pbubble ${popped ? "is-popped" : ""}`} aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="rgba(210,245,255,0.75)" stroke={INK} strokeWidth="4" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#B7A6FF" strokeWidth="3" strokeDasharray="30 22" opacity="0.7" />
      <path d="M24 38 Q28 24 42 18" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      {k !== null && <text x="50" y={dots ? 58 : 66} textAnchor="middle" className="gb-pnum">{k}</text>}
      {dots && k !== null && <g transform="translate(0 78)">{(DOT[k] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.6" fill={CREW.zuzu} stroke={INK} strokeWidth="1.5" />)}</g>}
    </svg>
  );
}

/** A plain bath bubble (prompt icon and sign: no numeral, so it never hints at an answer). */
export function PlainBubble() {
  return (
    <svg viewBox="0 0 100 100" className="gb-plain-bubble" aria-hidden="true">
      <circle cx="40" cy="58" r="30" fill="rgba(210,245,255,0.85)" stroke={INK} strokeWidth="5" />
      <circle cx="74" cy="34" r="18" fill="rgba(210,245,255,0.85)" stroke={INK} strokeWidth="5" />
      <path d="M22 50 Q26 36 40 32" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M66 30 Q68 24 75 22" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Dot picture for a number answer (the dots of a dice) — a quantity picture next to the numeral. */
export function DicePicture({ n }: { n: number }) {
  const P: Record<number, [number, number][]> = { 1: [[20, 20]], 2: [[10, 10], [30, 30]], 3: [[10, 10], [20, 20], [30, 30]], 4: [[10, 10], [30, 10], [10, 30], [30, 30]], 5: [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]] };
  return (
    <svg viewBox="0 0 40 40" className="gb-dice" aria-hidden="true" data-testid="choice-dots" data-n={n}>
      <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="#fff" stroke={INK} strokeWidth="3" />
      {(P[n] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.6" fill={INK} />)}
    </svg>
  );
}

// ---------------------------------------------------------------- background

export function BathBackground({ tub = true }: { tub?: boolean } = {}) {
  return (
    <svg className="scene-bg bg gb-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1600" height="900" fill={GB.wall} />
      {/* tiles */}
      {Array.from({ length: 14 }, (_, i) => <path key={`v${i}`} d={`M${i * 120} 0 V620`} stroke={GB.wallLine} strokeWidth="4" />)}
      {Array.from({ length: 6 }, (_, i) => <path key={`h${i}`} d={`M0 ${i * 120} H1600`} stroke={GB.wallLine} strokeWidth="4" />)}
      <rect y="560" width="1600" height="60" fill="#8FE0D6" />
      <path d="M0 560 H1600" stroke={INK} strokeWidth="5" opacity="0.25" />
      {/* night window: it is nearly bedtime */}
      <g transform="translate(1210 90)">
        <rect width="250" height="210" rx="22" fill={GB.night} stroke={INK} strokeWidth="8" />
        <circle cx="180" cy="62" r="30" fill="#FFE27A" /><circle cx="194" cy="52" r="28" fill={GB.night} />
        {[[50, 50], [92, 130], [150, 160], [40, 160]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="#fff" className="gb-twinkle" style={{ animationDelay: `${i * 0.6}s` }} />)}
        <path d="M125 0 V210 M0 105 H250" stroke="#fff" strokeWidth="10" />
        <rect width="250" height="210" rx="22" fill="none" stroke={INK} strokeWidth="8" />
      </g>
      {/* towel rail with Gloop's towel */}
      <g transform="translate(110 150)">
        <path d="M0 0 H260" stroke="#B9C4D6" strokeWidth="14" strokeLinecap="round" />
        <path d="M40 0 H210 V200 Q170 214 125 200 Q80 214 40 200 Z" fill={CREW.gloop} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
        <path d="M40 160 H210 M40 176 H210" stroke="#fff" strokeWidth="8" opacity="0.6" />
      </g>
      {/* floor */}
      <rect y="620" width="1600" height="280" fill={GB.floor} />
      <path d="M0 620 H1600" stroke={INK} strokeWidth="6" opacity="0.3" />
      {/* the bathtub and its foam */}
      {tub && <g transform="translate(240 600)">
        <path d="M0 40 H1120 Q1110 250 900 270 H220 Q10 250 0 40 Z" fill={GB.tub} stroke={INK} strokeWidth="8" strokeLinejoin="round" />
        <path d="M30 70 H1090" stroke={GB.tubShade} strokeWidth="14" strokeLinecap="round" />
        <rect x="-20" y="22" width="1160" height="34" rx="17" fill={GB.tub} stroke={INK} strokeWidth="8" />
        <path d="M200 270 L180 320 M920 270 L940 320" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        {[[60, 10, 46], [150, -4, 58], [270, 12, 40], [820, 6, 50], [930, -8, 60], [1050, 10, 44]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={GB.foam} stroke={INK} strokeWidth="5" opacity="0.95" />
        ))}
      </g>}
      {([[200, 420, 22], [330, 360, 14], [1420, 430, 18], [1500, 360, 12], [760, 80, 16], [880, 150, 10]] as const).map(([x, y, r], i) => (
        <g key={i} className="gb-float" style={{ animationDelay: `${i * 0.9}s` }}>
          <circle cx={x} cy={y} r={r} fill="rgba(255,255,255,0.55)" stroke="#7FC7D9" strokeWidth="3" />
          <path d={`M${x - r * 0.5} ${y - r * 0.2} Q${x - r * 0.4} ${y - r * 0.6} ${x} ${y - r * 0.7}`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- sticker, icons, basket stub

/** "Bubble Buddy" sticker: a round badge with a rubber duck riding a big bubble, sparkles and the name on the rim. */
export function BubbleBuddySticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Bubble Buddy sticker: a rubber duck sitting on a big shiny bubble">
      <circle cx="120" cy="120" r="114" fill={CREW.gloop} stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="88" fill="#E6FBF8" stroke={INK} strokeWidth="4" />
      <circle cx="120" cy="138" r="54" fill="rgba(190,236,255,0.9)" stroke={INK} strokeWidth="5" />
      <path d="M84 120 Q90 98 112 90" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <circle cx="150" cy="168" r="8" fill="#fff" opacity="0.8" />
      <g transform="translate(88 52) scale(0.66)"><Duck /></g>
      <circle cx="58" cy="96" r="12" fill="rgba(255,255,255,0.7)" stroke={INK} strokeWidth="3" />
      <circle cx="184" cy="92" r="9" fill="rgba(255,255,255,0.7)" stroke={INK} strokeWidth="3" />
      <path d="M180 140 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path id="gb-arc" d="M14.7 132 A106 106 0 0 0 225.3 132" fill="none" />
      <text className="gb-sticker-text" fill="#fff"><textPath href="#gb-arc" startOffset="50%" textAnchor="middle">BUBBLE BUDDY</textPath></text>
    </svg>
  );
}

const SIMPLE_TOY: Record<string, string> = { circle: "toy~circle~blue~0~90~0", square: "toy~square~red~0~90~0", triangle: "toy~triangle~green~0~90~0", toy: "toy~triangle~yellow~0~90~0" };
export function BathIcon({ kind }: { kind: string }) {
  if (kind === "duck") return <Duck />;
  if (kind === "bubble") return <PlainBubble />;
  if (kind === "boat" || kind === "sponge") return <SizePiece art={`size~${kind as SizeKind}~100`} />;
  if (kind === "gloop") return <Gloop state="idle" size="100%" />;
  if (kind === "bobbo") return <Bobbo state="idle" size="100%" />;
  return <FoamToy art={SIMPLE_TOY[kind] ?? SIMPLE_TOY.toy} />;
}
export function NoBasket() {
  return <span className="gb-no-basket" aria-hidden="true" />;
}
