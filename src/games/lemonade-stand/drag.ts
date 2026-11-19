import { useEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";

/**
 * Pointer drag for the stand: press on a source, move past a small threshold, release over an element marked
 * `data-drop="<zone>"`. A ghost follows the pointer. Taps (no movement) fall through to the element's click
 * handler, which does the same move in one tap; keyboard Enter/Space uses that click too.
 */
export interface DragInfo<P> {
  payload: P;
  x: number;
  y: number;
  startX: number;
  startY: number;
  active: boolean;
}

export function useDragDrop<P>(root: React.RefObject<HTMLElement | null>, opts: { canAct: boolean; onDrop: (zone: string | null, payload: P) => void; busy?: () => void }) {
  const [drag, setDrag] = useState<DragInfo<P> | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const ref = useRef<DragInfo<P> | null>(null);
  const suppress = useRef(-Infinity);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const zoneAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const t = el?.closest<HTMLElement>("[data-drop]");
    if (!t || !root.current?.contains(t)) return null;
    return t.dataset.drop ?? null;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      if (active && !d.active) audio.play("pickup", { gain: 0.5 });
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      ref.current = next;
      setDrag(next);
      setHot(active ? zoneAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      if (d?.active) {
        suppress.current = e.timeStamp;
        optsRef.current.onDrop(e.type === "pointerup" ? zoneAt(e.clientX, e.clientY) : null, d.payload);
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

  const start = (e: React.PointerEvent, payload: P) => {
    if (!optsRef.current.canAct || e.button !== 0) return;
    optsRef.current.busy?.();
    const d: DragInfo<P> = { payload, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false };
    ref.current = d;
    setDrag(d);
  };
  /** True when this click is the tail of a drag that already did the move. */
  const wasDrag = (e: React.MouseEvent) => e.timeStamp - suppress.current < 120;

  return { drag: drag?.active ? drag : null, hot, start, wasDrag };
}
