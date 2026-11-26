import { useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { AnswerOption } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { EmptySocket, LAMP_SHAPE, Lamp } from "./art";
import { BLANK, COLOURS, type Colour, runwayOf } from "./generator";
import { Ghost, focusSel, gridFor, modelSlice, useAfterMiss, useCommon, useDrag, usePublish, useReadyCue, useSize } from "./shared";

/**
 * Runway Lights — the runway lights blink their repeating pattern, left to right, and some sockets are empty.
 *  one gap  (choice):   tap the bulb that comes next (or drag it into the socket); it is checked at once.
 *  2–3 gaps (sequence): tap bulbs to fill the sockets in order (drag works too), undo the last one, then Ready.
 * One bulb in the box never fits (an outsider colour, or a pattern colour that isn't needed). First miss: right lights
 * stay with a tick, wrong ones pop out, the first wrong bulb greys out. Second miss: the right bulbs go in one by one.
 */
const colourOf = (o: AnswerOption | undefined): Colour => (COLOURS as readonly string[]).includes(o?.text ?? "") ? (o!.text as Colour) : "red";
const nameOf = (c: Colour) => `${c} ${LAMP_SHAPE[c]} light`;

export function RunwayLightsBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const a = ex.answer;
  if (a.kind !== "choice" && a.kind !== "sequence") throw new Error("Runway Lights needs a choice or sequence answer");
  const options = a.kind === "choice" ? a.options : a.pieces;
  const seq = a.kind === "sequence";
  const runway = runwayOf(ex);
  const gaps = runway.map((v, i) => (v === BLANK ? i : -1)).filter((i) => i >= 0);
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [boxRef, box] = useSize<HTMLDivElement>();
  const grid = gridFor(options.length, box.w - (seq ? 88 : 0), box.h - 8, 112, 12);
  const [filled, setFilled] = useState<(string | null)[]>(() => gaps.map(() => null));
  const [okSlots, setOkSlots] = useState<number[]>([]);
  const act2 = canAct && !locked;
  const byId = (id: string | null | undefined) => options.find((o) => o.id === id);

  // what each gap shows: the child's bulbs; the worked example; for one gap, the pick being checked / the right one
  const model = seq && Array.isArray(st.model) ? (st.model as string[]) : null;
  const modelChoice = !seq && typeof st.model === "string" ? st.model : null;
  let shown: (string | null)[] = filled;
  if (model) {
    const vis = modelSlice(model, alongIndex, st.phase);
    shown = gaps.map((_, i) => vis[i] ?? null);
  } else if (!seq) {
    const pick = st.phase === "feedback" || st.phase === "solved" ? (st.lastAnswer as string | null) : null;
    const modelShown = modelChoice && (st.phase === "answering" || alongIndex >= 0) ? modelChoice : null;
    shown = [pick ?? (modelShown ? `ghost:${modelShown}` : null)];
  }

  const submitChoice = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    busy?.();
    audio.play("drop", { gain: 0.6 });
    act({ type: "SUBMIT", value: id });
  };

  const put = (id: string, keyboard = false) => {
    if (!act2 || st.eliminated.includes(id) || filled.includes(id)) return;
    const slot = filled.findIndex((f) => f === null);
    if (slot < 0) return;
    busy?.();
    setFilled((f) => f.map((x, i) => (i === slot ? id : x)));
    audio.play("drop", { gain: 0.6 });
    if (keyboard) window.setTimeout(() => focusSel(rootRef.current, '[data-testid="bulb"]:not([aria-disabled="true"])', '[data-testid="done"]'), 0);
  };
  const undo = () => {
    if (!act2) return;
    const last = [...filled.keys()].reverse().find((i) => filled[i] !== null && !okSlots.includes(i));
    if (last === undefined) return;
    busy?.();
    setFilled((f) => f.map((x, i) => (i === last ? null : x)));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(seq ? act2 : canAct, (id, target) => {
    if (target !== "socket") return;
    if (seq) put(id);
    else submitChoice(id);
  }, busy);
  useAfterMiss(st, (parts) => {
    if (!seq) return;
    const keep = Object.keys(parts).filter((k) => parts[k]).map(Number);
    setOkSlots(keep);
    setFilled((f) => f.map((x, i) => (keep.includes(i) ? x : null)));
  });
  const complete = shown.every((x) => x !== null);
  usePublish(ex.id, seq ? (model ? model : complete ? (filled as string[]) : null) : null);
  useReadyCue(seq && complete && !model && canAct, speaking);

  const n = runway.length;
  const used = new Set(filled.filter((x): x is string => x !== null));
  const dragged = drag ? byId(drag.id) : undefined;
  return (
    <div ref={rootRef} className={`ba-board mode-lights ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ba-board" data-mode="lights" data-kind={seq ? "sequence" : "choice"}>
      <div className="ba-runway" role="group" aria-label={`Runway lights: ${runway.map((v, i) => (v === BLANK ? (shown[gaps.indexOf(i)] ? nameOf(colourOf(byId(shown[gaps.indexOf(i)]!.replace("ghost:", "")))) : "empty socket") : nameOf(COLOURS[v]!))).join(", ")}`} style={{ "--n": n } as React.CSSProperties}>
        <div className="ba-lamps">
          {runway.map((v, i) => {
            if (v !== BLANK) {
              return (
                <span key={i} className="ba-lamp is-shown" style={{ "--i": i } as React.CSSProperties} data-testid="lamp" data-light={COLOURS[v]}>
                  <Lamp colour={COLOURS[v]!} />
                </span>
              );
            }
            const g = gaps.indexOf(i);
            const id = shown[g] ?? null;
            const ghost = id?.startsWith("ghost:") ?? false;
            const o = byId(id?.replace("ghost:", ""));
            const ok = okSlots.includes(g) || (seq && st.hintStage >= 1 && st.check?.parts?.[String(g)] === true && filled[g] !== null);
            const isWrong = wrong && (seq ? st.check?.parts?.[String(g)] === false : true);
            return (
              <span
                key={i}
                className={`ba-lamp ba-socket ${o ? "is-filled" : ""} ${ok ? "is-ok" : ""} ${isWrong && o ? "is-wrong" : ""} ${model || ghost ? "is-model" : ""} ${celebrate ? "is-right" : ""} ${hot === "socket" ? "hot" : ""} ${g === shown.findIndex((x) => x === null) ? "is-next" : ""}`}
                data-testid="socket"
                data-ba-drop="socket"
                data-light={o ? colourOf(o) : ""}
                {...(g === 0 ? { "data-ba-idle": "" } : {})}
              >
                {o ? <Lamp colour={colourOf(o)} lit={!ghost} /> : <EmptySocket />}
              </span>
            );
          })}
        </div>
      </div>
      <div className="ba-bulbbox" ref={boxRef}>
        <div className="ba-bulbs" role="group" aria-label="Light bulbs" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {options.map((o, i) => {
            const c = colourOf(o);
            const out = st.eliminated.includes(o.id);
            if (seq && used.has(o.id) && !model) return <span key={o.id} className="ba-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
            const right = !seq && celebrate && st.lastAnswer === o.id;
            const isWrong = !seq && wrong && st.lastAnswer === o.id;
            const isModel = (!seq && modelChoice === o.id) || (!!model && model.includes(o.id) && st.phase === "answering");
            return (
              <button
                key={o.id}
                type="button"
                className={`ba-item ba-bulb ${out ? "is-out" : ""} ${right ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${isModel ? "is-model" : ""} ${drag?.id === o.id ? "ghosted" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 80}ms` }}
                data-testid={seq ? "bulb" : "choice"}
                data-value={o.id}
                data-light={c}
                aria-disabled={(seq ? !act2 : !canAct) || out}
                aria-label={seq ? `${nameOf(c)}. Press to put it in the next empty socket` : `${nameOf(c)}. Press to put it in the empty socket`}
                onPointerDown={(e) => !out && start(e, o.id)}
                onClick={(e) => {
                  if (ignoreClick(e)) return;
                  if (seq) put(o.id, e.detail === 0);
                  else submitChoice(o.id);
                }}
              >
                <Lamp colour={c} lit={!out} />
              </button>
            );
          })}
        </div>
        {seq && (
          <button type="button" className="ba-undo" data-testid="undo" aria-disabled={!act2 || filled.every((x, i) => x === null || okSlots.includes(i))} aria-label="Take the last bulb out" onClick={undo}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 14 L8 24 L18 34 M9 24 H30 Q40 24 40 33" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>
      <Ghost drag={drag} size={grid.cell}>{dragged && <Lamp colour={colourOf(dragged)} />}</Ghost>
    </div>
  );
}
