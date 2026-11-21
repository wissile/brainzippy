import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { INK } from "../../characters/palette";
import type { Exercise } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { BB, BraceShape, OkBadge, PieceIcon, PillarShape, TestIcon, VehicleArt, VehicleShape, WeakBadge } from "./art";
import { VEHICLE_WORD } from "./generator";
import {
  COST, type Cell, LOAD, PIECE_NAME, type Piece, type Puzzle, type Segment, addPiece, cellWords, clearCell,
  decodePuzzle, diagnose, grade, missingPieces, modelStart, placePiece, segmentWords, supports,
} from "./logic";
import { type TestResult, type Tool, bbStore, useBb } from "./store";
import "./budget-bridge.css";

/**
 * Brix's Budget Bridge play board: the budget bar, the river with its gap cells, and the bridge. The pieces and
 * the Test button live in the tray (BridgeTray) and talk to the board through ./store.
 *
 * Build (every way does the same thing):
 *  - drag a piece from the tray onto a gap;
 *  - tap-tap: tap a piece, then tap gaps (the piece stays picked up; tap a gap again to take it off), or tap a gap
 *    first and then a piece;
 *  - keyboard: Tab to a gap, ←/→ move between gaps, number keys 1–4 put the tray's pieces there (press again to
 *    take it off), 0 / Delete / Backspace clears the gap; Enter on a tray piece picks it up, Enter on a gap puts it.
 * Test: the vehicle drives across one cell at a time; each span sags by load ÷ capacity. A span that is too weak
 * bends down and glows, and the vehicle backs off to the bank (no falls, no crashes). Reduced motion: no driving,
 * the result appears at once with a badge per span (check = holds, sag mark = too weak). Correctness comes only from
 * the rule checker in ./logic (any valid design passes).
 */

// ---------------------------------------------------------------- geometry (SVG units)
const CELL = 100;
const BANK = 100;
const H = 236;
const DECK_Y = 108; // road surface
const DECK_T = 16;
const WATER_Y = 164;
const MOUND_Y = 200;
const BRACE_H = 44;
const OK_SAG_MAX = 12;
const WEAK_SAG = 34;
const WEAK_REST = 18;

const wait = (ms: number, alive: () => boolean) => new Promise<boolean>((res) => window.setTimeout(() => res(alive()), ms));

/** Tray order (keyboard number keys follow it). */
const toolsOf = (pz: Puzzle): Tool[] => [...pz.pieces, "erase"];
const TOOL_LABEL: Record<Tool, string> = { ...PIECE_NAME, erase: "Clear" };

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 300 });
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

// ---------------------------------------------------------------- shared helpers

/** The next thing to do (idle help points at it; never at a specific answer). */
export function nextTarget(pz: Puzzle, s: ReturnType<typeof bbStore.get>): { kind: "cell"; i: number } | { kind: "tool"; t: Tool } | { kind: "test" } {
  if (s.model) {
    const i = s.design.findIndex((c, k) => missingPieces(c, pz.solution[k]!).length > 0);
    return i >= 0 ? { kind: "cell", i } : { kind: "test" };
  }
  const hole = s.design.findIndex((c) => !c.deck);
  if (hole < 0) return { kind: "test" };
  if (s.armed === "wood" || s.armed === "steel") return { kind: "cell", i: hole };
  return { kind: "tool", t: pz.pieces[0]! };
}

/** Second-miss worked example: one count-along step per gap cell (the ghost appears cell by cell). */
export const modelSteps = (ex: Exercise) => decodePuzzle(ex).gap;

// ---------------------------------------------------------------- drag (tray → gap)

interface DragState { tool: Tool; startX: number; startY: number; x: number; y: number; active: boolean }
const cellAt = (x: number, y: number): number | null => {
  const el = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>("[data-bb-cell]");
  return el ? Number(el.dataset.cell) : null;
};
let suppressUntil = 0;
const isTap = (e: React.MouseEvent) => e.timeStamp >= suppressUntil;

