import { memo } from "react";
import { Yonder } from "../../characters/library";
import type { MascotState } from "../../engine/types";
import {
  CONTINENTS, type ContinentId, LAND, MAP_H, MAP_W, OCEANS, OCEAN_AREAS, type OceanId, type SceneKind, parallel, pathOf, placeById, worldOutline,
} from "./geo";
import type { Feature } from "./island";

/**
 * Yonder's Postcard Trip — original SVG art. Map shapes come from ./geo (hand-typed coordinates, Equal Earth);
 * landmarks are simple daylight drawings of real places with no people, so nothing can read as a costume or a
 * caricature. Palette: Yonder's brown #A8714A, ocean #4FA3E3, land #8CCB5E, ink #2B2140.
 */
const INK = "#2B2140";

// ---------------------------------------------------------------- scene background (Postcard Port)

export function PortBackground() {
  return (
    <svg className="scene-bg pc-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="pc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9AD8FF" />
          <stop offset="0.65" stopColor="#DDF1FF" />
          <stop offset="1" stopColor="#FFF4DE" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#pc-sky)" />
      <g className="cloud" fill="#fff" opacity="0.9"><ellipse cx="240" cy="140" rx="120" ry="34" /><ellipse cx="300" cy="118" rx="66" ry="38" /></g>
      <g className="cloud c2" fill="#fff" opacity="0.85"><ellipse cx="1290" cy="100" rx="130" ry="38" /><ellipse cx="1220" cy="84" rx="66" ry="34" /></g>
      {/* a far-off balloon and the sea with a little harbour */}
      <g transform="translate(1060 210) scale(0.9)" opacity="0.85"><BalloonShape /></g>
      <path d="M0 700 C200 680 420 712 640 694 C880 676 1100 712 1320 692 C1450 682 1540 690 1600 696 V900 H0 Z" fill="#7CC4F0" />
      <path d="M0 760 C240 744 470 772 720 756 C960 740 1200 772 1600 752 V900 H0 Z" fill="#5FB0E6" />
      <path d="M0 640 C90 610 190 616 260 650 C300 672 330 700 340 720 H0 Z" fill="#E9D3A4" />
      <path d="M1600 630 C1500 600 1400 610 1330 650 C1290 672 1270 700 1262 722 H1600 Z" fill="#9BD07A" />
      <g stroke={INK} strokeWidth="4" fill="#fff">
        <rect x="1460" y="520" width="40" height="120" rx="8" />
        <path d="M1452 520 h56 l-10 -26 h-36 Z" fill="#E5484D" />
        <rect x="1460" y="560" width="40" height="18" fill="#E5484D" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- compass rose

export function CompassRose({ glow = false, size = "100%" }: { glow?: boolean; size?: string | number }) {
  return (
    <svg className={`pc-rose ${glow ? "is-glow" : ""}`} viewBox="-60 -60 120 120" width={size} height={size} aria-hidden="true">
      <circle r="50" fill="#FFF8E7" stroke={INK} strokeWidth="4" />
      <circle r="38" fill="none" stroke="#E6D3AE" strokeWidth="3" />
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M0 -44 L9 -9 L0 0 Z" fill="#E5484D" />
        <path d="M0 -44 L-9 -9 L0 0 Z" fill="#F58A8D" />
        <path d="M44 0 L9 9 L0 0 Z" fill="#4FA3E3" />
        <path d="M44 0 L9 -9 L0 0 Z" fill="#9CCDF2" />
        <path d="M0 44 L-9 9 L0 0 Z" fill="#4FA3E3" />
        <path d="M0 44 L9 9 L0 0 Z" fill="#9CCDF2" />
        <path d="M-44 0 L-9 -9 L0 0 Z" fill="#4FA3E3" />
        <path d="M-44 0 L-9 9 L0 0 Z" fill="#9CCDF2" />
      </g>
      <circle r="5" fill={INK} />
    </svg>
  );
}

// ---------------------------------------------------------------- island map symbols (a map key style)

export function FeatureSymbol({ f }: { f: Feature }) {
  return (
    <svg className="pc-sym" viewBox="0 0 64 64" aria-hidden="true">
      <g stroke={INK} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        {f === "lighthouse" && (
          <>
            <path d="M8 18 L22 24 M8 30 L22 27 M56 18 L42 24 M56 30 L42 27" stroke="#F2B200" strokeWidth="3" />
            <path d="M24 56 L27 22 H37 L40 56 Z" fill="#fff" />
            <path d="M25.6 40 H38.4 L39.2 48 H24.8 Z M26.6 28 H37.4 L37.8 34 H26.2 Z" fill="#E5484D" />
            <rect x="25" y="14" width="14" height="9" rx="2" fill="#FFE27A" />
            <path d="M23 14 L32 6 L41 14 Z" fill="#E5484D" />
            <path d="M18 57 H46" />
          </>
        )}
        {f === "forest" && (
          <>
            <path d="M18 54 V44 M32 56 V46 M46 54 V44" stroke="#7E512F" strokeWidth="4" />
            <circle cx="18" cy="34" r="12" fill="#4FAE5A" />
            <circle cx="46" cy="34" r="12" fill="#4FAE5A" />
            <circle cx="32" cy="26" r="15" fill="#6BCB77" />
          </>
        )}
        {f === "cave" && (
          <>
            <path d="M6 56 C10 30 22 12 32 12 C44 12 56 32 58 56 Z" fill="#A9A2B8" />
            <path d="M20 56 C21 42 26 34 32 34 C38 34 43 42 44 56 Z" fill="#2B2140" />
            <path d="M16 26 L22 22 M42 22 L48 28" stroke="#fff" strokeOpacity="0.7" />
          </>
        )}
        {f === "bridge" && (
          <>
            <path d="M2 50 C14 46 22 54 32 50 C42 46 50 54 62 50 V60 H2 Z" fill="#4FA3E3" />
            <path d="M4 40 C14 22 50 22 60 40 V46 H50 C46 36 18 36 14 46 H4 Z" fill="#C98A5C" />
            <path d="M6 30 H58" stroke="#7E512F" />
            <path d="M14 30 V26 M24 30 V25 M32 30 V24 M40 30 V25 M50 30 V26" stroke="#7E512F" />
          </>
        )}
        {f === "beach" && (
          <>
            <path d="M2 34 C14 30 22 38 32 34 C42 30 52 38 62 34 V62 H2 Z" fill="#4FA3E3" />
            <path d="M2 46 C20 36 44 36 62 46 V62 H2 Z" fill="#F4D58D" />
            <path d="M40 46 L44 20" stroke={INK} />
            <path d="M30 22 C34 10 54 10 58 22 Z" fill="#FF8FB1" />
            <circle cx="20" cy="52" r="3.4" fill="#fff" />
          </>
        )}
        {f === "house" && (
          <>
            <path d="M14 30 V56 H50 V30" fill="#FFF1D0" />
            <path d="M8 32 L32 10 L56 32 Z" fill="#E5484D" />
            <rect x="27" y="40" width="11" height="16" rx="2" fill="#A8714A" />
            <rect x="17" y="36" width="8" height="8" rx="1.5" fill="#9CCDF2" />
          </>
        )}
        {f === "mountain" && (
          <>
            <path d="M2 56 L22 18 L34 36 L44 24 L62 56 Z" fill="#8C8FA8" />
            <path d="M15 31 L22 18 L29 29 L25 27 L21 31 Z M40 30 L44 24 L49 32 L45 31 Z" fill="#fff" />
          </>
        )}
        {f === "lake" && (
          <>
            <ellipse cx="32" cy="38" rx="27" ry="16" fill="#4FA3E3" />
            <path d="M18 36 C24 33 28 39 34 36 M30 44 C36 41 40 47 46 44" stroke="#fff" strokeOpacity="0.8" />
            <path d="M8 26 V16 M12 26 V12 M54 28 V18" stroke="#4FAE5A" strokeWidth="3.4" />
          </>
        )}
      </g>
    </svg>
  );
}

/** The island ground under the 6×6 grid: grass with a sandy shore and the sea around it. */
export function IslandGround() {
  return (
    <svg className="pc-island-ground" viewBox="0 0 120 120" preserveAspectRatio="none" aria-hidden="true">
      <rect width="120" height="120" fill="#7CC4F0" />
      <path d="M6 14 C6 6 14 4 24 5 C46 2 70 6 96 4 C110 3 116 8 115 20 C118 46 113 72 116 98 C117 112 110 116 98 115 C72 118 46 113 22 116 C9 117 4 110 5 96 C2 70 7 42 6 14 Z" fill="#F0DCA8" />
      <path d="M10 18 C10 11 16 9 26 10 C48 7 70 11 94 9 C106 8 111 13 110 22 C113 46 108 72 111 94 C112 106 106 110 96 110 C72 113 46 108 24 111 C14 112 9 106 10 96 C7 70 12 44 10 18 Z" fill="#9BD07A" />
    </svg>
  );
}

// ---------------------------------------------------------------- travellers

function BalloonShape() {
  return (
    <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
      <path d="M0 -70 C40 -70 60 -40 52 -10 C46 12 18 30 10 44 H-10 C-18 30 -46 12 -52 -10 C-60 -40 -40 -70 0 -70 Z" fill="#FFD43B" />
      <path d="M0 -70 C18 -60 22 -10 10 44 M0 -70 C-18 -60 -22 -10 -10 44" fill="none" />
      <path d="M-50 -14 C-20 -2 20 -2 50 -14" fill="none" stroke="#E5484D" strokeWidth="9" />
      <path d="M-10 44 L-14 60 M10 44 L14 60" />
      <rect x="-18" y="58" width="36" height="22" rx="5" fill="#C98A5C" />
    </g>
  );
}
/** Yonder's balloon (Yonder rides in the basket). */
export function Balloon() {
  return (
    <span className="pc-balloon-art">
      <svg viewBox="-60 -74 120 160" aria-hidden="true"><BalloonShape /></svg>
      <span className="pc-balloon-rider"><Yonder state="greeting" size="100%" /></span>
    </span>
  );
}
export function Boat({ small = false }: { small?: boolean }) {
  return (
    <svg className={`pc-boat-art ${small ? "is-small" : ""}`} viewBox="0 0 100 90" aria-hidden="true">
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M48 8 V62" />
        <path d="M52 12 C70 24 78 40 80 56 H52 Z" fill="#fff" />
        <path d="M44 20 C32 30 26 44 24 56 H44 Z" fill="#FFD43B" />
        <path d="M48 8 L62 12 L48 17 Z" fill="#E5484D" />
        <path d="M10 62 H90 L80 80 H22 Z" fill="#A8714A" />
        <circle cx="36" cy="70" r="3.5" fill="#FFF1D0" />
        <circle cx="52" cy="70" r="3.5" fill="#FFF1D0" />
        <circle cx="68" cy="70" r="3.5" fill="#FFF1D0" />
      </g>
    </svg>
  );
}
export function PinIcon() {
  return (
    <svg className="pc-pin-art" viewBox="0 0 40 52" aria-hidden="true">
      <path d="M20 50 C14 38 4 30 4 19 C4 10 11 4 20 4 C29 4 36 10 36 19 C36 30 26 38 20 50 Z" fill="#E5484D" stroke={INK} strokeWidth="3.5" />
      <circle cx="20" cy="19" r="6.5" fill="#fff" stroke={INK} strokeWidth="3" />
    </svg>
  );
}

// ---------------------------------------------------------------- postcard scenes (real places, daylight, no people)

const SKY = <rect width="100" height="64" fill="#BFE6FF" />;
export function Scene({ kind }: { kind: SceneKind }) {
  return (
    <svg className="pc-scene" viewBox="0 0 100 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {kind === "penguins" ? <rect width="100" height="64" fill="#D9EEFF" /> : SKY}
      <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        {kind === "lake" && (<>
          <path d="M0 40 L22 12 L36 30 L52 8 L74 34 L86 22 L100 36 V64 H0 Z" fill="#8C8FA8" />
          <path d="M18 17 L22 12 L26 18 Z M48 13 L52 8 L57 15 Z" fill="#fff" />
          <path d="M0 44 H100 V64 H0 Z" fill="#3FB6C9" />
          <path d="M6 44 l4 -12 l4 12 Z M86 44 l4 -14 l4 14 Z M78 44 l3 -9 l3 9 Z" fill="#2E8B57" />
        </>)}
        {kind === "canyon" && (<>
          <rect width="100" height="64" fill="#FFD9A8" />
          <path d="M0 20 H30 L36 34 L44 36 L48 52 H52 L56 36 L64 34 L70 20 H100 V64 H0 Z" fill="#D9733F" />
          <path d="M0 32 H26 M74 32 H100 M0 44 H40 M60 44 H100" stroke="#A84E2A" />
          <path d="M47 56 C49 52 51 52 53 56" fill="none" stroke="#4FA3E3" strokeWidth="2.4" />
        </>)}
        {kind === "steps" && (<>
          <path d="M0 52 H100 V64 H0 Z" fill="#8CCB5E" />
          <path d="M22 52 V44 H28 V36 H34 V28 H40 V20 H60 V28 H66 V36 H72 V44 H78 V52 Z" fill="#D8C7A0" />
          <rect x="44" y="12" width="12" height="8" fill="#C9B489" />
          <path d="M46 52 V24 H54 V52" fill="#C9B489" />
        </>)}
        {kind === "terraces" && (<>
          <path d="M0 64 V30 L18 14 L30 22 L44 6 L62 20 L78 10 L100 28 V64 Z" fill="#4FAE5A" />
          <path d="M60 4 L68 0 L78 10 L70 14 Z" fill="#3E8E4C" />
          <path d="M8 44 H60 M14 50 H70 M22 56 H80" stroke="#2E7D3E" />
          <path d="M30 38 h8 v-5 h-8 Z M42 38 h8 v-5 h-8 Z M54 38 h8 v-5 h-8 Z" fill="#D8C7A0" />
        </>)}
        {kind === "rainforest" && (<>
          <rect width="100" height="64" fill="#9FE0A8" />
          <path d="M0 50 C30 40 70 58 100 46 V64 H0 Z" fill="#7A5A3A" />
          <path d="M0 54 C30 46 70 62 100 52" fill="none" stroke="#4FA3E3" strokeWidth="5" />
          <circle cx="14" cy="26" r="14" fill="#2E8B57" /><circle cx="38" cy="18" r="16" fill="#3FA864" />
          <circle cx="64" cy="24" r="15" fill="#2E8B57" /><circle cx="88" cy="18" r="14" fill="#3FA864" />
          <path d="M70 34 c2 -3 7 -3 8 1 l6 1 l-6 2 c-2 3 -7 2 -8 -1 Z" fill="#FFD43B" />
        </>)}
        {kind === "glacier" && (<>
          <path d="M0 34 L20 10 L34 26 L50 6 L68 24 L84 12 L100 30 V64 H0 Z" fill="#8C8FA8" />
          <path d="M30 64 L40 30 L56 28 L70 64 Z" fill="#E8F6FF" />
          <path d="M40 40 L46 46 M52 36 L58 44 M44 52 L50 58" stroke="#9CCDF2" />
          <path d="M0 50 H34 L30 64 H0 Z M70 64 L66 50 H100 V64 Z" fill="#5FB0E6" />
        </>)}
        {kind === "tower" && (<>
          <path d="M0 54 H100 V64 H0 Z" fill="#8CCB5E" />
          <path d="M36 54 C42 40 46 26 48 6 H52 C54 26 58 40 64 54 H56 C54 46 46 46 44 54 Z" fill="#9A7B5C" />
          <path d="M42 36 H58 M45 22 H55" stroke={INK} />
        </>)}
        {kind === "arena" && (<>
          <path d="M0 52 H100 V64 H0 Z" fill="#E9D3A4" />
          <path d="M14 52 V22 C30 12 70 12 86 22 V52 Z" fill="#E1B98A" />
          <path d="M14 32 H86 M14 42 H86" />
          <path d="M22 52 v-6 a4 4 0 0 1 8 0 v6 M36 52 v-6 a4 4 0 0 1 8 0 v6 M50 52 v-6 a4 4 0 0 1 8 0 v6 M64 52 v-6 a4 4 0 0 1 8 0 v6" fill="#A87A4C" />
          <path d="M22 30 v-4 M34 30 v-5 M46 30 v-6 M58 30 v-6 M70 30 v-5 M80 30 v-4" />
        </>)}
        {kind === "fjord" && (<>
          <path d="M0 64 V8 L30 18 L40 64 Z M100 64 V10 L70 20 L60 64 Z" fill="#5C8B5C" />
          <path d="M40 64 L34 30 L50 26 L66 30 L60 64 Z" fill="#3FA0D8" />
          <path d="M8 10 L16 13 M84 12 L92 11" stroke="#fff" />
          <path d="M46 46 h8 l-2 4 h-4 Z" fill="#E5484D" />
        </>)}
        {kind === "pyramids" && (<>
          <rect width="100" height="64" fill="#FFE7B0" />
          <path d="M0 50 H100 V64 H0 Z" fill="#EBC77A" />
          <path d="M10 50 L34 16 L58 50 Z" fill="#E0B565" />
          <path d="M46 50 L66 22 L86 50 Z" fill="#D9AA55" />
          <path d="M34 16 L40 50 M66 22 L70 50" stroke="#B88A3A" />
          <circle cx="86" cy="12" r="6" fill="#FFD43B" />
        </>)}
        {kind === "savanna" && (<>
          <rect width="100" height="64" fill="#FFE2A8" />
          <path d="M0 46 H100 V64 H0 Z" fill="#D7B85A" />
          <path d="M66 46 V32 M60 30 C62 24 72 24 74 30 Z" fill="#6E8B3D" />
          <path d="M26 52 L28 40 M34 52 L36 40 M24 40 C24 34 38 34 40 40 L42 22 L46 18 L48 22 L44 24 L42 40" fill="#F2B54B" />
          <circle cx="30" cy="38" r="1.6" fill="#8A5A2B" /><circle cx="36" cy="36" r="1.6" fill="#8A5A2B" />
        </>)}
        {kind === "tablemountain" && (<>
          <path d="M8 46 L20 20 H76 L90 46 Z" fill="#8C8FA8" />
          <path d="M20 20 H76" stroke="#fff" strokeWidth="3" />
          <path d="M0 46 H100 V64 H0 Z" fill="#3FA0D8" />
          <path d="M10 46 h20 v-4 h-20 Z M60 46 h14 v-5 h-14 Z" fill="#fff" />
        </>)}
        {kind === "lemur" && (<>
          <rect width="100" height="64" fill="#CBEFC0" />
          <path d="M0 40 H100" stroke="#7E512F" strokeWidth="4" />
          <ellipse cx="44" cy="34" rx="10" ry="7" fill="#B8B4C4" />
          <circle cx="34" cy="28" r="6" fill="#B8B4C4" />
          <circle cx="32" cy="27" r="2" fill="#FFD43B" /><circle cx="36.5" cy="27" r="2" fill="#FFD43B" />
          <path d="M54 34 C66 30 70 18 64 8" fill="none" stroke="#fff" strokeWidth="6" />
          <path d="M54 34 C66 30 70 18 64 8" fill="none" stroke={INK} strokeWidth="6" strokeDasharray="3 3" />
        </>)}
        {kind === "fuji" && (<>
          <path d="M0 56 L34 14 C40 8 60 8 66 14 L100 56 V64 H0 Z" fill="#6C7BA8" />
          <path d="M34 14 C40 8 60 8 66 14 L60 22 L54 18 L48 24 L42 18 L38 22 Z" fill="#fff" />
          <path d="M0 54 H100 V64 H0 Z" fill="#8CCB5E" />
          <circle cx="82" cy="14" r="6" fill="#FF8FB1" />
        </>)}
        {kind === "wall" && (<>
          <path d="M0 64 V36 C20 22 34 30 50 24 C66 18 80 30 100 22 V64 Z" fill="#5FAE5F" />
          <path d="M0 44 C20 30 34 38 50 32 C66 26 80 38 100 30 L100 38 C80 46 66 34 50 40 C34 46 20 38 0 52 Z" fill="#C9B489" />
          <rect x="44" y="24" width="10" height="10" fill="#C9B489" />
        </>)}
        {kind === "dome" && (<>
          <path d="M0 54 H100 V64 H0 Z" fill="#9CCDF2" />
          <path d="M26 54 V34 H74 V54 Z" fill="#F7F3EA" />
          <path d="M38 34 C38 18 62 18 62 34 Z" fill="#F7F3EA" />
          <path d="M50 18 V12" />
          <path d="M18 54 V24 M82 54 V24" strokeWidth="2.6" />
          <path d="M44 54 v-10 a6 6 0 0 1 12 0 v10" fill="#E6DCC8" />
        </>)}
        {kind === "ricefields" && (<>
          <path d="M0 64 V22 C30 14 70 30 100 18 V64 Z" fill="#7FCB5E" />
          <path d="M0 32 C30 24 70 40 100 28 M0 42 C30 34 70 50 100 38 M0 52 C30 44 70 60 100 48" fill="none" stroke="#4E9A3A" />
          <path d="M84 18 l6 -12 l6 12 Z" fill="#2E8B57" />
        </>)}
        {kind === "opera" && (<>
          <path d="M0 50 H100 V64 H0 Z" fill="#3FA0D8" />
          <path d="M20 50 H84 V46 H20 Z" fill="#E9D3A4" />
          <path d="M26 46 C28 30 36 22 44 20 L42 46 Z M42 46 C46 30 54 22 62 20 L60 46 Z M60 46 C64 34 70 28 78 26 L76 46 Z" fill="#fff" />
        </>)}
        {kind === "reef" && (<>
          <rect width="100" height="64" fill="#3FB6C9" />
          <path d="M0 56 C20 50 40 58 60 52 C80 46 90 54 100 50 V64 H0 Z" fill="#F4D58D" />
          <path d="M16 56 V44 M16 48 L10 40 M16 46 L22 38" stroke="#FF6B6B" strokeWidth="3" />
          <path d="M74 52 C70 44 78 40 80 46 C84 40 90 46 84 52 Z" fill="#B58CE0" />
          <path d="M38 26 c6 -6 14 -6 18 0 c-4 6 -12 6 -18 0 Z M56 26 l6 -4 v8 Z" fill="#FFD43B" />
        </>)}
        {kind === "penguins" && (<>
          <path d="M0 48 C30 42 70 52 100 46 V64 H0 Z" fill="#fff" />
          <path d="M60 46 V30 H86 V46 Z" fill="#E5484D" />
          <path d="M58 30 L73 20 L88 30 Z" fill="#B23A3E" />
          <ellipse cx="22" cy="44" rx="7" ry="11" fill={INK} /><ellipse cx="22" cy="46" rx="4.5" ry="8" fill="#fff" />
          <ellipse cx="38" cy="46" rx="6" ry="9" fill={INK} /><ellipse cx="38" cy="48" rx="3.6" ry="6.4" fill="#fff" />
          <path d="M20 34 l2 3 l2 -3 M36 37 l2 2.6 l2 -2.6" fill="#FFB347" />
        </>)}
      </g>
    </svg>
  );
}

/** A postcard: the place scene, a stamp and a little pen-pal drawing in the corner. */
export function Postcard({ placeId, label }: { placeId: string; label?: string }) {
  const p = placeById(placeId);
  return (
    <span className="pc-postcard-art">
      <span className="pc-postcard-scene">{p && <Scene kind={p.scene} />}</span>
      <span className="pc-stamp" aria-hidden="true">
        <svg viewBox="0 0 20 24"><rect x="1" y="1" width="18" height="22" rx="2" fill="#fff" stroke={INK} strokeWidth="1.5" strokeDasharray="2 1.5" /><circle cx="10" cy="11" r="5" fill="#4FA3E3" /><path d="M7 10 c2 -3 5 -1 6 1 c-1 2 -4 3 -6 -1 Z" fill="#8CCB5E" /></svg>
      </span>
      {label && <span className="pc-postcard-label">{label}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- the world map

export const CONTINENT_FILL: Record<ContinentId, string> = {
  na: "#F7C948", sa: "#8CCB5E", europe: "#B58CE0", africa: "#F29E4C", asia: "#EE7A87", australia: "#5FC6B8", antarctica: "#F4F8FF",
};
const LAND_D = Object.fromEntries(CONTINENTS.map((c) => [c, LAND[c].map(pathOf).join("")])) as Record<ContinentId, string>;
const OCEAN_D = Object.fromEntries(OCEANS.map((o) => [o, OCEAN_AREAS[o].map(pathOf).join("")])) as Record<OceanId, string>;
const OUTLINE = worldOutline();

export interface WorldMapProps {
  /** Which regions react to taps / drops. */
  active: "continents" | "oceans" | "none";
  equator?: boolean;
  dim?: readonly string[];
  glow?: readonly string[];
  /** A soft highlight over part of the map (first-miss hint): [x, y, w, h] in map units. */
  area?: readonly [number, number, number, number] | null;
  hot?: string | null;
  onRegion?: (r: string) => void;
}
export const WorldMap = memo(function WorldMap({ active, equator = false, dim = [], glow = [], area = null, hot = null, onRegion }: WorldMapProps) {
  const cls = (r: string) => `${dim.includes(r) ? "is-out" : ""} ${glow.includes(r) ? "is-model" : ""} ${hot === r ? "is-hot" : ""}`;
  return (
    <svg className={`pc-world active-${active}`} viewBox={`-4 -4 ${MAP_W + 8} ${MAP_H + 8}`} aria-hidden="true">
      <defs>
        <clipPath id="pc-world-clip"><path d={OUTLINE} /></clipPath>
      </defs>
      <path d={OUTLINE} fill="#9FD3F5" stroke={INK} strokeWidth="2.4" />
      <g clipPath="url(#pc-world-clip)">
        <g className="pc-oceans">
          {OCEANS.map((o) => (
            <path key={o} d={OCEAN_D[o]} className={`pc-ocean ${cls(o)}`} data-region={active === "oceans" ? o : undefined} data-ocean={o}
              onClick={active === "oceans" ? () => onRegion?.(o) : undefined} />
          ))}
        </g>
        {[-60, -30, 30, 60].map((lat) => <path key={lat} d={parallel(lat)} className="pc-graticule" />)}
        {area && <rect className="pc-area" x={area[0]} y={area[1]} width={area[2]} height={area[3]} rx="14" />}
        <g className="pc-lands">
          {CONTINENTS.map((c) => (
            <path key={c} d={LAND_D[c]} fill={CONTINENT_FILL[c]} className={`pc-land ${cls(c)}`} data-continent={c}
              data-region={active === "continents" ? c : active === "oceans" ? "land" : undefined}
              onClick={active === "continents" ? () => onRegion?.(c) : undefined} />
          ))}
        </g>
        {equator && <path d={parallel(0)} className="pc-equator" />}
      </g>
    </svg>
  );
});

// ---------------------------------------------------------------- reward, mascot, prompt icons

export function ExplorerSticker() {
  return (
    <svg className="pc-sticker" viewBox="0 0 200 200" role="img" aria-label="Explorer Sticker: a globe with a compass rose">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="100" cy="100" r="74" fill="#4FA3E3" stroke={INK} strokeWidth="5" />
      <g fill="#8CCB5E" stroke={INK} strokeWidth="4">
        <path d="M52 70 C66 56 90 60 92 76 C94 92 76 96 78 110 C80 124 62 128 56 114 C50 100 40 84 52 70 Z" />
        <path d="M112 108 C124 100 142 106 144 120 C146 134 132 148 120 146 C108 144 102 132 104 122 Z" />
        <path d="M118 58 C128 52 146 56 148 66 C150 74 138 78 128 76 Z" />
      </g>
      <g transform="translate(62.8 62.8) scale(0.62)"><CompassRose size={120} /></g>
      <path d="M38 152 L58 136 M162 152 L142 136" stroke="#FFD43B" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
export function YonderMascot({ state, talking, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  return <Yonder state={state} talking={talking} size={size ?? "100%"} />;
}
export function NoBasket() {
  return <span aria-hidden="true" />;
}

/** Prompt icons and option art: compass, key, grid, postcard, boat, balloon, globe, sym-<feature>, pc-<place>. */
export function PostcardObject({ kind }: { kind: string }) {
  if (kind.startsWith("sym-")) return <FeatureSymbol f={kind.slice(4) as Feature} />;
  if (kind.startsWith("pc-")) return <Postcard placeId={kind.slice(3)} />;
  switch (kind) {
    case "boat":
      return <Boat small />;
    case "balloon":
      return <svg viewBox="-60 -74 120 160" aria-hidden="true"><BalloonShape /></svg>;
    case "postcard":
      return <svg viewBox="0 0 64 48" aria-hidden="true"><rect x="3" y="5" width="58" height="38" rx="5" fill="#FFF8E7" stroke={INK} strokeWidth="3.5" /><rect x="44" y="10" width="12" height="14" rx="2" fill="#4FA3E3" stroke={INK} strokeWidth="2.5" /><path d="M10 16 H36 M10 24 H32 M10 32 H38" stroke={INK} strokeWidth="3" strokeLinecap="round" /></svg>;
    case "key":
      return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="6" width="52" height="52" rx="8" fill="#FFF8E7" stroke={INK} strokeWidth="3.5" /><path d="M12 26 L19 14 L26 26 Z" fill="#E5484D" stroke={INK} strokeWidth="2.5" /><circle cx="19" cy="42" r="7" fill="#6BCB77" stroke={INK} strokeWidth="2.5" /><path d="M32 21 H50 M32 42 H50" stroke={INK} strokeWidth="3.5" strokeLinecap="round" /></svg>;
    case "grid":
      return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="6" width="52" height="52" rx="6" fill="#9BD07A" stroke={INK} strokeWidth="3.5" /><path d="M23 6 V58 M41 6 V58 M6 23 H58 M6 41 H58" stroke={INK} strokeWidth="2.5" /><rect x="23" y="23" width="18" height="18" fill="#FFD43B" stroke={INK} strokeWidth="3" /></svg>;
    case "globe":
      return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="#4FA3E3" stroke={INK} strokeWidth="3.5" /><path d="M16 22 C22 16 30 18 30 26 C30 32 22 34 20 30 Z M36 36 C42 32 50 36 48 44 C46 50 38 50 36 44 Z" fill="#8CCB5E" stroke={INK} strokeWidth="2.5" /><path d="M6 32 H58" stroke="#E5484D" strokeWidth="3.5" strokeDasharray="5 3" /></svg>;
    default:
      return <CompassRose />;
  }
}
