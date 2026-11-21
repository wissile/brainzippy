import type { ReactNode } from "react";
import { INK } from "../../characters/palette";

/**
 * Original art for Ripple's Reef Rescue. Critter Crew style: rounded shapes, ink outlines, flat fills, a soft
 * white highlight on the upper left, big friendly eyes. Every creature is a real reef species drawn simply
 * (no likeness to any film or brand character: no clownfish, no blue-and-yellow tang). Coral health is shown
 * by colour AND an icon (sparkle = healthy, half = pale, ring = white) so colour is never the only cue.
 */
export const REEF = {
  water: "#3FB8E0",
  waterLight: "#A8E8F7",
  waterDeep: "#1C5F96",
  sand: "#F6DDA8",
  sandDark: "#D9B676",
  rock: "#A898C2",
  rockDark: "#77699A",
  coralPink: "#FF7A8A",
  coralOrange: "#FFA24C",
  coralPurple: "#9B7BFF",
  coralYellow: "#FFD43B",
  coralTeal: "#2EC4B6",
  pale: "#F7D6DA",
  white: "#F7F6F0",
  algae: "#58AE4A",
  algaeLight: "#93D57F",
  seagrass: "#2F8F55",
  seagrassLight: "#6CC487",
  hot: "#F26A1B",
  cool: "#3D8BFF",
} as const;

const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A friendly eye: white ball, ink pupil, shine. */
function Eye({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={r > 5 ? 3 : 2.5} />
      <circle cx={cx + r * 0.2} cy={cy + r * 0.1} r={r * 0.55} fill={INK} />
      <circle cx={cx - r * 0.05} cy={cy - r * 0.25} r={r * 0.22} fill="#fff" />
    </g>
  );
}
const Svg = ({ vb = "0 0 100 80", children, className = "" }: { vb?: string; children: ReactNode; className?: string }) => (
  <svg viewBox={vb} className={`rr-art ${className}`} aria-hidden="true" overflow="visible">{children}</svg>
);

// ---------------------------------------------------------------- creatures

export function Parrotfish() {
  return (
    <Svg>
      <path d="M14 40 L2 26 L4 54 Z" fill="#E66FB0" {...S} />
      <path d="M12 40 C14 20 40 12 62 16 C80 19 92 30 92 40 C92 52 80 62 60 64 C38 66 14 58 12 40 Z" fill="#3CC8A8" {...S} />
      <path d="M40 16 C46 28 46 50 40 64" fill="none" stroke="#E66FB0" strokeWidth="6" />
      <path d="M58 16 C52 28 52 50 58 64" fill="none" stroke="#2A9C84" strokeWidth="3" opacity="0.6" />
      <path d="M44 22 C50 18 58 18 64 20 L58 12 C52 10 46 14 44 22 Z" fill="#E66FB0" {...S} strokeWidth={3} />
      <path d="M86 34 C96 36 98 44 90 48 C86 46 86 38 86 34 Z" fill="#FFF4DE" {...S} strokeWidth={3} />
      <path d="M88 41 L95 41" stroke={INK} strokeWidth="2" />
      <Eye cx={74} cy={33} r={6.5} />
      <path d="M22 30 C26 24 32 22 38 21" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
    </Svg>
  );
}

export function Surgeonfish() {
  return (
    <Svg>
      <path d="M16 40 L4 24 L6 56 Z" fill="#FFD43B" {...S} />
      <path d="M14 40 C18 14 46 6 66 14 C82 20 92 32 92 40 C92 50 82 62 66 66 C46 72 18 64 14 40 Z" fill="#FFD43B" {...S} />
      <path d="M40 10 C50 2 62 4 68 12" fill="#FFC21A" {...S} strokeWidth={3} />
      <path d="M40 70 C50 78 62 76 68 68" fill="#FFC21A" {...S} strokeWidth={3} />
      <path d="M22 42 L30 42" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M89 42 C91 41 92 43 90 44" stroke={INK} strokeWidth="2.5" fill="none" />
      <Eye cx={74} cy={33} r={6.5} />
      <path d="M26 30 C30 22 38 18 46 16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
    </Svg>
  );
}

export function Damselfish({ color = "#5B7CFA" }: { color?: string }) {
  return (
    <Svg>
      <path d="M22 40 L8 28 L10 52 Z" fill={color} {...S} />
      <path d="M20 40 C22 22 44 16 62 20 C78 24 88 32 88 40 C88 50 78 58 62 60 C44 64 22 58 20 40 Z" fill={color} {...S} />
      <path d="M42 20 C48 12 58 12 64 20" fill="#9FB2FF" {...S} strokeWidth={3} />
      <path d="M50 50 C56 54 64 54 70 50" fill="none" stroke="#9FB2FF" strokeWidth="4" strokeLinecap="round" />
      <path d="M84 42 C86 41 87 43 85 44" stroke={INK} strokeWidth="2.5" fill="none" />
      <Eye cx={72} cy={34} r={6} />
    </Svg>
  );
}

