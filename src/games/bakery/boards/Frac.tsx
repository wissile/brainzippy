import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { BK, MuffinShape } from "../art";
import { clamp, decode, frac } from "../logic";
import { CheckButton, Keypad, ModelSteps, Stepper, Tab, checkText, flags, useBoardKeys, useEntry, usePointerDrag, useSubmit } from "./shared";

/**
 * Batch Fractions (math.frac.of-amount, math.frac.equivalent, math.frac.compare).
 *  of      a/b of c muffins get icing. Early: the muffins sit in b equal boxes and tapping a box ices it (an optional
 *          way to see "take a groups"); later the boxes appear only after a miss. Keypad answer.
 *  equiv   cake 1 shows a/b iced; ice the same amount of cake 2 (c slices) by tapping or dragging across slices, the
 *          steppers or the arrow keys. Hint: cake 2's slices are outlined in groups that match cake 1's slices.
 *  cmp     which is more cake? Early the cakes are drawn; later they are covered until a miss (reason from the numbers).
 * Every cake is the same size: comparing fractions only makes sense for the same whole (this is said in the help).
 */
export function FracBoard(props: BoardProps) {
  const s = decode(props.st.exercise);
  if (s.kind === "equiv") return <EquivBoard {...props} />;
  if (s.kind === "cmp") return <CompareBoard {...props} />;
  return <OfBoard {...props} />;
}

// ---------------------------------------------------------------- cakes

