import { CREW, INK } from "../../characters/palette";

/**
 * Lighthouse Night — original SVG art: Number Hill harbour on a stormy night (rain, rolling sea, the headland and
 * Hoot's lighthouse with a sweeping beam), the calm harbour at dawn for the outro, the lamp room, small diagram glyphs
 * (lighthouse, ship, buoy, Bobbo's boat), prompt icons and the Keeper's Lamp sticker. Flat fills with the Critter Crew
 * ink outline; a calmer, older night palette (navy, storm slate, lamp gold, sea teal) for ages 12–14. No real places,
 * charts, vessels or brands.
 */
export const LN = {
  night: "#16213E",
  nightDeep: "#0D1530",
  storm: "#33415C",
  stormLight: "#5C6B8A",
  sea: "#1D4E5F",
  seaLight: "#2C7A8C",
  foam: "#CFE9EE",
  rock: "#4A4F63",
  rockLight: "#6B7086",
  lamp: "#FFD43B",
  lampSoft: "#FFF1B0",
  white: "#F8F4EA",
  red: "#D6454B",
  wood: "#9A6B45",
  dawn: "#FFB878",
  dawnSky: "#9CC7E8",
  grass: "#7DBE6E",
  paper: "#F4EBD3",
  paperDeep: "#E3D5B0",
  ink: INK,
} as const;
const S = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Hoot's lighthouse (original): white tower with red bands, gallery, lamp room. 120 × 300 box, base at y = 300. */
export function Tower({ lit = true }: { lit?: boolean }) {
  return (
    <g>
      <path d="M30 300 L44 90 H76 L90 300 Z" fill={LN.white} {...S} />
      <path d="M38 196 L40 168 H80 L82 196 Z M34 262 L36 232 H84 L86 262 Z" fill={LN.red} />
      <path d="M30 300 L44 90 H76 L90 300 Z" fill="none" {...S} />
      <rect x="54" y="250" width="12" height="22" rx="6" fill={LN.wood} stroke={INK} strokeWidth="3.5" />
      <rect x="34" y="80" width="52" height="12" rx="3" fill={LN.storm} {...S} strokeWidth={4} />
      <path d="M38 80 V60 M82 80 V60 M34 62 H86" stroke={INK} strokeWidth="3.5" />
      <rect x="44" y="40" width="32" height="40" rx="4" fill={lit ? LN.lamp : LN.lampSoft} {...S} strokeWidth={4} />
      <path d="M60 40 V80" stroke={INK} strokeWidth="3" opacity="0.6" />
      <path d="M38 40 L60 18 L82 40 Z" fill={LN.red} {...S} strokeWidth={4} />
      <circle cx="60" cy="14" r="4" fill={INK} />
    </g>
  );
}

/** A small cargo ship, side view, nose right (original). 120 × 60 box. */
export function Ship({ colour = "#4FB3E8" }: { colour?: string }) {
  return (
    <g>
      <path d="M6 30 H114 L100 54 H18 Z" fill={colour} {...S} strokeWidth={4} />
      <rect x="62" y="12" width="30" height="18" rx="3" fill={LN.white} stroke={INK} strokeWidth="4" />
      <rect x="68" y="16" width="7" height="6" fill={LN.lamp} />
      <rect x="80" y="16" width="7" height="6" fill={LN.lamp} />
      <rect x="22" y="18" width="16" height="12" fill={LN.red} stroke={INK} strokeWidth="3.5" />
      <rect x="40" y="18" width="16" height="12" fill="#7DBE6E" stroke={INK} strokeWidth="3.5" />
    </g>
  );
}

/** Bobbo's little sailing boat with Bobbo aboard (simplified cameo). 100 × 90 box. */
export function BobboBoat() {
  return (
    <g>
      <path d="M48 8 V62" stroke={INK} strokeWidth="4" />
      <path d="M52 12 L86 58 H52 Z" fill={LN.white} {...S} strokeWidth={4} />
      <ellipse cx="34" cy="54" rx="14" ry="16" fill={CREW.bobbo} stroke={INK} strokeWidth="4" />
      <circle cx="29" cy="50" r="2.6" fill={INK} />
      <circle cx="39" cy="50" r="2.6" fill={INK} />
      <path d="M29 58 Q34 62 39 58" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M6 64 H94 L82 84 H18 Z" fill={LN.red} {...S} strokeWidth={4} />
    </g>
  );
}

