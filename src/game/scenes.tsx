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
