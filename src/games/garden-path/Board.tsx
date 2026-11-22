import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { Exercise } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { Toggle } from "../../characters/library";
import { ArrowCard, BerryBushArt, FootprintArt, GoIcon, HomeArt, RepeatIcon, RockArt, StartArt } from "./art";
import { type Card, type Target, addCard, cardOf, cycleCount, firstHole, fits, lastFilled, modelStart, moveCard, nextGhost, placeAt, removeAt, setCount } from "./edit";
import {
  DIR_WORD, type Diagnosis, type Dir, type Program, type Puzzle, type Slot, type Step, blockWords, decodePuzzle, describeGarden, diagnose,
  expand, hasMoves, isDebugMode, movesOf, rc, run, walk,
} from "./logic";
import { type Mark, gpStore, useGp } from "./store";
import "./garden-path.css";

/**
 * Toggle's Garden Path play board: the garden grid (with Toggle) and the program strip. The card palette and
 * the Go button live in the tray (GardenTray) and talk to the board through ./store.
 *
 * Add a card: drag it from the palette onto a space, tap it (it goes into the next empty space), or focus it and
 * press Enter. Take a card out: tap it (its space stays empty for the next card), drag it off the strip, or press
 * Backspace (last card) / Enter on the card. Drag a card onto another space to swap them. ←/→ move between spaces.
 * Go runs the program one move at a time with the running card highlighted; correctness is decided by the
 * simulation in ./logic (any working program passes).
 */

const wait = (ms: number, alive: () => boolean) => new Promise<boolean>((res) => window.setTimeout(() => res(alive()), ms));
const SAY: Record<Card, string> = { up: "gp.block.up", down: "gp.block.down", left: "gp.block.left", right: "gp.block.right", repeat: "gp.block.repeat" };
const CARD_LABEL: Record<Card, string> = { up: "Up arrow", down: "Down arrow", left: "Left arrow", right: "Right arrow", repeat: "Repeat card" };

/** First-miss helper line from the diagnosis (§4.5). */
export function hintLineFor(pz: Puzzle, d: Diagnosis | null): string {
  if (d?.kind === "repeatCount") return "gp.help.repeatCount";
  if (isDebugMode(pz.mode)) return "gp.help.debug";
  switch (d?.kind) {
    case "tooFar": return "gp.help.tooFar";
    case "short": return "gp.help.short";
    case "skipBerry": return "gp.help.plan";
    case "away":
    case "bump": return "gp.help.dir";
    default: return "gp.help.step";
  }
}
export function markOf(d: Diagnosis): Mark | null {
  switch (d.kind) {
    case "ok":
    case "empty": return null;
    case "repeatCount": return { top: d.top, body: -1, count: true };
    case "short": return { top: d.top, body: -1 };
    default: return { top: d.top, body: d.body };
  }
}
/** Model hint: one count-along step per move of the intended program. */
export const modelSteps = (ex: Exercise) => movesOf(decodePuzzle(ex).solution).length;

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
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

// ---------------------------------------------------------------- drag (shared by palette and strip)

interface DragState { from: Card | Target; art: Slot; startX: number; startY: number; x: number; y: number; active: boolean }
type Drop = Target | "strip" | null;

function dropAt(x: number, y: number): Drop {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const space = el?.closest<HTMLElement>("[data-gp-space]");
  if (space) return { top: Number(space.dataset.slot), body: Number(space.dataset.body ?? -1) };
  if (el?.closest("[data-gp-strip]")) return "strip";
  return null;
}

