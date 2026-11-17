import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import { numberWord } from "../../audio/voiceLines";
import type { ExerciseEvent, ExerciseState } from "../../engine/session";
import type { Exercise, MascotState } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { BoardDefs, GloopCart, StopCrystal } from "./art";
import { cartStore, useCart } from "./cart";
import { glowCaveHops } from "./definition";
import { cameraLeft, clampPos, fitTrack, hopLandings, hopsTaken, snapToStop, stopX as stopAt } from "./logic";
import "./glow-cave.css";
import { asNumber, targetOf } from "../../engine/validation";

/**
 * Glow Cave Hops board + tray.
 *
 * Interaction design (one clear answer path):
 *   - The child moves Gloop's cart forward from the start stop by (a) sliding it (pointer drag, snaps to the
 *     nearest stop with a rail click), (b) the big "Hop +1" button, (c) arrow keys, or (d) tapping a number
 *     stop (the cart hops there one stop at a time, counting on aloud).
 *   - The single "Go!" button is the answer control: data-testid="choice", data-value = the cart's stop.
 *     It submits SUBMIT(position). exercise.answer.choices lists every stop so validation works.
 *   - Number stops are data-testid="stop" (move the cart; they never submit), so a child can't answer by
 *     accident and every route to an answer goes through the hops.
 */

const HUES = ["blue", "pink", "teal"] as const;
const HOP_MS = 380;

export const paramsOf = (ex: Exercise) => ({ start: ex.params?.start ?? 0, hops: ex.params?.hops ?? 1, max: ex.params?.max ?? 10 });

/** The runner's idle timer only sees engine events; a no-op event tells it the child is busy (no state change, no sound). */
const keepAlive = (act: (e: ExerciseEvent) => void) => act({ type: "REMOVE_FROM_BASKET", index: -1 });

const posOf = (ex: Exercise) => {
  const s = cartStore.get();
  return s.exId === ex.id ? s.pos : paramsOf(ex).start;
};

// One auto-hop sequence at a time (tapping a stop hops the cart there stop by stop).
let seqToken = 0;
const cancelSequence = () => void seqToken++;

function stepCart(st: ExerciseState, delta: 1 | -1): boolean {
  if (st.phase !== "answering") return false;
  const ex = st.exercise;
  const { start, max } = paramsOf(ex);
  const cur = posOf(ex);
  const next = clampPos(cur + delta, start, max);
  if (next === cur) {
    audio.play("tap", { rate: 0.6, gain: 0.35 }); // soft bump at the end of the track
    return false;
  }
  cartStore.move(ex.id, next, "hop");
  if (delta > 0) audio.playCount(hopsTaken(next, start));
  else audio.play("tap", { rate: 0.8, gain: 0.5 });
  audio.sayNumber(next);
  return true;
}

function hopTo(st: ExerciseState, target: number) {
  const t = ++seqToken;
  const go = () => {
    if (t !== seqToken) return;
    const cur = posOf(st.exercise);
    if (cur === target) return;
    if (!stepCart(st, target > cur ? 1 : -1)) return;
    window.setTimeout(go, HOP_MS + 40);
  };
  go();
}

function check(st: ExerciseState, act: (e: ExerciseEvent) => void) {
  if (st.phase !== "answering") return;
  cancelSequence();
  const pos = posOf(st.exercise);
  if (pos === paramsOf(st.exercise).start || st.eliminated.includes(pos)) {
    audio.play("tap", { rate: 0.7, gain: 0.4 });
    keepAlive(act);
    return;
  }
  act({ type: "SUBMIT", value: pos });
}

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

const arcPath = (a: number, b: number, base: number, h: number) => `M${a} ${base} Q${(a + b) / 2} ${base - h * 2} ${b} ${base}`;

/** "3 + 4 = ?" — links the hops to the written addition; the answer fills in when solved. */
function SumChip({ start, hops, target, solved }: { start: number; hops: number; target: number; solved: boolean }) {
  return (
    <span className="gc-chip gc-sum" data-testid="sum" aria-label={solved ? `${start} plus ${hops} equals ${target}` : `${start} plus ${hops} equals what?`}>
      <span className="gc-sum-start">{start}</span> + {hops} = <span className={solved ? "gc-sum-ans" : "gc-sum-q"}>{solved ? target : "?"}</span>
    </span>
  );
}
function CountChip({ taken, hops }: { taken: number; hops: number }) {
  return (
    <span className={`gc-chip gc-count ${taken === hops ? "full" : ""}`} data-testid="hop-count" data-hops={taken} role="status" aria-live="polite">
      Hops {taken} / {hops}
    </span>
  );
}

