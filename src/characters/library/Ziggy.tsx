import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Ziggy — Pilot path host (ages 6–14). A chunky cinnamon capybara, and capybaras are famously unflappable,
 * so nothing ruffles him in the cockpit. Modern pilot kit: a sky-blue headset with a boom mic, a tiny striped
 * windsock on a mast on top of the headband (he always knows where the wind is coming from), a checklist
 * kneeboard strapped to his leg and a small gold wings pin. Deliberately no goggles, scarf or leather helmet:
 * that vintage look belongs to Zephy. Character sheet: docs/CHARACTER_SYSTEM.md.
 */
const FUR = "#C7774E";
const FUR_DK = "#9C5634";
const SNOUT = "#F2C9A5";
const CUP = "#4FB3E8";
const BAND = "#4A4F63";
const SOCK = "#FF7A2F";
const GOLD = "#FFD43B";
const mirror = "translate(200 0) scale(-1 1)";

/** One headset ear cup (left side; the right one is mirrored). */
function Cup() {
  return (
    <>
      <rect x="43" y="90" width="10" height="28" rx="5" fill={BAND} stroke={INK} strokeWidth="3.5" />
      <rect x="24" y="86" width="24" height="36" rx="11" fill={CUP} stroke={INK} strokeWidth="5" />
      <path d="M30 96 Q30 91 35 91" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

const sock = "M101 8 L136 13 Q138.5 17 136 21 L101 26 Z";
const band = "M36 92 C33 28 167 28 164 92";

export function Ziggy({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="ziggy" label="Ziggy, a cinnamon capybara pilot with a sky-blue headset and a tiny windsock" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={66}>
      {/* windsock mast + striped sock (behind the headband) */}
      <path d="M100 46 V8" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <g className="ziggy-sock">
        <path d={sock} fill="#fff" />
        <path d="M101 8 L108 9 L108 25 L101 26 Z M115 10 L122 11 L122 23 L115 24 Z M129 12 L136 13 Q138.5 17 136 21 L129 22 Z" fill={SOCK} />
        <path d={sock} fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <circle cx="100" cy="6" r="3.5" fill={GOLD} stroke={INK} strokeWidth="2.5" />
      {/* headband over the top of the head */}
      <path d={band} fill="none" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d={band} fill="none" stroke={BAND} strokeWidth="5" strokeLinecap="round" />
      {/* little round ears, in front of the band */}
      <g className="ear ear-l">
        <circle cx="62" cy="60" r="10" fill={FUR} stroke={INK} strokeWidth="4.5" />
        <circle cx="62" cy="59" r="4.5" fill={FUR_DK} />
      </g>
      <g className="ear ear-r">
        <circle cx="138" cy="60" r="10" fill={FUR} stroke={INK} strokeWidth="4.5" />
        <circle cx="138" cy="59" r="4.5" fill={FUR_DK} />
      </g>
      {/* arms (behind the body, like Fenn) */}
      <path className="arm arm-l" d="M38 150 Q24 162 30 180" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M162 150 Q176 162 170 180" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* feet */}
      <ellipse cx="76" cy="206" rx="20" ry="9" fill={FUR_DK} stroke={INK} strokeWidth="5" />
      <ellipse cx="124" cy="206" rx="20" ry="9" fill={FUR_DK} stroke={INK} strokeWidth="5" />
      {/* body: a boxy-topped barrel */}
      <path d="M62 58 C80 48 120 48 138 58 C158 70 166 100 166 138 C166 184 140 206 100 206 C60 206 34 184 34 138 C34 100 42 70 62 58 Z" fill={FUR} stroke={INK} strokeWidth="5.5" />
      <Shine d="M80 63 C88 59 98 58 108 59" o={0.6} />
      {/* the big blunt capybara snout */}
      <path d="M60 138 C60 122 78 116 100 116 C122 116 140 122 140 138 L140 150 C140 170 122 182 100 182 C78 182 60 170 60 150 Z" fill={SNOUT} />
      {/* checklist kneeboard strapped to his leg */}
      <g className="ziggy-board" transform="rotate(-8 62 186)">
        <rect x="48" y="172" width="28" height="28" rx="5" fill={BAND} stroke={INK} strokeWidth="4" />
        <rect x="52" y="178" width="20" height="18" rx="2.5" fill="#fff" />
        <path d="M54 183 l2.5 2.5 l4.5 -5 M54 191 l2.5 2.5 l4.5 -5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M64 183.5 H70 M64 191.5 H70" stroke={INK} strokeOpacity="0.45" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="56" y="169" width="12" height="6" rx="2" fill={GOLD} stroke={INK} strokeWidth="2.5" />
      </g>
      {/* gold wings pin */}
      <g className="ziggy-pin">
        <path d="M116 190 Q122 183 129 188 Q136 183 142 190 Q136 195 129 193 Q122 195 116 190 Z" fill={GOLD} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="129" cy="190" r="3" fill={CUP} stroke={INK} strokeWidth="2" />
      </g>
      <g className="face">
        <Eye cx={78} cy={96} r={16} asleep={f.asleep} />
        <Eye cx={122} cy={96} r={16} asleep={f.asleep} />
        <Cheeks y={146} l={66} r={134} rx={8} />
        <path d="M80 127 Q100 118 120 127 Q118 138 100 139 Q82 138 80 127 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="90" cy="126" r="2.2" fill="#fff" opacity="0.6" />
        <path d="M100 139 V147" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <MouthShape mouth={f.mouth} cx={100} cy={157} s={0.85} />
      </g>
      {/* headset cups + boom mic (in front of the face edge) */}
      <g className="headset">
        <Cup />
        <g transform={mirror}>
          <Cup />
        </g>
        <path d="M37 121 C39 146 54 160 71 158" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="76" cy="157" r="6" fill={BAND} stroke={INK} strokeWidth="3" />
      </g>
      {f.asleep && <Zz x={150} y={36} />}
    </Frame>
  );
}