let suppressUntil = 0;
/** Pointer drag with a floating card; a press without movement stays a tap (click). */
function useDrag(onDrop: (d: DragState, to: Drop) => void, busy?: () => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
  const [hot, setHot] = useState<Drop>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      if (active && !d.active) {
        audio.play("pickup", { gain: 0.4 });
        busy?.();
      }
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      ref.current = next;
      setDrag(next);
      setHot(active ? dropAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      ref.current = null;
      setDrag(null);
      setHot(null);
      if (!d?.active) return;
      suppressUntil = e.timeStamp + 80;
      if (e.type === "pointerup") dropRef.current(d, dropAt(e.clientX, e.clientY));
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
  const start = (e: React.PointerEvent, from: Card | Target, art: Slot) => {
    if (e.button !== 0) return;
    const d = { from, art, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
    ref.current = d;
    setDrag(d);
  };
  const ghost = drag?.active
    ? createPortal(<div className="gp-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotFace b={drag.art} /></div>, document.body)
    : null;
  return { drag, hot, start, ghost };
}
const isTap = (e: React.MouseEvent) => e.timeStamp >= suppressUntil;

function SlotFace({ b, ghost = false }: { b: Slot; ghost?: boolean }) {
  if (!b) return null;
  return b.t === "move" ? <ArrowCard d={b.d} ghost={ghost} /> : <RepeatIcon ghost={ghost} />;
}

// ---------------------------------------------------------------- board

interface Walker { cell: number; face: "left" | "right"; got: number; pose: "idle" | "walk" | "bump" | "sit" | "happy" }

export function GardenBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const pz = useMemo(() => decodePuzzle(ex), [ex]);
  const shared = useGp(ex);
  const { program, running, mark, model } = shared;
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering" && !running;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);

  const [walker, setWalker] = useState<Walker>({ cell: pz.start, face: "right", got: 0, pose: "idle" });
  const [trail, setTrail] = useState<number[]>([]);
  const [active, setActive] = useState<Step | null>(null);
  const [say, setSay] = useState("");
  const token = useRef(0);
  const set = (patch: Parameters<typeof gpStore.set>[1]) => gpStore.set(ex.id, patch);
  useEffect(() => () => {
    token.current++;
  }, []);

  /** Any edit: Toggle hops back to the start, footprints clear; the wobble stays until its card changes. */
  const edited = (next: Slot[], at?: Target) => {
    token.current++;
    busy?.();
    setWalker({ cell: pz.start, face: "right", got: 0, pose: "idle" });
    setTrail([]);
    setActive(null);
    const keepMark = mark && (!at || at.top !== mark.top);
    set({ program: next, mark: keepMark ? mark : null });
    const empty = next.filter((b) => !b).length;
    setSay(`Program: ${next.filter(Boolean).map(blockWords).join("; ") || "empty"}.${empty ? ` ${empty} empty ${empty === 1 ? "space" : "spaces"}.` : " The strip is full."}`);
  };

  const full = !firstHole(program, "right") && !firstHole(program, "repeat");
  const ghostFor = (top: number): Slot => (model && !program[top] ? pz.solution[top] ?? null : null);

  const add = (card: Card) => {
    if (!canAct) return;
    if (model) {
      const g = nextGhost(program, pz.solution);
      if (!g || cardOf(g.block) !== card) return;
      audio.play("drop", { gain: 0.5 });
      void audio.speak(SAY[card]);
      return edited(placeAt(program, { top: g.top, body: -1 }, g.block, pz.bodySlots), { top: g.top, body: -1 });
    }
    const res = addCard(program, card, pz.bodySlots);
    if (!res) {
      void audio.speak("gp.block.full");
      return;
    }
    audio.play("drop", { gain: 0.5 });
    void audio.speak(SAY[card]);
    edited(res.program, res.at);
  };
  const placeTo = (t: Target | null, card: Card) => {
    if (!canAct) return;
    if (!t || model) return add(card);
    if (!fits(program, t, card)) return add(card);
    audio.play("drop", { gain: 0.5 });
    void audio.speak(SAY[card]);
    edited(placeAt(program, t, card, pz.bodySlots), t);
  };
  const remove = (t: Target) => {
    if (!canAct || !program[t.top]) return;
    audio.play("pickup", { gain: 0.5 });
    edited(removeAt(program, t), t);
  };
  const tapSpace = (t: Target) => {
    if (!canAct) return;
    const b = program[t.top];
    const filled = t.body < 0 ? !!b : b?.t === "repeat" && !!b.body[t.body];
    if (filled) return remove(t);
    const g = t.body < 0 ? ghostFor(t.top) : null;
    if (g) {
      audio.play("drop", { gain: 0.5 });
      void audio.speak(SAY[cardOf(g)]);
      edited(placeAt(program, t, g, pz.bodySlots), t);
    }
  };
  const changeCount = (top: number, delta: number, wrap = true) => {
    const b = program[top];
    if (!canAct || !b || b.t !== "repeat") return;
    const n = wrap ? cycleCount(b.n, delta) : b.n + delta;
    const next = setCount(program, top, n);
    const nb = next[top];
    if (nb?.t !== "repeat" || nb.n === b.n) return;
    audio.play("tap", { gain: 0.4 });
    void audio.speak("gp.block.times", { n: nb.n });
    edited(next, { top, body: -1 });
  };

  // ---------- run ----------
  const animate = async (prog: Program, opts: { stepMs: number; stopAt?: number; tk: number }) => {
    const alive = () => opts.tk === token.current;
    const res = run(pz, prog);
    setWalker({ cell: pz.start, face: "right", got: 0, pose: "walk" });
    setTrail([]);
    const said: string[] = [];
    if (!(await wait(reducedMotion ? 60 : 300, alive))) return null;
    let got = 0;
    let face: Walker["face"] = "right";
    for (let i = 0; i < res.steps.length; i++) {
      const s = res.steps[i]!;
      setActive(s);
      if (s.d === "left" || s.d === "right") face = s.d;
      if (res.bump?.step === i) {
        setWalker((w) => ({ ...w, face, pose: "bump" }));
        audio.play("drop", { rate: 0.6, gain: 0.55 });
        said.push("bump");
        setSay(said.join(", "));
        if (opts.stopAt === undefined) void audio.speak(res.bump.kind === "rock" ? "gp.run.bump" : "gp.run.edge");
        if (!(await wait(900, alive))) return null;
        break;
      }
      const cell = res.cells[i + 1]!;
      if (got < pz.berries.length && cell === pz.berries[got]) {
        got++;
        audio.play("pickup", { gain: 0.6 });
      }
      setWalker({ cell, face, got, pose: "walk" });
      setTrail(res.cells.slice(1, i + 2));
      audio.playCount(i + 1);
      said.push(DIR_WORD[s.d]);
      setSay(said.join(", "));
      if (!(await wait(opts.stepMs, alive))) return null;
      if (opts.stopAt === i) break;
    }
    setActive(null);
    setSay(`${said.join(", ")}. ${describeGarden(pz, res.cells[res.cells.length - 1]!, got)}`);
    return res;
  };

  const go = async () => {
    if (!canAct) return;
    if (!hasMoves(program)) {
      void audio.speak("gp.run.empty");
      return;
    }
    busy?.();
    const tk = ++token.current;
    const prog = program;
    set({ running: true, mark: null });
    void audio.speak("gp.run.go");
    const res = await animate(prog, { stepMs: reducedMotion ? 220 : 450, tk });
    if (!res || tk !== token.current) {
      set({ running: false });
      return;
    }
    const diagnosis = diagnose(pz, prog);
    setWalker((w) => ({ ...w, pose: res.success ? "happy" : "sit" }));
    set({ running: false, diagnosis, mark: res.success ? null : markOf(diagnosis) });
    await wait(250, () => true);
    act({ type: "SUBMIT", value: res.checkpoints });
  };

  // register the tray's actions (latest closures)
  const apiRef = useRef({ add, placeTo, go });
  apiRef.current = { add, placeTo, go };
  useEffect(() => {
    gpStore.setApi({ add: (c) => apiRef.current.add(c), placeAt: (t, c) => apiRef.current.placeTo(t, c), go: () => void apiRef.current.go() });
    return () => gpStore.setApi(null);
  }, []);

  // first miss: replay slowly with the play-head and stop on the first wrong step (it wobbles)
  const fbSeq = st.feedback?.seq;
  useEffect(() => {
    if (st.phase !== "feedback" || st.feedback?.correct || st.hintStage !== 1 || st.attempts !== 1) return;
    const d = gpStore.get().diagnosis;
    const stopAt = d && "step" in d ? d.step : undefined;
    const tk = ++token.current;
    void (async () => {
      if (!(await wait(900, () => tk === token.current))) return;
      const res = await animate(program, { stepMs: reducedMotion ? 300 : 700, stopAt, tk });
      if (res && tk === token.current) setWalker((w) => ({ ...w, pose: "sit" }));
    })();
  }, [fbSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // second miss: show the intended program as ghost cards (keep the cards that already match)
  useEffect(() => {
    if (st.hintStage !== 2 || model) return;
    token.current++;
    setWalker({ cell: pz.start, face: "right", got: 0, pose: "idle" });
    setTrail([]);
    set({ model: true, mark: null, program: modelStart(program, pz.solution, pz.slots) });
  }, [st.hintStage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (solved) setWalker((w) => ({ ...w, pose: "happy" }));
  }, [solved]);

  // keyboard: Backspace/Delete takes the last card out (or the focused one); ←/→ move between spaces
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const inStrip = !!el?.closest("[data-gp-strip]");
      if ((e.key === "Backspace" || e.key === "Delete") && canAct) {
        const t = el?.dataset.gpSpace !== undefined ? { top: Number(el.dataset.slot), body: Number(el.dataset.body ?? -1) } : lastFilled(program);
        if (t) {
          e.preventDefault();
          remove(t);
        }
      } else if (inStrip && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const all = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-gp-key]") ?? [])];
        const i = all.indexOf(el!);
        const next = all[i + (e.key === "ArrowRight" ? 1 : -1)];
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { drag, hot, start, ghost } = useDrag((d, to) => {
    if (typeof d.from === "string") return placeTo(to === "strip" ? null : to, d.from);
    if (!canAct) return;
    if (to === null) return remove(d.from);
    if (to === "strip") return;
    audio.play("drop", { gain: 0.5 });
    edited(moveCard(program, d.from, to), to);
  }, busy);

  // ---------- layout ----------
  const [rootSizeRef, rootSize] = useSize<HTMLDivElement>();
  const [areaRef, area] = useSize<HTMLDivElement>();
  const wide = rootSize.w > rootSize.h * 1.25;
  const tile = Math.max(30, Math.min(pz.rows === 1 ? 104 : 96, Math.floor(Math.min((area.w - 20) / pz.cols, (area.h - 20) / pz.rows))));

  const modelPath = useMemo(() => (walk(pz, pz.start, movesOf(pz.solution)) ?? []).slice(1), [pz]);
  const showModelSteps = st.hintStage === 2 ? (alongIndex >= 0 ? alongIndex + 1 : modelPath.length) : 0;
  const footAt = new Map<number, number>();
  trail.forEach((c, i) => footAt.set(c, i + 1));
  const modelAt = new Map<number, number>();
  modelPath.slice(0, showModelSteps).forEach((c, i) => modelAt.set(c, i + 1));

  const [wr, wc] = rc(pz, walker.cell);
  const isActive = (top: number, body: number) => !!active && active.top === top && (body < 0 || active.body === body);
  const isMarked = (top: number, body: number) => !!mark && !mark.count && mark.top === top && (mark.body === body || (body < 0 && mark.body < 0));
  const hotIs = (top: number, body: number) => typeof hot === "object" && hot !== null && hot.top === top && hot.body === body;

  const spaceLabel = (b: Slot, i: number, body: number) => {
    const where = body < 0 ? `Space ${i + 1} of ${pz.slots}` : `Repeat body space ${body + 1}`;
    const inner = body < 0 ? b : b?.t === "repeat" && b.body[body] ? { t: "move" as const, d: b.body[body]! } : null;
    if (inner) return `${where}: ${blockWords(inner)}.${canAct ? " Press to take it out" : ""}`;
    const g = body < 0 ? ghostFor(i) : null;
    return `${where}, empty.${g ? ` Glowing card: ${blockWords(g)}. Press to put it here` : ""}`;
  };

  return (
    <div
      ref={(el) => {
        rootRef.current = el;
        rootSizeRef.current = el;
      }}
      className={`gp-stage ${wide ? "is-wide" : "is-tall"} ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${model ? "is-model" : ""} ${drag?.active ? "is-dragging" : ""}`}
      data-testid="gp-board"
      data-mode={pz.mode}
      data-toggle={walker.cell}
      data-running={running ? "true" : "false"}
      style={{ "--tile": `${tile}px` } as React.CSSProperties}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="gp-area" ref={areaRef}>
        <div className={`gp-garden ${pz.rows === 1 ? "is-strip" : ""}`} role="img" aria-label={describeGarden(pz, walker.cell, walker.got)} style={{ gridTemplateColumns: `repeat(${pz.cols}, var(--tile))`, gridTemplateRows: `repeat(${pz.rows}, var(--tile))` }}>
          {Array.from({ length: pz.cols * pz.rows }, (_, cell) => {
            const berryIdx = pz.berries.indexOf(cell);
            const eaten = berryIdx >= 0 && berryIdx < walker.got;
            return (
              <div key={cell} className={`gp-tile ${(Math.floor(cell / pz.cols) + cell) % 2 ? "alt" : ""}`} data-cell={cell}>
                {cell === pz.start && <span className="gp-thing gp-start"><StartArt /></span>}
                {pz.rocks.includes(cell) && <span className="gp-thing gp-rock" data-testid="gp-rock"><RockArt /></span>}
                {berryIdx >= 0 && <span className={`gp-thing gp-berry ${eaten ? "is-eaten" : ""}`} data-testid="gp-berry"><BerryBushArt eaten={eaten} /></span>}
                {cell === pz.goal && <span className={`gp-thing gp-goal ${solved ? "is-reached" : ""}`} data-testid="gp-goal">{pz.berries.length ? <HomeArt /> : <BerryBushArt eaten={solved} />}</span>}
                {modelAt.has(cell) && <span className="gp-thing gp-foot is-model" data-testid="gp-model-step"><FootprintArt n={modelAt.get(cell)!} model /></span>}
                {footAt.has(cell) && !modelAt.has(cell) && <span className="gp-thing gp-foot"><FootprintArt n={footAt.get(cell)!} /></span>}
              </div>
            );
          })}
          <div
            className={`gp-walker pose-${walker.pose} face-${walker.face}`}
            data-testid="gp-toggle"
            style={{ transform: `translate(${wc * tile}px, ${wr * tile}px)` }}
            aria-hidden="true"
          >
            <span className="gp-walker-body">
              <Toggle state={walker.pose === "happy" ? "celebrating" : walker.pose === "sit" || walker.pose === "bump" ? "retry" : walker.pose === "walk" ? "encouraging" : "idle"} size={Math.round(tile * 1.02)} />
            </span>
          </div>
        </div>
      </div>

      <div className="gp-program">
      <ul className={`gp-strip bz-list ${hot === "strip" ? "is-hot" : ""}`} data-gp-strip role="list" aria-label={`Program: ${pz.slots} card ${pz.slots === 1 ? "space" : "spaces"}`} data-testid="gp-strip">
        {program.map((b, i) => {
          if (b?.t === "repeat") {
            const iter = active && active.top === i ? active.iter : -1;
            return (
              <li key={i} className={`gp-repeat ${isActive(i, -1) ? "is-active" : ""} ${solved ? "is-right" : ""}`} data-testid="gp-repeat" data-slot={i}>
                <button
                  type="button"
                  className={`gp-space gp-repeat-head is-filled ${hotIs(i, -1) ? "is-hot" : ""} ${isMarked(i, -1) ? "is-bug" : ""}`}
                  data-testid="gp-slot" data-slot={i} data-body={-1} data-block="repeat" data-gp-space="" data-gp-key=""
                  aria-label={`Space ${i + 1} of ${pz.slots}: ${blockWords(b)}.${canAct ? " Press to take the repeat card out" : ""}`}
                  aria-disabled={!canAct}
                  onPointerDown={(e) => canAct && start(e, { top: i, body: -1 }, b)}
                  onClick={(e) => isTap(e) && tapSpace({ top: i, body: -1 })}
                >
                  <RepeatIcon />
                </button>
                <button
                  type="button"
                  className={`gp-count ${mark?.count && mark.top === i ? "is-bug" : ""}`}
                  data-testid="gp-count" data-slot={i} data-n={b.n} data-gp-key=""
                  aria-label={`Repeat ${b.n} times. Press to change the number`}
                  aria-disabled={!canAct}
                  onClick={() => changeCount(i, 1)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "+") { e.preventDefault(); changeCount(i, 1, false); }
                    if (e.key === "ArrowDown" || e.key === "-") { e.preventDefault(); changeCount(i, -1, false); }
                  }}
                >
                  <span className="gp-count-n">{b.n}</span>
                  <span className="gp-count-x">times</span>
                  <span className="gp-pips" aria-hidden="true">{Array.from({ length: b.n }, (_, k) => <i key={k} className={k < iter ? "done" : k === iter ? "now" : ""} />)}</span>
                </button>
                <div className="gp-body">
                  {b.body.map((d, j) => (
                    <button
                      key={j}
                      type="button"
                      className={`gp-space gp-body-space ${d ? "is-filled" : ""} ${isActive(i, j) ? "is-active" : ""} ${isMarked(i, j) ? "is-bug" : ""} ${hotIs(i, j) ? "is-hot" : ""} ${solved ? "is-right" : ""}`}
                      data-testid="gp-body" data-slot={i} data-body={j} data-block={d ?? ""} data-gp-space="" data-gp-key=""
                      aria-label={spaceLabel(b, i, j)}
                      aria-disabled={!canAct}
                      onPointerDown={(e) => canAct && d && start(e, { top: i, body: j }, { t: "move", d })}
                      onClick={(e) => isTap(e) && tapSpace({ top: i, body: j })}
                    >
                      {d ? <ArrowCard d={d} /> : <span className="gp-hole" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </li>
            );
          }
          const g = ghostFor(i);
          return (
            <li key={i} className="bz-li">
            <button
              type="button"
              className={`gp-space ${b ? "is-filled" : ""} ${g ? "has-ghost" : ""} ${isActive(i, -1) ? "is-active" : ""} ${isMarked(i, -1) ? "is-bug" : ""} ${hotIs(i, -1) ? "is-hot" : ""} ${solved && b ? "is-right" : ""}`}
              data-testid="gp-slot" data-slot={i} data-body={-1} data-block={b?.t === "move" ? b.d : ""} data-gp-space="" data-gp-key=""
              aria-label={spaceLabel(b, i, -1)}
              aria-disabled={!canAct}
              onPointerDown={(e) => canAct && b && start(e, { top: i, body: -1 }, b)}
              onClick={(e) => isTap(e) && tapSpace({ top: i, body: -1 })}
            >
              {b ? <SlotFace b={b} /> : g ? <span className="gp-ghost"><SlotFace b={g} ghost /></span> : <span className="gp-hole" aria-hidden="true">{i + 1}</span>}
            </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={`gp-go ${full && canAct ? "is-ready" : ""} ${model && !nextGhost(program, pz.solution) && canAct ? "is-model" : ""} ${solved ? "is-right" : ""}`}
        data-testid="done"
        data-gp-next={full && !solved ? "true" : undefined}
        aria-label="Go! Run the program"
        aria-disabled={!canAct || !hasMoves(program)}
        onClick={() => {
          if (!canAct) return;
          audio.play("tap", { gain: 0.5 });
          void go();
        }}
      >
        <GoIcon />
        <span>Go</span>
      </button>
      </div>

      <p className="sr-only" aria-live="polite" data-testid="gp-say">{say}</p>
      {ghost}
    </div>
  );
}

// ---------------------------------------------------------------- tray: the card palette

export function GardenTray({ st, busy }: BoardProps) {
  const ex = st.exercise;
  const pz = useMemo(() => decodePuzzle(ex), [ex]);
  const shared = useGp(ex);
  const { program, running, model } = shared;
  const canAct = st.phase === "answering" && !running;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const cards: Card[] = [...pz.palette, ...(pz.repeat ? (["repeat"] as const) : [])];
  const full = !firstHole(program, "right") && !firstHole(program, "repeat");
  const ghost = model ? nextGhost(program, pz.solution) : null;

  const onDrop = useCallback((d: DragState, to: Drop) => {
    if (typeof d.from === "string") gpStore.api()?.placeAt(to === "strip" ? null : to, d.from);
  }, []);
  const { drag, start, ghost: dragGhost } = useDrag(onDrop, busy);

  return (
    <div className={`gp-tray ${pz.repeat ? "has-repeat" : ""}`} data-testid="gp-tray">
      <div className="gp-palette" role="group" aria-label="Cards" data-gp-next={!full && !solved ? "true" : undefined}>
        {cards.map((c) => {
          const out = model && (!ghost || cardOf(ghost.block) !== c);
          const disabled = !canAct || out;
          return (
            <button
              key={c}
              type="button"
              className={`gp-card ${c === "repeat" ? "is-repeat" : ""} ${out ? "is-out" : ""} ${ghost && cardOf(ghost.block) === c && canAct ? "is-model" : ""} ${drag?.active && drag.from === c ? "is-lifted" : ""}`}
              data-testid="choice"
              data-value={c}
              aria-label={`${CARD_LABEL[c]}. Press to add it, or drag it into the program`}
              aria-disabled={disabled}
              onPointerDown={(e) => !disabled && start(e, c, c === "repeat" ? { t: "repeat", n: 2, body: [] } : { t: "move", d: c as Dir })}
              onClick={(e) => {
                if (!isTap(e) || disabled) return;
                gpStore.api()?.add(c);
              }}
            >
              {c === "repeat" ? <RepeatIcon /> : <ArrowCard d={c as Dir} />}
            </button>
          );
        })}
      </div>
      {dragGhost}
    </div>
  );
}

/** Steps of the intended program (e2e + docs helper). */
export const intendedMoves = (ex: Exercise): Dir[] => expand(decodePuzzle(ex).solution).map((s) => s.d);
