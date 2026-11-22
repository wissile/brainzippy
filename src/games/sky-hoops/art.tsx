import { memo } from "react";
import { INK } from "../../characters/palette";
import {
  CAMERAS, type CameraId, FORCE_DIR, GROUND_Y, FORCE_FROM, type ForceId, HOOP_TUBE, type HoopSpec, type PartId, type Pose, REST, type Vec3,
  VIEW_H, VIEW_W, bboxOf, bodyToWorld, depthOf, hoopPoints, planePolys, project,
} from "./flight";
import type { Axis, Diagram } from "./logic";
import { DIAGRAM_FORCES } from "./logic";

/**
 * Original art for Zephy's Sky Hoops. Critter Crew style: ink outlines, flat bright fills, soft highlights.
 * The plane is an original, generic high-wing trainer (no real manufacturer shape, registration or livery),
 * drawn by the little 3D renderer in ./flight.ts so pitch, roll and yaw all read from one camera.
 * Force colours are fixed across the world and always backed by a text label:
 *   lift = blue (up) · weight = orange (down) · thrust = green (forward) · drag = purple (back).
 */
export const SH = {
  red: "#E5484D",
  redDark: "#A1181D",
  cream: "#FFF4E2",
  gold: "#FFD43B",
  goldDeep: "#E0A800",
  sky: "#8FD3FF",
  cloud: "#FFFFFF",
  grass: "#7FD27A",
  grassDark: "#5DB25A",
  tarmac: "#5A5670",
  sea: "#5EC8E5",
} as const;
export const FORCE_COLOR: Record<ForceId, string> = { lift: "#2C7BE5", weight: "#F08C2E", thrust: "#2EAD5B", drag: "#8E6CEF" };

const strokeFor = (depth: number) => Math.max(1.4, Math.min(4.4, 36 / depth));
const ptsD = (pts: { x: number; y: number }[]) => `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L")}Z`;

// ---------------------------------------------------------------- the plane
export function PlaneShape({ pose, cam, ghost = false, glow = null, testId }: { pose: Pose; cam: CameraId; ghost?: boolean; glow?: PartId | null; testId?: string }) {
  const c = CAMERAS[cam];
  const polys = planePolys(pose, c);
  const sw = strokeFor(depthOf(pose, c));
  return (
    <g className={`sh-plane ${ghost ? "is-ghost" : ""}`} opacity={pose.fade} data-testid={testId}>
      {polys.map((p) => {
        const lit = !ghost && glow && p.part === glow;
        return (
          <path
            key={p.key}
            d={p.d}
            fill={ghost ? "#FFFFFF" : lit ? SH.gold : p.fill}
            fillOpacity={ghost ? 0.32 : p.opacity}
            stroke={ghost ? "#FFFFFF" : p.stroke || lit ? INK : "none"}
            strokeOpacity={ghost ? 0.9 : 1}
            strokeWidth={lit ? sw * 1.9 : sw}
            strokeDasharray={ghost ? `${sw * 2.4} ${sw * 1.8}` : undefined}
            strokeLinejoin="round"
            className={p.part ? `sh-surf ${lit ? "is-glow" : ""}` : undefined}
            data-part={p.part}
          />
        );
      })}
    </g>
  );
}

