import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import { Bobbo } from "../../characters/Bobbo";
import { Rumble } from "../../characters/Crew";
import type { ExerciseState } from "../../engine/session";
import type { Exercise, MascotState } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { FracGlyph, LANDMARK_NAMES, Landmark, Pillow } from "./art";
import { fracWords, postOf } from "./fractions";
import { FINE, type Item, itemOf } from "./generator";
import { critterAnchor, jumpLandings, layoutTrail, pointAt, ticksAt, type TrailLayout } from "./logic";
import { type Who, trailStore, useTrail } from "./store";
import "./sleepy-trail.css";

/**
 * Rumble's Sleepy Trail — board + tray.
 *
 * One clear answer path per mode:
 *   place     move Rumble to a post (drag him, tap a post, ←/→, or the tray's step buttons) → "Nap here"
 *   name      Rumble already stands on a post → tap one of three fraction cards
 *   compare   place Rumble on his trail and Bobbo on his (same length, different parts) → "Who walked farther?"
 *   estimate  no posts: drag Rumble, tap the trail, or nudge with ←/→ (24ths of a unit) → "Nap here"
 * Posts (data-testid="post") only MOVE a critter; answers go through the tray (data-testid="choice").
 */

const STEP_MS = 230;
type Act = BoardProps["act"];

export const ticksPerUnit = (it: Item, who: Who = "rumble") => (it.mode === "estimate" ? FINE : it.mode === "compare" && who === "bobbo" ? it.d2! : it.P);
export const maxTicks = (it: Item, who: Who = "rumble") => it.M * ticksPerUnit(it, who);
/** The correct position in ticks (posts, or 24ths for estimates). */
export function targetTicks(it: Item, who: Who = "rumble"): number {
  if (it.mode === "compare") return who === "bobbo" ? it.a2! : it.a;
  if (it.mode === "estimate") return (it.a * FINE) / it.d;
  return postOf({ a: it.a, d: it.d }, it.P) ?? 0;
}

const posOf = (ex: Exercise, who: Who) => {
  const s = trailStore.get();
  return s.exId === ex.id ? s.pos[who] : 0;
};
/** A critter whose part was right after a miss stays put (compare); nothing moves once the answer is modelled. */
function locked(st: ExerciseState, who: Who): boolean {
  const it = itemOf(st.exercise);
  if (it.mode === "name" || st.hintStage >= 2) return true;
  return it.mode === "compare" && st.hintStage >= 1 && st.check?.parts?.[who] === true;
}
const canMove = (st: ExerciseState, who: Who) => st.phase === "answering" && !locked(st, who);

const bump = () => audio.play("tap", { rate: 0.6, gain: 0.35 });
const footstep = (k: number) => audio.play("tap", { rate: 0.85 + (k % 3) * 0.08, gain: 0.32 });

let walkToken = 0;
const cancelWalk = () => void walkToken++;

function stepBy(st: ExerciseState, who: Who, delta: number): boolean {
  const ex = st.exercise;
  const it = itemOf(ex);
  if (!canMove(st, who)) return (bump(), false);
  const cur = posOf(ex, who);
  const next = Math.max(0, Math.min(maxTicks(it, who), cur + delta));
  if (next === cur) return (bump(), false);
  trailStore.move(ex.id, who, next, "walk");
  footstep(next);
  return true;
}

/** Walk post by post (so the jumps can be counted); estimates jump straight to the spot. */
function walkTo(st: ExerciseState, who: Who, target: number) {
  const it = itemOf(st.exercise);
  cancelWalk();
  if (!canMove(st, who)) return bump();
  trailStore.setActive(st.exercise.id, who);
  if (it.mode === "estimate") {
    trailStore.move(st.exercise.id, who, target, "jump");
    footstep(target);
    return;
  }
  const t = walkToken;
  const go = () => {
    if (t !== walkToken) return;
    const cur = posOf(st.exercise, who);
    if (cur === target) return;
    if (!stepBy(st, who, target > cur ? 1 : -1)) return;
    window.setTimeout(go, STEP_MS);
  };
  go();
}

