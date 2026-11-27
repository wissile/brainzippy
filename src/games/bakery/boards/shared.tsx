import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { AnswerValue, Exercise } from "../../../engine/types";
import type { ExerciseState } from "../../../engine/session";
import type { BoardProps } from "../../../game/boards";
import { modelSteps } from "../hints";
import { GAME_NAME, type Mode, typeDigit } from "../logic";

/** Board state flags shared by every inner game. */
export function flags(st: ExerciseState) {
  const canAct = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrongNow = st.phase === "feedback" && st.feedback?.correct === false;
  return { canAct, solved, wrongNow, hinted: st.hintStage >= 1, modelOn: st.hintStage >= 2 };
}

/** Submit through the engine (only while answering). */
export function useSubmit({ st, act, busy }: Pick<BoardProps, "st" | "act" | "busy">) {
  return (value: AnswerValue) => {
    if (st.phase !== "answering") return;
    busy?.();
    act({ type: "SUBMIT", value });
  };
}

/** Header tab naming the inner game (the bakery has four stations plus the order sheet). */
export function Tab({ mode, sub }: { mode: Mode; sub?: string }) {
  return (
    <div className={`bk-tab tab-${mode}`}>
      <span className="bk-tab-dot" aria-hidden="true" />
      <span className="bk-tab-title">{GAME_NAME[mode]}</span>
      {sub && <span className="bk-tab-sub">{sub}</span>}
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
 * Keyboard shortcuts for the board (window-level, like the other number boards): digits, Backspace, Enter (unless a
 * button has focus — it acts itself), arrows. Handlers are read from a ref so they always see fresh state.
 */
export interface KeyHandlers {
  digit?: (k: string) => void;
  back?: () => void;
  enter?: () => void;
  arrow?: (dir: "up" | "down" | "left" | "right") => void;
}
export function useBoardKeys(h: KeyHandlers) {
  const ref = useRef(h);
  ref.current = h;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      const c = ref.current;
      if (/^[0-9]$/.test(e.key) && c.digit) {
        e.preventDefault();
        c.digit(e.key);
      } else if (e.key === "Backspace" && c.back) {
        e.preventDefault();
        c.back();
      } else if (e.key === "Enter" && c.enter && tgt?.tagName !== "BUTTON") {
        e.preventDefault();
        c.enter();
      } else if (e.key.startsWith("Arrow") && c.arrow) {
        e.preventDefault();
        c.arrow(e.key.slice(5).toLowerCase() as "up" | "down" | "left" | "right");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * A typed number shared by the keypad, the steppers and the scene. After a miss the child's entry stays on screen and
 * the next digit starts a fresh number; the worked model (second miss) fills in the answer and locks the digits.
 */
export function useEntry(st: ExerciseState, initial = "") {
  const [entry, setEntry] = useState(initial);
  // a starting value (a stepper's 1) is a placeholder: the first digit typed replaces it
  const fresh = useRef(initial !== "");
  const f = flags(st);
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    if (modelValue !== null) setEntry(String(modelValue));
    else fresh.current = true;
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !f.canAct || modelValue !== null;
  const type = (k: string) => {
    if (locked) return;
    audio.play("tap", { gain: 0.3 });
    setEntry((e) => typeDigit(fresh.current ? "" : e, k));
    fresh.current = false;
  };
  const back = () => {
    if (locked) return;
    fresh.current = false;
    setEntry((e) => e.slice(0, -1));
  };
  const set = (v: number) => {
    if (locked) return;
    fresh.current = false;
    setEntry(String(v));
  };
  const value = entry === "" ? null : Number(entry);
  return { entry, value, type, back, set, locked, modelValue, setRaw: setEntry };
}

/** "Check: 1 tile", "Check: 12 tiles", or "Check (nothing typed yet)". */
export function checkText(entry: string, one = "", many = one): string {
  if (entry === "") return "Check (nothing typed yet)";
  const unit = entry === "1" ? one : many;
  return `Check: ${entry}${unit ? ` ${unit}` : ""}`;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "back"] as const;

/** Display + keypad + Check. Typical wrong answers (up to 4 digits) are all enterable so the hint can diagnose them. */
export function Keypad({
  st, entry, onType, onBack, onCheck, unit, label, checkLabel, blockedNote, disabled = false, showDisplay = true, ready,
}: {
  st: ExerciseState; entry: string; onType: (k: string) => void; onBack: () => void; onCheck: () => void; unit?: string; label: string;
  checkLabel: string; blockedNote?: string; disabled?: boolean; showDisplay?: boolean; ready?: boolean;
}) {
  const f = flags(st);
  const modelOn = f.modelOn && typeof st.model === "number";
  const off = !f.canAct || modelOn || disabled;
  return (
    <div className={`bk-entry ${modelOn ? "is-model-on" : ""}`}>
      {showDisplay && (
        <div
          className={`bk-display ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelOn && f.canAct ? "is-model" : ""}`}
          data-testid="bk-display"
          data-value={entry}
          aria-live="polite"
          aria-label={`${label}: ${entry || "nothing typed yet"}${unit ? ` ${unit}` : ""}`}
        >
          <span className="bk-display-label">{label}</span>
          <span className="bk-display-num">{entry || "–"}</span>
          {unit && <span className="bk-display-unit">{unit}</span>}
        </div>
      )}
      {blockedNote && <p className="bk-note" data-testid="bk-blocked">{blockedNote}</p>}
      <div className="bk-keypad" role="group" aria-label="Keypad" data-bk-idle="true">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`bk-key ${k === "back" ? "is-back" : ""}`}
            data-testid="key"
            data-value={k}
            aria-label={k === "back" ? "Delete the last digit" : `Type ${k}`}
            aria-disabled={off}
            onClick={() => (k === "back" ? onBack() : onType(k))}
          >
            {k === "back" ? "⌫" : k}
          </button>
        ))}
        <CheckButton st={st} onCheck={onCheck} label={checkLabel} ready={ready ?? (entry !== "" && !disabled)} />
      </div>
    </div>
  );
}

