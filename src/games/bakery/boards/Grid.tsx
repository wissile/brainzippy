import { useRef } from "react";
import type { BoardProps } from "../../../game/boards";
import { BK } from "../art";
import { clamp, decode, lshapeParts, perimeter } from "../logic";
import { Keypad, ModelSteps, Stepper, Tab, cellAt, flags, useBoardKeys, useEntry, usePointerDrag, useSubmit } from "./shared";

/**
 * Tray Builder (math.geom.area-perimeter): Bobbo's trays on squared baking paper.
 *  area     tiles inside (drawn at first; later only the side lengths). Hint: the tiles appear, row by row.
 *  perim    ribbon round the edge. Early: all on the grid; later two sides labelled (opposite sides are equal).
 *           Hint: every side labelled and the unit steps marked along the edge.
 *  make     a tray of a given width and area: set the height (stepper, drag the top edge, arrow keys or keypad).
 *  lshape   an L-shaped tray with every side labelled. Hint: a dashed cut into two rectangles.
 * Misconception targeted throughout: area (tiles inside) vs perimeter (length round the edge) — "fence posts vs floor
 * tiles" (docs/curriculum/maths.md, Gloop's Room Builder).
 */
const CELL = 36;
const PAD = 46;
const MAKE_MAX = 12;