export function HopBoard({ st, act, alongIndex }: BoardProps) {
  const ex = st.exercise;
  const { start, hops, max } = paramsOf(ex);
  const target = targetOf(ex);
  const cart = useCart();
  const mine = cart.exId === ex.id;
  const pos = mine ? cart.pos : start;
  const motion = mine ? cart.motion : null;
  const [vpRef, { w, h }] = useSize<HTMLDivElement>();

  useLayoutEffect(() => {
    cartStore.load(ex.id, start, glowCaveHops.progression.roundLength);
    return cancelSequence;
  }, [ex.id, start]);

  // feedback: light the cave on success; gently roll back to the start after a miss
  const seq = st.feedback?.seq;
  const correct = st.feedback?.correct ?? false;
  useEffect(() => {
    if (seq === undefined || st.phase !== "feedback") return;
    cancelSequence();
    if (correct) {
      cartStore.light(ex.id);
      return;
    }
    const id = window.setTimeout(() => {
      cartStore.move(ex.id, start, "roll");
      audio.play("whoosh", { rate: 0.6, gain: 0.35 });
    }, 650);
    return () => window.clearTimeout(id);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard: arrows hop, Home returns to the start, Enter on the cart checks
  const stRef = useRef(st);
  stRef.current = st;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const s = stRef.current;
      if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "+") {
        e.preventDefault();
        cancelSequence();
        stepCart(s, 1);
        keepAlive(act);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "-") {
        e.preventDefault();
        cancelSequence();
        stepCart(s, -1);
        keepAlive(act);
      } else if (e.key === "Home") {
        e.preventDefault();
        hopTo(s, paramsOf(s.exercise).start);
        keepAlive(act);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  // wheels spin while the cart is moving
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    if (!mine || motion === null) return;
    setMoving(true);
    const id = window.setTimeout(() => setMoving(false), motion === "roll" ? 1100 : HOP_MS + 80);
    return () => window.clearTimeout(id);
  }, [pos, cart.hopSeq, motion]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- geometry ----
  const { geo, lay } = fitTrack(max, w || 800, h || 300);
  const { spacing, stripWidth, pad } = geo;
  const stopX = (i: number, sp: number) => stopAt(i, sp, pad);

  // ---- drag (slide the cart) ----
  const drag = useRef<{ pointer: number; x0: number; px0: number; last: number; moved: boolean } | null>(null);
  const [dragPx, setDragPx] = useState<number | null>(null);
  const [frozenCam, setFrozenCam] = useState<number | null>(null);

  const solvedView = st.phase === "solved" || (st.phase === "feedback" && correct);
  const modelling = alongIndex >= 0;
  const focus = modelling ? Math.min(max, start + alongIndex + 1) : asNumber(st.model) !== null && st.phase === "answering" ? Math.max(pos, asNumber(st.model)!) : pos;
  const cam = frozenCam ?? cameraLeft({ start, focus, spacing, stripWidth, viewportWidth: w || stripWidth, pad });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (st.phase !== "answering" || (e.pointerType === "mouse" && e.button !== 0)) return;
    cancelSequence();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointer: e.pointerId, x0: e.clientX, px0: stopX(pos, spacing), last: pos, moved: false };
    setFrozenCam(cam);
    setDragPx(stopX(pos, spacing));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const px = Math.min(stopX(max, spacing), Math.max(stopX(start, spacing), d.px0 + (e.clientX - d.x0)));
    if (Math.abs(e.clientX - d.x0) > 4) d.moved = true;
    setDragPx(px);
    const p = snapToStop(px, spacing, start, max, pad);
    if (p !== d.last) {
      // rail click on every stop crossed; rising notes going forward
      if (p > d.last) audio.playCount(hopsTaken(p, start));
      else audio.play("tap", { rate: 0.85, gain: 0.5 });
      d.last = p;
      cartStore.move(ex.id, p, "drag");
    }
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    setDragPx(null);
    setFrozenCam(null);
    cartStore.move(ex.id, d.last, "slide");
    if (d.moved) audio.sayNumber(d.last);
    keepAlive(act);
  };

  const cartX = dragPx ?? stopX(pos, spacing);
  const gloopState: MascotState = solvedView ? "celebrating" : st.phase === "feedback" ? "retry" : dragPx !== null ? "thinking" : "idle";
  const taken = hopsTaken(pos, start);
  const childArcs = solvedView ? hopLandings(start, target) : hopLandings(start, pos);
  const hintArcs = modelling ? hopLandings(start, Math.min(max, start + alongIndex + 1)) : [];
  const ready = w > 0 && h > 0;

  return (
    <div className={`gc-board ${solvedView ? "is-solved" : ""}`} data-testid="track" data-pos={pos} data-start={start} data-hops-needed={hops} data-max={max}>
      <BoardDefs />
      <div className="gc-hud in-board">
        <SumChip start={start} hops={hops} target={target} solved={solvedView} />
        <CountChip taken={taken} hops={hops} />
      </div>
      <div className={`gc-viewport ${geo.fits ? "" : "pans"}`} ref={vpRef} style={{ "--stop": `${lay.stopSize}px` } as React.CSSProperties}>
        {ready && (
          <>
            <div className="gc-ground" style={{ top: lay.railY + 6 }} aria-hidden="true" />
            <div className={`gc-strip ${frozenCam !== null ? "frozen" : ""}`} style={{ width: stripWidth, transform: `translateX(${-cam}px)` }}>
              <svg className="gc-rail" width={stripWidth} height={h} aria-hidden="true">
                {Array.from({ length: max + 1 }, (_, i) => (
                  <rect key={i} x={stopX(i, spacing) - Math.min(26, spacing * 0.32)} y={lay.railY + 3} width={Math.min(52, spacing * 0.64)} height={10} rx={3} fill="#6E4630" />
                ))}
                <rect x={pad + spacing * 0.12} y={lay.railY - 3} width={stripWidth - 2 * pad - spacing * 0.24} height={7} rx={3.5} fill="#D9CEFF" />
                <rect x={pad + spacing * 0.12} y={lay.railY - 3} width={stripWidth - 2 * pad - spacing * 0.24} height={2.5} rx={1} fill="#fff" opacity="0.6" />
                {[pad + spacing * 0.12 - 6, stripWidth - pad - spacing * 0.12 - 6].map((x) => <rect key={x} x={x} y={lay.railY - 16} width={12} height={22} rx={4} fill="#FF9F43" stroke="#2B2140" strokeWidth={3} />)}
              </svg>

              {Array.from({ length: max + 1 }, (_, i) => {
                const lit = solvedView && i >= start && i <= target;
                return (
                  <span
                    key={i}
                    className={`gc-crystal ${lit ? "lit" : ""}`}
                    style={{ left: stopX(i, spacing), top: lay.railY + 2, width: lay.crystalHeight * 0.86, height: lay.crystalHeight, animationDelay: `${(i - start) * 90}ms` } as React.CSSProperties}
                    aria-hidden="true"
                  >
                    <StopCrystal lit={lit} hue={HUES[i % 3]!} />
                  </span>
                );
              })}

              <svg className="gc-arcs" width={stripWidth} height={h} aria-hidden="true">
                {childArcs.map((land) => {
                  const a = stopX(land - 1, spacing), b = stopX(land, spacing);
                  return (
                    <g key={`c${land}`} className={`gc-arc ${solvedView ? "gold" : "teal"}`}>
                      <path d={arcPath(a + 6, b - 6, lay.arcBase, lay.arcHeight)} />
                      <text x={(a + b) / 2} y={lay.arcBase - lay.arcHeight - 6}>+1</text>
                    </g>
                  );
                })}
                {hintArcs.map((land, i) => {
                  const a = stopX(land - 1, spacing), b = stopX(land, spacing);
                  return (
                    <g key={`h${land}`} className={`gc-arc hint ${i === alongIndex ? "now" : ""}`}>
                      <path d={arcPath(a + 6, b - 6, lay.arcBase, lay.arcHeight)} />
                      <text x={(a + b) / 2} y={lay.arcBase - lay.arcHeight - 6}>+1</text>
                    </g>
                  );
                })}
              </svg>

              <ol className="gc-stops" aria-label={`Number line from 0 to ${max}`}>
                {Array.from({ length: max + 1 }, (_, i) => {
                  const behind = i < start;
                  const disabled = behind || st.phase !== "answering";
                  const cls = [
                    "gc-stop",
                    i === start ? "is-start" : "",
                    i === pos ? "is-here" : "",
                    i > start && i <= pos && !solvedView ? "is-visited" : "",
                    solvedView && i === target ? "is-right" : "",
                    st.phase === "feedback" && !correct && st.lastAnswer === i ? "is-wrong" : "",
                    st.model === i && st.phase === "answering" ? "is-model" : "",
                    st.eliminated.includes(i) && i !== start && st.model === null ? "is-out" : "",
                    hintArcs.length > 0 && i === start + alongIndex + 1 ? "is-along" : "",
                    behind ? "is-behind" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <li key={i} style={{ left: stopX(i, spacing), top: lay.numY }}>
                      <button
                        type="button"
                        className={cls}
                        data-testid="stop"
                        data-value={i}
                        aria-label={i === pos ? `${numberWord(i)}, the cart is here` : behind ? `${numberWord(i)}, behind the start` : `Hop the cart to ${numberWord(i)}`}
                        aria-disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          keepAlive(act);
                          if (i === posOf(ex)) return;
                          hopTo(st, i);
                        }}
                      >
                        {i}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div
                className={`gc-cart motion-${dragPx !== null ? "drag" : motion ?? "none"}`}
                style={{ width: lay.cartWidth, top: lay.railY - lay.cartWidth * 1.22 + 4, transform: `translateX(${cartX - lay.cartWidth / 2}px)` }}
                role="slider"
                tabIndex={0}
                aria-label="Gloop's mine cart. Use the arrow keys to hop"
                aria-valuemin={start}
                aria-valuemax={max}
                aria-valuenow={pos}
                aria-valuetext={`On ${numberWord(pos)}. ${taken} of ${hops} hops.`}
                data-testid="cart"
                data-pos={pos}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    check(st, act);
                  }
                }}
              >
                <div className={`gc-hopper ${motion === "hop" ? "hop" : ""}`} key={motion === "hop" ? cart.hopSeq : "still"}>
                  <GloopCart state={gloopState} moving={moving || dragPx !== null} />
                </div>
                {dragPx === null && st.phase === "answering" && taken === 0 && <span className="gc-grip" aria-hidden="true">›</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const IconHop = () => (
  <svg viewBox="0 0 64 40" aria-hidden="true">
    <path d="M8 34 Q32 -6 56 34" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 10" />
    <path d="M48 26 L57 35 L60 22" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconBackArrow = () => (
  <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 8 L12 20 L24 32" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconGo = () => (
  <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21 L17 30 L33 11" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function HopTray({ st, act }: BoardProps) {
  const ex = st.exercise;
  const { start, hops, max } = paramsOf(ex);
  const cart = useCart();
  const pos = cart.exId === ex.id ? cart.pos : start;
  const taken = hopsTaken(pos, start);
  const answering = st.phase === "answering";
  const fb = st.feedback;
  const goDisabled = !answering || taken === 0 || st.eliminated.includes(pos);
  const goState = st.phase === "solved" || (st.phase === "feedback" && fb?.correct) ? "is-right" : st.phase === "feedback" && fb && !fb.correct ? "is-wrong" : "";
  const coachHop = !!ex.tutorial && answering && taken < hops;
  const coachGo = answering && (st.model === pos || (!!ex.tutorial && taken === hops));

  return (
    <div className="gc-tray" role="group" aria-label="Move the cart, then press Go">
      {/* short landscape screens: the sum + hop counter move down here to give the track the full height */}
      <span className="gc-hud in-tray"><SumChip start={start} hops={hops} target={targetOf(ex)} solved={st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct)} /></span>
      <button
        type="button"
        className="gc-btn gc-back"
        data-testid="hop-back"
        aria-label="Hop back one space"
        aria-disabled={!answering || pos <= start}
        onClick={() => {
          cancelSequence();
          stepCart(st, -1);
          keepAlive(act);
        }}
      >
        <IconBackArrow />
      </button>
      <button
        type="button"
        className={`gc-btn gc-hop ${coachHop ? "gc-coach" : ""}`}
        data-testid="hop"
        aria-label="Hop forward one space"
        aria-disabled={!answering || pos >= max}
        onClick={() => {
          cancelSequence();
          stepCart(st, 1);
          keepAlive(act);
        }}
      >
        <IconHop />
        <span className="gc-hop-label">Hop <b>+1</b></span>
      </button>
      <button
        type="button"
        className={`choice gc-btn gc-go ${goState} ${st.eliminated.includes(pos) && taken > 0 ? "is-out" : ""} ${coachGo ? "is-model" : ""}`}
        data-testid="choice"
        data-value={pos}
        aria-label={taken === 0 ? "Go! Hop first, then check" : `Go! Check ${numberWord(pos)}`}
        aria-disabled={goDisabled}
        onClick={() => check(st, act)}
      >
        <IconGo />
        <span>Go!</span>
      </button>
      <span className="gc-hud in-tray"><CountChip taken={taken} hops={hops} /></span>
    </div>
  );
}
