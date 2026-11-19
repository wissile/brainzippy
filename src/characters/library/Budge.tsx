import { Cheeks, Eye, Frame, INK, MouthShape, Shine, Zz, useFace, type HostProps } from "./kit";

/**
 * Budge — Money and financial-literacy host. A golden badger shaped like a gumdrop: cream stripe down the
 * middle of her face, warm brown badger mask bands, a satchel slung across her body and a rolled-up
 * list tucked behind one ear (she loves lists). No coins, slots or piggy-bank features: she is a character,
 * not a bank.
 */
const GOLD = "#E9A93B";
const STRIPE = "#FFF0CF";
const MASK = "#9C5A22";
const LEATHER = "#A86B3C";
const STRAP = "#8A5530";

export function Budge({ state = "idle", talking = false, size = 220, className = "" }: HostProps) {
  const f = useFace(state, talking);
  return (
    <Frame id="budge" label="Budge, a golden badger with a satchel" state={state} size={size} className={className} blink={f.blink} talking={f.talking}>
      {/* ears */}
      <circle cx="62" cy="76" r="15" fill={MASK} stroke={INK} strokeWidth="5" /><circle cx="62" cy="76" r="6.5" fill={STRIPE} />
      <circle cx="138" cy="76" r="15" fill={MASK} stroke={INK} strokeWidth="5" /><circle cx="138" cy="76" r="6.5" fill={STRIPE} />
      {/* feet */}
      <ellipse cx="74" cy="205" rx="20" ry="10" fill={MASK} stroke={INK} strokeWidth="5" />
      <ellipse cx="126" cy="205" rx="20" ry="10" fill={MASK} stroke={INK} strokeWidth="5" />
      {/* arms */}
      <path className="arm arm-l" d="M44 138 Q30 150 34 168" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      <path className="arm arm-r" d="M156 138 Q170 150 166 168" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
      {/* body */}
      <path d="M100 58 C140 58 158 94 160 136 C162 178 156 204 100 204 C44 204 38 178 40 136 C42 94 60 58 100 58 Z" fill={GOLD} stroke={INK} strokeWidth="5.5" />
      {/* face stripe + mask bands */}
      <path d="M86 61 C94 58 106 58 114 61 L110 120 Q100 128 90 120 Z" fill={STRIPE} />
      <path d="M54 92 C64 82 86 92 92 110 C96 124 86 134 72 130 C58 126 50 106 54 92 Z" fill={MASK} />
      <path d="M146 92 C136 82 114 92 108 110 C104 124 114 134 128 130 C142 126 150 106 146 92 Z" fill={MASK} />
      <path d="M100 58 C140 58 158 94 160 136 C162 178 156 204 100 204 C44 204 38 178 40 136 C42 94 60 58 100 58 Z" fill="none" stroke={INK} strokeWidth="5.5" />
      <Shine d="M58 112 C58 96 64 82 74 72" o={0.5} />
      {/* muzzle */}
      <ellipse cx="100" cy="144" rx="26" ry="17" fill={STRIPE} />
      {/* satchel strap + bag */}
      <path d="M162 140 L50 182" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d="M162 140 L50 182" stroke={STRAP} strokeWidth="5.5" strokeLinecap="round" />
      <g className="satchel">
        <g transform="translate(-14 0)">
          {/* her rolled-up list, peeking out of the bag */}
          <g className="scroll">
            <g transform="rotate(-18 40 160)">
              <rect x="30" y="140" width="18" height="34" rx="5" fill="#FFFDF6" stroke={INK} strokeWidth="4" />
              <path d="M34 150 H44 M34 157 H44" stroke="#7FA8D9" strokeWidth="2.6" strokeLinecap="round" />
              <ellipse cx="39" cy="140" rx="9" ry="4" fill="#F2E6C8" stroke={INK} strokeWidth="3.5" />
            </g>
          </g>
          <rect x="26" y="164" width="44" height="36" rx="10" fill={LEATHER} stroke={INK} strokeWidth="5" />
          <path d="M26 176 Q48 186 70 176 L70 172 Q70 164 60 164 L36 164 Q26 164 26 172 Z" fill="#C4844F" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="48" cy="182" r="4.5" fill="#FFD43B" stroke={INK} strokeWidth="3" />
        </g>
      </g>
      <g className="face">
        <Eye cx={78} cy={110} r={16} asleep={f.asleep} />
        <Eye cx={122} cy={110} r={16} asleep={f.asleep} />
        <Cheeks y={142} l={64} r={136} />
        <ellipse cx="100" cy="134" rx="8.5" ry="5.5" fill={INK} />
        <ellipse cx="97.5" cy="132.5" rx="2.6" ry="1.6" fill="#fff" opacity="0.8" />
        <MouthShape mouth={f.mouth} cx={100} cy={148} s={0.85} />
      </g>
      {f.asleep && <Zz x={160} y={92} />}
    </Frame>
  );
}
