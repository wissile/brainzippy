import { CREW, INK } from "../../characters/palette";
import type { FaceId, FriendId, Pose } from "./bank";

/**
 * Feeling critters: the Critter Crew drawn with a FACE and BODY LANGUAGE for each feeling (original SVG; same
 * shapes, palette and 5px ink outline as src/characters). Feelings are carried by eyes, brows, mouth, arms, posture
 * and cartoon marks (a tear, a sweat drop, shake lines) — never by colour: a critter's colour never changes.
 * view "back" = turned away (no face), for situation-only and body-only items.
 */
interface EyeSpec { cx: number; cy: number; r: number; s: -1 | 0 | 1; iris?: string }
type Pt = readonly [number, number];
interface CritterSpec {
  skin: string;
  label: string;
  /** behind the body (ears, horns, wings, feet) */
  back: React.ReactNode;
  /** the body itself, no face */
  body: React.ReactNode;
  /** front-only details (belly, snout, beak…) */
  front?: React.ReactNode;
  eyes: EyeSpec[];
  mouth: { x: number; y: number; s: number };
  cheeks: [Pt, Pt];
  shoulders: [Pt, Pt];
  /** hands-by-face points and hands-on-head points (left, right) */
  cheekHands: [Pt, Pt];
  headHands: [Pt, Pt];
  arm: "line" | "thick";
  armColour?: string;
  cx: number;
  headTop: number;
  bodyL: number;
  bodyR: number;
  feetY: number;
}

const SW = 5;
const W = "#fff";

