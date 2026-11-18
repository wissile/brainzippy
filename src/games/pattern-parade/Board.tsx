import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { IconCheck } from "../../ui/icons";
import { MarcherArt } from "./art";
import { chunks, decodeParade, kindOut, kindsOf, rowLayout, valueFor } from "./logic";
import { labelOf, token } from "./tokens";
import "./pattern-parade.css";

/**
 * Puff's Pattern Parade play board: the parade line (with gaps) and Puff's cart of marchers.
 * Fill a gap by dragging a marcher onto it, by tapping a marcher (it goes to the chosen gap, else the first
 * empty one), or by keyboard (Enter on a marcher). Tapping an empty gap chooses it; tapping a filled gap sends
 * the marcher back. One gap submits straight away; several gaps are checked with the check button.
 * Sounds (drum, bell…) are optional decoration: every cue is also visual.
 */

function playKind(kind: string | undefined) {
  const t = kind ? token(kind) : undefined;
  if (t) audio.play(t.sound.sfx, { rate: t.sound.rate, gain: t.sound.gain });
}

interface Drag {
  kind: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 260 });
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

export function ParadeBoard({ st, act, alongIndex, busy, progress }: BoardProps) {
  const ex = st.exercise;
  const parade = useMemo(() => decodeParade(ex), [ex]);
  const { reducedMotion } = useApp();
  const nGaps = parade.answer.length;
  const isChoice = ex.answer.kind === "choice";
  const canAct = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrongNow = st.phase === "feedback" && st.feedback?.correct === false;

  const [filled, setFilled] = useState<(string | null)[]>(() => Array(nGaps).fill(null));
  const [target, setTarget] = useState<number | null>(null);
  const [landed, setLanded] = useState<{ gap: number; n: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hot, setHot] = useState<number | "line" | null>(null);
  const suppressClick = useRef(-Infinity);
  const [march, setMarch] = useState(-1); // index of the marcher bouncing in the victory march / unit song
  const timers = useRef<number[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [areaRef, area] = useSize<HTMLDivElement>();

  const rows: 1 | 2 = parade.source ? 2 : 1;
  const layout = useMemo(() => rowLayout(parade.row.length, area.w, area.h, rows, { minCell: 64, maxCell: 124, gap: 8 }), [parade.row.length, area.w, area.h, rows]);
  const boxes = useMemo(() => chunks(parade), [parade]);
  const chunkOf = (i: number) => boxes.findIndex((b) => i >= b.start && i <= b.end);
  const modelKinds = st.model !== null ? kindsOf(ex, st.model) : [];

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);
  /** Bounce (and sound) marchers one after another: a little "song" of the pattern. */
  const sing = (indices: number[], kinds: (string | undefined)[], step = 280) => {
    clearTimers();
    indices.forEach((idx, k) => {
      timers.current.push(window.setTimeout(() => {
        setMarch(idx);
        playKind(kinds[k]);
      }, k * step));
    });
    timers.current.push(window.setTimeout(() => setMarch(-1), indices.length * step + 200));
  };

  // after a miss: keep the right marchers (mark-parts), send the others back to the cart
  const fbSeq = st.feedback?.seq;
  useEffect(() => {
    if (st.phase !== "answering" || !st.check || st.check.correct) return;
    const parts = st.check.parts ?? {};
    setFilled((f) => f.map((k, j) => (!isChoice && parts[String(j)] === true ? k : null)));
    setTarget(null);
    // first miss: Puff "sings" the first repeating part so the child can hear and see the unit
    if (st.hintStage === 1 && parade.mode !== "grow") {
      const unit = Array.from({ length: parade.unit }, (_, i) => i).filter((i) => parade.row[i]!.gap < 0);
      sing(unit, unit.map((i) => parade.row[i]!.kind), 420);
    }
  }, [fbSeq, st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // correct: the whole parade marches past, each marcher playing its sound
  useEffect(() => {
    if (!solved) return;
    const all = parade.row.map((_, i) => i);
    sing(all, parade.row.map((c) => c.kind), 240);
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

  // worked example (second miss): march along the row, marcher by marcher (gaps show the modelled marcher)
  useEffect(() => {
    if (alongIndex < 0) return;
    const c = parade.row[alongIndex];
    if (c) playKind(c.gap >= 0 ? (modelKinds[c.gap] ?? c.kind) : c.kind);
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const place = (kind: string, gap?: number) => {
    if (!canAct || kindOut(ex, st.eliminated, kind)) return;
    busy?.();
    const empty = filled.findIndex((k) => !k);
    const j = gap ?? (target !== null && !filled[target] ? target : empty);
    if (j < 0 || j >= nGaps) return;
    const next = filled.map((k, i) => (i === j ? kind : k));
    setFilled(next);
    setTarget(null);
    setLanded((l) => ({ gap: j, n: (l?.n ?? 0) + 1 }));
    playKind(kind);
    if (isChoice) act({ type: "SUBMIT", value: kind });
  };
  const removeAt = (j: number) => {
    if (!canAct || !filled[j]) return;
    busy?.();
    setFilled((f) => f.map((k, i) => (i === j ? null : k)));
    audio.play("pickup", { gain: 0.5 });
  };
  const check = () => {
    if (!canAct) return;
    const v = valueFor(ex, filled, st.eliminated);
    if (v) act({ type: "SUBMIT", value: v });
  };

  // ---------- pointer drag ----------
  const dropAt = (x: number, y: number): number | "line" | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const gap = el?.closest<HTMLElement>("[data-gap]");
    if (gap && rootRef.current?.contains(gap)) return Number(gap.dataset.gap);
    if (el?.closest("[data-pp-drop]")) return "line";
    return null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      if (active && !d.active) {
        audio.play("pickup", { gain: 0.4 });
        busy?.();
      }
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setHot(active ? dropAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHot(null);
      if (!d?.active) return;
      suppressClick.current = e.timeStamp;
      if (e.type !== "pointerup") return;
      const t = dropAt(e.clientX, e.clientY);
      if (typeof t === "number") place(d.kind, t);
      else if (t === "line") place(d.kind);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null, filled, target, canAct, st.eliminated]); // eslint-disable-line react-hooks/exhaustive-deps

  const full = filled.every(Boolean);
  const shownKind = (j: number): string | null => (solved ? parade.answer[j]! : filled[j] ?? null);
  const nextModel = st.hintStage === 2 && canAct ? (modelKinds[filled.findIndex((k) => !k)] ?? null) : null;
  const stageCls = ["pp-stage", `mode-${parade.mode}`, rows === 2 ? "two-rows" : "", st.hintStage >= 1 && canAct ? "show-boxes" : "", solved ? "is-solved" : "", wrongNow ? "is-wrong" : "", drag?.active ? "is-dragging" : "", reducedMotion ? "still" : ""].join(" ");

  const cellBox = (i: number) => {
    const k = chunkOf(i);
    if (k < 0) return "";
    const b = boxes[k]!;
    return `in-chunk ${k % 2 ? "chunk-odd" : "chunk-even"} ${i === b.start ? "chunk-start" : ""} ${i === b.end ? "chunk-end" : ""} ${b.hasGap ? "chunk-gap" : ""}`;
  };
  const growBadge = (i: number) => (parade.mode === "grow" && st.hintStage >= 1 ? <b className="pp-count" aria-hidden="true">{i + 1 <= parade.row.length ? (parade.row[i]!.gap >= 0 && !solved ? "?" : parade.row[i]!.kind.replace("tower-", "")) : ""}</b> : null);

  return (
    <div className={stageCls} ref={rootRef} data-testid="parade-board" data-mode={parade.mode} style={{ "--cell": `${layout.cell}px` } as React.CSSProperties}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <Route done={progress?.done ?? 0} total={progress?.total ?? 8} />

      <div className="pp-area" ref={areaRef}>
        <div
          className={`pp-line ${hot === "line" ? "is-hot" : ""}`}
          data-pp-drop
          role="list"
          aria-label="The parade"
          style={{ gridTemplateColumns: `repeat(${Math.min(layout.perLine, parade.row.length)}, var(--cell))` }}
        >
          {parade.row.map((c, i) => {
            const along = alongIndex === i;
            const bounce = march === i;
            const src = parade.source?.[i];
            const cls = `${cellBox(i)} ${along ? "is-along" : ""} ${bounce ? "is-march" : ""}`;
            let cell: React.JSX.Element;
            if (c.gap < 0) {
              cell = (
                <span className={`pp-cell pp-marcher ${cls}`} role="listitem" data-testid="pp-marcher" data-kind={c.kind} aria-label={labelOf(c.kind)}>
                  <span className="pp-bob" style={{ animationDelay: `${(i % 4) * -0.35}s` }}><MarcherArt kind={c.kind} /></span>
                  {growBadge(i)}
                </span>
              );
            } else {
              const j = c.gap;
              const k = shownKind(j);
              const okPart = st.phase === "feedback" ? st.check?.parts?.[String(j)] : undefined;
              const ghost = !k && modelKinds[j] && (alongIndex < 0 || alongIndex >= i) ? modelKinds[j]! : null;
              const state = solved ? "is-right" : wrongNow && k ? (isChoice || okPart === false ? "is-wrong" : "is-ok") : "";
              const label = k
                ? `${labelOf(k)} in gap ${j + 1}.${canAct ? " Press to take it back" : ""}`
                : `Gap ${j + 1} of ${nGaps}, empty. ${target === j ? "Chosen: now pick a marcher from the cart" : "Press to choose this gap"}`;
              cell = (
                <button
                  type="button"
                  className={`pp-cell pp-gap ${cls} ${k ? "is-filled" : ""} ${target === j ? "is-target" : ""} ${hot === j ? "is-hot" : ""} ${state}`}
                  data-testid="pp-gap"
                  data-gap={j}
                  data-kind={k ?? ""}
                  aria-label={label}
                  aria-disabled={!canAct}
                  onClick={() => {
                    if (!canAct) return;
                    if (filled[j]) return removeAt(j);
                    busy?.();
                    audio.play("tap", { gain: 0.35 });
                    setTarget((t) => (t === j ? null : j));
                  }}
                >
                  {k ? (
                    <span className={`pp-placed ${landed?.gap === j ? "land" : ""}`} key={`${k}-${landed?.gap === j ? landed.n : 0}`}><MarcherArt kind={k} /></span>
                  ) : ghost ? (
                    <span className="pp-ghost" aria-hidden="true"><MarcherArt kind={ghost} /></span>
                  ) : (
                    <span className="pp-q" aria-hidden="true">?</span>
                  )}
                  {growBadge(i)}
                </button>
              );
            }
            return src ? (
              <span key={i} className="pp-pair">
                <span className={`pp-cell pp-source ${cls}`} data-kind={src} aria-label={labelOf(src)} role="listitem">
                  <span className="pp-bob" style={{ animationDelay: `${(i % 4) * -0.35}s` }}><MarcherArt kind={src} /></span>
                </span>
                {cell}
              </span>
            ) : (
              <span key={i} className="pp-slot">{cell}</span>
            );
          })}
        </div>
      </div>

      <div className="pp-cartbar">
        <div className="pp-cart" role="group" aria-label="Puff's cart of marchers">
          {parade.cart.map((kind, i) => {
            const out = kindOut(ex, st.eliminated, kind);
            const disabled = out || !canAct || (full && !isChoice);
            const lifted = drag?.active && drag.kind === kind;
            const lastWrong = isChoice && wrongNow && st.lastAnswer === kind;
            return (
              <button
                key={kind}
                type="button"
                className={`pp-pick ${out ? "is-out" : ""} ${nextModel === kind ? "is-model" : ""} ${lifted ? "is-lifted" : ""} ${lastWrong ? "is-wrong" : ""}`}
                style={{ animationDelay: `${i * 70}ms` }}
                data-testid="choice"
                data-value={kind}
                aria-label={`${labelOf(kind)}. Drag into the parade, or press to add it`}
                aria-disabled={disabled}
                onPointerDown={(e) => {
                  if (disabled || e.button !== 0) return;
                  const d0 = { kind, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
                  dragRef.current = d0;
                  setDrag(d0);
                }}
                onClick={(e) => {
                  if (e.timeStamp - suppressClick.current < 80 || disabled) return;
                  place(kind);
                }}
              >
                <MarcherArt kind={kind} />
              </button>
            );
          })}
        </div>
        {!isChoice && (
          <button
            type="button"
            className={`done-btn pp-check ${full && canAct ? "is-ready" : ""} ${full && st.hintStage === 2 && canAct ? "is-model" : ""} ${solved ? "is-right" : ""}`}
            data-testid="done"
            aria-label="Check the parade"
            aria-disabled={!canAct || !full}
            onClick={check}
          >
            <IconCheck />
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {filled.map((k, j) => `Gap ${j + 1}: ${k ? labelOf(k) : "empty"}.`).join(" ")}
      </p>

      {drag?.active &&
        createPortal(
          <div className="pp-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
            <MarcherArt kind={drag.kind} />
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The parade route: Puff's pennant marches toward the big stage as the round goes on. */
function Route({ done, total }: { done: number; total: number }) {
  const pos = Math.min(1, done / Math.max(1, total));
  return (
    <div className="pp-route" role="img" aria-label={`Parade route: ${Math.min(done, total)} of ${total} gaps filled`} data-testid="parade-route" data-pos={done}>
      <span className="pp-route-line" />
      {Array.from({ length: total }, (_, i) => <span key={i} className={`pp-route-dot ${i < done ? "is-passed" : ""}`} style={{ left: `${6 + ((i + 1) / total) * 82}%` }} />)}
      <span className="pp-route-stage" aria-hidden="true" />
      <span className="pp-route-flag" style={{ left: `${6 + pos * 82}%` }}><MarcherArt kind="parade" /></span>
    </div>
  );
}

/** The cart lives on the board, so the runner's tray is empty (and hidden by CSS). */
export function ParadeTray(_p: BoardProps) {
  return <div className="pp-tray" aria-hidden="true" />;
}
