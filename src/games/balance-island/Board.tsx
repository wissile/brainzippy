import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { choicesOf, targetOf } from "../../engine/validation";
import { BagArt, BeamArt, DishArt, FiveArt, HookArt, OneArt, PanArt, PivotArt, StandArt } from "./art";
import {
  type Kind,
  type Pans,
  type Side,
  type Where,
  change,
  describeSide,
  diff,
  equationOptions,
  formatEq,
  formatSide,
  isBalanced,
  isolatedSide,
  move,
  pansOf,
  samePans,
  solveSteps,
  split,
  splitFactor,
  stepNote,
  storyText,
  tiltDeg,
  weight,
  both as onBoth,
} from "./logic";
import { boardStore } from "./store";
import "./balance-island.css";

/**
 * Balance Scale Island play board. A market balance with two pans: mystery bags (x) and 1 kg weights.
 * The child moves items on and off the pans by drag, by tap-then-tap, or by keyboard (Enter picks up, Enter
 * places), or changes both pans at once with the "both sides" buttons. The beam tilts with a damped spring
 * from the TRUE weights, so doing something to one pan only visibly tips the scale; the equation slate
 * writes each balanced state as algebra beside it. The scale is a thinking tool: the answer is chosen in the tray.
 */
type Loc = Where | "shelf";
interface Src {
  from: Loc;
  kind: Kind;
}
interface Drag extends Src {
  x: number;
  y: number;
  startX: number;
  startY: number;
  active: boolean;
}

const PAN_NAME: Record<Where, string> = { l: "left pan", r: "right pan" };
const KIND_ONE: Record<Kind, string> = { x: "mystery bag", n: "1 kilogram weight" };

/** Renders "3x + 2" with an italic variable. */
export function Expr({ s }: { s: Side }) {
  const parts: React.ReactNode[] = [];
  if (s.x > 0) parts.push(<span key="x" className="bi-term">{s.x > 1 && s.x}<i className="bi-var">x</i></span>);
  if (s.x > 0 && s.n > 0) parts.push(<span key="p" className="bi-plus"> + </span>);
  if (s.n > 0 || s.x === 0) parts.push(<span key="n" className="bi-term">{s.n}</span>);
  return <span className="bi-expr">{parts}</span>;
}
/** Renders an equation string ("2(x + 3) = 14") with italic x. */
export function EqText({ text }: { text: string }) {
  return (
    <span className="bi-eqtext">
      {text.split(/(x)/).map((t, i) => (t === "x" ? <i key={i} className="bi-var">x</i> : <span key={i}>{t}</span>))}
    </span>
  );
}

