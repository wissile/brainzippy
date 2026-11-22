/**
 * Zephy's Sky Hoops — pure 3D flight maths (no React, no DOM; unit-tested in tests/unit/sky-hoops.test.ts).
 *
 * World axes: x right, y up, z forward (away from the chase camera). The plane is a small original high-wing
 * trainer built from flat polygons, rotated by its attitude and projected by a perspective camera into an SVG
 * viewBox of VIEW_W × VIEW_H. Painter's order (far first) with back-face culling on the closed fuselage.
 *
 * Attitude conventions (radians): pitch > 0 = nose up · roll > 0 = right wing down · yaw > 0 = nose right.
 * Control surfaces (−1..1): elev > 0 = elevator trailing edge UP (stick back) · ail > 0 = LEFT aileron up,
 * right aileron down (stick left, roll left) · rud > 0 = rudder trailing edge LEFT (left pedal, nose left).
 * These follow the FAA Pilot's Handbook of Aeronautical Knowledge (FAA-H-8083-25), chapter "Flight Controls".
 *
 * Flight is a tiny kinematic simulation, not an aerodynamic model: the stick changes climb angle (pitch) or
 * bank (roll; bank turns the path at a rate ∝ tan(bank)), a pedal swings the nose (yaw) with only a small skid.
 * The game simplifications (e.g. climbing without adding power) are listed in docs/worlds/sky-hoops.md.
 */
import type { Ctl } from "./logic";

export type Vec3 = [number, number, number];
export interface Pose {
  x: number; y: number; z: number;
  pitch: number; roll: number; yaw: number;
  elev: number; ail: number; rud: number;
  /** 0..1 opacity (the plane fades as it flies far away). */
  fade: number;
}
export const REST: Pose = { x: 0, y: 0, z: 0, pitch: 0, roll: 0, yaw: 0, elev: 0, ail: 0, rud: 0, fade: 1 };

export const VIEW_W = 1600;
export const VIEW_H = 1000;
const FOCAL = 1100;
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- vectors
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const rotX = (p: Vec3, a: number): Vec3 => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const rotY = (p: Vec3, a: number): Vec3 => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const rotZ = (p: Vec3, a: number): Vec3 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
/** Body → world rotation for an attitude (roll, then pitch, then yaw). */
export const orient = (p: Vec3, pitch: number, roll: number, yaw: number): Vec3 => rotY(rotX(rotZ(p, -roll), -pitch), yaw);

// ---------------------------------------------------------------- camera
export interface Camera { pos: Vec3; r: Vec3; u: Vec3; f: Vec3 }
export function lookAt(pos: Vec3, target: Vec3): Camera {
  const f = norm(sub(target, pos));
  const r = norm(cross([0, 1, 0], f));
  const u = cross(f, r);
  return { pos, r, u, f };
}
export const CAMERAS = {
  /** Behind, level with the plane and a little to the right: hoops above and below sit symmetrically about it. */
  chase: lookAt([1.0, 0.1, -8.6], [0, 0.35, 10]),
  /** Three-quarter side view for "how did it move?" and "which part moved?". */
  side34: lookAt([6.2, 2.6, -5.8], [0, 0.15, 0.4]),
  /** Straight side view for the four forces (nose to the right). */
  side: lookAt([13, 0.9, 0.3], [0, 0.25, 0.3]),
  /** Higher chase view looking down at the runway. */
  runway: lookAt([0.8, 2.4, -9], [0, -1.4, 10]),
  /** Low chase view of the plane rolling on the runway (L6: steering on the ground). */
  ground: lookAt([0.7, -2.3, -8], [0, -4.4, 12]),
  /** Icons: straight behind (roll), from above (yaw). */
  rear: lookAt([0, 0.9, -11], [0, 0.25, 0]),
  top: lookAt([0, 13, -1.2], [0, 0, 0.1]),
} as const;
export type CameraId = keyof typeof CAMERAS;

/** Screen point (viewBox units) and depth; null when behind the camera. */
export function project(cam: Camera, p: Vec3): { x: number; y: number; d: number } | null {
  const v = sub(p, cam.pos);
  const d = dot(v, cam.f);
  if (d < 0.3) return null;
  return { x: VIEW_W / 2 + (FOCAL * dot(v, cam.r)) / d, y: VIEW_H / 2 - (FOCAL * dot(v, cam.u)) / d, d };
}