export function GridBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const svgRef = useRef<SVGSVGElement>(null);
  const en = useEntry(st, s.kind === "make" ? "1" : "");
  const h = s.kind === "make" ? (en.value ?? 0) : s.b;
  const stepH = (by: number) => en.set(clamp(h + by, 1, MAKE_MAX));
  const check = () => {
    const v = en.modelValue ?? en.value;
    if (v === null || !f.canAct) return;
    submit(v);
  };
  useBoardKeys({
    digit: en.type,
    back: en.back,
    enter: check,
    arrow: (d) => s.kind === "make" && stepH(d === "up" || d === "right" ? 1 : -1),
  });

  const W = s.a;
  const H = s.kind === "make" ? MAKE_MAX : s.b;
  const vw = W * CELL + PAD * 2;
  const vh = H * CELL + PAD * 2;
  const x0 = PAD, y0 = PAD;
  const showTiles = s.kind === "make" || (s.kind === "area" && (s.v === 1 || f.hinted || f.solved)) || (s.kind === "lshape" && f.modelOn);
  const paper = s.v === 1 || s.kind === "make";
  const allSides = s.kind !== "perim" || s.v === 1 || f.hinted || f.solved;

  const draggable = s.kind === "make" && f.canAct && en.modelValue === null;
  const drag = usePointerDrag((e) => {
    const c = cellAt(svgRef.current, e, { x0, y0, cell: CELL, vw, vh });
    if (c) en.set(clamp(MAKE_MAX - c.row, 1, MAKE_MAX));
  }, draggable, busy);

  // the tray outline
  const rectTop = s.kind === "make" ? y0 + (MAKE_MAX - clamp(h, 0, MAKE_MAX)) * CELL : y0;
  const rectH = s.kind === "make" ? clamp(h, 0, MAKE_MAX) * CELL : s.b * CELL;
  const path = s.kind === "lshape"
    ? `M${x0} ${y0} H${x0 + (s.a - s.c) * CELL} V${y0 + s.d * CELL} H${x0 + s.a * CELL} V${y0 + s.b * CELL} H${x0} Z`
    : `M${x0} ${rectTop} h${W * CELL} v${rectH} h${-W * CELL} Z`;

  const tiles: React.ReactNode[] = [];
  if (showTiles) {
    const rows = s.kind === "make" ? clamp(h, 0, MAKE_MAX) : s.b;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < W; c++) {
        if (s.kind === "lshape" && r < s.d && c >= s.a - s.c) continue;
        const x = x0 + c * CELL, y = (s.kind === "make" ? rectTop : y0) + r * CELL;
        tiles.push(<rect key={`${r}-${c}`} x={x + 2} y={y + 2} width={CELL - 4} height={CELL - 4} rx="4" fill={(r + c) % 2 ? "#F7C57E" : "#F3B868"} className="bk-tile" style={{ animationDelay: `${r * 60}ms` }} />);
      }
    }
  }

  // unit steps along the edge (perimeter hint)
  const edgeMarks: React.ReactNode[] = [];
  if (s.kind === "perim" && (f.hinted || f.solved)) {
    let n = 0;
    const pts: [number, number][] = [];
    for (let i = 1; i <= s.a; i++) pts.push([x0 + i * CELL, y0]);
    for (let i = 1; i <= s.b; i++) pts.push([x0 + s.a * CELL, y0 + i * CELL]);
    for (let i = 1; i <= s.a; i++) pts.push([x0 + (s.a - i) * CELL, y0 + s.b * CELL]);
    for (let i = 1; i <= s.b; i++) pts.push([x0, y0 + (s.b - i) * CELL]);
    for (const [x, y] of pts) {
      n += 1;
      edgeMarks.push(<circle key={n} cx={x} cy={y} r="5" fill={BK.icingDeep} />);
    }
  }

  const label = (x: number, y: number, t: string | number, key: string, anchor: "middle" | "start" | "end" = "middle") => (
    <text key={key} x={x} y={y} textAnchor={anchor} className="bk-svg-label">{t}</text>
  );
  const labels: React.ReactNode[] = [];
  if (s.kind === "lshape") {
    labels.push(
      label(x0 + (s.a * CELL) / 2, y0 + s.b * CELL + 32, s.a, "b"),
      label(x0 - 12, y0 + (s.b * CELL) / 2 + 8, s.b, "l", "end"),
      label(x0 + ((s.a - s.c) * CELL) / 2, y0 - 12, s.a - s.c, "t"),
      label(x0 + (s.a - s.c) * CELL - 10, y0 + (s.d * CELL) / 2 + 8, s.d, "nd", "end"),
      label(x0 + (s.a - s.c / 2) * CELL, y0 + s.d * CELL - 10, s.c, "nw"),
      label(x0 + s.a * CELL + 12, y0 + ((s.d + s.b) / 2) * CELL + 8, s.b - s.d, "r", "start"),
    );
  } else if (s.kind === "make") {
    labels.push(label(x0 + (W * CELL) / 2, y0 + MAKE_MAX * CELL + 32, W, "w"));
    labels.push(label(x0 + W * CELL + 12, rectTop + rectH / 2 + 8, h > 0 ? h : "?", "h", "start"));
  } else {
    labels.push(label(x0 + (W * CELL) / 2, y0 + s.b * CELL + 32, W, "b"), label(x0 - 12, y0 + (s.b * CELL) / 2 + 8, s.b, "l", "end"));
    if (allSides) labels.push(label(x0 + (W * CELL) / 2, y0 - 12, W, "t"), label(x0 + W * CELL + 12, y0 + (s.b * CELL) / 2 + 8, s.b, "r", "start"));
  }

  const split = s.kind === "lshape" && (f.hinted || f.solved) ? lshapeParts(s) : null;

  const svg = (
    <svg ref={svgRef} viewBox={`0 0 ${vw} ${vh}`} className={`bk-grid ${draggable ? "is-drag" : ""}`} role="img" aria-label={ex.a11yDescription} data-testid="bk-grid" {...(draggable ? drag.props : {})}>
      <rect x="0" y="0" width={vw} height={vh} rx="16" fill="#FFFDF7" />
      {paper && (
        <g stroke="#E5D9C3" strokeWidth="2">
          {Array.from({ length: W + 1 }, (_, i) => <line key={`v${i}`} x1={x0 + i * CELL} y1={y0} x2={x0 + i * CELL} y2={y0 + H * CELL} />)}
          {Array.from({ length: H + 1 }, (_, i) => <line key={`h${i}`} x1={x0} y1={y0 + i * CELL} x2={x0 + W * CELL} y2={y0 + i * CELL} />)}
        </g>
      )}
      <path d={path} fill={showTiles ? "#E9A85A" : BK.dough} stroke="none" />
      {tiles}
      <path d={path} fill="none" stroke={s.kind === "perim" ? BK.icingDeep : BK.ink} strokeWidth={s.kind === "perim" ? 9 : 6} strokeLinejoin="round" className={s.kind === "perim" ? "bk-ribbon" : ""} />
      {edgeMarks}
      {split && (
        <g>
          <line x1={x0 + split[0][0] * CELL} y1={y0 + s.d * CELL} x2={x0 + split[0][0] * CELL} y2={y0 + s.b * CELL} stroke={BK.icingDeep} strokeWidth="5" strokeDasharray="10 7" />
          <text x={x0 + (split[0][0] * CELL) / 2} y={y0 + (s.b * CELL) / 2 + 8} textAnchor="middle" className="bk-svg-label is-part">{f.modelOn || f.solved ? `${split[0][0]} × ${split[0][1]}` : "A"}</text>
          <text x={x0 + (split[0][0] + split[1][0] / 2) * CELL} y={y0 + ((s.d + s.b) / 2) * CELL + 8} textAnchor="middle" className="bk-svg-label is-part">{f.modelOn || f.solved ? `${split[1][0]} × ${split[1][1]}` : "B"}</text>
        </g>
      )}
      {draggable && (
        <g className="bk-handle" aria-hidden="true">
          <rect x={x0 + (W * CELL) / 2 - 26} y={rectTop - 9} width="52" height="18" rx="9" fill={BK.gold} stroke={BK.ink} strokeWidth="4" />
        </g>
      )}
      {labels}
    </svg>
  );

  const readout = (() => {
    if (s.kind === "make") return f.hinted || f.solved ? `${W} × ${h} = ${W * h} tiles (need ${s.a * s.b})` : `${W} wide, ${h} high`;
    if (s.kind === "area" && (f.hinted || f.solved)) return `${s.b} rows of ${s.a} tiles`;
    if (s.kind === "perim" && (f.hinted || f.solved)) return `${s.a} + ${s.b} + ${s.a} + ${s.b}`;
    return null;
  })();
  const unit = s.kind === "perim" ? "units" : s.kind === "make" ? "high" : "tiles";

  return (
    <div className={`bk-stage mode-grid kind-${s.kind}`} data-testid="bk-board" data-mode="grid" data-kind={s.kind} data-value={en.entry} data-perimeter={perimeter(s.a, s.b)}>
      <Tab mode="grid" sub={s.kind === "perim" ? "Perimeter" : s.kind === "make" ? "Build to an area" : "Area"} />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Tray on baking paper">
          <div className="bk-pic">{svg}</div>
          {readout && <p className="bk-readout" data-testid="bk-readout" aria-live="polite">{readout}</p>}
        </section>
        <section className="bk-panel" aria-label="Your answer">
          {s.kind === "make" && <Stepper id="value" label="Height" value={h} min={1} max={MAKE_MAX} unitLabel="row of height" disabled={en.locked} onStep={stepH} />}
          <Keypad st={st} entry={en.entry} onType={en.type} onBack={en.back} onCheck={check} label={s.kind === "perim" ? "Ribbon" : s.kind === "make" ? "Height" : "Area"} unit={unit}
            checkLabel={`Check: ${en.entry || "nothing typed"} ${unit}`} showDisplay={s.kind !== "make"} />
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
