import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { AnswerValue } from "../../engine/types";
import type { BoardProps } from "../../game/boards";

/**
 * Shared pieces for the four inner-game boards: a tiny external store (what Ready submits), pointer drag with
 * tap / keyboard alternatives, element sizing and the "after a miss" hook.
 */
function store<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v: T) => {
      if (Object.is(v, value)) return;
      value = v;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}
export interface ReadyState {
  exId: string;
  /** What Ready submits, or null when there is nothing to check yet. */
  value: AnswerValue | null;
}
export const readyStore = store<ReadyState>({ exId: "", value: null });
/** All Aboard (count): true once every passenger has boarded, so the number choices in the tray wake up. */
export const boardedStore = store<{ exId: string; all: boolean }>({ exId: "", all: false });

/** Publish what Ready would submit for this exercise (null = not ready). */
export function usePublish(exId: string, value: AnswerValue | null) {
  const key = JSON.stringify(value);
  useEffect(() => {
    readyStore.set({ exId, value });
  }, [exId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => readyStore.set({ exId: "", value: null }), []);
}

export function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Largest square cell for `n` items in a w×h zone; never below `min` (the 64 px tap target for under-7s). */
export function gridFor(n: number, w: number, h: number, max = 140, gap = 8, min = 64): { cols: number; cell: number } {
  let best = { cols: 1, cell: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, max);
    if (cell >= best.cell - 0.5) best = { cols, cell };
  }
  return { cols: best.cols, cell: Math.max(min, Math.floor(best.cell)) };
}

export interface Drag {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  active: boolean;
}
const dropAt = (x: number, y: number): string | null =>
  (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-ba-drop]")?.dataset.baDrop ?? null;

/** Pointer drag. A press without movement is a tap (handled by onClick); clicks right after a drag are ignored. */
export function useDrag(canAct: boolean, onDrop: (id: string, target: string | null) => void, busy?: () => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const ref = useRef<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const suppress = useRef(-Infinity);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
      if (active && !d.active) {
        audio.play("pickup", { gain: 0.5 });
        busy?.();
      }
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      ref.current = next;
      setDrag(next);
      setHot(active ? dropAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      if (d?.active) {
        suppress.current = e.timeStamp;
        dropRef.current(d.id, dropAt(e.clientX, e.clientY));
      }
      ref.current = null;
      setDrag(null);
      setHot(null);
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
  const start = (e: React.PointerEvent, id: string) => {
    if (!canAct || e.button !== 0) return;
    const d = { id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, active: false };
    ref.current = d;
    setDrag(d);
  };
  const ignoreClick = (e: React.MouseEvent) => e.timeStamp - suppress.current < 80;
  return { drag: drag?.active ? drag : null, hot, start, ignoreClick };
}

/** The thing being dragged, under the finger. Portalled to <body> so no container or transform can offset it. */
export const Ghost = ({ drag, children, size }: { drag: Drag | null; children: React.ReactNode; size: number }) =>
  drag
    ? createPortal(
        <div className="ba-ghost" style={{ left: drag.x, top: drag.y, width: size, height: size }} aria-hidden="true">
          {children}
        </div>,
        document.body,
      )
    : null;

/** Focus the first element matching any of the selectors (in order); returns whether one was found. */
export function focusSel(root: HTMLElement | null, ...sels: string[]): boolean {
  for (const sel of sels) {
    const el = (root?.querySelector(sel) ?? document.querySelector(sel)) as HTMLElement | null;
    if (el) {
      el.focus({ preventScroll: true });
      return true;
    }
  }
  return false;
}

/** After a wrong answer: run `prune(parts)` once when the board is back in "answering". */
export function useAfterMiss(st: BoardProps["st"], prune: (parts: Readonly<Record<string, boolean>>) => void) {
  const seen = useRef(0);
  useEffect(() => {
    const fb = st.feedback;
    if (st.phase !== "answering" || !fb || fb.correct || seen.current === fb.seq) return;
    seen.current = fb.seq;
    prune(st.check?.parts ?? {});
  }, [st.phase, st.feedback?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Items revealed so far by the worked example (all of them once it has finished). */
export const modelSlice = <T,>(items: readonly T[], alongIndex: number, phase: string): readonly T[] =>
  phase === "feedback" && alongIndex >= 0 ? items.slice(0, alongIndex + 1) : phase === "feedback" ? [] : items;

export function useCommon(st: BoardProps["st"]) {
  const { reducedMotion, speaking } = useApp();
  const canAct = st.phase === "answering";
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrong = st.phase === "feedback" && st.feedback?.correct === false;
  const locked = st.model !== null; // modelled answer showing: only the glowing control is live
  return { reducedMotion, speaking, canAct, celebrate, wrong, locked };
}

/** Say "All set? Press the green button" once, the first time everything is placed (pre-readers need the cue). */
export function useReadyCue(ready: boolean, speaking: boolean) {
  const said = useRef(false);
  useEffect(() => {
    if (!ready || said.current) return;
    said.current = true;
    if (!speaking) void audio.speak("ba.check");
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
}
