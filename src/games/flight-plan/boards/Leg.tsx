import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { Chart, PLACE_XY } from "../art";
import { PLACES, p } from "../logic";
import { ModelSteps, Tab, flags, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Leg Timer (pilot.nav.tsd). The leg is marked on Ziggy's fictional chart (not to scale, not for navigation) with
 * its distance; the card lists airspeed and any head- or tailwind. The child types the minutes on a keypad (or the
 * number keys) and presses Done. First miss: "too long / too short" plus the method card; second miss: the worked
 * division step by step, with the answer filled in for the child to confirm.
 */
const MAX_DIGITS = 3;

export function LegBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const [entry, setEntry] = useState("");
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const d = p(ex, "d"), tas = p(ex, "tas"), wind = p(ex, "wind"), d2 = p(ex, "d2"), from = p(ex, "from"), to = p(ex, "to"), via = p(ex, "via");
  const gs = tas + wind;
  const total = d2 > 0;
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;

  // after a miss: clear the entry (first miss) or fill in the modelled answer (second miss)
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    setEntry(modelValue !== null ? String(modelValue) : "");
    if (kb.current) window.setTimeout(() => (document.querySelector('[data-testid="key"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (k: string) => {
    if (!f.canAct || modelValue !== null) return;
    busy?.();
    audio.play("tap", { gain: 0.3 });
    if (k === "back") setEntry((e) => e.slice(0, -1));
    else setEntry((e) => (e.length >= MAX_DIGITS ? e : (e + k).replace(/^0+(?=\d)/, "")));
  };
  const done = () => {
    if (!f.canAct) return;
    const v = modelValue ?? (entryRef.current === "" ? NaN : Number(entryRef.current));
    if (!Number.isFinite(v)) return;
    audio.play("tap", { gain: 0.4 });
    submit(v);
  };
  // physical keyboard: digits, Backspace, Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter" && tgt?.tagName !== "BUTTON") done();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const legs = total ? [{ from, to: via }, { from: via, to }] : [{ from, to }];
  const labels = total ? [`${d} nm`, `${d2} nm`] : [`${d} nm`];
  const [x1, y1] = PLACE_XY[legs[0]!.from]!, [x2, y2] = PLACE_XY[legs[legs.length - 1]!.to]!;
  const course = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const windAngle = wind === 0 ? null : wind < 0 ? course + 180 : course;
  const reason = st.check?.reason;
  const showDir = st.hintStage === 1 && f.canAct && (reason === "too-high" || reason === "too-low");
  const shown = modelValue !== null ? String(modelValue) : entry;

  return (
    <div className="fp-stage game-leg mode-time" data-testid="fp-board" data-mode="time" data-game="leg" data-d={d} data-d2={d2} data-tas={tas} data-wind={wind}>
      <Tab game="leg" sub={total ? "Two legs" : `${PLACES[from]} → ${PLACES[to]}`} />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Chart">
          <Chart active={legs} labels={labels} windAngle={windAngle} />
          <dl className="fp-legcard">
            <div><dt>Distance</dt><dd>{total ? `${d} + ${d2} nm` : `${d} nm`}</dd></div>
            <div><dt>Airspeed</dt><dd>{tas} kt</dd></div>
            {wind !== 0 && <div><dt>Wind</dt><dd className={wind < 0 ? "is-head" : "is-tail"}>{Math.abs(wind)} kt {wind < 0 ? "headwind" : "tailwind"}</dd></div>}
            {(f.hinted || f.solved) && wind !== 0 && <div><dt>Groundspeed</dt><dd>{gs} kt</dd></div>}
          </dl>
        </section>
        <section className="fp-panel" aria-label="Leg timer">
          {f.hinted && <p className="fp-method" data-testid="fp-method">minutes = distance × 60 ÷ {wind !== 0 ? "groundspeed" : "speed"}</p>}
          <div className={`fp-display ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelValue !== null && f.canAct ? "is-model" : ""}`} data-testid="fp-display" aria-live="polite" aria-label={`Your answer: ${shown || "empty"} minutes`}>
            <span className="fp-display-num">{shown || "–"}</span>
            <span className="fp-display-unit">min</span>
          </div>
          {showDir && <p className="fp-note" data-testid="fp-direction">{reason === "too-high" ? "That's too long for this leg." : "That's too short for this leg."}</p>}
          <div className={`fp-keypad ${modelValue !== null ? "is-model-on" : ""}`} role="group" aria-label="Keypad" data-fp-idle="true">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0"].map((k) => (
              <button
                key={k}
                type="button"
                className={`fp-key ${k === "back" ? "is-back" : ""}`}
                data-testid="key"
                data-value={k}
                aria-label={k === "back" ? "Delete the last digit" : `Type ${k}`}
                aria-disabled={!f.canAct || modelValue !== null}
                onClick={() => press(k)}
              >
                {k === "back" ? "⌫" : k}
              </button>
            ))}
            <button
              type="button"
              className={`fp-key is-done ${modelValue !== null && f.canAct ? "is-model" : ""}`}
              data-testid="done"
              aria-label={`Done: ${shown || "nothing typed"} minutes`}
              aria-disabled={!f.canAct || shown === ""}
              onClick={done}
            >
              Done
            </button>
          </div>
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
