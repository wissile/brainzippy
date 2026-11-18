import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Snug — Social and emotional skills host. A low, wide, wombat-like critter with big soft leaf-shaped ears,
 * a wide plum nose and a front pouch of smooth "calm stones". Her colour NEVER changes with emotion
 * (no colour-coded feelings); feelings show through face and posture only.
 */
const PEACH = "#FFBE98";
const PEACH_DK = "#E99A72";
const PLUM = "#7A3E6B";
const BELLY = "#FFE2CC";
const POUCH = "#F7AE86";

const earL = "M44 128 C20 114 16 80 36 70 C58 60 80 86 82 110 Z";
const innerL = "M50 114 C35 104 31 84 41 78 C54 72 67 90 70 106 Z";
const mirror = "translate(200 0) scale(-1 1)";

export function Snug({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="snug" label="Snug, a soft peach wombat with a pouch of calm stones" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={78}>
      {/* ears */}
      <g className="ear ear-l">
        <path d={earL} fill={PEACH} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d={innerL} fill={PLUM} />
      </g>
      <g className="ear ear-r">
        <g transform={mirror}>
          <path d={earL} fill={PEACH} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d={innerL} fill={PLUM} />
        </g>
      </g>
      {/* stubby legs */}
      <g fill={PEACH_DK} stroke={INK} strokeWidth="5">
        <ellipse cx="44" cy="203" rx="17" ry="9" /><ellipse cx="78" cy="206" rx="17" ry="9" />
        <ellipse cx="122" cy="206" rx="17" ry="9" /><ellipse cx="156" cy="203" rx="17" ry="9" />
      </g>
      {/* arms */}
      <path className="arm arm-l" d="M28 152 Q12 160 16 176" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <g className="arm arm-r">
        <path d="M172 152 Q188 160 184 176" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        {state === "encouraging" && <ellipse className="stone-offer" cx="184" cy="182" rx="10" ry="7.5" fill="#A8E6CF" stroke={INK} strokeWidth="3.5" />}
      </g>
      {/* body: low and wide loaf */}
      <path d="M100 90 C154 90 182 122 182 160 C182 192 158 204 100 204 C42 204 18 192 18 160 C18 122 46 90 100 90 Z" fill={PEACH} stroke={INK} strokeWidth="5.5" />
      <Shine d="M38 132 C42 118 52 106 66 100" o={0.55} />
      <ellipse cx="100" cy="186" rx="54" ry="16" fill={BELLY} />
      {/* calm stones + pouch */}
      <g className="stones" stroke={INK} strokeWidth="3.5">
        <ellipse cx="84" cy="185" rx="9" ry="7" fill="#C9B8F0" />
        <ellipse cx="100" cy="181" rx="9" ry="7.5" fill="#A8E6CF" />
        <ellipse cx="116" cy="185" rx="9" ry="7" fill="#A9D2FF" />
      </g>
      <path d="M68 185 Q100 197 132 185 Q130 203 100 204 Q70 203 68 185 Z" fill={POUCH} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <g className="face">
        <Eye cx={74} cy={120} r={16} asleep={f.asleep} />
        <Eye cx={126} cy={120} r={16} asleep={f.asleep} />
        <Cheeks y={143} l={52} r={148} color="#FF8A7A" />
        <ellipse cx="100" cy="140" rx="15" ry="9.5" fill={PLUM} stroke={INK} strokeWidth="3.5" />
        <ellipse cx="95" cy="137" rx="4" ry="2.2" fill="#fff" opacity="0.6" />
        <MouthShape mouth={f.mouth} cx={100} cy={154} s={0.8} />
      </g>
      {f.asleep && <Zz x={160} y={84} />}
    </Frame>
  );
}
