import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ExerciseEvent, ExerciseState } from "../engine/session";
import { OBJECT_NAMES, numberWord } from "../audio/voiceLines";
import { layoutObjects } from "./layout";
import { IconCheck } from "../ui/icons";

/**
 * Interaction boards (rendering only). Each receives the pure exercise state and emits engine events.
 * Adding an interaction type = add a board here + a validator/feedback branch in src/engine.
 */
export interface BoardProps {
  st: ExerciseState;
  act: (e: ExerciseEvent) => void;
  /** Count-along hint: objects with order index <= alongIndex show their number. -1 = inactive. */
  alongIndex: number;
  ObjectArt: (p: { kind: string }) => React.JSX.Element;
  Basket: () => React.JSX.Element;
}

const nameOf = (kind: string, n = 1) => (n === 1 ? OBJECT_NAMES[kind]?.one : OBJECT_NAMES[kind]?.many) ?? "snack";

/** Measures the play field's width/height ratio so object layout adapts to phones, tablets and desktops. */
function useAspect<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [aspect, setAspect] = useState(1.6);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setAspect(Math.round((r.width / r.height) * 10) / 10);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, aspect];
}

const gridVars = (cols: number, rows: number) => ({ "--cols": cols, "--rows": rows }) as React.CSSProperties;

function Badge({ n, pulse }: { n: number; pulse?: boolean }) {
  return <span className={`badge ${pulse ? "pulse" : ""}`} aria-hidden="true">{n}</span>;
}

