import { INK } from "../../characters/palette";

/**
 * The Lantern Press — original SVG art: the boathouse newsroom at evening (beams, hanging lanterns, a hand press,
 * a window onto the harbor, a proof desk), the boathouse outside at dusk for the story, prompt icons, and the
 * Editor's Pen mark (a brass nib with a lantern flame). Flat fills with the Critter Crew ink outline; a calmer,
 * older palette (evening navy, wood, lantern amber, newsprint cream) for ages 12–14.
 */
export const LP = {
  night: "#1E2B47",
  dusk: "#34466E",
  wood: "#8A5A36",
  woodDeep: "#5E3B22",
  woodLight: "#B07A4C",
  amber: "#FFC24D",
  glow: "#FFE3A1",
  paper: "#FBF6EA",
  paperDeep: "#EDE3CC",
  brass: "#C9973E",
  brassDeep: "#8E6420",
  sea: "#3E6C8E",
} as const;
const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** A hanging lantern in a 100-unit box (motion: CSS sway, off under reduced motion). */
export function Lantern({ lit = true }: { lit?: boolean }) {
  return (
    <g>
      <path d="M50 0 V18" stroke={INK} strokeWidth="3" />
      <path d="M38 18 H62 L58 26 H42 Z" fill={LP.brass} {...S} strokeWidth={3.5} />
      <path d="M40 26 Q30 50 40 76 H60 Q70 50 60 26 Z" fill={lit ? LP.glow : "#D9D2C2"} {...S} strokeWidth={3.5} />
      {lit && <ellipse cx="50" cy="52" rx="7" ry="11" fill={LP.amber} />}
      <path d="M40 76 H60 L56 84 H44 Z" fill={LP.brass} {...S} strokeWidth={3.5} />
    </g>
  );
}

/** The newsroom: an old boathouse at evening. */
export function PressScene() {
  return (
    <svg className="scene-bg lp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lp-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A3350" /><stop offset="1" stopColor="#4E4462" /></linearGradient>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={LP.night} /><stop offset="1" stopColor="#E9A36A" /></linearGradient>
        <radialGradient id="lp-light" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={LP.glow} stopOpacity="0.45" /><stop offset="1" stopColor={LP.glow} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#lp-wall)" />
      {/* plank wall */}
      <g stroke="#2E2842" strokeWidth="3" opacity="0.6">
        {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${60 + i * 110} 120 V700`} />)}
      </g>
      {/* window onto the harbor at dusk */}
      <g transform="translate(140 190)">
        <rect width="360" height="250" rx="10" fill="url(#lp-sky)" stroke={INK} strokeWidth="8" />
        <path d="M0 175 Q90 160 180 172 T360 168 V250 H0 Z" fill={LP.sea} />
        <path d="M60 175 L92 128 L124 175 Z" fill="#F4EBDD" stroke={INK} strokeWidth="4" />
        <rect x="246" y="96" width="26" height="80" fill="#F4EBDD" stroke={INK} strokeWidth="4" />
        <path d="M240 96 H278 L268 80 H250 Z" fill="#E8584F" stroke={INK} strokeWidth="4" />
        <circle cx="300" cy="44" r="4" fill="#FFF7DB" /><circle cx="40" cy="60" r="3" fill="#FFF7DB" /><circle cx="160" cy="34" r="3" fill="#FFF7DB" />
        <path d="M180 0 V250 M0 125 H360" stroke={INK} strokeWidth="7" />
      </g>
      {/* roof beams */}
      <path d="M0 120 L800 20 L1600 120" fill="none" stroke={LP.woodDeep} strokeWidth="40" />
      <path d="M0 120 L800 20 L1600 120" fill="none" stroke={LP.wood} strokeWidth="24" />
      <rect x="0" y="112" width="1600" height="26" fill={LP.wood} stroke={INK} strokeWidth="5" />
      {/* hanging lanterns and their glow */}
      {[[420, 140], [800, 140], [1180, 140]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y! + 120} r="190" fill="url(#lp-light)" />
          <g className="lp-sway" style={{ animationDelay: `${-i * 1.7}s` }} transform={`translate(${x! - 40} ${y}) scale(0.8 1.2)`}>
            <Lantern />
          </g>
        </g>
      ))}
      {/* the hand press, right */}
      <g transform="translate(1150 330)">
        <rect x="0" y="250" width="330" height="40" rx="8" fill={LP.woodDeep} stroke={INK} strokeWidth="6" />
        <rect x="30" y="40" width="40" height="220" fill="#47506A" stroke={INK} strokeWidth="6" />
        <rect x="260" y="40" width="40" height="220" fill="#47506A" stroke={INK} strokeWidth="6" />
        <rect x="10" y="20" width="310" height="44" rx="10" fill="#5B6582" stroke={INK} strokeWidth="6" />
        <rect x="90" y="150" width="150" height="26" fill={LP.paper} stroke={INK} strokeWidth="5" />
        <rect x="70" y="176" width="190" height="34" rx="6" fill="#5B6582" stroke={INK} strokeWidth="6" />
        <circle cx="165" cy="105" r="34" fill={LP.brass} stroke={INK} strokeWidth="6" />
        <path d="M165 105 L245 70" stroke={INK} strokeWidth="9" />
        <circle cx="250" cy="68" r="12" fill={LP.woodLight} stroke={INK} strokeWidth="5" />
      </g>
      {/* paper drying on a line */}
      <path d="M560 300 Q800 330 1060 300" fill="none" stroke={INK} strokeWidth="3" />
      {[620, 760, 900].map((x, i) => (
        <g key={x} transform={`translate(${x} ${308 + (i === 1 ? 8 : 0)})`}>
          <rect width="96" height="120" fill={LP.paper} stroke={INK} strokeWidth="4" />
          <path d="M12 18 H84 M12 34 H70 M12 50 H84 M12 66 H60 M12 82 H84 M12 98 H72" stroke="#B9AE95" strokeWidth="5" />
        </g>
      ))}
      {/* floor and the proof desk */}
      <rect x="0" y="690" width="1600" height="210" fill={LP.woodDeep} />
      <g stroke="#4A2E1A" strokeWidth="3">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M0 ${710 + i * 22} H1600`} opacity="0.5" />)}</g>
      <g transform="translate(560 600)">
        <rect x="0" y="0" width="480" height="40" rx="8" fill={LP.wood} stroke={INK} strokeWidth="6" />
        <rect x="30" y="40" width="30" height="120" fill={LP.woodDeep} stroke={INK} strokeWidth="5" />
        <rect x="420" y="40" width="30" height="120" fill={LP.woodDeep} stroke={INK} strokeWidth="5" />
        <rect x="70" y="-26" width="150" height="30" fill={LP.paper} stroke={INK} strokeWidth="4" transform="rotate(-4 145 -11)" />
        <rect x="260" y="-18" width="120" height="22" fill={LP.paperDeep} stroke={INK} strokeWidth="4" />
        <path d="M400 -6 L452 -30" stroke={INK} strokeWidth="8" /><path d="M400 -6 L452 -30" stroke={LP.brass} strokeWidth="4" />
      </g>
    </svg>
  );
}

