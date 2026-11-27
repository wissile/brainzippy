import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import { INK } from "../../../characters/palette";
import type { BoardProps } from "../../../game/boards";
import type { ExerciseState } from "../../../engine/session";
import { Buoy, LN, Ship, Tower } from "../art";
import { DIAL_STEP, POSITIONS, REF_BEARING, REF_LETTER, SHIPS, boardOf, fmtBearing, mod360, modeOf, p, valueAt } from "../logic";
import { AngleMark, BeamRay, Lamp, type Mark, at, bearingToMath, ar } from "./geom";
import { FinaleBoat, Keypad, Method, ModelSteps, Options, Stage, flags, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Beam Angles (math.geom.angles, math.geom.bearings). The lamp's beams make the angles: along the straight harbour
 * wall, all the way round the lamp, two crossing beams, the lighthouse–buoy–ship triangle, and the beam crossing two
 * parallel shipping lanes. Bearings use a compass round the lighthouse; back bearings are answered by TURNING the
 * beam (drag it round, the turn buttons, or arrow keys on the dial), then Shine. Angle facts use the keypad.
 * After the answer (or with the worked model) the unknown angle shows its value.
 */
export function BeamBoard(props: BoardProps) {
  const { st } = props;
  const ex = st.exercise;
  const b = boardOf(ex);
  const fin = modeOf(ex) === "home";
  const f = flags(st);
  const reveal = f.solved || f.modelOn;
  const scene = (() => {
    switch (b) {
      case "line": return <LineDiagram st={st} reveal={reveal} />;
      case "point": return <PointDiagram st={st} reveal={reveal} />;
      case "kind": return <KindDiagram st={st} reveal={reveal} />;
      case "vert": return <VertDiagram st={st} reveal={reveal} />;
      case "tri": return <TriDiagram st={st} reveal={reveal} />;
      case "par":
      case "reason": return <ParDiagram st={st} reveal={reveal} both={b === "reason"} />;
      case "bread": return <BearingDiagram st={st} reveal={reveal} />;
      default: return null;
    }
  })();
  if (b === "bback") return <DialBoard {...props} />;
  const a = ex.answer;
  return (
    <Stage
      ex={ex}
      sub={fin ? "Bobbo's boat" : SUB[b]}
      extra={{ board: b }}
      scene={<>{scene}{fin && <FinaleBoat st={st} />}</>}
      panel={<>
        <Method ex={ex} st={st} />
        {a.kind === "choice" ? (
          <Options st={st} act={props.act} busy={props.busy} options={a.options} label={b === "kind" ? "Angle type" : "Angle fact"} />
        ) : (
          <Keypad st={st} act={props.act} busy={props.busy} unit={b === "bread" ? "° bearing" : "°"} pad3={b === "bread"} maxLen={3} label={b === "bread" ? "Bearing keypad" : "Angle keypad"} />
        )}
        <ModelSteps ex={ex} st={st} alongIndex={props.alongIndex} />
      </>}
    />
  );
}

const SUB: Partial<Record<string, string>> = {
  line: "Along the wall", point: "Round the lamp", kind: "The sweep", vert: "Crossing beams", tri: "Lighthouse, buoy, ship",
  par: "Parallel lanes", reason: "Parallel lanes", bread: "Bearings",
};

const unknownKind = (reveal: boolean): Mark => (reveal ? "model" : "unknown");
const xLabel = (value: number, reveal: boolean) => (reveal ? `x = ${value}°` : "x");

// ------------------------------------------------------------------------------------------------ along the wall
function LineDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const n = p(ex, "n");
  const parts = [p(ex, "p0"), p(ex, "p1"), p(ex, "p2")].slice(0, n);
  const u = p(ex, "u");
  const eq = p(ex, "eq") === 1;
  const cx = 200, cy = 192;
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((s, x) => s + x, 0));
  const isX = (i: number) => (eq ? i < 2 : i === u);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 226" style={ar(400, 226)} role="img" aria-label="Angles along the straight harbour wall" data-testid="ln-diagram">
      <rect x="10" y={cy} width="380" height="18" rx="4" fill={LN.stormLight} stroke={INK} strokeWidth="4" />
      <path d={`M40 ${cy + 4} V${cy + 18} M100 ${cy + 4} V${cy + 18} M160 ${cy + 4} V${cy + 18} M240 ${cy + 4} V${cy + 18} M300 ${cy + 4} V${cy + 18} M360 ${cy + 4} V${cy + 18}`} stroke={INK} strokeWidth="2" opacity="0.4" />
      <text x="16" y={cy - 8} className="ln-svg-small">harbour wall (a straight line)</text>
      {starts.slice(1).map((s, i) => <BeamRay key={i} cx={cx} cy={cy} a={s} len={160} />)}
      {parts.map((v, i) => (
        <AngleMark key={i} cx={cx} cy={cy} a0={starts[i]!} a1={starts[i]! + v} r={i % 2 ? 54 : 38} label={isX(i) ? xLabel(v, reveal) : `${v}°`} kind={isX(i) ? unknownKind(reveal) : "given"} />
      ))}
      <Lamp cx={cx} cy={cy} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ round the lamp
function PointDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const n = p(ex, "n");
  const parts = [p(ex, "p0"), p(ex, "p1"), p(ex, "p2"), p(ex, "p3")].slice(0, n);
  const u = p(ex, "u"), r0 = p(ex, "r");
  const cx = 200, cy = 116;
  const starts = parts.map((_, i) => r0 + parts.slice(0, i).reduce((s, x) => s + x, 0));
  return (
    <svg className="ln-diagram" viewBox="0 0 400 232" style={ar(400, 232)} role="img" aria-label="Beams all the way round the lamp" data-testid="ln-diagram">
      <circle cx={cx} cy={cy} r="104" fill={LN.night} opacity="0.08" />
      {starts.map((s, i) => <BeamRay key={i} cx={cx} cy={cy} a={s} len={106} />)}
      {parts.map((v, i) => (
        <AngleMark key={i} cx={cx} cy={cy} a0={starts[i]!} a1={starts[i]! + v} r={i % 2 ? 40 : 30} label={i === u ? xLabel(v, reveal) : `${v}°`} kind={i === u ? unknownKind(reveal) : "given"} />
      ))}
      <Lamp cx={cx} cy={cy} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ angle types
function KindDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const a = p(ex, "a"), r0 = p(ex, "r");
  const cx = 200, cy = 116;
  const [dx, dy] = at(cx, cy, 104, r0);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 232" style={ar(400, 232)} role="img" aria-label="The beam's sweep from the dashed line" data-testid="ln-diagram">
      <path d={`M${cx} ${cy} L${dx} ${dy}`} stroke={INK} strokeWidth="4" strokeDasharray="10 8" strokeLinecap="round" />
      <BeamRay cx={cx} cy={cy} a={r0 + a} len={106} />
      <AngleMark cx={cx} cy={cy} a0={r0} a1={r0 + a} r={34} label={reveal ? `${a}°` : ""} kind={reveal ? "model" : "unknown"} />
      <Lamp cx={cx} cy={cy} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ crossing beams
function VertDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const a = p(ex, "a"), r0 = p(ex, "r"), opp = p(ex, "opp") === 1;
  const cx = 200, cy = 116;
  const x0 = opp ? r0 + 180 : r0 + a;
  const x1 = opp ? r0 + 180 + a : r0 + 180;
  const value = opp ? a : 180 - a;
  return (
    <svg className="ln-diagram" viewBox="0 0 400 232" style={ar(400, 232)} role="img" aria-label="Two straight beams crossing at the lamp" data-testid="ln-diagram">
      {[r0, r0 + 180, r0 + a, r0 + a + 180].map((s, i) => <BeamRay key={i} cx={cx} cy={cy} a={s} len={110} soft={false} />)}
      <AngleMark cx={cx} cy={cy} a0={r0} a1={r0 + a} r={34} label={`${a}°`} />
      <AngleMark cx={cx} cy={cy} a0={x0} a1={x1} r={opp ? 34 : 44} label={xLabel(value, reveal)} kind={unknownKind(reveal)} />
      <Lamp cx={cx} cy={cy} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ the triangle
function TriDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const A = p(ex, "A"), B = p(ex, "B"), C = p(ex, "C"), u = p(ex, "u"), iso = p(ex, "iso") === 1, ig = p(ex, "ig");
  const ext = p(ex, "ext");
  const fin = modeOf(ex) === "home";
  // math coordinates: B (buoy) at the origin, C (ship) on the x-axis, A (lighthouse) above
  const L = 100;
  const ab = (L * Math.sin((C * Math.PI) / 180)) / Math.sin((A * Math.PI) / 180);
  const P = { B: [0, 0], C: [L, 0], A: [ab * Math.cos((B * Math.PI) / 180), ab * Math.sin((B * Math.PI) / 180)] } as const;
  const xs = [0, L, P.A[0], ...(ext ? [-0.45 * L] : [])], ys = [0, P.A[1]];
  const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const s = Math.min(320 / (maxX - minX), 160 / maxY);
  const ox = 200 - (s * (minX + maxX)) / 2, oy = 196;
  const sv = ([x, y]: readonly [number, number] | readonly number[]): [number, number] => [ox + s * x!, oy - s * y!];
  const [bx, by] = sv(P.B), [cx2, cy2] = sv(P.C), [ax, ay] = sv(P.A);
  const deg = (dx: number, dy: number) => (Math.atan2(dy, dx) * 180) / Math.PI;
  const dirAB = deg(P.B[0] - P.A[0], P.B[1] - P.A[1]);
  let dirAC = deg(P.C[0] - P.A[0], P.C[1] - P.A[1]);
  while (dirAC < dirAB) dirAC += 360;
  const shown = (i: number) => (iso ? (ig === 0 ? i === 0 : i === 1) : i !== u);
  const angles = [A, B, C];
  const label = (i: number) => (i === u ? xLabel(angles[i]!, reveal) : shown(i) ? `${angles[i]}°` : "");
  const kind = (i: number): Mark => (i === u ? unknownKind(reveal) : shown(i) ? "given" : "plain");
  const hide = (i: number) => fin && i === 1; // the finale gives the outside angle at the buoy instead
  const tick = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const ang = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
    return `M${mx - 7 * Math.cos(ang)} ${my - 7 * Math.sin(ang)} L${mx + 7 * Math.cos(ang)} ${my + 7 * Math.sin(ang)}`;
  };
  const [ex2, ey2] = sv([-0.45 * L, 0]);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 226" style={ar(400, 226)} role="img" aria-label="A triangle joining the lighthouse, a buoy and a ship" data-testid="ln-diagram">
      <path d={`M${bx} ${by} L${cx2} ${cy2} L${ax} ${ay} Z`} fill={LN.lampSoft} fillOpacity="0.35" stroke={INK} strokeWidth="4" strokeLinejoin="round" strokeDasharray="0" />
      {ext ? <path d={`M${bx} ${by} L${ex2} ${ey2}`} stroke={INK} strokeWidth="4" strokeDasharray="8 6" /> : null}
      {iso && <path d={`${tick(ax, ay, bx, by)} ${tick(ax, ay, cx2, cy2)}`} stroke={INK} strokeWidth="4" />}
      {!hide(0) && <AngleMark cx={ax} cy={ay} a0={dirAB} a1={dirAC} r={22} label={label(0)} kind={kind(0)} />}
      {!hide(1) && <AngleMark cx={bx} cy={by} a0={0} a1={B} r={24} label={label(1)} kind={kind(1)} />}
      {fin && <AngleMark cx={bx} cy={by} a0={B} a1={180} r={26} label={`${ext}°`} />}
      <AngleMark cx={cx2} cy={cy2} a0={180 - C} a1={180} r={24} label={label(2)} kind={kind(2)} />
      <g transform={`translate(${ax - 9} ${ay - 46}) scale(0.15)`}><Tower /></g>
      <g transform={`translate(${bx - 10} ${by - 2}) scale(0.5)`}><Buoy /></g>
      {!fin && <g transform={`translate(${cx2 - 4} ${cy2 - 14}) scale(0.32)`}><Ship colour="#7DBE6E" /></g>}
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ parallel lanes
function ParDiagram({ st, reveal, both }: { st: ExerciseState; reveal: boolean; both: boolean }) {
  const ex = st.exercise;
  const th = p(ex, "th"), phi = p(ex, "fl") ? 180 - th : th;
  const gp = POSITIONS[p(ex, "gp")] ?? "TR", qp = POSITIONS[p(ex, "qp")] ?? "TR";
  const yU = 74, yL = 168;
  const d = (yL - yU) / Math.tan((phi * Math.PI) / 180);
  const xU = 200 + d / 2, xL = 200 - d / 2;
  const sector = (pos: string): [number, number] => (pos === "TR" ? [0, phi] : pos === "TL" ? [phi, 180] : pos === "BL" ? [180, 180 + phi] : [180 + phi, 360]);
  const given = valueAt(gp, phi), x = valueAt(qp, phi);
  const [t1x, t1y] = at(xL, yL, 64, phi + 180), [t2x, t2y] = at(xU, yU, 64, phi);
  const chevron = (y: number) => `M318 ${y - 7} L328 ${y} L318 ${y + 7} M330 ${y - 7} L340 ${y} L330 ${y + 7}`;
  const [g0, g1] = sector(gp), [q0, q1] = sector(qp);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 236" style={ar(400, 236)} role="img" aria-label="Two parallel shipping lanes crossed by the beam" data-testid="ln-diagram">
      {[yU, yL].map((y) => (
        <g key={y}>
          <path d={`M12 ${y} H388`} stroke={LN.seaLight} strokeWidth="10" opacity="0.35" />
          <path d={`M12 ${y} H388`} stroke={INK} strokeWidth="4" strokeDasharray="16 8" />
          <path d={chevron(y)} stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <text x="14" y={yU - 10} className="ln-svg-small">lane A</text>
      <text x="14" y={yL - 10} className="ln-svg-small">lane B (parallel)</text>
      <path d={`M${t1x} ${t1y} L${t2x} ${t2y}`} stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d={`M${t1x} ${t1y} L${t2x} ${t2y}`} stroke={LN.lamp} strokeWidth="3" strokeLinecap="round" />
      <AngleMark cx={xU} cy={yU} a0={g0} a1={g1} r={24} label={`${given}°`} kind={both ? "model" : "given"} />
      <AngleMark cx={xL} cy={yL} a0={q0} a1={q1} r={24} label={both ? `${x}°` : xLabel(x, reveal)} kind={both ? "model" : unknownKind(reveal)} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ bearings
function Compass({ cx, cy, R, children }: { cx: number; cy: number; R: number; children?: React.ReactNode }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill={LN.paper} stroke={INK} strokeWidth="4" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = bearingToMath(i * 10);
        const [x1, y1] = at(cx, cy, R, a), [x2, y2] = at(cx, cy, R - (i % 9 === 0 ? 12 : i % 3 === 0 ? 8 : 4), a);
        return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={INK} strokeWidth={i % 9 === 0 ? 3 : 1.5} />;
      })}
      {REF_LETTER.map((l, i) => {
        const [x, y] = at(cx, cy, R + 13, bearingToMath(REF_BEARING[i]!));
        return <text key={l} x={x} y={y} className={`ln-svg-compass ${l === "N" ? "is-north" : ""}`} textAnchor="middle" dominantBaseline="central">{l}</text>;
      })}
      {children}
    </g>
  );
}

function BearingDiagram({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const ref = p(ex, "ref"), side = p(ex, "side") === 1 ? 1 : -1, d = p(ex, "d");
  const rb = REF_BEARING[ref] ?? 0;
  const b = mod360(rb + side * d);
  const cx = 200, cy = 120, R = 90;
  const shipM = bearingToMath(b), refM = bearingToMath(rb);
  const a0 = side === 1 ? shipM : refM;
  const [sx, sy] = at(cx, cy, 66, shipM);
  const [rx, ry] = at(cx, cy, R - 2, refM);
  const [nx, ny] = at(cx, cy, R - 2, 90);
  return (
    <svg className="ln-diagram" viewBox="0 0 400 236" style={ar(400, 236)} role="img" aria-label="A compass round the lighthouse with a ship" data-testid="ln-diagram">
      <Compass cx={cx} cy={cy} R={R}>
        <path d={`M${cx} ${cy} L${nx} ${ny}`} stroke={LN.red} strokeWidth="3" />
        {rb !== 0 && <path d={`M${cx} ${cy} L${rx} ${ry}`} stroke={INK} strokeWidth="2.5" strokeDasharray="6 5" />}
        {reveal && <AngleMark cx={cx} cy={cy} a0={shipM} a1={shipM + b} r={20} label="" kind="model" />}
        <AngleMark cx={cx} cy={cy} a0={a0} a1={a0 + d} r={40} label={`${d}°`} />
        <path d={`M${cx} ${cy} L${sx} ${sy}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <g transform={`translate(${sx - 14} ${sy - 9}) scale(0.24)`}><Ship colour="#FF8FB1" /></g>
        <Lamp cx={cx} cy={cy} r={6} />
        {reveal && <text x={cx} y={cy + R + 2} className="ln-svg-strong" textAnchor="middle" dominantBaseline="hanging">{`bearing ${fmtBearing(b)}`}</text>}
      </Compass>
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ the beam dial (back bearings)
const TURNS = [-30, -5, 5, 30] as const;
function DialBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const fin = modeOf(ex) === "home";
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const [v, setV] = useState(0);
  const vRef = useRef(v);
  vRef.current = v;
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (modelValue !== null) setV(modelValue);
  }, [modelValue]);
  useEffect(() => {
    if (st.phase === "answering" && st.attempts > 0 && kb.current) window.setTimeout(() => (document.querySelector('[data-testid="ln-dial"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !f.canAct || modelValue !== null;
  const turn = (dv: number) => {
    if (locked) return;
    busy?.();
    audio.play("tap", { gain: 0.25 });
    setV((x) => mod360(x + dv));
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const fromPointer = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 400 - 200;
    const y = ((e.clientY - r.top) / r.height) * 236 - 120;
    if (Math.hypot(x, y) < 12) return;
    const bearing = mod360(Math.round(((Math.atan2(x, -y) * 180) / Math.PI) / DIAL_STEP) * DIAL_STEP);
    if (bearing !== vRef.current) {
      busy?.();
      setV(bearing);
    }
  };
  const b = p(ex, "b");
  const shipName = fin ? "Bobbo's boat" : `the ${SHIPS[p(ex, "ship")] ?? "ship"}`;
  const cx = 200, cy = 120, R = 90;
  const beamM = bearingToMath(v);
  const [shx, shy] = at(cx, cy, 72, beamM);
  const answer = st.exercise.answer.kind === "numeric" ? st.exercise.answer.value : 0;
  const [ax, ay] = at(cx, cy, R - 4, bearingToMath(answer));
  return (
    <Stage
      ex={ex}
      sub={fin ? "Bobbo's boat" : "Back bearings"}
      extra={{ board: "bback", beam: v }}
      scene={<>
        <div
          className={`ln-dial ${locked ? "is-locked" : ""}`}
          data-testid="ln-dial"
          role="slider"
          tabIndex={0}
          aria-label={`Beam bearing. Turn the beam towards ${shipName}.`}
          aria-valuemin={0}
          aria-valuemax={355}
          aria-valuenow={v}
          aria-valuetext={`Beam on bearing ${fmtBearing(v)}`}
          aria-disabled={locked}
          onKeyDown={(e) => {
            const map: Record<string, number> = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 30, PageDown: -30 };
            if (e.key in map) {
              e.preventDefault();
              turn(map[e.key]!);
            } else if (e.key === "Enter" && !locked) {
              e.preventDefault();
              submit(vRef.current);
            }
          }}
        >
          <svg
            ref={svgRef}
            className="ln-diagram"
            viewBox="0 0 400 236" style={ar(400, 236)}
            aria-hidden="true"
            onPointerDown={(e) => {
              if (locked || e.button !== 0) return;
              dragging.current = true;
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              fromPointer(e);
            }}
            onPointerMove={(e) => dragging.current && !locked && fromPointer(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            <Compass cx={cx} cy={cy} R={R}>
              {!f.solved && <ellipse cx={cx + 50} cy={cy + 55} rx="70" ry="22" fill="#C6D3E3" opacity="0.5" className="ln-fog" />}
              <path d={`M${cx} ${cy} L${at(cx, cy, 150, beamM + 9).join(" ")} L${at(cx, cy, 150, beamM - 9).join(" ")} Z`} fill={LN.lamp} opacity="0.4" className="ln-dial-beam" />
              <BeamRay cx={cx} cy={cy} a={beamM} len={R + 6} soft={false} />
              {f.modelOn && <path d={`M${cx} ${cy} L${ax} ${ay}`} stroke={LN.red} strokeWidth="3" strokeDasharray="7 5" />}
              {f.solved && <g transform={`translate(${shx - 14} ${shy - 9}) scale(0.24)`}><Ship colour="#7DBE6E" /></g>}
              <Lamp cx={cx} cy={cy} r={7} />
            </Compass>
          </svg>
        </div>
        {fin && <FinaleBoat st={st} />}
      </>}
      panel={<>
        <p className="ln-radio" data-testid="ln-radio"><span className="ln-radio-tag">Radio</span> From {shipName}, the lamp is on <b>{fmtBearing(b)}</b>.</p>
        <Method ex={ex} st={st} />
        <div className={`ln-readout ${modelValue !== null && f.canAct ? "is-model" : ""}`} aria-live="polite">Beam <b data-testid="ln-beam">{fmtBearing(v)}</b></div>
        {modelValue === null && (
          <div className="ln-turns" role="group" aria-label="Turn the beam" data-ln-idle="true">
            {TURNS.map((t) => (
              <button key={t} type="button" className="ln-turn" data-testid="ln-turn" data-value={t} aria-label={`Turn the beam ${Math.abs(t)} degrees ${t > 0 ? "clockwise" : "anticlockwise"}`} aria-disabled={locked} onClick={() => turn(t)}>
                {t > 0 ? `+${t}°` : `−${-t}°`}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`ln-check ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelValue !== null && f.canAct ? "is-model" : ""}`}
          data-testid="done"
          aria-label={`Shine the beam on bearing ${fmtBearing(v)}`}
          aria-disabled={!f.canAct}
          onClick={() => {
            if (!f.canAct) return;
            audio.play("tap", { gain: 0.4 });
            submit(modelValue ?? vRef.current);
          }}
        >
          Shine
        </button>
        <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
      </>}
    />
  );
}