// ---------------------------------------------------------------- plane model
export type PartId = "elevator" | "ailerons" | "rudder";
type Hinge = { kind: "elev" | "ailL" | "ailR" | "rud"; at: Vec3 };
interface Face {
  pts: Vec3[];
  color: string;
  under?: string;
  part?: PartId;
  hinge?: Hinge;
  /** Closed-solid face with an outward normal (culled when facing away). */
  outward?: Vec3;
  /** Draw right after this face index (windows on the fuselage); culled with it. */
  decalOf?: number;
  opacity?: number;
  stroke?: boolean;
}

export const PLANE_COLORS = {
  body: "#E5484D",
  bodyDark: "#B8323A",
  cream: "#FFF4E2",
  wing: "#FFF4E2",
  wingUnder: "#E9D9C2",
  surface: "#FFD66B",
  glass: "#BFE6FF",
  tyre: "#3A3350",
  prop: "#DDE6F0",
} as const;

const WING_Y = 0.5;
export const HALF_SPAN = 2.25;

function buildPlane(): Face[] {
  const C = PLANE_COLORS;
  const faces: Face[] = [];
  // fuselage sections: z, half width, bottom y, top y
  const S: [number, number, number, number][] = [
    [1.78, 0.2, -0.16, 0.1],
    [1.3, 0.36, -0.38, 0.26],
    [0.62, 0.4, -0.42, 0.3],
    [0.22, 0.4, -0.42, 0.48],
    [-0.55, 0.35, -0.34, 0.48],
    [-2.4, 0.07, 0.06, 0.2],
  ];
  const ring = ([z, w, b, t]: (typeof S)[number]): Vec3[] => [[-w, t, z], [w, t, z], [w, b, z], [-w, b, z]];
  const rings = S.map(ring);
  const axis = (i: number): Vec3 => [0, (S[i]![2] + S[i]![3]) / 2, S[i]![0]];
  const solid = (pts: Vec3[], color: string, center: Vec3) => {
    const n = norm(cross(sub(pts[1]!, pts[0]!), sub(pts[2]!, pts[0]!)));
    const mid = scale(pts.reduce((a, p) => add(a, p), [0, 0, 0] as Vec3), 1 / pts.length);
    const out = dot(n, sub(mid, center)) >= 0 ? n : scale(n, -1);
    faces.push({ pts, color, outward: out });
    return faces.length - 1;
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i]!, b = rings[i + 1]!;
    const c = scale(add(axis(i), axis(i + 1)), 0.5);
    const nose = i === 0;
    const top = solid([a[0]!, a[1]!, b[1]!, b[0]!], nose ? C.cream : i === 2 ? C.glass : C.body, c);
    void top;
    solid([a[3]!, a[2]!, b[2]!, b[3]!], nose ? C.cream : C.bodyDark, c);
    const left = solid([a[0]!, a[3]!, b[3]!, b[0]!], nose ? C.cream : C.body, c);
    const right = solid([a[1]!, a[2]!, b[2]!, b[1]!], nose ? C.cream : C.body, c);
    if (i === 3) {
      // cabin side windows (decals just outside the side faces)
      const win = (s: number): Vec3[] => [[s * 0.405, 0.42, 0.12], [s * 0.39, 0.42, -0.45], [s * 0.38, 0.06, -0.45], [s * 0.405, 0.06, 0.12]];
      faces.push({ pts: win(-1), color: C.glass, decalOf: left });
      faces.push({ pts: win(1), color: C.glass, decalOf: right });
    }
    if (i === 4) {
      // a cream cheat-line stripe along the tail boom
      const stripe = (s: number): Vec3[] => [[s * 0.352, 0.1, -0.6], [s * 0.1, 0.13, -2.2], [s * 0.1, 0.09, -2.2], [s * 0.352, 0.0, -0.6]];
      faces.push({ pts: stripe(-1), color: C.cream, decalOf: left, stroke: false });
      faces.push({ pts: stripe(1), color: C.cream, decalOf: right, stroke: false });
    }
  }
  solid([...rings[0]!].reverse(), C.cream, [0, 0, 0]);
  solid(rings[rings.length - 1]!, C.body, [0, 0.1, 0]);

  // high wing: centre, inboard and outboard panels; ailerons on the outboard trailing edge
  const wy = WING_Y;
  faces.push({ pts: [[-0.42, wy, 0.58], [0.42, wy, 0.58], [0.42, wy, -0.28], [-0.42, wy, -0.28]], color: C.wing, under: C.wingUnder });
  for (const s of [-1, 1]) {
    faces.push({ pts: [[s * 0.42, wy, 0.58], [s * 1.25, wy + 0.02, 0.56], [s * 1.25, wy + 0.02, -0.28], [s * 0.42, wy, -0.28]], color: C.wing, under: C.wingUnder });
    faces.push({ pts: [[s * 1.25, wy + 0.02, 0.56], [s * 2.15, wy + 0.05, 0.52], [s * 2.15, wy + 0.05, 0.02], [s * 1.25, wy + 0.02, 0.02]], color: C.wing, under: C.wingUnder });
    faces.push({ pts: [[s * 2.15, wy + 0.05, 0.52], [s * HALF_SPAN, wy + 0.05, 0.4], [s * HALF_SPAN, wy + 0.05, -0.22], [s * 2.15, wy + 0.05, -0.28]], color: C.body, under: C.bodyDark });
    faces.push({
      pts: [[s * 1.28, wy + 0.02, 0.02], [s * 2.13, wy + 0.05, 0.02], [s * 2.13, wy + 0.05, -0.28], [s * 1.28, wy + 0.02, -0.28]],
      color: C.surface, part: "ailerons", hinge: { kind: s < 0 ? "ailL" : "ailR", at: [0, wy + 0.03, 0.02] },
    });
    // wing strut and main gear
    faces.push({ pts: [[s * 0.38, -0.2, 0.32], [s * 1.25, wy - 0.01, 0.28], [s * 1.25, wy - 0.01, 0.18], [s * 0.38, -0.2, 0.22]], color: C.bodyDark });
    faces.push({ pts: [[s * 0.3, -0.38, 0.22], [s * 0.62, -0.78, 0.2], [s * 0.62, -0.78, 0.1], [s * 0.3, -0.38, 0.08]], color: C.bodyDark });
    faces.push({ pts: wheel([s * 0.66, -0.8, 0.15], 0.17), color: C.tyre });
  }
  faces.push({ pts: [[0.04, -0.36, 1.3], [0.04, -0.7, 1.28], [-0.04, -0.7, 1.28], [-0.04, -0.36, 1.3]], color: C.bodyDark });
  faces.push({ pts: wheel([0.02, -0.72, 1.28], 0.14), color: C.tyre });

  // tail: horizontal stabiliser + elevator, fin + rudder
  faces.push({ pts: [[-1.0, 0.19, -1.86], [1.0, 0.19, -1.86], [1.05, 0.19, -2.1], [-1.05, 0.19, -2.1]], color: C.body, under: C.bodyDark });
  faces.push({ pts: [[-0.4, 0.2, -1.62], [0.4, 0.2, -1.62], [1.0, 0.19, -1.86], [-1.0, 0.19, -1.86]], color: C.body, under: C.bodyDark });
  faces.push({
    pts: [[-1.05, 0.19, -2.1], [1.05, 0.19, -2.1], [0.95, 0.19, -2.42], [-0.95, 0.19, -2.42]],
    color: C.surface, part: "elevator", hinge: { kind: "elev", at: [0, 0.19, -2.1] },
  });
  faces.push({ pts: [[0, 0.2, -1.55], [0, 1.12, -2.02], [0, 1.12, -2.3], [0, 0.2, -2.3]], color: C.body, under: C.body });
  faces.push({
    pts: [[0, 0.2, -2.3], [0, 1.12, -2.3], [0, 1.06, -2.6], [0, 0.22, -2.56]],
    color: C.surface, part: "rudder", hinge: { kind: "rud", at: [0, 0, -2.3] },
  });
  // propeller disc + spinner
  faces.push({ pts: wheelXY([0, -0.03, 1.84], 0.72, 14), color: C.prop, opacity: 0.38, stroke: false });
  faces.push({ pts: wheelXY([0, -0.03, 1.92], 0.13, 8), color: C.body });
  return faces;
}
function wheel(c: Vec3, r: number): Vec3[] {
  return Array.from({ length: 8 }, (_, i) => [c[0], c[1] + r * Math.sin((i / 8) * Math.PI * 2), c[2] + r * Math.cos((i / 8) * Math.PI * 2)] as Vec3);
}
function wheelXY(c: Vec3, r: number, n: number): Vec3[] {
  return Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((i / n) * Math.PI * 2), c[1] + r * Math.sin((i / n) * Math.PI * 2), c[2]] as Vec3);
}
const PLANE = buildPlane();

