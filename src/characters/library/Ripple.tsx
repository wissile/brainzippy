import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Ripple — Nature, oceans and environment host. A seafoam sea-otter-monster leaning back in the water,
 * wearing a kelp-leaf hat and hugging her favourite shell; her feet poke up out of the waves. The water
 * stays still while she bobs.
 */
const FOAM = "#8EE3C8";
const FOAM_DK = "#58C2A2";
const FACE = "#FFF4DE";
const KELP = "#3E9B5F";
const KELP_LT = "#7CCB8F";
const SHELL = "#FFD6A5";
const WATER = "#7CC8F0";

export function Ripple({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  const water = (
    <g className="water">
      <path d="M8 190 Q22 180 36 190 T64 190 T92 190 T120 190 T148 190 T176 190 Q186 184 192 188 L192 206 Q100 222 8 206 Z" fill={WATER} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M26 200 Q34 196 42 200 M90 204 Q98 200 106 204 M150 200 Q158 196 166 200" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
    </g>
  );
  return (
    <Frame id="ripple" label="Ripple, a seafoam sea otter with a kelp hat, holding a shell" state={state} size={size} className={className} blink={f.blink} talking={f.talking} shadowRx={88} fore={water}>
      {/* feet poking out of the water */}
      <g fill={FOAM_DK} stroke={INK} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M150 190 C148 174 156 164 166 166 C174 168 172 182 164 192 Z" />
        <path d="M170 192 C170 178 178 170 186 174 C192 178 188 188 182 194 Z" />
      </g>
      {/* ears */}
      <circle cx="62" cy="80" r="11" fill={FOAM} stroke={INK} strokeWidth="5" />
      <circle cx="138" cy="80" r="11" fill={FOAM} stroke={INK} strokeWidth="5" />
      {/* body */}
      <path d="M100 58 C140 58 158 98 158 138 C158 178 136 202 100 202 C64 202 42 178 42 138 C42 98 60 58 100 58 Z" fill={FOAM} stroke={INK} strokeWidth="5.5" />
      <Shine d="M58 112 C58 96 64 84 74 76" o={0.55} />
      {/* cream face patch */}
      <path d="M54 122 C54 98 76 88 100 94 C124 88 146 98 146 122 C146 148 124 162 100 162 C76 162 54 148 54 122 Z" fill={FACE} />
      <g className="face">
        <Eye cx={79} cy={118} r={15} asleep={f.asleep} />
        <Eye cx={121} cy={118} r={15} asleep={f.asleep} />
        <Cheeks y={142} l={66} r={134} rx={8} />
        <path d="M92 134 Q100 130 108 134 Q105 141 100 142 Q95 141 92 134 Z" fill={INK} />
        <g fill={INK}><circle cx="84" cy="146" r="1.7" /><circle cx="80" cy="140" r="1.7" /><circle cx="116" cy="146" r="1.7" /><circle cx="120" cy="140" r="1.7" /></g>
        <MouthShape mouth={f.mouth} cx={100} cy={150} s={0.75} />
      </g>
      {/* kelp-leaf hat, drooping over one side */}
      <g className="kelp">
        <path d="M66 70 C86 46 122 42 150 58 C136 62 120 66 106 72 C88 80 70 96 52 118 C44 100 54 80 66 70 Z" fill={KELP} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M140 60 C118 60 88 76 60 106" fill="none" stroke={KELP_LT} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M148 58 C156 50 156 42 150 38" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      </g>
      {/* shell hugged to the chest */}
      <g className="shell">
        <path d="M82 182 C80 162 120 162 118 182 L108 190 L92 190 Z" fill={SHELL} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M100 168 V188 M90 172 L95 188 M110 172 L105 188" stroke="#E0A86A" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <ellipse className="paw paw-l" cx="80" cy="178" rx="10" ry="8" fill={FOAM_DK} stroke={INK} strokeWidth="4.5" />
      <ellipse className="paw paw-r" cx="120" cy="178" rx="10" ry="8" fill={FOAM_DK} stroke={INK} strokeWidth="4.5" />
      {state === "celebrating" && (
        <g className="bubbles" fill="#E6F7FF" stroke={INK} strokeWidth="3">
          <circle className="bubble bubble-1" cx="30" cy="150" r="7" />
          <circle className="bubble bubble-2" cx="172" cy="130" r="5.5" />
          <circle className="bubble bubble-3" cx="20" cy="112" r="4.5" />
        </g>
      )}
      {f.asleep && <Zz x={156} y={86} />}
    </Frame>
  );
}
