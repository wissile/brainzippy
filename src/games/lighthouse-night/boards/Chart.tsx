import { INK } from "../../../characters/palette";
import { ar } from "./geom";
import type { BoardProps } from "../../../game/boards";
import type { ExerciseState } from "../../../engine/session";
import { LN } from "../art";
import { PLACES, SHARE_CTX, boardOf, fmtNum, modeOf, p } from "../logic";
import { FinaleBoat, Keypad, Method, ModelSteps, Options, Stage, flags } from "./shared";

/**
 * Chart Scale (math.solve.scale-ratio). Hoot's FICTIONAL sea chart of Number Hill Sound (made-up places; marked
 * "fictional · not for navigation"). The chart is drawn so its scale bar is true for the picture: a route of 4.5 cm
 * is 4.5 scale-bar centimetres long, with a tick at every centimetre.
 *   real / map   keypad (km or cm; decimal point available)
 *   share        the supply card: a bar model of the ratio; keypad
 *   ratio        the scale written as 1 : n (choice)
 *   finale       Bobbo's boat east and north of the harbour: Pythagoras on the chart, then the scale
 */
export function ChartBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const b = boardOf(ex);
  const fin = mode === "home";
  const a = ex.answer;
  const f = flags(st);
  const reveal = f.solved || f.modelOn;
  const scene = mode === "share" ? <BarModel st={st} reveal={reveal} /> : fin ? <ChartHome st={st} reveal={reveal} /> : <ChartRoute st={st} reveal={reveal} />;
  const unit = mode === "map" ? "cm" : mode === "share" ? "" : "km";
  return (
    <Stage
      ex={ex}
      sub={fin ? "Bobbo's boat" : mode === "share" ? "Sharing supplies" : mode === "ratio" ? "The scale" : "Hoot's chart"}
      extra={{ board: b }}
      scene={<>{scene}{fin && <FinaleBoat st={st} />}</>}
      panel={<>
        <Method ex={ex} st={st} />
        {mode === "ratio" && st.hintStage >= 1 && <p className="ln-note">1 km = 1 000 m = 100 000 cm</p>}
        {a.kind === "choice" ? (
          <Options st={st} act={act} busy={busy} options={a.options} label="Scale" />
        ) : (
          <Keypad st={st} act={act} busy={busy} unit={unit} dec maxLen={4} label={mode === "share" ? "Share keypad" : "Distance keypad"} />
        )}
        <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
      </>}
    />
  );
}

const U = 36; // one chart centimetre in the picture (the scale bar uses the same length)

function ChartPaper({ k, children, h = 260 }: { k: number; children: React.ReactNode; h?: number }) {
  return (
    <svg className="ln-diagram ln-chart" viewBox={`0 0 400 ${h}`} style={ar(400, h)} role="img" aria-label={`Hoot's fictional sea chart, scale 1 centimetre to ${k} kilometres, not for navigation`} data-testid="ln-diagram">
      <rect x="2" y="2" width="396" height={h - 4} rx="10" fill="#DCEFF2" stroke={INK} strokeWidth="4" />
      {/* fictional coastline */}
      <path d="M2 2 H150 Q130 30 96 34 Q60 40 40 70 Q24 92 2 96 Z" fill={LN.paper} stroke="#8C7A50" strokeWidth="2.5" />
      <path d={`M398 ${h - 90} Q360 ${h - 100} 340 ${h - 70} Q320 ${h - 40} 330 ${h - 2} H398 Z`} fill={LN.paper} stroke="#8C7A50" strokeWidth="2.5" />
      <path d="M300 30 Q318 18 336 30 Q344 44 326 50 Q306 52 300 30 Z" fill={LN.paper} stroke="#8C7A50" strokeWidth="2.5" />
      <path d="M8 120 Q60 112 110 124 M8 150 Q70 142 120 156" stroke="#B8D8E0" strokeWidth="2" fill="none" />
      {/* north arrow */}
      <g transform="translate(372 46)">
        <path d="M0 -18 L7 8 L0 3 L-7 8 Z" fill={INK} />
        <text x="0" y="-22" className="ln-svg-small" textAnchor="middle">N</text>
      </g>
      {children}
      {/* scale bar: 3 chart centimetres */}
      <g transform={`translate(16 ${h - 30})`}>
        <rect x="-6" y="-16" width={3 * U + 104} height="34" rx="6" fill="#fff" opacity="0.85" />
        {[0, 1, 2].map((i) => <rect key={i} x={i * U} y="0" width={U} height="7" fill={i % 2 ? "#fff" : INK} stroke={INK} strokeWidth="1.5" />)}
        {[0, 1, 2, 3].map((i) => <text key={i} x={i * U} y="-4" className="ln-svg-tiny" textAnchor="middle">{i}</text>)}
        <text x={3 * U + 8} y="7" className="ln-svg-small">cm · 1 cm : {k} km</text>
      </g>
      <text x="200" y={h - 8} className="ln-svg-warn" textAnchor="middle">Fictional chart · not for navigation</text>
    </svg>
  );
}

