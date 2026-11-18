import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Dabble — Science host. A short coral newt-monster: one scalloped frill crest on top of her head,
 * a curly spiral tail, three-dot newt fingertips and an oversized one-piece safety visor worn over her eyes.
 * (No feathery side gills and no pink palette, so she does not read as an axolotl.)
 */
const CORAL = "#FF6B6B";
const CORAL_DK = "#E04F55";
const CREST = "#FFB09E";
const BELLY = "#FFD9C7";

function Hand({ x, y }: { x: number; y: number }) {
  return (
    <g fill={CORAL} stroke={INK} strokeWidth="2.6">
      <circle cx={x - 6} cy={y} r="4" /><circle cx={x} cy={y + 4} r="4" /><circle cx={x + 6} cy={y} r="4" />
    </g>
  );
}

export function Dabble({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="dabble" label="Dabble, a coral newt with a frilly crest and safety goggles" state={state} size={size} className={className} blink={f.blink} talking={f.talking}>
      {/* curly tail (behind) */}
      <g className="tail">
        <path d="M140 190 C172 198 194 180 188 158 C184 143 165 144 166 158 C166 166 175 168 178 161" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round" />
        <path d="M140 190 C172 198 194 180 188 158 C184 143 165 144 166 158 C166 166 175 168 178 161" fill="none" stroke={CORAL} strokeWidth="8.5" strokeLinecap="round" />
      </g>
      {/* frill crest */}
      <g className="crest">
        <path d="M62 100 C50 82 60 66 74 74 C72 54 92 48 99 62 C106 48 126 54 126 74 C140 66 150 82 138 100 Z" fill={CREST} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M76 86 L72 76 M99 84 V66 M122 86 L126 76" stroke={CORAL_DK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
      {/* feet */}
      <ellipse cx="76" cy="205" rx="20" ry="9.5" fill={CORAL_DK} stroke={INK} strokeWidth="5" />
      <ellipse cx="124" cy="205" rx="20" ry="9.5" fill={CORAL_DK} stroke={INK} strokeWidth="5" />
      {/* arms with newt fingertips */}
      <g className="arm arm-l">
        <path d="M48 148 Q32 156 33 172" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        <Hand x={33} y={176} />
      </g>
      <g className="arm arm-r">
        <path d="M152 148 Q168 156 167 172" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        <Hand x={167} y={176} />
      </g>
      {/* body */}
      <path d="M100 72 C140 72 158 110 158 148 C158 184 134 204 100 204 C66 204 42 184 42 148 C42 110 60 72 100 72 Z" fill={CORAL} stroke={INK} strokeWidth="5.5" />
      <Shine d="M58 128 C58 112 64 98 74 90" o={0.5} />
      <ellipse cx="100" cy="176" rx="34" ry="22" fill={BELLY} />
      <g fill={CORAL_DK}>
        <circle cx="56" cy="160" r="4" /><circle cx="62" cy="172" r="2.8" /><circle cx="146" cy="160" r="3.4" /><circle cx="138" cy="186" r="2.6" />
      </g>
      {/* safety visor: strap, eyes, glass */}
      <path d="M43 114 H157" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M43 114 H157" stroke="#7B8BA8" strokeWidth="6" strokeLinecap="round" />
      <g className="face">
        <rect x="54" y="90" width="92" height="46" rx="23" fill="#fff" stroke={INK} strokeWidth="5" />
        <Eye cx={79} cy={113} r={15} asleep={f.asleep} />
        <Eye cx={121} cy={113} r={15} asleep={f.asleep} />
        <rect x="54" y="90" width="92" height="46" rx="23" fill="#CDEFFF" fillOpacity="0.16" stroke={INK} strokeWidth="5" />
        <path d="M66 100 Q72 95 80 95" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        {state === "retry" && (
          <g className="fog" fill="#fff" opacity="0.75">
            <ellipse cx="64" cy="124" rx="9" ry="6" /><ellipse cx="138" cy="102" rx="8" ry="6" /><ellipse cx="134" cy="126" rx="6" ry="4.5" />
          </g>
        )}
        <Cheeks y={146} l={64} r={136} color="#FFB3A1" />
        <MouthShape mouth={f.mouth} cx={100} cy={152} s={0.85} />
      </g>
      {state === "celebrating" && (
        <g className="sparkles" fill="#FFD43B" stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path className="spark spark-1" d="M40 66 L44 76 L54 80 L44 84 L40 94 L36 84 L26 80 L36 76 Z" />
          <path className="spark spark-2" d="M162 58 L165 66 L173 69 L165 72 L162 80 L159 72 L151 69 L159 66 Z" />
        </g>
      )}
      {f.asleep && <Zz x={150} y={74} />}
    </Frame>
  );
}
