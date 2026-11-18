import { Cheeks, Eye, Frame, INK, Shine, Zz, useFace, type HostProps, type Mouth } from "./kit";

/**
 * Zephy — Pilot ground school host. A round, fluffy albatross chick with big stubby wings held out like a
 * little plane, twin brass goggles pushed up on her forehead and a red scarf that streams out to the side.
 */
const CREAM = "#FFF1D0";
const BELLY = "#FFFBF0";
const TIP = "#9AA3B5";
const SCARF = "#E5484D";
const SCARF_DK = "#B8323A";
const BEAK = "#FFC46B";
const FOOT = "#FFB37A";

/** The beak is Zephy's mouth: closed for smile/wobble/sleep, open for laugh/o. */
function Beak({ mouth }: { mouth: Mouth }) {
  const open = mouth === "laugh" ? 8 : mouth === "o" ? 5 : 0;
  if (open > 0) {
    const y = 140 + open;
    return (
      <g className="mouth">
        <path d={`M89 138 Q100 136 111 138 Q109 ${y + 6} 100 ${y + 8} Q91 ${y + 6} 89 138 Z`} fill="#4A2545" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        {mouth === "laugh" && <ellipse cx="100" cy={y + 3} rx="5.5" ry="2.8" fill="#FF8FB1" />}
        <path d={`M92 ${y + 5} Q100 ${y + 3} 108 ${y + 5} Q105 ${y + 12} 100 ${y + 13} Q95 ${y + 12} 92 ${y + 5} Z`} fill={BEAK} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M86 133 Q100 127 114 133 Q109 141 100 142 Q91 141 86 133 Z" fill={BEAK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="95" cy="134" r="1.6" fill={INK} /><circle cx="105" cy="134" r="1.6" fill={INK} />
      </g>
    );
  }
  return (
    <g className="mouth">
      <path d="M86 134 Q100 128 114 134 Q110 146 100 148 Q90 146 86 134 Z" fill={BEAK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="95" cy="136" r="1.6" fill={INK} /><circle cx="105" cy="136" r="1.6" fill={INK} />
      {mouth === "wobble" ? (
        <path d="M92 155 Q96 151 100 154 Q104 157 108 153" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M92 152 Q100 157 108 152" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}
    </g>
  );
}

const wingL = "M58 124 C42 104 22 92 8 96 C1 104 5 117 16 121 C8 130 13 142 27 142 C23 153 38 160 56 150 Z";
const tipL = "M8 96 C1 104 5 117 16 121 C21 111 17 100 8 96 Z";
const mirror = "translate(200 0) scale(-1 1)";

export function Zephy({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="zephy" label="Zephy, a cream albatross chick with pilot goggles and a red scarf" state={state} size={size} className={className} blink={f.blink} talking={f.talking}>
      {/* scarf tail streaming out to the right (behind body) */}
      <g className="scarf-tail">
        <path d="M140 168 C156 160 166 174 182 166 C190 162 195 156 198 150 C199 162 196 172 190 178 C182 186 170 188 160 186 C154 185 148 182 142 180 Z" fill={SCARF} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M150 182 C160 192 172 196 184 194" fill="none" stroke={SCARF_DK} strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* wings */}
      <g className="wing wing-l">
        <path d={wingL} fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d={tipL} fill={TIP} />
        <path d={wingL} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      <g className="wing wing-r">
        <g transform={mirror}>
          <path d={wingL} fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d={tipL} fill={TIP} />
          <path d={wingL} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </g>
      </g>
      {/* feet */}
      <path d="M68 200 Q80 194 94 200 Q92 210 81 210 Q70 210 68 200 Z" fill={FOOT} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M106 200 Q120 194 132 200 Q130 210 119 210 Q108 210 106 200 Z" fill={FOOT} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {/* head tuft */}
      <path className="tuft" d="M94 60 C84 40 98 26 110 34 C102 36 98 44 106 58 Z" fill={CREAM} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      {/* body */}
      <path d="M100 54 C142 54 158 102 158 144 C158 184 134 204 100 204 C66 204 42 184 42 144 C42 102 58 54 100 54 Z" fill={CREAM} stroke={INK} strokeWidth="5.5" />
      <Shine d="M64 92 C68 78 78 68 90 64" o={0.8} />
      <ellipse cx="100" cy="182" rx="32" ry="17" fill={BELLY} />
      {/* scarf wrap + knot */}
      <path d="M52 160 Q100 180 148 160 L150 172 Q100 194 50 172 Z" fill={SCARF} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M128 172 C138 172 144 178 142 188 C134 190 126 184 128 172 Z" fill={SCARF_DK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      {/* goggles pushed up */}
      <g className="goggles">
        <path d="M54 94 Q100 74 146 94" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
        <path d="M54 94 Q100 74 146 94" fill="none" stroke="#8A5A3B" strokeWidth="6" strokeLinecap="round" />
        <circle cx="81" cy="82" r="13" fill="#E0B25A" stroke={INK} strokeWidth="4.5" />
        <circle cx="119" cy="82" r="13" fill="#E0B25A" stroke={INK} strokeWidth="4.5" />
        <circle cx="81" cy="82" r="7.5" fill="#9FE3F0" stroke={INK} strokeWidth="2.5" />
        <circle cx="119" cy="82" r="7.5" fill="#9FE3F0" stroke={INK} strokeWidth="2.5" />
        <circle cx="78.5" cy="79.5" r="2.4" fill="#fff" /><circle cx="116.5" cy="79.5" r="2.4" fill="#fff" />
      </g>
      <g className="face">
        <Eye cx={79} cy={114} r={16} asleep={f.asleep} />
        <Eye cx={121} cy={114} r={16} asleep={f.asleep} />
        <Cheeks y={136} l={64} r={136} />
        <Beak mouth={f.mouth} />
      </g>
      {f.asleep && <Zz x={150} y={56} />}
    </Frame>
  );
}