export function Urchin() {
  const spines = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI + (i / 12) * Math.PI;
    return <path key={i} d={`M${50 + Math.cos(a) * 22} ${52 + Math.sin(a) * 18} L${50 + Math.cos(a) * 44} ${52 + Math.sin(a) * 40}`} stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  });
  return (
    <Svg>
      {spines}
      <path d="M18 64 C18 38 34 28 50 28 C66 28 82 38 82 64 Z" fill="#6A3E8E" {...S} />
      <path d="M26 54 C28 44 36 36 44 34" stroke="#fff" strokeWidth="3" fill="none" opacity="0.5" />
      <Eye cx={42} cy={50} r={5.5} />
      <Eye cx={58} cy={50} r={5.5} />
      <path d="M14 66 H86" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

export function Turtle() {
  return (
    <Svg>
      <path d="M30 56 C18 66 10 70 6 66 C8 58 18 52 28 50 Z" fill="#8CCB7A" {...S} strokeWidth={3.5} />
      <path d="M62 56 C70 68 80 72 84 68 C82 60 74 54 64 50 Z" fill="#8CCB7A" {...S} strokeWidth={3.5} />
      <path d="M32 26 C24 18 14 18 10 22 C14 30 24 34 34 32 Z" fill="#8CCB7A" {...S} strokeWidth={3.5} />
      <path d="M78 36 C86 30 96 34 96 42 C96 50 86 52 78 46 Z" fill="#8CCB7A" {...S} />
      <path d="M20 44 C20 24 38 14 52 14 C68 14 82 26 82 44 C82 54 70 60 52 60 C34 60 20 54 20 44 Z" fill="#3F9E5A" {...S} />
      <path d="M40 22 L52 30 L64 22 M52 30 V48 M36 44 L52 48 L68 44" stroke="#2C7444" strokeWidth="3" fill="none" />
      <path d="M30 34 C32 26 38 20 44 18" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
      <Eye cx={88} cy={40} r={4.5} />
      <path d="M93 46 C94 47 92 49 90 48" stroke={INK} strokeWidth="2" fill="none" />
    </Svg>
  );
}

export function Shark() {
  return (
    <Svg>
      <path d="M16 40 L2 20 L6 42 L2 60 Z" fill="#8FA3BF" {...S} />
      <path d="M44 22 L54 4 L62 22" fill="#8FA3BF" {...S} />
      <path d="M52 8 L54 4 L57 10 Z" fill={INK} />
      <path d="M12 40 C16 24 42 18 66 20 C84 22 96 32 96 42 C96 50 86 56 66 58 C42 60 16 56 12 40 Z" fill="#8FA3BF" {...S} />
      <path d="M30 48 C46 56 70 56 88 48 C80 54 66 58 50 56 C40 55 34 52 30 48 Z" fill="#F2F5FA" />
      <path d="M48 52 L40 66 L58 56" fill="#8FA3BF" {...S} strokeWidth={3.5} />
      <path d="M80 46 C84 49 88 49 92 46" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M62 32 V40 M66 31 V39" stroke="#6F84A3" strokeWidth="2.5" strokeLinecap="round" />
      <Eye cx={80} cy={34} r={5.5} />
      <path d="M24 34 C30 28 40 25 50 24" stroke="#fff" strokeWidth="3" fill="none" opacity="0.7" />
    </Svg>
  );
}

export function Cucumber() {
  return (
    <Svg>
      <path d="M10 54 C8 40 24 34 50 34 C74 34 90 38 90 50 C90 62 74 64 50 64 C26 64 12 64 10 54 Z" fill="#D9824A" {...S} />
      {[24, 38, 52, 66, 78].map((x) => <circle key={x} cx={x} cy={40 + (x % 3)} r="3.5" fill="#F2B07A" stroke={INK} strokeWidth="2" />)}
      <path d="M90 48 L98 42 M91 52 L99 52 M90 56 L97 60" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <Eye cx={80} cy={50} r={4.5} />
      <path d="M20 46 C24 40 32 38 40 38" stroke="#fff" strokeWidth="3" fill="none" opacity="0.5" />
    </Svg>
  );
}

export function Shrimp() {
  return (
    <Svg>
      <path d="M70 30 C80 16 92 8 98 6 M66 28 C70 14 80 4 88 2" stroke="#fff" strokeWidth="3" fill="none" />
      <path d="M70 30 C80 16 92 8 98 6 M66 28 C70 14 80 4 88 2" stroke={INK} strokeWidth="1" fill="none" />
      <path d="M14 58 L4 50 L4 66 Z" fill="#E5484D" {...S} strokeWidth={3} />
      <path d="M14 58 C14 40 34 30 54 30 C68 30 76 36 76 44 C76 54 64 60 50 60 C36 60 26 64 14 58 Z" fill="#E5484D" {...S} />
      <path d="M34 34 C38 44 38 54 34 62 M50 30 C54 40 54 52 50 60" stroke="#fff" strokeWidth="4" fill="none" />
      <path d="M40 60 L36 70 M50 60 L48 72 M60 58 L60 70" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <Eye cx={66} cy={38} r={5} />
    </Svg>
  );
}

export function Algae() {
  // turf and leafy algae: soft, lumpy green clumps hugging the rock (seagrass is long blades in sand)
  const clumps = [[22, 54, 13], [40, 48, 15], [60, 50, 14], [78, 55, 12], [31, 40, 10], [52, 36, 11], [70, 41, 9]] as const;
  return (
    <Svg>
      <path d="M6 76 C8 60 24 56 50 56 C76 56 92 60 94 76 Z" fill={REEF.rock} {...S} />
      {clumps.map(([x, y, r], i) => (
        <path
          key={i}
          d={`M${x - r} ${y + r * 0.4} C${x - r * 1.1} ${y - r * 0.5} ${x - r * 0.4} ${y - r} ${x} ${y - r * 0.8} C${x + r * 0.5} ${y - r * 1.1} ${x + r * 1.1} ${y - r * 0.4} ${x + r} ${y + r * 0.4} C${x + r * 0.5} ${y + r * 0.7} ${x - r * 0.5} ${y + r * 0.7} ${x - r} ${y + r * 0.4} Z`}
          fill={i % 2 ? REEF.algaeLight : REEF.algae}
          {...S}
          strokeWidth={3}
        />
      ))}
      {clumps.slice(0, 4).map(([x, y, r], i) => <path key={`h${i}`} d={`M${x - r * 0.5} ${y - r * 0.2} C${x - r * 0.3} ${y - r * 0.6} ${x} ${y - r * 0.6} ${x + r * 0.2} ${y - r * 0.5}`} stroke="#fff" strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" />)}
    </Svg>
  );
}

export function Seagrass() {
  return (
    <Svg>
      <path d="M2 76 C20 68 80 68 98 76 Z" fill={REEF.sand} {...S} strokeWidth={3.5} />
      {[16, 28, 40, 52, 64, 76, 86].map((x, i) => (
        <path key={x} d={`M${x} 72 C${x - 4} 52 ${x + (i % 2 ? 8 : -8)} 30 ${x + (i % 2 ? 4 : -2)} ${8 + (i % 3) * 6}`} stroke={i % 2 ? REEF.seagrassLight : REEF.seagrass} strokeWidth="7" fill="none" strokeLinecap="round" />
      ))}
    </Svg>
  );
}

export function CoralSprig({ color = REEF.coralPink }: { color?: string }) {
  return (
    <Svg>
      <path d="M36 74 L64 74 L60 64 L40 64 Z" fill="#BFB3D6" {...S} strokeWidth={3.5} />
      <path d="M50 64 V40 M50 50 C42 46 36 38 34 26 M50 44 C58 40 64 30 64 18 M34 26 C30 20 30 14 32 10 M64 18 C68 14 72 12 76 12 M50 40 C50 30 48 22 46 16" stroke={INK} strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M50 64 V40 M50 50 C42 46 36 38 34 26 M50 44 C58 40 64 30 64 18 M34 26 C30 20 30 14 32 10 M64 18 C68 14 72 12 76 12 M50 40 C50 30 48 22 46 16" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
      {[[32, 10], [76, 12], [46, 16], [34, 26], [64, 18]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#fff" />)}
    </Svg>
  );
}

export function Sun() {
  return (
    <Svg>
      <g stroke="#FFB020" strokeWidth="5" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <path key={i} d={`M${50 + Math.cos(a) * 28} ${40 + Math.sin(a) * 28} L${50 + Math.cos(a) * 38} ${40 + Math.sin(a) * 38}`} />;
        })}
      </g>
      <circle cx="50" cy="40" r="22" fill="#FFD43B" stroke={INK} strokeWidth="4" />
      <path d="M38 34 C40 28 46 24 52 24" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" />
    </Svg>
  );
}

// ---------------------------------------------------------------- food and habitat zones

function FishSchool() {
  return (
    <Svg>
      <g transform="translate(2 4) scale(0.5)"><DamselParts color="#5B7CFA" /></g>
      <g transform="translate(46 0) scale(0.45)"><DamselParts color="#7F8CFF" /></g>
      <g transform="translate(26 38) scale(0.5)"><DamselParts color="#5B7CFA" /></g>
    </Svg>
  );
}
function DamselParts({ color }: { color: string }) {
  return (
    <g>
      <path d="M22 40 L8 28 L10 52 Z" fill={color} {...S} />
      <path d="M20 40 C22 22 44 16 62 20 C78 24 88 32 88 40 C88 50 78 58 62 60 C44 64 22 58 20 40 Z" fill={color} {...S} />
      <circle cx="72" cy="34" r="6" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="73" cy="35" r="3.3" fill={INK} />
    </g>
  );
}
function SandBits() {
  return (
    <Svg>
      <path d="M2 76 C14 52 86 52 98 76 Z" fill={REEF.sand} {...S} />
      {[[22, 66], [34, 60], [48, 64], [60, 58], [72, 66], [40, 70], [80, 70], [28, 72]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 2.2 : 3} fill={i % 2 ? "#8E6A3A" : "#6BA35A"} />
      ))}
      <path d="M24 58 C34 54 44 52 54 52" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
    </Svg>
  );
}