export function CheckButton({ st, onCheck, label, ready, className = "" }: { st: ExerciseState; onCheck: () => void; label: string; ready: boolean; className?: string }) {
  const f = flags(st);
  return (
    <button
      type="button"
      className={`bk-check ${className} ${ready && f.canAct ? "is-ready" : ""} ${f.solved ? "is-right" : ""} ${f.modelOn && f.canAct ? "is-model" : ""}`}
      data-testid="done"
      aria-label={label}
      aria-disabled={!f.canAct || !ready}
      onClick={() => {
        if (!f.canAct || !ready) return;
        audio.play("tap", { gain: 0.4 });
        onCheck();
      }}
    >
      Check
    </button>
  );
}

/** − value + stepper (a labelled group). */
export function Stepper({
  id, label, value, min, max, onStep, disabled, unitLabel,
}: { id: string; label: string; value: number; min: number; max: number; onStep: (by: number) => void; disabled: boolean; unitLabel: string }) {
  return (
    <div className="bk-stepper" role="group" aria-label={label}>
      <span className="bk-stepper-label">{label}</span>
      <div className="bk-stepper-row">
        <button type="button" className="bk-step" data-testid={`bk-${id}-down`} aria-label={`One fewer ${unitLabel}`} aria-disabled={disabled || value <= min} onClick={() => !disabled && value > min && onStep(-1)}>−</button>
        <output className="bk-stepper-value" data-testid={`bk-${id}-value`} aria-live="polite">{value}</output>
        <button type="button" className="bk-step" data-testid={`bk-${id}-up`} aria-label={`One more ${unitLabel}`} aria-disabled={disabled || value >= max} onClick={() => !disabled && value < max && onStep(1)}>+</button>
      </div>
    </div>
  );
}

/** Worked model (second miss): one step per runner step, then all of them while the child confirms the answer. */
export function ModelSteps({ ex, st, alongIndex, title = "How a baker works it out" }: { ex: Exercise; st: ExerciseState; alongIndex: number; title?: string }) {
  const f = flags(st);
  const steps = modelSteps(ex);
  if (!f.modelOn || steps.length === 0) return null;
  const upTo = alongIndex >= 0 ? alongIndex : f.canAct || f.solved ? steps.length - 1 : -1;
  return (
    <div className="bk-model" data-testid="model-steps" aria-live="polite">
      <p className="bk-model-title">{title}</p>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={i <= upTo ? "is-on" : ""} aria-hidden={i > upTo}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/** Pointer position → the cell of a grid drawn in an SVG with the given viewBox geometry. */
export function cellAt(svg: SVGSVGElement | null, e: { clientX: number; clientY: number }, g: { x0: number; y0: number; cell: number; vw: number; vh: number }) {
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  // the SVG keeps its aspect ratio (meet): work out the drawn box inside the element
  const scale = Math.min(r.width / g.vw, r.height / g.vh);
  const ox = r.left + (r.width - g.vw * scale) / 2;
  const oy = r.top + (r.height - g.vh * scale) / 2;
  const x = (e.clientX - ox) / scale - g.x0;
  const y = (e.clientY - oy) / scale - g.y0;
  return { col: Math.floor(x / g.cell), row: Math.floor(y / g.cell), x, y };
}

/** Pointer drag on a scene: down → move → up, reporting each position (the board snaps it). */
export function usePointerDrag(onPoint: (e: { clientX: number; clientY: number }, phase: "start" | "move" | "end") => void, enabled: boolean, busy?: () => void) {
  const [dragging, setDragging] = useState(false);
  const cb = useRef(onPoint);
  cb.current = onPoint;
  return {
    dragging,
    props: {
      onPointerDown: (e: React.PointerEvent<Element>) => {
        if (!enabled || e.button !== 0) return;
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        setDragging(true);
        busy?.();
        audio.play("pickup", { gain: 0.25 });
        cb.current(e, "start");
      },
      onPointerMove: (e: React.PointerEvent<Element>) => {
        if (!dragging || !enabled) return;
        cb.current(e, "move");
      },
      onPointerUp: (e: React.PointerEvent<Element>) => {
        if (!dragging) return;
        setDragging(false);
        audio.play("drop", { gain: 0.25 });
        cb.current(e, "end");
      },
      onPointerCancel: () => setDragging(false),
    },
  };
}
