import { Rumble } from "../../characters/Crew";
import { CREW, INK } from "../../characters/palette";
import type { MascotState } from "../../engine/types";

/** Original art for Cookie Kitchen ("Rumble's Cookie Party"). Critter Crew style: ink outlines, flat fills, soft highlights. */

/** Bumpy, hand-baked cookie outline (deterministic). */
const COOKIE_EDGE = (() => {
  const pts: string[] = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 38 + (i % 2 === 0 ? 1.6 : -1.2) + ((i * 7) % 5 === 0 ? 1.4 : 0);
    pts.push(`${(50 + Math.cos(a) * r).toFixed(1)} ${(52 + Math.sin(a) * r * 0.97).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
})();

const CHIPS: [number, number, number][] = [[36, 38, 0], [58, 34, 30], [46, 54, 70], [66, 56, 10], [32, 62, 50], [54, 72, 90], [70, 42, 40]];

export function CookieArt({ kind: _kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="ck-cookie-art">
      <path d={COOKIE_EDGE} fill="#D9893F" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="51" rx="31" ry="29" fill="#F0B163" />
      <ellipse cx="46" cy="46" rx="20" ry="16" fill="#F7C57E" opacity="0.8" />
      {CHIPS.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d="M-5 2 Q-5 -4 0 -5 Q5 -4 5 2 Q0 5 -5 2 Z" fill="#5B321C" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
      <path d="M24 40 Q28 28 40 24" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** A party plate seen from the front (sits on the table). */
export function PlateArt({ tint = "#8FD0FF" }: { tint?: string }) {
  return (
    <svg viewBox="0 0 200 64" aria-hidden="true" className="ck-plate-art" preserveAspectRatio="none">
      <ellipse cx="100" cy="38" rx="94" ry="22" fill={INK} opacity="0.16" />
      <ellipse cx="100" cy="30" rx="94" ry="26" fill="#fff" stroke={INK} strokeWidth="5" />
      <ellipse cx="100" cy="30" rx="80" ry="19" fill="none" stroke={tint} strokeWidth="5" strokeDasharray="10 8" />
      <ellipse cx="100" cy="31" rx="58" ry="12" fill="#EEF3FA" />
    </svg>
  );
}

/** Rumble's baking tray handles + rim (the cookies sit on it as buttons, laid out by CSS). */
export function BakingTray() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true" className="ck-baking-art">
      <rect x="8" y="10" width="384" height="180" rx="26" fill="#B7C1D3" stroke={INK} strokeWidth="6" />
      <rect x="24" y="24" width="352" height="152" rx="16" fill="#DCE3EE" />
      <path d="M40 34 L360 34" stroke="#fff" strokeOpacity="0.8" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Chef's hat, drawn in Rumble's 200×230 coordinate space so it rides along with his body animation. */
function ChefHat() {
  return (
    <g>
      {/* invisible box matching Rumble's body bounds keeps transform-origin identical to his body group */}
      <rect x="30" y="42" width="140" height="166" fill="transparent" />
      <path d="M62 86 C40 82 36 50 60 46 C58 20 92 10 100 28 C110 8 144 20 140 46 C164 48 162 84 138 86 Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M74 44 C78 34 86 30 94 32" fill="none" stroke="#DCE3EE" strokeWidth="5" strokeLinecap="round" />
      <rect x="60" y="70" width="80" height="22" rx="9" fill="#fff" stroke={INK} strokeWidth="5" />
      <path d="M66 82 L134 82" stroke="#DCE3EE" strokeWidth="4" />
      <path d="M100 42 L105 52 L116 53 L108 60 L110 71 L100 65 L90 71 L92 60 L84 53 L95 52 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </g>
  );
}

/** Rumble as the party chef: the shared Rumble character with an overlaid chef's hat (same viewBox + animation classes). */
export function ChefRumble({ state = "idle", talking = false, size = 160 }: { state?: MascotState; talking?: boolean; size?: number | string }) {
  return (
    <div className="ck-chef">
      <Rumble state={state} talking={talking} size={size} />
      <svg className={`critter ck-chef-hat state-${state} ${talking ? "is-talking" : ""}`} viewBox="0 0 200 230" width={size} aria-hidden="true">
        <g className="critter-body"><ChefHat /></g>
      </svg>
    </div>
  );
}

const DOTS = Array.from({ length: 13 * 8 }, (_, i) => ({ x: (i % 13) * 128 + (Math.floor(i / 13) % 2 ? 64 : 0) + 24, y: Math.floor(i / 13) * 96 + 20 }));

export function KitchenBackground() {
  return (
    <svg className="scene-bg ck-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ck-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2566B" />
          <stop offset="1" stopColor="#D63A55" />
        </linearGradient>
        <linearGradient id="ck-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241A5C" />
          <stop offset="1" stopColor="#5B47A8" />
        </linearGradient>
        <radialGradient id="ck-ovenglow" cx="0.5" cy="0.65" r="0.7">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="0.55" stopColor="#FFA43B" />
          <stop offset="1" stopColor="#E8562A" />
        </radialGradient>
        <radialGradient id="ck-lamp" cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#FFF1C2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF1C2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ck-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C67A3E" />
          <stop offset="1" stopColor="#8E4E24" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ck-wall)" />
      <g fill="#fff" opacity="0.13">
        {DOTS.map((d) => <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="11" />)}
      </g>
      <ellipse cx="800" cy="40" rx="700" ry="420" fill="url(#ck-lamp)" />

      {/* party bunting */}
      <path d="M0 30 Q400 110 800 40 Q1200 110 1600 30" fill="none" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 15 }, (_, i) => {
        const x = 50 + i * 108;
        const t = (x % 800) / 800;
        const [a, b] = x < 800 ? [30, 40] : [40, 30];
        const y = (1 - t) ** 2 * a + 2 * t * (1 - t) * 110 + t ** 2 * b;
        const colors = [CREW.sparkle, CREW.gloop, CREW.zuzu, "#fff", CREW.bobbo];
        return <path key={i} d={`M${x - 26} ${y} L${x + 26} ${y + 2} L${x} ${y + 52} Z`} fill={colors[i % colors.length]} stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
      })}

      {/* night window with moon */}
      <g transform="translate(600 150)">
        <rect x="-16" y="-10" width="432" height="360" rx="22" fill="#FFF6DA" stroke={INK} strokeWidth="6" />
        <rect x="10" y="16" width="380" height="308" rx="10" fill="url(#ck-night)" />
        <g fill="#fff">
          {[[60, 60], [150, 110], [300, 70], [250, 160], [90, 180], [340, 210], [200, 40]].map(([x, y], i) => (
            <circle key={i} className="twinkle" cx={x} cy={y} r={i % 2 ? 3 : 4.5} style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
        <circle cx="300" cy="120" r="42" fill="#FFF3C0" />
        <circle cx="322" cy="104" r="38" fill="#2C2068" />
        <path d="M10 270 Q100 220 200 262 T390 240 L390 324 L10 324 Z" fill="#3B2D84" />
        <path d="M10 300 Q140 266 260 296 T390 286 L390 324 L10 324 Z" fill="#2A1F66" />
        <rect x="194" y="16" width="12" height="308" fill="#FFF6DA" />
        <rect x="10" y="164" width="380" height="12" fill="#FFF6DA" />
        <rect x="-16" y="-10" width="432" height="360" rx="22" fill="none" stroke={INK} strokeWidth="6" />
        {/* scalloped valance */}
        <path d={`M-40 -30 L440 -30 L440 20 ${Array.from({ length: 8 }, (_, i) => `Q${440 - i * 60 - 30} 58 ${440 - (i + 1) * 60} 20`).join(" ")} Z`} fill="#FFB3C9" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M440 300 L-40 300" stroke="none" />
        <rect x="-36" y="340" width="472" height="22" rx="10" fill="#FFF6DA" stroke={INK} strokeWidth="5" />
      </g>

      {/* oven with cookies baking */}
      <g transform="translate(70 330)">
        <g className="ck-steam" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.55">
          <path d="M120 -10 C100 -40 140 -60 120 -100" />
          <path d="M210 -10 C190 -45 230 -65 210 -110" style={{ animationDelay: "0.8s" }} />
          <path d="M300 -10 C280 -40 320 -60 300 -100" style={{ animationDelay: "1.6s" }} />
        </g>
        <rect x="0" y="0" width="420" height="400" rx="34" fill="#EEF1F7" stroke={INK} strokeWidth="6" />
        <rect x="0" y="0" width="420" height="96" rx="34" fill="#DDE2EC" stroke={INK} strokeWidth="6" />
        {[70, 150, 230].map((x) => (
          <g key={x}><circle cx={x} cy="48" r="22" fill="#8A93B5" stroke={INK} strokeWidth="5" /><path d={`M${x} 30 L${x} 44`} stroke={INK} strokeWidth="5" strokeLinecap="round" /></g>
        ))}
        <rect x="290" y="28" width="104" height="40" rx="12" fill={INK} />
        <circle cx="314" cy="48" r="9" fill="#FF7A3D" className="ck-ovenlight" />
        <circle cx="342" cy="48" r="9" fill="#FFB13D" className="ck-ovenlight" style={{ animationDelay: "0.4s" }} />
        <circle cx="370" cy="48" r="9" fill="#FFE03D" className="ck-ovenlight" style={{ animationDelay: "0.8s" }} />
        <rect x="70" y="118" width="280" height="18" rx="9" fill="#A9B2C8" stroke={INK} strokeWidth="4" />
        <rect x="44" y="160" width="332" height="210" rx="26" fill="#3A2C55" stroke={INK} strokeWidth="6" />
        <rect x="62" y="176" width="296" height="176" rx="18" fill="url(#ck-ovenglow)" className="ck-ovenwin" />
        <rect x="80" y="300" width="260" height="10" rx="5" fill="#9A5A2A" />
        {[120, 190, 260, 300].slice(0, 3).map((x, i) => (
          <g key={x} transform={`translate(${x + i * 10} 268) scale(0.62)`}>
            <ellipse cx="0" cy="0" rx="40" ry="30" fill="#E3A052" stroke={INK} strokeWidth="6" />
            <circle cx="-12" cy="-6" r="5" fill="#5B321C" /><circle cx="12" cy="4" r="5" fill="#5B321C" /><circle cx="2" cy="-14" r="4" fill="#5B321C" />
          </g>
        ))}
        <path d="M80 196 Q120 186 160 192" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="8" strokeLinecap="round" />
      </g>

      {/* shelf with jars, plant and an orange */}
      <g transform="translate(1110 300)">
        <rect x="0" y="120" width="430" height="22" rx="8" fill="#8E4E24" stroke={INK} strokeWidth="5" />
        <path d="M40 142 L60 180 M390 142 L370 180" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        {/* cookie jar */}
        <rect x="26" y="14" width="96" height="106" rx="26" fill="#FFE9B0" stroke={INK} strokeWidth="5" />
        <rect x="34" y="-4" width="80" height="24" rx="8" fill={CREW.zuzu} stroke={INK} strokeWidth="5" />
        <circle cx="74" cy="70" r="26" fill="#E3A052" stroke={INK} strokeWidth="4" />
        <circle cx="66" cy="64" r="4" fill="#5B321C" /><circle cx="82" cy="74" r="4" fill="#5B321C" /><circle cx="72" cy="82" r="3" fill="#5B321C" />
        {/* sprinkles jar */}
        <rect x="146" y="34" width="70" height="86" rx="18" fill="#BDEBDD" stroke={INK} strokeWidth="5" />
        <rect x="150" y="20" width="62" height="20" rx="7" fill={CREW.bobbo} stroke={INK} strokeWidth="5" />
        {[[166, 64, "#FF5E8E"], [190, 76, CREW.rumble], [176, 94, CREW.sparkle], [198, 100, "#FF5E8E"], [162, 104, CREW.zuzu]].map(([x, y, c], i) => (
          <rect key={i} x={Number(x)} y={Number(y)} width="12" height="5" rx="2.5" fill={String(c)} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
        {/* plant */}
        <path d="M262 120 L252 70 L318 70 L308 120 Z" fill="#FF8FB1" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M285 70 C270 30 250 20 238 14 C262 18 282 34 288 62 M285 70 C292 26 312 4 330 -4 C318 18 300 38 292 70 M286 70 C286 44 288 24 284 6" fill="#4CB35E" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        {/* orange */}
        <circle cx="378" cy="94" r="26" fill="#FF9A2E" stroke={INK} strokeWidth="5" />
        <path d="M378 68 Q384 58 394 58" fill="none" stroke="#4CB35E" strokeWidth="6" strokeLinecap="round" />
        <path d="M364 84 Q368 78 374 76" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* hanging utensils */}
      <g transform="translate(1180 520)" stroke={INK} strokeWidth="5">
        <path d="M0 0 L300 0" strokeLinecap="round" />
        <g transform="translate(60 0)"><path d="M0 0 L0 90" /><ellipse cx="0" cy="104" rx="18" ry="22" fill="#B7C1D3" /></g>
        <g transform="translate(150 0)"><path d="M0 0 L0 80" /><path d="M-16 80 L16 80 L12 130 L-12 130 Z" fill="#E3A052" strokeLinejoin="round" /></g>
        <g transform="translate(240 0)"><path d="M0 0 L0 70" /><circle cx="0" cy="96" r="26" fill="none" /><path d="M-16 84 L16 108 M16 84 L-16 108" strokeWidth="4" /></g>
      </g>

      {/* cabinets + counter */}
      <rect x="0" y="690" width="1600" height="210" fill="url(#ck-wood)" />
      <rect x="0" y="676" width="1600" height="30" fill="#F7CF97" stroke={INK} strokeWidth="5" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i}>
          <rect x={20 + i * 180} y="724" width="160" height="200" rx="14" fill="none" stroke="#7A4120" strokeWidth="5" />
          <circle cx={i % 2 ? 40 + i * 180 : 160 + i * 180} cy="790" r="8" fill="#FFD43B" stroke={INK} strokeWidth="3" />
        </g>
      ))}
    </svg>
  );
}

/** Unused by this game's custom board (required skin field). */
export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

export function FairSharerSticker() {
  const plate = (x: number, y: number, tint: string) => (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="10" rx="34" ry="11" fill="#fff" stroke={INK} strokeWidth="4.5" />
      <ellipse cx="0" cy="10" rx="24" ry="6" fill="none" stroke={tint} strokeWidth="3" strokeDasharray="5 4" />
      {[-11, 11].map((dx) => (
        <g key={dx} transform={`translate(${dx} -2)`}>
          <circle r="11" fill="#E3A052" stroke={INK} strokeWidth="3.5" />
          <circle cx="-3" cy="-2" r="2" fill="#5B321C" /><circle cx="4" cy="3" r="2" fill="#5B321C" />
        </g>
      ))}
    </g>
  );
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Fair Sharer sticker: three plates with the same number of cookies under a golden star">
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="98" fill="#FFE3EA" />
      <g fill="#fff" opacity="0.7">{[[70, 64], [170, 70], [56, 120], [186, 122], [120, 40]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="7" />)}</g>
      <path d="M120 44 L132 72 L162 74 L139 93 L146 122 L120 106 L94 122 L101 93 L78 74 L108 72 Z" fill={CREW.sparkle} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <rect x="40" y="138" width="160" height="16" rx="8" fill="#C67A3E" stroke={INK} strokeWidth="4.5" />
      {plate(72, 126, CREW.gloop)}
      {plate(120, 126, CREW.zuzu)}
      {plate(168, 126, CREW.bobbo)}
      <path d="M108 124 L114 124 M126 124 L132 124" stroke="none" />
      <path id="fair-arc" d="M43.7 167.7 A90 90 0 0 0 196.3 167.7" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="22" fill={INK} letterSpacing="2">
        <textPath href="#fair-arc" startOffset="50%" textAnchor="middle">FAIR SHARER</textPath>
      </text>
    </svg>
  );
}