/** Points that reach furthest from the centre: used to check that a pass clears (or threads) a hoop. */
export const EXTREMITIES: Vec3[] = [
  [-HALF_SPAN, WING_Y + 0.05, 0.1], [HALF_SPAN, WING_Y + 0.05, 0.1],
  [0, 1.12, -2.3], [-1.05, 0.19, -2.1], [1.05, 0.19, -2.1],
  [-0.7, -0.97, 0.15], [0.7, -0.97, 0.15], [0, 0, 1.9],
];

/** Max control-surface deflection drawn (exaggerated a little so 6-year-olds can see it move). */
const DEFLECT = 32 * DEG;

function deflect(p: Vec3, h: Hinge, pose: Pose): Vec3 {
  const rel = sub(p, h.at);
  let out: Vec3;
  switch (h.kind) {
    case "elev":
      out = rotX(rel, pose.elev * DEFLECT);
      break;
    case "ailL":
      out = rotX(rel, pose.ail * DEFLECT);
      break;
    case "ailR":
      out = rotX(rel, -pose.ail * DEFLECT);
      break;
    case "rud":
      out = rotY(rel, pose.rud * DEFLECT);
      break;
  }
  return add(out, h.at);
}

/** World position of a body point at a pose (surfaces deflected). */
export function bodyToWorld(p: Vec3, pose: Pose): Vec3 {
  return add(orient(p, pose.pitch, pose.roll, pose.yaw), [pose.x, pose.y, pose.z]);
}

