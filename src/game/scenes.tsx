/** Shared cinematic scene building blocks (original art). Games compose these into story beats. */
export type TimeOfDay = "night" | "dawn" | "day" | "dusk";

const SKY: Record<TimeOfDay, [string, string, string]> = {
  night: ["#1B1440", "#2E2470", "#4B3A8F"],
  dawn: ["#6A5ACD", "#F49AC1", "#FFD8A8"],
  day: ["#8FD3FF", "#C9ECFF", "#FFF4D6"],
  dusk: ["#2F1F6B", "#A0418F", "#F59E6B"],
};

export function Sky({ time = "day", sun = true, stars, ground = "#7FD27A", hills = true }: { time?: TimeOfDay; sun?: boolean; stars?: boolean; ground?: string; hills?: boolean }) {
  const [a, b, c] = SKY[time];
  const sunY = time === "dawn" ? 560 : time === "dusk" ? 520 : 170;
  const showStars = stars ?? (time === "night" || time === "dusk");
  return (
    <svg className="bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${time}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} /><stop offset="0.55" stopColor={b} /><stop offset="1" stopColor={c} />
        </linearGradient>
        <radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#FFF3A6" /><stop offset="1" stopColor="#FFE066" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#sky-${time})`} />
      {showStars && (
        <g fill="#fff">
          {Array.from({ length: 40 }, (_, i) => <circle key={i} className="twinkle" cx={(i * 397) % 1600} cy={(i * 211) % 480} r={1.5 + (i % 3)} style={{ animationDelay: `${(i % 7) * 0.4}s` }} />)}
        </g>
      )}
      {time === "night" && <g><circle cx="1300" cy="150" r="60" fill="#FFF6D0" /><circle cx="1328" cy="132" r="56" fill={a} /></g>}
      {sun && time !== "night" && (
        <g className={time === "dawn" ? "sun-rise" : ""}>
          <circle cx="1250" cy={sunY} r="170" fill="url(#sunglow)" />
          <circle cx="1250" cy={sunY} r="68" fill="#FFE066" />
        </g>
      )}
      {hills && (
        <>
          <path d="M0 600 Q260 500 520 560 T1060 540 T1600 560 L1600 900 L0 900 Z" fill={time === "night" ? "#2F5E4A" : "#A6E39A"} />
          <path d="M0 690 Q400 630 800 670 T1600 660 L1600 900 L0 900 Z" fill={time === "night" ? "#24503D" : ground} />
        </>
      )}
    </svg>
  );
}

export function Actor({ x, y, w, enter, float, children, z = 1 }: { x: number; y: number; w: number; enter?: "left" | "right" | "drop"; float?: boolean; z?: number; children: React.ReactNode }) {
  return (
    <div className={`actor ${enter ? (enter === "drop" ? "drop" : `enter-${enter}`) : ""} ${float ? "float" : ""}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}vmin`, zIndex: z }}>
      {children}
    </div>
  );
}

export function Zzz({ x, y }: { x: number; y: number }) {
  return (
    <>
      {[0, 0.8, 1.6].map((d) => (
        <span key={d} className="zzz" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} aria-hidden="true">z</span>
      ))}
    </>
  );
}

/** A floating glowing "Brain Spark" (the island's magic). */
export function Spark({ x, y, size = 6, dim = false }: { x: number; y: number; size?: number; dim?: boolean }) {
  return (
    <svg className={`spark ${dim ? "dim" : ""}`} viewBox="-20 -20 40 40" style={{ left: `${x}%`, top: `${y}%`, width: `${size}vmin` }} aria-hidden="true">
      <circle r="16" fill="#FFE27A" opacity="0.35" />
      <path d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** The Brain Spark Tree at the heart of Monster Island. `lit` 0..1 controls how many sparks glow. */
export function SparkTree({ lit = 1, storm = false }: { lit?: number; storm?: boolean }) {
  const spots = [[-90, -150], [-40, -200], [30, -210], [90, -160], [-120, -90], [120, -100], [-60, -110], [60, -120], [0, -160], [-20, -60], [40, -70], [100, -40]];
  const on = Math.round(lit * spots.length);
  return (
    <svg viewBox="-200 -300 400 340" aria-hidden="true" className={`spark-tree ${storm ? "storm" : ""}`}>
      <path d="M-22 30 Q-18 -40 -40 -90 L-14 -96 Q0 -60 6 -100 L30 -96 Q14 -40 22 30 Z" fill="#8A5A3B" stroke="#2B2140" strokeWidth="6" strokeLinejoin="round" />
      <g className="canopy">
        <circle cx="-80" cy="-130" r="78" fill="#5E4AB8" stroke="#2B2140" strokeWidth="6" />
        <circle cx="80" cy="-130" r="78" fill="#6A55C8" stroke="#2B2140" strokeWidth="6" />
        <circle cx="0" cy="-185" r="92" fill="#7B66D9" stroke="#2B2140" strokeWidth="6" />
        <circle cx="0" cy="-110" r="70" fill="#6A55C8" />
      </g>
      {spots.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} className={i < on ? "leaf-spark on" : "leaf-spark"}>
          <circle r="14" fill={i < on ? "#FFE27A" : "#3D2F7A"} opacity={i < on ? 0.5 : 0.8} />
          <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={i < on ? "#FFD43B" : "#5A4A9A"} />
        </g>
      ))}
    </svg>
  );
}

export function StormClouds() {
  return (
    <svg className="bg storm-clouds" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <g fill="#3A3366" opacity="0.95">
        <ellipse cx="300" cy="120" rx="260" ry="90" /><ellipse cx="560" cy="90" rx="220" ry="80" /><ellipse cx="900" cy="130" rx="300" ry="100" /><ellipse cx="1300" cy="100" rx="280" ry="90" />
      </g>
      <path className="bolt" d="M980 160 L930 290 L990 290 L950 420 L1060 250 L1000 250 L1040 160 Z" fill="#FFE27A" />
      <g stroke="#9FB6FF" strokeWidth="4" opacity="0.6">{Array.from({ length: 30 }, (_, i) => <line key={i} x1={(i * 53) % 1600} y1={200 + (i * 37) % 300} x2={(i * 53) % 1600 - 30} y2={260 + (i * 37) % 300} />)}</g>
    </svg>
  );
}
