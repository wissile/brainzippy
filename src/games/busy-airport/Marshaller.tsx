import { useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { Marshaller, PlaneBehind } from "./art";
import { SIGNAL_SAY, SIGNAL_TEXT, type Signal, signalsOf } from "./generator";
import { focusSel, modelSlice, useAfterMiss, useCommon, usePublish, useReadyCue } from "./shared";

/**
 * Marshaller — a little plane taxis towards a junction; the marshaller in front signals with two glowing wands, and
 * the child steers the plane: turn left, go ahead, stop, slow down, turn right (big picture buttons; keys work too).
 * Signals follow the real marshalling idea in child-sized form: one wand points the way to turn (from the pilot's
 * seat) while the other waves the plane on; crossed wands up high mean stop; both wands beckoning mean go ahead;
 * patting low means slow down. Two-signal levels show the signals as a numbered strip (1, then 2) and need Ready.
 * Right: the plane rolls that way. Wrong: the plane only gives a puzzled wiggle (never a crash). First miss: Hoot
 * explains, the wrong move greys out and the wands glow. Second miss: the right move(s) glow and fill the plan.
 */
export function SignalIcon({ signal }: { signal: Signal }) {
  switch (signal) {
    case "left":
      return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 38 V26 Q30 18 22 18 H10 M18 9 L9 18 L18 27" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "right":
      return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 38 V26 Q18 18 26 18 H38 M30 9 L39 18 L30 27" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "ahead":
      return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 40 V10 M13 20 L24 9 L35 20" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "stop":
      return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 5 H31 L43 17 V31 L31 43 H17 L5 31 V17 Z" fill="#F2545B" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /><rect x="14" y="21" width="20" height="6" rx="3" fill="#fff" /></svg>;
    case "slow":
      return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 12 L24 22 L36 12 M12 26 L24 36 L36 26" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

export function MarshallerBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const a = ex.answer;
  if (a.kind !== "choice" && a.kind !== "sequence") throw new Error("Marshaller needs a choice or sequence answer");
  const options = (a.kind === "choice" ? a.options : a.pieces).map((o) => o.id as Signal);
  const want = signalsOf(ex);
  const two = want.length === 2;
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [plan, setPlan] = useState<Signal[]>([]);
  const [okSteps, setOkSteps] = useState<number[]>([]);
  const act2 = canAct && !locked;
  const model = two && Array.isArray(st.model) ? (st.model as Signal[]) : null;
  const modelChoice = !two && typeof st.model === "string" ? (st.model as Signal) : null;
  const shownPlan: Signal[] = model ? [...modelSlice(model, alongIndex, st.phase)] : plan;

  const press = (s: Signal, keyboard = false) => {
    if (st.eliminated.includes(s)) return;
    if (!two) {
      if (!canAct) return;
      busy?.();
      audio.play("tap", { gain: 0.6 });
      act({ type: "SUBMIT", value: s });
      return;
    }
    if (!act2 || plan.length >= 2 || plan.includes(s)) return;
    busy?.();
    audio.play("drop", { gain: 0.6 });
    setPlan((p) => [...p, s]);
    if (keyboard && plan.length === 1) window.setTimeout(() => focusSel(rootRef.current, '[data-testid="done"]'), 0);
  };
  const undo = () => {
    if (!act2) return;
    const last = plan.length - 1;
    if (last < 0 || okSteps.includes(last)) return;
    busy?.();
    setPlan((p) => p.slice(0, -1));
    audio.play("pickup", { gain: 0.5 });
  };
  useAfterMiss(st, (parts) => {
    if (!two) return;
    // keep the leading right steps (a plan is followed in order)
    const keep: number[] = [];
    for (let i = 0; i < 2 && parts[String(i)]; i++) keep.push(i);
    setOkSteps(keep);
    setPlan((p) => p.slice(0, keep.length));
  });
  const complete = shownPlan.length === 2;
  usePublish(ex.id, two ? (model ? model : complete ? plan : null) : null);
  useReadyCue(two && complete && !model && canAct, speaking);

  // where the plane rolls: the move just made (right or wrong), or the plan's first move when it was right
  const moved: Signal | null = two ? (celebrate ? want[0]! : null) : st.phase === "feedback" || st.phase === "solved" ? (st.lastAnswer as Signal) : null;
  const motion = moved ? (celebrate ? `go-${moved}` : "puzzled") : "";
  const hint = st.hintStage >= 1;
  return (
    <div ref={rootRef} className={`ba-board mode-signal ${two ? "is-two" : ""} ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ba-board" data-mode="signal" data-want={want.join(",")}>
      <div className="ba-apron" role="img" aria-label={two ? `Signal 1: the marshaller ${SIGNAL_SAY[want[0]!]}. Signal 2: the marshaller ${SIGNAL_SAY[want[1]!]}.` : `The marshaller ${SIGNAL_SAY[want[0]!]}.`}>
        <svg className="ba-apron-ground" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
          <rect width="400" height="240" fill="#86D67F" />
          <path d="M150 240 L182 120 L218 120 L250 240 Z" fill="#5A5670" />
          <path d="M0 96 L400 96 L400 128 L0 128 Z" fill="#5A5670" />
          <path d="M200 236 L200 150 Q200 112 160 112 L0 112 M200 150 Q200 112 240 112 L400 112 M200 150 L200 98" fill="none" stroke="#FFD43B" strokeWidth="5" strokeDasharray={reducedMotion ? undefined : "16 10"} />
        </svg>
        {two ? (
          <div className="ba-strip" data-ba-idle="">
            {want.map((s, i) => (
              <span key={i} className={`ba-card ${hint ? "is-hint" : ""}`}>
                <span className="ba-card-n" aria-hidden="true">{i + 1}</span>
                <Marshaller signal={s} still={reducedMotion} />
              </span>
            ))}
          </div>
        ) : (
          <span className={`ba-marshal ${hint ? "is-hint" : ""}`} data-ba-idle="">
            <Marshaller signal={want[0]!} still={reducedMotion} />
          </span>
        )}
        <span className={`ba-taxi ${motion}`} data-testid="taxi-plane" data-motion={motion || "idle"}>
          <PlaneBehind />
        </span>
      </div>
      <div className="ba-deck">
        {two && (
          <div className="ba-plan" aria-label={`Your plan: ${shownPlan.length ? shownPlan.map((s) => SIGNAL_TEXT[s]).join(", then ") : "empty"}`} role="group">
            {[0, 1].map((i) => {
              const s = shownPlan[i];
              const ok = okSteps.includes(i);
              const bad = wrong && st.check?.parts?.[String(i)] === false;
              return (
                <span key={i} className={`ba-plan-slot ${s ? "is-filled" : ""} ${ok ? "is-ok" : ""} ${bad ? "is-wrong" : ""} ${model ? "is-model" : ""}`} data-testid="plan-slot" data-value={s ?? ""}>
                  <span className="ba-card-n" aria-hidden="true">{i + 1}</span>
                  {s && <SignalIcon signal={s} />}
                </span>
              );
            })}
            <button type="button" className="ba-undo" data-testid="undo" aria-disabled={!act2 || plan.length === 0 || okSteps.includes(plan.length - 1)} aria-label="Take the last move out" onClick={undo}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 14 L8 24 L18 34 M9 24 H30 Q40 24 40 33" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
        <div className={`ba-steer n${options.length}`} role="group" aria-label="Steer the plane">
          {options.map((s) => {
            const out = st.eliminated.includes(s);
            const right = !two && celebrate && st.lastAnswer === s;
            const isWrong = !two && wrong && st.lastAnswer === s;
            const isModel = (!two && modelChoice === s) || (!!model && model.includes(s) && st.phase === "answering");
            const used = two && plan.includes(s);
            return (
              <button
                key={s}
                type="button"
                className={`ba-steer-btn sig-${s} ${out ? "is-out" : ""} ${right ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${isModel ? "is-model" : ""} ${used ? "is-used" : ""}`}
                data-testid={two ? "steer" : "choice"}
                data-value={s}
                aria-disabled={(two ? !act2 || used || plan.length >= 2 : !canAct) || out}
                aria-label={two ? `${SIGNAL_TEXT[s]}: add to the plan` : `${SIGNAL_TEXT[s]}`}
                onClick={(e) => press(s, e.detail === 0)}
              >
                <SignalIcon signal={s} />
                <span className="ba-steer-word">{SIGNAL_TEXT[s]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
