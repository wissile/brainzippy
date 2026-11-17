import type { MascotState } from "../engine/types";
import { CREW, INK } from "./palette";

/** Supporting Critter Crew members (used on menus). Same shape kit: chunky bodies, big eyes, one signature thing. */
interface P {
  size?: number | string;
  className?: string;
  state?: MascotState;
  talking?: boolean;
}

const Eye = ({ cx, cy, r = 14, iris }: { cx: number; cy: number; r?: number; iris?: string }) => (
  <g className="eye">
    <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="5" />
    {iris && <circle cx={cx + 2} cy={cy + 1} r={r * 0.6} fill={iris} />}
    <circle cx={cx + 2} cy={cy + 1} r={r * 0.42} fill={INK} />
    <circle cx={cx + 4} cy={cy - 2} r={r * 0.16} fill="#fff" />
  </g>
);

const wrap = (name: string, label: string, size: number | string, className: string, children: React.ReactNode, state: MascotState = "idle", talking = false) => (
  <svg className={`critter ${name} state-${state} ${talking ? "is-talking" : ""} ${className}`} viewBox="0 0 200 230" width={size} height={typeof size === "number" ? size * 1.15 : undefined} role="img" aria-label={label}>
    <ellipse cx="100" cy="218" rx="58" ry="8" fill={INK} opacity="0.12" />
    <g className="critter-body">{children}</g>
  </svg>
);

export const Zuzu = ({ size = 160, className = "", state = "idle", talking = false }: P) =>
  wrap("zuzu", "Zuzu, a purple three-eyed monster with a pencil", size, className, <>
    <path d="M72 70 C64 34 70 10 82 12 C94 14 96 44 92 70 Z" fill={CREW.zuzu} stroke={INK} strokeWidth="5" />
    <path d="M78 62 C74 38 78 22 83 22 C88 24 88 44 86 62 Z" fill="#FFB3D1" />
    <path d="M128 70 C136 34 130 10 118 12 C106 14 104 44 108 70 Z" fill={CREW.zuzu} stroke={INK} strokeWidth="5" />
    <path d="M122 62 C126 38 122 22 117 22 C112 24 112 44 114 62 Z" fill="#FFB3D1" />
    <ellipse cx="80" cy="206" rx="22" ry="10" fill="#6E4FD8" stroke={INK} strokeWidth="5" />
    <ellipse cx="120" cy="206" rx="22" ry="10" fill="#6E4FD8" stroke={INK} strokeWidth="5" />
    <path d="M48 200 L48 110 C48 76 70 60 100 60 C130 60 152 76 152 110 L152 200 Z" fill={CREW.zuzu} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
    <path d="M152 140 Q170 136 176 112" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <g transform="rotate(24 178 92)"><rect x="172" y="56" width="12" height="44" rx="3" fill={CREW.sparkle} stroke={INK} strokeWidth="4" /><path d="M172 100 L178 112 L184 100 Z" fill="#F6D3A8" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" /></g>
    <circle cx="70" cy="168" r="8" fill="#B8A3FF" /><circle cx="134" cy="178" r="6" fill="#B8A3FF" />
    <Eye cx={100} cy={90} r={10} /><Eye cx={80} cy={116} /><Eye cx={120} cy={116} />
    <path d="M84 138 L116 138 Q110 156 100 156 Q90 156 84 138 Z" fill="#4A2545" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <ellipse cx="100" cy="151" rx="7" ry="4" fill="#FF8FB1" />
  </>, state, talking);

export const Gloop = ({ size = 160, className = "", state = "idle", talking = false }: P) =>
  wrap("gloop", "Gloop, a teal jelly monster with one big eye", size, className, <>
    <path d="M100 58 Q96 40 100 28" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <path d="M100 12 Q110 26 100 32 Q90 26 100 12 Z" fill="#8FF0E5" stroke={INK} strokeWidth="4" />
    <path d="M40 196 Q48 186 50 168 L52 110 C54 76 74 58 100 58 C126 58 146 76 148 110 L150 168 Q152 186 160 196 Q146 200 136 192 Q124 204 112 196 Q100 206 88 196 Q76 204 64 192 Q54 200 40 196 Z" fill={CREW.gloop} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
    <path d="M68 84 C74 74 84 68 94 66" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="6" strokeLinecap="round" />
    <circle cx="70" cy="160" r="8" fill="#7FE3D8" /><circle cx="132" cy="168" r="6" fill="#7FE3D8" /><circle cx="128" cy="92" r="5" fill="#7FE3D8" />
    <Eye cx={100} cy={112} r={24} iris="#1F6F8B" />
    <ellipse cx="100" cy="156" rx="10" ry="7" fill="#155E50" stroke={INK} strokeWidth="4" />
  </>, state, talking);

