import { INK } from "../../characters/palette";

/**
 * Paper Boat Post — original picture art, part A: short-vowel words and letter keyword pictures.
 * One 100×100 drawing per word, in the Critter Crew style (chunky ink outline, flat fills, one highlight),
 * matching the Rhyme Lanterns pictures this world reuses (art.tsx merges both banks).
 */
export const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" } as const;
export const T = { ...S, strokeWidth: 3 } as const;
export const N = { fill: "none", ...S } as const;
export const eye = (x: number, y: number, r = 3.2) => <circle cx={x} cy={y} r={r} fill={INK} />;
export const shine = (d: string) => <path d={d} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />;
const smile = (x: number, y: number, w = 6) => <path d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`} {...N} strokeWidth={3} />;

export const PICTURES_A: Record<string, React.JSX.Element> = {
  // ---------------------------------------------------------------- short-vowel words
  bag: (
    <g>
      <path d="M36 34 Q36 14 50 14 Q64 14 64 34" {...N} strokeWidth={5} />
      <path d="M20 36 L80 36 L86 88 L14 88 Z" fill="#F5A04A" {...S} />
      <path d="M20 46 L80 46" stroke={INK} strokeWidth="3" />
      <circle cx="50" cy="64" r="8" fill="#FFD43B" {...T} />
      {shine("M26 54 L24 78")}
    </g>
  ),
  bib: (
    <g>
      <path d="M34 18 Q50 34 66 18" {...N} strokeWidth={5} />
      <path d="M28 22 Q24 40 26 58 Q30 86 50 88 Q70 86 74 58 Q76 40 72 22 Q60 38 50 38 Q40 38 28 22 Z" fill="#9FE3FF" {...S} />
      <path d="M40 62 Q50 72 60 62" {...N} strokeWidth={3} />
      <circle cx="42" cy="52" r="3" fill="#FF8FB1" /><circle cx="58" cy="52" r="3" fill="#FF8FB1" /><circle cx="50" cy="78" r="3" fill="#FFD43B" />
    </g>
  ),
  bin: (
    <g>
      <path d="M24 30 L76 30 L70 88 L30 88 Z" fill="#6BCB77" {...S} />
      <rect x="18" y="20" width="64" height="12" rx="5" fill="#4FAE5E" {...S} />
      <path d="M42 20 Q50 10 58 20" {...N} />
      <path d="M40 42 L42 78 M50 42 L50 78 M60 42 L58 78" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  bus: (
    <g>
      <rect x="8" y="24" width="84" height="54" rx="10" fill="#FFD43B" {...S} />
      <rect x="16" y="32" width="18" height="16" rx="3" fill="#BDE7FF" {...T} />
      <rect x="40" y="32" width="18" height="16" rx="3" fill="#BDE7FF" {...T} />
      <rect x="64" y="32" width="20" height="24" rx="3" fill="#BDE7FF" {...T} />
      <path d="M8 60 L92 60" stroke={INK} strokeWidth="3" />
      <circle cx="28" cy="80" r="9" fill="#5A5070" {...S} /><circle cx="72" cy="80" r="9" fill="#5A5070" {...S} />
    </g>
  ),
  cab: (
    <g>
      <path d="M10 70 L10 52 Q12 44 22 42 L32 28 L66 28 L78 42 Q90 44 90 54 L90 70 Z" fill="#FFC93C" {...S} />
      <rect x="38" y="16" width="22" height="10" rx="3" fill="#fff" {...T} />
      <path d="M36 32 L48 32 L48 42 L28 42 Z M52 32 L64 32 L72 42 L52 42 Z" fill="#BDE7FF" {...T} />
      <path d="M12 56 L88 56" stroke={INK} strokeWidth="2.5" strokeDasharray="5 5" />
      <circle cx="28" cy="72" r="9" fill="#5A5070" {...S} /><circle cx="72" cy="72" r="9" fill="#5A5070" {...S} />
    </g>
  ),
  cap: (
    <g>
      <path d="M18 62 Q18 26 52 26 Q82 26 82 62 Z" fill="#FF6B6B" {...S} />
      <path d="M50 62 Q74 58 96 70 Q76 78 50 72 Z" fill="#E04F5F" {...S} />
      <circle cx="52" cy="24" r="5" fill="#FFD43B" {...T} />
      <path d="M52 28 L52 62" stroke={INK} strokeWidth="2.5" />
      {shine("M28 52 Q28 36 40 32")}
    </g>
  ),
  cub: (
    <g>
      <circle cx="30" cy="26" r="10" fill="#B07A4C" {...S} /><circle cx="70" cy="26" r="10" fill="#B07A4C" {...S} />
      <circle cx="50" cy="50" r="30" fill="#C98E5A" {...S} />
      <ellipse cx="50" cy="62" rx="14" ry="11" fill="#F2D2A9" {...T} />
      {eye(40, 46)}{eye(60, 46)}
      <ellipse cx="50" cy="57" rx="5" ry="3.5" fill={INK} />
      {smile(50, 64, 5)}
      <path d="M30 76 Q50 92 70 76" {...N} />
    </g>
  ),
  cup: (
    <g>
      <path d="M72 40 Q90 40 88 56 Q86 70 70 68" {...N} strokeWidth={6} />
      <path d="M18 30 L76 30 L70 82 Q46 90 24 82 Z" fill="#8E6CEF" {...S} />
      <ellipse cx="47" cy="30" rx="29" ry="7" fill="#B9A2FF" {...S} />
      <circle cx="40" cy="58" r="5" fill="#FFD43B" /><circle cx="56" cy="66" r="4" fill="#FFD43B" />
      {shine("M28 44 L30 70")}
    </g>
  ),
  dot: (
    <g>
      <circle cx="50" cy="50" r="30" fill="#FF6B6B" {...S} />
      {shine("M34 40 Q38 30 48 28")}
    </g>
  ),
  fig: (
    <g>
      <path d="M50 14 Q54 22 50 26" {...N} />
      <path d="M50 26 Q76 34 76 62 Q76 88 50 88 Q24 88 24 62 Q24 34 50 26 Z" fill="#8B4A8F" {...S} />
      <path d="M54 18 Q66 10 72 18 Q62 24 54 18 Z" fill="#6BCB77" {...T} />
      {shine("M34 52 Q34 40 42 36")}
    </g>
  ),
  fin: (
    <g>
      <path d="M4 74 Q50 64 96 74 L96 96 L4 96 Z" fill="#4D96FF" {...S} />
      <path d="M30 72 Q38 30 70 14 Q62 40 70 70 Z" fill="#8C9AAE" {...S} />
      <path d="M8 82 Q20 76 32 82 T56 82 T80 82" {...N} stroke="#fff" strokeWidth={3} />
    </g>
  ),
  ham: (
    <g>
      <path d="M16 54 Q16 24 50 22 Q80 22 82 46 Q84 62 70 70 L36 80 Q16 80 16 54 Z" fill="#FF8FA8" {...S} />
      <path d="M26 56 Q28 36 50 34 Q70 34 72 48" {...N} stroke="#fff" strokeWidth={3} strokeOpacity={0.7} />
      <path d="M70 70 L86 86" {...N} strokeWidth={10} stroke={INK} />
      <path d="M70 70 L86 86" stroke="#FFF3D6" strokeWidth="5" strokeLinecap="round" />
      <circle cx="88" cy="88" r="6" fill="#FFF3D6" {...T} />
    </g>
  ),
  hen: (
    <g>
      <path d="M40 22 Q44 12 50 20 Q54 10 58 22" fill="#FF6B6B" {...T} />
      <path d="M26 60 Q24 30 50 26 Q70 26 72 46 Q86 40 88 54 Q86 80 56 84 Q30 86 26 60 Z" fill="#fff" {...S} />
      <path d="M36 42 L24 46 L36 50 Z" fill="#FFB52E" {...T} />
      {eye(44, 40)}
      <path d="M46 58 Q58 74 72 60" {...N} strokeWidth={3} />
      <path d="M46 84 L44 94 M60 84 L62 94" {...N} stroke="#FFB52E" strokeWidth={4} />
    </g>
  ),
  hut: (
    <g>
      <path d="M8 50 L50 14 L92 50 Z" fill="#D9A441" {...S} />
      <path d="M20 40 L80 40 M30 30 L70 30" stroke={INK} strokeWidth="2.5" />
      <rect x="18" y="50" width="64" height="38" fill="#C98E5A" {...S} />
      <path d="M42 88 L42 66 Q50 58 58 66 L58 88" fill="#7A4A2A" {...T} />
    </g>
  ),
  jet: (
    <g>
      <path d="M10 54 Q40 44 82 46 Q96 48 94 54 Q92 60 80 60 Q40 62 10 54 Z" fill="#E6F2FF" {...S} />
      <path d="M44 50 L28 22 L40 22 L62 48 Z M44 58 L30 84 L42 84 L62 60 Z" fill="#4D96FF" {...S} />
      <path d="M14 52 L8 38 L18 40 L24 50 Z" fill="#4D96FF" {...T} />
      <circle cx="74" cy="52" r="3" fill="#4D96FF" /><circle cx="64" cy="52" r="3" fill="#4D96FF" />
    </g>
  ),
  leg: (
    <g>
      <path d="M38 8 L38 66 Q38 76 30 80 L20 84 Q12 88 16 94 L58 94 Q62 80 60 66 L60 8" fill="#F2C59E" {...S} />
      <path d="M36 70 Q48 74 60 68" {...N} strokeWidth={3} />
      <path d="M38 20 L60 20 L60 8 L38 8 Z" fill="#4D96FF" {...T} />
    </g>
  ),
  map: (
    <g>
      <path d="M10 22 L36 14 L64 22 L90 14 L90 78 L64 86 L36 78 L10 86 Z" fill="#FFF1C7" {...S} />
      <path d="M36 14 L36 78 M64 22 L64 86" stroke={INK} strokeWidth="2.5" />
      <path d="M18 66 Q34 52 46 58 T76 40" {...N} strokeWidth={3} strokeDasharray="5 6" stroke="#E04F5F" />
      <path d="M72 30 L82 40 M82 30 L72 40" {...N} stroke="#E04F5F" />
      <path d="M16 30 Q24 26 28 34 Q22 40 16 36 Z" fill="#6BCB77" stroke={INK} strokeWidth="2" />
    </g>
  ),
  mat: (
    <g>
      <path d="M8 70 L28 42 L92 42 L72 70 Z" fill="#FF8FB1" {...S} />
      <path d="M24 64 L38 48 M40 64 L54 48 M56 64 L70 48" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M8 70 L8 76 L72 76 L92 48 L92 42" fill="#E0668E" {...T} />
    </g>
  ),
  mop: (
    <g>
      <path d="M58 8 L44 60" {...N} strokeWidth={9} />
      <path d="M58 8 L44 60" stroke="#C98E5A" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 58 L60 62 L66 72 L22 70 Z" fill="#9FE3FF" {...T} />
      <path d="M24 70 L16 92 M32 71 L28 94 M40 72 L40 94 M48 72 L52 94 M56 72 L64 92 M64 72 L74 88" {...N} stroke="#9FE3FF" strokeWidth={6} />
      <path d="M24 70 L16 92 M40 72 L40 94 M56 72 L64 92" {...N} strokeWidth={2} />
    </g>
  ),
  net: (
    <g>
      <path d="M70 70 L94 94" {...N} strokeWidth={9} />
      <path d="M70 70 L94 94" stroke="#C98E5A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="44" cy="44" r="32" fill="#E6F2FF" {...S} />
      <path d="M20 26 L68 66 M14 46 L50 74 M30 14 L74 50 M44 12 L76 38 M14 60 L66 22 M24 72 L74 34 M40 76 L76 52 M12 40 L48 14" stroke={INK} strokeOpacity="0.45" strokeWidth="2" />
      <circle cx="44" cy="44" r="32" {...N} />
    </g>
  ),
  pen: (
    <g>
      <path d="M70 12 L88 30 L38 80 L20 62 Z" fill="#4D96FF" {...S} />
      <path d="M20 62 L38 80 L14 90 Z" fill="#F2D2A9" {...S} />
      <path d="M16 84 L14 90 L20 88 Z" fill={INK} />
      <path d="M62 20 L80 38" stroke={INK} strokeWidth="3" />
      {shine("M66 22 L34 54")}
    </g>
  ),
  pin: (
    <g>
      <path d="M50 52 L50 92" {...N} strokeWidth={5} />
      <circle cx="50" cy="34" r="22" fill="#FF6B6B" {...S} />
      {shine("M38 28 Q40 20 48 18")}
    </g>
  ),
  pot: (
    <g>
      <path d="M14 40 L86 40 L80 82 Q50 92 20 82 Z" fill="#5A5070" {...S} />
      <rect x="10" y="32" width="80" height="10" rx="4" fill="#7A6E92" {...S} />
      <path d="M38 32 Q50 20 62 32" {...N} />
      <path d="M8 50 L14 50 M86 50 L92 50" {...N} strokeWidth={6} />
      <path d="M34 16 Q38 8 34 2 M50 18 Q54 10 50 4 M66 16 Q70 8 66 2" {...N} strokeWidth={3} stroke="#B8B0C8" />
    </g>
  ),
  top: (
    <g>
      <path d="M50 6 L50 24" {...N} strokeWidth={6} />
      <path d="M18 40 Q50 18 82 40 Q78 58 50 92 Q22 58 18 40 Z" fill="#FFD43B" {...S} />
      <path d="M18 40 Q50 52 82 40" {...N} strokeWidth={3} />
      <path d="M26 54 Q50 64 74 54" {...N} strokeWidth={3} stroke="#E04F5F" />
      <path d="M34 66 Q50 74 66 66" {...N} strokeWidth={3} stroke="#4D96FF" />
    </g>
  ),
  tub: (
    <g>
      <path d="M8 42 L92 42 L86 72 Q50 84 14 72 Z" fill="#fff" {...S} />
      <path d="M14 42 Q22 30 34 38 Q40 26 52 34 Q60 24 70 34 Q82 28 86 42" fill="#E6F2FF" {...T} />
      <path d="M22 76 L18 90 M78 76 L82 90" {...N} strokeWidth={5} />
      <circle cx="80" cy="22" r="5" fill="#E6F2FF" {...T} /><circle cx="70" cy="14" r="3.5" fill="#E6F2FF" {...T} />
    </g>
  ),
  web: (
    <g>
      <path d="M50 6 L50 94 M8 50 L92 50 M20 20 L80 80 M80 20 L20 80" stroke={INK} strokeWidth="2.5" />
      <path d="M50 22 L70 30 L78 50 L70 70 L50 78 L30 70 L22 50 L30 30 Z" {...N} strokeWidth={2.5} />
      <path d="M50 36 L60 40 L64 50 L60 60 L50 64 L40 60 L36 50 L40 40 Z" {...N} strokeWidth={2.5} />
      <path d="M50 10 L78 22 L90 50 L78 78 L50 90 L22 78 L10 50 L22 22 Z" {...N} strokeWidth={2.5} />
      <circle cx="64" cy="62" r="5" fill={INK} /><circle cx="64" cy="54" r="3.5" fill={INK} />
    </g>
  ),

  // ---------------------------------------------------------------- keyword pictures for letter tiles
  apple: (
    <g>
      <path d="M50 26 Q52 16 58 10" {...N} />
      <path d="M50 28 Q30 18 20 36 Q12 56 26 76 Q38 92 50 84 Q62 92 74 76 Q88 56 80 36 Q70 18 50 28 Z" fill="#FF5A4E" {...S} />
      <path d="M56 18 Q70 8 78 16 Q68 26 56 18 Z" fill="#6BCB77" {...T} />
      {shine("M30 44 Q32 34 40 32")}
    </g>
  ),
  cow: (
    <g>
      <path d="M22 34 L10 26 L20 22 Z M78 34 L90 26 L80 22 Z" fill="#fff" {...S} />
      <path d="M30 26 Q30 14 36 14 M70 26 Q70 14 64 14" {...N} stroke="#D9A441" strokeWidth={5} />
      <path d="M24 34 Q24 20 50 20 Q76 20 76 34 L74 58 Q74 66 50 66 Q26 66 26 58 Z" fill="#fff" {...S} />
      <path d="M58 22 Q70 22 70 36 Q60 40 56 30 Z" fill={INK} />
      {eye(40, 40)}{eye(60, 40)}
      <ellipse cx="50" cy="70" rx="22" ry="14" fill="#FFB8C8" {...S} />
      <ellipse cx="42" cy="70" rx="3" ry="4" fill={INK} /><ellipse cx="58" cy="70" rx="3" ry="4" fill={INK} />
    </g>
  ),
  duck: (
    <g>
      <path d="M22 64 Q16 46 34 44 Q36 22 54 22 Q70 22 70 38 Q70 46 64 50 Q84 46 90 60 Q90 84 58 86 Q28 86 22 64 Z" fill="#FFD43B" {...S} />
      <path d="M68 36 L86 38 Q86 44 70 46 Z" fill="#FF9F43" {...T} />
      {eye(58, 34)}
      <path d="M40 66 Q54 58 68 66" {...N} strokeWidth={3} />
    </g>
  ),
  egg: (
    <g>
      <path d="M50 12 Q76 14 78 56 Q78 88 50 88 Q22 88 22 56 Q24 14 50 12 Z" fill="#FFF7E6" {...S} />
      {shine("M34 40 Q36 28 44 24")}
    </g>
  ),
  feather: (
    <g>
      <path d="M20 88 L74 14" {...N} strokeWidth={3} />
      <path d="M74 14 Q92 30 80 52 Q66 74 34 74 Q34 44 50 28 Q60 18 74 14 Z" fill="#4D96FF" {...S} />
      <path d="M60 30 L72 34 M52 42 L68 46 M44 54 L62 58 M40 64 L54 68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 88 L74 14" stroke={INK} strokeWidth="3" />
    </g>
  ),
  horse: (
    <g>
      <path d="M30 40 Q34 18 58 18 L66 8 L68 20 Q80 26 84 44 Q88 58 76 62 L58 56 L56 86 L32 86 Q24 66 30 40 Z" fill="#B07A4C" {...S} />
      <path d="M44 22 Q30 26 26 46 Q24 60 30 72" {...N} stroke="#5A3A20" strokeWidth={8} />
      {eye(64, 32)}
      <ellipse cx="80" cy="54" rx="3" ry="2.5" fill={INK} />
    </g>
  ),
  igloo: (
    <g>
      <path d="M8 82 Q8 26 50 24 Q92 26 92 82 Z" fill="#E6F2FF" {...S} />
      <path d="M38 82 L38 66 Q50 54 62 66 L62 82" fill="#5A7EA8" {...T} />
      <path d="M14 62 L86 62 M22 44 L78 44 M36 30 L64 30 M30 44 L30 62 M54 44 L54 62 M42 30 L42 44 M66 30 L66 44 M20 62 L20 82 M80 62 L80 82" stroke={INK} strokeOpacity="0.5" strokeWidth="2.5" />
    </g>
  ),
  jelly: (
    <g>
      <rect x="22" y="22" width="56" height="10" rx="3" fill="#FFF1C7" {...S} />
      <path d="M24 32 L76 32 L74 84 Q50 92 26 84 Z" fill="#E6F2FF" {...S} />
      <path d="M28 46 L72 46 L71 82 Q50 88 29 82 Z" fill="#E04F5F" />
      <rect x="34" y="54" width="32" height="18" rx="4" fill="#fff" {...T} />
      <circle cx="50" cy="63" r="4" fill="#E04F5F" />
    </g>
  ),
  kite: (
    <g>
      <path d="M50 8 L80 40 L50 74 L20 40 Z" fill="#FF8FB1" {...S} />
      <path d="M50 8 L50 74 M20 40 L80 40" stroke={INK} strokeWidth="3" />
      <path d="M50 74 Q44 84 52 88 Q60 92 54 98" {...N} strokeWidth={3} />
      <path d="M46 84 L40 80 L42 88 Z M56 92 L62 88 L60 96 Z" fill="#FFD43B" stroke={INK} strokeWidth="2" />
    </g>
  ),
  leaf: (
    <g>
      <path d="M16 84 Q14 30 70 14 Q92 10 86 30 Q74 82 16 84 Z" fill="#6BCB77" {...S} />
      <path d="M16 84 Q46 56 76 24" {...N} strokeWidth={3} />
      <path d="M40 62 L34 44 M52 50 L50 32 M40 62 L58 64 M52 50 L70 50" {...N} strokeWidth={2.5} />
    </g>
  ),
  nest: (
    <g>
      <ellipse cx="38" cy="54" rx="10" ry="13" fill="#9FE3FF" {...T} /><ellipse cx="54" cy="52" rx="10" ry="13" fill="#9FE3FF" {...T} /><ellipse cx="68" cy="56" rx="9" ry="12" fill="#9FE3FF" {...T} />
      <path d="M10 56 Q50 70 90 56 Q86 86 50 88 Q14 86 10 56 Z" fill="#B07A4C" {...S} />
      <path d="M16 64 Q50 78 84 64 M22 74 Q50 84 78 74" {...N} strokeWidth={2.5} />
    </g>
  ),
  octopus: (
    <g>
      <path d="M24 50 Q20 16 50 14 Q80 16 76 50 Z" fill="#B57CFF" {...S} />
      <path d="M26 48 Q14 70 22 86 M38 52 Q32 76 40 90 M50 52 Q50 78 56 92 M62 52 Q68 76 64 90 M74 48 Q86 70 80 86" {...N} stroke="#B57CFF" strokeWidth={9} />
      <path d="M26 48 Q14 70 22 86 M38 52 Q32 76 40 90 M50 52 Q50 78 56 92 M62 52 Q68 76 64 90 M74 48 Q86 70 80 86" {...N} strokeWidth={2} />
      {eye(40, 34)}{eye(60, 34)}
      {smile(50, 42, 6)}
    </g>
  ),
  panda: (
    <g>
      <circle cx="26" cy="26" r="11" fill={INK} /><circle cx="74" cy="26" r="11" fill={INK} />
      <circle cx="50" cy="52" r="34" fill="#fff" {...S} />
      <ellipse cx="36" cy="48" rx="9" ry="11" fill={INK} transform="rotate(-25 36 48)" /><ellipse cx="64" cy="48" rx="9" ry="11" fill={INK} transform="rotate(25 64 48)" />
      <circle cx="37" cy="47" r="3" fill="#fff" /><circle cx="63" cy="47" r="3" fill="#fff" />
      <ellipse cx="50" cy="62" rx="6" ry="4" fill={INK} />
      {smile(50, 70, 6)}
    </g>
  ),
  robot: (
    <g>
      <path d="M50 8 L50 20" {...N} /><circle cx="50" cy="8" r="5" fill="#FF6B6B" {...T} />
      <rect x="22" y="20" width="56" height="44" rx="10" fill="#9AA8BE" {...S} />
      <rect x="30" y="30" width="40" height="18" rx="6" fill="#BDE7FF" {...T} />
      {eye(41, 39, 4)}{eye(59, 39, 4)}
      <path d="M38 56 L62 56" {...N} strokeWidth={3} />
      <rect x="32" y="64" width="36" height="26" rx="6" fill="#7A879C" {...S} />
      <path d="M14 34 L22 40 M86 34 L78 40" {...N} strokeWidth={5} />
    </g>
  ),
  seal: (
    <g>
      <path d="M14 82 Q10 60 30 54 Q30 26 50 22 Q68 20 70 40 Q72 60 84 70 Q96 74 92 84 Q60 92 14 82 Z" fill="#8C9AAE" {...S} />
      {eye(48, 36)}{eye(62, 36)}
      <ellipse cx="56" cy="46" rx="5" ry="3.5" fill={INK} />
      <path d="M44 48 L32 46 M44 52 L32 54 M68 48 L78 46 M68 52 L78 54" {...N} strokeWidth={2} />
      <path d="M40 72 Q50 66 60 74" {...N} strokeWidth={3} />
    </g>
  ),
  tiger: (
    <g>
      <circle cx="26" cy="26" r="10" fill="#FF9F43" {...S} /><circle cx="74" cy="26" r="10" fill="#FF9F43" {...S} />
      <circle cx="50" cy="52" r="34" fill="#FF9F43" {...S} />
      <path d="M50 18 L50 30 M40 20 L44 30 M60 20 L56 30 M16 48 L28 50 M16 60 L28 58 M84 48 L72 50 M84 60 L72 58" {...N} strokeWidth={4} />
      <ellipse cx="50" cy="66" rx="16" ry="12" fill="#fff" {...T} />
      {eye(38, 46)}{eye(62, 46)}
      <path d="M45 58 L55 58 L50 64 Z" fill={INK} />
    </g>
  ),
  umbrella: (
    <g>
      <path d="M50 46 L50 82 Q50 92 40 90 Q34 88 34 82" {...N} strokeWidth={5} />
      <path d="M8 50 Q10 14 50 12 Q90 14 92 50 Q84 42 76 50 Q68 42 58 50 Q50 42 42 50 Q32 42 24 50 Q16 42 8 50 Z" fill="#8E6CEF" {...S} />
      <path d="M50 12 Q36 26 42 50 M50 12 Q64 26 58 50" {...N} strokeWidth={3} />
    </g>
  ),
  violin: (
    <g>
      <path d="M62 8 L54 40" {...N} strokeWidth={7} />
      <path d="M50 36 Q30 32 30 50 Q30 58 36 62 Q26 68 28 80 Q32 94 48 92 Q64 92 66 80 Q68 68 58 62 Q66 56 64 46 Q62 36 50 36 Z" fill="#C9772E" {...S} />
      <path d="M44 56 L42 62 M56 58 L54 64" {...N} strokeWidth={3} />
      <path d="M49 44 L45 86" stroke={INK} strokeWidth="2" />
      <path d="M80 30 L20 74" {...N} strokeWidth={3} stroke="#7A4A2A" />
    </g>
  ),
  worm: (
    <g>
      <path d="M14 70 Q24 48 38 66 Q52 84 64 62 Q74 42 86 48" {...N} stroke={INK} strokeWidth={20} />
      <path d="M14 70 Q24 48 38 66 Q52 84 64 62 Q74 42 86 48" {...N} stroke="#FF8FA8" strokeWidth={13} />
      {eye(86, 46, 2.6)}
      <path d="M30 60 L32 66 M48 72 L46 78 M62 58 L66 62" {...N} strokeWidth={2} stroke="#E0668E" />
    </g>
  ),
  zebra: (
    <g>
      <path d="M36 22 L30 8 L42 16 Z M64 22 L70 8 L58 16 Z" fill="#fff" {...S} />
      <path d="M30 30 Q30 14 50 14 Q70 14 70 30 L68 66 Q68 90 50 90 Q32 90 32 66 Z" fill="#fff" {...S} />
      <path d="M34 34 L46 36 M66 34 L54 36 M33 46 L44 46 M67 46 L56 46 M50 14 L50 28" {...N} strokeWidth={4} />
      <ellipse cx="50" cy="76" rx="15" ry="11" fill="#5A5070" {...T} />
      {eye(40, 52)}{eye(60, 52)}
      <circle cx="44" cy="76" r="2.5" fill="#fff" /><circle cx="56" cy="76" r="2.5" fill="#fff" />
    </g>
  ),
};