/** A stand-alone picture of the plane (icons, story): viewBox cropped around it. */
export function PlaneArt({ pose = REST, cam = "side34", glow = null, pad = 30, className = "", children, label }: {
  pose?: Pose; cam?: CameraId; glow?: PartId | null; pad?: number; className?: string; children?: React.ReactNode; label?: string;
}) {
  const b = bboxOf(planePolys(pose, CAMERAS[cam]));
  const w = b.x1 - b.x0 + pad * 2, h = b.y1 - b.y0 + pad * 2;
  return (
    <svg
      viewBox={`${(b.x0 - pad).toFixed(0)} ${(b.y0 - pad).toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`}
      className={`sh-plane-art ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      overflow="visible"
    >
      <PlaneShape pose={pose} cam={cam} glow={glow} />
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------- hoops, runway, clouds
export function HoopRing({ spec, cam, state = "idle", faint = false }: { spec: HoopSpec; cam: CameraId; state?: "idle" | "done" | "model"; faint?: boolean }) {
  const c = CAMERAS[cam];
  const pts = hoopPoints(spec, c);
  const ctr = project(c, spec.c);
  if (!ctr || pts.length < 8) return null;
  const tube = Math.max(5, (HOOP_TUBE * 2 * 1100) / ctr.d);
  const d = ptsD(pts);
  let per = 0;
  for (let i = 0; i < pts.length; i++) per += Math.hypot(pts[(i + 1) % pts.length]!.x - pts[i]!.x, pts[(i + 1) % pts.length]!.y - pts[i]!.y);
  const dash = per / 24;
  const done = state === "done";
  return (
    <g className={`sh-hoop is-${state} ${faint ? "is-faint" : ""}`} data-testid={faint ? undefined : "sh-hoop"} opacity={faint ? 0.35 : 1}>
      {state === "model" && <path d={d} fill="none" stroke={SH.gold} strokeWidth={tube + 22} strokeOpacity="0.45" className="sh-hoop-glow" />}
      <path d={d} fill="none" stroke={INK} strokeWidth={tube + 6} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={done ? SH.gold : SH.red} strokeWidth={tube} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={done ? "#FFF6C2" : "#FFFFFF"} strokeWidth={tube} strokeDasharray={`${dash.toFixed(1)} ${dash.toFixed(1)}`} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth={Math.max(1.5, tube * 0.22)} transform={`translate(${-tube * 0.18} ${-tube * 0.22})`} />
    </g>
  );
}

/** Sparkles where Zephy threaded a hoop. */
export function HoopSparkle({ spec, cam }: { spec: HoopSpec; cam: CameraId }) {
  const ctr = project(CAMERAS[cam], spec.c);
  if (!ctr) return null;
  const r = (spec.r * 1100) / ctr.d;
  return (
    <g className="sh-sparkle" transform={`translate(${ctr.x.toFixed(0)} ${ctr.y.toFixed(0)})`} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <path
            key={i}
            d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z"
            fill={i % 2 ? SH.gold : "#FFFFFF"}
            stroke={INK}
            strokeWidth="2"
            transform={`translate(${(Math.cos(a) * r).toFixed(0)} ${(Math.sin(a) * r).toFixed(0)}) scale(${i % 3 === 0 ? 1.3 : 0.9})`}
            style={{ "--i": i } as React.CSSProperties}
          />
        );
      })}
    </g>
  );
}

export function Runway({ cam }: { cam: CameraId }) {
  const c = CAMERAS[cam];
  const q = (pts: Vec3[]) => {
    const p = pts.map((v) => project(c, v));
    return p.every(Boolean) ? ptsD(p as { x: number; y: number }[]) : "";
  };
  const g = GROUND_Y;
  // From the ground camera (L6, the take-off roll) the plane sits on a wider runway that starts behind it.
  const onGround = cam === "ground";
  const near = onGround ? -6 : 2;
  const w = onGround ? 5.5 : 2;
  const from = onGround ? -6 : 9;
  const dashes = Array.from({ length: onGround ? 18 : 9 }, (_, i) => (onGround ? -4 : 16) + i * 7);
  const keys = onGround ? [] : [-1.5, -1.0, -0.5, 0.5, 1.0, 1.5];
  const dw = onGround ? 0.16 : 0.12;
  return (
    <g className="sh-runway" aria-hidden="true">
      <path d={q([[-160, g, 2], [160, g, 2], [160, g, 260], [-160, g, 260]])} fill={SH.grass} />
      {/* near the low ground camera, a narrower strip (a ±160 quad would reach behind the camera and not draw) */}
      {onGround && <path d={q([[-40, g, near], [40, g, near], [40, g, 60], [-40, g, 60]])} fill={SH.grass} />}
      <path d={q([[-160, g, 60], [160, g, 60], [160, g, 260], [-160, g, 260]])} fill={SH.grassDark} opacity="0.35" />
      <path d={q([[-w, g, from], [w, g, from], [w, g, 120], [-w, g, 120]])} fill={SH.tarmac} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {keys.map((x) => (
        <path key={x} d={q([[x - 0.17, g, 10], [x + 0.17, g, 10], [x + 0.17, g, 13], [x - 0.17, g, 13]])} fill="#FFFFFF" />
      ))}
      {dashes.map((z, i) => (
        <path key={z} d={q([[-dw, g, z], [dw, g, z], [dw, g, z + 3.5], [-dw, g, z + 3.5]])} fill="#FFFFFF" data-testid={i === 0 ? "sh-centreline" : undefined} />
      ))}
    </g>
  );
}

export function Cloud({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} aria-hidden="true">
      <path d="M-90 20 C-110 20 -112 -8 -88 -10 C-86 -40 -40 -46 -26 -22 C-14 -54 44 -52 50 -16 C76 -26 104 -6 92 20 Z" fill="#FFFFFF" stroke={INK} strokeOpacity="0.18" strokeWidth="5" strokeLinejoin="round" />
      <path d="M-70 4 C-62 -12 -44 -14 -36 -6" fill="none" stroke="#E6F4FF" strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------- forces
export function ForceArrows({ cam, pose = REST, sizes, show = ["lift", "weight", "thrust", "drag"], hot = null, labels = true }: {
  cam: CameraId; pose?: Pose; sizes: Record<ForceId, number>; show?: readonly ForceId[]; hot?: ForceId | null; labels?: boolean;
}) {
  const c = CAMERAS[cam];
  return (
    <g className="sh-forces" aria-hidden="true">
      {show.map((f) => {
        const a = arrowScreen(c, f, sizes[f], pose);
        if (!a) return null;
        const col = FORCE_COLOR[f];
        const w = hot === f ? 26 : 18;
        return (
          <g key={f} className={`sh-force is-${f} ${hot === f ? "is-hot" : ""}`}>
            <path d={`M${a.x0} ${a.y0} L${a.xb} ${a.yb}`} stroke={INK} strokeWidth={w + 8} strokeLinecap="round" />
            <path d={`M${a.x0} ${a.y0} L${a.xb} ${a.yb}`} stroke={col} strokeWidth={w} strokeLinecap="round" />
            <path d={a.head} fill={col} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
            {labels && (
              <text x={a.lx} y={a.ly} textAnchor="middle" dominantBaseline="middle" className="sh-force-label" fill={INK} stroke="#FFFFFF" strokeWidth="9" paintOrder="stroke">
                {f[0]!.toUpperCase() + f.slice(1)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Screen geometry of one force arrow (also used to place the tap targets over the arrows). */
export function arrowScreen(cam: (typeof CAMERAS)[CameraId], f: ForceId, size: number, pose: Pose = REST) {
  const from = bodyToWorld(FORCE_FROM[f], { ...pose, pitch: 0, roll: 0, yaw: 0 });
  const dir = FORCE_DIR[f];
  const L = 2.5 * size;
  const tip: Vec3 = [from[0] + dir[0] * L, from[1] + dir[1] * L, from[2] + dir[2] * L];
  const p0 = project(cam, from), p1 = project(cam, tip);
  if (!p0 || !p1) return null;
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const hw = 26, hl = 40;
  const xb = p1.x - ux * hl * 0.8, yb = p1.y - uy * hl * 0.8;
  const head = `M${p1.x.toFixed(0)} ${p1.y.toFixed(0)} L${(p1.x - ux * hl - uy * hw).toFixed(0)} ${(p1.y - uy * hl + ux * hw).toFixed(0)} L${(p1.x - ux * hl + uy * hw).toFixed(0)} ${(p1.y - uy * hl - ux * hw).toFixed(0)} Z`;
  const lx = p1.x + ux * 52 + (Math.abs(uy) > 0.5 ? 74 : 0), ly = p1.y + uy * 40 + (Math.abs(ux) > 0.5 ? -46 : 0);
  return { x0: p0.x.toFixed(0), y0: p0.y.toFixed(0), xb: xb.toFixed(0), yb: yb.toFixed(0), head, lx, ly, mid: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, tip: p1 };
}

/** One forces picture (answer card): the side-view plane with four arrows. */
export const ForceDiagram = memo(function ForceDiagram({ d }: { d: Diagram }) {
  return (
    <svg viewBox="420 240 760 520" className="sh-diagram" aria-hidden="true">
      <PlaneShape pose={REST} cam="side" />
      <ForceArrows cam="side" sizes={DIAGRAM_FORCES[d]} labels={false} />
    </svg>
  );
});

/** Small force-colour legend so the pictures can be read without the labels. */
export function ForceLegend() {
  return (
    <div className="sh-legend" aria-hidden="true">
      {(["lift", "weight", "thrust", "drag"] as ForceId[]).map((f) => (
        <span key={f} className="sh-legend-item"><i style={{ background: FORCE_COLOR[f] }} />{f[0]!.toUpperCase() + f.slice(1)}</span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- option icons
const ARROW = "#2B2140";
export const AxisIcon = memo(function AxisIcon({ axis }: { axis: Axis }) {
  if (axis === "pitch")
    return (
      <PlaneArt pose={{ ...REST, pitch: 0.3 }} cam="side" pad={60} className="sh-axis-icon">
        <AxisArc cam="side" at={[0, 0.3, 2.6]} />
      </PlaneArt>
    );
  if (axis === "roll")
    return (
      <PlaneArt pose={{ ...REST, roll: -0.42 }} cam="rear" pad={50} className="sh-axis-icon">
        <AxisArc cam="rear" at={[2.6, 1.6, 0]} flip />
      </PlaneArt>
    );
  return (
    <PlaneArt pose={{ ...REST, yaw: 0.4 }} cam="top" pad={50} className="sh-axis-icon">
      <AxisArc cam="top" at={[1.2, 0, 2.6]} />
    </PlaneArt>
  );
});
function AxisArc({ cam, at, flip = false }: { cam: CameraId; at: Vec3; flip?: boolean }) {
  const p = project(CAMERAS[cam], at);
  if (!p) return null;
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${p.x.toFixed(0)} ${p.y.toFixed(0)}) scale(${s} 1)`}>
      <path d="M-60 40 Q-50 -40 30 -50" fill="none" stroke={ARROW} strokeWidth="16" strokeLinecap="round" />
      <path d="M30 -50 L4 -74 L10 -30 Z" fill={ARROW} stroke={ARROW} strokeWidth="8" strokeLinejoin="round" />
    </g>
  );
}

