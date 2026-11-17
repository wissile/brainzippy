import { useEffect, useRef, useState } from "react";
import type { MascotState } from "../engine/types";
import { INK } from "./palette";

/**
 * The child's own monster, built from the Critter Crew shape kit: round chunky bodies, big eyes with a white
 * shine, pink cheeks, one ink outline weight. Every part is a separate layer so any combination looks like
 * one family. Pure SVG; states reuse characters.css.
 */
export const BODIES = ["egg", "round", "bean", "jelly", "block"] as const;
export const COLORS = ["orange", "purple", "teal", "green", "blue", "pink", "yellow", "red"] as const;
export const EYES = ["two", "one", "three", "sleepy", "specs"] as const;
export const MOUTHS = ["smile", "laugh", "fang", "o", "tongue"] as const;
export const ARMS = ["tiny", "wave", "claws", "wings", "noodle"] as const;
export const TOPS = ["horns", "ears", "antenna", "leaves", "none"] as const;

export type BodyId = (typeof BODIES)[number];
export type ColorId = (typeof COLORS)[number];
export type EyesId = (typeof EYES)[number];
export type MouthId = (typeof MOUTHS)[number];
export type ArmsId = (typeof ARMS)[number];
export type TopId = (typeof TOPS)[number];

export interface MonsterConfig {
  body: BodyId;
  color: ColorId;
  eyes: EyesId;
  mouth: MouthId;
  arms: ArmsId;
  top: TopId;
}

export const COLOR_HEX: Record<ColorId, string> = {
  orange: "#FF9F43",
  purple: "#8E6CEF",
  teal: "#2EC4B6",
  green: "#6BCB77",
  blue: "#4D96FF",
  pink: "#FF8FB1",
  yellow: "#FFD43B",
  red: "#FF6B6B",
};

export const DEFAULT_MONSTER: MonsterConfig = { body: "egg", color: "teal", eyes: "two", mouth: "smile", arms: "tiny", top: "antenna" };

export function randomMonster(rand: () => number = Math.random): MonsterConfig {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  return { body: pick(BODIES), color: pick(COLORS), eyes: pick(EYES), mouth: pick(MOUTHS), arms: pick(ARMS), top: pick(TOPS) };
}

export function isMonsterConfig(x: unknown): x is MonsterConfig {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return (
    (BODIES as readonly unknown[]).includes(m.body) &&
    (COLORS as readonly unknown[]).includes(m.color) &&
    (EYES as readonly unknown[]).includes(m.eyes) &&
    (MOUTHS as readonly unknown[]).includes(m.mouth) &&
    (ARMS as readonly unknown[]).includes(m.arms) &&
    (TOPS as readonly unknown[]).includes(m.top)
  );
}

/** Mix two hex colours (t = 0 → a, 1 → b). */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

interface Geo {
  path: string;
  top: number; // y of the top edge (accessories sit here)
  face: number; // eye line
  armY: number;
  armL: number;
  armR: number;
  belly?: [number, number, number, number];
  feet: boolean;
}

const GEO: Record<BodyId, Geo> = {
  egg: {
    path: "M100 50 C141 50 166 112 166 150 C166 185 137 202 100 202 C63 202 34 185 34 150 C34 112 59 50 100 50 Z",
    top: 52, face: 112, armY: 142, armL: 38, armR: 162, belly: [100, 162, 40, 31], feet: true,
  },
  round: {
    path: "M32 136 A68 68 0 1 0 168 136 A68 68 0 1 0 32 136 Z",
    top: 70, face: 120, armY: 146, armL: 34, armR: 166, belly: [100, 164, 42, 28], feet: true,
  },
  bean: {
    path: "M50 196 L50 108 C50 74 72 56 100 56 C128 56 150 74 150 108 L150 196 Q100 206 50 196 Z",
    top: 58, face: 108, armY: 140, armL: 50, armR: 150, belly: [100, 162, 32, 26], feet: true,
  },
  jelly: {
    path: "M40 198 Q48 188 50 170 L52 110 C54 76 74 58 100 58 C126 58 146 76 148 110 L150 170 Q152 188 160 198 Q146 202 136 194 Q124 206 112 198 Q100 208 88 198 Q76 206 64 194 Q54 202 40 198 Z",
    top: 60, face: 114, armY: 142, armL: 51, armR: 149, feet: false,
  },
  block: {
    path: "M62 66 H138 Q160 66 160 88 V180 Q160 202 138 202 H62 Q40 202 40 180 V88 Q40 66 62 66 Z",
    top: 68, face: 112, armY: 142, armL: 40, armR: 160, belly: [100, 166, 36, 22], feet: true,
  },
};

