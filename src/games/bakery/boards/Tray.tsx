import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import { useApp } from "../../../app/AppContext";
import type { BoardProps } from "../../../game/boards";
import { BK, CookieShape } from "../art";
import { buildCode, buildCols, buildRows, clamp, decode, splitFor } from "../logic";
import { CheckButton, Keypad, ModelSteps, Stepper, Tab, cellAt, flags, useBoardKeys, useEntry, usePointerDrag, useSubmit } from "./shared";

/**
 * Tray Arrays (math.mult.arrays, math.div.missing-factor): cookies on a baking tray in rows.
 *  count    how many on the tray? keypad. Hint: each row's count at its end; model: skip-count down the rows.
 *  build    "r rows of c": drag across the tray, the rows / in-each-row steppers, or the arrow keys → Check.
 *  fact     a × b on a big tray: keypad. Hint: the tray splits into two friendlier facts (7 × 8 = 7 × 5 + 7 × 3).
 *  missing  total in n equal rows (or rows of n): set the unknown by stepper, drag or keypad; the readout shows the
 *           cookies placed so far against the total (multiplication backwards).
 */
const CELL = 40;
const PAD = 18;
const BUILD_MAX = { rows: 6, cols: 10 };
const MISSING_MAX = 12;

export function TrayBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const { reducedMotion } = useApp();
  const svgRef = useRef<SVGSVGElement>(null);

  // ---- build: rows × columns ----
  const [rc, setRc] = useState({ rows: 1, cols: 1 });
  const buildModel = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (s.kind === "build" && buildModel !== null) setRc({ rows: buildRows(buildModel), cols: buildCols(buildModel) });
  }, [buildModel]); // eslint-disable-line react-hooks/exhaustive-deps
  const buildLocked = !f.canAct || buildModel !== null;
  const setBuild = (rows: number, cols: number) => {
    if (buildLocked) return;
    const next = { rows: clamp(rows, 1, BUILD_MAX.rows), cols: clamp(cols, 1, BUILD_MAX.cols) };
    if (next.rows !== rc.rows || next.cols !== rc.cols) audio.play("tap", { gain: 0.25 });
    setRc(next);
    busy?.();
  };

  // ---- typed / stepped number (count, fact, missing) ----
  const en = useEntry(st, s.kind === "missing" ? "1" : "");
  const missingVal = s.kind === "missing" ? (en.value ?? 0) : 0;
  const stepMissing = (by: number) => en.set(clamp(missingVal + by, 1, MISSING_MAX));

  const check = () => {
    if (!f.canAct) return;
    if (s.kind === "build") {
      const code = buildCode(rc.rows, rc.cols);
      if (buildModel !== null && code !== buildModel) return;
      return submit(code);
    }
    const v = en.modelValue ?? en.value;
    if (v === null) return;
    submit(v);
  };

  useBoardKeys({
    digit: s.kind === "build" ? undefined : en.type,
    back: s.kind === "build" ? undefined : en.back,
    enter: check,
    arrow: (d) => {
      if (s.kind === "build") setBuild(rc.rows + (d === "down" ? 1 : d === "up" ? -1 : 0), rc.cols + (d === "right" ? 1 : d === "left" ? -1 : 0));
      else if (s.kind === "missing") stepMissing(d === "up" || d === "right" ? 1 : -1);
    },
  });

  // ---- geometry ----
  const geo = (() => {
    switch (s.kind) {
      case "build": return { rows: BUILD_MAX.rows, cols: BUILD_MAX.cols, filledR: rc.rows, filledC: rc.cols };
      case "missing": {
        const shown = clamp(missingVal, 0, MISSING_MAX);
        return s.v === 0 ? { rows: s.a, cols: MISSING_MAX, filledR: s.a, filledC: shown } : { rows: MISSING_MAX, cols: s.a, filledR: shown, filledC: s.a };
      }
      default: return { rows: s.a, cols: s.b, filledR: s.a, filledC: s.b };
    }
  })();
  const labelSpace = s.kind === "count" || s.kind === "fact" ? 56 : 0;
  const vw = geo.cols * CELL + PAD * 2 + labelSpace;
  const vh = geo.rows * CELL + PAD * 2 + (s.kind === "fact" ? 30 : 0);
  const y0 = PAD + (s.kind === "fact" ? 30 : 0);

  // ---- drag on the tray (build, missing) ----
  const draggable = (s.kind === "build" || s.kind === "missing") && f.canAct && (s.kind === "build" ? buildModel === null : en.modelValue === null);
  const drag = usePointerDrag((e) => {
    const c = cellAt(svgRef.current, e, { x0: PAD, y0, cell: CELL, vw, vh });
    if (!c) return;
    if (s.kind === "build") setBuild(c.row + 1, c.col + 1);
    else if (s.v === 0) en.set(clamp(c.col + 1, 1, MISSING_MAX));
    else en.set(clamp(c.row + 1, 1, MISSING_MAX));
  }, draggable, busy);

  // ---- hints on the tray ----
  const rowLabels = s.kind === "count" && (f.hinted || f.solved);
  const skip = s.kind === "count" && f.modelOn;
  const split = (() => {
    if (s.kind !== "fact" || !(f.hinted || f.solved)) return null;
    const [x, y] = splitFor(s.b);
    if (y > 0) return { dir: "col" as const, at: x, parts: [`${s.a} × ${x} = ${f.modelOn || f.solved ? s.a * x : "?"}`, `${s.a} × ${y} = ${f.modelOn || f.solved ? s.a * y : "?"}`] };
    const [p, q] = splitFor(s.a);
    if (q > 0) return { dir: "row" as const, at: p, parts: [`${p} × ${s.b}`, `${q} × ${s.b}`] };
    return null;
  })();
  const small = geo.rows * geo.cols > 60;

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < geo.rows; r++) {
    for (let c = 0; c < geo.cols; c++) {
      const x = PAD + c * CELL + CELL / 2, y = y0 + r * CELL + CELL / 2;
      const filled = r < geo.filledR && c < geo.filledC;
      if (!filled) {
        cells.push(<circle key={`d${r}-${c}`} cx={x} cy={y} r={CELL * 0.34} fill="#C9D1DF" opacity="0.7" />);
        continue;
      }
      cells.push(small
        ? <g key={`c${r}-${c}`}><circle cx={x} cy={y} r={CELL * 0.4} fill={BK.crust} stroke={BK.ink} strokeWidth="3" /><circle cx={x - 4} cy={y - 3} r="3.5" fill={BK.choc} /><circle cx={x + 5} cy={y + 4} r="3" fill={BK.choc} /></g>
        : <CookieShape key={`c${r}-${c}`} x={x} y={y} r={CELL * 0.45} />);
    }
  }

  const tray = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${vw} ${vh}`}
      className={`bk-tray ${draggable ? "is-drag" : ""}`}
      role="img"
      aria-label={ex.a11yDescription}
      data-testid="bk-tray"
      data-geo={`${PAD},${y0},${CELL},${vw},${vh}`}
      {...(draggable ? drag.props : {})}
    >
      <rect x="4" y={y0 - PAD + 4} width={geo.cols * CELL + PAD * 2 - 8} height={geo.rows * CELL + PAD * 2 - 8} rx="18" fill={BK.tray} stroke={BK.ink} strokeWidth="6" />
      <rect x={PAD - 6} y={y0 - 6} width={geo.cols * CELL + 12} height={geo.rows * CELL + 12} rx="10" fill={BK.trayIn} />
      {(s.kind === "build" || s.kind === "missing") && (
        <rect x={PAD} y={y0} width={geo.filledC * CELL} height={geo.filledR * CELL} rx="8" fill="#FFF3BF" className={reducedMotion ? "" : "bk-grow"} />
      )}
      {cells}
      {/* the drag handle at the filled area's corner */}
      {draggable && geo.filledC > 0 && geo.filledR > 0 && (
        <g className="bk-handle" aria-hidden="true">
          <circle cx={PAD + geo.filledC * CELL} cy={y0 + geo.filledR * CELL} r="13" fill={BK.gold} stroke={BK.ink} strokeWidth="4" />
          <path d={`M${PAD + geo.filledC * CELL - 5} ${y0 + geo.filledR * CELL} h10 M${PAD + geo.filledC * CELL} ${y0 + geo.filledR * CELL - 5} v10`} stroke={BK.ink} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {rowLabels && Array.from({ length: s.a }, (_, r) => (
        <text key={r} x={PAD * 2 + s.b * CELL + 4} y={y0 + r * CELL + CELL / 2 + 7} className={`bk-svg-label ${skip ? "is-skip" : ""}`} style={{ opacity: !skip || alongIndex < 0 || alongIndex >= 1 ? 1 : 0.2 }}>
          {skip ? (r + 1) * s.b : s.b}
        </text>
      ))}
      {split && split.dir === "col" && (
        <g>
          <line x1={PAD + split.at * CELL} y1={y0 - 26} x2={PAD + split.at * CELL} y2={y0 + s.a * CELL + 6} stroke={BK.icingDeep} strokeWidth="5" strokeDasharray="10 7" />
          <text x={PAD + (split.at * CELL) / 2} y={y0 - 10} textAnchor="middle" className="bk-svg-label is-small">{split.parts[0]}</text>
          <text x={PAD + split.at * CELL + ((s.b - split.at) * CELL) / 2} y={y0 - 10} textAnchor="middle" className="bk-svg-label is-small">{split.parts[1]}</text>
        </g>
      )}
      {split && split.dir === "row" && (
        <g>
          <line x1={PAD - 6} y1={y0 + split.at * CELL} x2={PAD + s.b * CELL + 6} y2={y0 + split.at * CELL} stroke={BK.icingDeep} strokeWidth="5" strokeDasharray="10 7" />
          <text x={PAD + s.b * CELL + 10} y={y0 + (split.at * CELL) / 2 + 6} className="bk-svg-label is-small">{split.parts[0]}</text>
          <text x={PAD + s.b * CELL + 10} y={y0 + split.at * CELL + ((s.a - split.at) * CELL) / 2 + 6} className="bk-svg-label is-small">{split.parts[1]}</text>
        </g>
      )}
    </svg>
  );

  const readout = (() => {
    if (s.kind === "build") return `${rc.rows} row${rc.rows === 1 ? "" : "s"} of ${rc.cols} = ${rc.rows * rc.cols} cookies`;
    if (s.kind === "missing") {
      const v = missingVal;
      const placed = s.v === 0 ? s.a * v : v * s.a;
      const words = s.v === 0 ? `${s.a} rows of ${v}` : `${v} row${v === 1 ? "" : "s"} of ${s.a}`;
      return `${words} = ${placed} of ${s.a * s.b} cookies${v > MISSING_MAX ? " (more than one tray holds)" : ""}`;
    }
    return null;
  })();

  return (
    <div className={`bk-stage mode-tray kind-${s.kind}`} data-testid="bk-board" data-mode="tray" data-kind={s.kind} data-rows={rc.rows} data-cols={rc.cols} data-value={s.kind === "build" ? "" : en.entry}>
      <Tab mode="tray" sub={s.kind === "missing" ? "Equal rows" : s.kind === "build" ? "Build a tray" : undefined} />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Baking tray">
          <div className="bk-pic">{tray}</div>
          {readout && <p className="bk-readout" data-testid="bk-readout" aria-live="polite">{readout}</p>}
        </section>
        <section className="bk-panel" aria-label="Your answer">
          {s.kind === "build" ? (
            <div className="bk-build" data-bk-idle="true">
              <div className="bk-steppers">
                <Stepper id="rows" label="Rows" value={rc.rows} min={1} max={BUILD_MAX.rows} unitLabel="row" disabled={buildLocked} onStep={(by) => setBuild(rc.rows + by, rc.cols)} />
                <Stepper id="cols" label="In each row" value={rc.cols} min={1} max={BUILD_MAX.cols} unitLabel="cookie in each row" disabled={buildLocked} onStep={(by) => setBuild(rc.rows, rc.cols + by)} />
              </div>
              <CheckButton st={st} onCheck={check} label={`Check the tray: ${rc.rows} rows of ${rc.cols}`} ready />
            </div>
          ) : (
            <>
              {s.kind === "missing" && (
                <Stepper id="value" label={s.v === 0 ? "In each row" : "Rows"} value={missingVal} min={1} max={MISSING_MAX} unitLabel={s.v === 0 ? "cookie in each row" : "row"} disabled={en.locked} onStep={stepMissing} />
              )}
              <Keypad
                st={st}
                entry={en.entry}
                onType={en.type}
                onBack={en.back}
                onCheck={check}
                label={s.kind === "missing" ? (s.v === 0 ? "In each row" : "Rows") : "Cookies"}
                checkLabel={`Check: ${en.entry || "nothing typed"}`}
                showDisplay={s.kind !== "missing"}
              />
            </>
          )}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
