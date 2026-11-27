import { INK } from "../../../characters/palette";
import type { BoardProps } from "../../../game/boards";
import type { ExerciseState } from "../../../engine/session";
import { LN } from "../art";
import { LADDER_CTX, fmtNum, legOf, modeOf, p } from "../logic";
import { AngleMark, ar } from "./geom";
import { Keypad, Method, ModelSteps, Options, Stage, flags } from "./shared";

/**
 * Ladder & Tower (math.geom.pythagoras). A side view of the lighthouse: a ladder to the lamp-room window, a rope from
 * the gallery to the jetty, a storm wire on the radio mast, or the keeper's line of sight to a rowing boat. The
 * triangle is drawn to scale with its right angle marked; the unknown side shows "?" until it is found.
 *   hyp / leg / round   keypad (decimal point always available, so typical wrong answers can be typed)
 *   conv                a triangular bracket: choose the true statement (the converse)
 */
export function LadderBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const a = ex.answer;
  const f = flags(st);
  const reveal = f.solved || f.modelOn;
  return (
    <Stage
      ex={ex}
      sub={mode === "conv" ? "The bracket" : mode === "round" ? "To 1 decimal place" : "Pythagoras"}
      extra={{ board: mode }}
      scene={mode === "conv" ? <Bracket st={st} reveal={reveal} /> : <TowerTriangle st={st} reveal={reveal} />}
      panel={<>
        <Method ex={ex} st={st} />
        {a.kind === "choice" ? (
          <Options st={st} act={act} busy={busy} options={a.options} label="Statement" />
        ) : (
          <Keypad st={st} act={act} busy={busy} unit="m" dec maxLen={4} label="Length keypad" />
        )}
        <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
      </>}
    />
  );
}