export const Hoot = ({ size = 160, className = "", state = "idle", talking = false }: P) =>
  wrap("hoot", "Hoot, a green owl with reading glasses", size, className, <>
    <path d="M62 82 C52 54 54 34 60 30 C72 40 84 58 86 74 Z" fill="#3FA552" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <path d="M138 82 C148 54 146 34 140 30 C128 40 116 58 114 74 Z" fill="#3FA552" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
    <ellipse cx="82" cy="206" rx="16" ry="8" fill="#FFB52E" stroke={INK} strokeWidth="4.5" />
    <ellipse cx="118" cy="206" rx="16" ry="8" fill="#FFB52E" stroke={INK} strokeWidth="4.5" />
    <ellipse cx="100" cy="140" rx="62" ry="66" fill={CREW.hoot} stroke={INK} strokeWidth="5.5" />
    <ellipse cx="100" cy="158" rx="40" ry="42" fill="#DDF6C8" />
    <path d="M38 130 C30 150 34 172 46 182 L54 132 Z" fill="#4DB05E" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
    <path d="M162 130 C170 150 166 172 154 182 L146 132 Z" fill="#4DB05E" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
    <Eye cx={80} cy={116} r={20} /><Eye cx={120} cy={116} r={20} />
    <path d="M100 112 L100 108" stroke={INK} strokeWidth="5" />
    <path d="M92 134 L108 134 L100 148 Z" fill="#FFB52E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
  </>, state, talking);

export const Rumble = ({ size = 160, className = "", state = "idle", talking = false }: P) =>
  wrap("rumble", "Rumble, a sleepy blue hippo-rhino with a star horn", size, className, <>
    <circle cx="58" cy="78" r="14" fill={CREW.rumble} stroke={INK} strokeWidth="5" /><circle cx="58" cy="78" r="6" fill="#FFB3C7" />
    <circle cx="142" cy="78" r="14" fill={CREW.rumble} stroke={INK} strokeWidth="5" /><circle cx="142" cy="78" r="6" fill="#FFB3C7" />
    <rect x="62" y="180" width="26" height="28" rx="8" fill="#3D7FE0" stroke={INK} strokeWidth="5" />
    <rect x="112" y="180" width="26" height="28" rx="8" fill="#3D7FE0" stroke={INK} strokeWidth="5" />
    <circle cx="100" cy="132" r="70" fill={CREW.rumble} stroke={INK} strokeWidth="5.5" />
    <path d="M100 42 L108 58 L126 60 L112 72 L116 90 L100 81 L84 90 L88 72 L74 60 L92 58 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
    <g><circle cx="80" cy="114" r="12" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M68 114 A12 12 0 0 1 92 114 Z" fill={CREW.rumble} stroke={INK} strokeWidth="4" /><circle cx="82" cy="118" r="5" fill={INK} /></g>
    <g><circle cx="120" cy="114" r="12" fill="#fff" stroke={INK} strokeWidth="5" /><path d="M108 114 A12 12 0 0 1 132 114 Z" fill={CREW.rumble} stroke={INK} strokeWidth="4" /><circle cx="122" cy="118" r="5" fill={INK} /></g>
    <ellipse cx="100" cy="158" rx="44" ry="30" fill="#A9CBFF" stroke={INK} strokeWidth="5" />
    <ellipse cx="88" cy="152" rx="4" ry="6" fill={INK} /><ellipse cx="112" cy="152" rx="4" ry="6" fill={INK} />
    <path d="M88 170 Q100 178 112 170" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
  </>, state, talking);

export const Puff = ({ size = 160, className = "", state = "idle", talking = false }: P) =>
  wrap("puff", "Puff, a pink cloud monster with wiggly arms", size, className, <>
    {[62, 82, 100, 118, 138].map((x, i) => (
      <path key={x} className="puff-arm" style={{ animationDelay: `${i * 0.15}s` }} d={`M${x} 140 Q${x + (i % 2 ? 6 : -6)} 172 ${x} 196`} fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
    ))}
    {[62, 82, 100, 118, 138].map((x, i) => (
      <path key={`f${x}`} className="puff-arm" style={{ animationDelay: `${i * 0.15}s` }} d={`M${x} 140 Q${x + (i % 2 ? 6 : -6)} 172 ${x} 196`} fill="none" stroke={CREW.puff} strokeWidth="9" strokeLinecap="round" />
    ))}
    <path d="M52 146 C30 146 30 112 52 110 C48 84 76 72 90 86 C96 64 130 66 132 88 C150 78 172 96 160 114 C178 120 172 148 150 148 Z" fill={CREW.puff} stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
    <path d="M76 98 C80 92 86 88 92 88" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />
    <Eye cx={84} cy={118} r={12} /><Eye cx={118} cy={118} r={12} />
    <ellipse cx="70" cy="132" rx="7" ry="4" fill="#FF5E8E" opacity="0.6" /><ellipse cx="132" cy="132" rx="7" ry="4" fill="#FF5E8E" opacity="0.6" />
    <path d="M94 134 Q97 138 100 134 Q103 138 106 134" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
  </>, state, talking);
