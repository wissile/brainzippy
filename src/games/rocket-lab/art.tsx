import { CREW, INK } from "../../characters/palette";

/**
 * Original art for Dabble's Rocket Lab. Critter Crew style (5 px ink outlines at a ~200-unit box, flat fills,
 * a soft white highlight on the upper left). Dabble's coral leads; force colours are fixed across the world:
 * thrust (push up) = flame orange, weight (pull down) = deep blue, always backed by text labels.
 */
export const RL = {
  coral: "#FF6B6B",
  coralDark: "#E04F55",
  cream: "#FFF6E8",
  teal: "#2EC4B6",
  tealDark: "#1B8F85",
  thrust: "#F26A1B",
  thrustLight: "#FFB547",
  weight: "#2346A8",
  weightLight: "#6F8FF0",
  steel: "#A9B4C8",
  steelDark: "#6B7790",
  wood: "#C98A4B",
  woodDark: "#8E5A2C",
  moon: "#C9CCD8",
  moonDark: "#9A9EB3",
  space: "#1A1840",
  leaf: "#6BCB77",
  glow: "#FFE27A",
} as const;

/** The rocket body (nose, porthole with the moon-flower seed, fins). The engine is a separate part below it. */
export function RocketArt({ color = RL.coral, label }: { color?: string; label?: string }) {
  return (
    <svg viewBox="0 0 120 200" className="rl-rocket-art" aria-hidden="true" overflow="visible">
      <path d="M18 178 L34 132 L34 186 Z" fill={RL.teal} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M102 178 L86 132 L86 186 Z" fill={RL.teal} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M34 66 C34 30 50 10 60 4 C70 10 86 30 86 66 L86 186 L34 186 Z" fill={RL.cream} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M34 66 C34 30 50 10 60 4 C70 10 86 30 86 66 Z" fill={color} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M42 70 L42 176" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <path d="M78 74 L78 180" stroke={INK} strokeOpacity="0.12" strokeWidth="8" strokeLinecap="round" />
      <rect x="34" y="150" width="52" height="12" fill={color} stroke={INK} strokeWidth="4" />
      <circle cx="60" cy="98" r="17" fill="#CFEFFF" stroke={INK} strokeWidth="5" />
      <path d="M60 110 C54 104 54 96 60 90 C66 96 66 104 60 110 Z" fill={RL.leaf} stroke={INK} strokeWidth="2.5" />
      <circle cx="60" cy="99" r="2.6" fill={RL.glow} />
      <path d="M50 90 A12 12 0 0 1 58 85" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {label && (
        <text x="60" y="138" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="22" fill={INK}>{label}</text>
      )}
    </svg>
  );
}

