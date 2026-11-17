import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { numberWord } from "../../audio/voiceLines";
import { Puff } from "../../characters/Crew";
import type { MascotState, Exercise } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { MiniBalloon, NumberBalloon, RIDES, RainbowArch } from "./art";
import { skyBalloonRace } from "./definition";
import { RIVALS, addends, tenFrameCells, trackPos } from "./logic";
import { useRaceProgress } from "./progress";
import "./sky-balloon-race.css";
import { asNumber, choicesOf, targetOf } from "../../engine/validation";

const TOTAL = skyBalloonRace.progression.roundLength;
/** Little balloons tied to Bobbo's basket, in the same 300×440 box as RideArt's TIE_SLOTS. */
const TIE_SLOTS = [[52, 300], [248, 300], [24, 262], [276, 262], [64, 246], [236, 246], [34, 214], [266, 214]] as const;
const BALLOON_ASPECT = 200 / 120;
const BODY_Y = 0.32; // balloon body centre as a fraction of the balloon svg height

interface Drag {
  value: number;
  color: number;
  startX: number;
  startY: number;
  active: boolean;
}
interface Ghost {
  value: number;
  color: number;
  w: number;
  /** body centre at pick-up (viewport px) */
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  scale: number;
  mode: "drag" | "held" | "home" | "basket";
}

const dropEl = () => document.querySelector<HTMLElement>("[data-sb-drop]");
function overDrop(x: number, y: number) {
  const r = dropEl()?.getBoundingClientRect();
  return !!r && x >= r.left - 36 && x <= r.right + 36 && y >= r.top - 36 && y <= r.bottom + 36;
}