function useDrag(exId: string, onDrop: (t: Tool, cell: number | null) => void, busy?: () => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const ref = useRef<DragState | null>(null);
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
      const hot = active ? cellAt(e.clientX, e.clientY) : null;
      if (bbStore.get().hot !== hot) bbStore.set(exId, { hot });
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      ref.current = null;
      setDrag(null);
      bbStore.set(exId, { hot: null });
      if (!d?.active) return;
      suppressUntil = e.timeStamp + 80;
      if (e.type === "pointerup") dropRef.current(d.tool, cellAt(e.clientX, e.clientY));
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
  const start = (e: React.PointerEvent, tool: Tool) => {
    if (e.button !== 0) return;
    const d = { tool, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false };
    ref.current = d;
    setDrag(d);
  };
  const ghost = drag?.active
    ? createPortal(<div className="bb-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><PieceIcon piece={drag.tool} /></div>, document.body)
    : null;
  return { drag, start, ghost };
}

// ---------------------------------------------------------------- the bridge drawing

/** Sag curve of one span: y offset at x for a span from xs to xe sagging by `a`. */
const sagAt = (x: number, xs: number, xe: number, a: number) => (a ? a * Math.sin((Math.PI * (x - xs)) / (xe - xs)) : 0);

/** A deck plank drawn along the curve (so even a one-cell span visibly bends, ends staying on its supports). */
function CurvedPlank({ x0, mat, y, ghost, cls }: { x0: number; mat: "wood" | "steel"; y: (x: number) => number; ghost?: boolean; cls?: string }) {
  const N = 10;
  const xs = Array.from({ length: N + 1 }, (_, k) => x0 + 1 + (98 * k) / N);
  const top = xs.map((x) => `${x.toFixed(1)} ${y(x).toFixed(1)}`);
  const bottom = [...xs].reverse().map((x) => `${x.toFixed(1)} ${(y(x) + DECK_T).toFixed(1)}`);
  const d = `M${top.join(" L")} L${bottom.join(" L")} Z`;
  const mid = (off: number) => `M${xs.slice(1, -1).map((x) => `${x.toFixed(1)} ${(y(x) + off).toFixed(1)}`).join(" L")}`;
  const fill = mat === "wood" ? BB.wood : BB.steel;
  return (
    <g className={`bb-plank is-${mat} ${ghost ? "is-ghost" : ""} ${cls ?? ""}`}>
      <path d={d} fill={ghost ? "#fff" : fill} fillOpacity={ghost ? 0.55 : 1} stroke={ghost ? "#8E6CEF" : INK} strokeWidth="4" strokeLinejoin="round" strokeDasharray={ghost ? "7 5" : undefined} />
      {!ghost && mat === "wood" && (
        <>
          <path d={mid(6)} fill="none" stroke={BB.woodDk} strokeWidth="2.5" strokeLinecap="round" />
          <path d={mid(11)} fill="none" stroke={BB.woodLt} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          <circle cx={x0 + 9} cy={y(x0 + 9) + 8} r="2.6" fill={INK} />
          <circle cx={x0 + 91} cy={y(x0 + 91) + 8} r="2.6" fill={INK} />
        </>
      )}
      {!ghost && mat === "steel" && (
        <>
          <path d={mid(8)} fill="none" stroke={BB.steelDk} strokeWidth="5" opacity="0.55" />
          {[14, 36, 58, 80].map((dx) => <rect key={dx} x={x0 + dx} y={y(x0 + dx + 2) + 2.5} width="5" height="5" fill={INK} opacity="0.75" />)}
        </>
      )}
    </g>
  );
}

interface Frame { pos: number; sag: Record<number, number> }

function BridgeSvg({ pz, design, segments, frame, result, weak, model, ghostUpTo, solved, holes }: {
  pz: Puzzle; design: readonly Cell[]; segments: Segment[]; frame: Frame; result: TestResult | null; weak: [number, number] | null;
  model: boolean; ghostUpTo: number; solved: boolean; holes: number[];
}) {
  const G = pz.gap;
  const W = BANK * 2 + G * CELL;
  const segOf = (i: number) => segments.find((s) => i >= s.start && i <= s.end);
  const xOf = (i: number) => BANK + i * CELL;
  const yAt = (x: number): number => {
    const c = Math.floor((x - BANK) / CELL);
    const s = segOf(c);
    if (!s) return DECK_Y;
    return DECK_Y + sagAt(x, xOf(s.start), xOf(s.end + 1), frame.sag[s.start] ?? 0);
  };
  const vx = BANK + frame.pos * CELL;
  const vy = yAt(vx);
  const slope = (yAt(vx + 14) - yAt(vx - 14)) / 28;
  const isWeak = (s: Segment) => !!weak && s.start === weak[0] && s.end === weak[1];

  return (
    <svg className="bb-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id="bb-deep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={BB.water} /><stop offset="1" stopColor={BB.waterDk} /></linearGradient>
      </defs>
      {/* river bed: deep water everywhere, ground mounds where pillars can stand */}
      <rect x={BANK - 4} y={WATER_Y} width={G * CELL + 8} height={H - WATER_Y} fill="url(#bb-deep)" />
      {pz.ground.map((g, i) => g ? (
        <g key={i} className="bb-mound">
          <path d={`M${xOf(i) + 4} ${H} V${MOUND_Y + 8} Q${xOf(i) + 50} ${MOUND_Y - 10} ${xOf(i) + 96} ${MOUND_Y + 8} V${H} Z`} fill={BB.earth} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx={xOf(i) + 30} cy={MOUND_Y + 20} r="4" fill={BB.earthDk} /><circle cx={xOf(i) + 64} cy={MOUND_Y + 26} r="5" fill={BB.earthDk} />
        </g>
      ) : (
        <g key={i} className="bb-deep-mark" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.65">
          <path d={`M${xOf(i) + 22} ${MOUND_Y + 2} q14 -8 28 0 t28 0`} />
          <path d={`M${xOf(i) + 30} ${MOUND_Y + 22} q10 -6 20 0 t20 0`} />
        </g>
      ))}
      {/* banks */}
      <path d={`M0 ${DECK_Y} H${BANK} V${H} H0 Z`} fill={BB.grass} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M${W} ${DECK_Y} H${W - BANK} V${H} H${W} Z`} fill={BB.grass} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <path d={`M2 ${DECK_Y + 14} H${BANK - 2} M${W - 2} ${DECK_Y + 14} H${W - BANK + 2}`} stroke={BB.earth} strokeWidth="12" />
      <rect x="0" y={DECK_Y - 6} width={BANK} height="6" fill={BB.road} /><rect x={W - BANK} y={DECK_Y - 6} width={BANK} height="6" fill={BB.road} />

      {/* empty gaps: a dashed slot shows where a deck goes */}
      {design.map((c, i) => !c.deck && (
        <rect key={`slot${i}`} className={`bb-slot ${holes.includes(i) ? "is-hole" : ""}`} x={xOf(i) + 6} y={DECK_Y} width={CELL - 12} height={DECK_T} rx="5" fill="rgba(255,255,255,0.45)" stroke={INK} strokeOpacity="0.5" strokeWidth="3" strokeDasharray="8 6" />
      ))}
      {/* pillars */}
      {design.map((c, i) => c.pillar && (
        <g key={`p${i}`} transform={`translate(${xOf(i)} ${DECK_Y + DECK_T})`}>
          <PillarShape h={pz.ground[i] ? MOUND_Y - DECK_Y - DECK_T + 6 : H - DECK_Y - DECK_T} sunk={!pz.ground[i]} />
        </g>
      ))}
      {/* the weak span glows under its planks */}
      {segments.map((s) => isWeak(s) && (
        <path key={`glow${s.start}`} className="bb-weak-glow" d={`M${xOf(s.start)} ${DECK_Y + 8} Q${(xOf(s.start) + xOf(s.end + 1)) / 2} ${DECK_Y + 8 + 2 * (frame.sag[s.start] ?? 0)} ${xOf(s.end + 1)} ${DECK_Y + 8}`} fill="none" stroke="#FF9F43" strokeWidth="26" strokeLinecap="round" opacity="0.55" />
      ))}
      {/* decks and braces, riding the sag */}
      {design.map((c, i) => {
        const cx = xOf(i) + CELL / 2;
        const tilt = (Math.atan((yAt(cx + 20) - yAt(cx - 20)) / 40) * 180) / Math.PI;
        return (
          <g key={`d${i}`} className={solved && c.deck ? "is-right" : undefined}>
            {c.deck && <CurvedPlank x0={xOf(i)} mat={c.deck} y={yAt} />}
            {c.brace && <g transform={`translate(${xOf(i)} ${yAt(cx)}) rotate(${tilt.toFixed(2)} 50 0)`}><BraceShape h={BRACE_H} /></g>}
          </g>
        );
      })}
      {/* second miss: ghost pieces of one working bridge, cell by cell */}
      {model && design.map((c, i) => {
        if (i > ghostUpTo) return null;
        const want = pz.solution[i]!;
        const miss = missingPieces(c, want);
        if (!miss.length) return null;
        return (
          <g key={`g${i}`} className="bb-ghost" data-testid="bb-ghost">
            {miss.includes("pillar") && <g transform={`translate(${xOf(i)} ${DECK_Y + DECK_T})`}><PillarShape h={MOUND_Y - DECK_Y - DECK_T + 6} ghost /></g>}
            {want.deck && miss.includes(want.deck) && <CurvedPlank x0={xOf(i)} mat={want.deck} y={() => DECK_Y} ghost />}
            {miss.includes("brace") && <g transform={`translate(${xOf(i)} ${DECK_Y})`}><BraceShape h={BRACE_H} ghost /></g>}
          </g>
        );
      })}
      {/* the vehicle */}
      <g className="bb-vehicle" transform={`translate(${vx.toFixed(1)} ${vy.toFixed(1)}) rotate(${((Math.atan(slope) * 180) / Math.PI).toFixed(2)})`}>
        <VehicleShape kind={pz.vehicle} />
      </g>
      {/* test result: one badge per span (shape + colour), with how much it holds */}
      {result && result.segments.map((s) => {
        const mx = (xOf(s.start) + xOf(s.end + 1)) / 2;
        const bad = s.tooWeak || s.tooLong;
        return (
          <g key={`b${s.start}`} transform={`translate(${mx} 22)`} data-testid="bb-badge" data-ok={bad ? "false" : "true"}>
            {bad ? <WeakBadge /> : <OkBadge />}
            <text x="0" y="36" textAnchor="middle" className="bb-badge-text">{s.mat === null ? "gap" : s.tooLong ? "too long" : `holds ${s.capacity}`}</text>
          </g>
        );
      })}
      {/* the road sign on the left bank: how heavy is it? */}
      <g transform={`translate(${BANK / 2} ${DECK_Y + 52})`} className="bb-load-sign">
        <rect x="-40" y="-17" width="80" height="34" rx="9" fill="#fff" stroke={INK} strokeWidth="3.5" />
        <text x="0" y="8" textAnchor="middle" className="bb-sign-text">load {LOAD[pz.vehicle]}</text>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- board

export function BridgeBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const pz = useMemo(() => decodePuzzle(ex), [ex]);
  const shared = useBb(ex);
  const { design, running, model, result, weak, selected, armed, holes, hot } = shared;
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering" && !running;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const g = useMemo(() => grade(pz, design), [pz, design]);
  const set = (patch: Parameters<typeof bbStore.set>[1]) => bbStore.set(ex.id, patch);

  const [frame, setFrame] = useState<Frame>({ pos: -0.5, sag: {} });
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [say, setSay] = useState("");
  const token = useRef(0);
  const raf = useRef(0);
  useEffect(() => () => {
    token.current++;
    cancelAnimationFrame(raf.current);
  }, []);

  /** Tween the vehicle position and span sags (requestAnimationFrame; instant with reduced motion). */
  const tweenTo = (to: Partial<Frame>, ms: number, tk: number): Promise<boolean> => {
    cancelAnimationFrame(raf.current);
    const from = frameRef.current;
    const target: Frame = { pos: to.pos ?? from.pos, sag: to.sag ?? from.sag };
    if (reducedMotion || ms <= 0) {
      setFrame(target);
      return Promise.resolve(tk === token.current);
    }
    const keys = [...new Set([...Object.keys(from.sag), ...Object.keys(target.sag)])].map(Number);
    const t0 = performance.now();
    return new Promise((res) => {
      const step = (t: number) => {
        if (tk !== token.current) return res(false);
        const k = Math.min(1, (t - t0) / ms);
        const e = 1 - (1 - k) * (1 - k);
        const sag: Record<number, number> = {};
        for (const s of keys) sag[s] = (from.sag[s] ?? 0) + ((target.sag[s] ?? 0) - (from.sag[s] ?? 0)) * e;
        setFrame({ pos: from.pos + (target.pos - from.pos) * e, sag });
        if (k < 1) raf.current = requestAnimationFrame(step);
        else res(true);
      };
      raf.current = requestAnimationFrame(step);
    });
  };

  // ---------- editing ----------
  const edited = (next: Cell[], at: number) => {
    token.current++;
    busy?.();
    cancelAnimationFrame(raf.current);
    setFrame({ pos: -0.5, sag: weak && at >= weak[0] && at <= weak[1] ? {} : frameRef.current.sag });
    const keepWeak = weak && (at < weak[0] || at > weak[1]) ? weak : null;
    set({ design: next, result: null, weak: keepWeak, holes: [] });
    const cost = next.reduce((s, c) => s + (c.deck ? COST[c.deck] : 0) + (c.pillar ? COST.pillar : 0) + (c.brace ? COST.brace : 0), 0);
    setSay(`${cellWords(pz, next[at]!, at)}. Cost ${cost} of ${pz.budget} dollars.`);
  };
  const apply = (tool: Tool, i: number, mode: "toggle" | "add") => {
    const next = tool === "erase" ? clearCell(design, i) : mode === "add" ? addPiece(design, i, tool) : placePiece(design, i, tool);
    if (next.every((c, k) => c === design[k] || JSON.stringify(c) === JSON.stringify(design[k]))) return;
    audio.play(tool === "erase" ? "pickup" : "drop", { gain: 0.5 });
    edited(next, i);
  };
  const placeGhost = (i: number) => {
    const miss = missingPieces(design[i]!, pz.solution[i]!);
    if (!miss.length) return false;
    let next = design.map((c) => ({ ...c }));
    for (const p of miss) next = addPiece(next, i, p);
    audio.play("drop", { gain: 0.5 });
    edited(next, i);
    return true;
  };

  const tapCell = (i: number) => {
    if (!canAct) return;
    if (model) {
      placeGhost(i);
      return;
    }
    if (armed) return apply(armed, i, "toggle");
    busy?.();
    audio.play("tap", { gain: 0.35 });
    set({ selected: selected === i ? null : i });
  };
  const tapPiece = (t: Tool) => {
    if (!canAct) return;
    busy?.();
    if (model) {
      if (selected !== null && t !== "erase" && missingPieces(design[selected]!, pz.solution[selected]!).includes(t)) placeGhost(selected);
      return;
    }
    if (selected !== null && armed === null) return apply(t, selected, "toggle");
    audio.play("pickup", { gain: 0.4 });
    set({ armed: armed === t ? null : t, selected: null });
  };
  const drop = (t: Tool, i: number | null) => {
    if (!canAct || i === null) return;
    if (model) {
      if (t !== "erase" && missingPieces(design[i]!, pz.solution[i]!).includes(t)) placeGhost(i);
      return;
    }
    apply(t, i, "add");
  };

  // ---------- test ----------
  const sagFor = (s: Segment) => (s.tooWeak || s.tooLong ? WEAK_SAG : 3 + (OK_SAG_MAX - 3) * Math.min(1, s.ratio));
  const test = async () => {
    if (!canAct) return;
    busy?.();
    if (!g.rules.deck) {
      set({ holes: g.holes });
      setSay(`The road has a hole at ${g.holes.length === 1 ? "gap" : "gaps"} ${g.holes.map((h) => h + 1).join(", ")}.`);
      void audio.speak("bb.test.gap");
      return;
    }
    const tk = ++token.current;
    const tested = design;
    set({ running: true, result: null, weak: null, holes: [], armed: null, selected: null });
    setSay("Testing the bridge.");
    void audio.speak("bb.prompt.test");
    const segs = g.segments;
    const failIdx = segs.findIndex((s) => s.tooWeak || s.tooLong);
    const fail = failIdx >= 0 ? segs[failIdx]! : null;
    const stepMs = 520;
    const alive = () => tk === token.current;
    await tweenTo({ pos: -0.5, sag: {} }, 200, tk);
    if (!(await wait(reducedMotion ? 80 : 650, alive))) return;
    let failed = false;
    for (let i = 0; i < pz.gap && !reducedMotion; i++) {
      const s = segs.find((x) => i >= x.start && i <= x.end);
      if (fail && s === fail && i === fail.start) {
        // front wheels on the weak span: it bends; the vehicle backs off to the bank
        if (!(await tweenTo({ pos: i + 0.12, sag: { [fail.start]: WEAK_SAG } }, 700, tk))) return;
        audio.play("drop", { rate: 0.55, gain: 0.5 });
        void audio.speak("bb.test.sag");
        if (!(await wait(900, alive))) return;
        if (!(await tweenTo({ pos: -0.5, sag: { [fail.start]: WEAK_REST } }, 1100, tk))) return;
        failed = true;
        break;
      }
      if (!(await tweenTo({ pos: i + 0.5, sag: s ? { [s.start]: sagFor(s) } : {} }, stepMs, tk))) return;
      audio.playCount(i + 1);
    }
    if (reducedMotion) {
      // no driving: the result appears at once (the weak span shows bent, every span gets a badge)
      setFrame({ pos: fail ? -0.5 : pz.gap + 0.5, sag: fail ? { [fail.start]: WEAK_REST } : {} });
      failed = !!fail;
      if (fail) void audio.speak("bb.test.sag");
    } else if (!failed) {
      if (!(await tweenTo({ pos: pz.gap + 0.5, sag: {} }, stepMs + 200, tk))) return;
    }
    const res: TestResult = { segments: segs, failAt: failIdx, overBudget: !g.rules.budget };
    const diagnosis = diagnose(pz, tested, pz.given && pz.weak ? { given: pz.given, weak: pz.weak } : undefined);
    setSay(`${failed ? "A span sagged." : `It holds! The ${VEHICLE_WORD[pz.vehicle]} is across.`} ${segs.map((s) => segmentWords(pz, s)).join(" ")} Cost ${g.cost} of ${pz.budget} dollars${g.rules.budget ? "." : `: over budget by ${g.cost - pz.budget} dollars.`}`);
    set({ result: res, weak: fail ? [fail.start, fail.end] : null, tested, diagnosis });
    if (!failed) {
      await audio.speak("bb.test.pass", { vehicle: VEHICLE_WORD[pz.vehicle] });
      if (!alive()) return;
    } else if (!(await wait(reducedMotion ? 700 : 200, alive))) return;
    set({ running: false });
    act({ type: "SUBMIT", value: g.passed });
  };

  // register the tray's actions (latest closures)
  const apiRef = useRef({ tapPiece, tapCell, drop, test });
  apiRef.current = { tapPiece, tapCell, drop, test };
  useEffect(() => {
    bbStore.setApi({
      tapPiece: (t) => apiRef.current.tapPiece(t),
      tapCell: (i) => apiRef.current.tapCell(i),
      drop: (t, i) => apiRef.current.drop(t, i),
      test: () => void apiRef.current.test(),
    });
    return () => bbStore.setApi(null);
  }, []);

  // second miss: keep the pieces that agree with one working bridge; the rest shows as ghosts
  useEffect(() => {
    if (st.hintStage !== 2 || model) return;
    token.current++;
    cancelAnimationFrame(raf.current);
    setFrame({ pos: -0.5, sag: {} });
    set({ model: true, design: modelStart(design, pz.solution), result: null, weak: null, armed: null, selected: null, holes: [] });
  }, [st.hintStage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (solved) setFrame((f) => ({ ...f, sag: {} }));
  }, [solved]);

  // keyboard on a focused gap: number keys = tray pieces, 0/Delete/Backspace clear, ←/→ move
  const rootRef = useRef<HTMLDivElement>(null);
  const onCellKey = (e: React.KeyboardEvent, i: number) => {
    const n = Number(e.key);
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const all = [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-bb-cell]") ?? [])];
      const next = all[i + (e.key === "ArrowRight" ? 1 : -1)];
      if (next) {
        e.preventDefault();
        next.focus();
      }
      return;
    }
    if (!canAct) return;
    if (e.key === "Delete" || e.key === "Backspace" || e.key === "0") {
      e.preventDefault();
      if (!model) apply("erase", i, "toggle");
      return;
    }
    if (Number.isInteger(n) && n >= 1 && n <= pz.pieces.length) {
      e.preventDefault();
      const p = pz.pieces[n - 1]!;
      if (model) {
        if (missingPieces(design[i]!, pz.solution[i]!).includes(p)) placeGhost(i);
      } else apply(p, i, "toggle");
    }
  };

  // ---------- layout ----------
  const [areaRef, area] = useSize<HTMLDivElement>();
  const W = BANK * 2 + pz.gap * CELL;
  const scale = Math.max(0.2, Math.min(area.w / W, area.h / H, 1.25));
  const ghostUpTo = st.hintStage === 2 ? (alongIndex >= 0 ? alongIndex : pz.gap) : -1;
  const next = nextTarget(pz, shared);
  const over = g.cost > pz.budget;
  const left = pz.budget - g.cost;
  const pct = Math.min(100, (g.cost / Math.max(1, pz.budget)) * 100);

  const cellLabel = (c: Cell, i: number) => {
    const base = cellWords(pz, c, i);
    if (model) {
      const miss = missingPieces(c, pz.solution[i]!);
      return `${base}.${miss.length ? ` Glowing: ${miss.map((p) => PIECE_NAME[p].toLowerCase()).join(", ")}. Press to build it` : ""}`;
    }
    if (armed) return `${base}. Press to ${armed === "erase" ? "clear it" : `put a ${PIECE_NAME[armed].toLowerCase()} here (press again to take it off)`}`;
    return `${base}. Press to pick this gap, or press 1 to ${pz.pieces.length} to add a piece`;
  };

  return (
    <div
      ref={rootRef}
      className={`bb-stage ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${model ? "is-model" : ""} ${armed ? "is-armed" : ""}`}
      data-testid="bb-board"
      data-mode={pz.mode}
      data-running={running ? "true" : "false"}
      data-vehicle-at={frame.pos >= pz.gap ? "far" : frame.pos < 0 ? "start" : "bridge"}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="bb-topbar">
        <span className="bb-load" data-testid="bb-load" aria-label={`The ${VEHICLE_WORD[pz.vehicle]} weighs ${LOAD[pz.vehicle]}`}>
          <span className="bb-load-icon" aria-hidden="true"><VehicleArt kind={pz.vehicle} /></span>
          <span><b>{LOAD[pz.vehicle]}</b><small>load</small></span>
        </span>
        <button
          type="button"
          className={`bb-budget ${over ? "is-over" : ""}`}
          data-testid="bb-budget"
          data-cost={g.cost}
          data-budget={pz.budget}
          aria-label={`Budget ${pz.budget} dollars. Spent ${g.cost}. ${over ? `Over budget by ${-left} dollars` : `${left} dollars left`}. Press to hear the budget`}
          onClick={() => void audio.speak("bb.budget", { amount: pz.budget })}
        >
          <span className="bb-budget-head"><BudgeCoin /> <b>${pz.budget}</b></span>
          <span className="bb-budget-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
          <span className="bb-budget-text" aria-live="polite">{over ? `Over by $${-left}` : `$${g.cost} spent · $${left} left`}</span>
        </button>
      </div>
      <div className="bb-area" ref={areaRef}>
        <div className="bb-scene" style={{ width: W * scale, height: H * scale }}>
          <BridgeSvg pz={pz} design={design} segments={g.segments} frame={frame} result={result} weak={weak} model={model} ghostUpTo={ghostUpTo} solved={solved} holes={holes} />
          <div className="bb-cells" role="group" aria-label={`Bridge: ${pz.gap} ${pz.gap === 1 ? "gap" : "gaps"}`}>
            {design.map((c, i) => {
              const ghost = model && i <= ghostUpTo && missingPieces(c, pz.solution[i]!).length > 0;
              return (
                <button
                  key={i}
                  type="button"
                  className={`bb-cell ${selected === i ? "is-selected" : ""} ${hot === i ? "is-hot" : ""} ${ghost ? "has-ghost" : ""} ${holes.includes(i) ? "is-hole" : ""}`}
                  style={{ left: (BANK + i * CELL) * scale, width: CELL * scale }}
                  data-testid="bb-cell"
                  data-bb-cell=""
                  data-cell={i}
                  data-deck={c.deck ?? ""}
                  data-pillar={c.pillar ? "true" : "false"}
                  data-brace={c.brace ? "true" : "false"}
                  data-ground={pz.ground[i] ? "true" : "false"}
                  data-supported={supports(pz, design, i) ? "true" : "false"}
                  data-bb-next={next.kind === "cell" && next.i === i && !solved ? "true" : undefined}
                  aria-label={cellLabel(c, i)}
                  aria-pressed={selected === i}
                  aria-disabled={!canAct}
                  onClick={(e) => isTap(e) && tapCell(i)}
                  onKeyDown={(e) => onCellKey(e, i)}
                />
              );
            })}
          </div>
        </div>
      </div>
      <p className="bb-note">Game numbers: real bridges are designed by engineers using real measurements.</p>
      <ul className="sr-only" data-testid="bb-results">
        {result?.segments.map((s) => <li key={s.start}>{segmentWords(pz, s)}</li>)}
      </ul>
      <p className="sr-only" aria-live="polite" data-testid="bb-say">{say}</p>
    </div>
  );
}

function BudgeCoin() {
  return (
    <svg viewBox="0 0 40 40" className="bb-coin" aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="#E9A93B" stroke={INK} strokeWidth="3.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="#FFF1C9" strokeWidth="2.5" />
      <path d="M20 13 V27 M16 16.5 C16 14 24 14 24 17 C24 20 16 19.5 16 23 C16 26 24 26 24 23.5" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------- tray: pieces + Test

export function BridgeTray({ st, busy }: BoardProps) {
  const ex = st.exercise;
  const pz = useMemo(() => decodePuzzle(ex), [ex]);
  const shared = useBb(ex);
  const { design, running, model, armed, selected } = shared;
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering" && !running;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const tools = toolsOf(pz);
  const next = nextTarget(pz, shared);
  const needed = useMemo(() => new Set(model ? design.flatMap((c, i) => missingPieces(c, pz.solution[i]!)) : []), [model, design, pz]);
  const complete = design.every((c) => !!c.deck);

  const onDrop = useCallback((t: Tool, cell: number | null) => bbStore.api()?.drop(t, cell), []);
  const { drag, start, ghost } = useDrag(ex.id, onDrop, busy);

  return (
    <div className={`bb-tray ${reducedMotion ? "still" : ""}`} data-testid="bb-tray">
      <div className="bb-pieces" role="group" aria-label="Pieces">
        {tools.map((t, k) => {
          const out = model && (t === "erase" || !needed.has(t as Piece));
          const disabled = !canAct || out;
          return (
            <button
              key={t}
              type="button"
              className={`bb-piece is-${t} ${armed === t ? "is-armed" : ""} ${out ? "is-out" : ""} ${model && !out && canAct ? "is-model" : ""} ${drag?.active && drag.tool === t ? "is-lifted" : ""}`}
              data-testid="choice"
              data-value={t}
              data-bb-next={next.kind === "tool" && next.t === t && !solved ? "true" : undefined}
              aria-label={`${TOOL_LABEL[t]}${t === "erase" ? "" : `, ${COST[t as Piece]} dollars`}. ${t === "erase" ? "Press, then press a gap to clear it" : selected !== null && !armed ? `Press to put it on gap ${selected + 1}` : "Press to pick it up, then press a gap; or drag it onto a gap"}. Key ${t === "erase" ? "0" : k + 1}`}
              aria-pressed={armed === t}
              aria-disabled={disabled}
              onPointerDown={(e) => !disabled && t !== "erase" && start(e, t)}
              onClick={(e) => {
                if (!isTap(e) || disabled) return;
                bbStore.api()?.tapPiece(t);
              }}
            >
              <PieceIcon piece={t} />
              <span className="bb-price">{t === "erase" ? "clear" : `$${COST[t as Piece]}`}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`bb-test ${complete && canAct ? "is-ready" : ""} ${solved ? "is-right" : ""}`}
        data-testid="done"
        data-bb-next={next.kind === "test" && !solved ? "true" : undefined}
        aria-label="Test the bridge"
        aria-disabled={!canAct}
        onClick={() => {
          if (!canAct) return;
          audio.play("tap", { gain: 0.5 });
          bbStore.api()?.test();
        }}
      >
        <TestIcon />
        <span>Test</span>
      </button>
      {ghost}
    </div>
  );
}

