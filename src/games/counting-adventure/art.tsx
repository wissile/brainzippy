import { INK } from "../../characters/palette";

/** Original object + scene art for Counting Adventure ("Bobbo's Snack Meadow"). */

export function SnackArt({ kind }: { kind: string }) {
  switch (kind) {
    case "apple":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M52 26 Q54 12 62 6" fill="none" stroke="#7A4A2A" strokeWidth="5" strokeLinecap="round" />
          <path d="M56 20 Q72 6 84 16 Q72 28 56 20 Z" fill="#4CB35E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M50 28 C36 18 12 24 12 52 C12 78 32 96 50 90 C68 96 88 78 88 52 C88 24 64 18 50 28 Z" fill="#FF5A4E" stroke={INK} strokeWidth="4.5" />
          <path d="M26 44 C28 36 34 32 40 31" fill="none" stroke="#fff" strokeOpacity="0.65" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "carrot":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 26 Q40 6 30 8 Q38 18 44 28 M50 26 Q52 4 62 2 Q60 16 54 28 M52 28 Q70 10 78 16 Q66 22 56 30" fill="#4CB35E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M34 34 Q50 22 66 34 Q64 64 52 94 Q48 96 46 92 Q36 64 34 34 Z" fill="#FF8C2E" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M40 48 L48 50 M44 64 L52 66 M46 78 L52 79" stroke="#C85A12" strokeWidth="3" strokeLinecap="round" />
          <path d="M42 40 Q44 36 48 35" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "cookie":
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="52" r="38" fill="#E7A55A" stroke={INK} strokeWidth="4.5" />
          <circle cx="50" cy="52" r="30" fill="#F2BC74" />
          {[[38, 40], [60, 38], [48, 58], [66, 62], [34, 64], [54, 74]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="5" ry="4" fill="#6B3E22" />
          ))}
          <path d="M26 40 Q30 30 40 26" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "berry":
    default:
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 28 C24 22 14 44 22 62 C30 80 44 94 50 94 C56 94 70 80 78 62 C86 44 76 22 50 28 Z" fill="#FF4F6E" stroke={INK} strokeWidth="4.5" />
          {[[38, 46], [56, 44], [46, 60], [64, 60], [36, 66], [54, 76], [44, 82]].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2.4" ry="3.2" fill="#FFE27A" />
          ))}
          <path d="M50 30 L36 18 L46 26 L50 12 L54 26 L64 18 Z" fill="#4CB35E" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M30 44 Q32 38 38 36" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
  }
}

export function MeadowBackground() {
  return (
    <svg className="scene-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FF" />
          <stop offset="0.65" stopColor="#D9F1FF" />
          <stop offset="1" stopColor="#FFF4D6" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="0.6" stopColor="#FFE066" />
          <stop offset="1" stopColor="#FFE066" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sky)" />
      <circle cx="1340" cy="150" r="150" fill="url(#sun)" />
      <circle cx="1340" cy="150" r="62" fill="#FFE066" />
      <g className="clouds" fill="#fff">
        <g className="cloud c1"><ellipse cx="260" cy="150" rx="90" ry="38" /><ellipse cx="320" cy="130" rx="60" ry="44" /><ellipse cx="210" cy="140" rx="50" ry="30" /></g>
        <g className="cloud c2" opacity="0.9"><ellipse cx="900" cy="100" rx="70" ry="28" /><ellipse cx="950" cy="84" rx="48" ry="34" /></g>
      </g>
      <path d="M0 560 Q200 470 420 520 T860 500 T1300 470 T1600 510 L1600 900 L0 900 Z" fill="#A6E39A" />
      <path d="M0 620 Q260 560 560 610 T1120 590 T1600 600 L1600 900 L0 900 Z" fill="#7FD27A" />
      <g>
        <rect x="1180" y="420" width="22" height="120" rx="8" fill="#9A6234" />
        <circle cx="1191" cy="400" r="70" fill="#4CB35E" />
        <circle cx="1150" cy="430" r="44" fill="#5CC56C" />
        <circle cx="1236" cy="428" r="46" fill="#45A857" />
        <circle cx="1172" cy="392" r="10" fill="#FF5A4E" /><circle cx="1214" cy="420" r="10" fill="#FF5A4E" /><circle cx="1160" cy="438" r="9" fill="#FF5A4E" />
      </g>
      <path d="M0 700 Q400 650 800 690 T1600 680 L1600 900 L0 900 Z" fill="#63C26A" />
      <g fill="#fff" opacity="0.9">
        {[120, 420, 980, 1460].map((x) => (
          <g key={x} transform={`translate(${x} 760)`}><circle r="7" /><circle cx="10" r="7" /><circle cx="5" cy="-8" r="7" /><circle cx="5" cy="8" r="7" /><circle cx="5" r="5" fill="#FFD43B" /></g>
        ))}
      </g>
    </svg>
  );
}

/** Woven basket. `children` (snacks) are positioned by CSS. */
export function BasketArt() {
  return (
    <svg className="basket-art" viewBox="0 0 300 200" aria-hidden="true" preserveAspectRatio="none">
      <path d="M40 70 Q150 -30 260 70" fill="none" stroke="#8A5228" strokeWidth="12" strokeLinecap="round" />
      <path d="M18 70 L282 70 L254 190 Q150 202 46 190 Z" fill="#D58A45" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M30 110 L270 110 M38 148 L262 148" stroke="#A9652E" strokeWidth="6" />
      <rect x="10" y="60" width="280" height="24" rx="12" fill="#E7A35E" stroke={INK} strokeWidth="6" />
    </svg>
  );
}

export function ChampSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Counting Champ sticker: Bobbo inside a golden star">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="#FFF3C4" />
      <g transform="translate(120 106) scale(0.8) translate(-120 -120)">
        <path d="M120 30 L144 86 L204 90 L158 128 L172 188 L120 156 L68 188 L82 128 L36 90 L96 86 Z" fill="#FFD43B" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
        <g transform="translate(76 70) scale(0.44)">
          <path d="M100 50 C141 50 166 112 166 150 C166 185 137 202 100 202 C63 202 34 185 34 150 C34 112 59 50 100 50 Z" fill="#FF9F43" stroke={INK} strokeWidth="9" />
          <path d="M89 58 Q97 24 100 14 Q104 24 111 58 Z" fill="#FFE6BA" stroke={INK} strokeWidth="8" />
          <circle cx="80" cy="112" r="17" fill="#fff" stroke={INK} strokeWidth="8" /><circle cx="83" cy="114" r="8" fill={INK} />
          <circle cx="120" cy="112" r="17" fill="#fff" stroke={INK} strokeWidth="8" /><circle cx="123" cy="114" r="8" fill={INK} />
          <path d="M85 137 Q100 139 115 137 Q112 158 100 158 Q88 158 85 137 Z" fill="#4A2545" stroke={INK} strokeWidth="6" />
        </g>
      </g>
      <path id="champ-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill={INK} letterSpacing="1.5">
        <textPath href="#champ-arc" startOffset="50%" textAnchor="middle">COUNTING CHAMP</textPath>
      </text>
    </svg>
  );
}