export const PartIcon = memo(function PartIcon({ part }: { part: PartId }) {
  return <PlaneArt pose={{ ...REST, elev: part === "elevator" ? 0.6 : 0, ail: part === "ailerons" ? 0.6 : 0, rud: part === "rudder" ? 0.6 : 0 }} cam="side34" glow={part} pad={24} className="sh-part-icon" />;
});

// ---------------------------------------------------------------- prompt icons (ObjectArt)
export function HoopIcon() {
  return (
    <svg viewBox="0 0 64 64" className="sh-icon" aria-hidden="true">
      <circle cx="32" cy="32" r="22" fill="none" stroke={INK} strokeWidth="12" />
      <circle cx="32" cy="32" r="22" fill="none" stroke={SH.red} strokeWidth="7" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" strokeWidth="7" strokeDasharray="8.6 8.6" />
    </svg>
  );
}
export function SkyHoopsObject({ kind }: { kind: string }) {
  if (kind === "hoop" || kind === "course") return <HoopIcon />;
  if (kind === "forces") return <PlaneArt pose={REST} cam="side" pad={20} className="sh-icon" />;
  if (kind === "runway") return <PlaneArt pose={REST} cam="top" pad={20} className="sh-icon" />;
  return <PlaneArt pose={REST} cam="side34" pad={20} className="sh-icon" />;
}
export function NoBasket() {
  return <span className="sh-no-basket" aria-hidden="true" />;
}

