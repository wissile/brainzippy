import { useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { SizePiece } from "./art";
import { parseSize } from "./generator";
import { Ghost, gridFor, modelSlice, rescueFocus, useAfterMiss, useCommon, useDrag, usePublish, useReadyCue, useSize } from "./shared";

/**
 * Size Line — 3 or 4 boats (or sponges) float in the water; line them up on the bath edge from smallest to biggest
 * (sequence). Tap a piece to put it in the next free space (keyboard: Enter), or drag it onto any space; tap a placed
 * piece (or Undo) to take it back. An arrow under the edge grows from thin to thick (small → big). On outline levels
 * each space shows a dashed silhouette of the size that belongs there. Ready checks. First miss: right pieces stay
 * with a tick, the others float back. Second miss: the pieces are placed for the child one by one and Ready glows.
 */
export function SizeLineBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "sequence") throw new Error("Size Line needs a sequence answer");
  const { pieces, order } = ex.answer;
  const count = order.length;
  const outline = (ex.params?.outline ?? 0) === 1;
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [shelfRef, shelf] = useSize<HTMLDivElement>();
  const [waterRef, water] = useSize<HTMLDivElement>();
  const slotCell = Math.max(64, Math.floor(Math.min((shelf.w - 16 - 10 * (count - 1)) / count, shelf.h - 24, 190)));
  const grid = gridFor(count, water.w - 16 - 84, water.h - 12, 170, 10);
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: count }, () => null));
  const [history, setHistory] = useState<number[]>([]);
  const [okSlots, setOkSlots] = useState<number[]>([]);
  const model = Array.isArray(st.model) ? (st.model as string[]) : null;
  const shown: (string | null)[] = model ? order.map((id, i) => (modelSlice(order, alongIndex, st.phase).includes(id) ? model[i] ?? null : null)) : placed;
  const act2 = canAct && !locked;
  const ghostOf = (rank: number) => parseSize(pieces.find((pc) => pc.id === order[rank])?.art);

  const put = (id: string, slot: number | null, keyboard = false) => {
    if (!act2) return;
    const target = slot ?? placed.findIndex((v) => v === null);
    if (target < 0 || okSlots.includes(target)) return;
    busy?.();
    setPlaced((pl) => {
      const next = pl.map((v) => (v === id ? null : v));
      next[target] = id; // a piece already there goes back to the water
      return next;
    });
    setHistory((h) => [...h.filter((s) => s !== target), target]);
    audio.play("drop", { gain: 0.6 });
    if (keyboard) window.setTimeout(() => rescueFocus(rootRef.current, '[data-testid="piece"]:not([aria-disabled="true"])', '[data-testid="done"]'), 0);
  };
  const takeBack = (slot: number) => {
    if (!act2 || okSlots.includes(slot) || placed[slot] === null) return;
    busy?.();
    setPlaced((pl) => pl.map((v, i) => (i === slot ? null : v)));
    setHistory((h) => h.filter((s) => s !== slot));
    audio.play("pickup", { gain: 0.5 });
  };
  const undo = () => {
    const last = [...history].reverse().find((s) => !okSlots.includes(s) && placed[s] !== null);
    if (last !== undefined) takeBack(last);
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target?.startsWith("slot:")) put(id, Number(target.slice(5)));
  }, busy);
  useAfterMiss(st, (parts) => {
    const ok = placed.map((_, i) => i).filter((i) => parts[String(i)]);
    setOkSlots(ok);
    setPlaced((pl) => pl.map((v, i) => (ok.includes(i) ? v : null)));
    setHistory((h) => h.filter((s) => ok.includes(s)));
  });
  const complete = shown.every((v) => v !== null);
  usePublish(ex.id, model ? model : complete ? (placed as string[]) : null);
  useReadyCue(complete && !model && canAct, speaking);

  const dragged = drag ? pieces.find((pc) => pc.id === drag.id) : undefined;
  const firstFree = pieces.find((pc) => !shown.includes(pc.id))?.id;
  const nextSlot = shown.findIndex((v) => v === null);
  return (
    <div ref={rootRef} className={`gb-board mode-size ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="size" data-count={count}>
      <div className="gb-shelf" ref={shelfRef}>
        <div className="gb-slots" role="group" aria-label="The bath edge, from smallest to biggest">
          {shown.map((id, i) => {
            const pc = id ? pieces.find((x) => x.id === id) : undefined;
            const g = ghostOf(i);
            const isOk = okSlots.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`gb-slot ${pc ? "is-filled" : ""} ${hot === `slot:${i}` ? "hot" : ""} ${isOk ? "is-ok" : ""} ${model && pc ? "is-model" : ""} ${i === nextSlot && !locked ? "is-next" : ""} ${celebrate ? "is-right" : ""}`}
                style={{ width: slotCell, height: slotCell }}
                data-testid="slot"
                data-value={id ?? ""}
                data-gb-drop={`slot:${i}`}
                aria-disabled={!act2 || !pc || isOk}
                tabIndex={act2 && pc && !isOk ? 0 : -1}
                aria-label={pc ? `Space ${i + 1}: the ${pc.text} ${g.kind}. Press to take it back` : `Space ${i + 1} of ${count}, empty`}
                onClick={(e) => !ignoreClick(e) && takeBack(i)}
              >
                {pc ? <SizePiece art={pc.art} /> : outline ? <SizePiece art={`size~${g.kind}~${g.size}`} ghost /> : null}
              </button>
            );
          })}
        </div>
        <svg className="gb-grow" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
          <path d="M6 12 L176 3 L176 0 L198 12 L176 24 L176 21 Z" />
        </svg>
      </div>
      <div className="gb-water" ref={waterRef}>
        <div className="gb-pieces" role="group" aria-label="Pieces in the water" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {pieces.map((pc, i) => {
            if (shown.includes(pc.id)) return <span key={pc.id} className="gb-slot-ring" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
            const back = st.hintStage >= 1 && !model;
            const sz = parseSize(pc.art);
            return (
              <button
                key={pc.id}
                type="button"
                className={`gb-item gb-piece ${drag?.id === pc.id ? "ghosted" : ""} ${back ? "is-back" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 80}ms` }}
                data-testid="piece"
                data-value={pc.id}
                data-size={sz.size}
                {...(pc.id === firstFree ? { "data-gb-idle": "" } : {})}
                aria-disabled={!act2}
                aria-label={`The ${pc.text} ${sz.kind}. Press to put it in the next space`}
                onPointerDown={(e) => start(e, pc.id)}
                onClick={(e) => !ignoreClick(e) && put(pc.id, null, e.detail === 0)}
              >
                <SizePiece art={pc.art} />
              </button>
            );
          })}
        </div>
        <button type="button" className="gb-tool gb-undo" data-testid="undo" tabIndex={!act2 || history.every((s) => okSlots.includes(s) || placed[s] === null) ? -1 : 0} aria-disabled={!act2 || history.every((s) => okSlots.includes(s) || placed[s] === null)} aria-label="Undo: take the last piece back" onClick={undo}>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 12 L8 22 L18 32 M9 22 H30 Q40 22 40 31 Q40 40 30 40 H22" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      <p className="sr-only" aria-live="polite">{shown.map((id, i) => `Space ${i + 1}: ${id ? `${pieces.find((x) => x.id === id)?.text}` : "empty"}.`).join(" ")}</p>
      <Ghost drag={drag} size={grid.cell}>{dragged && <SizePiece art={dragged.art} />}</Ghost>
    </div>
  );
}
