import { INK } from "../../characters/palette";
import { PICTURES as RL } from "../rhyme-lanterns/pictures";
import { N, PICTURES_A, S, T, eye, shine } from "./pictures-a";

/**
 * Paper Boat Post — original picture art, part B: digraph, blend, final -e, vowel-team and long words.
 * Compound pictures reuse their parts where that helps a child see the two words (bath + tub, rain + coat).
 */
const smile = (x: number, y: number, w = 6) => <path d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`} {...N} strokeWidth={3} />;
const scaled = (el: React.JSX.Element, s: number, x: number, y: number) => <g transform={`translate(${x} ${y}) scale(${s})`}>{el}</g>;
const fish = (fill: string, whiskers = false) => (
  <g>
    <path d="M70 50 L94 32 L90 50 L94 68 Z" fill={fill} {...S} />
    <path d="M8 50 Q30 22 60 28 Q76 34 76 50 Q76 66 60 72 Q30 78 8 50 Z" fill={fill} {...S} />
    {eye(26, 46)}
    <path d="M46 34 Q54 50 46 66" {...N} strokeWidth={3} />
    {whiskers && <path d="M12 54 L2 60 M14 58 L6 68 M12 48 L2 44" {...N} strokeWidth={2.5} />}
  </g>
);

export const PICTURES_B: Record<string, React.JSX.Element> = {
  // ---------------------------------------------------------------- digraphs (L4)
  chip: (
    <g>
      <path d="M14 56 Q16 30 46 24 Q78 20 86 44 Q90 66 64 76 Q30 86 14 56 Z" fill="#FFD27A" {...S} />
      <path d="M30 50 Q34 44 40 48 M54 38 Q60 34 64 40 M50 62 Q56 58 62 62" {...N} strokeWidth={2.5} stroke="#D9A441" />
      {shine("M26 48 Q30 36 42 32")}
    </g>
  ),
  ship: (
    <g>
      <rect x="40" y="18" width="14" height="22" fill="#FF6B5A" {...S} />
      <rect x="58" y="24" width="12" height="16" fill="#FF6B5A" {...S} />
      <rect x="24" y="38" width="56" height="18" fill="#fff" {...S} />
      <circle cx="36" cy="47" r="3.5" fill="#BDE7FF" {...T} /><circle cx="50" cy="47" r="3.5" fill="#BDE7FF" {...T} /><circle cx="64" cy="47" r="3.5" fill="#BDE7FF" {...T} />
      <path d="M8 56 L94 56 L82 80 L18 80 Z" fill="#4D5BD9" {...S} />
      <path d="M2 88 Q16 82 30 88 T58 88 T86 88 T100 88" {...N} stroke="#4D96FF" />
    </g>
  ),
  shop: (
    <g>
      <rect x="14" y="40" width="72" height="50" fill="#FFF1C7" {...S} />
      <path d="M8 40 L16 18 L84 18 L92 40 Z" fill="#fff" {...S} />
      <path d="M8 40 Q14 50 22 40 Q28 50 36 40 Q42 50 50 40 Q56 50 64 40 Q70 50 78 40 Q84 50 92 40" fill="#FF6B6B" {...T} />
      <path d="M30 18 L26 40 M50 18 L50 40 M70 18 L74 40" stroke="#FF6B6B" strokeWidth="6" />
      <rect x="22" y="54" width="26" height="22" fill="#BDE7FF" {...T} />
      <rect x="56" y="56" width="20" height="34" fill="#C98E5A" {...T} />
    </g>
  ),
  chin: (
    <g>
      <path d="M22 30 Q22 12 50 12 Q78 12 78 30 L78 52 Q78 90 50 90 Q22 90 22 52 Z" fill="#F2C59E" {...S} />
      {eye(38, 40)}{eye(62, 40)}
      {smile(50, 60, 9)}
      <path d="M38 82 Q50 92 62 82" {...N} strokeWidth={4} stroke="#E04F5F" />
      <path d="M56 98 L50 86" {...N} strokeWidth={3} />
      <path d="M44 74 L50 84 L56 74" fill="#FFD43B" stroke={INK} strokeWidth="2" />
      <path d="M22 28 Q30 10 50 10 Q72 10 78 28 Q64 20 50 22 Q34 20 22 28 Z" fill="#7A4A2A" {...T} />
    </g>
  ),
  chick: (
    <g>
      <path d="M22 60 Q20 30 50 30 Q80 30 78 60 Q76 88 50 88 Q24 88 22 60 Z" fill="#FFE066" {...S} />
      <path d="M22 70 Q10 60 14 50 Q24 56 28 64 M78 70 Q90 60 86 50 Q76 56 72 64" fill="#FFD43B" {...T} />
      {eye(42, 52)}{eye(58, 52)}
      <path d="M44 60 L56 60 L50 68 Z" fill="#FF9F43" {...T} />
      <path d="M46 30 Q48 20 52 30 Q56 22 56 32" {...N} strokeWidth={3} />
      <path d="M42 88 L40 96 M58 88 L60 96" {...N} stroke="#FF9F43" />
    </g>
  ),
  fish: fish("#FF9F43"),
  dish: (
    <g>
      <path d="M8 46 L92 46 Q88 80 50 82 Q12 80 8 46 Z" fill="#9FE3FF" {...S} />
      <ellipse cx="50" cy="46" rx="42" ry="10" fill="#E6F7FF" {...S} />
      <path d="M30 42 Q40 34 50 40 Q60 32 70 42" fill="#FF9F43" {...T} />
      <path d="M22 60 Q50 74 78 60" {...N} strokeWidth={3} stroke="#fff" />
    </g>
  ),
  shed: (
    <g>
      <path d="M10 46 L50 16 L90 46 Z" fill="#E04F5F" {...S} />
      <rect x="18" y="46" width="64" height="44" fill="#6BCB77" {...S} />
      <path d="M26 46 L26 90 M74 46 L74 90" stroke={INK} strokeWidth="2.5" strokeOpacity="0.4" />
      <rect x="38" y="58" width="24" height="32" fill="#4FAE5E" {...T} />
      <path d="M38 58 L62 90 M62 58 L38 90" stroke={INK} strokeWidth="2.5" />
    </g>
  ),
  bath: (
    <g>
      <path d="M16 22 Q16 10 28 10 L34 10" {...N} strokeWidth={5} />
      <circle cx="36" cy="16" r="4" fill="#9AA8BE" {...T} />
      <path d="M36 22 L36 30 M30 26 L28 34 M42 26 L44 34" {...N} stroke="#4D96FF" strokeWidth={3} />
      <path d="M8 46 L92 46 L86 74 Q50 86 14 74 Z" fill="#fff" {...S} />
      <path d="M14 50 L86 50 L83 62 Q50 70 17 62 Z" fill="#9FE3FF" />
      <path d="M22 78 L18 92 M78 78 L82 92" {...N} strokeWidth={5} />
    </g>
  ),
  path: (
    <g>
      <path d="M4 40 Q30 30 50 36 T96 34 L96 96 L4 96 Z" fill="#7FD27A" {...S} />
      <path d="M44 38 Q34 60 18 96 L60 96 Q58 64 58 38 Z" fill="#E8C792" {...S} />
      <ellipse cx="40" cy="66" rx="5" ry="3" fill="#C9A26A" /><ellipse cx="50" cy="82" rx="6" ry="3.5" fill="#C9A26A" /><ellipse cx="54" cy="52" rx="4" ry="2.5" fill="#C9A26A" />
      <circle cx="80" cy="56" r="6" fill="#FF8FB1" {...T} /><circle cx="20" cy="54" r="5" fill="#FFD43B" {...T} />
    </g>
  ),
  dock: (
    <g>
      <path d="M4 70 Q16 64 28 70 T52 70 T76 70 T100 70 L100 96 L4 96 Z" fill="#4D96FF" stroke="none" />
      <path d="M10 48 L90 48 L90 58 L10 58 Z" fill="#C98E5A" {...S} />
      <path d="M30 48 L30 58 M50 48 L50 58 M70 48 L70 58" stroke={INK} strokeWidth="2.5" />
      <path d="M18 58 L18 90 M50 58 L50 90 M82 58 L82 90" {...N} strokeWidth={7} />
      <path d="M4 74 Q16 68 28 74 T52 74 T76 74 T100 74" {...N} stroke="#fff" strokeWidth={3} />
    </g>
  ),
  moth: (
    <g>
      <path d="M48 34 Q20 10 10 30 Q6 52 46 50 Z M52 34 Q80 10 90 30 Q94 52 54 50 Z" fill="#D9C7A8" {...S} />
      <path d="M46 52 Q22 58 22 76 Q34 84 48 60 Z M54 52 Q78 58 78 76 Q66 84 52 60 Z" fill="#C2AE8C" {...S} />
      <ellipse cx="50" cy="52" rx="6" ry="20" fill="#8A7458" {...S} />
      <path d="M48 32 Q42 18 34 16 M52 32 Q58 18 66 16" {...N} strokeWidth={2.5} />
      <circle cx="28" cy="32" r="5" fill="#fff" {...T} /><circle cx="72" cy="32" r="5" fill="#fff" {...T} />
    </g>
  ),
  // ---------------------------------------------------------------- blends (L5)
  fog: (
    <g>
      <path d="M6 70 Q30 56 50 66 T94 62 L94 90 L6 90 Z" fill="#7FD27A" {...S} />
      <path d="M10 30 L70 30 M24 42 L92 42 M6 54 L60 54 M34 66 L90 66 M14 78 L74 78" {...N} stroke="#C9CEDB" strokeWidth={8} />
      <path d="M10 30 L70 30 M24 42 L92 42 M6 54 L60 54 M34 66 L90 66 M14 78 L74 78" {...N} strokeWidth={1.5} strokeOpacity={0.5} />
    </g>
  ),
  crab: (
    <g>
      <path d="M20 38 Q8 28 14 16 Q22 26 30 22 Q28 34 20 38 Z M80 38 Q92 28 86 16 Q78 26 70 22 Q72 34 80 38 Z" fill="#FF6B5A" {...S} />
      <path d="M22 40 L30 50 M78 40 L70 50" {...N} />
      <path d="M22 64 L8 74 M24 72 L12 84 M78 64 L92 74 M76 72 L88 84" {...N} />
      <ellipse cx="50" cy="62" rx="30" ry="20" fill="#FF6B5A" {...S} />
      <path d="M42 44 L40 34 M58 44 L60 34" {...N} strokeWidth={3} />
      <circle cx="40" cy="32" r="4" fill="#fff" {...T} /><circle cx="60" cy="32" r="4" fill="#fff" {...T} />
      {smile(50, 64, 7)}
    </g>
  ),
  crib: (
    <g>
      <rect x="14" y="36" width="72" height="40" fill="#FFF1C7" {...S} />
      <path d="M26 36 L26 76 M38 36 L38 76 M50 36 L50 76 M62 36 L62 76 M74 36 L74 76" stroke={INK} strokeWidth="3" />
      <path d="M12 28 L12 90 M88 28 L88 90" {...N} strokeWidth={6} />
      <rect x="14" y="60" width="72" height="12" fill="#9FE3FF" {...T} />
      <circle cx="50" cy="22" r="8" fill="#FFD43B" {...T} />
      <path d="M50 30 L50 36" stroke={INK} strokeWidth="2" />
    </g>
  ),
  vest: (
    <g>
      <path d="M30 12 L42 12 Q46 30 50 46 Q54 30 58 12 L70 12 Q72 24 84 30 L84 88 L56 88 L50 50 L44 88 L16 88 L16 30 Q28 24 30 12 Z" fill="#6BCB77" {...S} />
      <circle cx="42" cy="60" r="3" fill="#FFD43B" {...T} /><circle cx="44" cy="74" r="3" fill="#FFD43B" {...T} />
      <path d="M22 70 L34 70" {...N} strokeWidth={3} />
    </g>
  ),
  plum: (
    <g>
      <path d="M50 22 Q54 12 60 8" {...N} />
      <circle cx="50" cy="56" r="32" fill="#8E3FA8" {...S} />
      <path d="M50 26 Q42 56 50 86" {...N} strokeWidth={3} strokeOpacity={0.5} />
      <path d="M58 16 Q72 8 78 16 Q68 24 58 16 Z" fill="#6BCB77" {...T} />
      {shine("M30 46 Q32 34 42 30")}
    </g>
  ),
  plug: (
    <g>
      <path d="M50 66 Q50 86 30 92" {...N} strokeWidth={6} />
      <rect x="30" y="34" width="40" height="34" rx="8" fill="#fff" {...S} />
      <path d="M40 34 L40 14 M60 34 L60 14" {...N} strokeWidth={6} stroke="#9AA8BE" />
      <path d="M40 34 L40 14 M60 34 L60 14" {...N} strokeWidth={2} />
      <path d="M40 50 L60 50" {...N} strokeWidth={3} />
    </g>
  ),
  slug: (
    <g>
      <path d="M10 76 Q20 60 46 62 Q62 62 70 50 Q74 34 84 36 Q92 40 90 54 Q86 80 50 82 Q20 84 10 76 Z" fill="#B5D86A" {...S} />
      <path d="M78 38 L74 22 M86 38 L88 22" {...N} strokeWidth={3} />
      <circle cx="74" cy="20" r="3.5" fill={INK} /><circle cx="88" cy="20" r="3.5" fill={INK} />
      {smile(80, 52, 5)}
      <path d="M24 72 Q40 68 56 72" {...N} strokeWidth={2.5} strokeOpacity={0.5} />
    </g>
  ),
  drum: (
    <g>
      <path d="M16 40 L16 76 Q50 92 84 76 L84 40" fill="#FF6B6B" {...S} />
      <ellipse cx="50" cy="40" rx="34" ry="12" fill="#FFF7E6" {...S} />
      <path d="M16 48 L30 76 L46 50 L62 80 L76 50 L84 66" {...N} strokeWidth={3} stroke="#FFD43B" />
      <path d="M30 6 L48 34 M76 8 L56 34" {...N} strokeWidth={5} />
      <circle cx="30" cy="6" r="5" fill="#C98E5A" {...T} /><circle cx="76" cy="8" r="5" fill="#C98E5A" {...T} />
    </g>
  ),
  twig: (
    <g>
      <path d="M14 86 Q40 60 86 18" {...N} strokeWidth={8} stroke={INK} />
      <path d="M14 86 Q40 60 86 18" {...N} strokeWidth={4} stroke="#9A6234" />
      <path d="M44 58 L38 34 M62 40 L74 46" {...N} strokeWidth={4} />
      <path d="M38 34 Q30 26 36 18 Q44 24 38 34 Z M74 46 Q86 46 88 38 Q78 34 74 46 Z" fill="#6BCB77" {...T} />
    </g>
  ),
  belt: (
    <g>
      <path d="M6 42 L94 42 L94 58 L6 58 Z" fill="#9A6234" {...S} />
      <rect x="36" y="34" width="26" height="32" rx="4" fill="#FFD43B" {...S} />
      <rect x="43" y="41" width="12" height="18" rx="2" fill="#9A6234" {...T} />
      <circle cx="74" cy="50" r="2.5" fill={INK} /><circle cx="84" cy="50" r="2.5" fill={INK} />
    </g>
  ),
  tent: (
    <g>
      <path d="M8 86 L50 16 L92 86 Z" fill="#FF9F43" {...S} />
      <path d="M50 16 L36 86 L64 86 Z" fill="#7A4A2A" {...T} />
      <path d="M50 16 L50 8" {...N} />
      <path d="M50 8 L64 12 L50 16" fill="#E04F5F" {...T} />
      <path d="M2 88 L98 88" {...N} />
    </g>
  ),
  // ---------------------------------------------------------------- final -e (L6)
  cape: (
    <g>
      <path d="M34 16 Q50 26 66 16 L74 22 Q86 60 92 88 Q50 96 8 88 Q14 60 26 22 Z" fill="#E04F5F" {...S} />
      <path d="M34 16 Q50 32 66 16" {...N} />
      <circle cx="50" cy="26" r="5" fill="#FFD43B" {...T} />
      <path d="M50 34 L44 88 M62 34 L70 88" {...N} strokeWidth={2.5} strokeOpacity={0.4} />
    </g>
  ),
  cube: (
    <g>
      <path d="M50 12 L86 30 L86 70 L50 88 L14 70 L14 30 Z" fill="#4D96FF" {...S} />
      <path d="M14 30 L50 48 L86 30 M50 48 L50 88" {...N} />
      <path d="M50 12 L86 30 L50 48 L14 30 Z" fill="#9FC7FF" {...S} />
      <path d="M50 48 L86 30 L86 70 L50 88 Z" fill="#3576D6" {...S} />
    </g>
  ),
  tube: (
    <g>
      <path d="M18 70 L70 18 L84 32 L32 84 Z" fill="#fff" {...S} />
      <path d="M70 18 L80 8 L94 22 L84 32 Z" fill="#E04F5F" {...S} />
      <path d="M18 70 L10 78 L22 90 L32 84" fill="#fff" {...T} />
      <path d="M34 62 L58 38 M42 70 L66 46" {...N} strokeWidth={3} stroke="#4D96FF" />
    </g>
  ),
  cane: (
    <g>
      <path d="M62 92 L62 32 Q62 12 46 12 Q30 12 30 30" {...N} strokeWidth={14} stroke={INK} />
      <path d="M62 92 L62 32 Q62 12 46 12 Q30 12 30 30" {...N} strokeWidth={8} stroke="#fff" />
      <path d="M58 88 L66 80 M58 74 L66 66 M58 60 L66 52 M58 46 L66 38 M58 30 L64 22 M50 14 L48 22 M38 14 L42 22 M30 24 L38 26" {...N} strokeWidth={4} stroke="#E04F5F" />
    </g>
  ),
  cone: (
    <g>
      <path d="M50 10 L78 82 L22 82 Z" fill="#FF9F43" {...S} />
      <path d="M38 42 L62 42 L66 54 L34 54 Z" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="12" y="80" width="76" height="10" rx="3" fill="#FF9F43" {...S} />
    </g>
  ),
  bone: (
    <g>
      <path d="M28 40 L72 60" {...N} strokeWidth={22} stroke={INK} />
      <path d="M28 40 L72 60" {...N} strokeWidth={14} stroke="#FFF7E6" />
      <circle cx="18" cy="34" r="10" fill="#FFF7E6" {...S} /><circle cx="26" cy="22" r="10" fill="#FFF7E6" {...S} />
      <circle cx="82" cy="66" r="10" fill="#FFF7E6" {...S} /><circle cx="74" cy="78" r="10" fill="#FFF7E6" {...S} />
      <path d="M28 40 L72 60" {...N} strokeWidth={14} stroke="#FFF7E6" strokeLinecap="butt" />
    </g>
  ),
  bike: (
    <g>
      <circle cx="24" cy="66" r="18" fill="none" {...S} /><circle cx="76" cy="66" r="18" fill="none" {...S} />
      <path d="M24 66 L42 40 L66 40 L76 66 M42 40 L52 66 L66 40 M52 66 L24 66" {...N} stroke="#E04F5F" strokeWidth={5} />
      <path d="M36 32 L48 32 M64 40 L60 26 L70 24" {...N} />
      <circle cx="52" cy="66" r="4" fill={INK} />
    </g>
  ),
  rope: (
    <g>
      <path d="M50 10 Q86 12 84 40 Q82 64 50 62 Q20 60 20 80 Q20 94 44 92" {...N} strokeWidth={12} stroke={INK} />
      <path d="M50 10 Q86 12 84 40 Q82 64 50 62 Q20 60 20 80 Q20 94 44 92" {...N} strokeWidth={6} stroke="#E8C792" />
      <path d="M58 12 L62 18 M74 18 L76 24 M82 32 L78 36 M80 48 L74 50 M66 58 L62 62 M40 62 L38 68 M26 70 L22 74 M24 86 L28 90" {...N} strokeWidth={2} stroke="#B08A50" />
    </g>
  ),
  rose: (
    <g>
      <path d="M50 54 L50 94" {...N} strokeWidth={5} stroke="#3E9B4F" />
      <path d="M50 76 Q34 66 28 74 Q38 84 50 78 Z" fill="#6BCB77" {...T} />
      <path d="M50 14 Q74 14 74 36 Q74 56 50 58 Q26 56 26 36 Q26 14 50 14 Z" fill="#E04F5F" {...S} />
      <path d="M50 24 Q64 28 60 40 Q50 48 42 38 Q40 30 50 30" {...N} strokeWidth={3} />
    </g>
  ),
  nose: (
    <g>
      <path d="M50 14 Q46 46 32 62 Q24 74 36 80 Q44 84 50 78 Q56 84 64 80 Q76 74 68 62 Q54 46 50 14 Z" fill="#F2C59E" {...S} />
      <ellipse cx="40" cy="72" rx="4" ry="3" fill={INK} /><ellipse cx="60" cy="72" rx="4" ry="3" fill={INK} />
      {shine("M50 24 Q48 42 42 54")}
    </g>
  ),
  plate: (
    <g>
      <ellipse cx="50" cy="56" rx="42" ry="22" fill="#fff" {...S} />
      <ellipse cx="50" cy="54" rx="28" ry="13" fill="#F4F0FF" {...T} />
      <path d="M12 56 Q50 84 88 56" {...N} strokeWidth={3} stroke="#4D96FF" />
    </g>
  ),
  plane: (
    <g>
      <path d="M8 52 Q10 44 26 44 L80 44 Q94 46 94 52 Q94 58 80 60 L26 60 Q10 60 8 52 Z" fill="#fff" {...S} />
      <path d="M44 46 L60 14 L70 14 L64 46 Z M44 58 L60 90 L70 90 L64 58 Z" fill="#FF6B6B" {...S} />
      <path d="M14 46 L8 28 L18 28 L28 44 Z" fill="#FF6B6B" {...T} />
      <circle cx="80" cy="52" r="3" fill="#BDE7FF" stroke={INK} strokeWidth="2" />
      <circle cx="34" cy="52" r="2.5" fill="#BDE7FF" stroke={INK} strokeWidth="2" /><circle cx="70" cy="52" r="2.5" fill="#BDE7FF" stroke={INK} strokeWidth="2" />
    </g>
  ),
  // ---------------------------------------------------------------- vowel teams (L7)
  sheep: (
    <g>
      <path d="M28 76 L28 90 M42 78 L42 92 M60 78 L60 92 M74 76 L74 90" {...N} strokeWidth={5} />
      <path d="M22 60 Q12 54 18 42 Q16 28 32 28 Q38 18 52 22 Q64 16 72 26 Q88 26 86 42 Q94 54 82 62 Q82 76 66 76 Q52 84 38 78 Q22 78 22 60 Z" fill="#fff" {...S} />
      <ellipse cx="22" cy="50" rx="12" ry="14" fill="#5A5070" {...S} />
      {eye(18, 48, 2.6)}
    </g>
  ),
  loaf: (
    <g>
      <path d="M14 76 L14 50 Q14 26 50 26 Q86 26 86 50 L86 76 Z" fill="#E2A65A" {...S} />
      <path d="M30 40 L38 52 M48 36 L56 48 M66 40 L72 50" {...N} strokeWidth={3} stroke="#B07A3A" />
      <rect x="10" y="74" width="80" height="10" rx="3" fill="#C98E5A" {...S} />
      {shine("M22 52 Q22 38 34 34")}
    </g>
  ),
  sail: (
    <g>
      <path d="M44 6 L44 88" {...N} strokeWidth={5} />
      <path d="M48 10 Q86 40 84 80 L48 80 Z" fill="#FFFDF6" {...S} />
      <path d="M48 30 Q70 44 74 60 M48 50 Q64 58 68 72" {...N} strokeWidth={2.5} strokeOpacity={0.4} />
      <path d="M40 16 L16 74 L40 74 Z" fill="#FFD43B" {...S} />
    </g>
  ),
  rain: (
    <g>
      <path d="M22 46 Q10 46 12 34 Q14 24 26 26 Q30 12 46 14 Q58 6 68 18 Q84 16 86 32 Q92 46 76 46 Z" fill="#C9CEDB" {...S} />
      <path d="M28 58 L24 68 M46 56 L42 66 M64 58 L60 68 M36 76 L32 86 M56 76 L52 86 M74 74 L70 84" {...N} stroke="#4D96FF" strokeWidth={5} />
    </g>
  ),
  train: (
    <g>
      <rect x="52" y="24" width="38" height="50" rx="4" fill="#E04F5F" {...S} />
      <rect x="60" y="32" width="22" height="16" rx="3" fill="#BDE7FF" {...T} />
      <rect x="10" y="44" width="46" height="30" rx="4" fill="#4D96FF" {...S} />
      <rect x="18" y="26" width="12" height="18" fill="#5A5070" {...S} />
      <circle cx="24" cy="16" r="6" fill="#C9CEDB" {...T} /><circle cx="34" cy="8" r="4" fill="#C9CEDB" {...T} />
      <circle cx="24" cy="80" r="9" fill="#5A5070" {...S} /><circle cx="48" cy="80" r="9" fill="#5A5070" {...S} /><circle cx="76" cy="80" r="9" fill="#5A5070" {...S} />
    </g>
  ),
  tray: (
    <g>
      <path d="M6 58 L94 58 L84 74 L16 74 Z" fill="#C98E5A" {...S} />
      <path d="M4 58 L14 50 M96 58 L86 50" {...N} strokeWidth={5} />
      <rect x="22" y="36" width="20" height="22" rx="3" fill="#fff" {...T} />
      <path d="M58 58 Q58 38 70 38 Q82 38 82 58 Z" fill="#FF9F43" {...T} />
    </g>
  ),
  hay: (
    <g>
      <path d="M10 86 Q10 40 50 34 Q90 40 90 86 Z" fill="#F5D36B" {...S} />
      <path d="M22 52 L30 70 M38 42 L42 62 M56 40 L54 60 M70 46 L66 66 M30 76 L38 84 M60 74 L56 84 M80 64 L76 80" {...N} strokeWidth={3} stroke="#C9A23A" />
      <path d="M44 34 L40 20 M52 34 L56 18 M60 36 L68 24" {...N} strokeWidth={3} stroke="#C9A23A" />
    </g>
  ),
  feet: (
    <g>
      <path d="M18 88 Q12 60 22 44 Q32 34 40 46 Q46 64 40 88 Z" fill="#F2C59E" {...S} />
      <path d="M60 88 Q54 64 60 46 Q68 34 78 44 Q88 60 82 88 Z" fill="#F2C59E" {...S} />
      <circle cx="22" cy="34" r="4" fill="#F2C59E" {...T} /><circle cx="31" cy="30" r="3.5" fill="#F2C59E" {...T} /><circle cx="38" cy="34" r="3" fill="#F2C59E" {...T} />
      <circle cx="62" cy="34" r="3" fill="#F2C59E" {...T} /><circle cx="69" cy="30" r="3.5" fill="#F2C59E" {...T} /><circle cx="78" cy="34" r="4" fill="#F2C59E" {...T} />
    </g>
  ),
  seed: (
    <g>
      <path d="M50 18 Q74 34 70 62 Q66 88 50 88 Q34 88 30 62 Q26 34 50 18 Z" fill="#C98E5A" {...S} />
      <path d="M50 30 Q42 56 50 80" {...N} strokeWidth={3} strokeOpacity={0.5} />
      <path d="M50 18 Q52 8 60 6 Q64 14 52 18" fill="#6BCB77" {...T} />
    </g>
  ),
  peach: (
    <g>
      <path d="M50 26 Q22 18 16 46 Q12 76 40 86 Q50 90 60 86 Q88 76 84 46 Q78 18 50 26 Z" fill="#FFB27A" {...S} />
      <path d="M50 26 Q40 56 50 86" {...N} strokeWidth={3} stroke="#E0806A" />
      <path d="M52 24 Q66 8 78 14 Q70 28 52 24 Z" fill="#6BCB77" {...T} />
      {shine("M26 48 Q28 36 38 32")}
    </g>
  ),
  beach: (
    <g>
      <path d="M4 44 L96 44 L96 64 L4 64 Z" fill="#4D96FF" stroke="none" />
      <path d="M4 60 Q30 52 54 60 T96 58 L96 94 L4 94 Z" fill="#F5D99A" {...S} />
      <path d="M68 70 L60 22" {...N} strokeWidth={4} />
      <path d="M40 30 Q60 6 84 18 Z" fill="#FF6B6B" {...S} />
      <circle cx="22" cy="20" r="10" fill="#FFE066" {...T} />
      <path d="M20 78 Q26 72 32 78 Q26 84 20 78 Z" fill="#FF8FB1" stroke={INK} strokeWidth="2" />
    </g>
  ),
  toad: (
    <g>
      <path d="M14 78 Q8 50 30 40 Q50 32 70 40 Q92 50 86 78 Q50 90 14 78 Z" fill="#8FAE4A" {...S} />
      <circle cx="34" cy="40" r="10" fill="#8FAE4A" {...S} /><circle cx="66" cy="40" r="10" fill="#8FAE4A" {...S} />
      {eye(34, 40, 4)}{eye(66, 40, 4)}
      <path d="M32 62 Q50 72 68 62" {...N} strokeWidth={3} />
      <circle cx="24" cy="66" r="3" fill="#6E8A34" /><circle cx="78" cy="64" r="3.5" fill="#6E8A34" /><circle cx="50" cy="52" r="2.5" fill="#6E8A34" />
    </g>
  ),
  road: (
    <g>
      <path d="M4 26 L96 26 L96 96 L4 96 Z" fill="#7FD27A" stroke="none" />
      <path d="M40 26 L60 26 L94 96 L6 96 Z" fill="#5A5070" {...S} />
      <path d="M50 32 L50 42 M50 52 L50 66 M50 76 L50 92" {...N} stroke="#FFD43B" strokeWidth={5} />
    </g>
  ),
  soap: (
    <g>
      <rect x="18" y="42" width="64" height="38" rx="14" fill="#FF8FB1" {...S} />
      <path d="M28 52 Q28 46 36 46" {...N} stroke="#fff" strokeWidth={3} />
      <circle cx="34" cy="28" r="8" fill="#E6F2FF" {...T} /><circle cx="52" cy="20" r="6" fill="#E6F2FF" {...T} /><circle cx="66" cy="32" r="5" fill="#E6F2FF" {...T} />
    </g>
  ),
  // ---------------------------------------------------------------- two-syllable words (L8)
  napkin: (
    <g>
      <path d="M16 30 L84 30 L84 84 L16 84 Z" fill="#9FE3FF" {...S} />
      <path d="M16 30 L84 84 M84 30 L16 84" stroke="#fff" strokeWidth="3" />
      <path d="M16 30 L50 56 L84 30" fill="#C7EFFF" {...T} />
      <path d="M22 78 L30 70 M70 78 L78 70" {...N} strokeWidth={2.5} stroke="#4D96FF" />
    </g>
  ),
  pumpkin: (
    <g>
      <path d="M50 26 Q52 14 60 10" {...N} strokeWidth={5} stroke="#3E9B4F" />
      <ellipse cx="32" cy="58" rx="20" ry="28" fill="#FF8C2E" {...S} />
      <ellipse cx="68" cy="58" rx="20" ry="28" fill="#FF8C2E" {...S} />
      <ellipse cx="50" cy="58" rx="18" ry="30" fill="#FF9F43" {...S} />
      {shine("M42 44 Q42 36 48 32")}
    </g>
  ),
  picnic: (
    <g>
      <path d="M4 66 L96 66 L82 92 L18 92 Z" fill="#FF6B6B" {...S} />
      <path d="M26 66 L20 92 M50 66 L50 92 M74 66 L80 92 M10 78 L90 78" stroke="#fff" strokeWidth="3" />
      <path d="M30 60 L30 36 L60 36 L60 60 Z" fill="#E2A65A" {...S} />
      <path d="M30 36 Q45 18 60 36" {...N} />
      <circle cx="74" cy="56" r="8" fill="#FF5A4E" {...T} />
    </g>
  ),
  puppet: (
    <g>
      <path d="M30 6 L70 6 M40 6 L40 30 M60 6 L60 30 M50 6 L50 22" {...N} strokeWidth={2.5} />
      <circle cx="50" cy="32" r="14" fill="#F2C59E" {...S} />
      {eye(45, 31, 2.5)}{eye(55, 31, 2.5)}
      <path d="M36 22 L50 10 L64 22 Z" fill="#E04F5F" {...T} />
      <path d="M34 48 L66 48 L72 84 L28 84 Z" fill="#8E6CEF" {...S} />
      <path d="M34 50 L22 66 M66 50 L78 66" {...N} strokeWidth={5} />
    </g>
  ),
  kitten: (
    <g>
      <path d="M28 40 L28 18 L42 30 Z M72 40 L72 18 L58 30 Z" fill="#C9C5D6" {...S} />
      <circle cx="50" cy="50" r="26" fill="#C9C5D6" {...S} />
      {eye(41, 48, 4)}{eye(59, 48, 4)}
      <path d="M47 56 L53 56 L50 60 Z" fill="#FF7FA0" />
      <path d="M44 63 Q50 67 56 63" {...N} strokeWidth={2.5} />
      <path d="M36 74 Q32 90 40 92 L60 92 Q68 90 64 74" fill="#C9C5D6" {...T} />
    </g>
  ),
  mitten: (
    <g>
      <path d="M28 82 L26 40 Q26 14 50 14 Q74 14 74 40 L74 52 Q86 42 92 52 Q92 62 74 72 L72 82 Z" fill="#FF6B6B" {...S} />
      <rect x="24" y="78" width="52" height="14" rx="4" fill="#fff" {...S} />
      <path d="M38 36 L46 44 L54 36 L62 44" {...N} strokeWidth={3} stroke="#fff" />
    </g>
  ),
  muffin: (
    <g>
      <path d="M22 54 L30 88 L70 88 L78 54 Z" fill="#9FE3FF" {...S} />
      <path d="M36 56 L40 88 M50 56 L50 88 M64 56 L60 88" stroke={INK} strokeWidth="2.5" strokeOpacity="0.4" />
      <path d="M14 56 Q12 28 50 24 Q88 28 86 56 Z" fill="#B07A4C" {...S} />
      <circle cx="36" cy="42" r="3" fill="#5A3A20" /><circle cx="56" cy="36" r="3" fill="#5A3A20" /><circle cx="66" cy="48" r="3" fill="#5A3A20" /><circle cx="46" cy="50" r="2.5" fill="#5A3A20" />
    </g>
  ),
  magnet: (
    <g>
      <path d="M22 20 L22 54 Q22 84 50 84 Q78 84 78 54 L78 20 L58 20 L58 54 Q58 64 50 64 Q42 64 42 54 L42 20 Z" fill="#E04F5F" {...S} />
      <rect x="22" y="14" width="20" height="14" fill="#C9CEDB" {...S} /><rect x="58" y="14" width="20" height="14" fill="#C9CEDB" {...S} />
      <path d="M10 10 L4 4 M90 10 L96 4 M12 22 L4 22 M88 22 L96 22" {...N} strokeWidth={3} />
    </g>
  ),
  basket: (
    <g>
      <path d="M26 46 Q26 14 50 14 Q74 14 74 46" {...N} strokeWidth={6} />
      <path d="M12 46 L88 46 L78 88 L22 88 Z" fill="#D9A441" {...S} />
      <path d="M16 60 L84 60 M20 74 L80 74 M32 46 L36 88 M50 46 L50 88 M68 46 L64 88" stroke={INK} strokeWidth="2.5" strokeOpacity="0.5" />
    </g>
  ),
  rabbit: (
    <g>
      <path d="M38 40 Q28 10 36 6 Q46 8 46 38 Z M62 40 Q72 10 64 6 Q54 8 54 38 Z" fill="#fff" {...S} />
      <path d="M38 34 Q34 18 37 12 M62 34 Q66 18 63 12" {...N} strokeWidth={3} stroke="#FFB8C8" />
      <circle cx="50" cy="56" r="22" fill="#fff" {...S} />
      {eye(42, 52)}{eye(58, 52)}
      <path d="M47 60 L53 60 L50 64 Z" fill="#FF7FA0" />
      <path d="M50 64 L50 68 M44 70 Q50 74 56 70" {...N} strokeWidth={2.5} />
      <path d="M36 76 Q34 92 50 92 Q66 92 64 76" fill="#fff" {...T} />
    </g>
  ),
  cactus: (
    <g>
      <path d="M40 88 L40 24 Q40 12 50 12 Q60 12 60 24 L60 88 Z" fill="#6BCB77" {...S} />
      <path d="M40 58 L28 58 Q20 58 20 48 L20 34 Q20 28 26 28 Q32 28 32 34 L32 46 L40 46" fill="#6BCB77" {...S} />
      <path d="M60 50 L72 50 Q80 50 80 40 L80 30 Q80 24 74 24 Q68 24 68 30 L68 40 L60 40" fill="#6BCB77" {...S} />
      <path d="M26 80 L74 80 L70 94 L30 94 Z" fill="#E2774A" {...S} />
      <path d="M50 26 L50 74" stroke={INK} strokeWidth="2" strokeOpacity="0.4" />
    </g>
  ),
  // ---------------------------------------------------------------- compounds (L8)
  cupcake: (
    <g>
      <path d="M24 56 L32 90 L68 90 L76 56 Z" fill="#9FE3FF" {...S} />
      <path d="M38 58 L42 90 M50 58 L50 90 M62 58 L58 90" stroke={INK} strokeWidth="2.5" strokeOpacity="0.4" />
      <path d="M18 58 Q14 42 30 40 Q30 24 50 24 Q70 24 70 40 Q86 42 82 58 Z" fill="#FF8FB1" {...S} />
      <circle cx="50" cy="18" r="7" fill="#FF5A4E" {...T} />
      <path d="M34 44 L36 48 M50 34 L52 38 M64 46 L66 50" {...N} strokeWidth={3} stroke="#FFD43B" />
    </g>
  ),
  pancake: (
    <g>
      <ellipse cx="50" cy="80" rx="44" ry="10" fill="#fff" {...S} />
      <ellipse cx="50" cy="70" rx="36" ry="9" fill="#E2A65A" {...S} />
      <ellipse cx="50" cy="58" rx="36" ry="9" fill="#E2A65A" {...S} />
      <ellipse cx="50" cy="46" rx="36" ry="9" fill="#E2A65A" {...S} />
      <path d="M30 42 Q50 50 70 42 Q72 54 62 56 Q58 64 56 56 Q44 58 40 52 Q32 52 30 42 Z" fill="#B0622A" {...T} />
      <rect x="44" y="30" width="12" height="10" rx="2" fill="#FFE066" {...T} />
    </g>
  ),
  backpack: (
    <g>
      <path d="M38 22 Q38 10 50 10 Q62 10 62 22" {...N} strokeWidth={5} />
      <path d="M22 36 Q22 20 50 20 Q78 20 78 36 L78 86 Q78 92 72 92 L28 92 Q22 92 22 86 Z" fill="#4D96FF" {...S} />
      <rect x="32" y="54" width="36" height="26" rx="6" fill="#3576D6" {...S} />
      <path d="M32 64 L68 64" stroke={INK} strokeWidth="2.5" />
      <path d="M22 44 L78 44" stroke={INK} strokeWidth="2.5" />
    </g>
  ),
  sandbox: (
    <g>
      <path d="M8 56 L28 40 L92 40 L72 56 Z" fill="#F5D99A" {...S} />
      <path d="M8 56 L72 56 L72 78 L8 78 Z" fill="#C98E5A" {...S} />
      <path d="M72 56 L92 40 L92 62 L72 78 Z" fill="#B07A4C" {...S} />
      <path d="M40 46 Q50 36 60 46 Z" fill="#E8C792" {...T} />
      <path d="M58 24 L66 44" {...N} strokeWidth={4} /><path d="M54 18 L64 18 L62 28 L56 28 Z" fill="#FF6B6B" {...T} />
    </g>
  ),
  raincoat: (
    <g>
      {scaled(RL.coat!, 0.82, 9, 16)}
      <path d="M14 8 L10 18 M30 4 L26 14 M70 4 L66 14 M88 8 L84 18" {...N} stroke="#4D96FF" strokeWidth={4} />
    </g>
  ),
  sailboat: RL.boat!,
  mailbox: (
    <g>
      <path d="M46 56 L46 94" {...N} strokeWidth={8} />
      <path d="M18 56 L18 34 Q18 18 36 18 L70 18 Q86 18 86 34 L86 56 Z" fill="#4D96FF" {...S} />
      <path d="M36 18 Q52 18 52 34 L52 56" {...N} strokeWidth={3} />
      <rect x="26" y="28" width="18" height="12" rx="2" fill="#fff" {...T} />
      <path d="M72 30 L72 10 L86 14 L72 18" fill="#E04F5F" {...T} />
    </g>
  ),
  bathtub: (
    <g>
      {PICTURES_A.tub}
      <circle cx="30" cy="30" r="5" fill="#E6F2FF" {...T} /><circle cx="44" cy="22" r="4" fill="#E6F2FF" {...T} />
    </g>
  ),
  catfish: fish("#8C9AAE", true),
};