const R = 90;
function wedge(i: number, n: number, r = R): string {
  if (n === 1) return `M0 ${-r} A${r} ${r} 0 1 1 -0.01 ${-r} Z`;
  const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M0 0 L${(Math.cos(a0) * r).toFixed(2)} ${(Math.sin(a0) * r).toFixed(2)} A${r} ${r} 0 ${large} 1 ${(Math.cos(a1) * r).toFixed(2)} ${(Math.sin(a1) * r).toFixed(2)} Z`;
}
/** A round cake from above cut into n equal slices; the first `iced` are iced. `group` draws thick cuts every `group` slices. */
export function Cake({ n, iced, group = 0, covered = false, label, testId, svgRef, extra }: {
  n: number; iced: number; group?: number; covered?: boolean; label: string; testId?: string; svgRef?: React.Ref<SVGSVGElement>;
  extra?: Record<string, unknown>;
}) {
  return (
    <svg ref={svgRef} viewBox="-110 -110 220 220" className="bk-cake" role="img" aria-label={label} data-testid={testId} {...extra}>
      <circle r={R + 12} fill="#fff" stroke={BK.ink} strokeWidth="5" />
      {covered ? (
        <g>
          <circle r={R} fill="#E8EEF7" stroke={BK.ink} strokeWidth="5" />
          <path d="M-60 -30 Q-40 -66 0 -70" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
          <circle r="14" fill={BK.gold} stroke={BK.ink} strokeWidth="4" />
        </g>
      ) : (
        <g>
          {Array.from({ length: n }, (_, i) => (
            <path key={i} d={wedge(i, n)} fill={i < iced ? BK.icing : BK.cream} stroke={BK.ink} strokeWidth="3" className={i < iced ? "bk-slice is-iced" : "bk-slice"} />
          ))}
          {group > 1 && Array.from({ length: n / group }, (_, g) => (
            <path key={`g${g}`} d={wedge(g, n / group)} fill="none" stroke={BK.icingDeep} strokeWidth="7" strokeLinejoin="round" />
          ))}
          <circle r={R} fill="none" stroke={BK.ink} strokeWidth="5" />
        </g>
      )}
    </svg>
  );
}
/** Which slice (0..n−1) a pointer is over, measured clockwise from the top. */
function sliceAt(svg: SVGSVGElement | null, e: { clientX: number; clientY: number }, n: number): number | null {
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < Math.min(r.width, r.height) * 0.06) return null;
  let ang = Math.atan2(dx, -dy);
  if (ang < 0) ang += Math.PI * 2;
  return Math.min(n - 1, Math.floor((ang / (Math.PI * 2)) * n));
}

// ---------------------------------------------------------------- fraction of an amount

function OfBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const en = useEntry(st);
  const [iced, setIced] = useState<number[]>([]);
  const per = s.c / s.b;
  useEffect(() => {
    if (f.modelOn) setIced(Array.from({ length: s.a }, (_, i) => i));
  }, [f.modelOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = () => {
    const v = en.modelValue ?? en.value;
    if (v === null || !f.canAct) return;
    submit(v);
  };
  useBoardKeys({ digit: en.type, back: en.back, enter: check });
  const groups = s.v === 1 || f.hinted || f.solved;
  const toggle = (g: number) => {
    if (!f.canAct || f.modelOn) return;
    audio.play("tap", { gain: 0.3 });
    busy?.();
    setIced((xs) => (xs.includes(g) ? xs.filter((x) => x !== g) : [...xs, g]));
  };
  const cols = (n: number) => Math.min(n, n <= 4 ? 2 : n <= 9 ? 3 : 4);
  const mini = (n: number, ic: boolean, key: string) => {
    const cc = cols(n), rr = Math.ceil(n / cc);
    return (
      <svg key={key} viewBox={`0 0 ${cc * 60} ${rr * 62}`} className="bk-muffins" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => <MuffinShape key={i} x={30 + (i % cc) * 60} y={34 + Math.floor(i / cc) * 62} r={26} iced={ic} />)}
      </svg>
    );
  };
  const all = (() => {
    const cc = Math.ceil(Math.sqrt(s.c * 1.8)), rr = Math.ceil(s.c / cc);
    return (
      <svg viewBox={`0 0 ${cc * 60} ${rr * 62}`} className="bk-muffins is-all" role="img" aria-label={ex.a11yDescription}>
        {Array.from({ length: s.c }, (_, i) => <MuffinShape key={i} x={30 + (i % cc) * 60} y={34 + Math.floor(i / cc) * 62} r={26} />)}
      </svg>
    );
  })();
  return (
    <div className="bk-stage mode-frac kind-of" data-testid="bk-board" data-mode="frac" data-kind="of" data-value={en.entry}>
      <Tab mode="frac" sub={`${frac(s.a, s.b)} of ${s.c}`} />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Muffins">
          {groups ? (
            <div className={`bk-groups n${s.b}`} role="group" aria-label={`${s.b} equal boxes of muffins`}>
              {Array.from({ length: s.b }, (_, g) => (
                <button key={g} type="button" className={`bk-group ${iced.includes(g) ? "is-iced" : ""}`} data-testid="bk-group" data-value={g}
                  aria-pressed={iced.includes(g)} aria-label={`Box ${g + 1} of ${per} muffins: ${iced.includes(g) ? "iced, tap to take the icing off" : "tap to ice"}`}
                  aria-disabled={!f.canAct || f.modelOn} onClick={() => toggle(g)}>
                  {mini(per, iced.includes(g), `m${g}`)}
                </button>
              ))}
            </div>
          ) : <div className="bk-pic">{all}</div>}
          <p className="bk-readout" data-testid="bk-readout">
            {groups ? `${s.b} equal boxes of ${per} · iced: ${iced.length} box${iced.length === 1 ? "" : "es"}` : `${s.c} muffins · ${frac(s.a, s.b)} get icing`}
          </p>
        </section>
        <section className="bk-panel" aria-label="Your answer">
          <Keypad st={st} entry={en.entry} onType={en.type} onBack={en.back} onCheck={check} label="Iced muffins" checkLabel={checkText(en.entry, "muffin", "muffins")} />
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- equivalent fractions

function EquivBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const [n, setN] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const model = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (model !== null) setN(model);
  }, [model]);
  const locked = !f.canAct || model !== null;
  const set = (v: number) => {
    if (locked) return;
    const next = clamp(v, 0, s.c);
    if (next !== n) audio.play("tap", { gain: 0.25 });
    setN(next);
    busy?.();
  };
  const check = () => {
    if (!f.canAct || (model !== null && n !== model)) return;
    submit(n);
  };
  useBoardKeys({ enter: check, arrow: (d) => set(n + (d === "up" || d === "right" ? 1 : -1)) });
  const startN = useRef(0);
  const drag = usePointerDrag((e, phase) => {
    const i = sliceAt(svgRef.current, e, s.c);
    if (i === null) return;
    if (phase === "start") {
      startN.current = n;
      set(n === i + 1 ? i : i + 1); // tap a slice: ice up to it (tap the last iced slice again to take it off)
    } else set(i + 1);
  }, !locked, busy);
  const hint = f.hinted || f.solved;
  const g2 = hint && s.c > s.b ? s.c / s.b : 0;
  const g1 = hint && s.c < s.b ? s.b / s.c : 0;
  return (
    <div className="bk-stage mode-frac kind-equiv" data-testid="bk-board" data-mode="frac" data-kind="equiv" data-value={n}>
      <Tab mode="frac" sub="Same amount of cake" />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Two cakes">
          <div className="bk-cakes">
            <figure className="bk-cakefig">
              <Cake n={s.b} iced={s.a} group={g1} label={`Cake 1: ${s.b} slices, ${s.a} iced`} />
              <figcaption><b>{frac(s.a, s.b)}</b> iced</figcaption>
            </figure>
            <figure className="bk-cakefig">
              <Cake n={s.c} iced={n} group={g2} label={`Cake 2: ${s.c} slices, ${n} iced`} testId="bk-cake" svgRef={svgRef} extra={{ ...(locked ? {} : drag.props), className: `bk-cake ${locked ? "" : "is-drag"}` }} />
              <figcaption><b>{frac(n, s.c)}</b> iced</figcaption>
            </figure>
          </div>
          <p className="sr-only" aria-live="polite">{`${n} of ${s.c} slices iced`}</p>
        </section>
        <section className="bk-panel" aria-label="Your answer">
          <div className="bk-build" data-bk-idle="true">
            <Stepper id="value" label="Iced slices" value={n} min={0} max={s.c} unitLabel="iced slice" disabled={locked} onStep={(by) => set(n + by)} />
            <CheckButton st={st} onCheck={check} label={`Check: ${n} of ${s.c} slices iced`} ready={n > 0} />
          </div>
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- compare

function CompareBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const covered = s.v === 0 && !f.hinted && !f.solved;
  const options = ex.answer.kind === "choice" ? ex.answer.options : [];
  const correct = ex.answer.kind === "choice" ? ex.answer.correct : "";
  const choose = (id: string) => {
    if (!f.canAct || st.eliminated.includes(id) || (f.modelOn && id !== st.model)) return;
    audio.play("tap", { gain: 0.4 });
    submit(id);
  };
  const aria = (id: string, text: string) => (id === "same" ? "They are the same amount of cake" : `${text} is more cake`);
  return (
    <div className="bk-stage mode-frac kind-cmp" data-testid="bk-board" data-mode="frac" data-kind="cmp" data-covered={covered ? 1 : 0}>
      <Tab mode="frac" sub="Which is more?" />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Two cakes the same size">
          <div className="bk-cakes">
            <figure className="bk-cakefig">
              <Cake n={s.b} iced={s.a} covered={covered} label={covered ? `Covered cake: ${frac(s.a, s.b)}` : `Left cake: ${s.b} slices, ${s.a} iced`} />
              <figcaption><b>{frac(s.a, s.b)}</b></figcaption>
            </figure>
            <figure className="bk-cakefig">
              <Cake n={s.d} iced={s.c} covered={covered} label={covered ? `Covered cake: ${frac(s.c, s.d)}` : `Right cake: ${s.d} slices, ${s.c} iced`} />
              <figcaption><b>{frac(s.c, s.d)}</b></figcaption>
            </figure>
          </div>
        </section>
        <section className="bk-panel" aria-label="Your answer">
          <div className="bk-options" role="group" aria-label="Which is more cake?" data-bk-idle="true">
            {options.map((o) => {
              const out = st.eliminated.includes(o.id);
              const cls = ["bk-opt", f.solved && o.id === correct ? "is-right" : "", f.wrongNow && st.lastAnswer === o.id ? "is-wrong" : "", out ? "is-out" : "", f.modelOn && f.canAct && st.model === o.id ? "is-model" : ""].join(" ");
              return (
                <button key={o.id} type="button" className={cls} data-testid="choice" data-value={o.id} aria-label={aria(o.id, o.text ?? o.id)}
                  aria-disabled={!f.canAct || out || (f.modelOn && o.id !== st.model)} onClick={() => choose(o.id)}>
                  {o.id === "same" ? o.text : <><b>{o.text}</b> is more</>}
                </button>
              );
            })}
          </div>
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