const SW = 5.5;

function Eye({ cx, cy, r, iris }: { cx: number; cy: number; r: number; iris?: string }) {
  return (
    <g className="eye">
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth={5} />
      <g className="pupil">
        {iris && <circle cx={cx + r * 0.15} cy={cy + r * 0.1} r={r * 0.62} fill={iris} />}
        <circle cx={cx + r * 0.18} cy={cy + r * 0.12} r={r * 0.44} fill={INK} />
        <circle cx={cx + r * 0.34} cy={cy - r * 0.1} r={r * 0.16} fill="#fff" />
      </g>
    </g>
  );
}

function Eyes({ kind, y, body }: { kind: EyesId; y: number; body: string }) {
  switch (kind) {
    case "one":
      return <Eye cx={100} cy={y} r={25} iris="#1F6F8B" />;
    case "three":
      return (
        <>
          <Eye cx={100} cy={y - 24} r={10} />
          <Eye cx={80} cy={y + 4} r={14} />
          <Eye cx={120} cy={y + 4} r={14} />
        </>
      );
    case "sleepy":
      return (
        <>
          {[80, 120].map((x) => (
            <g key={x}>
              <Eye cx={x} cy={y} r={15} />
              <path d={`M${x - 15} ${y} A15 15 0 0 1 ${x + 15} ${y} Z`} fill={body} stroke={INK} strokeWidth={4} />
            </g>
          ))}
        </>
      );
    case "specs":
      return (
        <>
          <Eye cx={79} cy={y} r={16} />
          <Eye cx={121} cy={y} r={16} />
          <circle cx={79} cy={y} r={20} fill="none" stroke={INK} strokeWidth={4.5} />
          <circle cx={121} cy={y} r={20} fill="none" stroke={INK} strokeWidth={4.5} />
          <path d={`M99 ${y - 2} Q100 ${y - 6} 101 ${y - 2}`} fill="none" stroke={INK} strokeWidth={4.5} />
        </>
      );
    case "two":
    default:
      return (
        <>
          <Eye cx={80} cy={y} r={16} />
          <Eye cx={120} cy={y} r={16} />
        </>
      );
  }
}

