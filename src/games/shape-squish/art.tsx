import { useSyncExternalStore } from "react";
import { Gloop } from "../../characters/Crew";
import { CREW, INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import {
  JELLY, KINDS, ellipseOf, gapCells, outlinePoints, packOutline, parseShape, piecePoints, shapePoints, toPath,
  type OutlineType, type PieceKind, type PieceSpec, type ShapeSpec,
} from "./shapes";
import { hostStore } from "./store";

/** Original art for Gloop's Shape Squish: the jelly pond garden, gates with shaped holes, jelly shapes, jars, outlines. */

type Pt = readonly [number, number];
const centroid = (pts: readonly Pt[]): Pt => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/** Numbered side badges (the "trace and count the sides" hint) and corner dots. `upTo` = how many sides to number. */
function SideMarks({ pts, upTo, corners, scale = 1 }: { pts: readonly Pt[]; upTo: number; corners?: boolean; scale?: number }) {
  const c = centroid(pts);
  return (
    <g className="ss-marks" aria-hidden="true">
      {pts.slice(0, Math.max(0, upTo)).map((p, i) => {
        const q = pts[(i + 1) % pts.length]!;
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        const d = Math.hypot(mx - c[0], my - c[1]) || 1;
        const off = 9 * scale;
        const x = mx + ((mx - c[0]) / d) * off;
        const y = my + ((my - c[1]) / d) * off;
        return (
          <g key={i} className="ss-side">
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#fff" strokeWidth={5 * scale} strokeLinecap="round" />
            <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#FF4F8B" strokeWidth={2.6 * scale} strokeLinecap="round" strokeDasharray={`${4 * scale} ${3 * scale}`} />
            <circle cx={x} cy={y} r={7.5 * scale} fill="#fff" stroke={INK} strokeWidth={2.2 * scale} />
            <text x={x} y={y + 3.6 * scale} textAnchor="middle" fontSize={10.5 * scale} fontWeight="800" fontFamily="'Baloo 2', sans-serif" fill={INK}>{i + 1}</text>
          </g>
        );
      })}
      {corners && pts.map((p, i) => <circle key={`c${i}`} cx={p[0]} cy={p[1]} r={3.6 * scale} fill={CREW.sparkle} stroke={INK} strokeWidth={1.8 * scale} />)}
    </g>
  );
}

/** "Round all the way" hint for circles and ovals. */
const RoundMark = ({ rx, ry, rot }: { rx: number; ry: number; rot: number }) => (
  <ellipse className="ss-round" cx="50" cy="50" rx={rx + 6} ry={ry + 6} transform={`rotate(${rot} 50 50)`} fill="none" stroke="#FF4F8B" strokeWidth="3" strokeDasharray="5 4" />
);

/** The shape outline of a spec as an SVG element (polygon or ellipse) in the 100 box. */
function ShapeGeom({ spec, ...rest }: { spec: ShapeSpec } & React.SVGProps<SVGPathElement & SVGEllipseElement>) {
  const e = ellipseOf(spec);
  if (e) return <ellipse cx="50" cy="50" rx={e.rx} ry={e.ry} transform={`rotate(${e.rot} 50 50)`} {...rest} />;
  return <path d={toPath(shapePoints(spec))} strokeLinejoin="round" {...rest} />;
}

/** A jelly shape (find / sort pieces, prompt icons). `trace` numbers the sides; `corners` dots the corners. */
export function JellyShape({ spec, trace = 0, corners = false }: { spec: ShapeSpec; trace?: number; corners?: boolean }) {
  const fill = JELLY[spec.color % JELLY.length]!;
  const pts = shapePoints(spec);
  const e = ellipseOf(spec);
  return (
    <svg className="ss-jelly" viewBox="-6 -6 112 112" overflow="visible" aria-hidden="true">
      <g transform="translate(0 3)" opacity="0.18"><ShapeGeom spec={spec} fill={INK} /></g>
      <ShapeGeom spec={spec} fill={fill} stroke={INK} strokeWidth="4" />
      <g transform="translate(50 50) scale(0.62) translate(-50 -46)" opacity="0.38"><ShapeGeom spec={spec} fill="#fff" /></g>
      {trace > 0 && pts.length > 0 && <SideMarks pts={pts} upTo={trace} corners={corners} />}
      {trace > 0 && e && <RoundMark {...e} />}
      {trace === 0 && corners && pts.length > 0 && <SideMarks pts={pts} upTo={0} corners />}
    </svg>
  );
}

/** Gloop squished into a shape: teal jelly in the shape, with Gloop's big eye, mouth and antenna drop. */
export function GloopShape({ spec, state = "idle", trace = 0 }: { spec: ShapeSpec; state?: MascotState; trace?: number }) {
  const pts = shapePoints(spec);
  const e = ellipseOf(spec);
  const top = pts.length ? Math.min(...pts.map((p) => p[1])) : 50 - (e?.ry ?? 40);
  const happy = state === "celebrating" || state === "greeting";
  const sad = state === "retry";
  return (
    <svg className={`ss-gloop state-${state}`} viewBox="-8 -22 116 130" overflow="visible" role="img" aria-label={`Gloop, squished into a shape with ${KINDS[spec.kind].about}`}>
      <ellipse cx="50" cy="100" rx="36" ry="5" fill={INK} opacity="0.14" />
      <g className="ss-gloop-body">
        <path d={`M50 ${top + 2} Q47 ${top - 8} 50 ${top - 14}`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d={`M50 ${top - 22} Q56 ${top - 14} 50 ${top - 10} Q44 ${top - 14} 50 ${top - 22} Z`} fill="#8FF0E5" stroke={INK} strokeWidth="2.5" />
        <ShapeGeom spec={spec} fill={CREW.gloop} stroke={INK} strokeWidth="4.5" />
        <g transform="translate(50 50) scale(0.66) translate(-50 -44)" opacity="0.3"><ShapeGeom spec={spec} fill="#fff" /></g>
        <g className="ss-gloop-face">
          <circle cx="50" cy="46" r="11" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="51" cy="47" r="6.5" fill="#1F6F8B" />
          <circle cx="51" cy="47" r="4" fill={INK} />
          <circle cx="53" cy="45" r="1.6" fill="#fff" />
          {happy ? (
            <path d="M43 59 Q50 67 57 59 Z" fill="#155E50" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
          ) : sad ? (
            <path d="M44 63 Q50 58 56 63" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          ) : (
            <ellipse cx="50" cy="61" rx="4.5" ry="3.2" fill="#155E50" stroke={INK} strokeWidth="2.2" />
          )}
        </g>
      </g>
      {trace > 0 && pts.length > 0 && <SideMarks pts={pts} upTo={trace} corners />}
      {trace > 0 && e && <RoundMark {...e} />}
    </svg>
  );
}

/** A garden gate: a leafy hedge block with a shaped hole. */
export function GateArt({ spec, trace = 0, open = false }: { spec: ShapeSpec; trace?: number; open?: boolean }) {
  const pts = shapePoints(spec);
  const e = ellipseOf(spec);
  return (
    <svg className={`ss-gate-art ${open ? "open" : ""}`} viewBox="-4 -4 108 108" overflow="visible" aria-hidden="true">
      <rect x="-2" y="-2" width="104" height="104" rx="18" fill="#3FA552" stroke={INK} strokeWidth="4" />
      {[[10, 8], [36, 4], [64, 6], [90, 10], [6, 40], [96, 46], [8, 76], [94, 80], [30, 96], [70, 96]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="#58BE62" />
      ))}
      {[[20, 20], [82, 24], [16, 88], [86, 90]].map(([x, y], i) => <circle key={`f${i}`} cx={x} cy={y} r="3.2" fill={i % 2 ? "#FF8FB1" : "#FFE27A"} stroke={INK} strokeWidth="1.4" />)}
      <ShapeGeom spec={{ ...spec, size: spec.size }} fill={open ? "#FFF3C4" : "#24324F"} stroke="#C79A5A" strokeWidth="7" />
      <ShapeGeom spec={spec} fill="none" stroke={INK} strokeWidth="2.5" />
      {!open && <g transform="translate(50 50) scale(0.7) translate(-50 -58)" opacity="0.35"><ShapeGeom spec={spec} fill="#4B5D8A" /></g>}
      {trace > 0 && pts.length > 0 && <SideMarks pts={pts} upTo={trace} corners />}
      {trace > 0 && e && <RoundMark {...e} />}
    </svg>
  );
}

/** Jelly jar for "find every…" and the sorting jars. `sides` draws tally sticks (3 or 4). */
export function JarArt({ sides, glow = false }: { sides?: number; glow?: boolean }) {
  return (
    <svg className={`ss-jar-art ${glow ? "glow" : ""}`} viewBox="0 0 120 130" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <ellipse cx="60" cy="124" rx="46" ry="5" fill={INK} opacity="0.15" />
      <path d="M18 34 Q14 120 30 122 L90 122 Q106 120 102 34 Z" fill="#E9FBFF" fillOpacity="0.85" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 84 Q60 74 98 84 Q100 118 88 119 L32 119 Q20 118 22 84 Z" fill={CREW.gloop} opacity="0.55" />
      <rect x="12" y="18" width="96" height="18" rx="8" fill="#FF9F43" stroke={INK} strokeWidth="4" />
      <path d="M28 44 Q26 80 30 104" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      {sides !== undefined && (
        <g transform="translate(60 60)">
          <rect x="-30" y="-16" width="60" height="32" rx="10" fill="#fff" stroke={INK} strokeWidth="3" />
          {Array.from({ length: sides }, (_, i) => (
            <line key={i} x1={-18 + i * (36 / Math.max(1, sides - 1))} y1="-8" x2={-18 + i * (36 / Math.max(1, sides - 1))} y2="8" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          ))}
        </g>
      )}
    </svg>
  );
}

/** One compose piece at outline scale (viewBox fixed so every piece shares the same scale). */
export function PieceArt({ spec }: { spec: PieceSpec }) {
  const pts = piecePoints(spec);
  const fill = JELLY[spec.color % JELLY.length]!;
  return (
    <svg className="ss-piece-art" viewBox="-78 -78 156 156" overflow="visible" aria-hidden="true">
      <path d={toPath(pts.map(([x, y]) => [x, y + 4] as const))} fill={INK} opacity="0.18" strokeLinejoin="round" />
      <path d={toPath(pts)} fill={fill} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d={toPath(pts.map(([x, y]) => [x * 0.55 - 4, y * 0.55 - 4] as const))} fill="#fff" opacity="0.35" />
    </svg>
  );
}

/** An outline gate with its packed pieces. `gap` shows the empty cells (hint); `glow` = filled and right. */
export function OutlineArt({ outline, inside, gap = false, glow = false }: { outline: OutlineType; inside: readonly { kind: PieceKind; color: number; id: string }[]; gap?: boolean; glow?: boolean }) {
  const border = outlinePoints(outline);
  const packed = packOutline(inside.map((p) => p.kind));
  const holes = gap ? gapCells(inside.map((p) => p.kind), outline) : [];
  return (
    <svg className={`ss-outline-art ${glow ? "glow" : ""}`} viewBox="-74 -70 148 140" overflow="visible" aria-hidden="true">
      <path d={toPath(border.map(([x, y]) => [x * 1.16, y * 1.16] as const))} fill="#3FA552" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d={toPath(border)} fill="#24324F" stroke="#C79A5A" strokeWidth="6" strokeLinejoin="round" />
      <path d={toPath(border)} fill="none" stroke="#FFF3C4" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" opacity="0.7" />
      {packed.map((p, i) => {
        const fill = JELLY[inside[i]!.color % JELLY.length]!;
        return (
          <g key={inside[i]!.id} className="ss-placed">
            <path d={toPath(p.points)} fill={fill} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
            <path d={toPath(p.points.map(([x, y]) => [x * 0.9, y * 0.9] as const))} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
          </g>
        );
      })}
      {holes.map((h, i) => <path key={`h${i}`} className="ss-gap" d={toPath(h)} fill="#FFE27A" fillOpacity="0.28" stroke="#FFE27A" strokeWidth="2.5" strokeDasharray="5 4" />)}
    </svg>
  );
}

/** Prompt icon (ObjectArt): `shape-<name>`, `jar`, `outline-<type>`. */
export function SquishIcon({ kind }: { kind: string }) {
  if (kind === "jar") return <JarArt sides={3} />;
  if (kind.startsWith("outline-")) {
    const o = kind.slice(8) === "hexagon" ? "hexagon" : "square";
    return (
      <svg viewBox="-70 -66 140 132" aria-hidden="true">
        <path d={toPath(outlinePoints(o))} fill="#fff" stroke={INK} strokeWidth="9" strokeLinejoin="round" strokeDasharray="16 10" />
      </svg>
    );
  }
  const name = kind.replace("shape-", "");
  const k = name === "triangle" ? "tri-eq" : name === "rectangle" ? "rect" : name === "square" || name === "hexagon" || name === "circle" ? name : "circle";
  const spec = parseShape(`${k}~0~${k === "rect" ? 170 : 100}~96~1`)!;
  return <JellyShape spec={spec} />;
}

export const NoBasket = () => <svg aria-hidden="true" />;

/** Host mascot: Gloop. While Gloop is out on the board (gate levels), the mascot spot shows the empty lily pad. */
export function GloopHost({ state, talking = false, size = 160 }: { state: MascotState; talking?: boolean; size?: number | string }) {
  const away = useSyncExternalStore(hostStore.subscribe, hostStore.get, hostStore.get);
  if (away) {
    return (
      <svg className="critter ss-lilypad" viewBox="0 0 200 230" width={size} role="img" aria-label="Gloop's empty lily pad: Gloop is out at the gates">
        <ellipse cx="100" cy="200" rx="84" ry="22" fill="#5CC8E8" opacity="0.5" />
        <ellipse className="ss-ripple" cx="100" cy="200" rx="70" ry="16" fill="none" stroke="#fff" strokeWidth="3" opacity="0.7" />
        <path d="M30 196 A70 20 0 1 0 100 178 L104 196 Z" fill="#58BE62" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M60 190 L96 192 M70 200 L98 194" stroke="#3FA552" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return <Gloop state={state} talking={talking} size={size} />;
}

/** Background: Shape Garden — sky, hedge wall with gates, the wobbly jelly pond with lily pads. */
export function PondBackground({ className = "scene-bg" }: { className?: string } = {}) {
  return (
    <svg className={`${className} ss-bg`} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9FDCFF" /><stop offset="0.6" stopColor="#DDF3FF" /><stop offset="1" stopColor="#FFF4D6" /></linearGradient>
        <linearGradient id="ss-pond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7FE3D8" /><stop offset="1" stopColor="#2EC4B6" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ss-sky)" />
      <g className="cloud" fill="#fff" opacity="0.9"><ellipse cx="260" cy="130" rx="110" ry="36" /><ellipse cx="330" cy="110" rx="70" ry="40" /></g>
      <g className="cloud c2" fill="#fff" opacity="0.8"><ellipse cx="1180" cy="90" rx="120" ry="34" /><ellipse cx="1110" cy="76" rx="64" ry="34" /></g>
      {/* hedge wall with three distant shaped gates */}
      <path d="M0 420 Q80 380 160 410 T320 400 T480 410 T640 396 T800 408 T960 398 T1120 410 T1280 396 T1440 408 T1600 400 L1600 640 L0 640 Z" fill="#3FA552" />
      <path d="M0 470 Q200 440 400 462 T800 456 T1200 462 T1600 452 L1600 640 L0 640 Z" fill="#4DB05E" />
      <circle cx="300" cy="520" r="44" fill="#24324F" stroke="#C79A5A" strokeWidth="8" />
      <rect x="740" y="476" width="88" height="88" rx="4" fill="#24324F" stroke="#C79A5A" strokeWidth="8" />
      <path d="M1290 470 L1340 560 L1240 560 Z" fill="#24324F" stroke="#C79A5A" strokeWidth="8" strokeLinejoin="round" />
      {[[120, 450], [520, 440], [980, 450], [1480, 444]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" fill={i % 2 ? "#FF8FB1" : "#FFE27A"} stroke={INK} strokeWidth="3" />)}
      {/* grass + pond */}
      <path d="M0 600 Q400 570 800 590 T1600 584 L1600 900 L0 900 Z" fill="#8EDB7E" />
      <ellipse cx="800" cy="790" rx="720" ry="120" fill="url(#ss-pond)" stroke="#249E93" strokeWidth="6" />
      <ellipse className="ss-wobble" cx="800" cy="770" rx="560" ry="70" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" />
      {([[260, 800, 70], [1340, 780, 60], [560, 840, 44], [1080, 850, 50]] as const).map(([x, y, r], i) => (
        <path key={i} d={`M${x - r} ${y} A${r} ${r * 0.32} 0 1 0 ${x} ${y - r * 0.32} L${x + 4} ${y} Z`} fill="#58BE62" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Achievement sticker: "Shape Squisher" — Gloop squished into a square, with a triangle, circle and hexagon. */
export function ShapeSquisherSticker() {
  const sq = parseShape("square~12~100~88~0")!;
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Shape Squisher sticker: Gloop squished into a square, with a triangle, a circle and a hexagon">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="#DFF8F4" />
      <g transform="translate(26 44) scale(0.52)"><JellyShape spec={parseShape("tri-eq~-12~100~92~0")!} /></g>
      <g transform="translate(160 40) scale(0.46)"><JellyShape spec={parseShape("circle~0~100~92~1")!} /></g>
      <g transform="translate(166 110) scale(0.44)"><JellyShape spec={parseShape("hexagon~10~100~92~2")!} /></g>
      <g transform="translate(62 62) scale(1.08)"><GloopShape spec={sq} state="celebrating" /></g>
      <path id="ss-sticker-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="20" fill={INK} letterSpacing="1.5">
        <textPath href="#ss-sticker-arc" startOffset="50%" textAnchor="middle">SHAPE SQUISHER</textPath>
      </text>
    </svg>
  );
}

/** Story prop: one garden gate with a hole of `spec`, optionally with Gloop (shaped) beside or squishing through. */
export function StoryGate({ hole, gloop, through = false, bonk = false }: { hole: ShapeSpec; gloop?: ShapeSpec | "blob"; through?: boolean; bonk?: boolean }) {
  return (
    <div className={`ss-storygate ${through ? "through" : ""} ${bonk ? "bonk" : ""}`}>
      <div className="ss-storygate-gate"><GateArt spec={hole} open={through} /></div>
      {gloop && <div className="ss-storygate-gloop">{gloop === "blob" ? <Gloop state={bonk ? "retry" : "encouraging"} size="100%" /> : <GloopShape spec={gloop} state={through ? "celebrating" : "greeting"} />}</div>}
    </div>
  );
}

