import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Sarah — English path host (ages 3–14). A round berry porcupine whose soft, round-tipped quills fan out
 * behind her head like a storyteller's crown. One long cream quill is tucked behind her ear as a pen (her
 * favourite pun: a porcupine who writes with a quill), and she holds an open picture book towards the child,
 * as if at story time. No glasses (Hoot's signature) and no bow. Character sheet: docs/CHARACTER_SYSTEM.md.
 */
const BERRY = "#D2558A";
const QUILL = "#9C3168";
const TIP = "#FFD9E6";
const FACE = "#FFEBDD";
const PEN = "#FFF6DA";
const COVER = "#33A99E";
const SUN = "#FFD43B";

/** Seven quills radiating from behind the head; tips are rounded with a small curve. */
const crown =
  "M45 126 L27.1 110 Q24.7 107.8 27.8 107.1 L50.3 102.1 L34.7 75.1 Q32.6 71.4 36.6 72.9 L65.9 83.6 L61 47.7 Q60.3 42.8 63.6 46.5 L87.9 73.3 L98.5 37 Q100 32 101.5 37 L112.1 73.3 L136.4 46.5 Q139.7 42.8 139 47.7 L134.1 83.6 L163.4 72.9 Q167.4 71.4 165.3 75.1 L149.7 102.1 L172.2 107.1 Q175.3 107.8 172.9 110 L155 126 Z";
/** The same quills, shorter: drawn in the deep berry so the pale tips show beyond them. */
const crownInner =
  "M45 126 L38.2 111.4 L50.3 102.1 L43.3 80.4 L65.9 83.6 L66.2 55.5 L87.9 73.3 L100 46 L112.1 73.3 L133.8 55.5 L134.1 83.6 L156.7 80.4 L149.7 102.1 L161.8 111.4 L155 126 Z";
const rightPage = "M100 176 Q120 168 140 174 L141 202 Q120 197 100 204 Z";

export function Sarah({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="sarah" label="Sarah, a berry porcupine with a quill pen behind her ear and an open storybook" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={62}>
      {/* quill crown (behind the body) */}
      <g className="sarah-quills">
        <path d={crown} fill={TIP} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d={crownInner} fill={QUILL} />
        <path d={crown} fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      </g>
      {/* feet (mostly behind the book) */}
      <ellipse cx="78" cy="206" rx="18" ry="9" fill={QUILL} stroke={INK} strokeWidth="5" />
      <ellipse cx="122" cy="206" rx="18" ry="9" fill={QUILL} stroke={INK} strokeWidth="5" />
      {/* body */}
      <path d="M100 64 C140 64 160 100 160 140 C160 182 136 206 100 206 C64 206 40 182 40 140 C40 100 60 64 100 64 Z" fill={BERRY} stroke={INK} strokeWidth="5.5" />
      <Shine d="M48 142 C48 130 51 121 56 114" o={0.5} />
      {/* soft face mask */}
      <path d="M58 130 C58 102 78 92 100 102 C122 92 142 102 142 130 C142 160 124 180 100 180 C76 180 58 160 58 130 Z" fill={FACE} />
      {/* quill pen tucked behind her right ear */}
      <g className="sarah-pen">
        <path d="M176 62 L141 97" stroke={INK} strokeWidth="10" strokeLinecap="round" />
        <path d="M176 62 L141 97" stroke={PEN} strokeWidth="5" strokeLinecap="round" />
        <path d="M168.5 69.5 L165.5 72.5 M161 77 L158 80" stroke={QUILL} strokeWidth="5" />
        <path d="M145 97 L134 104.5 L141 93 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* little round ears */}
      <g className="ear ear-l">
        <circle cx="48" cy="94" r="11" fill={BERRY} stroke={INK} strokeWidth="4.5" />
        <circle cx="48" cy="94" r="5" fill={QUILL} />
      </g>
      <g className="ear ear-r">
        <circle cx="152" cy="94" r="11" fill={BERRY} stroke={INK} strokeWidth="4.5" />
        <circle cx="152" cy="94" r="5" fill={QUILL} />
      </g>
      <g className="face">
        <Eye cx={80} cy={122} r={16} asleep={f.asleep} />
        <Eye cx={120} cy={122} r={16} asleep={f.asleep} />
        <Cheeks y={150} l={68} r={132} rx={8} />
        <ellipse cx="100" cy="144" rx="8.5" ry="6.5" fill={INK} />
        <circle cx="97" cy="142" r="2" fill="#fff" opacity="0.7" />
        <MouthShape mouth={f.mouth} cx={100} cy={160} s={0.8} />
      </g>
      {/* arms reach round to hold the book */}
      <path className="arm arm-l" d="M44 154 Q30 170 58 186" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M156 154 Q170 170 142 186" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* open picture book, held up towards the child (pictures and squiggles, never words) */}
      <g className="sarah-book">
        <path d="M56 176 Q78 170 100 178 Q122 170 144 176 L146 206 Q122 200 100 208 Q78 200 54 206 Z" fill={COVER} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M60 174 Q80 168 100 176 L100 204 Q80 197 59 202 Z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="72" cy="182" r="3.5" fill={SUN} stroke={INK} strokeWidth="2" />
        <path d="M64 197 Q76 187 92 195" fill="none" stroke={COVER} strokeWidth="3" strokeLinecap="round" />
        <path d={rightPage} fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path className="sarah-page" d={rightPage} fill="#FFFDF6" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M108 183 Q119 179 133 180 M108 190 Q119 186 133 187 M108 197 Q116 193 126 194" fill="none" stroke={INK} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {f.asleep && <Zz x={168} y={40} />}
    </Frame>
  );
}