function Rays({ x = 50, w = 70, o = 0.5 }: { x?: number; w?: number; o?: number }) {
  return (
    <g opacity={o}>
      {[-1, 0, 1].map((k) => (
        <path key={k} d={`M${x + k * w * 0.3 - 6} 0 L${x + k * w * 0.3 + 6} 0 L${x + k * w * 0.45 + 10} 60 L${x + k * w * 0.45 - 10} 60 Z`} fill="#FFF6C9" />
      ))}
    </g>
  );
}

function ZoneRock() {
  return (
    <Svg>
      <Rays />
      <path d="M6 78 C6 56 22 44 50 44 C78 44 94 56 94 78 Z" fill={REEF.rock} {...S} />
      <path d="M18 60 C22 52 30 48 40 47" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
    </Svg>
  );
}
function ZoneSand() {
  return (
    <Svg>
      <Rays />
      <path d="M2 78 C20 62 80 62 98 78 Z" fill={REEF.sand} {...S} />
      <path d="M20 72 C26 69 32 69 38 72 M54 72 C60 69 66 69 72 72" stroke={REEF.sandDark} strokeWidth="3" fill="none" />
    </Svg>
  );
}
function ZoneCrevice() {
  return (
    <Svg>
      <path d="M4 78 L4 20 C20 6 80 6 96 20 L96 78 Z" fill={REEF.rock} {...S} />
      <path d="M34 78 C30 56 38 36 50 34 C62 36 70 56 66 78 Z" fill="#3E3560" {...S} />
      <path d="M14 30 C22 20 32 16 42 14" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" />
    </Svg>
  );
}
function ZoneDeep() {
  return (
    <Svg>
      <defs>
        <linearGradient id="rr-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B6FA8" />
          <stop offset="1" stopColor="#0F2E55" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="74" rx="12" fill="url(#rr-deep)" stroke={INK} strokeWidth="4" />
      {[[22, 60], [70, 30], [52, 66]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" opacity="0.4" />)}
    </Svg>
  );
}

// ---------------------------------------------------------------- coral, polyp, patches

export function Polyp({ algae = true }: { algae?: boolean }) {
  return (
    <Svg vb="0 0 100 100">
      <path d="M30 96 L34 52 L66 52 L70 96 Z" fill="#FFB3BE" {...S} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI + (i / 7) * Math.PI;
        return <path key={i} d={`M${50 + Math.cos(a) * 14} ${52 + Math.sin(a) * 6} Q${50 + Math.cos(a) * 30} ${40 + Math.sin(a) * 30} ${50 + Math.cos(a) * 36} ${44 + Math.sin(a) * 38}`} stroke={INK} strokeWidth="8" fill="none" strokeLinecap="round" />;
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI + (i / 7) * Math.PI;
        return <path key={i} d={`M${50 + Math.cos(a) * 14} ${52 + Math.sin(a) * 6} Q${50 + Math.cos(a) * 30} ${40 + Math.sin(a) * 30} ${50 + Math.cos(a) * 36} ${44 + Math.sin(a) * 38}`} stroke="#FFB3BE" strokeWidth="4" fill="none" strokeLinecap="round" />;
      })}
      {algae && [[42, 66], [56, 70], [48, 80], [60, 86], [40, 88], [52, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill="#B8862E" stroke={INK} strokeWidth="1.5" />)}
    </Svg>
  );
}