function ChartRoute({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const cm = p(ex, "cm"), k = p(ex, "k"), from = p(ex, "from"), to = p(ex, "to"), tilt = p(ex, "tilt");
  const L = cm * U;
  const t = (tilt * Math.PI) / 180;
  const dx = L * Math.cos(t), dy = L * Math.sin(t);
  const x0 = 200 - dx / 2, y0 = 128 + dy / 2;
  const x1 = x0 + dx, y1 = y0 - dy;
  const ticks = Array.from({ length: Math.floor(cm) + 1 }, (_, i) => i);
  const nx = -Math.sin(t), ny = -Math.cos(t); // normal (svg), pointing "up" from the route
  const label = mode === "map" ? (reveal ? `${fmtNum(cm)} cm` : "? cm") : mode === "ratio" ? "" : `${fmtNum(cm)} cm`;
  return (
    <ChartPaper k={k}>
      {mode !== "ratio" && (<>
        <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke="#C06A1E" strokeWidth="5" strokeDasharray="12 7" strokeLinecap="round" />
        {ticks.map((i) => {
          const tx = x0 + i * U * Math.cos(t), ty = y0 - i * U * Math.sin(t);
          return <path key={i} d={`M${tx - nx * 6} ${ty - ny * 6} L${tx + nx * 6} ${ty + ny * 6}`} stroke={INK} strokeWidth="2.5" />;
        })}
        <circle cx={x0} cy={y0} r="7" fill={LN.lamp} stroke={INK} strokeWidth="3" />
        <circle cx={x1} cy={y1} r="7" fill={LN.red} stroke={INK} strokeWidth="3" />
        <text x={x0} y={y0 - 14} className="ln-svg-place" textAnchor="start">{PLACES[from]}</text>
        <text x={x1} y={y1 + 26} className="ln-svg-place" textAnchor="end">{PLACES[to]}</text>
        <text x={(x0 + x1) / 2 + nx * 18} y={(y0 + y1) / 2 + ny * 18} className={`ln-side ${mode === "map" ? (reveal ? "is-model" : "is-ask") : ""}`} textAnchor="middle">{label}</text>
        {mode === "map" && <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 + 30} className="ln-svg-small" textAnchor="middle">{`real distance ${fmtNum(p(ex, "km"))} km`}</text>}
        {mode === "real" && reveal && <text x={(x0 + x1) / 2} y={(y0 + y1) / 2 + 30} className="ln-side is-model" textAnchor="middle">{`= ${fmtNum(cm * k)} km`}</text>}
      </>)}
      {mode === "ratio" && <text x="200" y="128" className="ln-side" textAnchor="middle">{`1 cm on the chart = ${k} km at sea`}</text>}
    </ChartPaper>
  );
}

