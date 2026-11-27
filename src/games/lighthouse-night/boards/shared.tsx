import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { AnswerOption, AnswerValue, Exercise } from "../../../engine/types";
import type { ExerciseState } from "../../../engine/session";
import type { BoardProps } from "../../../game/boards";
import { BobboBoat } from "../art";
import { methodFor, modelSteps } from "../hints";
import { GAME_TITLE, type Game, gameOf, modeOf } from "../logic";

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

/** The stage wrapper: inner-game tab, the scene (picture) and the panel (controls). */
export function Stage({ ex, scene, panel, sub, extra }: { ex: Exercise; scene: React.ReactNode; panel: React.ReactNode; sub?: string; extra?: Record<string, string | number> }) {
  const game: Game = gameOf(ex);
  const mode = modeOf(ex);
  const data = Object.fromEntries(Object.entries(extra ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <div className={`ln-stage game-${game} mode-${mode} ${extra?.board ? `board-${extra.board}` : ""}`} data-testid="ln-board" data-mode={mode} data-game={game} {...data}>
      <div className={`ln-tab tab-${game}`}>
        <span className="ln-tab-dot" aria-hidden="true" />
        <span className="ln-tab-title">{GAME_TITLE[game]}</span>
        {sub && <span className="ln-tab-sub">{sub}</span>}
      </div>
      <div className="ln-layout">
        <section className="ln-scene" aria-label="Picture">{scene}</section>
        <section className="ln-panel" aria-label="Your answer">{panel}</section>
      </div>
    </div>
  );
}

/** The fact card shown after a first miss (and kept while the model shows). */
export function Method({ ex, st }: { ex: Exercise; st: ExerciseState }) {
  if (st.hintStage < 1) return null;
  return <p className="ln-method" data-testid="ln-method">{methodFor(ex)}</p>;
}

/** Bobbo's boat in the finale: waits by the rocks, then sails home along the beam when the answer is right. */
export function FinaleBoat({ st }: { st: ExerciseState }) {
  const f = flags(st);
  return (
    <svg className={`ln-finale-boat ${f.solved ? "is-home" : ""}`} viewBox="0 0 100 90" aria-hidden="true" data-testid="ln-finale-boat">
      <BobboBoat />
    </svg>
  );
}

/** Answer options (choice): tap or Enter/Space; hint classes per the authoring contract. */
export function Options({ st, act, busy, options, label = "Choose" }: Pick<BoardProps, "st" | "act" | "busy"> & { options: readonly AnswerOption[]; label?: string }) {
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const a = st.exercise.answer;
  const correct = a.kind === "choice" ? a.correct : null;
  return (
    <div className={`ln-options ${options.length >= 4 ? "is-many" : ""}`} role="group" aria-label={label} data-ln-idle="true">
      {options.map((o) => {
        const out = st.eliminated.includes(o.id);
        const picked = st.lastAnswer === o.id;
        const cls = [
          "ln-opt",
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
            <span className="ln-opt-text">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Worked model (second miss): one step per runner step, then all of them while the child confirms. */
export function ModelSteps({ ex, st, alongIndex, title = "How the keeper works it out" }: { ex: Exercise; st: ExerciseState; alongIndex: number; title?: string }) {
  const f = flags(st);
  const steps = modelSteps(ex);
  const on = st.hintStage >= 2 && steps.length > 0;
  if (!on) return null;
  const upTo = alongIndex >= 0 ? alongIndex : f.canAct || f.solved ? steps.length - 1 : -1;
  return (
    <div className="ln-model" data-testid="model-steps" aria-live="polite">
      <p className="ln-model-title">{title}</p>
      <ol>
        {steps.map((s, i) => (
          <li key={i} className={i <= upTo ? "is-on" : ""} aria-hidden={i > upTo}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Keypad answers (number): digits, optional decimal point and minus sign, delete, Done; physical keys work too.
 * Every typical wrong answer can be typed (the first-miss hint diagnoses it). First miss: the entry clears;
 * second miss: the modelled answer is filled in and only Done stays, to confirm.
 */
export function Keypad({ st, act, busy, unit, dec = false, neg = false, pad3 = false, maxLen = 4, label, fixed }: Pick<BoardProps, "st" | "act" | "busy"> & {
  unit?: string; dec?: boolean; neg?: boolean; pad3?: boolean; maxLen?: number; label: string;
  /** Decimal places shown for the modelled answer (12 → "12.0" when an answer is asked to 1 d.p.). */
  fixed?: number;
}) {
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const kb = useKeyboardFlag();
  const [entry, setEntry] = useState("");
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const modelValue = f.modelOn && typeof st.model === "number" ? st.model : null;

  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    setEntry(modelValue !== null ? (fixed !== undefined ? modelValue.toFixed(fixed) : String(modelValue)).replace("-", "−") : "");
    // keyboard users keep typing digits anywhere; focus Done so Enter submits (a focused digit key would type itself)
    if (kb.current) window.setTimeout(() => (document.querySelector('[data-testid="done"]') as HTMLElement | null)?.focus({ preventScroll: true }), 40);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (k: string) => {
    if (!f.canAct || modelValue !== null) return;
    busy?.();
    audio.play("tap", { gain: 0.3 });
    setEntry((e) => {
      if (k === "back") return e.slice(0, -1);
      if (k === "neg") return e.startsWith("−") ? e.slice(1) : `−${e}`;
      if (k === ".") return !dec || e.includes(".") ? e : `${e === "" || e === "−" ? `${e}0` : e}.`;
      const digits = e.replace(/[−.]/g, "");
      if (digits.length >= maxLen) return e;
      if (e.includes(".") && e.split(".")[1]!.length >= 2) return e;
      return (e + k).replace(/^(−?)0+(?=\d)/, "$1");
    });
  };
  const parse = (s: string) => (s === "" || s === "−" || s === "." ? NaN : Number(s.replace("−", "-")));
  const done = () => {
    if (!f.canAct) return;
    const v = modelValue ?? parse(entryRef.current);
    if (!Number.isFinite(v)) return;
    audio.play("tap", { gain: 0.4 });
    submit(v);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "." || e.key === ",") press(".");
      else if ((e.key === "-" || e.key === "−") && neg) press("neg");
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter" && (tgt?.tagName !== "BUTTON" || tgt.dataset.testid === "key")) {
        // Enter on a focused digit key means "I'm done typing", not "press this key again"
        e.preventDefault();
        done();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = entry;
  const display = pad3 && /^\d{1,2}$/.test(shown) ? shown.padStart(3, "0") : shown;
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ...(neg ? ["neg"] : []), "0", ...(dec ? ["."] : []), "back"];
  const keyLabel = (k: string) => (k === "back" ? "Delete the last digit" : k === "neg" ? "Make it negative (minus sign)" : k === "." ? "Type a decimal point" : `Type ${k}`);
  const keyText = (k: string) => (k === "back" ? "⌫" : k === "neg" ? "−" : k);
  return (
    <div className="ln-keyblock">
      <div className={`ln-display ${f.solved ? "is-right" : ""} ${f.wrongNow ? "is-wrong" : ""} ${modelValue !== null && f.canAct ? "is-model" : ""}`} data-testid="ln-display" aria-live="polite" aria-label={`Your answer: ${shown || "empty"}${unit ? ` ${unit}` : ""}`}>
        <span className="ln-display-num">{display || "–"}</span>
        {unit && <span className="ln-display-unit">{unit}</span>}
      </div>
      <div className={`ln-keypad ${modelValue !== null ? "is-model-on" : ""} keys-${keys.length + 1}`} role="group" aria-label={label} data-ln-idle="true">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className={`ln-key ${k === "back" ? "is-back" : ""} ${k === "neg" || k === "." ? "is-sym" : ""}`}
            data-testid="key"
            data-value={k}
            aria-label={keyLabel(k)}
            aria-disabled={!f.canAct || modelValue !== null}
            onClick={() => press(k)}
          >
            {keyText(k)}
          </button>
        ))}
        <button
          type="button"
          className={`ln-key is-done ${modelValue !== null && f.canAct ? "is-model" : ""}`}
          data-testid="done"
          aria-label={`Done: ${shown || "nothing typed"}${unit ? ` ${unit}` : ""}`}
          aria-disabled={!f.canAct || shown === "" || shown === "−"}
          onClick={done}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/** The direction note after a first miss on a keypad item whose miss wasn't a named misconception. */
export function Direction({ st, high, low }: { st: ExerciseState; high: string; low: string }) {
  const f = flags(st);
  const r = st.check?.reason;
  if (!(st.hintStage === 1 && f.canAct && (r === "too-high" || r === "too-low"))) return null;
  return <p className="ln-note" data-testid="ln-direction">{r === "too-high" ? high : low}</p>;
}