export type PatchState = "healthy" | "pale" | "white";
const PATCH_COLORS: Record<PatchState, [string, string, string]> = {
  healthy: [REEF.coralPink, REEF.coralPurple, REEF.coralOrange],
  pale: ["#F9C9CF", "#D9CCF5", "#FBD7B5"],
  white: [REEF.white, "#EEEDE6", REEF.white],
};
/** One reef patch: a branching coral, a brain coral and a fan. Colours vary with `variant` (0–4). */
export function CoralPatch({ state, variant = 0 }: { state: PatchState; variant?: number }) {
  const [a, b, c] = PATCH_COLORS[state];
  const v = variant % 3;
  const branch = [a, b, c][v]!;
  const brain = [b, c, a][v]!;
  return (
    <svg viewBox="0 0 100 80" className={`rr-patch-art is-${state}`} aria-hidden="true" overflow="visible">
      <path d="M2 80 C8 66 30 60 50 60 C70 60 92 66 98 80 Z" fill={REEF.rock} stroke={INK} strokeWidth="3.5" />
      <g className="rr-sway">
        <path d="M30 62 V40 M30 50 C24 46 20 38 20 28 M30 44 C36 40 40 32 40 22 M20 28 C18 24 18 20 20 16" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M30 62 V40 M30 50 C24 46 20 38 20 28 M30 44 C36 40 40 32 40 22 M20 28 C18 24 18 20 20 16" stroke={branch} strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <path d="M50 64 C50 50 60 44 70 44 C80 44 88 50 88 62 Z" fill={brain} stroke={INK} strokeWidth="3.5" />
      <path d="M56 58 C60 52 64 56 68 50 C72 56 76 50 82 56" stroke={INK} strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M46 62 C40 50 44 38 52 34 C56 42 56 54 52 62 Z" fill={c} stroke={INK} strokeWidth="3" />
    </svg>
  );
}

