import { INK } from "../../../characters/palette";
import { LN } from "../art";

/**
 * SVG helpers for the angle diagrams. Angles are mathematical (degrees, anticlockwise from +x, y up); the helpers
 * convert to SVG coordinates (y down). Bearings convert with `bearingToMath`.
 */
export const rad = (d: number) => (d * Math.PI) / 180;
export const at = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
/** Inline style giving a diagram its aspect ratio (CSS sizes it to fit the scene without letterboxing). */
export const ar = (w: number, h: number) => ({ "--ar": String(w / h) }) as React.CSSProperties;
export const bearingToMath = (b: number) => 90 - b;
const f = (n: number) => Math.round(n * 10) / 10;

/** Arc path from angle a0 to a1 going anticlockwise (a1 > a0). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = at(cx, cy, r, a0);
  const [x1, y1] = at(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${f(x0)} ${f(y0)} A${r} ${r} 0 ${large} 0 ${f(x1)} ${f(y1)}`;
}
/** Filled sector (for a highlighted angle). */
export function sectorPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  return `M${cx} ${cy} L${arcPath(cx, cy, r, a0, a1).slice(1)} Z`;
}
/** Right-angle square between rays at a0 and a0 + 90. */
export function rightMark(cx: number, cy: number, s: number, a0: number): string {
  const [x1, y1] = at(cx, cy, s, a0);
  const [x2, y2] = at(cx, cy, s * Math.SQRT2, a0 + 45);
  const [x3, y3] = at(cx, cy, s, a0 + 90);
  return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}`;
}

export type Mark = "given" | "unknown" | "model" | "plain";
/** An angle between two rays (a0 → a1 anticlockwise) with its arc and label. */
export function AngleMark({ cx, cy, a0, a1, label, kind = "given", r = 30, lr }: { cx: number; cy: number; a0: number; a1: number; label: string; kind?: Mark; r?: number; lr?: number }) {
  const span = a1 - a0;
  const mid = a0 + span / 2;
  const isRight = Math.abs(span - 90) < 0.01 && kind !== "unknown";
  const [lx, ly] = at(cx, cy, lr ?? r + (span < 40 ? 26 : 18), mid);
  const cls = `ln-ang is-${kind}`;
  return (
    <g className={cls}>
      {kind === "unknown" || kind === "model" ? <path d={sectorPath(cx, cy, r, a0, a1)} className="ln-ang-fill" /> : null}
      {isRight ? <path d={rightMark(cx, cy, Math.min(r, 18), a0)} className="ln-ang-arc" fill="none" /> : <path d={arcPath(cx, cy, r, a0, a1)} className="ln-ang-arc" fill="none" />}
      {label && (
        <text x={lx} y={ly} className="ln-ang-label" textAnchor="middle" dominantBaseline="central">{label}</text>
      )}
    </g>
  );
}

/** A lighthouse beam: a soft wedge plus a bright centre line from (cx, cy) at angle a. */
export function BeamRay({ cx, cy, a, len, soft = true, cls = "" }: { cx: number; cy: number; a: number; len: number; soft?: boolean; cls?: string }) {
  const [x, y] = at(cx, cy, len, a);
  const [l1x, l1y] = at(cx, cy, len, a + 4);
  const [l2x, l2y] = at(cx, cy, len, a - 4);
  return (
    <g className={`ln-ray ${cls}`}>
      {soft && <path d={`M${cx} ${cy} L${f(l1x)} ${f(l1y)} L${f(l2x)} ${f(l2y)} Z`} fill={LN.lampSoft} opacity="0.45" />}
      <path d={`M${cx} ${cy} L${f(x)} ${f(y)}`} stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d={`M${cx} ${cy} L${f(x)} ${f(y)}`} stroke={LN.lamp} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** The lamp at the centre of a diagram. */
export const Lamp = ({ cx, cy, r = 9 }: { cx: number; cy: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r + 5} fill={LN.lamp} opacity="0.35" />
    <circle cx={cx} cy={cy} r={r} fill={LN.lamp} stroke={INK} strokeWidth="3" />
  </g>
);