/** Damped spring for the beam angle; writes CSS vars on the scale so beam and pans move in one frame. */
function useBeam(ref: React.RefObject<HTMLDivElement | null>, target: number, reduced: boolean) {
  const s = useRef({ a: 0, v: 0, raf: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = s.current;
    const apply = (a: number) => {
      el.style.setProperty("--tilt", `${a.toFixed(3)}deg`);
      el.style.setProperty("--f", Math.sin((a * Math.PI) / 180).toFixed(5));
    };
    cancelAnimationFrame(st.raf);
    if (reduced) {
      st.a = target;
      st.v = 0;
      apply(target);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - last) / 1000));
      last = now;
      const acc = -70 * (st.a - target) - 8.5 * st.v; // ζ ≈ 0.5: one soft overshoot, then it settles
      st.v += acc * dt;
      st.a += st.v * dt;
      if (Math.abs(st.a - target) < 0.01 && Math.abs(st.v) < 0.05) {
        st.a = target;
        st.v = 0;
        apply(target);
        return;
      }
      apply(st.a);
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(st.raf);
  }, [target, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function BalanceBoard({ st, act: _act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const X = targetOf(ex);
  const p0 = useMemo(() => pansOf(ex.params), [ex.params]);
  const steps = useMemo(() => solveSteps(p0), [p0]);
  const story = ex.params?.story;
  const isStory = story !== undefined;
  const options = useMemo(() => (isStory ? equationOptions(p0, ex.seed) : []), [isStory, p0, ex.seed]);
  const { speaking, reducedMotion } = useApp();

  const [trail, setTrail] = useState<Pans[]>(() => [p0]);
  const pans = trail[trail.length - 1]!;
  const [sel, setSel] = useState<Src | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hot, setHot] = useState<Loc | null>(null);
  const suppressClick = useRef(-Infinity);
  const [translated, setTranslated] = useState(!isStory);
  const [eqOut, setEqOut] = useState<string[]>([]);
  const [eqShake, setEqShake] = useState<string | null>(null);
  const [test, setTest] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);

  const fb = st.feedback;
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const canAct = st.phase === "answering" && translated;
  const modelling = alongIndex >= 0;

  // What the scale shows: an item being dragged off a pan is already lifted (the beam reacts while you hold it).
  const shown = drag?.active && drag.from !== "shelf" ? (change(pans, drag.from, drag.kind, -1) ?? pans) : pans;
  const testBasis = pans.l.x !== pans.r.x ? pans : p0;
  const tiltBasis = test !== null ? testBasis : shown;
  const d = test !== null ? diff(testBasis, test) : diff(shown, X);
  useBeam(scaleRef, translated ? tiltDeg(d) : 0, reducedMotion);
  const balanced = isBalanced(pans, X);
  const shownBalanced = isBalanced(shown, X);
  const alone = balanced ? isolatedSide(pans) : null;
  const g = splitFactor(pans);

  // Algebra log: every distinct balanced state, with what was done to both sides to get there.
  const log = useMemo(() => {
    const out: { p: Pans; note: string }[] = [];
    for (const p of trail) {
      if (!isBalanced(p, X)) continue;
      const last = out[out.length - 1];
      if (last && samePans(last.p, p)) continue;
      out.push({ p, note: last ? stepNote(last.p, p) : "" });
    }
    return out;
  }, [trail, X]);

  // ---------- board → tray ----------
  useEffect(() => boardStore.set({ exId: ex.id, ready: translated }), [ex.id, translated]);
  useEffect(() => () => boardStore.set({ exId: "", ready: true }), []);

  // ---------- spoken cues (never interrupt the runner) ----------
  const cue = useRef({ tilt: false, level: false, alone: false, wasBalanced: true });
  useEffect(() => {
    if (moves === 0 || modelling || celebrate) return;
    const c = cue.current;
    if (!balanced && c.wasBalanced) {
      audio.play("whoosh", { gain: 0.35 });
      if (!c.tilt && !speaking) void audio.speak("bi.tilt");
      c.tilt = true;
    } else if (balanced && !c.wasBalanced) {
      audio.play("star", { gain: 0.4 });
      if (!c.level && !alone && !speaking) void audio.speak("bi.level");
      c.level = true;
    }
    if (alone && !c.alone) {
      c.alone = true;
      audio.play("correct", { gain: 0.35 });
      if (!speaking) void audio.speak("bi.alone");
    }
    c.wasBalanced = balanced;
  }, [trail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- hints ----------
  // First miss: test the wrong answer on the scale (every bag gets that weight; the beam shows it doesn't balance).
  const seq = fb?.seq;
  useEffect(() => {
    if (st.phase === "feedback" && fb && !fb.correct && st.hintStage === 1 && typeof st.lastAnswer === "number") setTest(st.lastAnswer);
    if (st.phase === "feedback" && fb && !fb.correct && st.hintStage === 2) setTest(null);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (test === null || st.phase !== "answering") return;
    const t = window.setTimeout(() => setTest(null), 4000);
    return () => window.clearTimeout(t);
  }, [test, st.phase]);

  // Second miss (model): solve on the scale one balanced step at a time; the final state stays.
  useEffect(() => {
    if (alongIndex < 0) return;
    setTranslated(true);
    setSel(null);
    setTest(null);
    setTrail([p0, ...steps.slice(0, alongIndex + 1).map((s) => s.pans)]);
    audio.play("drop", { gain: 0.5 });
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Correct: show why (finish the solution on the scale if the child answered without isolating the bag).
  useEffect(() => {
    if (!celebrate) return;
    setTest(null);
    setSel(null);
    setTranslated(true);
    if (!isolatedSide(pans) || !balanced) setTrail([p0, ...steps.map((s) => s.pans)]);
  }, [celebrate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- moves ----------
  const commit = (next: Pans | null, sfx: "drop" | "pickup" = "drop") => {
    if (!canAct) return false;
    busy?.();
    setTest(null);
    if (!next || samePans(next, pans)) {
      audio.play("tap", { gain: 0.4 });
      return false;
    }
    setTrail((t) => [...t, next]);
    setMoves((m) => m + 1);
    audio.play(sfx, { gain: 0.6 });
    return true;
  };

  const focusSel = (sel: string) => window.setTimeout(() => (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true }), 0);

  const place = (src: Src, to: Loc, keyboard = false) => {
    setSel(null);
    commit(move(pans, src.from, to, src.kind), to === "shelf" ? "pickup" : "drop");
    if (keyboard) {
      // keep keyboard users where they were working: back on the same pile, or on its pan
      if (src.from !== "shelf") focusSel(`[data-testid="${src.kind === "x" ? "pan-bags" : "pan-weights"}"][data-side="${src.from}"], [data-testid="pan"][data-side="${src.from}"]`);
      else focusSel(`[data-testid="shelf-${src.kind === "x" ? "bag" : "weight"}"]`);
    }
  };

  const select = (src: Src, keyboard: boolean) => {
    if (!canAct) return;
    busy?.();
    setTest(null);
    if (sel && sel.from === src.from && sel.kind === src.kind) return setSel(null);
    setSel(src);
    audio.play("pickup", { gain: 0.45 });
    if (keyboard) focusSel(src.from === "shelf" ? '[data-testid="pan"][data-side="l"]' : `[data-testid="shelf-${src.kind === "x" ? "bag" : "weight"}"]`);
  };

  /** A pile in a pan: picks one up, or (while carrying) puts the carried item on this pan. */
  const onPile = (where: Where, kind: Kind, e: React.MouseEvent) => {
    if (e.timeStamp - suppressClick.current < 80 || !canAct) return;
    const kb = e.detail === 0;
    if (sel && sel.from !== where) return place(sel, where, kb);
    select({ from: where, kind }, kb);
  };
  const onPan = (where: Where, e: React.MouseEvent) => {
    if (e.timeStamp - suppressClick.current < 80 || !canAct || !sel) return;
    if (sel.from === where) return setSel(null);
    place(sel, where, e.detail === 0);
  };
  const onShelf = (kind: Kind, e: React.MouseEvent) => {
    if (e.timeStamp - suppressClick.current < 80 || !canAct) return;
    const kb = e.detail === 0;
    if (sel && sel.from !== "shelf") return place(sel, "shelf", kb);
    select({ from: "shelf", kind }, kb);
  };

  const doBoth = (next: Pans | null) => {
    setSel(null);
    commit(next, "pickup");
  };
  const undo = () => {
    if (!canAct || trail.length < 2) return;
    busy?.();
    setSel(null);
    setTest(null);
    setTrail((t) => t.slice(0, -1));
    audio.play("whoosh", { gain: 0.4 });
  };

  // ---------- pointer drag ----------
  const dropAt = (x: number, y: number): Loc | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const t = el?.closest<HTMLElement>("[data-drop]");
    if (!t || !rootRef.current?.contains(t)) return null;
    return t.dataset.drop as Loc;
  };
  useEffect(() => {
    if (!drag) return;
    const moveH = (e: PointerEvent) => {
      const dd = dragRef.current;
      if (!dd) return;
      const active = dd.active || Math.hypot(e.clientX - dd.startX, e.clientY - dd.startY) > 10;
      if (active && !dd.active) {
        audio.play("pickup", { gain: 0.5 });
        setSel(null);
      }
      const next = { ...dd, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setHot(active ? dropAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const dd = dragRef.current;
      if (dd?.active) {
        suppressClick.current = e.timeStamp;
        const t = e.type === "pointerup" ? dropAt(e.clientX, e.clientY) : null;
        // off a pan onto anything that isn't a pan = back on the market counter
        const to: Loc | null = t === "l" || t === "r" ? t : dd.from === "shelf" ? null : "shelf";
        if (to && to !== dd.from) place(dd, to);
      }
      dragRef.current = null;
      setDrag(null);
      setHot(null);
    };
    window.addEventListener("pointermove", moveH);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", moveH);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null, pans, canAct]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, src: Src) => {
    if (!canAct || e.button !== 0) return;
    busy?.();
    const d0: Drag = { ...src, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false };
    dragRef.current = d0;
    setDrag(d0);
  };

  // ---------- word story: choose the matching equation ----------
  const chooseEq = (text: string, correct: boolean) => {
    if (st.phase !== "answering" || translated || eqOut.includes(text)) return;
    busy?.();
    if (correct) {
      audio.play("correct", { gain: 0.6 });
      setTranslated(true);
      void audio.speak("bi.story.matched");
      focusSel('[data-testid="both-unit"]');
    } else {
      audio.play("retry", { gain: 0.6 });
      setEqOut((o) => [...o, text]);
      setEqShake(text);
      window.setTimeout(() => setEqShake(null), 600);
      void audio.speak("bi.story.retry");
    }
  };
  const eqModel = eqOut.length >= 2;

  // ---------- render ----------
  const carrying = sel !== null || !!drag?.active;
  const tag = test !== null ? `${test}?` : celebrate ? `${X} kg` : undefined;
  const tagState = test !== null ? "test" : "known";
  const visible = log.slice(shownBalanced ? -3 : -2);
  const lastLogged = log[log.length - 1];
  const coach = !!ex.tutorial && canAct && !alone && moves === 0;
  const status = !translated
    ? "Choose the equation that matches the story."
    : shownBalanced
      ? alone
        ? `The scale balances. One mystery bag balances ${pans[alone === "l" ? "r" : "l"].n} kilograms.`
        : "The scale balances."
      : diff(shown, X) > 0
        ? "The left pan is heavier: the scale tips left."
        : "The right pan is heavier: the scale tips right.";

  const cls = [
    "bi-stage",
    celebrate ? "is-celebrating" : "",
    st.phase === "feedback" && fb && !fb.correct ? "is-wrong" : "",
    carrying ? "is-carrying" : "",
    modelling ? "is-modelling" : "",
    translated ? "" : "is-story",
    reducedMotion ? "still" : "",
  ].join(" ");

  const pile = (where: Where) => {
    const s = shown[where];
    const fives = Math.floor(s.n / 5);
    const ones = s.n % 5;
    const isHot = hot === where;
    const target = carrying && sel?.from !== where;
    return (
      <div className={`bi-pan bi-pan-${where} ${isHot ? "is-hot" : ""} ${target ? "is-target" : ""}`} data-drop={where} key={where}>
        <span className="bi-chains"><PanArt /></span>
        <div className="bi-load">
          {s.x > 0 && (
            <button
              type="button"
              className={`bi-pile bi-bags ${sel?.from === where && sel.kind === "x" ? "is-lifted" : ""}`}
              data-testid="pan-bags"
              data-side={where}
              data-count={s.x}
              aria-pressed={sel?.from === where && sel.kind === "x"}
              aria-disabled={!canAct}
              aria-label={sel && sel.from !== where ? `Put the ${KIND_ONE[sel.kind]} on the ${PAN_NAME[where]}` : `${s.x} mystery ${s.x === 1 ? "bag" : "bags"} on the ${PAN_NAME[where]}. Press to pick one up`}
              onPointerDown={(e) => startDrag(e, { from: where, kind: "x" })}
              onClick={(e) => onPile(where, "x", e)}
              onKeyDown={(e) => e.key === "Escape" && setSel(null)}
            >
              {Array.from({ length: s.x }, (_, i) => <span key={i} className="bi-item bi-bag"><BagArt tag={i === 0 ? tag : undefined} tagState={tagState} /></span>)}
            </button>
          )}
          {s.n > 0 && (
            <button
              type="button"
              className={`bi-pile bi-weights ${sel?.from === where && sel.kind === "n" ? "is-lifted" : ""}`}
              data-testid="pan-weights"
              data-side={where}
              data-count={s.n}
              aria-pressed={sel?.from === where && sel.kind === "n"}
              aria-disabled={!canAct}
              aria-label={sel && sel.from !== where ? `Put the ${KIND_ONE[sel.kind]} on the ${PAN_NAME[where]}` : `${s.n} ${s.n === 1 ? "kilogram" : "kilograms"} of weights on the ${PAN_NAME[where]}. Press to pick up 1 kilogram`}
              onPointerDown={(e) => startDrag(e, { from: where, kind: "n" })}
              onClick={(e) => onPile(where, "n", e)}
              onKeyDown={(e) => e.key === "Escape" && setSel(null)}
            >
              {Array.from({ length: fives }, (_, i) => <span key={`f${i}`} className="bi-item bi-five"><FiveArt /></span>)}
              {Array.from({ length: ones }, (_, i) => <span key={`o${i}`} className="bi-item bi-one"><OneArt /></span>)}
            </button>
          )}
        </div>
        <button
          type="button"
          className="bi-dish"
          data-testid="pan"
          data-side={where}
          aria-disabled={!canAct}
          aria-label={sel && sel.from !== where ? `Put the ${KIND_ONE[sel.kind]} on the ${PAN_NAME[where]}` : `The ${PAN_NAME[where]}: ${describeSide(s)}`}
          onClick={(e) => onPan(where, e)}
        >
          <DishArt />
          <span className="bi-chip" aria-hidden="true">{translated ? <Expr s={s} /> : "?"}</span>
        </button>
      </div>
    );
  };

  return (
    <div
      className={cls}
      ref={rootRef}
      data-testid="balance-board"
      data-eq={`${p0.l.x},${p0.l.n},${p0.r.x},${p0.r.n}`}
      data-balanced={String(balanced)}
      data-alone={String(!!alone)}
      data-translated={String(translated)}
      data-moves={moves}
      data-step={alongIndex}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="bi-layout">
      <div className="bi-slate-area">
        {!translated ? (
          <div className="bi-storycard" data-testid="story-card">
            <p className="bi-story-text">{storyText(p0, story ?? 0)}</p>
            <p className="bi-story-ask">Which equation matches the story?</p>
            <div className="bi-eq-options" role="group" aria-label="Equations">
              {options.map((o) => {
                const out = eqOut.includes(o.text);
                const model = eqModel && o.correct;
                return (
                  <button
                    key={o.text}
                    type="button"
                    className={`bi-eq-option ${out ? "is-out" : ""} ${model ? "is-model" : ""} ${eqShake === o.text ? "is-wrong" : ""}`}
                    data-testid="eq-option"
                    data-eq={o.text}
                    aria-disabled={out || st.phase !== "answering"}
                    aria-label={`Choose the equation ${o.text.replace(/(\d)x/g, "$1 x")}`}
                    onClick={() => chooseEq(o.text, o.correct)}
                  >
                    <EqText text={o.text} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bi-slate" data-testid="equation">
            {isStory && <p className="bi-story-mini">{storyText(p0, story ?? 0)}</p>}
            <ol className="bi-work" aria-label="Equation working">
              {visible.map((e, i) => {
                const now = shownBalanced && e === lastLogged;
                return (
                  <li key={log.indexOf(e)} className={`bi-line ${now ? "is-now" : "is-past"} ${i === 0 && log.indexOf(e) > 0 ? "is-fade" : ""}`} data-testid="work-line" data-eq={formatEq(e.p)} data-note={e.note}>
                    <span className="bi-l"><Expr s={e.p.l} /></span>
                    <span className="bi-rel"> = </span>
                    <span className="bi-r"><Expr s={e.p.r} /></span>
                    <span className="bi-note"> {e.note && <><b>{e.note}</b> both sides</>}</span>
                  </li>
                );
              })}
              {!shownBalanced && (
                <li className="bi-line is-tipped" data-testid="tipped" data-eq={`${formatSide(shown.l)} ≠ ${formatSide(shown.r)}`}>
                  <span className="bi-l"><Expr s={shown.l} /></span>
                  <span className="bi-rel"> ≠ </span>
                  <span className="bi-r"><Expr s={shown.r} /></span>
                  <span className="bi-note"><b>tipped</b> {diff(shown, X) > 0 ? "left" : "right"}</span>
                </li>
              )}
              {test !== null && (
                <li className="bi-line is-check" data-testid="check-line">
                  <span className="bi-l">{weight(tiltBasis.l, test)}</span>
                  <span className="bi-rel">{weight(tiltBasis.l, test) === weight(tiltBasis.r, test) ? "=" : "≠"}</span>
                  <span className="bi-r">{weight(tiltBasis.r, test)}</span>
                  <span className="bi-note">if <i className="bi-var">x</i> = <b>{test}</b></span>
                </li>
              )}
            </ol>
          </div>
        )}
      </div>

      <div className="bi-scale-area">
        <div className={`bi-scale ${shownBalanced && translated ? "is-level" : ""} ${alone ? "is-alone" : ""}`} ref={scaleRef} data-testid="scale" data-tilt={Math.sign(d) * -1}>
          <span className="bi-stand"><StandArt /></span>
          <span className="bi-beam"><BeamArt /><span className="bi-hook l"><HookArt /></span><span className="bi-hook r"><HookArt /></span></span>
          <span className="bi-pivot"><PivotArt /></span>
          <span className={`bi-level-mark ${shownBalanced && translated ? "on" : ""}`} aria-hidden="true">{shownBalanced ? "=" : "≠"}</span>
          {pile("l")}
          {pile("r")}
        </div>
      </div>

      <div className="bi-tools">
        <div className={`bi-shelf ${hot === "shelf" ? "is-hot" : ""} ${carrying && sel?.from !== "shelf" ? "is-target" : ""}`} data-drop="shelf" role="group" aria-label="Market counter">
          <button
            type="button"
            className={`bi-src ${sel?.from === "shelf" && sel.kind === "x" ? "is-lifted" : ""}`}
            data-testid="shelf-bag"
            aria-pressed={sel?.from === "shelf" && sel.kind === "x"}
            aria-disabled={!canAct}
            aria-label={sel && sel.from !== "shelf" ? `Put the ${KIND_ONE[sel.kind]} back on the counter` : "Spare mystery bag. Press to pick it up"}
            onPointerDown={(e) => startDrag(e, { from: "shelf", kind: "x" })}
            onClick={(e) => onShelf("x", e)}
            onKeyDown={(e) => e.key === "Escape" && setSel(null)}
          >
            <span className="bi-src-art"><BagArt /></span>
          </button>
          <button
            type="button"
            className={`bi-src ${sel?.from === "shelf" && sel.kind === "n" ? "is-lifted" : ""}`}
            data-testid="shelf-weight"
            aria-pressed={sel?.from === "shelf" && sel.kind === "n"}
            aria-disabled={!canAct}
            aria-label={sel && sel.from !== "shelf" ? `Put the ${KIND_ONE[sel.kind]} back on the counter` : "Spare 1 kilogram weight. Press to pick it up"}
            onPointerDown={(e) => startDrag(e, { from: "shelf", kind: "n" })}
            onClick={(e) => onShelf("n", e)}
            onKeyDown={(e) => e.key === "Escape" && setSel(null)}
          >
            <span className="bi-src-art"><OneArt /></span>
          </button>
        </div>
        <div className="bi-both" role="group" aria-label="Do the same to both pans">
          <button type="button" className={`bi-op ${coach ? "is-coach" : ""}`} data-testid="both-unit" aria-disabled={!canAct || pans.l.n < 1 || pans.r.n < 1} aria-label="Take 1 kilogram off both pans" onClick={() => canAct && pans.l.n > 0 && pans.r.n > 0 && doBoth(onBoth(pans, "n", -1))}>
            <b>−1</b><small>both</small>
          </button>
          <button type="button" className="bi-op" data-testid="both-bag" aria-disabled={!canAct || pans.l.x < 1 || pans.r.x < 1} aria-label="Take 1 mystery bag off both pans" onClick={() => canAct && pans.l.x > 0 && pans.r.x > 0 && doBoth(onBoth(pans, "x", -1))}>
            <b>−<i className="bi-var">x</i></b><small>both</small>
          </button>
          <button type="button" className="bi-op" data-testid="both-split" data-k={g} aria-disabled={!canAct || g < 2} aria-label={g >= 2 ? `Split both pans into ${g} equal groups and keep one` : "Split both pans into equal groups (not possible yet)"} onClick={() => canAct && g >= 2 && doBoth(split(pans, g))}>
            <b>÷{g >= 2 ? g : ""}</b><small>both</small>
          </button>
          <button type="button" className="bi-op bi-undo" data-testid="undo" aria-disabled={!canAct || trail.length < 2} aria-label="Undo the last move" onClick={undo}>
            <b aria-hidden="true">↶</b><small>undo</small>
          </button>
        </div>
      </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Left pan: {describeSide(shown.l)}. Right pan: {describeSide(shown.r)}. {status}
        {test !== null ? ` If x were ${test}, the left pan would be ${weight(tiltBasis.l, test)} and the right pan ${weight(tiltBasis.r, test)}.` : ""}
      </p>

      {drag?.active && (
        <div className="bi-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {drag.kind === "x" ? <BagArt /> : <OneArt />}
        </div>
      )}
    </div>
  );
}

/** Answer pills: "x = 4". On word stories they wait until the story has been matched to its equation. */
export function BalanceTray({ st, act }: BoardProps) {
  const status = useSyncExternalStore(boardStore.subscribe, boardStore.get);
  const ex = st.exercise;
  const ready = status.exId !== ex.id || status.ready;
  const fb = st.feedback;
  return (
    <div className={`choice-tray bi-answers ${ready ? "" : "is-waiting"}`} role="group" aria-label="What does one bag weigh? Choose x">
      <span className="bi-ans-label" aria-hidden="true"><i className="bi-var">x</i> =</span>
      {choicesOf(ex).map((c, i) => {
        const disabled = !ready || st.eliminated.includes(c) || st.phase !== "answering";
        const isModel = st.model === c && st.phase === "answering";
        const state = st.phase === "feedback" && st.lastAnswer === c ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" && c === targetOf(ex) ? "is-right" : "";
        return (
          <button
            key={c}
            type="button"
            className={`choice bi-pill ${state} ${isModel ? "is-model" : ""} ${st.eliminated.includes(c) ? "is-out" : ""}`}
            style={{ animationDelay: `${i * 70}ms` }}
            data-testid="choice"
            data-value={c}
            aria-label={ready ? `x equals ${c}: one bag weighs ${c} kilograms` : `x equals ${c} (match the story first)`}
            aria-disabled={disabled}
            onClick={() => !disabled && act({ type: "SUBMIT", value: c })}
          >
            <span className="numeral">{c}</span>
            <span className="bi-kg">kg</span>
          </button>
        );
      })}
    </div>
  );
}

/** Worked-example steps for the runner (model hint): one per balanced solving step. */
export const modelSteps = (ex: { params?: Readonly<Record<string, number>> }) => Math.max(1, solveSteps(pansOf(ex.params)).length);