/** A rocket engine: a bell nozzle. `size` 0–2 makes the bell wider (bigger engines push harder). */
export function EngineArt({ size = 1 }: { size?: number }) {
  const w = 22 + size * 8;
  return (
    <svg viewBox="0 0 100 64" className="rl-engine-art" aria-hidden="true" overflow="visible">
      <rect x="30" y="2" width="40" height="16" rx="5" fill={RL.steel} stroke={INK} strokeWidth="5" />
      <path d={`M38 18 L62 18 L${50 + w} 58 L${50 - w} 58 Z`} fill={RL.steelDark} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d={`M44 22 L${50 - w + 10} 52`} stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <path d={`M${50 - w} 58 L${50 + w} 58`} stroke={RL.thrust} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function FlameArt() {
  return (
    <svg viewBox="0 0 60 90" className="rl-flame-art" aria-hidden="true">
      <path d="M30 88 C8 60 6 30 16 4 L44 4 C54 30 52 60 30 88 Z" fill={RL.thrust} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d="M30 66 C20 48 20 26 24 8 L36 8 C40 26 40 48 30 66 Z" fill={RL.thrustLight} />
      <path d="M30 40 C27 30 27 18 28 10 L32 10 C33 18 33 30 30 40 Z" fill="#FFF4C2" />
    </svg>
  );
}

export function PuffArt() {
  return (
    <svg viewBox="0 0 60 44" className="rl-puff-art" aria-hidden="true">
      <path d="M12 38 C2 38 2 24 12 22 C10 10 26 6 30 14 C34 4 52 8 48 22 C58 24 56 38 46 38 Z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" opacity="0.95" />
    </svg>
  );
}

/** A seed crate: wooden box with a leaf stencil. */
export function CrateArt() {
  return (
    <svg viewBox="0 0 60 56" className="rl-crate-art" aria-hidden="true">
      <rect x="4" y="4" width="52" height="48" rx="6" fill={RL.wood} stroke={INK} strokeWidth="4.5" />
      <path d="M4 18 H56 M4 38 H56" stroke={RL.woodDark} strokeWidth="3" />
      <path d="M30 40 C20 34 20 22 30 14 C40 22 40 34 30 40 Z" fill={RL.leaf} stroke={INK} strokeWidth="2.5" />
      <path d="M10 8 V48" stroke="#fff" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}

/** A fuel tank (5 kg of fuel). */
export function TankArt() {
  return (
    <svg viewBox="0 0 44 64" className="rl-tank-art" aria-hidden="true">
      <rect x="6" y="8" width="32" height="52" rx="14" fill={RL.teal} stroke={INK} strokeWidth="4.5" />
      <rect x="16" y="2" width="12" height="8" rx="3" fill={RL.steel} stroke={INK} strokeWidth="3.5" />
      <path d="M6 26 H38 M6 42 H38" stroke={RL.tealDark} strokeWidth="3" />
      <path d="M13 16 V52" stroke="#fff" strokeWidth="3.5" opacity="0.45" strokeLinecap="round" />
    </svg>
  );
}

/** Rumble's giant spring scale. `stretch` 0–1 extends the spring; `reading` is written on the dial. */
export function SpringScaleArt({ stretch = 0.5, reading }: { stretch?: number; reading?: string }) {
  const len = 30 + 50 * Math.max(0, Math.min(1, stretch));
  const coils = 7;
  const d = Array.from({ length: coils }, (_, i) => `L${i % 2 ? 36 : 64} ${52 + ((i + 0.5) * len) / coils}`).join(" ");
  return (
    <svg viewBox="0 0 100 160" className="rl-scale-art" aria-hidden="true">
      <path d="M50 2 V12" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="24" y="12" width="52" height="40" rx="12" fill={CREW.rumble} stroke={INK} strokeWidth="5" />
      <rect x="31" y="19" width="38" height="26" rx="6" fill="#fff" stroke={INK} strokeWidth="3" />
      {reading && <text x="50" y="38" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="14" fill={INK}>{reading}</text>}
      <path d={`M50 52 ${d} L50 ${52 + len}`} fill="none" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M50 ${52 + len} v8 a8 8 0 1 1 -8 8`} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Launch pad platform. */
export function PadArt() {
  return (
    <svg viewBox="0 0 300 50" className="rl-pad-art" aria-hidden="true" preserveAspectRatio="none">
      <path d="M10 14 L290 14 L276 46 L24 46 Z" fill="#8A93A8" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <rect x="4" y="4" width="292" height="12" rx="5" fill="#C6CCD9" stroke={INK} strokeWidth="5" />
      {[60, 120, 180, 240].map((x) => <path key={x} d={`M${x} 20 L${x - 6} 42`} stroke="#6B7390" strokeWidth="4" />)}
    </svg>
  );
}

/** The moon-flower seed (story). */
export function SeedArt() {
  return (
    <svg viewBox="0 0 60 70" aria-hidden="true" className="rl-seed-art">
      <circle cx="30" cy="38" r="28" fill={RL.glow} opacity="0.35" />
      <path d="M30 64 C12 54 10 30 30 6 C50 30 48 54 30 64 Z" fill="#B48CF0" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M30 26 L33 34 L41 35 L35 40 L37 48 L30 44 L23 48 L25 40 L19 35 L27 34 Z" fill={RL.glow} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 22 C19 30 19 40 22 48" stroke="#fff" strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

/** A moon-flower in bloom (story outro, sticker). */
export function MoonFlowerArt() {
  return (
    <svg viewBox="0 0 80 110" aria-hidden="true" className="rl-flower-art">
      <path d="M40 106 C40 80 38 64 40 50" stroke={INK} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M40 106 C40 80 38 64 40 50" stroke={RL.leaf} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M40 84 C26 84 18 74 18 66 C30 66 38 72 40 84 Z" fill={RL.leaf} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} transform={`rotate(${r} 40 34)`} d="M40 34 C30 24 32 6 40 2 C48 6 50 24 40 34 Z" fill="#B48CF0" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      ))}
      <circle cx="40" cy="34" r="9" fill={RL.glow} stroke={INK} strokeWidth="3.5" />
    </svg>
  );
}

/** Small prompt icons (the prompt pill's ObjectArt). */
export function RocketObject({ kind }: { kind: string }) {
  switch (kind) {
    case "engine":
      return <EngineArt size={2} />;
    case "crate":
      return <CrateArt />;
    case "scale":
      return <SpringScaleArt stretch={0.4} />;
    case "fuel":
    case "planner":
      return <TankArt />;
    case "moon":
      return (
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <circle cx="30" cy="30" r="24" fill={RL.moon} stroke={INK} strokeWidth="4.5" />
          <circle cx="22" cy="24" r="6" fill={RL.moonDark} />
          <circle cx="38" cy="38" r="4.5" fill={RL.moonDark} />
          <circle cx="36" cy="18" r="3" fill={RL.moonDark} />
        </svg>
      );
    default:
      return <RocketArt />;
  }
}

export function NoBasket() {
  return <svg viewBox="0 0 10 10" aria-hidden="true" />;
}

const CLOUDS = [[180, 170, 1], [620, 110, 0.8], [1080, 190, 1.1], [1420, 120, 0.7]] as const;

/** Monster Island's flat hilltop launch site, by day: sea, a far island, clouds and the lab hut. */
export function LabBackground() {
  return (
    <svg className="scene-bg rl-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="rl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6EC3FF" />
          <stop offset="0.6" stopColor="#BFE7FF" />
          <stop offset="1" stopColor="#FFF1DA" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#rl-sky)" />
      <circle cx="1330" cy="150" r="64" fill="#FFE066" />
      <circle cx="1330" cy="150" r="100" fill="#FFE066" opacity="0.25" />
      {/* the daytime Moon: where the seed is going */}
      <g opacity="0.85"><circle cx="300" cy="140" r="40" fill="#F4F2FF" /><circle cx="288" cy="132" r="7" fill="#DCD8F0" /><circle cx="312" cy="152" r="5" fill="#DCD8F0" /></g>
      {CLOUDS.map(([x, y, s]) => (
        <g key={x} className="cloud" transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M-90 30 C-120 30 -120 -6 -88 -6 C-84 -40 -30 -46 -16 -18 C0 -50 60 -44 62 -8 C100 -10 104 30 72 30 Z" fill="#fff" opacity="0.9" />
        </g>
      ))}
      <rect y="560" width="1600" height="340" fill="#4FB3D9" />
      <path d="M0 560 Q400 548 800 560 T1600 560" fill="none" stroke="#9EE0F2" strokeWidth="6" opacity="0.6" />
      <path d="M1120 560 Q1260 470 1420 520 Q1500 500 1600 540 L1600 562 L1120 562 Z" fill="#7FC98A" stroke={INK} strokeWidth="4" strokeOpacity="0.25" />
      {/* the hilltop */}
      <path d="M-20 900 L-20 690 Q120 620 360 610 L1240 610 Q1480 620 1620 700 L1620 900 Z" fill="#8FD47F" stroke={INK} strokeWidth="5" />
      <path d="M-20 760 Q300 700 800 708 T1620 760 L1620 900 L-20 900 Z" fill="#74C266" />
      {/* lab hut with a dish */}
      <g transform="translate(1290 520)">
        <rect x="0" y="40" width="170" height="92" rx="10" fill={RL.cream} stroke={INK} strokeWidth="5" />
        <path d="M-12 44 L85 -4 L182 44 Z" fill={RL.coral} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <rect x="24" y="64" width="40" height="36" rx="6" fill="#CFEFFF" stroke={INK} strokeWidth="4" />
        <rect x="104" y="70" width="40" height="62" rx="6" fill={RL.teal} stroke={INK} strokeWidth="4" />
        <path d="M120 -2 L140 -40" stroke={INK} strokeWidth="5" />
        <path d="M118 -54 A30 30 0 0 0 162 -26 Z" fill={RL.steel} stroke={INK} strokeWidth="4" />
      </g>
      {/* fence posts with pennants */}
      {[90, 220, 1180].map((x, i) => (
        <g key={x} transform={`translate(${x} 600)`}>
          <path d="M0 0 V-70" stroke={INK} strokeWidth="5" />
          <path className="rl-pennant" d="M2 -70 L40 -60 L2 -50 Z" fill={i % 2 ? RL.teal : RL.coral} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

/** Moon surface backdrop (drawn inside the board for Moon experiments). */
export function MoonBackdrop() {
  return (
    <svg className="rl-moon-bg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect width="800" height="500" fill={RL.space} />
      <g fill="#fff">{Array.from({ length: 34 }, (_, i) => <circle key={i} cx={(i * 233) % 800} cy={(i * 131) % 300} r={1 + (i % 3) * 0.7} opacity="0.8" />)}</g>
      <g transform="translate(640 90)">
        <circle r="38" fill="#4FA3E3" stroke={INK} strokeWidth="4" />
        <path d="M-20 -20 C-4 -26 4 -10 -6 0 C-14 8 -26 2 -30 -6 Z M8 8 C20 4 28 16 18 26 C10 30 2 22 8 8 Z" fill="#8CCB5E" />
      </g>
      <path d="M0 360 Q200 330 400 350 T800 340 L800 500 L0 500 Z" fill={RL.moon} stroke={INK} strokeWidth="4" />
      {[[120, 420, 40], [360, 400, 26], [600, 440, 50], [700, 380, 18]].map(([x, y, r]) => (
        <ellipse key={x} cx={x} cy={y} rx={r} ry={r! * 0.35} fill={RL.moonDark} stroke={INK} strokeWidth="3" strokeOpacity="0.4" />
      ))}
    </svg>
  );
}

/** Moon garden for the story ending. */
export function MoonGarden() {
  return (
    <div className="rl-garden">
      <MoonBackdrop />
      <div className="rl-garden-flowers">
        {[0, 1, 2].map((i) => <span key={i} style={{ "--i": i } as React.CSSProperties}><MoonFlowerArt /></span>)}
      </div>
    </div>
  );
}

/** Reward: the Launch Patch, a round mission patch with Dabble's visor, a rocket and a moon-flower. */
export function LaunchPatchSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Launch Patch sticker: a round mission patch with Dabble's goggles, a rocket and a moon-flower">
      <circle cx="120" cy="120" r="112" fill={RL.coral} stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="94" fill={RL.space} stroke={INK} strokeWidth="4" />
      <g fill="#fff">{[[70, 70], [170, 64], [150, 40], [60, 120], [186, 120], [96, 50]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" />)}</g>
      <circle cx="168" cy="82" r="22" fill={RL.moon} stroke={INK} strokeWidth="4" />
      <circle cx="162" cy="76" r="5" fill={RL.moonDark} />
      <path d="M28 160 Q120 120 212 160 L212 200 L28 200 Z" fill="#8FD47F" />
      <g transform="translate(88 58) scale(0.42) rotate(18 60 100)"><RocketArtPaths /></g>
      <path d="M96 168 C84 150 92 134 108 126" stroke={RL.thrustLight} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="2 12" />
      <g transform="translate(150 132) scale(0.5)"><MoonFlowerArtPaths /></g>
      {/* Dabble's one-piece visor */}
      <g transform="translate(120 34)">
        <path d="M-40 -6 C-40 -18 40 -18 40 -6 L36 10 C20 18 -20 18 -36 10 Z" fill="#BDEBFF" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M-28 -6 C-16 -10 -6 -10 2 -8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <path id="rl-arc" d="M40 172 A88 88 0 0 0 200 172" fill="none" />
      <text fontFamily="'Baloo 2', sans-serif" fontWeight="800" fontSize="21" fill="#fff" letterSpacing="2" stroke={INK} strokeWidth="1">
        <textPath href="#rl-arc" startOffset="50%" textAnchor="middle">LAUNCH PATCH</textPath>
      </text>
    </svg>
  );
}

function RocketArtPaths() {
  return (
    <g>
      <path d="M18 178 L34 132 L34 186 Z" fill={RL.teal} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <path d="M102 178 L86 132 L86 186 Z" fill={RL.teal} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <path d="M34 66 C34 30 50 10 60 4 C70 10 86 30 86 66 L86 186 L34 186 Z" fill={RL.cream} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <path d="M34 66 C34 30 50 10 60 4 C70 10 86 30 86 66 Z" fill={RL.coral} stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <circle cx="60" cy="98" r="17" fill="#CFEFFF" stroke={INK} strokeWidth="7" />
      <path d="M36 186 C40 210 80 210 84 186 Z" fill={RL.thrust} stroke={INK} strokeWidth="6" />
    </g>
  );
}
function MoonFlowerArtPaths() {
  return (
    <g>
      <path d="M40 106 C40 80 38 64 40 50" stroke={RL.leaf} strokeWidth="8" strokeLinecap="round" fill="none" />
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} transform={`rotate(${r} 40 34)`} d="M40 34 C30 24 32 6 40 2 C48 6 50 24 40 34 Z" fill="#B48CF0" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      ))}
      <circle cx="40" cy="34" r="9" fill={RL.glow} stroke={INK} strokeWidth="5" />
    </g>
  );
}