/** A channel buoy (original): red can with a light. 40 × 50 box. */
export function Buoy() {
  return (
    <g>
      <path d="M8 44 L12 18 H28 L32 44 Z" fill={LN.red} {...S} strokeWidth={3.5} />
      <path d="M18 18 V8 M22 18 V8" stroke={INK} strokeWidth="3" />
      <circle cx="20" cy="7" r="5" fill={LN.lamp} stroke={INK} strokeWidth="3" />
      <path d="M2 46 Q20 40 38 46" stroke={LN.foam} strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

const Rain = () => (
  <g className="ln-rain" stroke="#AFC3E0" strokeWidth="3" strokeLinecap="round" opacity="0.45">
    {Array.from({ length: 34 }, (_, i) => {
      const x = (i * 149) % 1600, y = (i * 263) % 520;
      return <path key={i} d={`M${x} ${y} l-14 40`} />;
    })}
  </g>
);

/** The stormy harbour: night sky, rain, rolling sea, headland and Hoot's lighthouse with its sweeping beam. */
export function NightHarbour({ calm = false }: { calm?: boolean }) {
  return (
    <svg className="scene-bg ln-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ln-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={LN.nightDeep} /><stop offset="1" stopColor={LN.storm} /></linearGradient>
        <linearGradient id="ln-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={LN.lampSoft} stopOpacity="0.75" /><stop offset="1" stopColor={LN.lampSoft} stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ln-sky)" />
      <g fill={LN.stormLight} opacity="0.55">
        <path className="ln-cloud" d="M80 150 Q90 90 170 100 Q210 40 300 70 Q380 50 400 120 Q470 130 450 180 H90 Z" />
        <path className="ln-cloud c2" d="M760 110 Q780 60 850 70 Q900 20 980 50 Q1060 40 1070 100 Q1130 110 1110 150 H770 Z" />
      </g>
      {!calm && <Rain />}
      {/* the headland and the lighthouse */}
      <path d="M1080 640 Q1160 520 1300 500 Q1440 480 1600 520 V900 H1040 Z" fill={LN.rock} {...S} strokeWidth={6} />
      <path d="M1180 600 Q1260 560 1340 566" stroke={LN.rockLight} strokeWidth="10" fill="none" strokeLinecap="round" />
      <g className="ln-sweep" style={{ transformOrigin: "1360px 336px" }}>
        <path d="M1360 336 L380 230 L380 420 Z" fill="url(#ln-beam)" opacity="0.6" />
      </g>
      <g transform="translate(1300 230) scale(1.1)"><Tower /></g>
      {/* the sea */}
      <path d="M0 650 Q200 620 400 650 T800 650 T1200 650 V900 H0 Z" fill={LN.sea} />
      <path className="ln-wave" d="M0 700 Q100 680 200 700 T400 700 T600 700 T800 700 T1000 700 T1200 700 T1400 700 T1600 700" stroke={LN.seaLight} strokeWidth="10" fill="none" />
      <path className="ln-wave w2" d="M-100 780 Q0 760 100 780 T300 780 T500 780 T700 780 T900 780 T1100 780 T1300 780 T1500 780 T1700 780" stroke={LN.seaLight} strokeWidth="8" fill="none" opacity="0.7" />
      {/* the harbour wall */}
      <path d="M0 610 H460 V650 H0 Z" fill={LN.stormLight} {...S} strokeWidth={5} />
      <path d="M60 610 V650 M140 610 V650 M220 610 V650 M300 610 V650 M380 610 V650" stroke={INK} strokeWidth="3" opacity="0.4" />
    </svg>
  );
}

/** The outro: the same harbour at dawn, calm water, ships moored inside the wall. */
export function DawnHarbour() {
  return (
    <svg className="scene-bg ln-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ln-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={LN.dawnSky} /><stop offset="1" stopColor={LN.dawn} /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ln-dawn)" />
      <circle cx="420" cy="560" r="90" fill="#FFE7A8" opacity="0.9" />
      <path d="M1080 640 Q1160 520 1300 500 Q1440 480 1600 520 V900 H1040 Z" fill={LN.grass} {...S} strokeWidth={6} />
      <g transform="translate(1300 230) scale(1.1)"><Tower lit={false} /></g>
      <path d="M0 650 Q200 640 400 650 T800 650 T1200 650 V900 H0 Z" fill={LN.seaLight} />
      <path d="M0 610 H760 V650 H0 Z" fill={LN.stormLight} {...S} strokeWidth={5} />
      <g transform="translate(90 560)"><Ship colour="#4FB3E8" /></g>
      <g transform="translate(250 560)"><Ship colour="#7DBE6E" /></g>
      <g transform="translate(410 560)"><Ship colour="#FF8FB1" /></g>
      <g transform="translate(570 548) scale(0.9)"><BobboBoat /></g>
    </svg>
  );
}

/** Inside the lamp room: big lens, the window onto the storm, Hoot's chart table. */
export function LampRoom() {
  return (
    <svg className="scene-bg ln-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="1600" height="900" fill={LN.night} />
      <g transform="translate(200 80)">
        <rect width="1200" height="520" rx="20" fill={LN.storm} stroke={INK} strokeWidth="10" />
        <path d="M300 0 V520 M600 0 V520 M900 0 V520" stroke={INK} strokeWidth="10" />
        <Rain />
      </g>
      <g transform="translate(800 470)">
        <ellipse cx="0" cy="0" rx="150" ry="190" fill={LN.lamp} opacity="0.35" />
        <ellipse cx="0" cy="0" rx="110" ry="150" fill={LN.lampSoft} stroke={INK} strokeWidth="8" />
        <path d="M-110 -40 H110 M-110 40 H110 M-90 -100 H90 M-90 100 H90" stroke={LN.lamp} strokeWidth="8" />
      </g>
      <rect x="0" y="700" width="1600" height="200" fill={LN.wood} stroke={INK} strokeWidth="8" />
      <g transform="translate(140 640) rotate(-4)">
        <rect width="300" height="90" rx="6" fill={LN.paper} stroke={INK} strokeWidth="6" />
        <path d="M30 60 Q90 20 150 50 T270 30" stroke="#C06A1E" strokeWidth="5" fill="none" strokeDasharray="12 8" />
      </g>
    </svg>
  );
}

/** Keeper's Lamp sticker (the world's achievement). */
export function KeepersLampSticker() {
  return (
    <svg viewBox="0 0 200 200" className="ln-sticker" role="img" aria-label="Keeper's Lamp sticker">
      <circle cx="100" cy="100" r="92" fill={LN.night} stroke={INK} strokeWidth="8" />
      <path d="M100 96 L20 60 L20 132 Z" fill={LN.lampSoft} opacity="0.55" />
      <path d="M100 96 L180 60 L180 132 Z" fill={LN.lampSoft} opacity="0.55" />
      <g transform="translate(70 34) scale(0.5)"><Tower /></g>
      <path d="M40 168 Q100 150 160 168" stroke={LN.seaLight} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M150 40 l6 12 l13 2 l-10 9 l3 13 l-12 -7 l-12 7 l3 -13 l-10 -9 l13 -2 Z" fill={LN.lamp} stroke={INK} strokeWidth="3" />
    </svg>
  );
}

/** Prompt icons / object art by kind. */
export function LnObject({ kind }: { kind: string }) {
  const body = (() => {
    switch (kind) {
      case "compass":
        return (
          <g>
            <circle cx="50" cy="50" r="38" fill={LN.paper} {...S} />
            <path d="M50 16 L58 50 L50 84 L42 50 Z" fill={LN.red} stroke={INK} strokeWidth="3" />
            <path d="M50 50 L58 50 L50 84 L42 50 Z" fill={LN.white} stroke={INK} strokeWidth="3" />
          </g>
        );
      case "tower":
        return <g transform="translate(26 4) scale(0.32)"><Tower /></g>;
      case "chart":
      case "crates":
        return (
          <g>
            <rect x="12" y="20" width="76" height="60" rx="4" fill={LN.paper} {...S} />
            <path d="M22 62 Q40 36 58 52 T80 34" stroke="#C06A1E" strokeWidth="4" fill="none" strokeDasharray="8 6" />
          </g>
        );
      case "grid":
        return (
          <g>
            <rect x="12" y="12" width="76" height="76" rx="4" fill="#fff" {...S} strokeWidth={4} />
            <path d="M31 12 V88 M50 12 V88 M69 12 V88 M12 31 H88 M12 50 H88 M12 69 H88" stroke="#C3D2DE" strokeWidth="2" />
            <path d="M18 80 L82 22" stroke={LN.red} strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      case "boat":
        return <g transform="translate(4 6) scale(0.92)"><BobboBoat /></g>;
      default:
        return (
          <g>
            <path d="M50 54 L94 30 L94 78 Z" fill={LN.lamp} opacity="0.8" />
            <g transform="translate(22 6) scale(0.3)"><Tower /></g>
          </g>
        );
    }
  })();
  return <svg viewBox="0 0 100 100" className="ln-icon" aria-hidden="true">{body}</svg>;
}

export const NoBasket = () => <span className="ln-nobasket" aria-hidden="true" />;
