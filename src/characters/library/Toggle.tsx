import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Toggle — Computer science host (proposed as "Loopi"; renamed, see docs/CHARACTER_SYSTEM.md).
 * A caterpillar built from soft command blocks: a big squircle head and three body blocks that step down
 * like a staircase, each marked with a tiny command arrow. Antenna bulb lights up when an idea arrives.
 */
const LIME = "#A8D83F";
const LIME_DK = "#7DAF22";
const PALE = "#DDF2A6";
const BULB = "#FFD43B";

export function Toggle({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="toggle" label="Toggle, a lime caterpillar made of command blocks" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={84}>
      {/* feet nubs (behind blocks) */}
      <g fill={LIME_DK} stroke={INK} strokeWidth="4.5">
        <ellipse cx="22" cy="203" rx="9" ry="6" /><ellipse cx="42" cy="203" rx="9" ry="6" />
        <ellipse cx="56" cy="204" rx="10" ry="6.5" /><ellipse cx="80" cy="204" rx="10" ry="6.5" />
        <ellipse cx="104" cy="205" rx="12" ry="7" /><ellipse cx="146" cy="205" rx="12" ry="7" />
      </g>
      {/* tail block: loop arrow */}
      <g className="seg seg-3">
        <rect x="8" y="162" width="46" height="40" rx="15" fill={LIME} stroke={INK} strokeWidth="5" />
        <path d="M24 186 A8 8 0 1 0 25 174" fill="none" stroke={LIME_DK} strokeWidth="4" strokeLinecap="round" />
        <path d="M22 170 L26 174 L21 178" fill="none" stroke={LIME_DK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* middle block: step arrow */}
      <g className="seg seg-2">
        <rect x="38" y="144" width="56" height="58" rx="19" fill={LIME} stroke={INK} strokeWidth="5" />
        <path d="M54 173 H76 M68 165 L77 173 L68 181" fill="none" stroke={LIME_DK} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <Shine d="M48 158 C50 153 54 150 60 150" w={5} o={0.5} />
      </g>
      {/* front block (body under the head) */}
      <g className="seg seg-1">
        <rect x="84" y="128" width="84" height="74" rx="26" fill={LIME} stroke={INK} strokeWidth="5.5" />
        <ellipse cx="126" cy="178" rx="27" ry="15" fill={PALE} />
      </g>
      {/* arms */}
      <path className="arm arm-l" d="M90 160 Q74 166 74 182" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M164 158 Q180 164 180 180" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* antenna with idea bulb */}
      <g className="antenna">
        <path d="M134 54 Q128 36 142 24" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        {!f.asleep && <circle className="bulb-glow" cx="144" cy="18" r="17" fill="#FFE98A" opacity="0.55" />}
        <circle className="bulb" cx="144" cy="18" r="10" fill={f.asleep ? "#E9E3BF" : BULB} stroke={INK} strokeWidth="4.5" />
        {!f.asleep && <circle cx="140.5" cy="14.5" r="2.8" fill="#fff" />}
      </g>
      {/* head block */}
      <g className="head">
        <rect x="76" y="50" width="110" height="100" rx="42" fill={LIME} stroke={INK} strokeWidth="5.5" />
        <Shine d="M90 86 C92 72 100 64 112 61" />
        <g className="face">
          <Eye cx={112} cy={96} r={17} asleep={f.asleep} />
          <Eye cx={150} cy={96} r={17} asleep={f.asleep} />
          <Cheeks y={122} l={96} r={166} />
          <MouthShape mouth={f.mouth} cx={131} cy={126} />
        </g>
      </g>
      {f.asleep && <Zz x={168} y={44} />}
    </Frame>
  );
}
