import { useEffect, useRef, useState } from "react";
import { ar } from "./geom";
import { audio } from "../../../audio/AudioEngine";
import { INK } from "../../../characters/palette";
import type { BoardProps } from "../../../game/boards";
import type { ExerciseState } from "../../../engine/session";
import { Buoy, LN } from "../art";
import { SHIPS, boardOf, decodePoint, encodePoint, fmtLine, fmtNum, fmtPt, gridRange, meetOf, modeOf, p, sayLine } from "../logic";
import { FinaleBoat, Keypad, Method, ModelSteps, Options, Stage, flags, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Ship Paths (math.alg.linear-graphs). A harbour grid (0–8, later −6–6) with ships sailing straight paths.
 *   plot         move the marker buoy (drag it, tap a grid point, the move buttons or arrow keys), then Drop buoy
 *   grad / icpt  keypad with minus sign and decimal point
 *   eqn / meet / para / finale course   choose (equations and points)
 * After the answer or with the worked model, the rise/run step, the intercept or the crossing point is drawn.
 */
export function GridBoard(props: BoardProps) {
  const { st } = props;
  const ex = st.exercise;
  const mode = modeOf(ex);
  if (mode === "plot") return <PlotBoard {...props} />;
  const b = boardOf(ex);
  const fin = mode === "home";
  const a = ex.answer;
  const f = flags(st);
  const reveal = f.solved || f.modelOn;
  return (
    <Stage
      ex={ex}
      sub={fin ? "Bobbo's course" : SUB[mode]}
      extra={{ board: b }}
      scene={<><GridPicture st={st} reveal={reveal} />{fin && <FinaleBoat st={st} />}</>}
      panel={<>
        <PathCard ex={ex} />
        <Method ex={ex} st={st} />
        {a.kind === "choice" ? (
          <Options st={st} act={props.act} busy={props.busy} options={a.options} label={mode === "meet" ? "Crossing point" : mode === "para" ? "Ship" : "Equation"} />
        ) : (
          <Keypad st={st} act={props.act} busy={props.busy} neg dec maxLen={3} label={mode === "grad" ? "Gradient keypad" : "Intercept keypad"} />
        )}
        <ModelSteps ex={ex} st={st} alongIndex={props.alongIndex} />
      </>}
    />
  );
}
/** The equations or points the question is about, on the board (not only in the prompt). */
function PathCard({ ex }: { ex: BoardProps["st"]["exercise"] }) {
  const mode = modeOf(ex);
  if (mode === "meet")
    return <p className="ln-radio" data-testid="ln-card"><span className="ln-radio-tag">Paths</span> {SHIPS[p(ex, "s1")]}: <b>{fmtLine(p(ex, "m1"), p(ex, "c1"))}</b> · {SHIPS[p(ex, "s2")]}: <b>{fmtLine(p(ex, "m2"), p(ex, "c2"))}</b></p>;
  if (mode === "para") return <p className="ln-radio" data-testid="ln-card"><span className="ln-radio-tag">Gull</span> <b>{fmtLine(p(ex, "mm"), p(ex, "c"))}</b></p>;
  if (mode === "home") return <p className="ln-radio" data-testid="ln-card"><span className="ln-radio-tag">Course</span> Bobbo <b>{fmtPt(p(ex, "x1"), p(ex, "y1"))}</b> → harbour <b>{fmtPt(p(ex, "x2"), p(ex, "y2"))}</b></p>;
  return null;
}
const SUB: Partial<Record<string, string>> = { grad: "Gradient", icpt: "y-intercept", eqn: "y = mx + c", meet: "Crossing paths", para: "Parallel paths" };

interface Frame { lo: number; hi: number; X: (x: number) => number; Y: (y: number) => number; cell: number }
const SIZE = 300, M = 24;
function frame(q4: boolean): Frame {
  const [lo, hi] = gridRange(q4);
  const cell = (SIZE - 2 * M) / (hi - lo);
  return { lo, hi, cell, X: (x) => M + (x - lo) * cell, Y: (y) => SIZE - M - (y - lo) * cell };
}

function Axes({ fr }: { fr: Frame }) {
  const { lo, hi, X, Y } = fr;
  const ns = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const step = hi - lo > 8 ? 2 : 1;
  return (
    <g>
      <rect x={X(lo)} y={Y(hi)} width={X(hi) - X(lo)} height={Y(lo) - Y(hi)} fill="#F2F8FB" />
      {ns.map((n) => <path key={`v${n}`} d={`M${X(n)} ${Y(lo)} V${Y(hi)}`} stroke="#C3D2DE" strokeWidth="1.2" />)}
      {ns.map((n) => <path key={`h${n}`} d={`M${X(lo)} ${Y(n)} H${X(hi)}`} stroke="#C3D2DE" strokeWidth="1.2" />)}
      <path d={`M${X(lo)} ${Y(0)} H${X(hi) + 8}`} stroke={INK} strokeWidth="2.5" />
      <path d={`M${X(0)} ${Y(lo)} V${Y(hi) - 8}`} stroke={INK} strokeWidth="2.5" />
      <text x={X(hi) + 10} y={Y(0)} className="ln-svg-axis" dominantBaseline="central">x</text>
      <text x={X(0)} y={Y(hi) - 14} className="ln-svg-axis" textAnchor="middle">y</text>
      {ns.filter((n) => n !== 0 && n % step === 0).map((n) => (
        <g key={`l${n}`}>
          <text x={X(n)} y={Y(0) + 13} className="ln-svg-tick" textAnchor="middle">{fmtNum(n)}</text>
          <text x={X(0) - 5} y={Y(n)} className="ln-svg-tick" textAnchor="end" dominantBaseline="central">{fmtNum(n)}</text>
        </g>
      ))}
      <text x={X(0) - 5} y={Y(0) + 13} className="ln-svg-tick" textAnchor="end">0</text>
    </g>
  );
}

function PathLine({ fr, m, c, cls = "", label }: { fr: Frame; m: number; c: number; cls?: string; label?: string }) {
  const { lo, hi, X, Y } = fr;
  const xa = lo - 1, xb = hi + 1;
  // label where the path enters the grid on the left, or through the bottom/top edge
  let lx = lo + 0.3;
  let ly = m * lx + c;
  if (ly > hi - 0.3 || ly < lo + 0.3) {
    const bound = ly > hi - 0.3 ? hi - 0.3 : lo + 0.3;
    lx = m === 0 ? lo + 0.3 : (bound - c) / m;
    ly = bound;
  }
  const show = label && lx >= lo && lx <= hi;
  return (
    <g className={`ln-path ${cls}`}>
      <path d={`M${X(xa)} ${Y(m * xa + c)} L${X(xb)} ${Y(m * xb + c)}`} className="ln-path-line" clipPath="url(#ln-grid-clip)" />
      {show && <text x={X(lx) + 8} y={Y(ly) + (m > 0 ? -8 : 16)} className="ln-svg-eq" textAnchor="start">{label}</text>}
    </g>
  );
}

const Dot = ({ fr, x, y, label, cls = "", dx = 8, dy = -8, anchor = "start" }: { fr: Frame; x: number; y: number; label?: string; cls?: string; dx?: number; dy?: number; anchor?: "start" | "middle" | "end" }) => (
  <g className={`ln-dot ${cls}`}>
    <circle cx={fr.X(x)} cy={fr.Y(y)} r="6" fill={LN.red} stroke={INK} strokeWidth="2.5" />
    {label && <text x={fr.X(x) + dx} y={fr.Y(y) + dy} className="ln-svg-strong" textAnchor={anchor}>{label}</text>}
  </g>
);

function GridPicture({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const fin = mode === "home";
  const q4 = p(ex, "q4") === 1;
  const fr = frame(q4);
  const mm = p(ex, "mm"), c = p(ex, "c");
  const x1 = p(ex, "x1"), y1 = p(ex, "y1"), x2 = p(ex, "x2"), y2 = p(ex, "y2");
  const ship = SHIPS[p(ex, "ship")] ?? "ship";
  const range = `x and y from ${fmtNum(fr.lo)} to ${fmtNum(fr.hi)}`;
  const gridLabel =
    mode === "meet"
      ? `Harbour grid, ${range}. Two straight paths: the ${SHIPS[p(ex, "s1")]} on ${sayLine(p(ex, "m1"), p(ex, "c1"))} and the ${SHIPS[p(ex, "s2")]} on ${sayLine(p(ex, "m2"), p(ex, "c2"))}.`
      : mode === "para"
        ? `Harbour grid, ${range}, with the Gull's straight path, ${sayLine(mm, c)}.`
        : fin
          ? `Harbour grid, ${range}. Bobbo's boat is at ${fmtPt(x1, y1)} and the harbour mouth at ${fmtPt(x2, y2)}.`
          : mode === "icpt"
            ? `Harbour grid, ${range}. The ${ship}'s straight path passes through ${fmtPt(x1, y1)} and ${fmtPt(x2, y2)}.`
            : `Harbour grid, ${range}. The ${ship}'s straight path passes through A ${fmtPt(x1, y1)} and B ${fmtPt(x2, y2)}.`;
  return (
    <svg className="ln-diagram ln-grid" viewBox={`0 0 ${SIZE} ${SIZE}`} style={ar(SIZE, SIZE)} role="img" aria-label={gridLabel} data-testid="ln-diagram">
      <defs><clipPath id="ln-grid-clip"><rect x={fr.X(fr.lo)} y={fr.Y(fr.hi)} width={fr.X(fr.hi) - fr.X(fr.lo)} height={fr.Y(fr.lo) - fr.Y(fr.hi)} /></clipPath></defs>
      <Axes fr={fr} />
      {(mode === "grad" || mode === "icpt" || mode === "eqn") && (<>
        <PathLine fr={fr} m={mm} c={c} label={SHIPS[p(ex, "ship")]} />
        {mode === "grad" && reveal && (
          <path d={`M${fr.X(x1)} ${fr.Y(y1)} H${fr.X(x2)} V${fr.Y(y2)}`} className="ln-runrise" />
        )}
        {/* the step triangle A → corner → B: run on the horizontal side, rise outside the vertical side (inside
            when B is near the right edge); A sits to the left of its point and B beyond the end of the rise */}
        {mode === "grad" && reveal && <text x={(fr.X(x1) + fr.X(x2)) / 2} y={fr.Y(y1) + (y2 > y1 ? 18 : -9)} className="ln-svg-strong" textAnchor="middle">{`run ${x2 - x1}`}</text>}
        {mode === "grad" && reveal && (
          <text x={fr.X(x2) + (fr.X(x2) + 66 > SIZE ? -8 : 8)} y={(fr.Y(y1) + fr.Y(y2)) / 2} className="ln-svg-strong" dominantBaseline="central" textAnchor={fr.X(x2) + 66 > SIZE ? "end" : "start"}>{`rise ${fmtNum(y2 - y1)}`}</text>
        )}
        {mode === "grad" && <Dot fr={fr} x={x1} y={y1} label="A" dx={-10} dy={5} anchor="end" />}
        {mode === "grad" && <Dot fr={fr} x={x2} y={y2} label="B" dx={0} dy={y2 > y1 ? -12 : 22} anchor="middle" />}
        {mode === "eqn" && <Dot fr={fr} x={x1} y={y1} label="A" />}
        {mode === "eqn" && <Dot fr={fr} x={x2} y={y2} label="B" />}
        {mode === "icpt" && reveal && <Dot fr={fr} x={0} y={c} label={`(0, ${fmtNum(c)})`} cls="is-model" />}
      </>)}
      {mode === "meet" && (<>
        <PathLine fr={fr} m={p(ex, "m1")} c={p(ex, "c1")} label={SHIPS[p(ex, "s1")]} />
        <PathLine fr={fr} m={p(ex, "m2")} c={p(ex, "c2")} cls="is-second" label={SHIPS[p(ex, "s2")]} />
        {reveal && (() => {
          const [mx, my] = meetOf(p(ex, "m1"), p(ex, "c1"), p(ex, "m2"), p(ex, "c2"));
          return <Dot fr={fr} x={mx} y={my} label={fmtPt(mx, my)} cls="is-model" />;
        })()}
      </>)}
      {mode === "para" && (<>
        <PathLine fr={fr} m={mm} c={c} label="Gull" />
        {reveal && <PathLine fr={fr} m={mm} c={p(ex, "c2")} cls="is-second" label={fmtLine(mm, p(ex, "c2"))} />}
      </>)}
      {fin && (<>
        {reveal && <PathLine fr={fr} m={mm} c={c} />}
        <Dot fr={fr} x={x2} y={y2} label="Harbour" />
        <circle cx={fr.X(x1)} cy={fr.Y(y1)} r="8" fill={LN.lamp} stroke={INK} strokeWidth="3" />
        <text x={fr.X(x1) + 10} y={fr.Y(y1) + 16} className="ln-svg-strong">Bobbo</text>
      </>)}
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ plot a point
const MOVES = [
  { id: "x-", dx: -1, dy: 0, text: "←", label: "Move the buoy left (x − 1)" },
  { id: "y+", dx: 0, dy: 1, text: "↑", label: "Move the buoy up (y + 1)" },
  { id: "y-", dx: 0, dy: -1, text: "↓", label: "Move the buoy down (y − 1)" },
  { id: "x+", dx: 1, dy: 0, text: "→", label: "Move the buoy right (x + 1)" },
] as const;

function PlotBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const q4 = p(ex, "q4") === 1;
  const fr = frame(q4);
  const [pt, setPt] = useState<[number, number]>([0, 0]);
  const ptRef = useRef(pt);
  ptRef.current = pt;
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (modelValue !== null) setPt(decodePoint(modelValue));
  }, [modelValue]);
  useEffect(() => {
    if (st.phase === "answering" && st.attempts > 0 && kb.current) window.setTimeout(() => (document.querySelector('[data-testid="ln-grid"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !f.canAct || modelValue !== null;
  const clamp = (v: number) => Math.max(fr.lo, Math.min(fr.hi, v));
  const moveTo = (x: number, y: number) => {
    if (locked) return;
    const nx = clamp(x), ny = clamp(y);
    if (nx === ptRef.current[0] && ny === ptRef.current[1]) return;
    busy?.();
    audio.play("tap", { gain: 0.25 });
    setPt([nx, ny]);
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const fromPointer = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * SIZE, sy = ((e.clientY - r.top) / r.height) * SIZE;
    moveTo(Math.round((sx - M) / fr.cell + fr.lo), Math.round((SIZE - M - sy) / fr.cell + fr.lo));
  };
  const drop = () => {
    if (!f.canAct) return;
    audio.play("drop", { gain: 0.45 });
    submit(modelValue ?? encodePoint(ptRef.current[0], ptRef.current[1]));
  };
  const tx = p(ex, "x"), ty = p(ex, "y");
  const [lx, ly] = st.lastAnswer !== null && typeof st.lastAnswer === "number" && st.hintStage >= 1 && st.lastAnswer !== encodePoint(tx, ty) ? decodePoint(st.lastAnswer) : [NaN, NaN];
  return (
    <Stage
      ex={ex}
      sub="Plot a point"
      extra={{ board: "plot", x: pt[0], y: pt[1] }}
      scene={
        <div
          className={`ln-gridwrap ${locked ? "is-locked" : ""}`}
          data-testid="ln-grid"
          role="group"
          tabIndex={0}
          aria-label={`Harbour grid. The buoy is at ${fmtPt(pt[0], pt[1])}. Arrow keys move it; Enter drops it.`}
          onKeyDown={(e) => {
            const map: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
            const d = map[e.key];
            if (d) {
              e.preventDefault();
              moveTo(ptRef.current[0] + d[0], ptRef.current[1] + d[1]);
            } else if (e.key === "Enter") {
              e.preventDefault();
              drop();
            }
          }}
        >
          <svg
            ref={svgRef}
            className="ln-diagram ln-grid"
            viewBox={`0 0 ${SIZE} ${SIZE}`} style={ar(SIZE, SIZE)}
            aria-hidden="true"
            onPointerDown={(e) => {
              if (locked || e.button !== 0) return;
              dragging.current = true;
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              fromPointer(e);
            }}
            onPointerMove={(e) => dragging.current && fromPointer(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            <Axes fr={fr} />
            {Number.isFinite(lx) && <circle cx={fr.X(lx)} cy={fr.Y(ly)} r="9" className="ln-lastpt" />}
            {f.modelOn && (
              <path d={`M${fr.X(0)} ${fr.Y(0)} H${fr.X(tx)} V${fr.Y(ty)}`} className="ln-runrise" />
            )}
            <g className="ln-buoy" transform={`translate(${fr.X(pt[0]) - 13} ${fr.Y(pt[1]) - 30}) scale(0.65)`}><Buoy /></g>
            <circle cx={fr.X(pt[0])} cy={fr.Y(pt[1])} r="4" fill={INK} />
          </svg>
        </div>
      }
      panel={<>
        <p className="ln-radio"><span className="ln-radio-tag">Card</span> Buoy at <b>{fmtPt(tx, ty)}</b></p>
        <Method ex={ex} st={st} />
        <div className={`ln-readout ${modelValue !== null && f.canAct ? "is-model" : ""}`} aria-live="polite">Buoy now <b data-testid="ln-buoy">{fmtPt(pt[0], pt[1])}</b></div>
        {modelValue === null && (
          <div className="ln-moves" role="group" aria-label="Move the buoy" data-ln-idle="true">
            {MOVES.map((mv) => (
              <button key={mv.id} type="button" className="ln-turn" data-testid="ln-move" data-value={mv.id} aria-label={mv.label} aria-disabled={locked} onClick={() => moveTo(ptRef.current[0] + mv.dx, ptRef.current[1] + mv.dy)}>
                {mv.text}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`ln-check ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelValue !== null && f.canAct ? "is-model" : ""}`}
          data-testid="done"
          aria-label={`Drop the buoy at ${fmtPt(pt[0], pt[1])}`}
          aria-disabled={!f.canAct}
          onClick={drop}
        >
          Drop buoy
        </button>
        <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
      </>}
    />
  );
}