/** Story: the boathouse at dusk, its windows lit, lanterns along the dock. */
export function BoathouseScene({ printing = false }: { printing?: boolean }) {
  return (
    <svg className="scene-bg lp-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lp-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={LP.night} /><stop offset="0.7" stopColor="#7C5C86" /><stop offset="1" stopColor="#F0A868" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#lp-dusk)" />
      {[[200, 90], [520, 60], [980, 110], [1360, 70], [1480, 160], [760, 150]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4} fill="#FFF7DB" />)}
      <circle cx="1290" cy="170" r="46" fill="#FFF3D1" />
      <circle cx="1310" cy="160" r="40" fill="#5A4E7C" opacity="0.35" />
      <path d="M0 600 Q180 540 360 590 Q470 620 560 600 L560 640 H0 Z" fill="#4B3F68" />
      <path d="M1100 610 Q1280 560 1460 596 Q1540 610 1600 600 V640 H1100 Z" fill="#4B3F68" />
      <path d="M0 640 Q400 620 800 636 T1600 628 V900 H0 Z" fill={LP.sea} />
      <path d="M0 700 Q400 690 800 702 T1600 696" fill="none" stroke="#5E8CB0" strokeWidth="6" opacity="0.7" />
      {/* boathouse */}
      <g transform="translate(470 250)">
        <path d="M-40 160 L330 0 L700 160 Z" fill={LP.woodDeep} stroke={INK} strokeWidth="8" />
        <rect x="0" y="160" width="660" height="260" fill={LP.wood} stroke={INK} strokeWidth="8" />
        <g stroke="#6D4528" strokeWidth="4">{Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${60 * (i + 1)} 168 V412`} />)}</g>
        {[70, 470].map((x) => (
          <g key={x}>
            <rect x={x} y="210" width="120" height="100" rx="6" fill={LP.glow} stroke={INK} strokeWidth="7" />
            <path d={`M${x + 60} 210 V310 M${x} 260 H${x + 120}`} stroke={INK} strokeWidth="5" />
          </g>
        ))}
        <path d="M250 420 V250 Q330 200 410 250 V420 Z" fill="#3A2A20" stroke={INK} strokeWidth="7" />
        <rect x="200" y="174" width="260" height="46" rx="6" fill={LP.paper} stroke={INK} strokeWidth="5" />
        <text x="330" y="206" textAnchor="middle" fontSize="23" fontWeight="800" fill={INK} fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="1">LANTERN PRESS</text>
      </g>
      {/* the dock with lanterns on posts */}
      <rect x="380" y="664" width="840" height="26" fill={LP.woodLight} stroke={INK} strokeWidth="6" />
      {[420, 640, 860, 1080].map((x, i) => (
        <g key={x}>
          <rect x={x - 8} y="600" width="16" height="120" fill={LP.woodDeep} stroke={INK} strokeWidth="4" />
          <g className="lp-sway" style={{ animationDelay: `${-i * 1.3}s` }} transform={`translate(${x - 22} 540) scale(0.44 0.6)`}><Lantern /></g>
        </g>
      ))}
      {printing && (
        <g className="lp-papers">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${1220 + i * 70} ${420 - i * 60}) rotate(${-10 + i * 9})`}>
              <rect width="90" height="116" fill={LP.paper} stroke={INK} strokeWidth="4" />
              <path d="M10 18 H80 M10 34 H64 M10 50 H80 M10 66 H58 M10 82 H80" stroke="#B9AE95" strokeWidth="5" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Prompt-pill icon: a galley proof, a folded paper (articles) or a pen (word choice). Never shows an answer. */
export function PressObject({ kind }: { kind: string }) {
  if (kind === "article") {
    return (
      <svg className="lp-icon" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M14 22 H80 V82 Q80 88 74 88 H20 Q14 88 14 82 Z" fill={LP.paper} {...S} />
        <path d="M80 34 H88 V82 Q88 88 82 88" fill="none" {...S} />
        <rect x="24" y="32" width="46" height="12" fill={INK} opacity="0.75" />
        <path d="M24 54 H44 M24 64 H44 M24 74 H44 M52 54 H70 M52 64 H70 M52 74 H66" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      </svg>
    );
  }
  if (kind === "pen") return <svg className="lp-icon" viewBox="0 0 100 100" aria-hidden="true"><Nib /></svg>;
  return (
    <svg className="lp-icon" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M24 10 H66 L80 24 V90 H24 Z" fill={LP.paper} {...S} />
      <path d="M66 10 V24 H80" fill="none" {...S} strokeWidth={4} />
      <path d="M34 38 H70 M34 50 H64 M34 62 H70 M34 74 H56" stroke={INK} strokeWidth="4.5" strokeLinecap="round" opacity="0.6" />
      <path d="M58 70 Q64 60 72 66" fill="none" stroke="#C0453B" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** A brass pen nib in a 100-unit box. */
function Nib() {
  return (
    <g>
      {/* a fountain-pen nib: flat top where it meets the pen, shoulders, a pointed tip with a slit and breather hole */}
      <path d="M50 94 L31 56 Q28 50 30 44 L33 14 H67 L70 44 Q72 50 69 56 Z" fill={LP.brass} {...S} />
      <path d="M33 22 H67" stroke={LP.brassDeep} strokeWidth="4" />
      <path d="M50 94 V56" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="50" r="6" fill={LP.paper} stroke={INK} strokeWidth="4" />
      <path d="M38 62 Q44 74 48 84" fill="none" stroke="#E7C27A" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}
export const NoBasket = () => <svg viewBox="0 0 10 10" aria-hidden="true" />;

/** The Editor's Pen mark: a brass nib with a lantern flame above it, on a round newsprint seal. */
export function EditorsPen() {
  return (
    <svg className="sticker-svg" viewBox="0 0 200 200" role="img" aria-label="Editor's Pen mark: a brass pen nib with a lantern flame">
      <circle cx="100" cy="100" r="92" fill={LP.night} stroke={INK} strokeWidth="7" />
      <circle cx="100" cy="100" r="78" fill={LP.paper} stroke={LP.brass} strokeWidth="6" />
      <path d="M100 26 Q120 46 112 62 Q108 72 100 74 Q92 72 88 62 Q80 46 100 26 Z" fill={LP.amber} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M100 42 Q108 54 104 62 Q100 66 96 62 Q92 54 100 42 Z" fill="#FFF3C4" />
      <g transform="translate(55 70) scale(0.9)"><Nib /></g>
      <path d="M44 150 Q100 170 156 150" fill="none" stroke={LP.brassDeep} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
