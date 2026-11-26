import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { AnswerOption, AnswerValue, Exercise } from "../../../engine/types";
import type { ExerciseState } from "../../../engine/session";
import type { BoardProps } from "../../../game/boards";
import { modelSteps } from "../hints";
import { GAME_TITLE, type Game } from "../logic";

/** Board state flags shared by every inner game. */
export function flags(st: ExerciseState) {
  const canAct = st.phase === "answering";
  const fb = st.feedback;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const wrongNow = st.phase === "feedback" && fb?.correct === false;
  return { canAct, solved, wrongNow, hinted: st.hintStage >= 1, modelOn: st.hintStage === 2 };
}

/** Submit through the engine (only while answering). */
export function useSubmit({ st, act, busy }: Pick<BoardProps, "st" | "act" | "busy">) {
  return (value: AnswerValue) => {
    if (st.phase !== "answering") return;
    busy?.();
    act({ type: "SUBMIT", value });
  };
}

/** Header tab: which inner game this is (the planning room has four, plus the final briefing). */
export function Tab({ game, sub }: { game: Game; sub?: string }) {
  return (
    <div className={`fp-tab tab-${game}`}>
      <span className="fp-tab-dot" aria-hidden="true" />
      <span className="fp-tab-title">{GAME_TITLE[game]}</span>
      {sub && <span className="fp-tab-sub">{sub}</span>}
    </div>
  );
}

/** Answer options (choice): tap or Enter/Space; hint classes per the authoring contract. */
export function Options({ st, act, busy, options, label = "Choose" }: Pick<BoardProps, "st" | "act" | "busy"> & { options: readonly AnswerOption[]; label?: string }) {
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const a = st.exercise.answer;
  const correct = a.kind === "choice" ? a.correct : null;
  return (
    <div className="fp-options" role="group" aria-label={label}>
      {options.map((o) => {
        const out = st.eliminated.includes(o.id);
        const picked = st.lastAnswer === o.id;
        const cls = [
          "fp-opt",
          f.solved && o.id === correct ? "is-right" : "",
          f.wrongNow && picked ? "is-wrong" : "",
          out ? "is-out" : "",
          f.modelOn && st.model === o.id && f.canAct ? "is-model" : "",
        ].join(" ");
        return (
          <button
            key={o.id}
            type="button"
            className={cls}
            data-testid="choice"
            data-value={o.id}
            aria-label={`${label}: ${o.text}`}
            aria-disabled={!f.canAct || out}
            onClick={() => {
              if (!f.canAct || out) return;
              audio.play("tap", { gain: 0.4 });
              submit(o.id);
            }}
          >
            <span className="fp-opt-text">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Worked model (second miss): one step per runner step, then all of them while the child completes the answer. */
export function ModelSteps({ ex, st, alongIndex, title = "How a pilot works it out" }: { ex: Exercise; st: ExerciseState; alongIndex: number; title?: string }) {
  const f = flags(st);
  const steps = modelSteps(ex);
  if (st.hintStage < 2 || steps.length === 0) return null;
  const upTo = alongIndex >= 0 ? alongIndex : f.canAct || f.solved ? steps.length - 1 : -1;
  return (
    <div className="fp-model" data-testid="model-steps" aria-live="polite">
      <p className="fp-model-title">{title}</p>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={i <= upTo ? "is-on" : ""} aria-hidden={i > upTo}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/** True while the last input came from the keyboard (focus is only moved for keyboard users). */
export function useKeyboardFlag() {
  const kb = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow")) kb.current = true;
    };
    const onPointer = () => {
      kb.current = false;
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);
  return kb;
}

/**
 * Minimal drag: press on a draggable, move > 10 px, release over an element with `data-fp-zone="<value>"`.
 * Tap-tap and keyboard do the same job (the drag is an extra, never required).
 */
export interface DragState { id: string; label: string; x: number; y: number; active: boolean }
export function useDrag(onDrop: (id: string, zone: string) => void, enabled: boolean, busy?: () => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const ref = useRef<{ id: string; label: string; sx: number; sy: number; active: boolean } | null>(null);
  const suppress = useRef(-Infinity);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  const zoneAt = (x: number, y: number) => {
    for (const el of document.elementsFromPoint(x, y)) {
      const z = (el as HTMLElement).closest?.("[data-fp-zone]") as HTMLElement | null;
      if (z) return z.dataset.fpZone ?? null;
    }
    return null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
      if (active && !d.active) {
        busy?.();
        audio.play("pickup", { gain: 0.35 });
      }
      d.active = active;
      if (active) {
        setDrag({ id: d.id, label: d.label, x: e.clientX, y: e.clientY, active });
        setHot(zoneAt(e.clientX, e.clientY));
      }
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      ref.current = null;
      setDrag(null);
      setHot(null);
      if (!d?.active) return;
      suppress.current = e.timeStamp;
      const z = e.type === "pointerup" ? zoneAt(e.clientX, e.clientY) : null;
      if (z) dropRef.current(d.id, z);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const dragProps = (id: string, label: string, can = true) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || !can || e.button !== 0) return;
      ref.current = { id, label, sx: e.clientX, sy: e.clientY, active: false };
      setDrag({ id, label, x: e.clientX, y: e.clientY, active: false });
    },
  });
  /** Call at the top of onClick: true when the click is the tail of a drag (ignore it). */
  const wasDrag = (e: React.MouseEvent) => e.timeStamp - suppress.current < 80;
  const ghost = drag?.active ? (
    <div className="fp-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{drag.label}</div>
  ) : null;
  return { drag, hot, dragProps, wasDrag, ghost };
}