export function SkyBoard({ st, act, alongIndex }: BoardProps) {
  const ex = st.exercise;
  const { a, b } = addends(ex);
  const { reducedMotion, speaking } = useApp();
  const done = useRaceProgress();
  const doneAtMount = useRef(done);
  const choices = choicesOf(ex);
  const canAct = st.phase === "answering";
  const fb = st.feedback;
  const solvedNow = (st.phase === "feedback" && !!fb?.correct) || st.phase === "solved";
  const shown = Math.max(done, doneAtMount.current + (solvedNow ? 1 : 0));

  const refs = useRef(new Map<number, HTMLButtonElement>());
  const groupRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const ghostRef = useRef<Ghost | null>(null);
  ghostRef.current = ghost;
  /** Time of the last drag release: the click the browser fires right after it is ignored (event timestamps, so a busy device never swallows a later tap). */
  const suppressClick = useRef(-Infinity);

  const bodyCentre = (value: number) => {
    const r = refs.current.get(value)?.getBoundingClientRect();
    if (!r) return null;
    return { x: r.left + r.width / 2, y: r.top + r.width * BALLOON_ASPECT * BODY_Y, w: r.width };
  };
  const setHot = (on: boolean) => dropEl()?.classList.toggle("is-hot", on);

  // ---------- drag: the balloon follows the finger; drop it on Bobbo's balloon ----------
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      if (active && !d.active) {
        const c = bodyCentre(d.value);
        if (c) setGhost({ value: d.value, color: d.color, w: c.w, x0: c.x, y0: c.y, dx: 0, dy: 0, scale: 1.08, mode: "drag" });
      }
      dragRef.current = { ...d, active };
      if (active) {
        setGhost((g) => (g ? { ...g, dx: e.clientX - d.startX, dy: e.clientY - d.startY } : g));
        setHot(overDrop(e.clientX, e.clientY));
      }
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHot(false);
      if (!d?.active) return;
      suppressClick.current = e.timeStamp;
      if (overDrop(e.clientX, e.clientY) && e.type === "pointerup") {
        setGhost((g) => (g ? { ...g, mode: "held" } : g));
        act({ type: "SUBMIT", value: d.value });
      } else {
        setGhost((g) => (g ? { ...g, dx: 0, dy: 0, scale: 1, mode: "home" } : g));
        window.setTimeout(() => setGhost((g) => (g?.mode === "home" ? null : g)), 400);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null, act]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- answer presentation: correct balloon flies to the basket and is tied on; wrong floats home ----------
  const seq = fb?.seq;
  useEffect(() => {
    const value = asNumber(st.lastAnswer);
    if (!fb || st.phase !== "feedback" || value === null) return;
    if (!fb.correct) {
      setGhost((g) => (g ? { ...g, dx: 0, dy: 0, scale: 1, mode: "home" } : g));
      const t = window.setTimeout(() => setGhost((g) => (g?.mode === "home" ? null : g)), 420);
      return () => window.clearTimeout(t);
    }
    const front = document.querySelector(".sb-ride .sb-ride-front")?.getBoundingClientRect();
    const c = bodyCentre(value);
    if (!front || !c) return;
    const slot = TIE_SLOTS[Math.min(doneAtMount.current, TIE_SLOTS.length - 1)]!;
    const tx = front.left + (slot[0] / 300) * front.width;
    const ty = front.top + (slot[1] / 440) * front.height;
    const scale = Math.max(0.12, ((30 / 300) * front.width) / (c.w * 0.9));
    const color = choices.indexOf(value);
    const target = { dx: 0, dy: 0, scale, mode: "basket" as const };
    const g = ghostRef.current;
    if (g) {
      setGhost({ ...g, ...target, dx: tx - g.x0, dy: ty - g.y0 });
      return;
    }
    setGhost({ value, color, w: c.w, x0: c.x, y0: c.y, dx: 0, dy: 0, scale: 1, mode: "held" });
    // two frames later, start the flight (so the transition has a start state)
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setGhost((h) => (h ? { ...h, ...target, dx: tx - h.x0, dy: ty - h.y0 } : h)));
    });
    return () => cancelAnimationFrame(raf);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // hand over to the little balloon tied on Bobbo's basket once the runner records the result
  const ghostGone = solvedNow && done > doneAtMount.current;

  // ---------- tutorial: a dotted flight path from the balloons to Bobbo (never singles out an answer) ----------
  const showTrail = !!ex.tutorial && st.attempts === 0 && canAct && !drag;
  const [trail, setTrail] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!showTrail) return setTrail(null);
    const place = () => {
      const g = groupRef.current?.getBoundingClientRect();
      const d = dropEl()?.getBoundingClientRect();
      if (!g || !d) return setTrail(null);
      const x1 = g.left + g.width * 0.12;
      const y1 = g.top + g.height * 0.42;
      const x2 = d.left + d.width * 0.62;
      const y2 = d.top + d.height * 0.3;
      const cx = (x1 + x2) / 2;
      const cy = Math.min(y1, y2) - Math.abs(x1 - x2) * 0.18 - 30;
      setTrail(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`);
    };
    const t = window.setTimeout(place, 700); // after entry animations settle
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, [showTrail]);

  const puffState: MascotState = alongIndex >= 0 ? "encouraging" : solvedNow ? "celebrating" : st.phase === "feedback" ? "thinking" : "idle";

  return (
    <div className={`sb-stage ${solvedNow ? "is-solved" : ""} ${alongIndex >= 0 ? "is-teaching" : ""}`}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <RaceTrack shown={shown} />
      <div className="sb-puff" aria-hidden="true">
        <Puff state={puffState} talking={alongIndex >= 0 && speaking} size="100%" />
      </div>
      {alongIndex >= 0 && <CountOnPanel ex={ex} step={alongIndex} />}
      <div className="sb-balloons" role="group" aria-label={`Answer balloons for ${a} plus ${b}`} ref={groupRef}>
        {choices.map((c, i) => {
          const out = st.eliminated.includes(c);
          const disabled = out || !canAct;
          const wrong = st.phase === "feedback" && !fb?.correct && st.lastAnswer === c;
          const model = st.model === c && canAct;
          const flown = ghost?.value === c || (solvedNow && c === targetOf(ex));
          const cls = ["sb-balloon", `sb-b${i}`, out ? "is-out" : "", wrong ? "is-wrong" : "", model ? "is-model" : "", flown ? "is-flown" : "", solvedNow && c !== targetOf(ex) ? "is-released" : ""].join(" ");
          return (
            <button
              key={c}
              ref={(el) => {
                if (el) refs.current.set(c, el);
                else refs.current.delete(c);
              }}
              type="button"
              className={cls}
              data-testid="choice"
              data-value={c}
              aria-label={`${numberWord(c)} balloon. Drag to Bobbo or press to choose`}
              aria-disabled={disabled}
              onPointerDown={(e) => {
                if (disabled || e.button !== 0) return;
                const d0 = { value: c, color: i, startX: e.clientX, startY: e.clientY, active: false };
                dragRef.current = d0;
                setDrag(d0);
              }}
              onClick={(e) => {
                if (e.timeStamp - suppressClick.current < 80 || disabled) return;
                act({ type: "SUBMIT", value: c });
              }}
            >
              <span className="sb-bob" style={{ animationDelay: `${i * -1.1}s` }}>
                <NumberBalloon n={c} color={i} />
              </span>
            </button>
          );
        })}
      </div>
      {ghost && !ghostGone &&
        createPortal(
          <div
            className={`sb-ghost mode-${ghost.mode} ${reducedMotion ? "still" : ""}`}
            aria-hidden="true"
            style={{
              left: ghost.x0 - ghost.w / 2,
              top: ghost.y0 - ghost.w * BALLOON_ASPECT * BODY_Y,
              width: ghost.w,
              transform: `translate(${ghost.dx}px, ${ghost.dy}px) scale(${ghost.scale}) rotate(${ghost.mode === "drag" ? -6 : 0}deg)`,
            }}
          >
            <NumberBalloon n={ghost.value} color={ghost.color} />
          </div>,
          document.body,
        )}
      {trail &&
        createPortal(
          <svg className={`sb-trail ${reducedMotion ? "still" : ""}`} aria-hidden="true">
            <defs>
              <marker id="sb-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 Z" fill="#fff" />
              </marker>
            </defs>
            <path d={trail} className="sb-trail-path" markerEnd="url(#sb-arrow)" />
          </svg>,
          document.body,
        )}
    </div>
  );
}

/** Answer tray: the balloons live on the board, so the tray is empty (and collapsed by CSS). */
export function SkyTray(_p: BoardProps) {
  return <div className="sb-tray" aria-hidden="true" />;
}

// ---------- race track ----------
function RaceTrack({ shown }: { shown: number }) {
  const pos = (x: number) => `${4 + trackPos(x, TOTAL) * 84}%`;
  return (
    <div className="sb-track" role="img" aria-label={`Race: ${Math.min(shown, TOTAL)} of ${TOTAL} sums solved`} data-testid="race-track" data-pos={shown}>
      <span className="sb-track-line" />
      {Array.from({ length: TOTAL - 1 }, (_, i) => (
        <span key={i} className={`sb-check ${i + 1 <= shown ? "is-passed" : ""}`} style={{ left: pos(i + 1) }} />
      ))}
      <span className="sb-finish"><RainbowArch /></span>
      {RIVALS.map((r) => (
        <span key={r.id} className={`sb-racer rival ${shown > r.at ? "is-behind" : ""}`} style={{ left: pos(r.at) }}>
          <MiniBalloon body={RIDES[r.id].env} stripe={RIDES[r.id].stripe} />
        </span>
      ))}
      <span className="sb-racer bobbo" style={{ left: pos(shown) }}>
        <MiniBalloon body={RIDES.bobbo.env} stripe={RIDES.bobbo.stripe} />
      </span>
    </div>
  );
}

// ---------- worked example: count on from the bigger number in ten frames ----------
function CountOnPanel({ ex, step }: { ex: Exercise; step: number }) {
  const { big, small } = addends(ex);
  const cells = tenFrameCells(ex);
  const frames = cells.length / 10;
  const lit = Math.max(0, Math.min(step, small));
  const total = big + lit;
  return (
    <div className="sb-panel" role="img" aria-label={`Count on: start at ${big}, then count ${small} more. ${big} plus ${small} makes ${big + small}.`} data-testid="count-on">
      <div className="sb-panel-head">
        <span className={`sb-chip is-big ${step === 0 ? "is-now" : ""}`}>{big}</span>
        <span className="sb-plus">+</span>
        <span className="sb-chip is-small">{small}</span>
        <span className="sb-eq">=</span>
        <span className="sb-total" key={total}>{total}</span>
      </div>
      <div className={`sb-frames n-${frames}`}>
        {Array.from({ length: frames }, (_, f) => {
          const fc = cells.slice(f * 10, f * 10 + 10);
          const full = fc.every((c) => c.kind === "big" || (c.kind === "small" && c.order < lit));
          return (
            <div key={f} className={`sb-frame ${full ? "is-full" : ""}`}>
              {fc.map((c, i) => {
                const on = c.kind === "small" && c.order < lit;
                const now = (c.kind === "small" && c.order === lit - 1) || (c.kind === "big" && step === 0);
                return (
                  <span key={i} className={`sb-cell k-${c.kind} ${on ? "is-lit" : ""} ${now ? "is-now" : ""}`}>
                    {on && <b>{big + c.order + 1}</b>}
                  </span>
                );
              })}
              {full && <i className="sb-ten">10</i>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