export interface Poly {
  key: string;
  d: string;
  pts: { x: number; y: number }[];
  fill: string;
  depth: number;
  part?: PartId;
  opacity: number;
  stroke: boolean;
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const LIGHT = norm([-0.45, 0.85, -0.35]);

/** The plane as screen polygons, far to near. */
export function planePolys(pose: Pose, cam: Camera): Poly[] {
  const out: (Poly & { decal?: number; idx: number; visible: boolean })[] = [];
  PLANE.forEach((f, idx) => {
    const world = f.pts.map((p) => bodyToWorld(f.hinge ? deflect(p, f.hinge, pose) : p, pose));
    const pts = world.map((p) => project(cam, p));
    if (pts.some((p) => !p)) return;
    const center = scale(world.reduce((a, p) => add(a, p), [0, 0, 0] as Vec3), 1 / world.length);
    let n = norm(cross(sub(world[1]!, world[0]!), sub(world[2]!, world[0]!)));
    const toCam = sub(cam.pos, center);
    let visible = true;
    if (f.outward) {
      n = orient(f.outward, pose.pitch, pose.roll, pose.yaw);
      visible = dot(n, toCam) > 0;
    }
    const facing = dot(n, toCam) >= 0;
    const lambert = Math.abs(dot(n, LIGHT));
    const base = !facing && f.under ? f.under : f.color;
    const fill = shadeHex(base, 0.8 + 0.24 * lambert);
    const d = `M${pts.map((p) => `${p!.x.toFixed(1)} ${p!.y.toFixed(1)}`).join("L")}Z`;
    out.push({
      key: `f${idx}`, d, pts: pts.map((q) => ({ x: q!.x, y: q!.y })), fill, depth: dot(sub(center, cam.pos), cam.f), part: f.part, opacity: f.opacity ?? 1,
      stroke: f.stroke ?? true, decal: f.decalOf, idx, visible,
    });
  });
  const byIdx = new Map(out.map((p) => [p.idx, p]));
  const main = out.filter((p) => p.decal === undefined && p.visible).sort((a, b) => b.depth - a.depth);
  const result: Poly[] = [];
  for (const p of main) {
    result.push(p);
    for (const dcl of out) if (dcl.decal === p.idx && byIdx.get(p.idx)?.visible) result.push(dcl);
  }
  return result;
}

/** Screen bounding box of a set of polygons. */
export function bboxOf(polys: readonly Poly[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const q of p.pts) {
    x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
  }
  return { x0, y0, x1, y1 };
}

/** Depth of the plane's centre from the camera (for stroke width and hoop ordering). */
export const depthOf = (pose: Pose, cam: Camera) => dot(sub([pose.x, pose.y, pose.z], cam.pos), cam.f);

// ---------------------------------------------------------------- simulation
export interface Seg {
  ctl: Ctl | null;
  /** Duration in sim time units (speed SPEED units per unit). */
  dur: number;
  /** Bank (deg) for roll segments / climb angle (deg) for pitch segments / nose swing (deg) for pedals. */
  amount?: number;
  /** Roll segments: roll back to wings-level near the end (courses) instead of holding the bank. */
  rollOut?: boolean;
}
export interface Track {
  /** Samples at even time steps over [0, total]. */
  poses: Pose[];
  total: number;
}
export const SPEED = 20;
const TURN_K = 2.1;
const STEPS_PER_UNIT = 120;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Rise over [a, b], hold, fall over [c, d]. */
const bump = (u: number, a: number, b: number, c: number, d: number) => (u < c ? smooth((u - a) / (b - a)) : 1 - smooth((u - c) / (d - c)));
const slope = (u: number, a: number, b: number) => (u > a && u < b ? 1 : 0);

export interface SimStart {
  x?: number; y?: number; z?: number;
  /** Path heading (yaw of the flight path), radians. */
  heading?: number;
  /** Nose offset from the path, radians. */
  nose?: number;
  /**
   * On the ground (L6, the take-off roll): the wheels stay on the runway, a pedal steers the nose wheel so the
   * path follows the nose, and the stick only moves the control surfaces (the plane cannot roll or climb yet).
   */
  ground?: boolean;
}

/** Where the runway is (world y) and how high the plane's body sits above it on its wheels. */
export const GROUND_Y = -5;
export const ON_WHEELS_Y = GROUND_Y + 0.97;
/** Rolling speed on the ground (slower than flying, so the plane stays on the runway). */
export const GROUND_SPEED = 9;

/** Fly a list of control segments from a start state. Deterministic. */
export function simulate(segs: readonly Seg[], start: SimStart = {}): Track {
  if (start.ground) return simulateGround(segs, start);
  let x = start.x ?? 0, y = start.y ?? 0, z = start.z ?? 0, psi = start.heading ?? 0;
  const nose0 = start.nose ?? 0;
  let beta = nose0;
  const poses: Pose[] = [];
  const total = segs.reduce((a, s) => a + s.dur, 0);
  const n = Math.max(2, Math.round(total * STEPS_PER_UNIT));
  const dt = total / n;
  let segIdx = 0, segStart = 0;
  for (let i = 0; i <= n; i++) {
    const t = i * dt;
    while (segIdx < segs.length - 1 && t > segStart + segs[segIdx]!.dur + 1e-9) {
      segStart += segs[segIdx]!.dur;
      segIdx++;
    }
    const seg = segs[segIdx]!;
    const u = Math.min(1, Math.max(0, (t - segStart) / seg.dur));
    let gamma = 0, phi = 0, elev = 0, ail = 0, rud = 0;
    const ctl = seg.ctl;
    if (ctl === "back" || ctl === "fwd") {
      const s = ctl === "back" ? 1 : -1;
      const G = (seg.amount ?? 24) * DEG;
      gamma = s * G * bump(u, 0, 0.3, 0.55, 0.88);
      elev = s * (slope(u, 0, 0.3) - 0.55 * slope(u, 0.55, 0.88));
    } else if (ctl === "left" || ctl === "right") {
      const s = ctl === "right" ? 1 : -1;
      const P = (seg.amount ?? 34) * DEG;
      if (seg.rollOut) {
        phi = s * P * bump(u, 0, 0.22, 0.6, 0.85);
        ail = -s * (slope(u, 0, 0.22) - slope(u, 0.6, 0.85));
      } else {
        phi = s * P * smooth(u / 0.24);
        ail = -s * slope(u, 0, 0.24);
      }
    } else if (ctl === "lpedal" || ctl === "rpedal") {
      const s = ctl === "rpedal" ? 1 : -1;
      const B = (seg.amount ?? 16) * DEG;
      beta = nose0 + s * B * smooth(u / 0.35);
      rud = -s * (u < 0.92 ? 1 : 0);
    }
    const fade = 1 - smooth((t / total - 0.84) / 0.16);
    const pose: Pose = { x, y, z, pitch: gamma, roll: phi, yaw: psi + beta, elev, ail, rud, fade };
    poses.push(pose);
    // integrate the path (bank turns it; a pedal skids it only a little)
    const turn = TURN_K * Math.tan(phi) + 0.22 * (beta - nose0);
    psi += turn * dt;
    x += SPEED * dt * Math.sin(psi) * Math.cos(gamma);
    y += SPEED * dt * Math.sin(gamma);
    z += SPEED * dt * Math.cos(psi) * Math.cos(gamma);
  }
  return { poses, total };
}

/** The take-off roll: pedals steer (nose wheel and rudder); stick moves only flap the surfaces. Deterministic. */
function simulateGround(segs: readonly Seg[], start: SimStart): Track {
  let x = start.x ?? 0, z = start.z ?? 0;
  const y = start.y ?? ON_WHEELS_Y;
  const psi0 = (start.heading ?? 0) + (start.nose ?? 0);
  let psi = psi0;
  const poses: Pose[] = [];
  const total = segs.reduce((a, s) => a + s.dur, 0);
  const n = Math.max(2, Math.round(total * STEPS_PER_UNIT));
  const dt = total / n;
  let segIdx = 0, segStart = 0, psiAtSeg = psi0;
  for (let i = 0; i <= n; i++) {
    const t = i * dt;
    while (segIdx < segs.length - 1 && t > segStart + segs[segIdx]!.dur + 1e-9) {
      segStart += segs[segIdx]!.dur;
      segIdx++;
      psiAtSeg = psi;
    }
    const seg = segs[segIdx]!;
    const u = Math.min(1, Math.max(0, (t - segStart) / seg.dur));
    let elev = 0, ail = 0, rud = 0, roll = 0;
    const ctl = seg.ctl;
    if (ctl === "back" || ctl === "fwd") {
      elev = (ctl === "back" ? 1 : -1) * (u < 0.85 ? 1 : 0);
    } else if (ctl === "left" || ctl === "right") {
      const s = ctl === "right" ? 1 : -1;
      ail = -s * (u < 0.85 ? 1 : 0);
      roll = s * 0.025 * Math.sin(Math.PI * Math.min(1, u / 0.85)); // a tiny rock on the wheels: no bank, no turn
    } else if (ctl === "lpedal" || ctl === "rpedal") {
      const s = ctl === "rpedal" ? 1 : -1;
      psi = psiAtSeg + s * (seg.amount ?? 14) * DEG * smooth(u / 0.45);
      rud = -s * (u < 0.92 ? 1 : 0);
    }
    const fade = 1 - smooth((t / total - 0.84) / 0.16);
    poses.push({ x, y, z, pitch: 0, roll, yaw: psi, elev, ail, rud, fade });
    x += GROUND_SPEED * dt * Math.sin(psi);
    z += GROUND_SPEED * dt * Math.cos(psi);
  }
  return { poses, total };
}

/**
 * End a pass early, `gap` units before it would reach a hoop's plane (from sample `from` on), fading out over the
 * last `fadeShare` of what is left: a wrong move in a course veers away and never reaches (or clips) the hoop.
 */
export function cutBefore(track: Track, h: HoopSpec, from: number, gap = 3.6, fadeShare = 0.35): Track {
  const p = track.poses;
  let end = p.length - 1;
  for (let i = Math.max(1, from); i < p.length; i++) {
    if (pastHoop(p[i]!, h) > -gap) {
      end = i;
      break;
    }
  }
  const kept = p.slice(0, end + 1);
  const fadeFrom = Math.round(from + (end - from) * (1 - fadeShare));
  const poses = kept.map((q, i) => (i <= fadeFrom ? { ...q, fade: 1 } : { ...q, fade: 1 - smooth((i - fadeFrom) / Math.max(1, end - fadeFrom)) }));
  return { poses, total: (track.total * end) / (p.length - 1) };
}

/** Pose at fraction f (0..1) of a track (linear interpolation between samples). */
export function poseAt(track: Track, f: number): Pose {
  const p = track.poses;
  const k = Math.min(p.length - 1, Math.max(0, f * (p.length - 1)));
  const i = Math.floor(k);
  const j = Math.min(p.length - 1, i + 1);
  const w = k - i;
  const a = p[i]!, b = p[j]!;
  const mix = (m: keyof Pose) => a[m] + (b[m] - a[m]) * w;
  return { x: mix("x"), y: mix("y"), z: mix("z"), pitch: mix("pitch"), roll: mix("roll"), yaw: mix("yaw"), elev: mix("elev"), ail: mix("ail"), rud: mix("rud"), fade: mix("fade") };
}

// ---------------------------------------------------------------- hoops
export interface HoopSpec {
  c: Vec3;
  /** Facing (direction of flight through it) and bank (tilt). */
  yaw: number;
  pitch: number;
  bank: number;
  r: number;
}
export const HOOP_R = 2.95;
export const HOOP_TUBE = 0.22;

/** A hoop exactly on a track at fraction f, facing the flight direction and tilted to its bank. */
export function hoopOnTrack(track: Track, f: number): HoopSpec {
  const p = poseAt(track, f);
  const q = poseAt(track, Math.min(1, f + 0.01));
  const dir = norm([q.x - p.x, q.y - p.y, q.z - p.z]);
  return { c: [p.x, p.y, p.z], yaw: Math.atan2(dir[0], dir[2]), pitch: Math.asin(Math.max(-1, Math.min(1, dir[1]))), bank: p.roll, r: HOOP_R };
}
const hoopNormal = (h: HoopSpec): Vec3 => orient([0, 0, 1], h.pitch, 0, h.yaw);

/** The hoop's ring as screen points (closed). */
export function hoopPoints(h: HoopSpec, cam: Camera, n = 48): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = add(orient([h.r * Math.cos(a), h.r * Math.sin(a), 0], h.pitch, h.bank, h.yaw), h.c);
    const s = project(cam, p);
    if (s) out.push({ x: s.x, y: s.y });
  }
  return out;
}