/** Health icon shown with every patch (colour is never the only cue). */
export function HealthIcon({ state }: { state: PatchState }) {
  return (
    <svg viewBox="0 0 20 20" className={`rr-health is-${state}`} aria-hidden="true">
      {state === "healthy" ? (
        <path d="M10 1 L12.4 7.6 L19 10 L12.4 12.4 L10 19 L7.6 12.4 L1 10 L7.6 7.6 Z" fill="#FFD43B" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      ) : state === "pale" ? (
        <g><circle cx="10" cy="10" r="8" fill="#fff" stroke={INK} strokeWidth="2" /><path d="M10 2 A8 8 0 0 1 10 18 Z" fill="#F9A8B4" /></g>
      ) : (
        <circle cx="10" cy="10" r="7.5" fill="#fff" stroke={INK} strokeWidth="2" strokeDasharray="3 2" />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- story and action icons (small)

function Thermo({ hot }: { hot: boolean }) {
  const c = hot ? REEF.hot : REEF.cool;
  return (
    <Svg>
      <rect x="40" y="6" width="20" height="52" rx="10" fill="#fff" {...S} />
      <rect x="45" y={hot ? 14 : 40} width="10" height={hot ? 40 : 14} rx="5" fill={c} />
      <circle cx="50" cy="64" r="13" fill={c} {...S} />
      {hot ? <path d="M70 18 L80 14 M72 30 L84 30 M70 42 L80 46" stroke={REEF.hot} strokeWidth="4" strokeLinecap="round" /> : <path d="M72 20 L78 26 M78 20 L72 26 M72 38 L78 44 M78 38 L72 44" stroke={REEF.cool} strokeWidth="3" strokeLinecap="round" />}
    </Svg>
  );
}
function CoralState({ color, droop = false, dots }: { color: string; droop?: boolean; dots?: "out" | "in" }) {
  return (
    <Svg>
      <g transform={droop ? "rotate(12 50 70)" : undefined}><CoralSprigPaths color={color} /></g>
      {dots === "out" && [[78, 20], [86, 34], [16, 18], [12, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#B8862E" stroke={INK} strokeWidth="1.5" />)}
      {dots === "out" && <path d="M70 26 L80 18 M28 26 L16 18" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
      {dots === "in" && [[40, 30], [58, 26], [48, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="#B8862E" stroke={INK} strokeWidth="1.5" />)}
      {dots === "in" && <path d="M84 10 L66 24 M66 24 L72 24 M66 24 L66 18" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />}
    </Svg>
  );
}
function CoralSprigPaths({ color }: { color: string }) {
  const d = "M50 74 V44 M50 56 C42 52 36 44 34 32 M50 50 C58 46 64 36 64 24 M50 44 C50 34 48 26 46 20";
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
    </g>
  );
}
function Bottle({ wave = false }: { wave?: boolean }) {
  return (
    <Svg>
      <path d="M42 8 H58 V18 C70 22 72 30 72 40 V70 H28 V40 C28 30 30 22 42 18 Z" fill="#E8F1FF" {...S} />
      <rect x="40" y="2" width="20" height="8" rx="2" fill="#9AA6BD" {...S} strokeWidth={3} />
      <path d="M36 46 H64" stroke={INK} strokeWidth="3" />
      <path d="M50 52 C46 58 46 62 50 64 C54 62 54 58 50 52 Z" fill="#7FB8FF" stroke={INK} strokeWidth="2" />
      {wave && <path d="M8 74 C18 66 28 82 38 74 C48 66 58 82 68 74 C78 66 88 82 96 74" stroke={REEF.cool} strokeWidth="4" fill="none" strokeLinecap="round" />}
    </Svg>
  );
}
function Buoy() {
  return (
    <Svg>
      <path d="M4 60 C20 52 30 68 50 60 C70 52 80 68 96 60" stroke={REEF.cool} strokeWidth="4" fill="none" />
      <circle cx="50" cy="44" r="16" fill="#fff" {...S} />
      <path d="M36 38 H64 M36 50 H64" stroke="#E5484D" strokeWidth="5" />
      <path d="M50 60 V76" stroke={INK} strokeWidth="3" strokeDasharray="3 3" />
      <path d="M66 40 L82 30" stroke={INK} strokeWidth="3" />
      <path d="M78 24 L94 24 L90 34 L80 34 Z" fill="#C98A4B" {...S} strokeWidth={3} />
    </Svg>
  );
}
function Nursery() {
  return (
    <Svg>
      <path d="M50 8 V76 M30 22 H70 M24 40 H76 M30 58 H70" stroke="#9AA6BD" strokeWidth="5" strokeLinecap="round" />
      {([[34, 28], [62, 28], [30, 46], [70, 46], [36, 64], [62, 64]] as const).map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} V${y - 8} M${x} ${y - 4} L${x - 5} ${y - 10} M${x} ${y - 4} L${x + 5} ${y - 10}`} stroke={REEF.coralPink} strokeWidth="4" strokeLinecap="round" />
      ))}
    </Svg>
  );
}
function Turbine() {
  return (
    <Svg>
      <path d="M48 76 L50 34 L52 76 Z" fill="#E8EEF5" {...S} strokeWidth={3} />
      <circle cx="50" cy="32" r="5" fill="#fff" {...S} strokeWidth={3} />
      <path d="M50 32 L50 4 L56 26 Z M50 32 L74 46 L54 38 Z M50 32 L26 46 L44 36 Z" fill="#fff" {...S} strokeWidth={3} />
      <path d="M6 76 H94" stroke={REEF.seagrass} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}
function Shield({ children }: { children: ReactNode }) {
  return (
    <Svg>
      <path d="M50 4 L86 16 V40 C86 60 70 72 50 78 C30 72 14 60 14 40 V16 Z" fill="#E3F6EA" {...S} />
      {children}
    </Svg>
  );
}
function Pipe() {
  return (
    <Svg>
      <path d="M4 24 H44 V40 H4 Z" fill="#9AA6BD" {...S} />
      <path d="M44 34 C56 40 62 52 60 70 C70 72 84 66 92 56 C84 46 70 42 60 34" fill="#9C7A4A" {...S} strokeWidth={3} opacity="0.95" />
      <circle cx="70" cy="56" r="3" fill="#5E4426" />
      <circle cx="78" cy="50" r="2.5" fill="#5E4426" />
    </Svg>
  );
}
function Net() {
  return (
    <Svg>
      <path d="M10 10 L90 10 L74 72 L26 72 Z" fill="none" {...S} />
      <path d="M22 10 L40 72 M38 10 L50 72 M62 10 L50 72 M78 10 L60 72 M14 26 H86 M18 42 H82 M22 58 H78" stroke={INK} strokeWidth="2" />
      <g transform="translate(30 30) scale(0.4)"><DamselParts color="#FFD43B" /></g>
    </Svg>
  );
}
function Anchor() {
  return (
    <Svg>
      <circle cx="50" cy="12" r="7" fill="none" {...S} />
      <path d="M50 20 V68 M34 30 H66 M22 52 C24 66 36 72 50 70 C64 72 76 66 78 52" fill="none" {...S} strokeWidth={6} />
      <path d="M22 52 L16 58 M78 52 L84 58" {...S} />
      <path d="M8 78 C20 70 40 74 50 78 C60 74 80 70 92 78" stroke={REEF.coralPink} strokeWidth="5" fill="none" />
    </Svg>
  );
}
function Hand() {
  return (
    <Svg>
      <path d="M34 76 C26 60 22 46 26 40 C30 36 34 40 36 46 L36 14 C36 8 44 8 44 14 L44 38 L46 8 C46 2 54 2 54 8 L54 38 L56 12 C56 6 64 6 64 12 L64 40 L66 20 C66 14 74 14 74 20 L72 56 C70 66 66 72 62 76 Z" fill="#FFD9B8" {...S} strokeWidth={3.5} />
    </Svg>
  );
}

// ---------------------------------------------------------------- the planting frame

export function FrameSlotArt({ cond }: { cond: string }) {
  return (
    <svg viewBox="0 0 80 60" className={`rr-slot-art cond-${cond}`} aria-hidden="true" preserveAspectRatio="none">
      {cond === "deep" ? <rect width="80" height="60" fill="#163E6E" /> : <rect width="80" height="60" fill="#8ED9F0" />}
      {cond !== "deep" && cond !== "shade" && <Rays x={40} w={40} o={0.55} />}
      {cond === "shade" && (
        <>
          <rect width="80" height="60" fill="#2A4E6E" opacity="0.6" />
          <path d="M0 0 H80 V12 C60 22 20 22 0 14 Z" fill={REEF.rockDark} stroke={INK} strokeWidth="3" />
        </>
      )}
      {cond === "algae" && [10, 22, 34, 46, 58, 70].map((x, i) => <path key={x} d={`M${x} 60 C${x - 6} 44 ${x + 6} 36 ${x} ${26 + (i % 2) * 8} C${x + 8} 40 ${x + 6} 50 ${x + 4} 60 Z`} fill={i % 2 ? REEF.algaeLight : REEF.algae} stroke={INK} strokeWidth="2" />)}
      {cond === "sand" && (
        <>
          <path d="M0 60 C10 40 70 40 80 60 Z" fill={REEF.sand} stroke={INK} strokeWidth="2.5" />
          <path d="M12 40 C22 34 30 34 38 38 M46 32 C54 26 62 28 70 32" stroke={INK} strokeWidth="2.5" fill="none" markerEnd="" />
          <path d="M66 28 L72 32 L66 36" stroke={INK} strokeWidth="2.5" fill="none" />
        </>
      )}
      {cond === "deep" && [[14, 20], [60, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.5" />)}
    </svg>
  );
}

// ---------------------------------------------------------------- lookup

const ART: Record<string, () => React.JSX.Element> = {
  parrotfish: Parrotfish,
  surgeonfish: Surgeonfish,
  damselfish: () => <Damselfish />,
  urchin: Urchin,
  turtle: Turtle,
  shark: Shark,
  cucumber: Cucumber,
  shrimp: Shrimp,
  algae: Algae,
  seagrass: Seagrass,
  coral: () => <CoralSprig />,
  sun: Sun,
  polyp: () => <Polyp />,
  chain: () => <Sun />,
  thermo: () => <Thermo hot />,
  shell: () => <ShellIcon />,
  "food-algae": Algae,
  "food-seagrass": Seagrass,
  "food-fish": FishSchool,
  "food-sand": SandBits,
  "zone-rock": ZoneRock,
  "zone-sand": ZoneSand,
  "zone-crevice": ZoneCrevice,
  "zone-deep": ZoneDeep,
  "story-warm": () => <Thermo hot />,
  "story-expel": () => <CoralState color={REEF.pale} dots="out" />,
  "story-white": () => <CoralState color={REEF.white} />,
  "story-weak": () => <CoralState color={REEF.white} droop />,
  "story-chem": () => <Bottle />,
  "story-cool": () => <Thermo hot={false} />,
  "story-return": () => <CoralState color={REEF.pale} dots="in" />,
  "story-colour": () => <CoralState color={REEF.coralPink} />,
  "story-grow": () => <CoralState color={REEF.coralOrange} />,
  "story-wash": () => <Bottle wave />,
  "act-less-runoff": () => <Shield><path d="M30 50 C40 40 60 60 70 50" stroke={REEF.cool} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M50 20 C42 32 42 38 50 40 C58 38 58 32 50 20 Z" fill="#7FB8FF" stroke={INK} strokeWidth="2.5" /></Shield>,
  "act-protect-grazers": () => <Shield><g transform="translate(20 22) scale(0.6)"><DamselParts color="#3CC8A8" /></g></Shield>,
  "act-mooring": Buoy,
  "act-nursery": Nursery,
  "act-clean-energy": Turbine,
  "act-heatwave": () => <Thermo hot />,
  "act-runoff": Pipe,
  "act-overfishing": Net,
  "act-anchor": Anchor,
  "act-touch": Hand,
};

/** Art by key (cards, zones, prompt icons). Unknown keys draw a shell. */
export function ReefObject({ kind }: { kind: string }) {
  const A = ART[kind] ?? ShellIcon;
  return <A />;
}
export const hasArt = (k: string | undefined) => !!k && k in ART;

function ShellIcon() {
  return (
    <Svg>
      <path d="M50 8 C24 8 10 30 12 52 L40 72 H60 L88 52 C90 30 76 8 50 8 Z" fill="#FFD6A5" {...S} />
      <path d="M50 70 L50 12 M50 70 L30 16 M50 70 L70 16 M50 70 L18 34 M50 70 L82 34" stroke={INK} strokeWidth="2.5" />
    </Svg>
  );
}

export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

// ---------------------------------------------------------------- scene background

/** Underwater by Monster Island: sunlit water, light rays, distant reef shapes, Ripple's kelp and the sand. */
export function ReefBackground() {
  return (
    <svg className="scene-bg rr-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="rr-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FD8F2" />
          <stop offset="0.55" stopColor="#3FB0DC" />
          <stop offset="1" stopColor="#2A8DC2" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#rr-water)" />
      <g className="rr-rays" opacity="0.28">
        {[200, 520, 860, 1220, 1480].map((x, i) => <path key={x} d={`M${x - 30} 0 L${x + 30} 0 L${x + 120 + i * 10} 900 L${x - 20 + i * 10} 900 Z`} fill="#FFFBE0" />)}
      </g>
      <path d="M0 0 C200 18 400 -6 600 12 C800 30 1000 6 1200 16 C1400 26 1500 10 1600 14 L1600 0 Z" fill="#CFF4FF" opacity="0.7" />
      <g opacity="0.35" fill="#2272A8">
        <path d="M0 760 C120 680 240 700 320 650 C400 600 480 660 560 640 C640 620 700 700 800 690 L800 900 L0 900 Z" />
        <path d="M900 700 C1000 640 1100 690 1180 640 C1260 590 1360 650 1440 620 C1520 600 1580 640 1600 640 L1600 900 L900 900 Z" />
      </g>
      <g className="rr-kelp">
        {[60, 110, 1520].map((x, i) => (
          <path key={x} d={`M${x} 900 C${x - 30} 760 ${x + 40} 640 ${x} 520 C${x - 30} 420 ${x + 20} 340 ${x + 10} ${260 + i * 40}`} stroke="#3E9B5F" strokeWidth="18" fill="none" strokeLinecap="round" />
        ))}
      </g>
      <path d="M0 830 C300 800 600 820 900 806 C1200 792 1400 816 1600 806 L1600 900 L0 900 Z" fill={REEF.sand} />
      <g fill="#fff" opacity="0.5">
        {[[300, 420, 8], [330, 360, 5], [1300, 300, 7], [1330, 250, 4], [760, 200, 5]].map(([x, y, r]) => <circle key={`${x}${y}`} cx={x} cy={y} r={r} className="rr-bubble" />)}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- sticker

export function ReefGuardianSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Reef Guardian sticker: a round shell badge with a coral sprig and Ripple's kelp-leaf hat">
      <circle cx="120" cy="120" r="112" fill="#8EE3C8" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="94" fill="#BDEFFF" stroke={INK} strokeWidth="4" />
      <g transform="translate(120 100) scale(0.8) translate(-120 -111)">
      <path d="M120 56 C78 56 54 92 58 128 L104 166 H136 L182 128 C186 92 162 56 120 56 Z" fill="#FFD6A5" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M120 164 L120 62 M120 164 L90 68 M120 164 L150 68 M120 164 L70 92 M120 164 L170 92" stroke={INK} strokeWidth="3" />
      <g transform="translate(80 96) scale(0.8)">
        <CoralSprigPaths color={REEF.coralPink} />
      </g>
      </g>
      {/* Ripple's kelp-leaf hat */}
      <path d="M78 52 C92 30 136 26 162 44 C150 50 136 50 120 46 C106 50 92 54 78 52 Z" fill="#3E9B5F" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M92 46 C108 40 128 38 146 42" stroke="#7CCB8F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path id="rr-arc" d="M40 172 A88 88 0 0 0 200 172" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="20" fill="#fff" letterSpacing="2" stroke={INK} strokeWidth="1">
        <textPath href="#rr-arc" startOffset="50%" textAnchor="middle">REEF GUARDIAN</textPath>
      </text>
    </svg>
  );
}