/** tap-count and choose-count share the picnic-blanket field. */
export function CountField({ st, act, alongIndex, ObjectArt }: BoardProps) {
  const ex = st.exercise;
  const interactive = ex.interaction === "tap-count";
  const [fieldRef, aspect] = useAspect<HTMLDivElement>();
  const { positions, cols, rows } = useMemo(() => layoutObjects(ex.target, ex.layout ?? "scatter", ex.seed, aspect), [ex, aspect]);
  const [wiggle, setWiggle] = useState<number | null>(null);

  // Count-along order: the child's own tapping order if they counted, else left-to-right reading order.
  const order = useMemo(() => {
    if (interactive && st.tapped.length === ex.target) return st.tapped;
    return positions.map((p, i) => ({ i, p })).sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x).map((o) => o.i);
  }, [interactive, st.tapped, ex.target, positions]);

  const lastTapped = st.tapped[st.tapped.length - 1];
  const highlightLast = st.activeHints.includes("highlight-last-count") && st.phase !== "feedback";

  return (
    <div className={`blanket layout-${ex.layout ?? "scatter"}`} ref={fieldRef} style={gridVars(cols, rows)}>
      {ex.layout === "ten-frame" && (
        <div className="ten-frame" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} />)}</div>
      )}
      <div className="field" role="list" aria-label={`${nameOf(ex.objectKind, 2)} on the blanket`}>
        {positions.map((p, i) => {
          const tappedAt = st.tapped.indexOf(i);
          const alongAt = alongIndex >= 0 ? order.indexOf(i) : -1;
          const showAlong = alongAt >= 0 && alongAt <= alongIndex;
          const badgeN = showAlong ? alongAt + 1 : tappedAt >= 0 ? tappedAt + 1 : null;
          const style = { left: `${p.x}%`, top: `${p.y}%`, "--r": `${p.r}deg`, animationDelay: `${i * 60}ms` } as React.CSSProperties;
          const cls = `snack ${tappedAt >= 0 ? "counted" : ""} ${showAlong && alongAt === alongIndex ? "along-now" : ""} ${wiggle === i ? "wiggle" : ""}`;
          const inner = (
            <>
              <ObjectArt kind={ex.objectKind} />
              {badgeN !== null && <Badge n={badgeN} pulse={highlightLast && i === lastTapped} />}
            </>
          );
          if (!interactive) {
            return <span key={i} role="listitem" aria-label={nameOf(ex.objectKind)} className={cls} style={style} data-testid="count-object">{inner}</span>;
          }
          return (
            <span key={i} role="listitem" className="snack-cell" style={style}>
              <button
                type="button"
                className={cls}
                data-testid="count-object"
                data-counted={tappedAt >= 0 ? "true" : "false"}
                aria-label={tappedAt >= 0 ? `${nameOf(ex.objectKind)}, counted ${numberWord(tappedAt + 1)}` : `${nameOf(ex.objectKind)}, not counted yet`}
                onClick={() => {
                  if (tappedAt >= 0) {
                    setWiggle(i);
                    window.setTimeout(() => setWiggle(null), 450);
                  }
                  act({ type: "TAP_OBJECT", index: i });
                }}
              >
                {inner}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Dot pattern under each numeral: a second, non-symbolic representation of the number. */
function Dots({ n }: { n: number }) {
  return (
    <span className="dots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <i key={i} />)}
    </span>
  );
}

export function ChoiceTray({ st, act }: Pick<BoardProps, "st" | "act">) {
  const ex = st.exercise;
  const visible = st.phase !== "counting";
  if (!visible) return <div className="choice-tray placeholder" aria-hidden="true" />;
  const fb = st.feedback;
  return (
    <div className="choice-tray" role="group" aria-label="How many? Choose a number">
      {(ex.choices ?? []).map((c, i) => {
        const disabled = st.disabledChoices.includes(c) || st.phase !== "answering";
        const isModel = st.modelChoice === c && st.phase === "answering";
        const state =
          st.phase === "feedback" && st.lastChoice === c ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" && c === ex.target ? "is-right" : "";
        return (
          <button
            key={c}
            type="button"
            className={`choice ${state} ${isModel ? "is-model" : ""} ${st.disabledChoices.includes(c) ? "is-out" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
            data-testid="choice"
            data-value={c}
            aria-label={numberWord(c)}
            aria-disabled={disabled}
            onClick={() => !disabled && act({ type: "CHOOSE", value: c })}
          >
            <span className="numeral">{c}</span>
            <Dots n={c} />
          </button>
        );
      })}
    </div>
  );
}

interface Drag {
  index: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  active: boolean;
}

export function MakeSetBoard({ st, act, alongIndex, ObjectArt, Basket }: BoardProps) {
  // alongIndex highlights the basket item being counted during a modelled answer
  const ex = st.exercise;
  const pool = ex.poolSize ?? ex.target;
  const [pileRef, aspect] = useAspect<HTMLDivElement>();
  const { positions, cols, rows } = useMemo(() => layoutObjects(pool, "scatter", ex.seed, aspect), [pool, ex.seed, aspect]);
  const basketRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [hot, setHot] = useState(false);
  const showSlots = st.activeHints.includes("show-slots");
  const canAct = st.phase === "answering";

  const overBasket = (x: number, y: number) => {
    const r = basketRef.current?.getBoundingClientRect();
    return !!r && x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 30 && y <= r.bottom + 20;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setHot(overBasket(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d?.active) {
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 50);
        if (overBasket(e.clientX, e.clientY)) act({ type: "ADD_TO_BASKET", index: d.index });
      }
      dragRef.current = null;
      setDrag(null);
      setHot(false);
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

  return (
    <div className="make-set">
      <div className="blanket pile" ref={pileRef} style={gridVars(cols, rows)}>
        <div className="field" role="list" aria-label={`${nameOf(ex.objectKind, 2)} to share`}>
          {positions.map((p, i) => {
            if (st.basket.includes(i)) return null;
            const lifted = drag?.active && drag.index === i;
            return (
              <span key={i} role="listitem" className="snack-cell" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <button
                  type="button"
                  className={`snack draggable ${lifted ? "lifted" : ""}`}
                  style={{ "--r": `${p.r}deg` } as React.CSSProperties}
                  data-testid="pile-object"
                  aria-label={`${nameOf(ex.objectKind)}. Press to put in the basket`}
                  aria-disabled={!canAct}
                  onPointerDown={(e) => {
                    if (!canAct || e.button !== 0) return;
                    const d0 = { index: i, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false };
                    dragRef.current = d0;
                    setDrag(d0);
                  }}
                  onClick={() => {
                    if (suppressClick.current || !canAct) return;
                    act({ type: "ADD_TO_BASKET", index: i });
                  }}
                >
                  <ObjectArt kind={ex.objectKind} />
                </button>
              </span>
            );
          })}
        </div>
      </div>
      <div className={`basket ${hot ? "hot" : ""}`} ref={basketRef} data-testid="basket" aria-label={`Bobbo's basket`} role="group">
        <Basket />
        <div className="basket-slots" role="list" aria-label="In the basket">
          {showSlots && Array.from({ length: ex.target }, (_, i) => <span key={`s${i}`} className="slot" style={{ gridArea: `${Math.floor(i / 5) + 1} / ${(i % 5) + 1}` }} aria-hidden="true" />)}
          {st.basket.map((idx, order) => (
            <span key={idx} role="listitem" className="basket-cell" style={{ gridArea: `${Math.floor(order / 5) + 1} / ${(order % 5) + 1}` }}>
              <button
                type="button"
                className="snack in-basket"
                data-testid="basket-object"
                aria-label={`${nameOf(ex.objectKind)} in the basket. Press to take it out`}
                aria-disabled={!canAct}
                onClick={() => canAct && act({ type: "REMOVE_FROM_BASKET", index: idx })}
              >
                <ObjectArt kind={ex.objectKind} />
                {/* running count as items go in (and during the modelled answer) */}
                <Badge n={order + 1} pulse={alongIndex === order} />
              </button>
            </span>
          ))}
        </div>
      </div>
      {drag?.active && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <ObjectArt kind={ex.objectKind} />
        </div>
      )}
    </div>
  );
}

export function DoneButton({ st, act }: Pick<BoardProps, "st" | "act">) {
  const enabled = st.phase === "answering" && st.basket.length > 0;
  return (
    <div className="choice-tray">
      <button
        type="button"
        className={`done-btn ${st.activeHints.includes("model-answer") && st.phase === "answering" ? "is-model" : ""} ${st.phase === "solved" || (st.phase === "feedback" && st.feedback?.correct) ? "is-right" : ""}`}
        data-testid="done"
        aria-label="Check my basket"
        aria-disabled={!enabled}
        onClick={() => enabled && act({ type: "SUBMIT_SET" })}
      >
        <IconCheck />
      </button>
    </div>
  );
}