/** Submit what's on the trail. Never counts an incomplete answer as wrong: it just bumps. */
function submit(st: ExerciseState, act: Act, farther?: Who) {
  if (st.phase !== "answering") return;
  cancelWalk();
  const ex = st.exercise;
  const it = itemOf(ex);
  const s = trailStore.get();
  if (it.mode === "place") {
    const k = posOf(ex, "rumble");
    if (st.eliminated.includes(k)) return bump();
    act({ type: "SUBMIT", value: k });
  } else if (it.mode === "estimate") {
    act({ type: "SUBMIT", value: posOf(ex, "rumble") / FINE });
  } else if (it.mode === "compare" && farther) {
    const placed = st.hintStage >= 2 || ((s.placed.rumble || locked(st, "rumble")) && (s.placed.bobbo || locked(st, "bobbo")));
    if (!placed) return bump();
    act({ type: "SUBMIT", value: { rumble: `r${posOf(ex, "rumble")}`, bobbo: `b${posOf(ex, "bobbo")}`, farther } });
  }
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

/** Arc from trail position u0 to u1 (units), bulging up (horizontal) or right (vertical). */
function arcPath(lay: TrailLayout, u0: number, u1: number, lane: number, lift: number) {
  const a = pointAt(lay, u0, lane), b = pointAt(lay, u1, lane);
  const inset = Math.min(5, lay.spacing * 0.08);
  if (lay.vertical) return `M${a.x} ${a.y - inset} Q${a.x + lift * 2} ${(a.y + b.y) / 2} ${b.x} ${b.y + inset}`;
  return `M${a.x + inset} ${a.y} Q${(a.x + b.x) / 2} ${a.y - lift * 2} ${b.x - inset} ${b.y}`;
}

const WHO_NAME: Record<Who, string> = { rumble: "Rumble", bobbo: "Bobbo" };

export function TrailBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const it = itemOf(ex);
  const trail = useTrail();
  const mine = trail.exId === ex.id;
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const who: Who[] = it.mode === "compare" ? ["rumble", "bobbo"] : ["rumble"];
  const tick = () => busy?.();

  useLayoutEffect(() => {
    trailStore.load(ex.id, it.mode === "name" ? { rumble: it.a } : {});
    return cancelWalk;
  }, [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // feedback: a pillow on success; after a miss the wrong critter(s) walk back to Mossy Rock and the parts of the
  // first whole flash one by one
  const seq = st.feedback?.seq;
  const correct = st.feedback?.correct ?? false;
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (seq === undefined || st.phase !== "feedback") return;
    cancelWalk();
    if (correct) {
      trailStore.pillow(ex.id);
      return;
    }
    if (st.hintStage === 1) setFlash((f) => f + 1);
    if (it.mode === "name") return;
    const id = window.setTimeout(() => {
      for (const c of who) if (st.check?.parts?.[c] !== true) trailStore.move(ex.id, c, 0, "back", false);
      audio.play("whoosh", { rate: 0.6, gain: 0.3 });
    }, 700);
    return () => window.clearTimeout(id);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(0), 3200);
    return () => window.clearTimeout(id);
  }, [flash]);

  // modelled answer: the critters stand on the right spots (they walked there during the worked example)
  const modelling = st.hintStage >= 2;
  useEffect(() => {
    if (!modelling || st.phase !== "answering") return;
    for (const c of who) if (it.mode !== "name") trailStore.move(ex.id, c, targetTicks(it, c), null);
  }, [modelling, st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard: arrows move the active critter, Home/End jump to the ends, PageUp/PageDown take bigger steps
  const stRef = useRef(st);
  stRef.current = st;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const s = stRef.current;
      const m = itemOf(s.exercise);
      if (m.mode === "name") return;
      const c = trailStore.get().active;
      const big = m.mode === "estimate" ? 3 : 1;
      const keys: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: big * 2, PageDown: -big * 2 };
      if (e.key in keys) {
        e.preventDefault();
        cancelWalk();
        stepBy(s, c, keys[e.key]!);
        busy?.();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        walkTo(s, c, e.key === "Home" ? 0 : maxTicks(m, c));
        busy?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  // ---- geometry ----
  const layoutPosts = it.mode === "estimate" ? 4 : it.mode === "compare" ? Math.max(it.d, it.d2!) : it.P;
  const lay = layoutTrail(w || 900, h || 400, it.M, layoutPosts, who.length);
  const ready = w > 0 && h > 0;

  // ---- drag ----
  const drag = useRef<{ pointer: number; who: Who; last: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState<Who | null>(null);
  const local = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (c: Who) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canMove(st, c) || (e.pointerType === "mouse" && e.button !== 0)) return;
    cancelWalk();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointer: e.pointerId, who: c, last: posOf(ex, c), moved: false };
    trailStore.setActive(ex.id, c);
    setDragging(c);
    tick();
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const p = local(e);
    const k = ticksAt(lay, p.x, p.y, it.M, ticksPerUnit(it, d.who));
    if (k !== d.last) {
      d.last = k;
      d.moved = true;
      trailStore.move(ex.id, d.who, k, "drag");
      if (it.mode !== "estimate") footstep(k);
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    setDragging(null);
    trailStore.move(ex.id, d.who, d.last, "walk", d.moved || trailStore.get().placed[d.who]);
    tick();
  };

  // ---- what to show ----
  const solvedView = st.phase === "solved" || (st.phase === "feedback" && correct);
  const revealPosts = it.mode !== "estimate" || solvedView || modelling;
  const halfMarks = it.mode === "estimate" && st.hintStage >= 1 && !revealPosts;
  /** display position (units) of each critter: the worked-example walk overrides the store */
  const shownAt = (c: Who): number => {
    const tpu = ticksPerUnit(it, c);
    if (alongIndex >= 0) {
      if (c === "rumble") return Math.min(alongIndex + 1, it.a) / it.d;
      return Math.max(0, Math.min(alongIndex - it.a + 1, it.a2!)) / it.d2!;
    }
    return (mine ? trail.pos[c] : it.mode === "name" && c === "rumble" ? it.a : 0) / tpu;
  };
  const partsOf = (c: Who) => (c === "bobbo" ? it.d2! : it.P);
  const lift = Math.max(10, Math.min(30, lay.spacing * 0.3));

  // gold jumps in the target's own unit (3/4 on eighths → three jumps of one fourth): during the model, or once solved
  const goldJumps = (c: Who) => {
    const a = c === "bobbo" ? it.a2! : it.a;
    const d = c === "bobbo" ? it.d2! : it.d;
    if (solvedView) return jumpLandings(a, d);
    if (alongIndex < 0) return [];
    const n = c === "rumble" ? Math.min(alongIndex + 1, a) : Math.max(0, Math.min(alongIndex - it.a + 1, a));
    return jumpLandings(n, d);
  };
  // the child's own jumps while walking (marked trails): one arc per post from zero
  const childJumps = (c: Who) => {
    if (it.mode === "estimate" || solvedView || alongIndex >= 0 || modelling) return [];
    const k = mine ? trail.pos[c] : 0;
    return Array.from({ length: k }, (_, i) => (i + 1) / partsOf(c));
  };

  const critterState = (c: Who): MascotState =>
    solvedView ? (c === "rumble" ? "sleeping" : "celebrating") : st.phase === "feedback" ? "retry" : dragging === c ? "thinking" : "idle";
  const motion = mine ? trail.motion : null;

  return (
    <div
      className={`st-board ${lay.vertical ? "is-vertical" : "is-horizontal"} mode-${it.mode} ${solvedView ? "is-solved" : ""}`}
      data-testid="trail"
      data-mode={it.mode}
      data-a={it.a}
      data-d={it.d}
      data-p={it.P}
      data-m={it.M}
      data-a2={it.a2 ?? ""}
      data-d2={it.d2 ?? ""}
      data-vertical={lay.vertical}
      data-pos={mine ? trail.pos.rumble : 0}
      data-pos2={mine ? trail.pos.bobbo : 0}
      ref={ref}
      style={{ "--hit": `${lay.hit}px`, "--critter": `${lay.critter}px`, "--landmark": `${lay.landmark}px` } as React.CSSProperties}
    >
      {ready && (
        <>
          <svg className="st-trail-svg" width={w} height={h} aria-hidden="true">
            {who.map((c, lane) => {
              const p0 = pointAt(lay, -0.06, lane), p1 = pointAt(lay, it.M + 0.06, lane);
              const parts = partsOf(c);
              return (
                <g key={c} className={`st-lane lane-${c}`}>
                  <path d={`M${p0.x} ${p0.y} L${p1.x} ${p1.y}`} className="st-path-edge" />
                  <path d={`M${p0.x} ${p0.y} L${p1.x} ${p1.y}`} className="st-path" />
                  {/* first miss: the equal parts of the first whole light up one by one */}
                  {flash > 0 && Array.from({ length: it.mode === "estimate" ? 2 : parts }, (_, i) => {
                    const n = it.mode === "estimate" ? 2 : parts;
                    const a = pointAt(lay, i / n, lane), b = pointAt(lay, (i + 1) / n, lane);
                    return <path key={`${flash}-${i}`} d={`M${a.x} ${a.y} L${b.x} ${b.y}`} className={`st-seg-flash ${i % 2 ? "odd" : ""}`} style={{ animationDelay: `${i * 220}ms` }} />;
                  })}
                  {revealPosts && Array.from({ length: it.M * parts + 1 }, (_, k) => {
                    const whole = k % parts === 0;
                    const p = pointAt(lay, k / parts, lane);
                    const len = whole ? 26 : 17;
                    return lay.vertical
                      ? <rect key={k} x={p.x - len} y={p.y - 4} width={len * 2} height={8} rx={3} className={`st-stake ${whole ? "whole" : ""}`} />
                      : <rect key={k} x={p.x - 4} y={p.y - len} width={8} height={len * 2} rx={3} className={`st-stake ${whole ? "whole" : ""}`} />;
                  })}
                  {!revealPosts && Array.from({ length: it.M + 1 }, (_, m) => {
                    const p = pointAt(lay, m, lane);
                    return lay.vertical ? <rect key={m} x={p.x - 26} y={p.y - 4} width={52} height={8} rx={3} className="st-stake whole" /> : <rect key={m} x={p.x - 4} y={p.y - 26} width={8} height={52} rx={3} className="st-stake whole" />;
                  })}
                  {halfMarks && Array.from({ length: it.M }, (_, m) => {
                    const p = pointAt(lay, m + 0.5, lane);
                    return (
                      <g key={`h${m}`} className="st-half" data-testid="half-mark">
                        {lay.vertical ? <rect x={p.x - 18} y={p.y - 3} width={36} height={6} rx={3} /> : <rect x={p.x - 3} y={p.y - 18} width={6} height={36} rx={3} />}
                        <text x={lay.vertical ? p.x + 30 : p.x} y={lay.vertical ? p.y + 6 : p.y + 40}>½</text>
                      </g>
                    );
                  })}
                  {childJumps(c).map((u) => (
                    <path key={`c${u}`} d={arcPath(lay, u - 1 / parts, u, lane, lift * 0.8)} className="st-arc teal" />
                  ))}
                  {goldJumps(c).map((u, i, all) => {
                    const d = c === "bobbo" ? it.d2! : it.d;
                    const a = pointAt(lay, u - 1 / d, lane), b = pointAt(lay, u, lane);
                    const big = Math.max(12, Math.min(40, (lay.unit / d) * 0.3));
                    const lbl = lay.vertical ? { x: a.x + big * 1.25 + 20, y: (a.y + b.y) / 2 + 7 } : { x: (a.x + b.x) / 2, y: a.y - big * 1.2 - 8 };
                    return (
                      <g key={`g${u}`} className={`st-arc-g ${i === all.length - 1 && alongIndex >= 0 ? "now" : ""}`}>
                        <path d={arcPath(lay, u - 1 / d, u, lane, big)} className="st-arc gold" />
                        <text x={lbl.x} y={lbl.y} className="st-arc-label">{`${i + 1}/${d}`}</text>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* whole numbers: label + landmark (Mossy Rock, Big Tree, Far Hill, Cloud Peak) */}
          {who.map((c, lane) =>
            lane !== who.length - 1 ? null : Array.from({ length: it.M + 1 }, (_, m) => {
              const p = pointAt(lay, m, lane);
              const style = lay.vertical ? { left: p.x + lay.hit / 2 + 6, top: p.y } : { left: p.x, top: p.y + lay.hit / 2 + 2 };
              return (
                <span key={`${c}${m}`} className="st-whole" style={style} data-testid={m === 0 ? "trail-start" : undefined}>
                  {lay.landmark > 0 && <span className="st-landmark" title={LANDMARK_NAMES[m]}><Landmark m={m} /></span>}
                  <b className="st-num">{m}</b>
                </span>
              );
            }),
          )}

          {/* lane name tags for compare */}
          {it.mode === "compare" && who.map((c, lane) => {
            const p = pointAt(lay, 0, lane);
            const style = lay.vertical ? { left: p.x, top: 4 } : { left: 4, top: p.y - lay.critter * 1.25 };
            const a = c === "bobbo" ? it.a2! : it.a, d = c === "bobbo" ? it.d2! : it.d;
            return (
              <span key={`tag${c}`} className={`st-tag tag-${c}`} style={style} aria-hidden="true">
                {WHO_NAME[c]} <FracGlyph a={a} d={d} />
              </span>
            );
          })}

          {/* posts: tap to walk there */}
          {revealPosts && it.mode !== "name" && it.mode !== "estimate" && who.map((c, lane) => {
            const parts = partsOf(c);
            return (
              <ol key={`posts${c}`} className="st-posts" aria-label={`${WHO_NAME[c]}'s trail: ${it.M * parts + 1} posts from 0 to ${it.M}`}>
                {Array.from({ length: it.M * parts + 1 }, (_, k) => {
                  const p = pointAt(lay, k / parts, lane);
                  const here = mine && trail.pos[c] === k;
                  const out = c === "rumble" && it.mode === "place" && st.eliminated.includes(k) && st.model === null;
                  const isModel = modelling && targetTicks(it, c) === k && st.phase === "answering";
                  const wrong = st.phase === "feedback" && !correct && (it.mode === "place" ? st.lastAnswer === k : false);
                  const cls = ["st-post", here ? "is-here" : "", out ? "is-out" : "", isModel ? "is-model" : "", wrong ? "is-wrong" : "", solvedView && targetTicks(it, c) === k ? "is-right" : ""].filter(Boolean).join(" ");
                  const whole = k % parts === 0;
                  return (
                    <li key={k} style={{ left: p.x, top: p.y }}>
                      <button
                        type="button"
                        className={cls}
                        data-testid="post"
                        data-lane={c}
                        data-value={k}
                        aria-label={here ? `${WHO_NAME[c]} is on post ${k}` : whole ? `Walk ${WHO_NAME[c]} to ${k / parts}, ${LANDMARK_NAMES[k / parts]}` : `Walk ${WHO_NAME[c]} to post ${k}`}
                        aria-disabled={!canMove(st, c)}
                        onClick={() => {
                          tick();
                          walkTo(st, c, k);
                        }}
                      />
                    </li>
                  );
                })}
              </ol>
            );
          })}

          {/* estimate: tap anywhere on the trail */}
          {it.mode === "estimate" && (() => {
            const a = pointAt(lay, 0), b = pointAt(lay, it.M);
            const style = lay.vertical
              ? { left: a.x - lay.hit / 2, top: b.y - 12, width: lay.hit, height: a.y - b.y + 24 }
              : { left: a.x - 12, top: a.y - lay.hit / 2, width: b.x - a.x + 24, height: lay.hit };
            return (
              <button
                type="button"
                className="st-pad"
                data-testid="trail-pad"
                style={style}
                aria-label="The trail. Tap where Rumble should go, or use the arrow keys"
                aria-disabled={!canMove(st, "rumble")}
                onClick={(e) => {
                  if (e.detail === 0) return; // keyboard: arrows move Rumble
                  const r = ref.current!.getBoundingClientRect();
                  tick();
                  walkTo(st, "rumble", ticksAt(lay, e.clientX - r.left, e.clientY - r.top, it.M, FINE));
                }}
              />
            );
          })()}

          {/* pillow on the spot once solved */}
          {solvedView && who.slice(0, 1).map((c) => {
            const p = critterAnchor(lay, pointAt(lay, shownAt(c), who.indexOf(c)));
            return (
              <span key="pillow" className="st-pillow" style={{ left: p.x, top: p.y, width: lay.critter * 1.15 }} data-testid="pillow">
                <Pillow glow />
                <span className="st-zzz" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>
              </span>
            );
          })}

          {/* the critters */}
          {who.map((c, lane) => {
            const u = shownAt(c);
            const p = critterAnchor(lay, pointAt(lay, u, lane));
            const tpu = ticksPerUnit(it, c);
            const k = mine ? trail.pos[c] : 0;
            const movable = canMove(st, c);
            const valueText = it.mode === "estimate" ? `${Math.round((k / FINE) * 100) / 100} of the way` : k % tpu === 0 ? `on ${k / tpu}` : `on post ${k}`;
            return (
              <div
                key={c}
                className={`st-critter critter-${c} motion-${dragging === c ? "drag" : (motion ?? "none")} ${trail.active === c && it.mode === "compare" ? "is-active" : ""} ${locked(st, c) && st.hintStage === 1 ? "is-ok" : ""}`}
                style={{ width: lay.critter, transform: `translate(${p.x - lay.critter / 2}px, ${p.y - lay.critter * 1.1}px)` }}
                role="slider"
                tabIndex={it.mode === "name" ? -1 : 0}
                aria-label={it.mode === "name" ? `${WHO_NAME[c]} stands on post ${it.a}` : `${WHO_NAME[c]}. Use the arrow keys to walk along the trail`}
                aria-valuemin={0}
                aria-valuemax={maxTicks(it, c)}
                aria-valuenow={k}
                aria-valuetext={valueText}
                aria-disabled={!movable}
                data-testid={c}
                data-pos={k}
                onFocus={() => trailStore.setActive(ex.id, c)}
                onPointerDown={onDown(c)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && it.mode !== "compare") {
                    e.preventDefault();
                    submit(st, act);
                  }
                }}
              >
                <div className="st-walker" key={motion === "walk" ? k : "still"}>
                  {c === "rumble" ? <Rumble state={critterState(c)} size="100%" /> : <Bobbo state={critterState(c)} size="100%" />}
                </div>
                {movable && !dragging && k === 0 && it.mode !== "name" && <span className="st-grip" aria-hidden="true">{lay.vertical ? "˄" : "›"}</span>}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- tray

const IconBack = () => <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M24 8 L12 20 L24 32" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconFwd = () => <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M16 8 L28 20 L16 32" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconMoon = () => (
  <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M26 6 A15 15 0 1 0 34 28 A12 12 0 1 1 26 6 Z" fill="currentColor" /></svg>
);

export function TrailTray({ st, act, busy }: BoardProps) {
  const ex = st.exercise;
  const it = itemOf(ex);
  const trail = useTrail();
  const mine = trail.exId === ex.id;
  const answering = st.phase === "answering";
  const fb = st.feedback;
  const right = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const missed = st.phase === "feedback" && !!fb && !fb.correct;
  const pos = mine ? trail.pos.rumble : 0;
  const tick = () => busy?.();

  if (it.mode === "name" && ex.answer.kind === "choice") {
    const ans = ex.answer;
    return (
      <div className="st-tray cards" role="group" aria-label="Pick the fraction for Rumble's spot">
        {ans.options.map((o) => {
          const [a, d] = o.id.slice(1).split("-").map(Number) as [number, number];
          const out = st.eliminated.includes(o.id);
          const cls = ["choice", "st-card", out ? "is-out" : "", st.model === o.id && answering ? "is-model" : "", right && o.id === ans.correct ? "is-right" : "", missed && st.lastAnswer === o.id ? "is-wrong" : ""].filter(Boolean).join(" ");
          return (
            <button key={o.id} type="button" className={cls} data-testid="choice" data-value={o.id} aria-label={`${fracWords({ a, d })}`} aria-disabled={!answering || out} onClick={() => answering && !out && act({ type: "SUBMIT", value: o.id })}>
              <FracGlyph a={a} d={d} />
            </button>
          );
        })}
      </div>
    );
  }

  if (it.mode === "compare") {
    const both = st.hintStage >= 2 || ((trail.placed.rumble || locked(st, "rumble")) && (trail.placed.bobbo || locked(st, "bobbo")));
    const model = st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>).farther : null;
    const last = st.lastAnswer && typeof st.lastAnswer === "object" && !Array.isArray(st.lastAnswer) ? (st.lastAnswer as Record<string, string>).farther : null;
    return (
      <div className="st-tray who" role="group" aria-label="Who walked farther?">
        {(["rumble", "bobbo"] as Who[]).map((c) => {
          const out = model !== null && model !== c;
          const cls = ["choice", "st-who", `who-${c}`, out ? "is-out" : "", model === c && answering ? "is-model" : "", right && ex.answer.kind === "match" && ex.answer.pairs.farther === c ? "is-right" : "", missed && last === c ? "is-wrong" : ""].filter(Boolean).join(" ");
          return (
            <button key={c} type="button" className={cls} data-testid="choice" data-value={c} aria-label={both ? `${WHO_NAME[c]} walked farther` : `${WHO_NAME[c]} walked farther. First put Rumble and Bobbo on their spots`} aria-disabled={!answering || !both || out} onClick={() => !out && submit(st, act, c)}>
              <span className="st-who-face">{c === "rumble" ? <Rumble state="idle" size="100%" /> : <Bobbo state="idle" size="100%" />}</span>
              <span className="st-who-label">{WHO_NAME[c]}<small>walked farther</small></span>
            </button>
          );
        })}
      </div>
    );
  }

  const target = targetTicks(it);
  const out = it.mode === "place" && st.eliminated.includes(pos);
  const coach = answering && (st.hintStage >= 2 || (!!ex.tutorial && pos === target));
  const value = it.mode === "estimate" ? pos / FINE : pos;
  const step = (delta: number) => {
    cancelWalk();
    stepBy(st, "rumble", delta);
    tick();
  };
  return (
    <div className="st-tray steps" role="group" aria-label="Walk Rumble, then press Nap here">
      <button type="button" className="st-btn st-step" data-testid="step-back" aria-label="Walk back a little" aria-disabled={!canMove(st, "rumble") || pos <= 0} onClick={() => step(-1)}><IconBack /></button>
      <button
        type="button"
        className={`choice st-btn st-nap ${right ? "is-right" : ""} ${missed ? "is-wrong" : ""} ${out ? "is-out" : ""} ${coach ? "is-model" : ""}`}
        data-testid="choice"
        data-value={value}
        aria-label={`Nap here${it.mode === "place" ? `, on post ${pos}` : ""}`}
        aria-disabled={!answering || out}
        onClick={() => submit(st, act)}
      >
        <IconMoon /><span>Nap here</span>
      </button>
      <button type="button" className="st-btn st-step" data-testid="step-forward" aria-label="Walk forward a little" aria-disabled={!canMove(st, "rumble") || pos >= maxTicks(it)} onClick={() => step(1)}><IconFwd /></button>
    </div>
  );
}

