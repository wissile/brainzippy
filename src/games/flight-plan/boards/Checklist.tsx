import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { IMSAFE, PILOT_SCENES, PLAN_ITEMS, PLAN_NOTES, PLAN_TITLE, WEATHER_SKIPPED_NOTE, modeOf, p } from "../logic";
import { ModelSteps, Options, Tab, flags, useDrag, useKeyboardFlag, useSubmit } from "./shared";

/**
 * Pre-flight Checklist (pilot.reg.preflight, pilot.adm.risk).
 *   order   tap step cards (or drag them) onto Ziggy's numbered checklist, from planning to take-off; a "skip it" card
 *           (levels 6+) must be left out. Tap a placed step to take it back; Backspace removes the last one. Check.
 *   missed  Ziggy's planning notes cover four of the five card lines: which line has no note?
 *   imsafe  the morning note + the IMSAFE card: is Ziggy fit to fly?
 */
export function ChecklistBoard(props: BoardProps) {
  const mode = modeOf(props.st.exercise);
  if (mode === "order") return <OrderBoard {...props} />;
  if (mode === "missed") return <MissedBoard {...props} />;
  return <ImsafeBoard {...props} />;
}

function OrderBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const a = ex.answer;
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const order = a.kind === "sequence" ? a.order : [];
  const pieces = a.kind === "sequence" ? a.pieces : [];
  const n = order.length;
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: n }, () => null));
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const parts = st.check?.parts ?? {};
  const model = f.modelOn && Array.isArray(st.model) ? (st.model as string[]) : null;
  const text = (id: string) => pieces.find((x) => x.id === id)?.text ?? id;

  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    if (model) setPlaced([...model]);
    else {
      const last = Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[]) : [];
      setPlaced(Array.from({ length: n }, (_, i) => (parts[String(i)] === true && last[i] && !st.eliminated.includes(last[i]!) ? last[i]! : null)));
    }
    if (kb.current) window.setTimeout(() => (document.querySelector('.fp-cards [data-testid="choice"]:not([aria-disabled="true"]), [data-testid="done"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const okSlot = (i: number) => st.hintStage === 1 && parts[String(i)] === true && placed[i] === (Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[])[i] : undefined);
  const place = (id: string, at?: number) => {
    if (!f.canAct || model || st.eliminated.includes(id) || placedRef.current.includes(id)) return;
    const next = [...placedRef.current];
    const i = at !== undefined && next[at] === null ? at : next.indexOf(null);
    if (i < 0) return;
    busy?.();
    next[i] = id;
    setPlaced(next);
    audio.play("drop", { gain: 0.45 });
    if (kb.current) {
      window.setTimeout(() => {
        const free = document.querySelector('.fp-cards [data-testid="choice"]:not([aria-disabled="true"])') as HTMLElement | null;
        (next.every(Boolean) || !free ? (document.querySelector('[data-testid="done"]') as HTMLElement | null) : free)?.focus({ preventScroll: true });
      }, 40);
    }
  };
  const unplace = (i: number) => {
    if (!f.canAct || model || !placedRef.current[i] || okSlot(i)) return;
    busy?.();
    audio.play("pickup", { gain: 0.35 });
    setPlaced((cur) => cur.map((x, j) => (j === i ? null : x)));
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" || st.phase !== "answering") return;
      const cur = placedRef.current;
      for (let i = cur.length - 1; i >= 0; i--) if (cur[i]) return unplace(i);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const drag = useDrag((id, zone) => place(id, Number(zone.replace("slot-", ""))), f.canAct && !model, busy);
  const shown = model && alongIndex >= 0 ? model.map((m, i) => (i <= alongIndex ? m : null)) : placed;
  const complete = placed.every(Boolean);

  return (
    <div className="fp-stage game-check mode-order" data-testid="fp-board" data-mode="order" data-game="check">
      <Tab game="check" sub={p(ex, "skip") >= 0 ? "Order it · leave one out" : "Order the steps"} />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Ziggy's checklist">
          <div className="fp-clipboard">
            <div className="fp-clip" aria-hidden="true" />
            <p className="fp-clip-title">Ziggy's checklist: planning to take-off</p>
            <ol className="fp-slots">
              {shown.map((id, i) => (
                <li key={i} className={`fp-slot ${id ? "is-filled" : ""} ${okSlot(i) ? "is-ok" : ""} ${drag.hot === `slot-${i}` ? "is-hot" : ""} ${f.solved ? "is-right" : ""}`} data-fp-zone={`slot-${i}`}>
                  <span className="fp-slot-n" aria-hidden="true">{i + 1}</span>
                  <button
                    type="button"
                    className="fp-slot-btn"
                    data-testid="fp-slot"
                    data-value={id ?? ""}
                    aria-label={id ? `Step ${i + 1}: ${text(id)}. Take it back.` : `Step ${i + 1}: empty`}
                    aria-disabled={!f.canAct || !id || !!model || okSlot(i)}
                    onClick={() => unplace(i)}
                  >
                    {id ? text(id) : <span className="fp-slot-empty">…</span>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="fp-panel" aria-label="Step cards">
          <div className="fp-cards" role="group" aria-label="Step cards">
            {pieces.map((pc) => {
              const used = placed.includes(pc.id) || (model?.includes(pc.id) ?? false);
              const out = st.eliminated.includes(pc.id);
              return (
                <button
                  key={pc.id}
                  type="button"
                  className={`fp-card-step ${used ? "is-used" : ""} ${out ? "is-out" : ""} ${drag.drag?.active && drag.drag.id === pc.id ? "is-dragging" : ""}`}
                  data-testid="choice"
                  data-value={pc.id}
                  aria-label={`Add step: ${pc.text}`}
                  aria-disabled={!f.canAct || used || out || !!model}
                  onClick={(e) => {
                    if (drag.wasDrag(e)) return;
                    place(pc.id);
                  }}
                  {...drag.dragProps(pc.id, pc.text ?? "", !used && !out)}
                >
                  {pc.text}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={`fp-check ${f.solved ? "is-right" : ""} ${model && f.canAct ? "is-model" : ""}`}
            data-testid="done"
            aria-label="Check my checklist"
            aria-disabled={!f.canAct || !complete}
            onClick={() => {
              if (!f.canAct || !complete) return;
              audio.play("tap", { gain: 0.4 });
              submit(placedRef.current.filter((x): x is string => !!x));
            }}
          >
            Check
          </button>
          {model && <p className="fp-method" data-testid="model-steps">Each step needs the one before it. Read the list, then press Check.</p>}
        </section>
      </div>
      {drag.ghost}
    </div>
  );
}

function MissedBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const miss = PLAN_ITEMS[p(ex, "miss")] ?? "weather";
  const skipped = p(ex, "skipped") === 1;
  const notes = PLAN_ITEMS.filter((k) => k !== miss).map((k) => PLAN_NOTES[k][p(ex, `n_${k}`)] ?? PLAN_NOTES[k][0]!);
  if (skipped) notes.unshift(WEATHER_SKIPPED_NOTE);
  const f = flags(st);
  return (
    <div className="fp-stage game-check mode-missed" data-testid="fp-board" data-mode="missed" data-game="check">
      <Tab game="check" sub="What's missing?" />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Planning card and notes">
          <div className="fp-clipboard is-split">
            <div className="fp-clip" aria-hidden="true" />
            <p className="fp-clip-title">Planning card <em>(simplified; inspired by the FAA preflight rule)</em></p>
            <ul className="fp-plan">
              {PLAN_ITEMS.map((k) => <li key={k} className={f.modelOn && k === miss ? "is-gap" : ""}>{PLAN_TITLE[k]}</li>)}
            </ul>
            <p className="fp-clip-title">Ziggy's notes</p>
            <ul className="fp-notes">
              {notes.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </section>
        <section className="fp-panel" aria-label="Which item is missing?">
          {ex.answer.kind === "choice" && <Options st={st} act={act} busy={busy} options={ex.answer.options} label="Missing item" />}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}

function ImsafeBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const scene = PILOT_SCENES[p(ex, "sc")]!;
  const f = flags(st);
  return (
    <div className="fp-stage game-check mode-imsafe" data-testid="fp-board" data-mode="imsafe" data-game="check">
      <Tab game="check" sub="Is the pilot ready?" />
      <div className="fp-layout">
        <section className="fp-scene" aria-label="Morning check">
          <div className="fp-morning">
            <p className="fp-clip-title">Morning of the flight</p>
            <p className="fp-morning-text">{scene.text}</p>
          </div>
          <ul className="fp-imsafe" aria-label="IMSAFE card">
            {IMSAFE.map((x) => (
              <li key={x.letter} className={f.modelOn && scene.why === x.word ? "is-gap" : ""}><b>{x.letter}</b><span>{x.word}</span></li>
            ))}
          </ul>
        </section>
        <section className="fp-panel" aria-label="Is Ziggy ready?">
          {ex.answer.kind === "choice" && <Options st={st} act={act} busy={busy} options={ex.answer.options} />}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
