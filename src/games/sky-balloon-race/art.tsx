import type { MascotState } from "../../engine/types";
import { Bobbo } from "../../characters/Bobbo";
import { INK } from "../../characters/palette";
import { BALLOON_COLORS } from "./logic";
import { useRaceProgress } from "./progress";

/**
 * Original art for Sky Balloon Race (Critter Crew style: ink outlines #2B2140, flat fills, glossy highlights).
 * Everything is inline SVG — no external assets.
 */

// ---------- floating island ----------
/** A grassy floating island drawn in a 300×220 box. `tree` adds a round tree; `dim` = far-away silhouette. */
export function Island({ tree = true, dim = false, flowers = true }: { tree?: boolean; dim?: boolean; flowers?: boolean }) {
  const stroke = dim ? "none" : INK;
  return (
    <g>
      <path d="M22 82 L278 82 Q256 136 196 166 Q166 212 150 216 Q134 210 106 168 Q46 138 22 82 Z" fill={dim ? "#9A5AA8" : "url(#sb-rock)"} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
      {!dim && <path d="M70 110 Q110 132 150 128 M120 154 Q150 166 176 150" fill="none" stroke="#4A2F7A" strokeWidth="4" strokeLinecap="round" opacity="0.55" />}
      {tree && (
        <g>
          <rect x="196" y="22" width="14" height="48" rx="6" fill={dim ? "#7E4A92" : "#8A5228"} stroke={stroke} strokeWidth="4" />
          <circle cx="203" cy="22" r="30" fill={dim ? "#A86BB5" : "#4CB35E"} stroke={stroke} strokeWidth="5" />
          {!dim && <path d="M186 12 Q192 2 204 0" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />}
        </g>
      )}
      <path d="M10 66 Q150 26 290 66 Q298 84 278 88 L22 88 Q2 84 10 66 Z" fill={dim ? "#B97BC0" : "#7ED957"} stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
      {!dim && <path d="M40 62 Q100 44 160 44" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />}
      {!dim && flowers && (
        <g>
          {[70, 118, 250].map((x, i) => (
            <g key={x} transform={`translate(${x} ${60 - (i % 2) * 6})`}>
              <circle r="5" fill={i === 1 ? "#FFD43B" : "#FF8FB1"} stroke={INK} strokeWidth="2.5" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function IslandDefs() {
  return (
    <defs>
      <linearGradient id="sb-rock" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9C6BD8" />
        <stop offset="1" stopColor="#5B3A9A" />
      </linearGradient>
    </defs>
  );
}

// ---------- clouds ----------
function CloudPuff({ x, y, s = 1, fill = "#fff", shade = "#F6D3E6" }: { x: number; y: number; s?: number; fill?: string; shade?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-120 20 Q-130 -18 -88 -22 Q-80 -62 -36 -56 Q-14 -92 32 -74 Q70 -84 82 -46 Q128 -46 124 -6 Q140 22 104 30 L-96 30 Q-126 32 -120 20 Z" fill={fill} />
      <path d="M-110 24 Q-40 8 30 18 Q90 8 118 22 L104 30 L-96 30 Z" fill={shade} />
    </g>
  );
}

// ---------- background ----------
export function SkyBackground() {
  const p = useRaceProgress();
  return (
    <svg className="scene-bg sb-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true" style={{ "--p": p } as React.CSSProperties}>
      <IslandDefs />
      <defs>
        <linearGradient id="sb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1B66" />
          <stop offset="0.32" stopColor="#58288C" />
          <stop offset="0.6" stopColor="#A23D96" />
          <stop offset="0.8" stopColor="#E3648E" />
          <stop offset="1" stopColor="#F7A07C" />
        </linearGradient>
        <radialGradient id="sb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE9A8" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#FFB98A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF8FA6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#sb-sky)" />
      <g fill="#fff">
        {Array.from({ length: 34 }, (_, i) => (
          <circle key={i} className="twinkle" cx={(i * 463 + 80) % 1600} cy={(i * 137) % 380 + 14} r={1.4 + (i % 3) * 0.9} opacity={0.5 + (i % 4) * 0.12} style={{ animationDelay: `${(i % 6) * 0.45}s` }} />
        ))}
      </g>
      <circle cx="1220" cy="660" r="330" fill="url(#sb-glow)" />
      <circle cx="1220" cy="672" r="112" fill="#FFE08A" />
      <circle cx="1220" cy="672" r="112" fill="#FFF3C4" opacity="0.4" transform="translate(-18 -18) scale(0.8)" style={{ transformOrigin: "1220px 672px" }} />

      {/* far islands (slow parallax) */}
      <g className="sb-par sb-par-far" opacity="0.8">
        <g transform="translate(980 250) scale(0.42)"><Island dim /></g>
        <g transform="translate(140 330) scale(0.34)"><Island dim tree={false} /></g>
        <g transform="translate(1720 300) scale(0.38)"><Island dim /></g>
      </g>
      <g fill="none" stroke="#3A1F6E" strokeWidth="5" strokeLinecap="round" opacity="0.6">
        <path d="M720 210 q14 -12 28 0 q14 -12 28 0" />
        <path d="M800 260 q10 -9 20 0 q10 -9 20 0" />
        <path d="M560 160 q8 -7 16 0 q8 -7 16 0" />
      </g>

      {/* mid islands (medium parallax, the balloon "climbs past" them) */}
      <g className="sb-par sb-par-mid">
        <g transform="translate(250 420) scale(0.78)"><Island /></g>
        <g transform="translate(1290 330) scale(0.62)"><Island tree={false} /></g>
        <g transform="translate(1850 460) scale(0.7)"><Island /></g>
        <g transform="translate(2250 300) scale(0.5)"><Island tree={false} /></g>
      </g>

      {/* cloud sea */}
      <g className="sb-par sb-par-near">
        <path d="M0 640 Q120 590 240 626 Q330 580 440 620 Q560 576 680 616 Q800 580 920 618 Q1040 578 1160 616 Q1280 584 1400 620 Q1500 590 1600 618 L1600 1200 L0 1200 Z" fill="#E68BB9" />
        <path d="M0 700 Q140 650 280 694 Q400 646 540 690 Q680 650 820 692 Q960 648 1100 692 Q1240 652 1380 694 Q1500 660 1600 690 L1600 1200 L0 1200 Z" fill="#F2A8CB" />
        <g className="cloud c1">
          <CloudPuff x={180} y={800} s={1.5} />
          <CloudPuff x={760} y={820} s={1.7} />
          <CloudPuff x={1360} y={800} s={1.5} />
        </g>
        <rect x="0" y="830" width="1600" height="400" fill="#FFF5FA" />
      </g>
    </svg>
  );
}

// ---------- number balloon ----------
export function NumberBalloon({ n, color = 0, className = "" }: { n: number; color?: number; className?: string }) {
  const c = BALLOON_COLORS[color % BALLOON_COLORS.length]!;
  const id = `sb-bal-${color % BALLOON_COLORS.length}`;
  const two = n >= 10;
  return (
    <svg className={`sb-nballoon ${className}`} viewBox="0 0 120 200" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.36" cy="0.3" r="0.75">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.45" stopColor={c.body} />
          <stop offset="1" stopColor={c.dark} />
        </radialGradient>
      </defs>
      <path className="sb-string" d="M60 134 C52 150 68 164 58 180 C54 188 60 194 60 200" fill="none" stroke="#FFF4FB" strokeWidth="3" strokeLinecap="round" />
      <path d="M53 124 L67 124 L64 136 L56 136 Z" fill={c.dark} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M60 6 C94 6 114 34 114 64 C114 98 86 122 62 126 L58 126 C34 122 6 98 6 64 C6 34 26 6 60 6 Z" fill={`url(#${id})`} stroke={INK} strokeWidth="5" />
      <ellipse cx="34" cy="40" rx="9" ry="17" transform="rotate(28 34 40)" fill="#fff" opacity="0.6" />
      <circle cx="46" cy="22" r="4" fill="#fff" opacity="0.7" />
      <text x="60" y={two ? 82 : 86} textAnchor="middle" className="sb-numeral" fontSize={two ? 50 : 62} fill="#fff" stroke={c.stroke} strokeWidth="9" strokeLinejoin="round" paintOrder="stroke" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }} letterSpacing={two ? -2 : 0}>
        {n}
      </text>
    </svg>
  );
}

// ---------- mini racer balloon (track + tied bunch) ----------
export function MiniBalloon({ body, stripe }: { body: string; stripe: string }) {
  return (
    <svg viewBox="0 0 60 76" aria-hidden="true">
      <path d="M30 4 C48 4 56 18 56 30 C56 44 44 52 38 58 L22 58 C16 52 4 44 4 30 C4 18 12 4 30 4 Z" fill={body} stroke={INK} strokeWidth="4" />
      <path d="M30 4 C22 16 22 44 26 58 L34 58 C38 44 38 16 30 4 Z" fill={stripe} />
      <path d="M30 4 C48 4 56 18 56 30 C56 44 44 52 38 58 L22 58 C16 52 4 44 4 30 C4 18 12 4 30 4 Z" fill="none" stroke={INK} strokeWidth="4" />
      <ellipse cx="17" cy="22" rx="4" ry="8" transform="rotate(20 17 22)" fill="#fff" opacity="0.5" />
      <path d="M24 58 L22 64 M36 58 L38 64" stroke={INK} strokeWidth="3" />
      <rect x="18" y="62" width="24" height="12" rx="3" fill="#C98444" stroke={INK} strokeWidth="3.5" />
    </svg>
  );
}

// ---------- hot-air balloon ride ----------
export interface RidePalette {
  env: string;
  side: string;
  stripe: string;
  skirt: string;
}
export const RIDES: Record<"bobbo" | "zuzu" | "gloop", RidePalette> = {
  bobbo: { env: "#FF8A3D", side: "#FFB25C", stripe: "#FFD45E", skirt: "#E0562E" },
  zuzu: { env: "#8E6CEF", side: "#B7A1FF", stripe: "#FFD43B", skirt: "#5F43C0" },
  gloop: { env: "#2EC4B6", side: "#8FF0E5", stripe: "#FFF6DA", skirt: "#1F8A80" },
};

const TIE_SLOTS = [
  [52, 300], [248, 300], [24, 262], [276, 262], [64, 246], [236, 246], [34, 214], [266, 214],
] as const;
const TIE_COLORS = ["#4D96FF", "#5BC85A", "#FF6FA3", "#FFD43B", "#8E6CEF", "#2EC4B6", "#FF7A6B", "#9CC6FF"];

/**
 * A hot-air balloon with a passenger peeking over the basket rim. Box: 300 × 440 (aspect kept by CSS).
 * `tied` = how many little magic balloons are tied to the basket (race progress).
 */
export function RideArt({ palette, passenger, tied = 0, sag = false, className = "", id = "r" }: { palette: RidePalette; passenger: React.ReactNode; tied?: number; sag?: boolean; className?: string; id?: string }) {
  const clip = `sb-env-${id}`;
  const shade = `sb-shade-${id}`;
  const env = "M150 12 C238 12 288 76 288 156 C288 220 240 262 204 300 L96 300 C60 262 12 220 12 156 C12 76 62 12 150 12 Z";
  return (
    <div className={`sb-ride-art ${sag ? "is-sag" : ""} ${className}`}>
      <svg className="sb-ride-back" viewBox="0 0 300 440" aria-hidden="true">
        <defs>
          <clipPath id={clip}><path d={env} /></clipPath>
          <linearGradient id={shade} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.5" stopColor="#3A0A00" stopOpacity="0" />
            <stop offset="1" stopColor="#3A0A00" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <g className="sb-ropes" stroke={INK} strokeWidth="4" strokeLinecap="round">
          <path d="M114 320 L96 354" /><path d="M186 320 L204 354" /><path d="M134 322 L126 354" /><path d="M166 322 L174 354" />
        </g>
        <g className="sb-envelope">
          <g clipPath={`url(#${clip})`}>
            <rect width="300" height="320" fill={palette.env} />
            <path d="M150 12 C66 40 44 196 100 300 L116 300 C80 200 96 60 150 12 Z" fill={palette.side} />
            <path d="M150 12 C234 40 256 196 200 300 L184 300 C220 200 204 60 150 12 Z" fill={palette.side} />
            <path d="M150 12 C112 64 108 210 128 300 L172 300 C192 210 188 64 150 12 Z" fill={palette.stripe} />
            <rect width="300" height="320" fill={`url(#${shade})`} />
            <rect y="272" width="300" height="40" fill={palette.skirt} />
            <path d="M0 272 L300 272" stroke={INK} strokeWidth="4" opacity="0.5" />
            <ellipse cx="84" cy="96" rx="20" ry="48" transform="rotate(-22 84 96)" fill="#fff" opacity="0.35" />
            <ellipse cx="70" cy="160" rx="7" ry="13" transform="rotate(-12 70 160)" fill="#fff" opacity="0.25" />
          </g>
          <path d={env} fill="none" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
          <path d="M100 298 L200 298 L186 324 L114 324 Z" fill={palette.skirt} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="sb-flame">
          <path d="M150 352 C138 344 140 330 150 318 C160 330 162 344 150 352 Z" fill="#FF8A3D" stroke={INK} strokeWidth="3" />
          <path d="M150 348 C145 344 146 336 150 330 C154 336 155 344 150 348 Z" fill="#FFE27A" />
        </g>
      </svg>
      <div className="sb-passenger">{passenger}</div>
      <svg className="sb-ride-front" viewBox="0 0 300 440" aria-hidden="true">
        <g className="sb-tied">
          {TIE_SLOTS.slice(0, Math.min(tied, TIE_SLOTS.length)).map(([x, y], i) => (
            <g key={i} className="sb-tie" style={{ transformOrigin: `${i % 2 ? 204 : 96}px 354px` }}>
              <path d={`M${x} ${y + 20} Q${(x + (i % 2 ? 204 : 96)) / 2 + (i % 2 ? 8 : -8)} ${y + 50} ${i % 2 ? 204 : 96} 356`} fill="none" stroke="#FFF4FB" strokeWidth="2.5" />
              <ellipse cx={x} cy={y} rx="15" ry="19" fill={TIE_COLORS[i % TIE_COLORS.length]} stroke={INK} strokeWidth="3.5" />
              <ellipse cx={x - 5} cy={y - 7} rx="3.5" ry="6" transform={`rotate(24 ${x - 5} ${y - 7})`} fill="#fff" opacity="0.6" />
              <path d={`M${x - 3} ${y + 18} L${x + 3} ${y + 18} L${x} ${y + 23} Z`} fill={INK} />
            </g>
          ))}
        </g>
        <path d="M94 364 L206 364 L196 430 Q150 440 104 430 Z" fill="#C98444" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M98 388 L202 388 M101 410 L199 410" stroke="#A0642C" strokeWidth="4" />
        <path d="M126 366 L124 432 M150 366 L150 436 M174 366 L176 432" stroke="#A0642C" strokeWidth="3" />
        <rect x="84" y="344" width="132" height="24" rx="11" fill="#E3A262" stroke={INK} strokeWidth="5" />
        <path d="M96 352 L150 352" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Mascot: Bobbo riding his hot-air balloon. The magic balloons he has collected are tied to the basket. */
export function BalloonRide({ state, talking = false, size }: { state: MascotState; talking?: boolean; size?: number | string }) {
  const done = useRaceProgress();
  return (
    <div className={`sb-ride state-${state}`} data-sb-drop="" style={{ width: typeof size === "number" ? size : undefined, "--p": done } as React.CSSProperties} role="img" aria-label={`Bobbo in his hot-air balloon, with ${done} magic balloon${done === 1 ? "" : "s"} tied on`}>
      <div className="sb-ride-lift">
        <div className="sb-ride-float">
          <RideArt palette={RIDES.bobbo} tied={done} id="bobbo" passenger={<Bobbo state={state} talking={talking} size="100%" />} />
        </div>
      </div>
    </div>
  );
}

// ---------- rainbow finish ----------
export function RainbowArch({ flag = true }: { flag?: boolean }) {
  const bands = ["#FF5A4E", "#FF9F43", "#FFD43B", "#6BCB77", "#4D96FF", "#8E6CEF"];
  return (
    <svg viewBox="0 0 420 240" aria-hidden="true" className="sb-rainbow">
      {bands.map((c, i) => {
        const r = 190 - i * 18;
        return <path key={c} d={`M${210 - r} 220 A${r} ${r} 0 0 1 ${210 + r} 220`} fill="none" stroke={c} strokeWidth="19" />;
      })}
      <path d="M20 220 A190 190 0 0 1 400 220" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M128 220 A82 82 0 0 1 292 220" fill="none" stroke={INK} strokeWidth="4" />
      {flag && (
        <g transform="translate(210 30)">
          <path d="M0 0 L0 -34" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <rect x="0" y="-34" width="34" height="22" fill="#fff" stroke={INK} strokeWidth="3.5" />
          <path d="M0 -34 h8.5 v5.5 h-8.5 Z M17 -34 h8.5 v5.5 h-8.5 Z M8.5 -28.5 h8.5 v5.5 h-8.5 Z M25.5 -28.5 h8.5 v5.5 h-8.5 Z M0 -23 h8.5 v5.5 h-8.5 Z M17 -23 h8.5 v5.5 h-8.5 Z M8.5 -17.5 h8.5 v5.5 h-8.5 Z M25.5 -17.5 h8.5 v5.5 h-8.5 Z" fill={INK} />
        </g>
      )}
      <g fill="#fff" stroke={INK} strokeWidth="4">
        <path d="M-6 250 Q-4 206 24 208 Q34 186 60 196 Q84 192 86 214 Q100 222 92 250 Z" />
        <path d="M426 250 Q424 206 396 208 Q386 186 360 196 Q336 192 334 214 Q320 222 328 250 Z" />
      </g>
    </svg>
  );
}

// ---------- prompt icon / basket stub ----------
export function BalloonIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 66 C46 76 54 84 50 96" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M50 6 C74 6 88 24 88 42 C88 62 68 68 52 70 L48 70 C32 68 12 62 12 42 C12 24 26 6 50 6 Z" fill="#FF6FA3" stroke={INK} strokeWidth="5" />
      <path d="M44 68 L56 68 L54 76 L46 76 Z" fill="#D63E78" stroke={INK} strokeWidth="3" />
      <ellipse cx="32" cy="28" rx="6" ry="11" transform="rotate(28 32 28)" fill="#fff" opacity="0.6" />
      <text x="50" y="52" textAnchor="middle" fontSize="34" fill="#fff" stroke="#9A1F52" strokeWidth="6" paintOrder="stroke" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>+</text>
    </svg>
  );
}
export const SkyObject = (_p: { kind: string }) => <BalloonIcon />;

export function BasketStub() {
  return (
    <svg viewBox="0 0 300 200" aria-hidden="true">
      <path d="M30 60 L270 60 L250 190 Q150 202 50 190 Z" fill="#C98444" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- achievement sticker ----------
export function SkyChampionSticker() {
  return (
    <svg viewBox="0 0 240 240" className="sticker-art" role="img" aria-label="Sky Champion sticker: Bobbo's hot-air balloon flying through a rainbow">
      <defs>
        <linearGradient id="sb-st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A2A8C" />
          <stop offset="0.6" stopColor="#D9558F" />
          <stop offset="1" stopColor="#F7A07C" />
        </linearGradient>
        <clipPath id="sb-st-clip"><circle cx="120" cy="120" r="96" /></clipPath>
      </defs>
      <circle cx="120" cy="120" r="112" fill="#fff" stroke={INK} strokeWidth="6" />
      <circle cx="120" cy="120" r="96" fill="url(#sb-st-sky)" />
      <g clipPath="url(#sb-st-clip)">
        <g transform="translate(18 74) scale(0.49)"><RainbowArchPaths /></g>
        {[[52, 50], [186, 62], [170, 34], [70, 86]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r="2.5" fill="#fff" />)}
        <path d="M24 196 Q60 168 96 186 Q130 166 160 184 Q196 168 222 190 L222 240 L24 240 Z" fill="#FFF5FA" stroke={INK} strokeWidth="4" />
        <g transform="translate(86 44) scale(0.23)">
          <path d="M150 12 C238 12 288 76 288 156 C288 220 240 262 204 300 L96 300 C60 262 12 220 12 156 C12 76 62 12 150 12 Z" fill="#FF8A3D" stroke={INK} strokeWidth="14" />
          <path d="M150 12 C112 64 108 210 128 300 L172 300 C192 210 188 64 150 12 Z" fill="#FFD45E" stroke={INK} strokeWidth="8" />
          <ellipse cx="84" cy="96" rx="20" ry="48" transform="rotate(-22 84 96)" fill="#fff" opacity="0.4" />
          <path d="M114 300 L100 360 M186 300 L200 360" stroke={INK} strokeWidth="10" />
          <path d="M150 304 C178 304 196 330 196 352 L104 352 C104 330 122 304 150 304 Z" fill="#FF9F43" stroke={INK} strokeWidth="10" />
          <circle cx="132" cy="334" r="10" fill="#fff" stroke={INK} strokeWidth="6" /><circle cx="168" cy="334" r="10" fill="#fff" stroke={INK} strokeWidth="6" />
          <circle cx="134" cy="336" r="4" fill={INK} /><circle cx="170" cy="336" r="4" fill={INK} />
          <path d="M90 350 L210 350 L198 420 L102 420 Z" fill="#C98444" stroke={INK} strokeWidth="12" strokeLinejoin="round" />
        </g>
      </g>
      <circle cx="120" cy="120" r="96" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M34 168 L206 168 L218 196 L196 194 L120 204 L44 194 L22 196 Z" fill="#FFD43B" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M34 168 L22 196 L8 178 Z M206 168 L218 196 L232 178 Z" fill="#F2B200" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <text x="120" y="192" textAnchor="middle" fontSize="19" fill={INK} letterSpacing="1.2" style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>SKY CHAMPION</text>
      {[[30, 64], [208, 58], [214, 120]].map(([x, y]) => (
        <path key={`s${x}`} transform={`translate(${x} ${y}) scale(0.5)`} d="M0 -18 L5 -5 L18 0 L5 5 L0 18 L-5 5 L-18 0 L-5 -5 Z" fill="#FFD43B" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function RainbowArchPaths() {
  const bands = ["#FF5A4E", "#FF9F43", "#FFD43B", "#6BCB77", "#4D96FF", "#8E6CEF"];
  return (
    <g>
      {bands.map((c, i) => {
        const r = 190 - i * 18;
        return <path key={c} d={`M${210 - r} 220 A${r} ${r} 0 0 1 ${210 + r} 220`} fill="none" stroke={c} strokeWidth="19" />;
      })}
    </g>
  );
}