function TowerTriangle({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const ctx = LADDER_CTX[p(ex, "ctx")] ?? "ladder";
  const ask = p(ex, "ask"); // 0 hyp, 1 up, 2 out
  const out = p(ex, "out");
  const c = mode === "round" && ask === 0 ? Math.hypot(p(ex, "up"), out) : p(ex, "c");
  const up = mode === "round" && ask === 1 ? legOf(c, out) : p(ex, "up");
  const value = ex.answer.kind === "number" ? ex.answer.value : 0;
  const s = Math.min(150 / up, 220 / out);
  const tx = 300, gy = 204;
  const bx = tx - out * s, ty = gy - up * s;
  const lab = (which: number, v: number) => (ask === which ? (reveal ? `${fmtNum(value)} m` : "?") : `${fmtNum(v)} m`);
  const isAsk = (which: number) => (ask === which ? (reveal ? "is-model" : "is-ask") : "");
  const ang = (Math.atan2(gy - ty, tx - bx) * 180) / Math.PI;
  const len = Math.hypot(tx - bx, gy - ty);
  const rungs = ctx === "ladder" ? Math.max(3, Math.floor(len / 18)) : 0;
  return (
    <svg className="ln-diagram" viewBox="0 0 400 236" style={ar(400, 236)} role="img" aria-label={`A right-angled triangle against the lighthouse: the ${ctx === "line" ? "line of sight" : ctx}`} data-testid="ln-diagram">
      {/* ground / sea and the tower */}
      <rect x="0" y={gy} width="400" height="32" fill={ctx === "line" || ctx === "rope" ? LN.sea : LN.rock} />
      <path d={`M0 ${gy} H400`} stroke={INK} strokeWidth="4" />
      <rect x={tx} y="14" width="44" height={gy - 14} fill={LN.white} stroke={INK} strokeWidth="4" />
      <path d={`M${tx} 70 H${tx + 44} M${tx} 90 H${tx + 44} M${tx} 150 H${tx + 44} M${tx} 170 H${tx + 44}`} stroke={LN.red} strokeWidth="8" />
      <rect x={tx - 4} y="6" width="52" height="12" rx="3" fill={LN.lamp} stroke={INK} strokeWidth="3" />
      {/* the triangle */}
      <path d={`M${bx} ${gy} L${tx} ${gy} L${tx} ${ty} Z`} fill={LN.lampSoft} fillOpacity="0.3" />
      <path d={`M${tx - 14} ${gy} V${gy - 14} H${tx}`} stroke={INK} strokeWidth="3" fill="none" />
      <g transform={`translate(${bx} ${gy}) rotate(${-ang})`}>
        {ctx === "ladder" && (<>
          <path d={`M0 -5 H${len} M0 5 H${len}`} stroke={LN.wood} strokeWidth="5" />
          {Array.from({ length: rungs }, (_, i) => <path key={i} d={`M${((i + 0.5) * len) / rungs} -5 V5`} stroke={LN.wood} strokeWidth="4" />)}
        </>)}
        {ctx === "rope" && <path d={`M0 0 Q${len / 2} 6 ${len} 0`} stroke="#B07A3A" strokeWidth="5" fill="none" />}
        {ctx === "stay" && <path d={`M0 0 H${len}`} stroke="#8A93A8" strokeWidth="3.5" />}
        {ctx === "line" && <path d={`M0 0 H${len}`} stroke={LN.lamp} strokeWidth="4" strokeDasharray="10 7" />}
      </g>
      {ctx === "line" && <path d={`M${bx - 16} ${gy - 2} H${bx + 16} L${bx + 10} ${gy + 8} H${bx - 10} Z`} fill={LN.red} stroke={INK} strokeWidth="3" />}
      {/* labels */}
      <text x={(bx + tx) / 2} y={gy + 22} className={`ln-side ${isAsk(2)}`} textAnchor="middle">{lab(2, out)}</text>
      <text x={tx - 8} y={(gy + ty) / 2} className={`ln-side ${isAsk(1)}`} textAnchor="end" dominantBaseline="central">{lab(1, up)}</text>
      <text x={(bx + tx) / 2 - 12} y={(gy + ty) / 2 - 12} className={`ln-side ${isAsk(0)}`} textAnchor="end">{lab(0, c)}</text>
    </svg>
  );
}

function Bracket({ st, reveal }: { st: ExerciseState; reveal: boolean }) {
  const ex = st.exercise;
  const s1 = p(ex, "s1"), s2 = p(ex, "s2"), s3 = p(ex, "s3");
  const cos = (s1 * s1 + s2 * s2 - s3 * s3) / (2 * s1 * s2);
  const th = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  // the corner between s1 (going left) and s2 sits at (cx, cy); s2 leaves at angle 180 − th (math, y up)
  const a2 = 180 - th;
  const ca = Math.cos((a2 * Math.PI) / 180), sa = Math.sin((a2 * Math.PI) / 180);
  const k = Math.min(300 / (s1 + Math.max(0, s2 * ca)), 160 / (s2 * sa));
  const cx = 50 + s1 * k, cy = 200;
  const p1: [number, number] = [cx - s1 * k, cy];
  const q2: [number, number] = [cx + s2 * k * ca, cy - s2 * k * sa];
  return (
    <svg className="ln-diagram" viewBox="0 0 400 236" style={ar(400, 236)} role="img" aria-label={`A triangular bracket with sides ${s1}, ${s2} and ${s3} centimetres`} data-testid="ln-diagram">
      <path d={`M${p1[0]} ${p1[1]} L${cx} ${cy} L${q2[0]} ${q2[1]} Z`} fill={LN.wood} fillOpacity="0.35" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <AngleMark cx={cx} cy={cy} a0={a2} a1={180} r={22} label={reveal ? `${Math.round(th)}°` : "?"} kind={reveal ? "model" : "unknown"} lr={44} />
      <text x={(p1[0] + cx) / 2} y={cy + 22} className="ln-side" textAnchor="middle">{s1} cm</text>
      <text x={(cx + q2[0]) / 2 + 10} y={(cy + q2[1]) / 2} className="ln-side" textAnchor="start" dominantBaseline="central">{s2} cm</text>
      <text x={(p1[0] + q2[0]) / 2 - 10} y={(p1[1] + q2[1]) / 2 - 8} className="ln-side" textAnchor="end">{s3} cm</text>
      <text x="14" y="24" className="ln-svg-small">Hoot's lamp-room bracket (cm)</text>
    </svg>
  );
}