function Mouth({ kind, y, talking }: { kind: MouthId; y: number; talking: boolean }) {
  if (talking) return <ellipse cx={100} cy={y + 4} rx={7} ry={8} fill="#4A2545" stroke={INK} strokeWidth={3.5} />;
  switch (kind) {
    case "laugh":
      return (
        <g>
          <path d={`M85 ${y - 2} Q100 ${y} 115 ${y - 2} Q112 ${y + 19} 100 ${y + 19} Q88 ${y + 19} 85 ${y - 2} Z`} fill="#4A2545" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
          <ellipse cx={100} cy={y + 13} rx={8} ry={4.5} fill="#FF8FB1" />
        </g>
      );
    case "fang":
      return (
        <g>
          <path d={`M87 ${y} Q100 ${y + 13} 113 ${y}`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
          <path d={`M96.5 ${y + 5.5} L100 ${y + 12} L103.5 ${y + 5.5}`} fill="#fff" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
        </g>
      );
    case "o":
      return <ellipse cx={100} cy={y + 5} rx={6.5} ry={7.5} fill="#4A2545" stroke={INK} strokeWidth={3.5} />;
    case "tongue":
      return (
        <g>
          <path d={`M106 ${y + 6} Q110 ${y + 20} 102 ${y + 18} Q97 ${y + 16} 99 ${y + 7}`} fill="#FF7FA5" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M86 ${y} Q100 ${y + 12} 114 ${y}`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
        </g>
      );
    case "smile":
    default:
      return <path d={`M87 ${y} Q100 ${y + 13} 113 ${y}`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />;
  }
}

function Arms({ kind, g, color }: { kind: ArmsId; g: Geo; color: string }) {
  const { armY: y, armL: l, armR: r } = g;
  const dark = mix(color, INK, 0.25);
  switch (kind) {
    case "wave":
      return (
        <>
          <path className="arm arm-l" d={`M${l + 6} ${y} Q${l - 10} ${y + 10} ${l - 5} ${y + 27}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
          <g className="arm arm-r">
            <path d={`M${r - 6} ${y - 4} Q${r + 18} ${y - 14} ${r + 20} ${y - 40}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
            <circle cx={r + 21} cy={y - 46} r={7} fill={color} stroke={INK} strokeWidth={4} />
          </g>
        </>
      );
    case "claws":
      return (
        <>
          {[
            { x: l, s: -1, c: "arm-l" },
            { x: r, s: 1, c: "arm-r" },
          ].map(({ x, s, c }) => (
            <g key={c} className={`arm ${c}`}>
              <path d={`M${x - s * 4} ${y - 6} Q${x + s * 20} ${y + 2} ${x + s * 18} ${y + 26} L${x + s * 6} ${y + 24} Q${x + s * 6} ${y + 10} ${x - s * 4} ${y + 8} Z`} fill={color} stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
              {[0, 1, 2].map((k) => (
                <path key={k} d={`M${x + s * (8 + k * 5)} ${y + 25} l${s * 1} 7 l${s * 3} -6`} fill="#fff" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
              ))}
            </g>
          ))}
        </>
      );
    case "wings":
      return (
        <>
          <g className="wing wing-l">
            <path d={`M${l + 10} ${y - 32} C${l - 8} ${y - 44} ${l - 28} ${y - 42} ${l - 34} ${y - 30} C${l - 26} ${y - 27} ${l - 24} ${y - 18} ${l - 27} ${y - 8} C${l - 18} ${y - 15} ${l - 8} ${y - 13} ${l - 2} ${y - 4} C${l} ${y - 13} ${l + 4} ${y - 22} ${l + 12} ${y - 26} Z`} fill={mix(color, "#ffffff", 0.55)} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          </g>
          <g className="wing wing-r">
            <path d={`M${r - 10} ${y - 32} C${r + 8} ${y - 44} ${r + 28} ${y - 42} ${r + 34} ${y - 30} C${r + 26} ${y - 27} ${r + 24} ${y - 18} ${r + 27} ${y - 8} C${r + 18} ${y - 15} ${r + 8} ${y - 13} ${r + 2} ${y - 4} C${r} ${y - 13} ${r - 4} ${y - 22} ${r - 12} ${y - 26} Z`} fill={mix(color, "#ffffff", 0.55)} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          </g>
          <path className="arm arm-l" d={`M${l + 6} ${y} Q${l - 8} ${y + 10} ${l - 3} ${y + 25}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
          <path className="arm arm-r" d={`M${r - 6} ${y} Q${r + 8} ${y + 10} ${r + 3} ${y + 25}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
        </>
      );
    case "noodle":
      return (
        <>
          {[
            { x: l, s: -1, c: "arm-l" },
            { x: r, s: 1, c: "arm-r" },
          ].map(({ x, s, c }) => (
            <g key={c} className={`arm ${c}`}>
              <path d={`M${x} ${y - 4} C${x + s * 22} ${y - 6} ${x + s * 8} ${y + 22} ${x + s * 28} ${y + 30}`} fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
              <path d={`M${x} ${y - 4} C${x + s * 22} ${y - 6} ${x + s * 8} ${y + 22} ${x + s * 28} ${y + 30}`} fill="none" stroke={dark} strokeWidth={5} strokeLinecap="round" />
              <circle cx={x + s * 31} cy={y + 32} r={8} fill={color} stroke={INK} strokeWidth={4} />
            </g>
          ))}
        </>
      );
    case "tiny":
    default:
      return (
        <>
          <path className="arm arm-l" d={`M${l + 6} ${y} Q${l - 10} ${y + 10} ${l - 5} ${y + 27}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
          <path className="arm arm-r" d={`M${r - 6} ${y} Q${r + 10} ${y + 10} ${r + 5} ${y + 27}`} fill="none" stroke={INK} strokeWidth={5.5} strokeLinecap="round" />
        </>
      );
  }
}

function Top({ kind, y, color }: { kind: TopId; y: number; color: string }) {
  switch (kind) {
    case "horns":
      return (
        <g>
          <path d={`M70 ${y + 26} Q60 ${y - 4} 58 ${y - 14} Q72 ${y - 4} 88 ${y + 12} Z`} fill="#FFE6BA" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <path d={`M89 ${y + 8} Q97 ${y - 26} 100 ${y - 36} Q104 ${y - 26} 111 ${y + 8} Z`} fill="#FFE6BA" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <path d={`M130 ${y + 26} Q140 ${y - 4} 142 ${y - 14} Q128 ${y - 4} 112 ${y + 12} Z`} fill="#FFE6BA" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        </g>
      );
    case "ears":
      return (
        <g>
          {[
            [76, -1],
            [124, 1],
          ].map(([x, s]) => (
            <g key={x}>
              <path d={`M${x! - 10} ${y + 16} C${x! - 14 + s! * 4} ${y - 30} ${x! - 2 + s! * 6} ${y - 50} ${x! + s! * 4} ${y - 48} C${x! + 10 + s! * 4} ${y - 46} ${x! + 12} ${y - 20} ${x! + 10} ${y + 14} Z`} fill={color} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
              <path d={`M${x! - 4} ${y + 6} C${x! - 6 + s! * 3} ${y - 22} ${x! + s! * 4} ${y - 38} ${x! + s! * 3} ${y - 38} C${x! + 6 + s! * 3} ${y - 36} ${x! + 5} ${y - 16} ${x! + 4} ${y + 4} Z`} fill="#FFB3D1" />
            </g>
          ))}
        </g>
      );
    case "antenna":
      return (
        <g>
          <path d={`M100 ${y + 6} Q94 ${y - 14} 102 ${y - 28}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <circle className="antenna-ball" cx={103} cy={y - 34} r={9} fill="#FFD43B" stroke={INK} strokeWidth={4.5} />
        </g>
      );
    case "leaves":
      return (
        <g>
          <path d={`M78 ${y + 18} C66 ${y - 6} 68 ${y - 26} 74 ${y - 30} C86 ${y - 20} 96 ${y - 2} 96 ${y + 12} Z`} fill="#3FA552" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <path d={`M122 ${y + 18} C134 ${y - 6} 132 ${y - 26} 126 ${y - 30} C114 ${y - 20} 104 ${y - 2} 104 ${y + 12} Z`} fill="#3FA552" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        </g>
      );
    case "none":
    default:
      return null;
  }
}

interface Props {
  config: MonsterConfig;
  state?: MascotState;
  talking?: boolean;
  size?: number | string;
  className?: string;
  label?: string;
}

export function Monster({ config, state = "idle", talking = false, size = 220, className = "", label }: Props) {
  const g = GEO[config.body];
  const color = COLOR_HEX[config.color];
  const [blink, setBlink] = useState(false);
  const [pop, setPop] = useState(false);
  const first = useRef(true);
  const key = JSON.stringify(config);

  useEffect(() => {
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 2800);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  // squash-pop whenever a part changes (feedback for each builder choice)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPop(true);
    const t = window.setTimeout(() => setPop(false), 420);
    return () => window.clearTimeout(t);
  }, [key]);

  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (!talking) return setMouthOpen(false);
    const id = window.setInterval(() => setMouthOpen((o) => !o), 150);
    return () => window.clearInterval(id);
  }, [talking]);

  const bellyColor = mix(color, "#ffffff", 0.45);
  const footColor = mix(color, INK, 0.18);
  const hl = `M${g.armL + 34} ${g.top + 34} C${g.armL + 40} ${g.top + 20} ${g.armL + 50} ${g.top + 12} ${g.armL + 60} ${g.top + 10}`;

  return (
    <svg
      className={`critter monster state-${state} ${blink ? "is-blinking" : ""} ${pop ? "is-popping" : ""} ${className}`}
      viewBox="-20 -30 240 260"
      width={size}
      height={typeof size === "number" ? size * (260 / 240) : undefined}
      role="img"
      aria-label={label ?? "Your monster"}
      data-testid="monster"
    >
      <ellipse className="critter-shadow" cx="100" cy="214" rx="64" ry="8" fill={INK} opacity="0.12" />
      <g className="critter-body">
        {config.arms === "wings" && <Arms kind="wings" g={g} color={color} />}
        <Top kind={config.top} y={g.top} color={color} />
        {g.feet && (
          <>
            <ellipse cx="76" cy="206" rx="21" ry="10" fill={footColor} stroke={INK} strokeWidth={5} />
            <ellipse cx="124" cy="206" rx="21" ry="10" fill={footColor} stroke={INK} strokeWidth={5} />
          </>
        )}
        {config.arms !== "wings" && <Arms kind={config.arms} g={g} color={color} />}
        <path d={g.path} fill={color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <path d={hl} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth={6} strokeLinecap="round" />
        {g.belly && <ellipse cx={g.belly[0]} cy={g.belly[1]} rx={g.belly[2]} ry={g.belly[3]} fill={bellyColor} />}
        {config.body === "jelly" && (
          <g fill="#fff" opacity="0.35">
            <circle cx="70" cy="166" r="7" /><circle cx="132" cy="172" r="5" /><circle cx="128" cy="96" r="4" />
          </g>
        )}
        <g className="face">
          <Eyes kind={config.eyes} y={g.face} body={color} />
          <ellipse cx="66" cy={g.face + 24} rx="9" ry="5.5" fill="#FF7A6B" opacity="0.6" />
          <ellipse cx="134" cy={g.face + 24} rx="9" ry="5.5" fill="#FF7A6B" opacity="0.6" />
          <Mouth kind={config.mouth} y={g.face + 30} talking={talking && mouthOpen} />
        </g>
      </g>
    </svg>
  );
}
