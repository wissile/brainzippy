import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { AnswerOption, AnswerValue, Exercise } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { IconCheck, IconHand } from "../../ui/icons";
import { GateArt, GloopShape, JellyShape, OutlineArt, PieceArt } from "./art";
import { gloopSpec, modeOf, modelGroups, outlineCount, outlineOf } from "./generator";
import {
  OUTLINE_INFO, describePiece, describeShape, fits, isFull, parsePiece, parseShape, sidesOf, usedCells,
  type PieceKind, type PieceSpec,
} from "./shapes";
import { hostStore, squishStore } from "./store";
import "./shape-squish.css";

/**
 * Shape Squish play board. Five modes share one drag system (pointer drag, tap / tap-tap, keyboard Enter):
 *   gate — drag Gloop (squished into a shape) to the gate with the same shape (choice; tapping a gate also works)
 *   find — put every target shape in the jelly jar, then Squish (set)
 *   sort — sort shapes into the "3 sides" / "4 sides" jars, then Squish (match)
 *   fill / two — fill one or two outline gates with pieces, then Squish (set). Pieces only snap in when they fit,
 *          so the outline always shows a real tiling (see shapes.ts packOutline).
 * Hints: first miss → numbered sides / corner dots / the gap is shown; second miss → the modelled answer is built
 * step by step (alongIndex) and the child presses the glowing control.
 */

// ---------------------------------------------------------------- shared helpers

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
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

/** Largest square cell for `n` items in a w×h zone (cells never below the 64 px child tap target). */
export function gridFor(n: number, w: number, h: number, max = 150, gap = 10): { cols: number; cell: number } {
  let best = { cols: 1, cell: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const cell = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, max);
    if (cell >= best.cell - 0.5) best = { cols, cell }; // ties prefer the wider layout
  }
  return { cols: best.cols, cell: Math.max(64, Math.floor(best.cell)) };
}

interface Drag {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  active: boolean;
}

const dropAt = (x: number, y: number): string | null =>
  (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-ss-drop]")?.dataset.ssDrop ?? null;

/** Pointer drag shared by every mode. Clicks right after a drag are ignored (event timestamps). */
function useDrag(canAct: boolean, onDrop: (id: string, target: string | null, at: { x: number; y: number }) => void, busy?: () => void) {
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
        dropRef.current(d.id, dropAt(e.clientX, e.clientY), { x: e.clientX, y: e.clientY });
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

const Ghost = ({ drag, children, size }: { drag: Drag | null; children: React.ReactNode; size: number }) =>
  drag ? (
    <div className="ss-ghost" style={{ left: drag.x, top: drag.y, width: size, height: size }} aria-hidden="true">
      {children}
    </div>
  ) : null;

const focusSel = (root: HTMLElement | null, sel: string) => (root?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });

/** Publish what Squish would submit (null = nothing to check yet). */
function usePublish(exId: string, value: AnswerValue | null) {
  const key = JSON.stringify(value);
  useEffect(() => {
    squishStore.set({ exId, value });
  }, [exId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => squishStore.set({ exId: "", value: null }), []);
}

/** After a wrong Squish: run `prune(parts)` once when the board is back in "answering". */
function useAfterMiss(st: BoardProps["st"], prune: (parts: Readonly<Record<string, boolean>>) => void) {
  const seen = useRef(0);
  useEffect(() => {
    const fb = st.feedback;
    if (st.phase !== "answering" || !fb || fb.correct || seen.current === fb.seq) return;
    seen.current = fb.seq;
    prune(st.check?.parts ?? {});
  }, [st.phase, st.feedback?.seq]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Items revealed so far by the modelled answer: all of them once the step-through has finished. */
const modelSlice = <T,>(items: readonly T[], alongIndex: number, phase: string) => (phase === "feedback" && alongIndex >= 0 ? items.slice(0, alongIndex + 1) : phase === "feedback" ? [] : items);

const shapeOf = (o: AnswerOption) => parseShape(o.art ?? "") ?? parseShape("circle~0~100~90~0")!;
const pieceOf = (o: AnswerOption) => parsePiece(o.art ?? "") ?? { kind: "c-tri" as PieceKind, rot: 0, color: 0 };

// ---------------------------------------------------------------- board entry

export function SquishBoard(props: BoardProps) {
  const mode = modeOf(props.st.exercise);
  if (mode === "gate") return <GateBoard {...props} />;
  if (mode === "find") return <FindBoard {...props} />;
  if (mode === "sort") return <SortBoard {...props} />;
  return <ComposeBoard {...props} />;
}

function useCommon(st: BoardProps["st"]) {
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering";
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrong = st.phase === "feedback" && st.feedback?.correct === false;
  const locked = st.model !== null; // modelled answer showing: only the glowing control is live
  return { reducedMotion, canAct, celebrate, wrong, locked };
}

// ---------------------------------------------------------------- gate mode (choice)

function GateBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "choice") throw new Error("gate mode needs a choice answer");
  const options = ex.answer.options;
  const { reducedMotion, canAct, celebrate, wrong } = useCommon(st);
  const gloop = useMemo(() => gloopSpec(ex), [ex]);
  const rootRef = useRef<HTMLDivElement>(null);
  const gloopRef = useRef<HTMLButtonElement>(null);
  const [srcRef, src] = useSize<HTMLDivElement>();
  const [dstRef, dst] = useSize<HTMLDivElement>();
  const grid = gridFor(options.length, dst.w, dst.h, 190, 14);
  const gloopSize = Math.max(96, Math.min(src.w, src.h, 210));
  const [selected, setSelected] = useState(false);
  const [fly, setFly] = useState<{ id: string; tx: number; ty: number; fx: number; fy: number } | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    hostStore.set(true);
    return () => hostStore.set(false);
  }, []);

  const submit = (id: string, from?: { x: number; y: number }) => {
    if (!canAct || st.eliminated.includes(id)) return;
    setTouched(true);
    setSelected(false);
    const g = gloopRef.current?.getBoundingClientRect();
    const t = rootRef.current?.querySelector(`[data-ss-drop="gate:${id}"]`)?.getBoundingClientRect();
    if (g && t) {
      const gx = g.left + g.width / 2;
      const gy = g.top + g.height / 2;
      setFly({ id, tx: t.left + t.width / 2 - gx, ty: t.top + t.height / 2 - gy, fx: from ? from.x - gx : 0, fy: from ? from.y - gy : 0 });
    }
    act({ type: "SUBMIT", value: id });
  };
  const { drag, hot, start, ignoreClick } = useDrag(canAct, (_id, target, at) => {
    if (target?.startsWith("gate:")) submit(target.slice(5), at);
  }, busy);
  // back to answering after a miss: Gloop bounces home
  useEffect(() => {
    if (st.phase === "answering") setFly(null);
  }, [st.phase]);

  const modelId = typeof st.model === "string" ? st.model : null;
  const showing = (id: string) => modelId === id && (st.phase === "answering" || alongIndex >= 0);
  const sides = sidesOf(gloop);
  const traceAll = Math.max(1, sides);
  const trace = alongIndex >= 0 && modelId ? Math.min(traceAll, alongIndex + 1) : st.hintStage >= 1 ? traceAll : 0;
  const gloopState = celebrate ? "celebrating" : wrong ? "retry" : selected || drag ? "greeting" : "idle";
  const flyCls = fly ? (celebrate ? "fly-ok" : wrong ? "fly-no" : "") : "";

  // tutorial: a hand drags a ghost Gloop to the right gate until the child acts
  const [demo, setDemo] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const showDemo = !!ex.tutorial && !touched && canAct && !selected && !drag;
  useEffect(() => {
    if (!showDemo) return setDemo(null);
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const a = gloopRef.current?.getBoundingClientRect();
      const b = rootRef.current?.querySelector(`[data-ss-drop="gate:${ex.answer.kind === "choice" ? ex.answer.correct : ""}"]`)?.getBoundingClientRect();
      if (!root || !a || !b) return;
      setDemo({ x: a.left - root.left + a.width / 2, y: a.top - root.top + a.height / 2, tx: b.left - root.left + b.width / 2, ty: b.top - root.top + b.height / 2 });
    };
    const t = window.setTimeout(measure, 2600);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [showDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={rootRef} className={`ss-board mode-gate ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ss-board" data-mode="gate" data-gloop={gloop.kind}>
      <div className="ss-layout">
        <div className="ss-src" ref={srcRef}>
          <div className="ss-pad" aria-hidden="true" />
          <button
            ref={gloopRef}
            type="button"
            className={`ss-gloop-btn ${selected ? "lifted" : ""} ${drag ? "ghosted" : ""} ${flyCls}`}
            style={{ width: gloopSize, height: gloopSize, "--tx": `${fly?.tx ?? 0}px`, "--ty": `${fly?.ty ?? 0}px`, "--fx": `${fly?.fx ?? 0}px`, "--fy": `${fly?.fy ?? 0}px` } as React.CSSProperties}
            data-testid="gloop"
            data-ss-drag="gloop"
            data-ss-idle=""
            aria-pressed={selected}
            aria-disabled={!canAct}
            aria-label={selected ? "Gloop picked up. Now choose a gate" : `Gloop, squished into ${describeShape(gloop)}. Press to pick Gloop up`}
            onPointerDown={(e) => start(e, "gloop")}
            onClick={(e) => {
              if (ignoreClick(e) || !canAct) return;
              busy?.();
              setTouched(true);
              setSelected((s) => !s);
              audio.play("pickup", { gain: 0.5 });
              if (e.detail === 0) focusSel(rootRef.current, '[data-testid="choice"]:not([aria-disabled="true"])');
            }}
          >
            <GloopShape spec={gloop} state={gloopState} trace={trace} />
          </button>
        </div>
        <div className="ss-dst" ref={dstRef}>
          <div className="ss-hedge" role="group" aria-label="Garden gates" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
            {options.map((o, i) => {
              const spec = shapeOf(o);
              const out = st.eliminated.includes(o.id);
              const right = celebrate && o.id === (ex.answer.kind === "choice" ? ex.answer.correct : "");
              const isWrong = wrong && st.lastAnswer === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`ss-gate choice-like ${out ? "is-out" : ""} ${right ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${showing(o.id) ? "is-model" : ""} ${hot === `gate:${o.id}` || (selected && !out) ? "hot" : ""}`}
                  style={{ width: grid.cell, height: grid.cell }}
                  data-testid="choice"
                  data-value={o.id}
                  data-shape={spec.kind}
                  data-ss-drop={`gate:${o.id}`}
                  aria-disabled={!canAct || out}
                  aria-label={`Gate ${i + 1}: a hole that is ${describeShape(spec)}. Press to squish Gloop through`}
                  onClick={(e) => {
                    if (ignoreClick(e)) return;
                    submit(o.id);
                  }}
                >
                  <GateArt spec={spec} open={right} trace={showing(o.id) ? trace : 0} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Ghost drag={drag} size={gloopSize * 0.8}><GloopShape spec={gloop} state="greeting" /></Ghost>
      {demo && showDemo && (
        <div className={`ss-demo ${reducedMotion ? "still" : ""}`} aria-hidden="true" data-testid="drag-demo" style={{ left: demo.x, top: demo.y, "--dx": `${demo.tx - demo.x}px`, "--dy": `${demo.ty - demo.y}px` } as React.CSSProperties}>
          <span className="ss-demo-thing"><GloopShape spec={gloop} /></span>
          <span className="ss-demo-hand"><IconHand /></span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- find mode (set)

function FindBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "set") throw new Error("find mode needs a set answer");
  const options = ex.answer.options;
  const { reducedMotion, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [srcRef, src] = useSize<HTMLDivElement>();
  const [jarRef, jar] = useSize<HTMLDivElement>();
  const grid = gridFor(options.length, src.w, src.h, 150, 10);
  const jarGrid = gridFor(Math.max(3, options.length), jar.w - 20, jar.h - 20, 110, 6);
  const [inJar, setInJar] = useState<string[]>([]);
  const model = Array.isArray(st.model) ? (st.model as string[]) : null;
  const shown = model ? modelSlice(model, alongIndex, st.phase) : inJar;
  const act2 = canAct && !locked;

  const put = (id: string, keyboard = false) => {
    if (!act2 || st.eliminated.includes(id) || inJar.includes(id)) return;
    busy?.();
    setInJar((j) => [...j, id]);
    audio.play("drop", { gain: 0.6 });
    if (keyboard) window.setTimeout(() => focusSel(rootRef.current, '.ss-src [data-testid="shape"]:not([aria-disabled="true"])'), 0);
  };
  const takeOut = (id: string) => {
    if (!act2) return;
    busy?.();
    setInJar((j) => j.filter((x) => x !== id));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target === "pot") put(id);
    else if (target === "src" && inJar.includes(id)) takeOut(id);
  }, busy);
  useAfterMiss(st, (parts) => setInJar((j) => j.filter((id) => parts[id] === true && !st.eliminated.includes(id))));
  usePublish(ex.id, model ? model : inJar.length ? inJar : null);

  const target = String(ex.prompt?.vars?.shape ?? "shape");
  const traceOf = (id: string) => (model && shown.includes(id) ? sidesOf(shapeOf(options.find((o) => o.id === id)!)) : 0);
  const dragged = drag ? options.find((o) => o.id === drag.id) : undefined;
  return (
    <div ref={rootRef} className={`ss-board mode-find ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ss-board" data-mode="find" data-target={target}>
      <div className="ss-layout">
        <div className={`ss-src ${hot === "src" ? "hot" : ""}`} ref={srcRef} data-ss-drop="src">
          <div className="ss-grid" role="group" aria-label="Jelly shapes" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
            {options.map((o, i) => {
              const spec = shapeOf(o);
              const out = st.eliminated.includes(o.id);
              if (shown.includes(o.id)) return <span key={o.id} className="ss-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`ss-item ${out ? "is-out" : ""} ${drag?.id === o.id ? "ghosted" : ""}`}
                  style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 60}ms` }}
                  data-testid="shape"
                  data-value={o.id}
                  data-shape={spec.kind}
                  data-ss-drag={o.id}
                  aria-disabled={!act2 || out}
                  aria-label={`Shape ${i + 1}: ${describeShape(spec)}. Press to put it in the jar`}
                  onPointerDown={(e) => !out && start(e, o.id)}
                  onClick={(e) => !ignoreClick(e) && put(o.id, e.detail === 0)}
                >
                  <JellyShape spec={spec} corners={st.hintStage >= 1 && !out} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="ss-dst">
          <div ref={jarRef} className={`ss-jar ${hot === "pot" || drag ? "hot" : ""} ${celebrate ? "glow" : ""}`} data-ss-drop="pot" data-ss-idle="" data-testid="jar" role="group" aria-label={`Jelly jar for every ${target}: ${shown.length} inside`}>
            <span className="ss-jar-label" aria-hidden="true"><span className="ss-jar-icon"><JellyShape spec={parseShape(target === "square" ? "square~0~100~90~1" : "tri-eq~0~100~96~1")!} /></span></span>
            <div className="ss-jar-grid" style={{ gridTemplateColumns: `repeat(${jarGrid.cols}, ${Math.min(jarGrid.cell, 110)}px)` }}>
              {shown.map((id) => {
                const o = options.find((x) => x.id === id);
                if (!o) return null;
                const ok = st.hintStage >= 1 && st.check?.parts?.[id] === true;
                const isWrong = wrong && st.check?.parts?.[id] === false;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ss-item in-jar ${ok ? "is-ok" : ""} ${isWrong ? "is-wrong" : ""} ${model ? "is-model" : ""} ${celebrate ? "is-right" : ""}`}
                    style={{ width: Math.min(jarGrid.cell, 110), height: Math.min(jarGrid.cell, 110) }}
                    data-testid="in-jar"
                    data-value={id}
                    data-ss-drag={id}
                    aria-disabled={!act2}
                    aria-label={`${describeShape(shapeOf(o))}, in the jar. Press to take it out`}
                    onPointerDown={(e) => start(e, id)}
                    onClick={(e) => !ignoreClick(e) && takeOut(id)}
                  >
                    <JellyShape spec={shapeOf(o)} trace={traceOf(id)} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{shown.length} in the jar.</p>
      <Ghost drag={drag} size={grid.cell}>{dragged && <JellyShape spec={shapeOf(dragged)} />}</Ghost>
    </div>
  );
}

// ---------------------------------------------------------------- sort mode (match)

function SortBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "match") throw new Error("sort mode needs a match answer");
  const { items, targets } = ex.answer;
  const { reducedMotion, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [srcRef, src] = useSize<HTMLDivElement>();
  const [binRef, bin] = useSize<HTMLDivElement>();
  const grid = gridFor(items.length, src.w, src.h, 140, 10);
  const binW = (bin.w - 18) / targets.length - 20;
  const binGrid = gridFor(Math.max(2, items.length - 2), binW, bin.h - 84, 96, 4);
  const binCell = Math.min(binGrid.cell, 96);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [okLocked, setOkLocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const model = st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
  const shownAssign: Record<string, string> = model ? Object.fromEntries(modelSlice(items.map((it) => it.id), alongIndex, st.phase).map((id) => [id, model[id]!])) : assign;
  const act2 = canAct && !locked;

  const place = (id: string, t: string, keyboard = false) => {
    if (!act2 || okLocked.includes(id)) return;
    busy?.();
    setAssign((a) => ({ ...a, [id]: t }));
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    if (keyboard) window.setTimeout(() => focusSel(rootRef.current, '.ss-src [data-testid="shape"]:not([aria-disabled="true"])'), 0);
  };
  const unplace = (id: string) => {
    if (!act2 || okLocked.includes(id)) return;
    busy?.();
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== id)));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target?.startsWith("bin:")) place(id, target.slice(4));
    else if (target === "src") unplace(id);
  }, busy);
  useAfterMiss(st, (parts) => {
    const keep = Object.keys(parts).filter((id) => parts[id]);
    setOkLocked(keep);
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => parts[k])));
  });
  const complete = items.every((it) => shownAssign[it.id] !== undefined);
  usePublish(ex.id, model ? model : complete ? assign : null);

  const sidesOfTarget = (t: string) => (t === "t3" ? 3 : 4);
  const dragged = drag ? items.find((o) => o.id === drag.id) : undefined;
  return (
    <div ref={rootRef} className={`ss-board mode-sort ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ss-board" data-mode="sort">
      <div className="ss-layout">
        <div className={`ss-src ${hot === "src" ? "hot" : ""}`} ref={srcRef} data-ss-drop="src">
          <div className="ss-grid" role="group" aria-label="Shapes to sort" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
            {items.map((o, i) => {
              const spec = shapeOf(o);
              if (shownAssign[o.id]) return <span key={o.id} className="ss-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`ss-item ${selected === o.id ? "lifted" : ""} ${drag?.id === o.id ? "ghosted" : ""}`}
                  style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 60}ms` }}
                  data-testid="shape"
                  data-value={o.id}
                  data-sides={sidesOf(spec)}
                  data-ss-drag={o.id}
                  aria-pressed={selected === o.id}
                  aria-disabled={!act2}
                  aria-label={selected === o.id ? "Shape picked up. Now choose a jar" : `Shape ${i + 1}: ${describeShape(spec)}. Press to pick it up`}
                  onPointerDown={(e) => start(e, o.id)}
                  onClick={(e) => {
                    if (ignoreClick(e) || !act2) return;
                    busy?.();
                    setSelected((s) => (s === o.id ? null : o.id));
                    audio.play("pickup", { gain: 0.5 });
                    if (e.detail === 0) focusSel(rootRef.current, '[data-testid="bin"]');
                  }}
                >
                  <JellyShape spec={spec} trace={st.hintStage >= 1 ? sidesOf(spec) : 0} corners={st.hintStage >= 1} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="ss-dst ss-bins" ref={binRef}>
          {targets.map((t) => {
            const inside = items.filter((it) => shownAssign[it.id] === t.id);
            const n = sidesOfTarget(t.id);
            return (
              <div key={t.id} className={`ss-jar ss-bin ${hot === `bin:${t.id}` || (selected && !locked) ? "hot" : ""} ${celebrate ? "glow" : ""}`} data-ss-drop={`bin:${t.id}`} {...(t.id === "t3" ? { "data-ss-idle": "" } : {})}>
                <button
                  type="button"
                  className="ss-bin-lid"
                  data-testid="bin"
                  data-value={t.id}
                  data-sides={n}
                  aria-disabled={!act2 || selected === null}
                  aria-label={`Jar for shapes with ${n} sides, ${inside.length} inside.${selected ? " Press to put the shape here" : ""}`}
                  onClick={() => selected && place(selected, t.id, true)}
                >
                  <span className="ss-bin-num">{n}</span>
                  <span className="ss-bin-word">sides</span>
                  <span className="ss-tally" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
                </button>
                <div className="ss-jar-grid" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.floor((binW + 4) / (binCell + 4)))}, ${binCell}px)` }}>
                  {inside.map((it, j) => {
                    const ok = okLocked.includes(it.id);
                    const cols = Math.max(1, Math.floor((binW + 4) / (binCell + 4)));
                    const rows = Math.ceil(inside.length / cols);
                    const over = rows > 1 ? Math.max(0, (rows * (binCell + 4) - (bin.h - 80)) / (rows - 1)) : 0;
                    const isWrong = wrong && st.check?.parts?.[it.id] === false;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        className={`ss-item in-jar ${ok ? "is-ok" : ""} ${isWrong ? "is-wrong" : ""} ${model ? "is-model" : ""}`}
                        style={{ width: binCell, height: binCell, marginTop: j >= cols ? -Math.min(over, binCell * 0.3) : 0 }}
                        data-testid="sorted"
                        data-value={it.id}
                        tabIndex={selected ? -1 : 0}
                        data-ss-drag={it.id}
                        aria-disabled={!act2 || ok}
                        aria-label={`${describeShape(shapeOf(it))}, in the ${n} sides jar.${ok ? "" : " Press to take it out"}`}
                        onPointerDown={(e) => !ok && start(e, it.id)}
                        onClick={(e) => !ignoreClick(e) && unplace(it.id)}
                      >
                        <JellyShape spec={shapeOf(it)} trace={model ? sidesOf(shapeOf(it)) : 0} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{targets.map((t) => `${items.filter((it) => shownAssign[it.id] === t.id).length} in the ${sidesOfTarget(t.id)} sides jar.`).join(" ")}</p>
      <Ghost drag={drag} size={grid.cell}>{dragged && <JellyShape spec={shapeOf(dragged)} />}</Ghost>
    </div>
  );
}

// ---------------------------------------------------------------- compose modes (set of pieces)

function ComposeBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "set") throw new Error("compose mode needs a set answer");
  const options = ex.answer.options;
  const outline = outlineOf(ex);
  const count = outlineCount(ex);
  const { reducedMotion, canAct, celebrate, wrong, locked } = useCommon(st);
  const { speaking } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const [srcRef, src] = useSize<HTMLDivElement>();
  const [dstRef, dst] = useSize<HTMLDivElement>();
  const grid = gridFor(options.length, src.w, src.h, 180, 8);
  const vertical = dst.h > dst.w * 1.15 && count === 2;
  const oSize = Math.max(120, Math.floor(Math.min(vertical ? dst.w : (dst.w - 16 * (count - 1)) / count, vertical ? (dst.h - 16) / 2 : dst.h, 340)));
  // one scale for tray pieces and outlines, so a piece looks exactly as big as the part of the gate it fills
  const k = Math.min(grid.cell / 152, oSize / 148);
  const oDraw = Math.max(96, Math.floor(148 * k));
  const pDraw = Math.floor(152 * k);
  const specs = useMemo(() => Object.fromEntries(options.map((o) => [o.id, pieceOf(o)])) as Record<string, PieceSpec>, [options]);
  const kindOf = (id: string) => specs[id]!.kind;
  const [boxes, setBoxes] = useState<string[][]>(() => Array.from({ length: count }, () => []));
  const [selected, setSelected] = useState<string | null>(null);
  const [bounce, setBounce] = useState<{ id: string; n: number } | null>(null);
  const model = Array.isArray(st.model) ? (st.model as string[]) : null;
  const groups = useMemo(() => modelGroups(ex, kindOf), [ex]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownBoxes = model
    ? (() => {
        const order = groups.flat();
        const visible = new Set(modelSlice(order, alongIndex, st.phase));
        return groups.map((g) => g.filter((id) => visible.has(id)));
      })()
    : boxes;
  const placed = shownBoxes.flat();
  const act2 = canAct && !locked;
  const lastNoFit = useRef(0);

  const tryPlace = (id: string, o: number, keyboard = false) => {
    if (!act2 || st.eliminated.includes(id) || placed.includes(id)) return;
    busy?.();
    setSelected(null);
    const inside = boxes[o]!.map(kindOf);
    if (!fits(outline, inside, kindOf(id))) {
      setBounce((b) => ({ id, n: (b?.n ?? 0) + 1 }));
      audio.play("retry", { gain: 0.35 });
      if (Date.now() - lastNoFit.current > 6000 && !speaking) {
        lastNoFit.current = Date.now();
        void audio.speak("ss.nofit");
      }
      return;
    }
    const next = boxes.map((b, i) => (i === o ? [...b, id] : b));
    setBoxes(next);
    audio.play("drop", { gain: 0.6 });
    if (next.every((b) => isFull(outline, b.map(kindOf)))) {
      audio.play("star", { gain: 0.5 });
      if (!speaking) void audio.speak("ss.full");
    }
    if (keyboard) window.setTimeout(() => focusSel(rootRef.current, '.ss-src [data-testid="piece"]:not([aria-disabled="true"])'), 0);
  };
  const takeLast = (o: number) => {
    if (!act2 || boxes[o]!.length === 0) return;
    busy?.();
    setBoxes((bs) => bs.map((b, i) => (i === o ? b.slice(0, -1) : b)));
    audio.play("pickup", { gain: 0.5 });
  };
  const takeOut = (id: string) => {
    if (!act2) return;
    busy?.();
    setBoxes((bs) => bs.map((b) => b.filter((x) => x !== id)));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target?.startsWith("outline:")) tryPlace(id, Number(target.slice(8)));
    else if (target === "src" && placed.includes(id)) takeOut(id);
  }, busy);
  useAfterMiss(st, (parts) => setBoxes((bs) => bs.map((b) => b.filter((id) => parts[id] === true && !st.eliminated.includes(id)))));
  usePublish(ex.id, model ? model : placed.length ? placed : null);

  const onPiece = (e: React.MouseEvent, id: string) => {
    if (ignoreClick(e) || !act2 || st.eliminated.includes(id)) return;
    if (count === 1) return tryPlace(id, 0, e.detail === 0);
    busy?.();
    setSelected((s) => (s === id ? null : id));
    audio.play("pickup", { gain: 0.5 });
    if (e.detail === 0) focusSel(rootRef.current, '[data-testid="outline"]');
  };
  const dragged = drag ? specs[drag.id] : undefined;
  const label = (o: number) => {
    const used = usedCells(shownBoxes[o]!.map(kindOf));
    const total = OUTLINE_INFO[outline].cells;
    const name = count === 2 ? `${outline} gate ${o + 1}` : `${outline} gate`;
    const state = used === 0 ? "empty" : used === total ? "full, no gaps" : `${shownBoxes[o]!.length} ${shownBoxes[o]!.length === 1 ? "piece" : "pieces"}, with a gap`;
    const action = selected ? "Press to put the piece here" : used > 0 ? "Press to take the last piece out" : "";
    return `${name[0]!.toUpperCase()}${name.slice(1)}: ${state}. ${action}`;
  };
  return (
    <div ref={rootRef} className={`ss-board mode-compose outlines-${count} ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ss-board" data-mode={count === 2 ? "two" : "fill"} data-outline={outline}>
      <div className="ss-layout">
        <div className={`ss-src ${hot === "src" ? "hot" : ""}`} ref={srcRef} data-ss-drop="src">
          <div className="ss-grid" role="group" aria-label="Jelly pieces" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
            {options.map((o, i) => {
              const spec = specs[o.id]!;
              const out = st.eliminated.includes(o.id);
              if (placed.includes(o.id)) return <span key={o.id} className="ss-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
              return (
                <button
                  key={`${o.id}-${bounce?.id === o.id ? bounce.n : 0}`}
                  type="button"
                  className={`ss-item ss-piece ${out ? "is-out" : ""} ${selected === o.id ? "lifted" : ""} ${drag?.id === o.id ? "ghosted" : ""} ${bounce?.id === o.id ? "nofit" : ""}`}
                  style={{ width: grid.cell, height: grid.cell, animationDelay: bounce?.id === o.id ? "0ms" : `${i * 60}ms` }}
                  data-testid="piece"
                  data-value={o.id}
                  data-kind={spec.kind}
                  data-ss-drag={o.id}
                  aria-pressed={count === 2 ? selected === o.id : undefined}
                  aria-disabled={!act2 || out}
                  aria-label={selected === o.id ? "Piece picked up. Now choose a gate" : `Piece ${i + 1}: ${describePiece(spec)}. Press to ${count === 1 ? "put it in the gate" : "pick it up"}`}
                  onPointerDown={(e) => !out && start(e, o.id)}
                  onClick={(e) => onPiece(e, o.id)}
                >
                  <span className="ss-piece-in" style={{ width: pDraw, height: pDraw }}><PieceArt spec={spec} /></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={`ss-dst ss-outlines ${vertical ? "vertical" : ""}`} ref={dstRef}>
          {shownBoxes.map((b, o) => (
            <button
              key={o}
              type="button"
              className={`ss-outline ${hot === `outline:${o}` || (selected && !locked) ? "hot" : ""} ${celebrate ? "is-right" : ""} ${model && st.phase === "answering" ? "is-model" : ""}`}
              style={{ width: oDraw, height: oDraw }}
              data-testid="outline"
              data-value={o}
              data-used={usedCells(b.map(kindOf))}
              data-ss-drop={`outline:${o}`}
              {...(o === 0 ? { "data-ss-idle": "" } : {})}
              aria-disabled={!act2}
              aria-label={label(o)}
              onClick={(e) => {
                if (ignoreClick(e)) return;
                if (selected) tryPlace(selected, o, e.detail === 0);
                else takeLast(o);
              }}
            >
              <OutlineArt outline={outline} inside={b.map((id) => ({ id, kind: kindOf(id), color: specs[id]!.color }))} gap={st.hintStage >= 1 && !model} glow={celebrate} />
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{shownBoxes.map((_, o) => label(o)).join(" ")}</p>
      <Ghost drag={drag} size={pDraw}>{dragged && <PieceArt spec={dragged} />}</Ghost>
    </div>
  );
}

// ---------------------------------------------------------------- tray: the Squish button

/** The Squish check button (find / sort / compose). Gate levels answer by moving Gloop, so the tray stays empty. */
export function SquishTray({ st, act }: BoardProps) {
  const store = useSyncExternalStore(squishStore.subscribe, squishStore.get, squishStore.get);
  const ex = st.exercise;
  if (modeOf(ex) === "gate") return <div className="choice-tray placeholder" aria-hidden="true" />;
  const value = store.exId === ex.id ? store.value : null;
  const enabled = st.phase === "answering" && value !== null;
  const right = st.phase === "solved" || (st.phase === "feedback" && st.feedback?.correct);
  return (
    <div className="choice-tray">
      <button
        type="button"
        className={`done-btn ss-squish ${st.model !== null && st.phase === "answering" ? "is-model" : ""} ${right ? "is-right" : ""}`}
        data-testid="done"
        aria-label="Squish! Check my shapes"
        aria-disabled={!enabled}
        onClick={() => enabled && value !== null && act({ type: "SUBMIT", value })}
      >
        <IconCheck />
        <span className="ss-squish-word">Squish!</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- worked-example steps (skin.alongSteps / alongSay)

/** Steps of the modelled answer: sides traced (gate), shapes put in the jar (find), shapes sorted, pieces placed. */
export function alongStepsFor(ex: Exercise): number {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "gate":
      return Math.max(1, sidesOf(gloopSpec(ex)));
    case "find":
      return a.kind === "set" ? a.correct.length : 0;
    case "sort":
      return a.kind === "match" ? a.items.length : 0;
    default:
      return a.kind === "set" ? a.correct.length : 0;
  }
}

/** What to say at each step: the side number (gate), the count of shapes found (find), each shape's sides (sort). */
export function alongSayFor(ex: Exercise, i: number): number | null {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "gate": {
      const sides = sidesOf(gloopSpec(ex));
      return sides > 0 ? i + 1 : null;
    }
    case "find":
      return i + 1;
    case "sort":
      return a.kind === "match" && a.items[i] ? sidesOf(shapeOf(a.items[i])) : null;
    default:
      return null;
  }
}