/** Signed distance of the plane's centre past the hoop's plane (> 0 = flown past it). */
export const pastHoop = (pose: Pose, h: HoopSpec) => dot(sub([pose.x, pose.y, pose.z], h.c), hoopNormal(h));

export type PassResult = { kind: "through" | "clear" | "touch"; min: number; max: number };
/**
 * Where the plane crosses the hoop's plane: "through" = every extremity inside the ring (with the tube), "clear"
 * = every extremity outside it (a gentle miss beside the hoop, never touching), otherwise "touch" (never allowed).
 * A track that never reaches the hoop's plane, or crosses it far away, is "clear".
 */
export function passOf(track: Track, h: HoopSpec): PassResult {
  const p = track.poses;
  for (let i = 1; i < p.length; i++) {
    const a = pastHoop(p[i - 1]!, h), b = pastHoop(p[i]!, h);
    if (a < 0 && b >= 0) {
      const w = -a / (b - a);
      const pose = poseAt(track, (i - 1 + w) / (p.length - 1));
      const nrm = hoopNormal(h);
      const ds = EXTREMITIES.map((e) => {
        const v = sub(bodyToWorld(e, pose), h.c);
        const inPlane = sub(v, scale(nrm, dot(v, nrm)));
        return len(inPlane);
      });
      const min = Math.min(...ds), max = Math.max(...ds);
      if (max < h.r - HOOP_TUBE) return { kind: "through", min, max };
      if (min > h.r + HOOP_TUBE + 0.15) return { kind: "clear", min, max };
      return { kind: "touch", min, max };
    }
  }
  return { kind: "clear", min: Infinity, max: Infinity };
}

/** Screen-space size of a hoop (for a sparkle). */
export function screenOf(cam: Camera, p: Vec3) {
  return project(cam, p);
}

// ---------------------------------------------------------------- force arrows (side view)
export type ForceId = "lift" | "weight" | "thrust" | "drag";
export const FORCE_DIR: Record<ForceId, Vec3> = { lift: [0, 1, 0], weight: [0, -1, 0], thrust: [0, 0, 1], drag: [0, 0, -1] };
/** Arrow start points on the plane (body frame): lift from the wing, weight from the centre, thrust from the nose, drag from the tail. */
export const FORCE_FROM: Record<ForceId, Vec3> = { lift: [0, 0.6, 0.15], weight: [0, -0.45, 0.15], thrust: [0, -0.02, 2.0], drag: [0, 0.1, -2.6] };
