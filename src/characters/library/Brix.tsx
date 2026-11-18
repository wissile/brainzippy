import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Brix — Engineering and inventions host. A round steel-navy beaver-monster in a sunny hard hat, with a
 * big flat tail marked like a ruler and two proud front teeth. Yellow + navy (never yellow + black).
 */
const NAVY = "#34557A";
const NAVY_LT = "#7896BA";
const MUZZLE = "#F3DEC0";
const HAT = "#FFD43B";
const HAT_DK = "#F0B91C";
const TAIL = "#D9A86C";

export function Brix({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="brix" label="Brix, a navy beaver in a yellow hard hat with a ruler tail" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={70}>
      {/* ruler tail (behind) */}
      <g className="tail">
        <g transform="rotate(-24 150 182)">
          <rect x="136" y="166" width="62" height="32" rx="15" fill={TAIL} stroke={INK} strokeWidth="5" />
          <path d="M152 166 V178 M162 166 V174 M172 166 V178 M182 166 V174" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      {/* feet */}
      <ellipse cx="76" cy="205" rx="20" ry="9.5" fill="#26425F" stroke={INK} strokeWidth="5" />
      <ellipse cx="124" cy="205" rx="20" ry="9.5" fill="#26425F" stroke={INK} strokeWidth="5" />
      {/* arms */}
      <path className="arm arm-l" d="M44 142 Q30 152 34 170" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M156 142 Q170 152 166 170" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* ears (peek under the brim) */}
      <circle cx="58" cy="100" r="11" fill={NAVY} stroke={INK} strokeWidth="5" />
      <circle cx="142" cy="100" r="11" fill={NAVY} stroke={INK} strokeWidth="5" />
      {/* body */}
      <path d="M100 74 C144 74 162 112 162 150 C162 186 138 204 100 204 C62 204 38 186 38 150 C38 112 56 74 100 74 Z" fill={NAVY} stroke={INK} strokeWidth="5.5" />
      <Shine d="M56 130 C56 116 62 104 72 96" o={0.4} />
      <ellipse cx="100" cy="186" rx="32" ry="15" fill={NAVY_LT} />
      {/* hard hat */}
      <g className="hat">
        <path d="M56 88 C56 54 76 38 100 38 C124 38 144 54 144 88 Z" fill={HAT} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <rect x="91" y="40" width="18" height="46" rx="7" fill={HAT_DK} stroke={INK} strokeWidth="3.5" />
        <path d="M66 70 C68 60 74 52 82 48" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" />
        <path d="M40 90 Q100 76 160 90 Q164 99 154 101 Q100 91 46 101 Q36 99 40 90 Z" fill={HAT} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      <g className="face">
        <Eye cx={79} cy={122} r={16} asleep={f.asleep} />
        <Eye cx={121} cy={122} r={16} asleep={f.asleep} />
        <ellipse cx="100" cy="158" rx="27" ry="18" fill={MUZZLE} />
        <Cheeks y={150} l={60} r={140} color="#FF8F80" rx={8} />
        <ellipse cx="100" cy="146" rx="9.5" ry="6.5" fill={INK} />
        <ellipse cx="97" cy="144" rx="3" ry="1.8" fill="#fff" opacity="0.8" />
        <g fill={INK}><circle cx="84" cy="158" r="1.8" /><circle cx="80" cy="164" r="1.8" /><circle cx="116" cy="158" r="1.8" /><circle cx="120" cy="164" r="1.8" /></g>
        <MouthShape mouth={f.mouth} cx={100} cy={160} s={0.8} teeth="buck" />
      </g>
      {f.asleep && <Zz x={158} y={60} />}
    </Frame>
  );
}
