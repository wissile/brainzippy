import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../../app/AppContext";
import { audio } from "../../../audio/AudioEngine";
import { INK } from "../../../characters/palette";
import type { BoardProps } from "../../../game/boards";
import { FP } from "../art";
import { AOA_MAX, AOA_MIN, SPEED_MAX, SPEED_MIN, SPEED_STEP, WING_NAMES, type Wing, isStalled, liftCoef, liftPct, modeOf, p } from "../logic";
import { ModelSteps, Options, Tab, flags, useSubmit } from "./shared";

/**
 * Wind Tunnel (pilot.aero.aoa). A fictional model wing in a tunnel with smoke streams, a lift meter and a lift graph
 * that draws itself as the child explores (one trace per airspeed, so two traces peaking at the same angle show that
 * the stall angle doesn't depend on speed). Sliders work by drag, tap (− / +) and keyboard (arrow keys).
 *   find / flaps   set the angle where the wing stalls and press "Stall angle" (numeric, ±1°)
 *   lift · speed · engine · recover   explore, then choose
 * First miss: a "too low / too high" note and the graph (if it was hidden). Second miss: the full curve with the peak
 * marked, the angle set to the critical angle, and the worked steps.
 */
const WING_COLORS = ["#4F8FE8", "#FF9A4D", "#2EC4B6", "#F2C230", "#FF7A7A"] as const;
const AIRFOIL = "M-58 0 C-58 -9 -44 -17 -18 -18 C20 -19 60 -10 92 -1 C60 3 20 6 -18 6 C-44 6 -58 5 -58 0 Z";
const PIVOT = { x: 186, y: 122 };
const STREAMS = [44, 70, 96, 148, 174, 200];
const speedColor = (s: number) => {
  const t = (s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
  return `hsl(${210 - t * 20} ${55 + t * 30}% ${68 - t * 34}%)`;
};

function streamPath(y0: number, aoa: number, w: Wing, stalled: boolean): string {
  const cl = liftCoef(aoa, w) / 2.3;
  const near = Math.exp(-Math.abs(y0 - PIVOT.y) / 55);
  const above = y0 < PIVOT.y;
  const up = 10 * cl * near * (above ? 1 : 0.6);
  const down = 34 * cl * near + 6 * cl;
  if (stalled && above) {
    // smoke leaves the upper surface near the leading edge and breaks into eddies behind the wing
    const lift0 = y0 - up - 4;
    let d = `M0 ${y0} C70 ${y0} 120 ${lift0} 160 ${lift0 - 6 * near}`;
    for (let i = 0; i < 6; i++) {
      const x = 180 + i * 38;
      const amp = 6 + i * 3 * near + 4 * near;
      d += ` Q${x} ${lift0 - amp + (i % 2) * 2 * amp} ${x + 19} ${lift0 + i * 1.5}`;
    }
    return d;
  }
  return `M0 ${y0} C90 ${y0} 120 ${y0 - up} ${PIVOT.x} ${y0 - up * 0.6 + (above ? 0 : down * 0.2)} S330 ${y0 + down} 400 ${y0 + down}`;
}

interface Point { a: number; s: number; l: number }

export function TunnelBoard({ st, act, alongIndex, busy }: BoardProps) {
  const { reducedMotion } = useApp();
  const ex = st.exercise;
  const mode = modeOf(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const isFind = mode === "find" || mode === "flaps";
  const wing: Wing = { crit: p(ex, "crit", 16), flaps: p(ex, "flaps") === 1 };
  const wName = WING_NAMES[p(ex, "w")] ?? "Model wing";
  const color = WING_COLORS[p(ex, "w")] ?? WING_COLORS[0];
  const [aoa, setAoa] = useState(() => p(ex, "aoa", 2));
  const [speed, setSpeed] = useState(() => p(ex, "spd", 100));
  const [trace, setTrace] = useState<Point[]>(() => [{ a: p(ex, "aoa", 2), s: p(ex, "spd", 100), l: liftPct(p(ex, "aoa", 2), p(ex, "spd", 100), wing) }]);
  const stalled = isStalled(aoa, wing);
  const lift = liftPct(aoa, speed, wing);
  const graphOn = p(ex, "graph") === 1 || st.hintStage >= 1;
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;
  const lastStall = useRef(stalled);

  // record each visited (angle, speed) point for the graph
  useEffect(() => {
    setTrace((t) => (t.some((q) => q.a === aoa && q.s === speed) ? t : [...t, { a: aoa, s: speed, l: liftPct(aoa, speed, wing) }]));
    if (stalled !== lastStall.current) {
      lastStall.current = stalled;
      if (stalled) audio.play("whoosh", { gain: 0.2, rate: 0.7 });
    }
  }, [aoa, speed]); // eslint-disable-line react-hooks/exhaustive-deps
  // second miss on find: the angle goes to the critical angle (errorless: the child presses "Stall angle")
  useEffect(() => {
    if (modelValue !== null && isFind) setAoa(modelValue);
  }, [modelValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const lockAoa = !f.canAct || (isFind && modelValue !== null);
  const setA = (v: number) => {
    if (lockAoa) return;
    busy?.();
    setAoa(Math.max(AOA_MIN, Math.min(AOA_MAX, Math.round(v))));
  };
  const setS = (v: number) => {
    if (!f.canAct) return;
    busy?.();
    setSpeed(Math.max(SPEED_MIN, Math.min(SPEED_MAX, Math.round(v / SPEED_STEP) * SPEED_STEP)));
  };
  const flow = stalled ? "the smoke over the top has broken away: stalled" : "smooth airflow";
  const reason = st.check?.reason;
  const showNote = isFind && st.hintStage === 1 && f.canAct && (reason === "too-low" || reason === "too-high");
  const tag = mode === "speed" || mode === "engine" || mode === "recover" ? `Tested: stalls past ${wing.crit}°` : wing.flaps ? "Flaps down" : wName;

  const smoke = useMemo(() => STREAMS.map((y) => streamPath(y, aoa, wing, stalled)), [aoa, stalled, wing.crit, wing.flaps]); // eslint-disable-line react-hooks/exhaustive-deps
  const liftLen = 16 + lift * 0.9;

  return (
    <div
      className={`fp-stage game-tunnel mode-${mode} ${reducedMotion ? "still" : ""}`}
      data-testid="fp-board"
      data-mode={mode}
      data-game="tunnel"
      data-crit={wing.crit}
      data-aoa={aoa}
      data-stalled={stalled}
    >
      <Tab game="tunnel" sub={tag} />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Wind tunnel">
          <svg className="fp-tunnel" viewBox="0 0 400 240" role="img" aria-label={`Wind tunnel: ${wName}${wing.flaps ? " with flaps down" : ""} at ${aoa} degrees, air speed ${speed} knots, lift ${Math.round(lift)} percent, ${flow}.`}>
            <rect width="400" height="240" rx="14" fill="#EAF4FA" />
            <rect y="0" width="400" height="14" fill="#9AA3B5" />
            <rect y="226" width="400" height="14" fill="#9AA3B5" />
            <g className={`fp-smoke ${stalled ? "is-stalled" : ""}`}>
              {smoke.map((d, i) => <path key={i} d={d} className={`fp-stream s${i}`} />)}
            </g>
            {stalled && (
              <g className="fp-eddies" aria-hidden="true">
                {[0, 1, 2].map((i) => <circle key={i} className={`fp-eddy e${i}`} cx={250 + i * 42} cy={PIVOT.y - 30 - (i % 2) * 10} r={8 + i * 3} />)}
              </g>
            )}
            <g transform={`translate(${PIVOT.x} ${PIVOT.y})`}>
              <path d={`M0 0 V${-liftLen}`} stroke={stalled ? "#E0525B" : "#2EAD5B"} strokeWidth="7" strokeLinecap="round" className="fp-lift-arrow" />
              <path d={`M-9 ${-liftLen + 10} L0 ${-liftLen - 2} L9 ${-liftLen + 10}`} fill="none" stroke={stalled ? "#E0525B" : "#2EAD5B"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <g transform={`rotate(${aoa})`} className={`fp-wing ${f.solved ? "is-right" : ""}`}>
                <path d={AIRFOIL} fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
                {wing.flaps && <path d="M70 0 L104 14 L98 18 L66 4 Z" fill={color} stroke={INK} strokeWidth="3" strokeLinejoin="round" />}
                <path d="M-66 0 H100" stroke={INK} strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="4 4" />
              </g>
              <circle r="5" fill="#4A4F63" stroke={INK} strokeWidth="2" />
            </g>
            <path d="M14 230 H120" stroke={INK} strokeOpacity="0.25" />
            <text x="14" y="34" className="fp-svg-label">Air → {speed} kt</text>
            <text x="14" y="214" className="fp-svg-label">{aoa}°</text>
            {/* lift meter */}
            <g transform="translate(362 26)">
              <rect width="24" height="188" rx="8" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
              <rect x="3" y={3 + 182 * (1 - lift / 100)} width="18" height={182 * (lift / 100)} rx="5" fill={stalled ? "#E0525B" : "#2EAD5B"} />
              <text x="12" y="206" textAnchor="middle" className="fp-svg-small">LIFT</text>
            </g>
          </svg>
          {graphOn && <LiftGraph trace={trace} wing={wing} speed={speed} aoa={aoa} model={f.modelOn || f.solved} />}
        </section>

        <section className="fp-panel" aria-label="Tunnel controls">
          <div className="fp-readout" aria-hidden="true">
            <span><b>{aoa}°</b> angle</span>
            <span><b>{Math.round(lift)}%</b> lift</span>
            <span className={stalled ? "is-stall" : "is-smooth"}>{stalled ? "Stalled" : "Smooth air"}</span>
          </div>
          <Slider
            id="aoa" label="Angle of attack" unit="°" min={AOA_MIN} max={AOA_MAX} step={1} value={aoa} set={setA} disabled={lockAoa}
            valueText={`${aoa} degrees, lift ${Math.round(lift)} percent, ${stalled ? "stalled" : "smooth airflow"}`}
            down="Tilt the wing down one degree" up="Tilt the wing up one degree" model={modelValue !== null && isFind} idle
          />
          <Slider
            id="spd" label="Air speed" unit=" kt" min={SPEED_MIN} max={SPEED_MAX} step={SPEED_STEP} value={speed} set={setS} disabled={!f.canAct}
            valueText={`${speed} knots, lift ${Math.round(lift)} percent`} down="Slow the air by 10 knots" up="Speed the air up by 10 knots"
          />
          {showNote && (
            <p className="fp-note" data-testid="fp-direction">
              {reason === "too-low" ? `At ${String(st.lastAnswer)}° lift was still rising. Keep tilting.` : `At ${String(st.lastAnswer)}° it had already stalled. Come back down.`}
            </p>
          )}
          {isFind ? (
            <button
              type="button"
              className={`fp-check ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelValue !== null && f.canAct ? "is-model" : ""}`}
              data-testid="done"
              aria-label={`This is the stall angle: ${aoa} degrees`}
              aria-disabled={!f.canAct}
              onClick={() => {
                if (!f.canAct) return;
                audio.play("tap", { gain: 0.4 });
                submit(modelValue ?? aoa);
              }}
            >
              Stall angle: {aoa}°
            </button>
          ) : (
            ex.answer.kind === "choice" && <Options st={st} act={act} busy={busy} options={ex.answer.options} />
          )}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}

function Slider(p: {
  id: string; label: string; unit: string; min: number; max: number; step: number; value: number; set: (v: number) => void; disabled: boolean;
  valueText: string; down: string; up: string; model?: boolean; idle?: boolean;
}) {
  return (
    <div className={`fp-slider ${p.model ? "is-model" : ""}`} data-fp-idle={p.idle ? "true" : undefined}>
      <label className="fp-slider-label" htmlFor={`fp-${p.id}`}>{p.label} <output>{p.value}{p.unit}</output></label>
      <div className="fp-slider-row">
        <button type="button" className="fp-step" data-testid={`fp-${p.id}-down`} aria-label={p.down} aria-disabled={p.disabled || p.value <= p.min} onClick={() => !p.disabled && p.set(p.value - p.step)}>−</button>
        <input
          id={`fp-${p.id}`}
          type="range"
          className="fp-range"
          data-testid={`fp-${p.id}`}
          min={p.min}
          max={p.max}
          step={p.step}
          value={p.value}
          disabled={p.disabled}
          aria-valuetext={p.valueText}
          onChange={(e) => p.set(Number(e.currentTarget.value))}
          style={{ "--fill": `${((p.value - p.min) / (p.max - p.min)) * 100}%` } as React.CSSProperties}
        />
        <button type="button" className="fp-step" data-testid={`fp-${p.id}-up`} aria-label={p.up} aria-disabled={p.disabled || p.value >= p.max} onClick={() => !p.disabled && p.set(p.value + p.step)}>+</button>
      </div>
    </div>
  );
}

/** Lift vs angle, drawn from the points the child visited (one trace per air speed). Values readable as a table. */
function LiftGraph({ trace, wing, speed, aoa, model }: { trace: Point[]; wing: Wing; speed: number; aoa: number; model: boolean }) {
  const W = 260, H = 120, L = 34, B = 22;
  const x = (a: number) => L + ((a - AOA_MIN) / (AOA_MAX - AOA_MIN)) * (W - L - 8);
  const y = (l: number) => H - B - (l / 100) * (H - B - 8);
  const speeds = [...new Set(trace.map((q) => q.s))].sort((a, b) => a - b);
  const full = Array.from({ length: AOA_MAX - AOA_MIN + 1 }, (_, i) => AOA_MIN + i);
  return (
    <figure className="fp-graph" data-testid="fp-graph">
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <rect x={L} y="4" width={W - L - 8} height={H - B - 4} fill="#FFFFFF" stroke="#C3D2DE" />
        {[0, 6, 12, 18, 24].map((a) => (
          <g key={a}>
            <path d={`M${x(a)} 4 V${H - B}`} stroke="#E1E9F0" />
            <text x={x(a)} y={H - 8} textAnchor="middle" className="fp-svg-tiny">{a}°</text>
          </g>
        ))}
        <text x="4" y="16" className="fp-svg-tiny">lift</text>
        {model && (
          <>
            <polyline points={full.map((a) => `${x(a)},${y(liftPct(a, speed, wing))}`).join(" ")} fill="none" stroke={FP.gold} strokeWidth="5" strokeLinejoin="round" />
            <path d={`M${x(wing.crit)} 4 V${H - B}`} stroke={INK} strokeWidth="2" strokeDasharray="4 3" />
            <text x={x(wing.crit) + 4} y="16" className="fp-svg-tiny fp-svg-strong">{wing.crit}° stall</text>
          </>
        )}
        {speeds.map((s) => {
          const pts = trace.filter((q) => q.s === s).sort((a, b) => a.a - b.a);
          return (
            <g key={s}>
              {pts.length > 1 && <polyline points={pts.map((q) => `${x(q.a)},${y(q.l)}`).join(" ")} fill="none" stroke={speedColor(s)} strokeWidth="3" strokeLinejoin="round" />}
              {pts.map((q) => <circle key={q.a} cx={x(q.a)} cy={y(q.l)} r="3" fill={speedColor(s)} />)}
            </g>
          );
        })}
        <circle cx={x(aoa)} cy={y(liftPct(aoa, speed, wing))} r="6" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
      </svg>
      <figcaption className="fp-graph-cap">Lift graph{speeds.length > 1 ? " · one line per air speed" : ""}</figcaption>
      <table className="sr-only">
        <caption>Lift at each angle you tried</caption>
        <thead><tr><th>Air speed</th><th>Angle</th><th>Lift</th></tr></thead>
        <tbody>{[...trace].sort((a, b) => a.s - b.s || a.a - b.a).map((q) => <tr key={`${q.s}-${q.a}`}><td>{q.s} kt</td><td>{q.a}°</td><td>{Math.round(q.l)}%</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
