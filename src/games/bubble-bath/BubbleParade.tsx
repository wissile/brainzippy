import { useEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { ParadeBubble } from "./art";
import { paradeForm, paradeSlots } from "./generator";
import { gridFor, rescueFocus, seenStore, useAfterMiss, useCommon, useSize } from "./shared";

/**
 * Bubble Parade (the finale) has two forms.
 *  count (levels 0–3, one-to-one): plain bubbles; pop each one once while Gloop says the next number (it lands in the
 *    counting strip), then choose how many (number + choices in the tray, which wake up once every bubble is popped).
 *    First miss: the last number in the strip glows ("the last number tells how many"). Second miss: the strip is
 *    counted aloud and the answer glows.
 *  order (levels 4–7): 3 to 5 big numbered bubbles float across the bath, never in counting order left to
 * right. Pop them in counting order, 1, 2, 3…: each pop says its number and drops it into the counting strip.
 * When every bubble is popped the order is checked by itself (sequence; no Ready needed). First miss: the bubbles
 * popped in the right order stay popped, the rest float back, and the strip shows which number comes next. Second
 * miss: Gloop pops them in order, then the child does it with the next bubble glowing each time (errorless).
 */
export function BubbleParadeBoard(props: BoardProps) {
  return paradeForm(props.st.exercise) === "count" ? <CountParade {...props} /> : <OrderParade {...props} />;
}

function CountParade({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const n = ex.answer.kind === "number" ? ex.answer.value : 0;
  const slots = paradeSlots(ex);
  const { reducedMotion, speaking, canAct, celebrate } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fieldRef, field] = useSize<HTMLDivElement>();
  const grid = gridFor(n, field.w - 12, field.h - 8, 190, 12, 72);
  const [popped, setPopped] = useState<number[]>([]);
  const [burst, setBurst] = useState<number | null>(null);
  const all = popped.length === n;
  useEffect(() => {
    seenStore.set({ exId: ex.id, seen: all });
    if (all && !speaking) void audio.speak("gb.parade.howMany");
  }, [all, ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => seenStore.set({ exId: "", seen: false }), []);
  const pop = (k: number, keyboard: boolean) => {
    if (!canAct || popped.includes(k)) return;
    busy?.();
    const count = popped.length + 1;
    setPopped((pp) => [...pp, k]);
    setBurst(k);
    audio.playCount(count);
    audio.sayNumber(count);
    if (keyboard) window.setTimeout(() => rescueFocus(rootRef.current, '[data-testid="bubble"]:not([aria-disabled="true"])', '[data-testid="choice"]:not([aria-disabled="true"])'), 0);
  };
  const alongNow = st.phase === "feedback" && alongIndex >= 0 ? alongIndex : -1;
  const lastGlow = st.hintStage >= 1 && st.model === null && st.phase === "answering";
  return (
    <div ref={rootRef} className={`gb-board mode-parade form-count ${celebrate ? "is-celebrating" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="parade" data-form="count" data-n={n} data-popped={popped.length}>
      <div className="gb-strip" aria-hidden="true" data-gb-idle="">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={`gb-strip-slot ${i < popped.length ? "is-filled" : ""} ${(lastGlow && i === n - 1) || i === alongNow ? "is-next" : ""} ${alongNow >= 0 && i <= alongNow ? "is-along" : ""}`} data-testid="strip-slot" data-value={i < popped.length ? String(i + 1) : ""}>
            {i < popped.length ? i + 1 : ""}
          </span>
        ))}
      </div>
      <div className="gb-parade" ref={fieldRef}>
        <div className="gb-bubbles" role="group" aria-label="The bubble parade" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {[...slots].sort((x, y) => x.slot - y.slot).map(({ k, jitter }) => {
            const at = popped.indexOf(k);
            if (at >= 0) {
              return (
                <span key={k} className={`gb-popped ${burst === k && !reducedMotion ? "is-burst" : ""}`} style={{ width: grid.cell, height: grid.cell }} aria-hidden="true">
                  <span className="gb-splash" /><span className="gb-popnum">{at + 1}</span>
                </span>
              );
            }
            return (
              <button
                key={k}
                type="button"
                className={`gb-item gb-bubble-btn bob-${jitter}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${k * 90}ms` }}
                data-testid="bubble"
                data-value={`b${k}`}
                aria-disabled={!canAct}
                tabIndex={canAct ? 0 : -1}
                aria-label="A bubble. Press to pop it and count"
                onClick={(e) => pop(k, e.detail === 0)}
              >
                <ParadeBubble k={null} dots={false} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      <p className="sr-only" aria-live="polite">{popped.length ? `${popped.length} popped.${all ? " How many?" : ""}` : ""}</p>
    </div>
  );
}

function OrderParade({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "sequence") throw new Error("Bubble Parade (order) needs a sequence answer");
  const { order, pieces } = ex.answer;
  const n = order.length;
  const dots = (ex.params?.dots ?? 0) === 1;
  const slots = paradeSlots(ex);
  const { reducedMotion, canAct, celebrate } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fieldRef, field] = useSize<HTMLDivElement>();
  const grid = gridFor(n, field.w - 12, field.h - 8, 190, 12, 72);
  const [popped, setPopped] = useState<string[]>([]);
  const [burst, setBurst] = useState<string | null>(null);
  const modelOn = st.model !== null;
  const shown = st.phase === "feedback" && modelOn && alongIndex >= 0 ? order.slice(0, alongIndex + 1) : st.phase === "feedback" && modelOn ? [] : popped;
  const nextId = order[popped.length];
  const hinted = st.hintStage >= 1 && !modelOn;

  const pop = (id: string, keyboard: boolean) => {
    if (!canAct || popped.includes(id) || popped.length >= n) return;
    if (modelOn && id !== nextId) return; // modelled answer: only the glowing bubble
    busy?.();
    const k = Number(pieces.find((pc) => pc.id === id)?.text ?? 0);
    setPopped((pp) => [...pp, id]);
    setBurst(id);
    audio.playCount(popped.length + 1);
    audio.sayNumber(k);
    if (keyboard) window.setTimeout(() => rescueFocus(rootRef.current, '[data-testid="bubble"]:not([aria-disabled="true"])'), 0);
  };
  useEffect(() => {
    if (popped.length === n && st.phase === "answering") act({ type: "SUBMIT", value: popped });
  }, [popped.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useAfterMiss(st, (parts) => {
    if (st.model !== null) return setPopped([]);
    let keep = 0;
    while (keep < n && parts[String(keep)]) keep++;
    setPopped((pp) => pp.slice(0, keep));
  });

  const bySlot = [...slots].sort((x, y) => x.slot - y.slot);
  return (
    <div ref={rootRef} className={`gb-board mode-parade form-order ${celebrate ? "is-celebrating" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="parade" data-form="order" data-n={n}>
      <div className="gb-strip" aria-hidden="true" data-gb-idle="">
        {order.map((id, i) => {
          const at = shown[i];
          const k = at ? pieces.find((pc) => pc.id === at)?.text : undefined;
          const isNext = hinted && i === popped.length && st.phase === "answering";
          return (
            <span key={id} className={`gb-strip-slot ${at ? "is-filled" : ""} ${isNext ? "is-next" : ""}`} data-testid="strip-slot" data-value={k ?? ""}>
              {k ?? (isNext ? i + 1 : "")}
            </span>
          );
        })}
      </div>
      <div className="gb-parade" ref={fieldRef}>
        <div className="gb-bubbles" role="group" aria-label="The bubble parade" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {bySlot.map(({ k, jitter }) => {
            const id = `b${k}`;
            if (shown.includes(id)) {
              return (
                <span key={id} className={`gb-popped ${burst === id && !reducedMotion ? "is-burst" : ""}`} style={{ width: grid.cell, height: grid.cell }} aria-hidden="true">
                  <span className="gb-splash" />
                </span>
              );
            }
            const glow = modelOn && st.phase === "answering" && id === nextId;
            const disabled = !canAct || (modelOn && !glow);
            return (
              <button
                key={id}
                type="button"
                className={`gb-item gb-bubble-btn bob-${jitter} ${glow ? "is-model" : ""} ${modelOn && !glow ? "is-out" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${k * 90}ms` }}
                data-testid="bubble"
                data-value={id}
                data-n={k}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                aria-label={`Bubble number ${k}${dots ? `, with ${k} ${k === 1 ? "dot" : "dots"}` : ""}. Press to pop it`}
                onClick={(e) => !disabled && pop(id, e.detail === 0)}
              >
                <ParadeBubble k={k} dots={dots} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      <p className="sr-only" aria-live="polite">{shown.length ? `Popped: ${shown.map((id) => pieces.find((pc) => pc.id === id)?.text).join(", ")}.` : ""}</p>
    </div>
  );
}