function ChartHome({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const east = p(ex, "east"), north = p(ex, "north"), c = p(ex, "cmc"), k = p(ex, "k");
  const u = Math.min(220 / east, 150 / north, U);
  const hx = 40, hy = 206;
  const bx = hx + east * u, by = hy - north * u;
  return (
    <ChartPaper k={k} h={276}>
      <path d={`M${hx} ${hy} H${bx}`} stroke={INK} strokeWidth="3" strokeDasharray="8 6" />
      <path d={`M${bx} ${hy} V${by}`} stroke={INK} strokeWidth="3" strokeDasharray="8 6" />
      <path d={`M${bx - 12} ${hy} V${hy - 12} H${bx}`} stroke={INK} strokeWidth="2.5" fill="none" />
      <path d={`M${hx} ${hy} L${bx} ${by}`} stroke={LN.lamp} strokeWidth="6" strokeLinecap="round" />
      <path d={`M${hx} ${hy} L${bx} ${by}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <rect x={hx - 12} y={hy - 6} width="24" height="12" rx="3" fill={LN.stormLight} stroke={INK} strokeWidth="3" />
      <g transform="translate(388 112)">
        <rect x="-118" y="-14" width="124" height="44" rx="6" fill="#fff" opacity="0.85" />
        <rect x="-110" y="-6" width="16" height="9" rx="2" fill={LN.stormLight} stroke={INK} strokeWidth="2" />
        <text x="-88" y="2" className="ln-svg-small" dominantBaseline="central">harbour mouth</text>
        <circle cx="-102" cy="19" r="5" fill={LN.red} stroke={INK} strokeWidth="2" />
        <text x="-88" y="19" className="ln-svg-small" dominantBaseline="central">Bobbo's boat</text>
      </g>
      <circle cx={bx} cy={by} r="8" fill={LN.red} stroke={INK} strokeWidth="3" />
      <text x={(hx + bx) / 2 + 10} y={hy + 19} className="ln-side" textAnchor="middle">{east} cm east</text>
      <text x={bx + 8} y={(hy + by) / 2} className="ln-side" textAnchor="start" dominantBaseline="central">{north} cm north</text>
      <text x={(hx + bx) / 2 + 10} y={(hy + by) / 2 + 6} className={`ln-side ${reveal ? "is-model" : "is-ask"}`} textAnchor="start">{reveal ? `${c} cm = ${c * k} km` : "? km"}</text>
    </ChartPaper>
  );
}

function BarModel({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const a = p(ex, "a"), b = p(ex, "b"), total = p(ex, "total"), who = p(ex, "who");
  const c = SHARE_CTX[p(ex, "ctx")] ?? SHARE_CTX[0];
  const unit = total / (a + b);
  const box = Math.min(46, 240 / Math.max(a, b));
  const row = (n: number, y: number, name: string, mine: boolean) => (
    <g>
      {mine && !reveal && <text x={146 + n * box} y={y + box / 2} className="ln-side is-ask" dominantBaseline="central">?</text>}
      <text x="12" y={y + box / 2} className="ln-svg-place" dominantBaseline="central">{name}</text>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={140 + i * box} y={y} width={box} height={box} rx="5" fill={mine ? LN.lamp : "#fff"} stroke={INK} strokeWidth="3" />
          {reveal && <text x={140 + i * box + box / 2} y={y + box / 2} className="ln-svg-strong" textAnchor="middle" dominantBaseline="central">{fmtNum(unit)}</text>}
        </g>
      ))}
    </g>
  );
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 236" style={ar(400, 236)} role="img" aria-label={`A bar model: ${a} parts for ${c.a}, ${b} parts for ${c.b}`} data-testid="ln-diagram">
      <rect x="2" y="2" width="396" height="232" rx="12" fill={LN.paper} stroke={INK} strokeWidth="4" />
      <text x="16" y="30" className="ln-svg-strong">{`${total} ${c.what} · ratio ${a} : ${b}`}</text>
      {row(a, 56, cap(c.a.replace(/^the /, "")), who === 0)}
      {row(b, 56 + box + 26, cap(c.b.replace(/^the /, "")), who === 1)}
      <text x="16" y="222" className="ln-svg-small">{`${a + b} equal parts${reveal ? `, ${fmtNum(unit)} in each` : ""}`}</text>
    </svg>
  );
}
