/**
 * Glow Cave Hops — pure number-line geometry and cart rules (no React, no DOM). Unit-tested.
 * Stops 0..max sit at equal spacing: stop i is centred at (i + 0.5) * spacing inside the track strip.
 */

/** Smallest distance between neighbouring stops (px). Below this the track pans instead of squashing. */
export const MIN_SPACING = 52;
/** Largest distance between stops (px), so a short 0–5 line doesn't look stretched on a wide screen. */
export const MAX_SPACING = 150;

export interface TrackGeometry {
  total: number; // number of stops (max + 1)
  spacing: number;
  /** Extra room at both ends so the cart (wider than one stop) is never clipped on the first/last stop. */
  pad: number;
  stripWidth: number;
  /** True when the whole line fits on screen (no camera panning). */
  fits: boolean;
}

export function trackGeometry(max: number, viewportWidth: number, pad = 0): TrackGeometry {
  const total = max + 1;
  const spacing = Math.min(MAX_SPACING, Math.max(MIN_SPACING, (viewportWidth - 2 * pad) / total));
  const stripWidth = total * spacing + 2 * pad;
  return { total, spacing, pad, stripWidth, fits: stripWidth <= viewportWidth + 0.5 };
}

/** Centre x (px, strip coordinates) of a stop. */
export const stopX = (i: number, spacing: number, pad = 0) => pad + (i + 0.5) * spacing;

/** The cart may only move forward from the start (this is addition) and never past the end of the line. */
export const clampPos = (pos: number, start: number, max: number) => Math.min(max, Math.max(start, Math.round(pos)));

/** Nearest stop to a strip x coordinate, clamped to the reachable range. */
export function snapToStop(x: number, spacing: number, start: number, max: number, pad = 0): number {
  return clampPos((x - pad) / spacing - 0.5, start, max);
}

/** Hops taken so far (each hop is +1). */
export const hopsTaken = (pos: number, start: number) => Math.max(0, pos - start);

/** Landing numbers of the hops from `start` to `pos`: [start+1, ..., pos]. */
export const hopLandings = (start: number, pos: number) => Array.from({ length: hopsTaken(pos, start) }, (_, i) => start + i + 1);

/**
 * Camera: how far (px) the strip is scrolled left. Keeps the start stop in view for as long as possible,
 * then follows the stop in focus (the cart, or the hop being modelled), with 1.5 stops of margin.
 * When the line fits, the strip is centred (negative value = shift right).
 */
export function cameraLeft(opts: { start: number; focus: number; spacing: number; stripWidth: number; viewportWidth: number; pad?: number }): number {
  const { start, focus, spacing, stripWidth, viewportWidth: w, pad = 0 } = opts;
  if (stripWidth <= w + 0.5) return (stripWidth - w) / 2;
  let left = stopX(start, spacing, pad) - 1.5 * spacing - pad;
  const right = stopX(focus, spacing, pad) + 1.5 * spacing + pad;
  if (right > left + w) left = right - w;
  return Math.min(stripWidth - w, Math.max(0, left));
}

/** Geometry with end padding sized to the cart (cart width depends on spacing, so settle it in two passes). */
export function fitTrack(max: number, w: number, h: number): { geo: TrackGeometry; lay: TrackLayout } {
  const g0 = trackGeometry(max, w);
  const pad = Math.max(0, Math.round(trackLayout(g0.spacing, h, w).cartWidth / 2 - g0.spacing / 2 + 2));
  const geo = trackGeometry(max, w, pad);
  return { geo, lay: trackLayout(geo.spacing, h, w) };
}

/** Vertical layout (px from the top of the track viewport), derived from the stop spacing and viewport height. */
export interface TrackLayout {
  stopSize: number;
  numY: number;
  arcBase: number;
  arcHeight: number;
  railY: number;
  cartWidth: number;
  crystalHeight: number;
}

export function trackLayout(spacing: number, height: number, width = 0): TrackLayout {
  const stopSize = Math.round(Math.min(64, Math.max(44, Math.min(spacing * 0.78, height * 0.3))));
  const numY = height - stopSize / 2 - 4;
  const arcBase = numY - stopSize / 2 - 2;
  const arcHeight = Math.round(Math.min(46, Math.max(18, Math.min(spacing * 0.4, height * 0.1))));
  const railY = arcBase - arcHeight - (height < 260 ? 16 : 22);
  // wide screens get a bigger cart even on long lines; narrow phones keep it slim so a 0–5 line fits without panning
  const minCart = width > 700 ? Math.max(84, Math.min(height * 0.26, 150)) : 84;
  const cartWidth = Math.round(Math.max(56, Math.min(Math.max(spacing * 1.55, minCart), (railY - 8) / 1.22, 220)));
  const crystalHeight = Math.round(Math.min(46, Math.max(18, spacing * 0.42), Math.max(18, railY * 0.4)));
  return { stopSize, numY, arcBase, arcHeight, railY, cartWidth, crystalHeight };
}
