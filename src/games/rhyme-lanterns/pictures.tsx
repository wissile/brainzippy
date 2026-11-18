import { INK } from "../../characters/palette";

/**
 * Hoot's Rhyme Lanterns — original picture art for every word in the bank (words.ts).
 * One 100×100 drawing per word: chunky ink outline, flat fills, one highlight — the Critter Crew style.
 * Each picture is a single clear object so a pre-reader can name it (and it is always spoken on tap/focus).
 */
const S = { stroke: INK, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const T = { ...S, strokeWidth: 3 } as const;
const N = { fill: "none", ...S } as const;
const eye = (x: number, y: number, r = 3.2) => <circle cx={x} cy={y} r={r} fill={INK} />;
const shine = (d: string) => <path d={d} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3.5" strokeLinecap="round" />;

export const PICTURES: Record<string, React.JSX.Element> = {
  cat: (
    <g>
      <path d="M74 84 Q92 80 88 60" {...N} strokeWidth={5} />
      <ellipse cx="52" cy="80" rx="24" ry="13" fill="#F5A04A" {...S} />
      <path d="M30 40 L30 16 L46 30 Z M74 40 L74 16 L58 30 Z" fill="#F5A04A" {...S} />
      <circle cx="52" cy="46" r="23" fill="#F5A04A" {...S} />
      <path d="M33 22 L34 32 L40 28 Z M71 22 L70 32 L64 28 Z" fill="#FFB8C8" />
      {eye(44, 44)}{eye(60, 44)}
      <path d="M49 51 L55 51 L52 55 Z" fill="#FF7FA0" {...T} />
      <path d="M46 59 Q52 63 58 59" {...N} strokeWidth={3} />
      <path d="M34 52 L20 49 M34 56 L21 58 M70 52 L84 49 M70 56 L83 58" {...N} strokeWidth={2.5} />
    </g>
  ),
  hat: (
    <g>
      <ellipse cx="50" cy="70" rx="42" ry="13" fill="#6C5CE7" {...S} />
      <path d="M28 68 Q26 34 50 30 Q74 34 72 68 Q50 76 28 68 Z" fill="#8E7CF7" {...S} />
      <path d="M28 60 Q50 68 72 60 L72 66 Q50 74 28 66 Z" fill="#FFD43B" {...T} />
      <circle cx="64" cy="58" r="5" fill="#FF8FB1" {...T} />
      {shine("M36 52 Q36 40 46 36")}
    </g>
  ),
  bat: (
    <g>
      <path d="M50 40 Q30 26 6 34 Q14 42 12 52 Q22 48 28 56 Q34 50 42 56 Z" fill="#6B4FA8" {...S} />
      <path d="M50 40 Q70 26 94 34 Q86 42 88 52 Q78 48 72 56 Q66 50 58 56 Z" fill="#6B4FA8" {...S} />
      <path d="M40 34 L38 20 L46 28 Z M60 34 L62 20 L54 28 Z" fill="#8C6FD0" {...S} />
      <ellipse cx="50" cy="48" rx="13" ry="16" fill="#8C6FD0" {...S} />
      {eye(45, 44, 2.8)}{eye(55, 44, 2.8)}
      <path d="M45 53 Q50 57 55 53" {...N} strokeWidth={2.5} />
      <path d="M47 55 L48 58 M53 55 L52 58" stroke="#fff" strokeWidth="2" />
    </g>
  ),
  rat: (
    <g>
      <path d="M22 70 Q6 72 8 88 Q12 78 24 76" {...N} strokeWidth={4} />
      <path d="M20 72 Q22 48 48 46 Q70 46 84 66 Q72 76 50 78 Q30 80 20 72 Z" fill="#A7A3B5" {...S} />
      <circle cx="60" cy="44" r="10" fill="#C9C5D6" {...S} />
      <circle cx="60" cy="44" r="5" fill="#FFB8C8" />
      {eye(72, 58)}
      <circle cx="86" cy="66" r="4" fill="#FF7FA0" {...T} />
      <path d="M84 70 L94 74 M84 66 L95 64" {...N} strokeWidth={2} />
      <path d="M38 78 L36 84 M58 78 L60 84" {...N} strokeWidth={3} />
    </g>
  ),
  fan: (
    <g>
      <path d="M50 58 L50 84" {...N} strokeWidth={6} />
      <ellipse cx="50" cy="88" rx="22" ry="6" fill="#4D96FF" {...S} />
      <circle cx="50" cy="38" r="30" fill="#E6F2FF" {...S} />
      <path d="M50 38 Q40 14 54 12 Q62 24 50 38 Z M50 38 Q74 30 76 44 Q62 50 50 38 Z M50 38 Q40 60 28 52 Q32 40 50 38 Z" fill="#4D96FF" {...T} />
      <circle cx="50" cy="38" r="5" fill="#FFD43B" {...T} />
      <path d="M50 8 L50 68 M20 38 L80 38" stroke={INK} strokeOpacity="0.25" strokeWidth="2" />
    </g>
  ),
  pan: (
    <g>
      <path d="M62 56 L94 40" {...N} strokeWidth={9} />
      <path d="M62 56 L94 40" stroke="#9A6234" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="38" cy="60" rx="32" ry="20" fill="#5A5070" {...S} />
      <ellipse cx="38" cy="58" rx="24" ry="13" fill="#3A3150" />
      <ellipse cx="34" cy="57" rx="9" ry="6" fill="#FFF3A6" stroke={INK} strokeWidth="2.5" />
      <circle cx="35" cy="57" r="3.5" fill="#FFB52E" />
    </g>
  ),
  van: (
    <g>
      <path d="M8 74 L8 40 Q8 30 18 30 L64 30 Q74 30 80 42 L90 56 Q94 60 94 66 L94 74 Z" fill="#2EC4B6" {...S} />
      <path d="M64 36 L74 36 L84 54 L64 54 Z" fill="#CFF7F2" {...T} />
      <rect x="16" y="38" width="18" height="14" rx="3" fill="#CFF7F2" {...T} />
      <rect x="40" y="38" width="18" height="14" rx="3" fill="#CFF7F2" {...T} />
      <path d="M8 62 L94 62" stroke="#fff" strokeWidth="4" />
      <circle cx="28" cy="76" r="10" fill={INK} /><circle cx="28" cy="76" r="4" fill="#ccc" />
      <circle cx="74" cy="76" r="10" fill={INK} /><circle cx="74" cy="76" r="4" fill="#ccc" />
    </g>
  ),
  can: (
    <g>
      <path d="M26 22 L26 80 Q50 90 74 80 L74 22" fill="#C9CED8" {...S} />
      <ellipse cx="50" cy="22" rx="24" ry="8" fill="#E3E7EE" {...S} />
      <path d="M26 36 Q50 44 74 36 L74 66 Q50 74 26 66 Z" fill="#FF6B5A" {...T} />
      <circle cx="50" cy="52" r="8" fill="#FFD43B" {...T} />
      {shine("M32 40 L32 62")}
    </g>
  ),
  dog: (
    <g>
      <path d="M24 30 Q8 34 12 62 Q20 64 28 52 Z M76 30 Q92 34 88 62 Q80 64 72 52 Z" fill="#8A5A3B" {...S} />
      <ellipse cx="50" cy="48" rx="27" ry="26" fill="#D9A066" {...S} />
      <ellipse cx="50" cy="62" rx="15" ry="11" fill="#F4D7B0" {...T} />
      <ellipse cx="50" cy="56" rx="6" ry="4.5" fill={INK} />
      {eye(40, 42)}{eye(60, 42)}
      <path d="M44 66 Q50 70 56 66" {...N} strokeWidth={3} />
      <path d="M48 69 Q50 80 54 69" fill="#FF7FA0" {...T} />
      <circle cx="64" cy="34" r="6" fill="#8A5A3B" opacity="0.7" />
    </g>
  ),
  log: (
    <g>
      <path d="M16 38 L78 30 Q92 44 80 64 L18 72 Z" fill="#9A6234" {...S} />
      <path d="M26 50 L60 46 M30 60 L66 56" stroke="#6E4224" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="18" cy="55" rx="12" ry="17" fill="#E8C08A" {...S} transform="rotate(-8 18 55)" />
      <ellipse cx="18" cy="55" rx="6" ry="9" fill="none" stroke="#B5814A" strokeWidth="2.5" transform="rotate(-8 18 55)" />
      <path d="M64 30 Q66 20 74 18" {...N} strokeWidth={3} />
      <ellipse cx="76" cy="18" rx="6" ry="3.5" fill="#6BCB77" {...T} />
    </g>
  ),
  frog: (
    <g>
      <path d="M20 84 Q10 84 14 74 L28 70 Z M80 84 Q90 84 86 74 L72 70 Z" fill="#3FA552" {...S} />
      <ellipse cx="50" cy="62" rx="34" ry="24" fill="#6BCB77" {...S} />
      <circle cx="32" cy="36" r="12" fill="#6BCB77" {...S} /><circle cx="68" cy="36" r="12" fill="#6BCB77" {...S} />
      <circle cx="32" cy="36" r="6" fill="#fff" /><circle cx="68" cy="36" r="6" fill="#fff" />
      {eye(33, 37)}{eye(67, 37)}
      <path d="M30 62 Q50 76 70 62" {...N} strokeWidth={3.5} />
      <ellipse cx="50" cy="74" rx="16" ry="7" fill="#DDF6C8" />
      <circle cx="26" cy="58" r="3" fill="#FF8FB1" opacity="0.7" /><circle cx="74" cy="58" r="3" fill="#FF8FB1" opacity="0.7" />
    </g>
  ),
  clock: (
    <g>
      <path d="M30 84 L24 92 M70 84 L76 92" {...N} strokeWidth={5} />
      <circle cx="26" cy="22" r="10" fill="#FFD43B" {...S} /><circle cx="74" cy="22" r="10" fill="#FFD43B" {...S} />
      <circle cx="50" cy="56" r="34" fill="#FF6B5A" {...S} />
      <circle cx="50" cy="56" r="25" fill="#FFFDF6" {...T} />
      <path d="M50 56 L50 38 M50 56 L62 62" {...N} strokeWidth={4} />
      <circle cx="50" cy="56" r="3" fill={INK} />
      <path d="M50 33 L50 36 M73 56 L70 56 M50 79 L50 76 M27 56 L30 56" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  sock: (
    <g>
      <path d="M36 10 L66 10 L66 56 Q66 62 72 66 L82 74 Q90 82 80 90 Q72 96 62 88 L40 70 Q34 64 36 54 Z" fill="#FF8FB1" {...S} />
      <path d="M36 10 L66 10 L66 22 L36 22 Z" fill="#fff" {...T} />
      <path d="M36 34 L66 34 M36 46 L66 46" stroke="#8E6CEF" strokeWidth="5" />
      <path d="M70 84 Q74 76 84 78" fill="#8E6CEF" {...T} />
    </g>
  ),
  rock: (
    <g>
      <path d="M12 80 Q8 56 24 42 Q34 26 54 28 Q74 26 84 44 Q94 60 88 80 Z" fill="#A4A9B6" {...S} />
      <path d="M30 50 Q38 40 50 40" {...N} stroke="#fff" strokeOpacity="0.6" strokeWidth={4} />
      <path d="M58 56 L66 64 M40 66 L46 70" stroke="#7C8190" strokeWidth="3" strokeLinecap="round" />
      <path d="M6 82 L94 82" {...N} />
    </g>
  ),
  lock: (
    <g>
      <path d="M32 46 L32 32 Q32 14 50 14 Q68 14 68 32 L68 46" {...N} strokeWidth={9} />
      <path d="M32 46 L32 32 Q32 14 50 14 Q68 14 68 32 L68 46" fill="none" stroke="#C9CED8" strokeWidth="4" strokeLinecap="round" />
      <rect x="20" y="44" width="60" height="44" rx="10" fill="#FFC21A" {...S} />
      <circle cx="50" cy="62" r="6" fill={INK} />
      <path d="M50 64 L50 76" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      {shine("M28 54 L28 78")}
    </g>
  ),
  box: (
    <g>
      <path d="M14 38 L50 26 L86 38 L86 78 L50 92 L14 78 Z" fill="#D9A066" {...S} />
      <path d="M14 38 L50 50 L86 38 M50 50 L50 92" {...N} />
      <path d="M14 38 L4 24 L40 12 L50 26 Z M86 38 L96 24 L60 12 L50 26 Z" fill="#E8C08A" {...S} />
      <path d="M30 60 L30 74" stroke="#B5814A" strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  fox: (
    <g>
      <path d="M22 44 L18 12 L42 30 Z M78 44 L82 12 L58 30 Z" fill="#FF8A3D" {...S} />
      <path d="M24 22 L26 34 L34 30 Z M76 22 L74 34 L66 30 Z" fill={INK} opacity="0.8" />
      <path d="M14 46 Q20 26 50 26 Q80 26 86 46 Q80 64 50 86 Q20 64 14 46 Z" fill="#FF8A3D" {...S} />
      <path d="M18 50 Q34 52 44 66 L50 86 L56 66 Q66 52 82 50 Q72 70 50 86 Q28 70 18 50 Z" fill="#fff" />
      <path d="M14 46 Q20 26 50 26 Q80 26 86 46 Q80 64 50 86 Q20 64 14 46 Z" fill="none" {...S} />
      {eye(38, 48)}{eye(62, 48)}
      <ellipse cx="50" cy="78" rx="5" ry="4" fill={INK} />
    </g>
  ),
  bug: (
    <g>
      <path d="M38 22 Q32 10 24 10 M62 22 Q68 10 76 10" {...N} strokeWidth={3} />
      <path d="M20 54 L8 50 M20 66 L8 70 M80 54 L92 50 M80 66 L92 70" {...N} strokeWidth={3.5} />
      <circle cx="50" cy="30" r="13" fill={INK} />
      <ellipse cx="50" cy="60" rx="32" ry="30" fill="#FF5A4E" {...S} />
      <path d="M50 30 L50 90" stroke={INK} strokeWidth="4" />
      <circle cx="36" cy="52" r="6" fill={INK} /><circle cx="64" cy="52" r="6" fill={INK} /><circle cx="34" cy="72" r="5" fill={INK} /><circle cx="66" cy="72" r="5" fill={INK} />
      <circle cx="45" cy="28" r="2.5" fill="#fff" /><circle cx="55" cy="28" r="2.5" fill="#fff" />
    </g>
  ),
  rug: (
    <g>
      <path d="M18 34 L82 34 L94 76 L6 76 Z" fill="#8E6CEF" {...S} />
      <path d="M26 42 L74 42 L82 68 L18 68 Z" fill="#FFD43B" {...T} />
      <path d="M50 46 L60 55 L50 64 L40 55 Z" fill="#FF8FB1" {...T} />
      <path d="M10 78 L8 86 M22 78 L21 86 M34 78 L34 86 M46 78 L46 86 M58 78 L58 86 M70 78 L71 86 M82 78 L84 86 M92 78 L94 86" {...N} strokeWidth={3} />
    </g>
  ),
  mug: (
    <g>
      <path d="M38 18 Q34 10 40 6 M52 18 Q48 10 54 6" {...N} strokeWidth={3} strokeOpacity="0.5" />
      <path d="M70 40 Q90 40 88 58 Q86 74 68 72" {...N} strokeWidth={8} />
      <path d="M70 40 Q90 40 88 58 Q86 74 68 72" fill="none" stroke="#4D96FF" strokeWidth="3" />
      <path d="M20 26 L72 26 L68 82 Q66 90 58 90 L34 90 Q26 90 24 82 Z" fill="#4D96FF" {...S} />
      <ellipse cx="46" cy="27" rx="25" ry="4" fill="#7A4A2A" />
      <circle cx="46" cy="58" r="10" fill="#fff" {...T} />
      <path d="M41 58 L45 62 L52 54" {...N} strokeWidth={3} stroke="#FF5A4E" />
    </g>
  ),
  jug: (
    <g>
      <path d="M70 34 Q92 38 86 60 Q82 70 70 68" {...N} strokeWidth={7} />
      <path d="M34 14 L62 14 L60 24 Q78 40 74 70 Q72 90 50 90 Q28 90 26 70 Q22 40 40 24 L30 16 Z" fill="#E6F2FF" {...S} />
      <path d="M27 54 Q50 60 73 54 Q76 72 72 78 Q66 88 50 88 Q32 88 28 78 Q24 70 27 54 Z" fill="#fff" stroke="#9FC7FF" strokeWidth="2" />
      <path d="M34 14 L62 14 L60 24 Q78 40 74 70 Q72 90 50 90 Q28 90 26 70 Q22 40 40 24 L30 16 Z" fill="none" {...S} />
      {shine("M36 36 Q32 46 33 56")}
    </g>
  ),
  sun: (
    <g>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <path key={i} d={`M${50 + Math.cos(a) * 32} ${50 + Math.sin(a) * 32} L${50 + Math.cos(a) * 45} ${50 + Math.sin(a) * 45}`} {...N} strokeWidth={6} stroke="#FFB52E" />;
      })}
      <circle cx="50" cy="50" r="26" fill="#FFD43B" {...S} />
      {eye(42, 46)}{eye(58, 46)}
      <path d="M40 56 Q50 66 60 56" {...N} strokeWidth={3} />
      <circle cx="34" cy="56" r="3.5" fill="#FF8FB1" opacity="0.7" /><circle cx="66" cy="56" r="3.5" fill="#FF8FB1" opacity="0.7" />
    </g>
  ),
  bun: (
    <g>
      <path d="M10 64 Q10 26 50 24 Q90 26 90 64 Z" fill="#E59A4C" {...S} />
      <rect x="10" y="62" width="80" height="18" rx="9" fill="#F4C27F" {...S} />
      {[[32, 40], [50, 34], [66, 42], [40, 52], [60, 54], [24, 54], [76, 54]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3.5" ry="2" fill="#FFF6DA" transform={`rotate(${i * 25} ${x} ${y})`} />
      ))}
      {shine("M22 44 Q28 34 40 30")}
    </g>
  ),
  pig: (
    <g>
      <path d="M22 34 L18 12 L40 24 Z M78 34 L82 12 L60 24 Z" fill="#FF9FBF" {...S} />
      <circle cx="50" cy="52" r="34" fill="#FFB8CF" {...S} />
      <ellipse cx="50" cy="62" rx="16" ry="11" fill="#FF8FB1" {...S} />
      <ellipse cx="44" cy="62" rx="3" ry="4.5" fill={INK} /><ellipse cx="56" cy="62" rx="3" ry="4.5" fill={INK} />
      {eye(38, 44)}{eye(62, 44)}
      <path d="M44 78 Q50 81 56 78" {...N} strokeWidth={3} />
    </g>
  ),
  wig: (
    <g>
      <path d="M40 80 L60 80 L64 94 L36 94 Z" fill="#B9B3C9" {...S} />
      <ellipse cx="50" cy="56" rx="20" ry="24" fill="#E6E1F0" {...S} />
      {[[30, 34], [42, 24], [58, 24], [70, 34], [76, 50], [74, 66], [24, 50], [26, 66], [50, 20]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill="#FFD43B" {...S} />
      ))}
      {[[30, 34], [42, 24], [58, 24], [70, 34], [76, 50], [74, 66], [24, 50], [26, 66], [50, 20]].map(([x, y], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r="8" fill="#FFD43B" />
      ))}
      <path d="M33 44 Q50 34 67 44 Q60 40 50 40 Q40 40 33 44 Z" fill="#FFD43B" />
    </g>
  ),
  ring: (
    <g>
      <ellipse cx="50" cy="64" rx="28" ry="24" fill="none" {...S} strokeWidth={13} />
      <ellipse cx="50" cy="64" rx="28" ry="24" fill="none" stroke="#FFC21A" strokeWidth="6" />
      <path d="M36 32 L44 20 L56 20 L64 32 L50 46 Z" fill="#7FE3F0" {...S} />
      <path d="M36 32 L64 32 M44 20 L50 32 L56 20" {...N} strokeWidth={2.5} />
      <path d="M72 14 L74 20 L80 22 L74 24 L72 30 L70 24 L64 22 L70 20 Z" fill="#fff" />
    </g>
  ),
  king: (
    <g>
      <path d="M26 34 L30 10 L40 24 L50 6 L60 24 L70 10 L74 34 Z" fill="#FFD43B" {...S} />
      <circle cx="50" cy="20" r="3.5" fill="#FF5A4E" />
      <circle cx="50" cy="54" r="22" fill="#F6C9A0" {...S} />
      <path d="M28 58 Q30 92 50 92 Q70 92 72 58 Q62 70 50 70 Q38 70 28 58 Z" fill="#FFF6DA" {...S} />
      {eye(42, 50)}{eye(58, 50)}
      <path d="M44 64 Q50 60 56 64" {...N} strokeWidth={3} />
      <rect x="26" y="32" width="48" height="8" rx="3" fill="#FFC21A" {...T} />
    </g>
  ),
  wing: (
    <g>
      <path d="M16 30 Q50 14 88 34 Q90 46 80 52 Q86 60 76 68 Q80 76 68 80 Q66 88 52 86 Q30 80 20 60 Q12 46 16 30 Z" fill="#7FD3FF" {...S} />
      <path d="M30 40 Q56 34 84 40 M34 52 Q56 50 78 58 M40 64 Q56 64 70 72" {...N} strokeWidth={3} />
      <path d="M16 30 Q24 44 20 60" {...N} strokeWidth={3} />
      {shine("M28 34 Q44 26 62 28")}
    </g>
  ),
  swing: (
    <g>
      <path d="M12 92 L26 10 L74 10 L88 92" {...N} strokeWidth={6} />
      <path d="M12 92 L26 10 L74 10 L88 92" fill="none" stroke="#FF6B5A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 12 L38 66 M62 12 L62 66" {...N} strokeWidth={3} />
      <rect x="30" y="64" width="40" height="9" rx="4" fill="#FFD43B" {...S} />
    </g>
  ),
  bed: (
    <g>
      <path d="M10 26 L10 88 M90 50 L90 88" {...N} strokeWidth={7} />
      <rect x="10" y="56" width="80" height="18" rx="6" fill="#8E6CEF" {...S} />
      <path d="M36 52 Q60 46 88 52 L88 62 L36 62 Z" fill="#B9A2FF" {...T} />
      <rect x="14" y="40" width="24" height="16" rx="7" fill="#fff" {...T} />
      <path d="M10 26 Q22 18 10 18" {...N} strokeWidth={5} />
    </g>
  ),
  sled: (
    <g>
      <path d="M10 76 L80 76 Q94 76 92 62" {...N} strokeWidth={5} />
      <path d="M26 76 L26 64 M64 76 L64 64" {...N} strokeWidth={4} />
      <path d="M12 50 L78 50 L84 64 L18 64 Z" fill="#FF5A4E" {...S} />
      <path d="M30 50 L34 64 M48 50 L52 64 M64 50 L68 64" stroke="#C93A30" strokeWidth="3" />
      <path d="M84 52 Q92 40 80 34" {...N} strokeWidth={3} />
      <path d="M6 88 Q50 80 94 88" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  bell: (
    <g>
      <path d="M38 18 Q50 6 62 18" {...N} strokeWidth={5} />
      <path d="M30 18 Q22 30 40 30 L50 22 L60 30 Q78 30 70 18" fill="#FF5A4E" {...S} />
      <path d="M50 26 Q24 28 24 58 L18 74 L82 74 L76 58 Q76 28 50 26 Z" fill="#FFC21A" {...S} />
      <circle cx="50" cy="80" r="7" fill="#FFC21A" {...S} />
      {shine("M34 44 Q34 36 42 34")}
    </g>
  ),
  shell: (
    <g>
      <path d="M50 88 Q20 84 12 52 Q14 22 50 14 Q86 22 88 52 Q80 84 50 88 Z" fill="#FFB8CF" {...S} />
      <path d="M50 88 L50 16 M50 88 L28 22 M50 88 L72 22 M50 88 L16 40 M50 88 L84 40" {...N} strokeWidth={3} />
      <path d="M38 86 L36 94 L64 94 L62 86" fill="#FF8FB1" {...S} />
    </g>
  ),
  cake: (
    <g>
      <path d="M50 16 L50 30" {...N} strokeWidth={5} stroke="#4D96FF" />
      <path d="M50 4 Q56 10 50 16 Q44 10 50 4 Z" fill="#FFB52E" {...T} />
      <rect x="18" y="32" width="64" height="24" rx="6" fill="#FFB8CF" {...S} />
      <rect x="10" y="54" width="80" height="30" rx="7" fill="#F4C27F" {...S} />
      <path d="M18 40 Q26 48 34 40 Q42 48 50 40 Q58 48 66 40 Q74 48 82 40" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="30" cy="70" r="3.5" fill="#FF5A4E" /><circle cx="50" cy="70" r="3.5" fill="#6BCB77" /><circle cx="70" cy="70" r="3.5" fill="#8E6CEF" />
    </g>
  ),
  snake: (
    <g>
      <path d="M78 26 Q96 30 88 46 Q76 62 50 52 Q20 44 16 64 Q14 86 50 82 Q70 80 84 84" fill="none" {...S} strokeWidth={17} />
      <path d="M78 26 Q96 30 88 46 Q76 62 50 52 Q20 44 16 64 Q14 86 50 82 Q70 80 84 84" fill="none" stroke="#6BCB77" strokeWidth="9" strokeLinecap="round" />
      <path d="M78 26 Q96 30 88 46 Q76 62 50 52 Q20 44 16 64 Q14 86 50 82 Q70 80 84 84" fill="none" stroke="#FFD43B" strokeWidth="3" strokeDasharray="4 10" strokeLinecap="round" />
      <ellipse cx="72" cy="24" rx="15" ry="11" fill="#6BCB77" {...S} />
      {eye(68, 20, 2.8)}{eye(78, 20, 2.8)}
      <path d="M58 26 L50 26 L46 22 M50 26 L46 30" {...N} strokeWidth={2.5} stroke="#FF5A4E" />
    </g>
  ),
  rake: (
    <g>
      <path d="M78 8 L36 66" {...N} strokeWidth={9} />
      <path d="M78 8 L36 66" stroke="#D9A066" strokeWidth="4" strokeLinecap="round" />
      <path d="M14 58 L58 80" {...N} strokeWidth={9} />
      <path d="M14 58 L58 80" stroke="#A4A9B6" strokeWidth="4" strokeLinecap="round" />
      <path d="M16 60 L8 76 M27 65 L19 82 M38 71 L30 88 M49 76 L42 92" {...N} strokeWidth={4} />
    </g>
  ),
  lake: (
    <g>
      <path d="M4 50 L26 22 L44 46 L60 26 L86 50 Z" fill="#8FB6D9" {...S} />
      <path d="M20 30 L26 22 L32 30 Z M54 34 L60 26 L66 34 Z" fill="#fff" />
      <path d="M4 50 L96 50 L96 92 L4 92 Z" fill="#6BCB77" {...S} />
      <ellipse cx="50" cy="70" rx="38" ry="14" fill="#4D96FF" {...S} />
      <path d="M32 68 L44 68 M56 74 L68 74" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M86 70 L86 58 M90 72 L92 56" {...N} strokeWidth={3} />
    </g>
  ),
  snail: (
    <g>
      <path d="M8 82 Q8 70 22 70 L78 70 Q92 70 92 82 Z" fill="#F4C27F" {...S} />
      <path d="M18 70 Q14 54 24 50 L26 30 M24 50 L16 34" {...N} strokeWidth={3} />
      <circle cx="26" cy="28" r="3.5" fill={INK} /><circle cx="15" cy="32" r="3.5" fill={INK} />
      <circle cx="58" cy="50" r="27" fill="#FF8FB1" {...S} />
      <path d="M58 50 m0 -4 a4 4 0 1 1 -4 4 a9 9 0 1 1 9 9 a15 15 0 1 1 -15 -15 a20 20 0 0 1 24 -4" {...N} strokeWidth={3.5} />
      {eye(28, 60, 2.8)}
    </g>
  ),
  nail: (
    <g>
      <path d="M22 24 L44 14 L50 26 L28 36 Z" fill="#C9CED8" {...S} />
      <path d="M36 30 L76 80 L88 92 L80 76 L44 24" fill="#A4A9B6" {...S} />
      <path d="M42 34 L50 30 M50 44 L58 40 M58 54 L66 50" stroke="#7C8190" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  tail: (
    <g>
      <path d="M18 92 Q4 80 14 64 Q24 56 34 66 L40 92 Z" fill="#B87A4B" {...S} />
      <path d="M30 70 Q24 34 50 18 Q80 6 90 32 Q94 52 74 56 Q62 58 60 46 Q58 36 66 34" fill="none" {...S} strokeWidth={20} />
      <path d="M30 70 Q24 34 50 18 Q80 6 90 32 Q94 52 74 56 Q62 58 60 46 Q58 36 66 34" fill="none" stroke="#D9A066" strokeWidth="12" strokeLinecap="round" />
      <path d="M44 26 Q60 16 76 22" fill="none" stroke="#F4D7B0" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  boat: (
    <g>
      <path d="M50 10 L50 64" {...N} strokeWidth={4} />
      <path d="M54 14 L84 56 L54 56 Z" fill="#FFFDF6" {...S} />
      <path d="M46 22 L24 56 L46 56 Z" fill="#FFD43B" {...S} />
      <path d="M10 64 L90 64 L78 84 L22 84 Z" fill="#FF6B5A" {...S} />
      <path d="M4 90 Q16 84 28 90 T52 90 T76 90 T100 90" fill="none" stroke="#4D96FF" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  goat: (
    <g>
      <path d="M36 26 Q28 6 14 12 Q26 16 30 32 M64 26 Q72 6 86 12 Q74 16 70 32" fill="#C9B79C" {...S} />
      <path d="M26 36 L8 40 L26 46 Z M74 36 L92 40 L74 46 Z" fill="#E6E1D6" {...S} />
      <path d="M28 34 Q28 22 50 22 Q72 22 72 34 L66 70 Q50 82 34 70 Z" fill="#FFFDF6" {...S} />
      <path d="M42 76 Q50 96 58 76" fill="#E6E1D6" {...S} />
      {eye(40, 44)}{eye(60, 44)}
      <ellipse cx="44" cy="64" rx="2.5" ry="3.5" fill={INK} /><ellipse cx="56" cy="64" rx="2.5" ry="3.5" fill={INK} />
    </g>
  ),
  coat: (
    <g>
      <path d="M36 12 L50 22 L64 12 L84 22 L94 66 L80 70 L76 46 L76 92 L24 92 L24 46 L20 70 L6 66 L16 22 Z" fill="#4D96FF" {...S} />
      <path d="M36 12 L50 40 L64 12" fill="#3B7BE0" {...S} />
      <path d="M50 40 L50 92" {...N} strokeWidth={3} />
      <circle cx="56" cy="54" r="3.5" fill="#FFD43B" {...T} /><circle cx="56" cy="70" r="3.5" fill="#FFD43B" {...T} /><circle cx="56" cy="84" r="3.5" fill="#FFD43B" {...T} />
      <path d="M28 66 L42 66 L42 76 L28 76" fill="none" {...T} />
    </g>
  ),
  bee: (
    <g>
      <ellipse cx="38" cy="30" rx="14" ry="18" fill="#E6F6FF" {...S} transform="rotate(-20 38 30)" />
      <ellipse cx="62" cy="30" rx="14" ry="18" fill="#E6F6FF" {...S} transform="rotate(20 62 30)" />
      <path d="M84 60 L94 62" {...N} strokeWidth={4} />
      <ellipse cx="54" cy="60" rx="32" ry="22" fill="#FFD43B" {...S} />
      <path d="M48 39 Q42 60 48 81 M64 40 Q58 60 64 80" fill="none" stroke={INK} strokeWidth="8" />
      <circle cx="26" cy="56" r="15" fill="#FFD43B" {...S} />
      {eye(22, 52, 2.8)}
      <path d="M16 62 Q20 66 26 64" {...N} strokeWidth={2.5} />
      <path d="M20 42 Q14 30 8 30 M28 41 Q28 30 22 26" {...N} strokeWidth={2.5} />
    </g>
  ),
  tree: (
    <g>
      <path d="M42 92 L44 58 L56 58 L58 92 Z" fill="#9A6234" {...S} />
      <circle cx="50" cy="38" r="26" fill="#6BCB77" {...S} />
      <circle cx="28" cy="52" r="16" fill="#6BCB77" {...S} />
      <circle cx="72" cy="52" r="16" fill="#6BCB77" {...S} />
      <path d="M22 54 Q50 70 78 54 L70 64 Q50 70 30 64 Z" fill="#6BCB77" />
      <circle cx="40" cy="34" r="4" fill="#FF5A4E" {...T} /><circle cx="62" cy="44" r="4" fill="#FF5A4E" {...T} /><circle cx="30" cy="54" r="4" fill="#FF5A4E" {...T} />
      {shine("M36 22 Q44 16 54 18")}
    </g>
  ),
  knee: (
    <g>
      <path d="M8 22 L52 22 L54 44 L14 46 Z" fill="#4D96FF" {...S} />
      <path d="M14 44 L54 42 Q74 44 76 58 L70 90 L56 90 L58 62 Q54 58 44 60 L18 62 Z" fill="#F6C9A0" {...S} />
      <path d="M52 84 L84 84 Q92 84 92 92 L52 92 Z" fill="#FF6B5A" {...S} />
      <rect x="54" y="44" width="16" height="9" rx="3" fill="#FFE9C7" {...T} transform="rotate(30 62 48)" />
    </g>
  ),
  moon: (
    <g>
      <path d="M62 10 Q24 14 22 50 Q24 88 64 90 Q36 78 36 50 Q36 22 62 10 Z" fill="#FFE27A" {...S} />
      {eye(36, 44, 2.8)}
      <path d="M32 58 Q36 62 40 58" {...N} strokeWidth={2.5} />
      <path d="M76 26 L78 32 L84 34 L78 36 L76 42 L74 36 L68 34 L74 32 Z M82 62 L83 66 L87 67 L83 68 L82 72 L81 68 L77 67 L81 66 Z" fill="#FFE27A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>
  ),
  spoon: (
    <g>
      <path d="M50 46 L50 94" {...N} strokeWidth={11} />
      <path d="M50 46 L50 94" stroke="#C9CED8" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="50" cy="28" rx="18" ry="24" fill="#C9CED8" {...S} />
      <ellipse cx="50" cy="28" rx="11" ry="16" fill="#E3E7EE" />
      {shine("M44 18 Q44 12 48 10")}
    </g>
  ),
  car: (
    <g>
      <path d="M8 70 L8 58 Q8 50 16 48 L28 46 L38 30 Q42 26 50 26 L66 26 Q72 26 76 32 L84 46 Q94 48 94 58 L94 70 Z" fill="#FF5A4E" {...S} />
      <path d="M36 46 L44 32 L56 32 L56 46 Z M62 46 L62 32 L70 32 L78 46 Z" fill="#CFF7F2" {...T} />
      <circle cx="28" cy="72" r="10" fill={INK} /><circle cx="28" cy="72" r="4" fill="#ccc" />
      <circle cx="74" cy="72" r="10" fill={INK} /><circle cx="74" cy="72" r="4" fill="#ccc" />
      <rect x="86" y="54" width="7" height="5" rx="2" fill="#FFE27A" />
    </g>
  ),
  star: (
    <g>
      <path d="M50 8 L61 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L39 36 Z" fill="#FFD43B" {...S} />
      {eye(42, 48, 2.8)}{eye(58, 48, 2.8)}
      <path d="M44 58 Q50 63 56 58" {...N} strokeWidth={2.5} />
      {shine("M44 24 L48 16")}
    </g>
  ),
  jar: (
    <g>
      <rect x="24" y="10" width="52" height="14" rx="4" fill="#FF6B5A" {...S} />
      <path d="M28 24 L72 24 Q84 30 84 44 L84 82 Q84 92 72 92 L28 92 Q16 92 16 82 L16 44 Q16 30 28 24 Z" fill="#E6F6FF" {...S} />
      <path d="M18 52 L82 52 L82 82 Q82 90 72 90 L28 90 Q18 90 18 82 Z" fill="#FF8FB1" />
      <path d="M28 24 L72 24 Q84 30 84 44 L84 82 Q84 92 72 92 L28 92 Q16 92 16 82 L16 44 Q16 30 28 24 Z" fill="none" {...S} />
      {shine("M24 40 L24 74")}
    </g>
  ),
  house: (
    <g>
      <path d="M10 48 L50 12 L90 48 Z" fill="#E86F5C" {...S} />
      <rect x="18" y="46" width="64" height="44" rx="4" fill="#FFE9C7" {...S} />
      <rect x="42" y="62" width="16" height="28" rx="3" fill="#9A6234" {...S} />
      <rect x="24" y="56" width="12" height="12" rx="2" fill="#7FD3FF" {...T} />
      <rect x="64" y="56" width="12" height="12" rx="2" fill="#7FD3FF" {...T} />
      <path d="M66 26 L66 14 L76 14 L76 35" fill="#B5814A" {...T} />
    </g>
  ),
  mouse: (
    <g>
      <path d="M16 74 Q4 66 8 54" {...N} strokeWidth={3.5} />
      <path d="M14 74 Q14 46 46 42 Q72 42 88 66 Q86 76 70 78 L22 78 Q14 78 14 74 Z" fill="#B9B3C9" {...S} />
      <circle cx="56" cy="40" r="14" fill="#B9B3C9" {...S} />
      <circle cx="56" cy="40" r="8" fill="#FFB8C8" />
      {eye(72, 58)}
      <circle cx="88" cy="66" r="4" fill="#FF7FA0" {...T} />
      <path d="M86 70 L96 74 M86 64 L96 60" {...N} strokeWidth={2} />
    </g>
  ),
};

/** One word picture in a 100×100 box. Unknown words render nothing (never a broken image). */
export function WordPicture({ word, title }: { word: string; title?: string }) {
  const art = PICTURES[word];
  return (
    <svg className="rl-pic" viewBox="0 0 100 100" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} aria-label={title}>
      {art ?? null}
    </svg>
  );
}
