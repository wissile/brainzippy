import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Fenn — Digital safety host. A round indigo fennec-fox monster whose enormous ears are taller than her
 * body; a gold magnifier monocle over one eye and a fluffy tail. Calm and kind, never spooky.
 * Deliberately no trench coat or deerstalker.
 */
const INDIGO = "#4F5BD5";
const LAV = "#C7C2FF";
const MUZZLE = "#E8E6FF";
const GOLD = "#FFD43B";

const earL = "M54 124 C32 102 10 68 8 40 C8 30 17 26 26 30 C54 44 82 68 96 94 Z";
const innerL = "M58 110 C40 92 25 68 22 45 C44 58 66 76 80 96 Z";
const mirror = "translate(200 0) scale(-1 1)";

export function Fenn({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="fenn" label="Fenn, an indigo fennec fox with huge ears and a magnifier monocle" state={state} size={size} className={className} blink={f.blink} talking={f.talking}>
      {/* tail (behind) */}
      <g className="tail">
        <path d="M58 188 C22 194 2 162 12 128 C16 118 28 118 31 128 C33 150 44 166 62 172 Z" fill={INDIGO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M12 128 C16 118 28 118 31 128 C31 137 24 143 14 143 C11 138 11 133 12 128 Z" fill={LAV} />
        <path d="M58 188 C22 194 2 162 12 128 C16 118 28 118 31 128 C33 150 44 166 62 172" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      {/* ears */}
      <g className="ear ear-l">
        <path d={earL} fill={INDIGO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d={innerL} fill={LAV} />
      </g>
      <g className="ear ear-r">
        <g transform={mirror}>
          <path d={earL} fill={INDIGO} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d={innerL} fill={LAV} />
        </g>
      </g>
      {/* feet */}
      <ellipse cx="78" cy="205" rx="19" ry="9.5" fill="#3D47B0" stroke={INK} strokeWidth="5" />
      <ellipse cx="122" cy="205" rx="19" ry="9.5" fill="#3D47B0" stroke={INK} strokeWidth="5" />
      {/* arms */}
      <path className="arm arm-l" d="M46 150 Q32 160 36 176" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M154 150 Q168 160 164 176" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* body */}
      <circle cx="100" cy="146" r="60" fill={INDIGO} stroke={INK} strokeWidth="5.5" />
      <Shine d="M54 124 C56 110 64 100 74 94" o={0.4} />
      {/* muzzle mask */}
      <path d="M56 150 C66 134 88 136 100 150 C112 136 134 134 144 150 C142 180 124 196 100 196 C76 196 58 180 56 150 Z" fill={MUZZLE} />
      {/* tiny satchel strap across + bag */}
      <g className="satchel">
        <path d="M146 116 Q160 150 150 180" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <rect x="138" y="170" width="26" height="22" rx="7" fill="#8A6BD8" stroke={INK} strokeWidth="4.5" />
        <path d="M138 179 H164" stroke={INK} strokeWidth="3" />
      </g>
      <g className="face">
        <Eye cx={78} cy={128} r={16} asleep={f.asleep} />
        <Eye cx={122} cy={128} r={16} asleep={f.asleep} />
        {/* magnifier monocle over the right eye */}
        <g className="monocle">
          <path d="M135 146 Q146 162 140 176" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 5" />
          <circle cx="122" cy="128" r="23" fill="#CFEFFF" fillOpacity="0.28" stroke={INK} strokeWidth="8" />
          <circle cx="122" cy="128" r="23" fill="none" stroke={GOLD} strokeWidth="3.5" />
          <path className="glint" d="M108 118 Q112 110 120 108" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
        </g>
        <Cheeks y={156} l={66} r={134} rx={8} />
        <path d="M93 152 Q100 148 107 152 Q104 159 100 160 Q96 159 93 152 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <MouthShape mouth={f.mouth} cx={100} cy={168} s={0.8} />
      </g>
      {f.asleep && <Zz x={156} y={88} />}
    </Frame>
  );
}