// ---------------------------------------------------------------- background
/** The sky above Monster Island on show day: soft clouds, the island far below with pennants and a little crowd. */
export function SkyBackground() {
  return (
    <svg className="scene-bg bg sh-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5DB8F5" /><stop offset="0.6" stopColor="#A9DEFF" /><stop offset="1" stopColor="#E9F7FF" />
        </linearGradient>
        <radialGradient id="sh-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFF6C2" /><stop offset="1" stopColor="#FFE27A" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sh-sky)" />
      <circle cx="1340" cy="150" r="170" fill="url(#sh-sun)" />
      <circle cx="1340" cy="150" r="62" fill="#FFE27A" />
      <g className="sh-bg-clouds">
        <Cloud x={220} y={170} s={1.1} />
        <Cloud x={760} y={110} s={0.8} o={0.9} />
        <Cloud x={1120} y={300} s={0.7} o={0.85} />
        <Cloud x={420} y={420} s={0.6} o={0.8} />
      </g>
      {/* the sea and Monster Island, far below */}
      <path d="M0 760 Q400 740 800 752 T1600 748 L1600 900 L0 900 Z" fill={SH.sea} />
      <path d="M380 780 Q520 700 760 712 Q980 700 1150 770 Q980 800 760 798 Q560 802 380 780 Z" fill="#A6E39A" stroke={INK} strokeOpacity="0.35" strokeWidth="4" />
      <path d="M520 770 Q640 740 760 744 Q900 740 1000 768" fill="none" stroke="#7FD27A" strokeWidth="10" strokeLinecap="round" />
      <path d="M560 760 L900 760" stroke={SH.tarmac} strokeWidth="9" strokeLinecap="round" opacity="0.7" />
      {[600, 680, 760, 840].map((x, i) => (
        <g key={x} transform={`translate(${x} 742)`}>
          <path d="M0 0 L0 -22" stroke={INK} strokeWidth="3" />
          <path d="M0 -22 L16 -17 L0 -12 Z" fill={i % 2 ? SH.red : SH.gold} className="sh-pennant" style={{ animationDelay: `${i * 0.3}s` }} />
        </g>
      ))}
      <path d="M0 830 Q300 812 600 826 T1200 822 T1600 828" fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** A field of sky for the play area (the runner's background sits behind it). Nothing here moves with reduced motion. */
export function SceneClouds({ drift = 0 }: { drift?: number }) {
  return (
    <g className="sh-scene-clouds" aria-hidden="true" transform={`translate(${(-drift * 120).toFixed(0)} 0)`}>
      <Cloud x={160} y={170} s={0.9} o={0.85} />
      <Cloud x={1450} y={240} s={1.0} o={0.85} />
      <Cloud x={1250} y={820} s={0.8} o={0.7} />
      <Cloud x={300} y={860} s={0.7} o={0.7} />
    </g>
  );
}

// ---------------------------------------------------------------- sticker
/** Sky Wings: a round pin with Zephy's twin goggles over a pair of stubby wings (original; not airline or military wings). */
export function SkyWingsSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Sky Wings sticker: a round pin with Zephy's goggles over a pair of stubby wings">
      <circle cx="120" cy="120" r="112" fill={SH.red} stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="94" fill="#BFE6FF" stroke={INK} strokeWidth="4" />
      <path d="M30 150 Q120 118 210 150 L210 196 L30 196 Z" fill="#A6E39A" />
      <circle cx="166" cy="70" r="14" fill="#FFE27A" stroke={INK} strokeWidth="3" />
      {/* stubby wings */}
      {[1, -1].map((s) => (
        <g key={s} transform={`translate(120 128) scale(${s} 1)`}>
          <path d="M14 -6 C40 -30 74 -38 92 -30 C100 -22 94 -12 84 -10 C96 -4 92 10 78 10 C82 20 66 26 50 18 C38 14 24 10 14 8 Z" fill="#FFF1D0" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M92 -30 C100 -22 94 -12 84 -10 C80 -18 84 -26 92 -30 Z" fill="#9AA3B5" />
          <path d="M30 -10 C46 -22 62 -26 76 -24" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="120" cy="132" r="20" fill={SH.red} stroke={INK} strokeWidth="5" />
      {/* twin round brass goggles */}
      <path d="M86 98 Q120 88 154 98" fill="none" stroke="#7A4E2D" strokeWidth="8" strokeLinecap="round" />
      {[100, 140].map((x) => (
        <g key={x}>
          <circle cx={x} cy="100" r="17" fill="#E9B44C" stroke={INK} strokeWidth="5" />
          <circle cx={x} cy="100" r="10" fill="#BFE6FF" stroke={INK} strokeWidth="3" />
          <path d={`M${x - 6} 96 A7 7 0 0 1 ${x} 92`} stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <path id="sh-arc" d="M40 172 A88 88 0 0 0 200 172" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="22" fill="#fff" letterSpacing="2" stroke={INK} strokeWidth="1">
        <textPath href="#sh-arc" startOffset="50%" textAnchor="middle">SKY WINGS</textPath>
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- the stick and pedals (control deck art)
export function StickKnob() {
  return (
    <svg viewBox="-50 -50 100 100" className="sh-knob-art" aria-hidden="true">
      <circle r="40" fill={SH.red} stroke={INK} strokeWidth="6" />
      <circle r="24" fill="#F36B70" />
      <path d="M-22 -14 A26 26 0 0 1 -6 -26" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
export function PedalArt({ side }: { side: "left" | "right" }) {
  return (
    <svg viewBox="0 0 80 100" className="sh-pedal-art" aria-hidden="true">
      <path d="M14 12 Q40 2 66 12 L72 84 Q40 96 8 84 Z" fill="#E9EEF5" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      {[30, 46, 62].map((y) => <path key={y} d={`M20 ${y} L60 ${y}`} stroke="#B7C0CF" strokeWidth="5" strokeLinecap="round" />)}
      <path d={side === "left" ? "M46 76 L26 76 L34 68 M26 76 L34 84" : "M34 76 L54 76 L46 68 M54 76 L46 84"} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function ArrowGlyph({ dir }: { dir: "up" | "down" | "left" | "right" }) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg viewBox="-20 -20 40 40" className="sh-arrow-glyph" aria-hidden="true">
      <path d="M0 -14 L13 2 L5 2 L5 14 L-5 14 L-5 2 L-13 2 Z" transform={`rotate(${rot})`} fill="#FFFFFF" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

export const SCENE_VIEW = `0 0 ${VIEW_W} ${VIEW_H}`;