const SPECS: Record<FriendId, CritterSpec> = {
  bobbo: {
    skin: CREW.bobbo,
    label: "Bobbo, the orange monster with tiny wings",
    back: (
      <>
        <path d="M46 108 C30 98 14 100 8 110 C15 113 17 121 14 131 C22 125 31 127 36 135 C38 128 42 120 50 116 Z" fill="#FFE6BA" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M154 108 C170 98 186 100 192 110 C185 113 183 121 186 131 C178 125 169 127 164 135 C162 128 158 120 150 116 Z" fill="#FFE6BA" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M70 76 Q60 46 58 36 Q72 46 88 62 Z" fill="#FFE6BA" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M89 58 Q97 24 100 14 Q104 24 111 58 Z" fill="#FFE6BA" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M130 76 Q140 46 142 36 Q128 46 112 62 Z" fill="#FFE6BA" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <ellipse cx="76" cy="204" rx="22" ry="11" fill="#F2852B" stroke={INK} strokeWidth={SW} />
        <ellipse cx="124" cy="204" rx="22" ry="11" fill="#F2852B" stroke={INK} strokeWidth={SW} />
      </>
    ),
    body: (
      <>
        <path d="M100 50 C141 50 166 112 166 150 C166 185 137 202 100 202 C63 202 34 185 34 150 C34 112 59 50 100 50 Z" fill={CREW.bobbo} stroke={INK} strokeWidth="5.5" />
        <path d="M70 84 C76 70 86 62 96 60" fill="none" stroke={W} strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    front: (
      <>
        <ellipse cx="100" cy="166" rx="40" ry="29" fill="#FFD199" />
        <g fill="#C45E1A"><circle cx="60" cy="130" r="1.8" /><circle cx="66" cy="127" r="1.8" /><circle cx="140" cy="130" r="1.8" /><circle cx="134" cy="127" r="1.8" /></g>
      </>
    ),
    eyes: [{ cx: 80, cy: 110, r: 16, s: -1 }, { cx: 120, cy: 110, r: 16, s: 1 }],
    mouth: { x: 100, y: 144, s: 1 },
    cheeks: [[64, 138], [136, 138]],
    shoulders: [[44, 142], [156, 142]],
    cheekHands: [[56, 128], [144, 128]],
    headHands: [[72, 66], [128, 66]],
    arm: "line",
    cx: 100, headTop: 46, bodyL: 34, bodyR: 166, feetY: 210,
  },
  zuzu: {
    skin: CREW.zuzu,
    label: "Zuzu, the purple three-eyed monster",
    back: (
      <>
        <path d="M72 70 C64 34 70 10 82 12 C94 14 96 44 92 70 Z" fill={CREW.zuzu} stroke={INK} strokeWidth={SW} />
        <path d="M78 62 C74 38 78 22 83 22 C88 24 88 44 86 62 Z" fill="#FFB3D1" />
        <path d="M128 70 C136 34 130 10 118 12 C106 14 104 44 108 70 Z" fill={CREW.zuzu} stroke={INK} strokeWidth={SW} />
        <path d="M122 62 C126 38 122 22 117 22 C112 24 112 44 114 62 Z" fill="#FFB3D1" />
        <ellipse cx="80" cy="206" rx="22" ry="10" fill="#6E4FD8" stroke={INK} strokeWidth={SW} />
        <ellipse cx="120" cy="206" rx="22" ry="10" fill="#6E4FD8" stroke={INK} strokeWidth={SW} />
      </>
    ),
    body: (
      <>
        <path d="M48 200 L48 110 C48 76 70 60 100 60 C130 60 152 76 152 110 L152 200 Z" fill={CREW.zuzu} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <circle cx="70" cy="174" r="8" fill="#B8A3FF" /><circle cx="134" cy="182" r="6" fill="#B8A3FF" />
        <path d="M62 92 C66 80 76 72 88 70" fill="none" stroke={W} strokeOpacity="0.4" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    eyes: [{ cx: 100, cy: 92, r: 10, s: 0 }, { cx: 79, cy: 120, r: 14, s: -1 }, { cx: 121, cy: 120, r: 14, s: 1 }],
    mouth: { x: 100, y: 150, s: 0.95 },
    cheeks: [[64, 142], [136, 142]],
    shoulders: [[50, 146], [150, 146]],
    cheekHands: [[60, 128], [140, 128]],
    headHands: [[66, 76], [134, 76]],
    arm: "line",
    cx: 100, headTop: 58, bodyL: 48, bodyR: 152, feetY: 212,
  },
  gloop: {
    skin: CREW.gloop,
    label: "Gloop, the teal jelly monster with one big eye",
    back: (
      <>
        <path d="M100 58 Q96 40 100 28" fill="none" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
        <path d="M100 12 Q110 26 100 32 Q90 26 100 12 Z" fill="#8FF0E5" stroke={INK} strokeWidth="4" />
      </>
    ),
    body: (
      <>
        <path d="M40 196 Q48 186 50 168 L52 110 C54 76 74 58 100 58 C126 58 146 76 148 110 L150 168 Q152 186 160 196 Q146 200 136 192 Q124 204 112 196 Q100 206 88 196 Q76 204 64 192 Q54 200 40 196 Z" fill={CREW.gloop} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M68 84 C74 74 84 68 94 66" fill="none" stroke={W} strokeOpacity="0.5" strokeWidth="6" strokeLinecap="round" />
        <circle cx="70" cy="170" r="8" fill="#7FE3D8" /><circle cx="132" cy="176" r="6" fill="#7FE3D8" />
      </>
    ),
    eyes: [{ cx: 100, cy: 112, r: 23, s: 0, iris: "#1F6F8B" }],
    mouth: { x: 100, y: 160, s: 0.95 },
    cheeks: [[66, 150], [134, 150]],
    shoulders: [[52, 134], [148, 134]],
    cheekHands: [[70, 112], [130, 112]],
    headHands: [[72, 72], [128, 72]],
    arm: "line",
    cx: 100, headTop: 56, bodyL: 40, bodyR: 160, feetY: 204,
  },
  hoot: {
    skin: CREW.hoot,
    label: "Hoot, the green owl",
    back: (
      <>
        <path d="M62 82 C52 54 54 34 60 30 C72 40 84 58 86 74 Z" fill="#3FA552" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d="M138 82 C148 54 146 34 140 30 C128 40 116 58 114 74 Z" fill="#3FA552" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <ellipse cx="82" cy="206" rx="16" ry="8" fill="#FFB52E" stroke={INK} strokeWidth="4.5" />
        <ellipse cx="118" cy="206" rx="16" ry="8" fill="#FFB52E" stroke={INK} strokeWidth="4.5" />
      </>
    ),
    body: (
      <>
        <ellipse cx="100" cy="140" rx="62" ry="66" fill={CREW.hoot} stroke={INK} strokeWidth="5.5" />
        <path d="M58 104 C64 92 74 84 86 80" fill="none" stroke={W} strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    front: (
      <>
        <ellipse cx="100" cy="164" rx="38" ry="36" fill="#DDF6C8" />
        <path d="M99 112 L101 112" stroke={INK} strokeWidth="5" />
        <path d="M92 132 L108 132 L100 145 Z" fill="#FFB52E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      </>
    ),
    eyes: [{ cx: 80, cy: 112, r: 18, s: -1 }, { cx: 120, cy: 112, r: 18, s: 1 }],
    mouth: { x: 100, y: 158, s: 0.75 },
    cheeks: [[60, 136], [140, 136]],
    shoulders: [[44, 134], [156, 134]],
    cheekHands: [[54, 118], [146, 118]],
    headHands: [[68, 84], [132, 84]],
    arm: "thick",
    armColour: "#4DB05E",
    cx: 100, headTop: 74, bodyL: 38, bodyR: 162, feetY: 212,
  },
  rumble: {
    skin: CREW.rumble,
    label: "Rumble, the blue hippo-rhino with a star horn",
    back: (
      <>
        <circle cx="58" cy="78" r="14" fill={CREW.rumble} stroke={INK} strokeWidth={SW} /><circle cx="58" cy="78" r="6" fill="#FFB3C7" />
        <circle cx="142" cy="78" r="14" fill={CREW.rumble} stroke={INK} strokeWidth={SW} /><circle cx="142" cy="78" r="6" fill="#FFB3C7" />
        <rect x="62" y="180" width="26" height="28" rx="8" fill="#3D7FE0" stroke={INK} strokeWidth={SW} />
        <rect x="112" y="180" width="26" height="28" rx="8" fill="#3D7FE0" stroke={INK} strokeWidth={SW} />
      </>
    ),
    body: (
      <>
        <circle cx="100" cy="132" r="70" fill={CREW.rumble} stroke={INK} strokeWidth="5.5" />
        <path d="M100 42 L108 58 L126 60 L112 72 L116 90 L100 81 L84 90 L88 72 L74 60 L92 58 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M52 100 C58 88 66 80 76 76" fill="none" stroke={W} strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />
      </>
    ),
    front: (
      <>
        <ellipse cx="100" cy="160" rx="44" ry="30" fill="#A9CBFF" stroke={INK} strokeWidth={SW} />
        <ellipse cx="88" cy="152" rx="4" ry="6" fill={INK} /><ellipse cx="112" cy="152" rx="4" ry="6" fill={INK} />
      </>
    ),
    eyes: [{ cx: 80, cy: 112, r: 14, s: -1 }, { cx: 120, cy: 112, r: 14, s: 1 }],
    mouth: { x: 100, y: 174, s: 0.75 },
    cheeks: [[58, 138], [142, 138]],
    shoulders: [[36, 144], [164, 144]],
    cheekHands: [[56, 114], [144, 114]],
    headHands: [[70, 70], [130, 70]],
    arm: "line",
    cx: 100, headTop: 44, bodyL: 30, bodyR: 170, feetY: 212,
  },
  puff: {
    skin: CREW.puff,
    label: "Puff, the pink cloud monster",
    back: (
      <>
        {[62, 82, 100, 118, 138].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 140 Q${x + (i % 2 ? 6 : -6)} 172 ${x} 196`} fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
            <path d={`M${x} 140 Q${x + (i % 2 ? 6 : -6)} 172 ${x} 196`} fill="none" stroke={CREW.puff} strokeWidth="9" strokeLinecap="round" />
          </g>
        ))}
      </>
    ),
    body: (
      <>
        <path d="M52 150 C28 150 28 112 52 110 C48 82 76 70 90 84 C96 62 130 64 132 86 C150 76 174 94 162 114 C180 120 174 152 150 152 Z" fill={CREW.puff} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <path d="M76 96 C80 90 86 86 92 86" fill="none" stroke={W} strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
      </>
    ),
    eyes: [{ cx: 84, cy: 116, r: 13, s: -1 }, { cx: 118, cy: 116, r: 13, s: 1 }],
    mouth: { x: 101, y: 138, s: 0.7 },
    cheeks: [[68, 134], [134, 134]],
    shoulders: [[44, 136], [158, 136]],
    cheekHands: [[60, 112], [142, 112]],
    headHands: [[70, 84], [134, 84]],
    arm: "thick",
    armColour: CREW.puff,
    cx: 101, headTop: 66, bodyL: 30, bodyR: 172, feetY: 202,
  },
};

export const critterLabel = (f: FriendId) => SPECS[f].label;
export const critterSkin = (f: FriendId) => SPECS[f].skin;

// ------------------------------------------------------------------ faces (shared with the feeling flowers)

interface EyeLook { rr: number; px: number; py: number; pr: number; lid: number; slant: number; shut?: "proud" | "squeeze"; star?: boolean }
const LOOK: Record<FaceId, EyeLook> = {
  plain: { rr: 1, px: 0.1, py: 0.05, pr: 0.45, lid: 0, slant: 0 },
  content: { rr: 1, px: 0, py: 0.1, pr: 0.45, lid: 0.22, slant: 0 },
  happy: { rr: 1, px: 0.05, py: -0.1, pr: 0.48, lid: 0, slant: 0, star: true },
  sad: { rr: 1, px: 0, py: 0.38, pr: 0.45, lid: 0.18, slant: 0.18 },
  angry: { rr: 0.95, px: 0, py: 0.12, pr: 0.45, lid: 0.38, slant: -0.3 },
  scared: { rr: 1.15, px: 0, py: 0, pr: 0.26, lid: 0, slant: 0 },
  surprised: { rr: 1.15, px: 0, py: 0, pr: 0.38, lid: 0, slant: 0 },
  frustrated: { rr: 1, px: 0, py: 0, pr: 0.4, lid: 0, slant: 0, shut: "squeeze" },
  proud: { rr: 1, px: 0, py: 0, pr: 0.4, lid: 0, slant: 0, shut: "proud" },
  nervous: { rr: 1, px: 0.42, py: 0.05, pr: 0.42, lid: 0, slant: 0 },
  excited: { rr: 1.08, px: 0, py: -0.05, pr: 0.5, lid: 0, slant: 0, star: true },
  disappointed: { rr: 1, px: 0, py: 0.32, pr: 0.42, lid: 0.5, slant: 0.05 },
  lonely: { rr: 1, px: -0.3, py: 0.38, pr: 0.42, lid: 0.14, slant: 0.15 },
};
/** brow: raise (− = higher, in eye radii), tilt (+ = inner end higher), arch, thickness */
const BROW: Record<FaceId, { raise: number; tilt: number; arch: number; w: number } | null> = {
  plain: null,
  content: { raise: -0.05, tilt: 0, arch: 0.15, w: 4.5 },
  happy: { raise: -0.2, tilt: 0, arch: 0.3, w: 4.5 },
  sad: { raise: -0.1, tilt: 0.45, arch: 0, w: 5 },
  angry: { raise: 0.3, tilt: -0.55, arch: 0, w: 6.5 },
  scared: { raise: -0.45, tilt: 0.4, arch: 0.1, w: 5 },
  surprised: { raise: -0.6, tilt: 0, arch: 0.4, w: 5 },
  frustrated: { raise: 0.25, tilt: -0.45, arch: 0, w: 6 },
  proud: { raise: -0.25, tilt: -0.08, arch: 0.15, w: 5 },
  nervous: { raise: -0.2, tilt: 0.3, arch: 0, w: 4.5 },
  excited: { raise: -0.45, tilt: 0, arch: 0.35, w: 5 },
  disappointed: { raise: 0, tilt: 0.2, arch: 0, w: 5 },
  lonely: { raise: -0.1, tilt: 0.4, arch: 0, w: 5 },
};

const pt = (cx: number, cy: number, R: number, th: number): Pt => [cx + R * Math.sin(th), cy - R * Math.cos(th)];

function Eye({ e, face, skin }: { e: EyeSpec; face: FaceId; skin: string }) {
  const L = LOOK[face];
  const { cx, cy, s } = e;
  const r = e.r;
  const shutW = 5 * Math.max(0.6, Math.min(1, r / 14));
  if (L.shut === "proud") {
    return <path d={`M${cx - r * 0.85} ${cy + r * 0.25} Q${cx} ${cy - r * 0.95} ${cx + r * 0.85} ${cy + r * 0.25}`} fill="none" stroke={INK} strokeWidth={shutW} strokeLinecap="round" />;
  }
  if (L.shut === "squeeze") {
    const d = s === 0 ? `M${cx - r * 0.8} ${cy} Q${cx - r * 0.4} ${cy - r * 0.4} ${cx} ${cy} Q${cx + r * 0.4} ${cy + r * 0.4} ${cx + r * 0.8} ${cy}` : `M${cx - s * r * 0.7} ${cy - r * 0.6} L${cx + s * r * 0.6} ${cy} L${cx - s * r * 0.7} ${cy + r * 0.6}`;
    return <path d={d} fill="none" stroke={INK} strokeWidth={shutW} strokeLinecap="round" strokeLinejoin="round" />;
  }
  const R = r * L.rr;
  const sw = 4.5 * Math.max(0.6, Math.min(1, r / 14));
  const dir = s === 0 ? 1 : s; // nervous/lonely glance: both pupils the same way
  let lidPath: string | null = null;
  let lidLine: string | null = null;
  if (L.lid > 0) {
    // inner side = toward the face centre (right for a left eye); slant > 0 lifts the inner side
    const yMid = cy - R + 2 * R * L.lid;
    const innerUp = s === 0 ? 0 : L.slant * R;
    // a left eye's inner side is its right side; a right eye's inner side is its left side
    const leftY = s === -1 ? yMid + innerUp : s === 1 ? yMid - innerUp : yMid;
    const rightY = s === -1 ? yMid - innerUp : s === 1 ? yMid + innerUp : yMid;
    const clamp = (v: number) => Math.max(cy - R * 0.98, Math.min(cy + R * 0.6, v));
    const lY = clamp(leftY);
    const rY = clamp(rightY);
    const thL = -Math.acos(Math.max(-1, Math.min(1, (cy - lY) / R)));
    const thR = Math.acos(Math.max(-1, Math.min(1, (cy - rY) / R)));
    const pL = pt(cx, cy, R, thL);
    const pR = pt(cx, cy, R, thR);
    const large = thR - thL > Math.PI ? 1 : 0;
    lidPath = `M${pL[0]} ${pL[1]} A${R} ${R} 0 ${large} 1 ${pR[0]} ${pR[1]} Z`;
    lidLine = `M${pL[0]} ${pL[1]} L${pR[0]} ${pR[1]}`;
  }
  const px = cx + L.px * R * dir;
  const py = cy + L.py * R;
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill="#fff" stroke={INK} strokeWidth={sw} />
      {e.iris && <circle cx={px} cy={py} r={R * Math.max(0.5, L.pr + 0.18)} fill={e.iris} />}
      <circle cx={px} cy={py} r={R * L.pr} fill={INK} />
      <circle cx={px + R * 0.16} cy={py - R * 0.18} r={R * (L.star ? 0.2 : 0.14)} fill="#fff" />
      {L.star && <circle cx={px - R * 0.18} cy={py + R * 0.16} r={R * 0.09} fill="#fff" />}
      {lidPath && (
        <>
          <path d={lidPath} fill={skin} />
          <path d={lidLine!} stroke={INK} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
      {lidPath && <circle cx={cx} cy={cy} r={R} fill="none" stroke={INK} strokeWidth={sw} />}
    </g>
  );
}

function Brow({ e, face }: { e: EyeSpec; face: FaceId }) {
  const B = BROW[face];
  if (!B) return null;
  const R = e.r * LOOK[face].rr;
  const r = e.r;
  const bw = B.w * Math.max(0.6, Math.min(1, r / 14));
  const yb = e.cy - R - r * 0.42 + B.raise * r;
  const L = r * 1.3;
  const t = B.tilt * r;
  const a = B.arch * r;
  if (e.s === 0) {
    const d = `M${e.cx - L / 2} ${yb + t} Q${e.cx - L / 4} ${yb - a} ${e.cx} ${yb - t} Q${e.cx + L / 4} ${yb - a} ${e.cx + L / 2} ${yb + t}`;
    return <path d={d} fill="none" stroke={INK} strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round" />;
  }
  const outer: Pt = [e.cx + e.s * (L / 2), yb + t];
  const inner: Pt = [e.cx - e.s * (L / 2), yb - t];
  const mid: Pt = [(outer[0] + inner[0]) / 2, (outer[1] + inner[1]) / 2 - a];
  return <path d={`M${outer[0]} ${outer[1]} Q${mid[0]} ${mid[1]} ${inner[0]} ${inner[1]}`} fill="none" stroke={INK} strokeWidth={bw} strokeLinecap="round" />;
}

export function Mouth({ face, x, y, s }: { face: FaceId; x: number; y: number; s: number }) {
  const dark = "#4A2545";
  const line = (d: string) => <path d={d} fill="none" stroke={INK} strokeWidth={4.5 / s} strokeLinecap="round" strokeLinejoin="round" />;
  let m: React.ReactNode;
  switch (face) {
    case "happy":
      m = (<><path d="M-15 -3 Q0 -1 15 -3 Q12 15 0 15 Q-12 15 -15 -3 Z" fill={dark} stroke={INK} strokeWidth={4 / s} strokeLinejoin="round" /><ellipse cx="0" cy="10" rx="7" ry="3.6" fill="#FF8FB1" /></>);
      break;
    case "excited":
      m = (<><path d="M-18 -4 Q0 -2 18 -4 Q15 20 0 20 Q-15 20 -18 -4 Z" fill={dark} stroke={INK} strokeWidth={4 / s} strokeLinejoin="round" /><ellipse cx="0" cy="14" rx="8" ry="4" fill="#FF8FB1" /></>);
      break;
    case "content":
      m = line("M-10 0 Q0 9 10 0");
      break;
    case "proud":
      m = line("M-14 -2 Q0 13 15 -4");
      break;
    case "sad":
      m = line("M-12 8 Q0 -6 12 8");
      break;
    case "lonely":
      m = line("M-8 6 Q0 -1 8 6");
      break;
    case "disappointed":
      m = line("M-11 5 Q0 0 11 5");
      break;
    case "angry":
      m = (<><path d="M-14 4 Q0 -5 14 4 L12 9 Q0 3 -12 9 Z" fill="#fff" stroke={INK} strokeWidth={4 / s} strokeLinejoin="round" /><path d="M-4 1 L-4 7 M4 1 L4 7" stroke={INK} strokeWidth={2.5 / s} /></>);
      break;
    case "frustrated":
      m = (<><rect x="-14" y="-5" width="28" height="12" rx="4" fill="#fff" stroke={INK} strokeWidth={4 / s} /><path d="M-14 1 L14 1 M-5 -5 L-5 7 M3 -5 L3 7" stroke={INK} strokeWidth={2.5 / s} /></>);
      break;
    case "scared":
      m = (<><ellipse cx="0" cy="3" rx="10" ry="7" fill={dark} stroke={INK} strokeWidth={4 / s} /><path d="M-8 0 L-4 3 L0 0 L4 3 L8 0" fill="none" stroke="#fff" strokeWidth={2.4 / s} strokeLinejoin="round" /></>);
      break;
    case "surprised":
      m = (<><ellipse cx="0" cy="4" rx="8" ry="10" fill={dark} stroke={INK} strokeWidth={4 / s} /><ellipse cx="0" cy="9" rx="4.5" ry="3" fill="#FF8FB1" /></>);
      break;
    case "nervous":
      m = line("M-11 1 Q-6 -4 -1 1 Q4 6 9 1");
      break;
    default:
      m = line("M-9 0 Q0 3 9 0");
  }
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{m}</g>;
}

export function Face({ face, eyes, mouth, skin, cheeks }: { face: FaceId; eyes: EyeSpec[]; mouth: { x: number; y: number; s: number }; skin: string; cheeks?: [Pt, Pt] }) {
  const blush = face === "happy" || face === "excited" || face === "proud" || face === "content";
  return (
    <g className="fg-face">
      {cheeks && (blush || face === "angry") && cheeks.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="9" ry="5" fill="#FF7A6B" opacity={face === "angry" ? 0.5 : 0.6} />)}
      {eyes.map((e, i) => <Eye key={`e${i}`} e={e} face={face} skin={skin} />)}
      {eyes.map((e, i) => <Brow key={`b${i}`} e={e} face={face} />)}
      <Mouth face={face} {...mouth} />
    </g>
  );
}

// ------------------------------------------------------------------ marks (cartoon cues that are shapes, not colours)

export const Tear = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path className="fg-tear" transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 Q7 2 0 8 Q-7 2 0 -9 Z" fill="#9ED8FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
);
export const Sweat = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -10 Q8 2 0 8 Q-8 2 0 -10 Z" fill="#DFF3FF" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
);
export const Sparkle = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path className="fg-sparkle" transform={`translate(${x} ${y}) scale(${s})`} d="M0 -10 Q1.5 -1.5 10 0 Q1.5 1.5 0 10 Q-1.5 1.5 -10 0 Q-1.5 -1.5 0 -10 Z" fill="#FFD43B" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
);
const Puffs = ({ x, y, flip = 1 }: { x: number; y: number; flip?: number }) => (
  <g className="fg-steam" transform={`translate(${x} ${y}) scale(${flip} 1)`} fill="#fff" stroke={INK} strokeWidth="3">
    <circle cx="0" cy="0" r="7" /><circle cx="9" cy="-8" r="5.5" /><circle cx="15" cy="-17" r="4" />
  </g>
);
const Lines = ({ d, cls = "" }: { d: string; cls?: string }) => <path className={cls} d={d} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;

// ------------------------------------------------------------------ arms

function arm(sp: CritterSpec, side: 0 | 1, pose: Pose): { d: string; hand: Pt | null; fist: boolean } {
  const [sx, sy] = sp.shoulders[side];
  const o = side === 0 ? -1 : 1; // outward
  const cx = sp.cx;
  const q = (c: Pt, t: Pt) => ({ d: `M${sx} ${sy} Q${c[0]} ${c[1]} ${t[0]} ${t[1]}`, hand: t, fist: false });
  switch (pose) {
    case "droop": return q([sx + 7 * o, sy + 18], [sx + 3 * o, sy + 38]);
    case "up": return q([sx + 26 * o, sy - 6], [sx + 22 * o, sy - 42]);
    case "fists": return { ...q([sx + 24 * o, sy + 6], [sx + 15 * o, sy + 26]), fist: true };
    case "face": return q([sx + 20 * o, sy - 2], sp.cheekHands[side]);
    case "head": return q([sx + 32 * o, sy - 30], sp.headHands[side]);
    case "hips": {
      const elbow: Pt = [sx + 24 * o, sy + 12];
      const hand: Pt = [sx + 5 * o, sy + 30];
      return { d: `M${sx} ${sy} L${elbow[0]} ${elbow[1]} L${hand[0]} ${hand[1]}`, hand, fist: false };
    }
    case "hug": return q([sx + 2 * o, sy + 30], [cx - 16 * o, sy + 24]);
    case "fidget": return q([sx - 2 * o, sy + 30], [cx + 7 * o, sy + 30]);
    case "cross": return q([sx + 4 * o, sy + 22 + side * 4], [cx - 20 * o, sy + 8 + side * 8]);
    case "knees": return q([sx + 2 * o, sy + 34], [cx - 12 * o, sy + 42]);
    default: return q([sx + 18 * o, sy + 8], [sx + 6 * o, sy + 28]);
  }
}

function Arms({ sp, pose }: { sp: CritterSpec; pose: Pose }) {
  return (
    <g className="fg-arms">
      {([0, 1] as const).map((side) => {
        const a = arm(sp, side, pose);
        if (sp.arm === "thick") {
          return (
            <g key={side} className={`fg-arm fg-arm-${side}`}>
              <path d={a.d} fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
              <path d={a.d} fill="none" stroke={sp.armColour ?? sp.skin} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        }
        return (
          <g key={side} className={`fg-arm fg-arm-${side}`}>
            <path d={a.d} fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            {a.hand && <circle cx={a.hand[0]} cy={a.hand[1]} r={a.fist ? 10 : 8} fill={sp.skin} stroke={INK} strokeWidth="4" />}
            {a.hand && a.fist && <path d={`M${a.hand[0] - 5} ${a.hand[1] - 3} l4 0 M${a.hand[0] - 5} ${a.hand[1] + 2} l4 0`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
}

// ------------------------------------------------------------------ the critter

export interface FeelingCritterProps {
  friend: FriendId;
  face: FaceId;
  pose: Pose;
  view?: "front" | "back";
  /** accessible name (defaults to the critter's name); pass "" to hide from assistive tech */
  label?: string;
  className?: string;
}

/** Which body motion goes with a pose + face (CSS animation classes; none under reduced motion). */
function motionOf(face: FaceId, pose: Pose, back: boolean): string {
  if (pose === "up" && (face === "excited" || face === "happy" || back)) return "bounce";
  if (face === "scared" || (back && pose === "face")) return "shake";
  if (face === "angry" || face === "frustrated" || (back && (pose === "fists" || pose === "cross"))) return "stomp";
  if (face === "nervous") return "fidget";
  if (face === "sad" || face === "lonely" || face === "disappointed" || pose === "droop" || pose === "knees" || pose === "hug") return "slump";
  return "breathe";
}

export function FeelingCritter({ friend, face, pose, view = "front", label, className = "" }: FeelingCritterProps) {
  const sp = SPECS[friend];
  const back = view === "back";
  const motion = motionOf(face, pose, back);
  const name = label ?? sp.label;
  const lean = pose === "face" ? "rotate(-6 100 214)" : pose === "hips" ? "rotate(-3 100 214)" : pose === "up" ? "translate(0 -8)" : pose === "droop" || pose === "hug" ? "translate(0 4)" : pose === "knees" ? "translate(100 214) scale(1 0.86) translate(-100 -214)" : "";
  const e0 = sp.eyes[sp.eyes.length > 2 ? 1 : 0]!;
  const eL = sp.eyes[sp.eyes.length - 1]!;
  const showFace = !back;
  return (
    <svg
      className={`fg-critter fg-${friend} fg-face-${back ? "hidden" : face} fg-pose-${pose} fg-move-${motion} ${back ? "is-back" : ""} ${className}`}
      viewBox="-8 -12 216 252"
      role={name ? "img" : undefined}
      aria-hidden={name ? undefined : true}
      aria-label={name || undefined}
      data-friend={friend}
    >
      <ellipse cx="100" cy="222" rx="66" ry="8" fill={INK} opacity="0.12" />
      {/* motion marks that belong to the body (visible from behind too) */}
      {motion === "bounce" && <Lines cls="fg-mark" d={`M${sp.cx - 34} 232 l-8 6 M${sp.cx} 234 l0 6 M${sp.cx + 34} 232 l8 6`} />}
      {motion === "shake" && <Lines cls="fg-mark" d={`M${sp.bodyL - 12} 112 q-6 8 0 16 M${sp.bodyL - 20} 104 q-7 12 0 30 M${sp.bodyR + 12} 112 q6 8 0 16 M${sp.bodyR + 20} 104 q7 12 0 30`} />}
      {motion === "stomp" && <Lines cls="fg-mark" d={`M${sp.cx - 50} 226 l-12 -4 M${sp.cx - 48} 214 l-12 -8 M${sp.cx + 50} 226 l12 -4`} />}
      <g className="fg-body" transform={lean || undefined}>
        <g className="fg-move">
          {sp.back}
          {sp.body}
          {showFace && sp.front}
          {showFace && <Face face={face} eyes={sp.eyes} mouth={sp.mouth} skin={sp.skin} cheeks={sp.cheeks} />}
          {pose === "knees" && (
            <g fill={sp.skin} stroke={INK} strokeWidth="5">
              <ellipse cx={sp.cx - 24} cy={sp.feetY - 26} rx="20" ry="16" /><ellipse cx={sp.cx + 24} cy={sp.feetY - 26} rx="20" ry="16" />
            </g>
          )}
          <Arms sp={sp} pose={pose} />
          {/* face marks: only when we can see the face */}
          {showFace && (face === "sad" || face === "lonely") && <Tear x={e0.cx - e0.r * 0.2} y={e0.cy + e0.r * 1.45} />}
          {showFace && (face === "scared" || face === "nervous") && <Sweat x={eL.cx + eL.r * 1.5} y={eL.cy - eL.r * 1.1} />}
          {showFace && face === "angry" && (<><Puffs x={sp.cx - 52} y={sp.headTop + 18} flip={-1} /><Puffs x={sp.cx + 52} y={sp.headTop + 18} /></>)}
          {showFace && face === "frustrated" && <path d={`M${sp.cx - 22} ${sp.headTop - 4} q8 -14 14 0 q6 -14 14 0 q6 -14 14 0 q-14 8 -28 2`} fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />}
          {showFace && face === "surprised" && <Lines d={`M${sp.cx} ${sp.headTop - 8} l0 -12 M${sp.cx - 26} ${sp.headTop} l-8 -9 M${sp.cx + 26} ${sp.headTop} l8 -9`} />}
          {showFace && (face === "proud" || face === "excited") && (<><Sparkle x={sp.bodyL - 4} y={sp.headTop + 28} s={0.9} /><Sparkle x={sp.bodyR + 6} y={sp.headTop + 46} s={0.7} /></>)}
          {showFace && face === "disappointed" && <g fill="#fff" stroke={INK} strokeWidth="2.5"><circle cx={sp.mouth.x + 26} cy={sp.mouth.y + 2} r="5" /><circle cx={sp.mouth.x + 36} cy={sp.mouth.y - 4} r="3.5" /></g>}
        </g>
      </g>
    </svg>
  );
}

/** A friend's head-and-shoulders icon (prompt pill). */
export function FriendIcon({ friend }: { friend: FriendId }) {
  const sp = SPECS[friend];
  return (
    <svg className="fg-icon" viewBox="20 20 160 150" aria-hidden="true">
      {sp.back}
      {sp.body}
      {sp.front}
      <Face face="content" eyes={sp.eyes} mouth={sp.mouth} skin={sp.skin} />
    </svg>
  );
}
