import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import {
  BOARD_VIEW, CR, CompassRose, FieldDecor, Leaf, PlaneTop, RUNWAY_HALF, RunwayArt, SockSide, SockTop, TurnArc, WindStreaks,
} from "./art";
import {
  GAME_NAME, type Kind, type Mode, POINT_NAME, type Point, STRENGTH_ID, STRENGTH_TEXT, airportEnds, angleDiff, answerFor, decode, entryOf,
  fmtHeading, fmtRunway, headingFromVector, modeOf, norm, reciprocal, runwayHeading, runwayNumber, sockPoints, stepValue, typedValue, vec,
  working, wraps,
} from "./logic";
import { TOWER_KNOTS } from "./generator";
import "./compass-runways.css";

/**
 * Compass Rose Runways play board: the airfield from above with a giant compass rose (left/top) and a deck (right/bottom).
 *
 *  Windsock Reader   read the sock (side view for strength; on the rose for direction) → tap an answer in the deck
 *  Runway Painter    paint: enter the number (− / + steppers, keypad, digit or arrow keys) → Check
 *                    rotate: drag around the rose to turn the runway (snaps to 10°), or the turn buttons / arrow keys → Check
 *  Heading Turns     drag the plane's nose round the rose (snaps to 5°), or −10 −1 +1 +10 / keypad / keys → Check
 *  Into the Wind     tap a runway end on the map (each end is a labelled button) · headwind/crosswind/tailwind in the deck
 *  Tower Talk        a radio call in the deck; answer on the map (runway ends) or in the deck (headings, wind)
 *
 * Hints: first miss → Gloop explains (diagnosed); the board adds the strategy: a leaf blows from the wind's source, the
 * turn's direction arc and "360 = 0" glow, the two nearest tens light up, the 180° arc between runway ends.
 * Second miss → the modelled answer: the worked steps appear in the deck, the dial/number is set (errorless: only Check
 * is live), the right option or runway end glows and a ghost plane lands on it. Reduced motion: no glides or spins.
 */

const SNAP: Partial<Record<Kind, number>> = { rotate: 10, quarter: 5, turn: 5, wrap: 5 };
const DIAL_KINDS: Kind[] = ["rotate", "quarter", "turn", "wrap"];
const MAP_CHOICE: Kind[] = ["two", "four", "twind", "tjoin"];

/** Rotation that moves the shortest way between headings (so 350 → 010 turns 20°, not 340°). */
function useUnwrapped(h: number): number {
  const ref = useRef(h);
  const prev = ref.current;
  let d = ((h - prev) % 360 + 540) % 360 - 180;
  if (d === -180) d = 180;
  ref.current = prev + d;
  return ref.current;
}

const pct = (v: number) => `${(v + 500) / 10}%`;

export function CompassBoard({ st, act, busy }: BoardProps) {
  const ex = st.exercise;
  const s = useMemo(() => decode(ex), [ex]);
  const mode: Mode = modeOf(s);
  const entry = entryOf(s.kind);
  const right = useMemo(() => answerFor(s), [s]);
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrongNow = st.phase === "feedback" && !st.feedback?.correct;
  const hinted = st.hintStage >= 1;
  const modelShown = st.hintStage >= 2;
  const dial = DIAL_KINDS.includes(s.kind);

  // ---------- number entry ----------
  const [value, setValue] = useState<number | null>(dial ? s.h : null);
  const [digits, setDigits] = useState("");
  const [say, setSay] = useState("");
  const [landing, setLanding] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (modelShown && typeof st.model === "number") {
      setValue(st.model);
      setDigits("");
      setSay(`Here is the working. The answer is set to ${entry === "runway" ? fmtRunway(st.model) : `${fmtHeading(st.model)} degrees`}. Press Check.`);
    }
  }, [modelShown]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = !canAct || modelShown;
  const describe = (v: number) => (entry === "runway" ? `Number ${fmtRunway(v)}` : s.kind === "rotate" ? `Runway arrow points ${fmtHeading(v)} degrees` : `Heading ${fmtHeading(v)}`);
  const setTo = (v: number, quiet = false) => {
    setValue(v);
    setDigits("");
    if (!quiet) setSay(describe(v));
    busy?.();
  };
  const step = (by: number) => {
    if (locked || !entry) return;
    audio.play("tap", { gain: 0.35 });
    setTo(stepValue(entry, value, by));
  };
  const typeDigit = (k: string) => {
    if (locked || !entry) return;
    const max = entry === "runway" ? 2 : 3;
    let buf = digits.length >= max ? k : digits + k;
    if (typedValue(entry, buf) === null && buf.length === max) buf = k;
    audio.play("tap", { gain: 0.3 });
    setDigits(buf);
    const v = typedValue(entry, buf);
    if (v !== null) {
      setValue(v);
      setSay(describe(v));
    }
    busy?.();
  };
  const backspace = () => {
    if (locked || !entry) return;
    const buf = digits.slice(0, -1);
    setDigits(buf);
    if (buf === "") setValue(dial ? value : null);
    else {
      const v = typedValue(entry, buf);
      if (v !== null) setValue(v);
    }
  };
  const check = () => {
    if (!canAct || value === null || !entry) return;
    if (modelShown && value !== st.model) return;
    busy?.();
    setDigits("");
    act({ type: "SUBMIT", value });
  };

  // ---------- choices ----------
  const isOut = (id: string) => st.eliminated.includes(id);
  const choose = (id: string) => {
    if (!canAct || isOut(id)) return;
    if (modelShown && id !== st.model) return;
    busy?.();
    if (id === right && MAP_CHOICE.includes(s.kind) && id.startsWith("rw")) setLanding(Number(id.slice(2)));
    act({ type: "SUBMIT", value: id });
  };
  const optClass = (id: string) =>
    `${isOut(id) ? "is-out" : ""} ${modelShown && canAct && id === st.model ? "is-model" : ""} ${wrongNow && st.lastAnswer === id ? "is-wrong" : ""} ${solved && st.lastAnswer === id ? "is-right" : ""}`;

  // ---------- keyboard ----------
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (!entry || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    const onButton = target?.tagName === "BUTTON";
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      typeDigit(e.key);
      return;
    }
    const big = entry === "heading" && !e.shiftKey ? 10 : 1;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        e.preventDefault();
        step(big);
        return;
      case "ArrowDown":
      case "ArrowLeft":
        e.preventDefault();
        step(-big);
        return;
      case "PageUp":
        e.preventDefault();
        step(10);
        return;
      case "PageDown":
        e.preventDefault();
        step(-10);
        return;
      case "Backspace":
        e.preventDefault();
        backspace();
        return;
      case "Enter":
        if (onButton) return; // the focused button acts itself
        e.preventDefault();
        check();
        return;
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ---------- dial drag (rotate the runway / the plane's nose) ----------
  const pointHeading = (e: { clientX: number; clientY: number }) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return null;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.06) return null; // too close to the centre to read an angle
    return headingFromVector(dx, dy, SNAP[s.kind] ?? 5);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!dial || locked) return;
    const h = pointHeading(e);
    if (h === null) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    audio.play("pickup", { gain: 0.3 });
    setTo(h, true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || locked) return;
    const h = pointHeading(e);
    if (h !== null && h !== value) setTo(h, true);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    audio.play("drop", { gain: 0.3 });
    if (value !== null) setSay(describe(value));
  };

  // ---------- after a miss: keep the child's value; clear the landing ----------
  const phase = st.phase;
  const prevPhase = useRef(phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (was === "feedback" && phase === "answering") setLanding(null);
    if (phase === "solved" || (phase === "feedback" && st.feedback?.correct)) {
      if (entry === "runway" && value !== null) setSay(`Painted ${fmtRunway(value)}.`);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- the scene ----------
  const shownVal = value ?? null;
  const angle = useUnwrapped(dial && shownVal !== null ? shownVal : s.h);
  const ends = airportEnds(s);
  const leafFrom = mode === "sock" || s.kind === "two" || s.kind === "four" || s.kind === "xwind" ? s.w : s.kind === "twind" || s.kind === "tcomp" ? s.w : null;
  const showLeaf = hinted && !solved && leafFrom !== null && s.kind !== "strength";
  const sockSpot = useMemo(() => {
    const hs = ends.map(runwayHeading);
    const cands = [45, 135, 225, 315, 0, 90, 180, 270];
    let best = 45, bestD = -1;
    for (const c of cands) {
      const d = Math.min(...hs.map((h) => angleDiff(c, h)));
      if (d > bestD) { best = c; bestD = d; }
    }
    const [x, y] = vec(best);
    return { x: x * 250, y: y * 250 };
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const labels: "thirty" | "ten" = ["ten", "round", "rotate", "turn", "wrap"].includes(s.kind) ? "ten" : "thirty";
  const glow: number[] = [];
  if (hinted && !solved) {
    if (s.kind === "round") glow.push(Math.floor(s.h / 10) * 10 || 360, Math.ceil(s.h / 10) * 10);
    if (s.kind === "card" || s.kind === "ten") glow.push(norm(s.h));
  }
  if (modelShown && (mode === "sock" && s.kind !== "strength")) glow.push(s.w);
  const northGlow = hinted && !solved && (s.kind === "wrap" || s.kind === "quarter" || s.kind === "turn") && wraps(s.h, s.dir, s.d);

  const scene = (() => {
    if (s.kind === "strength") {
      return (
        <svg viewBox={BOARD_VIEW} className="cr-svg" role="img" aria-label={ex.a11yDescription}>
          <rect x="-500" y="-500" width="1000" height="1000" fill="#BFE6FA" />
          <rect x="-500" y="300" width="1000" height="200" fill={CR.grass} />
          <g transform="translate(-60 0)"><SockSide strength={s.s} flip={sockPoints(s.w) > 180} /></g>
          {modelShown && canAct && <text x="0" y="-420" textAnchor="middle" className="cr-svg-note">{STRENGTH_TEXT[STRENGTH_ID[s.s]]}</text>}
        </svg>
      );
    }
    return (
      <svg viewBox={BOARD_VIEW} className="cr-svg" role="img" aria-label={ex.a11yDescription}>
        <FieldDecor />
        {(s.kind === "two" || s.kind === "four" || s.kind === "xwind") && <WindStreaks from={s.w} still={reducedMotion} />}
        <CompassRose labels={labels} glowHeadings={glow} northGlow={northGlow} />
        {/* --- runways --- */}
        {(s.kind === "card" || s.kind === "ten" || s.kind === "round") && (
          <>
            <RunwayArt h={s.h} near={shownVal} far={null} arrow nearClass={solved ? "is-fresh" : "is-preview"} testId="cr-runway" />
            <PlaneTop h={s.h} x={-vec(s.h)[0] * (RUNWAY_HALF + 110)} y={-vec(s.h)[1] * (RUNWAY_HALF + 110)} scale={0.5} />
          </>
        )}
        {s.kind === "opp" && (
          <>
            {hinted && !solved && <TurnArc from={s.h} deg={180} dir={1} r={200} arrow={false} className="is-hint" />}
            <RunwayArt h={norm(s.h + 180)} near={shownVal} far={runwayNumber(s.h)} arrow nearClass={solved ? "is-fresh" : "is-preview"} testId="cr-runway" />
            <PlaneTop h={norm(s.h + 180)} x={-vec(s.h + 180)[0] * (RUNWAY_HALF + 110)} y={-vec(s.h + 180)[1] * (RUNWAY_HALF + 110)} scale={0.5} />
          </>
        )}
        {s.kind === "rotate" && (
          <>
            {modelShown && canAct && <RunwayArt h={runwayHeading(s.n)} near={s.n} far={reciprocal(s.n)} ghost />}
            <g className={`cr-spin ${reducedMotion || dragging ? "is-instant" : ""}`} style={{ transform: `rotate(${angle}deg)` }}>
              <RunwayArt h={360} near={s.n} far={reciprocal(s.n)} arrow nearClass={hinted && !solved ? "is-pulse" : ""} testId="cr-runway" />
            </g>
          </>
        )}
        {(s.kind === "two" || s.kind === "four" || s.kind === "twind" || s.kind === "tjoin") && (
          <>
            <RunwayArt h={runwayHeading(s.a)} near={s.a} far={reciprocal(s.a)} />
            {s.b > 0 && <RunwayArt h={runwayHeading(s.b)} near={s.b} far={reciprocal(s.b)} />}
          </>
        )}
        {(s.kind === "xwind" || s.kind === "tcomp" || s.kind === "tline") && (
          <RunwayArt h={runwayHeading(s.kind === "tline" ? s.n : s.a)} near={s.kind === "tline" ? s.n : s.a} far={reciprocal(s.kind === "tline" ? s.n : s.a)} />
        )}
        {/* --- windsocks --- */}
        {(s.kind === "from4" || s.kind === "from8" || s.kind === "fromDeg") && <SockTop to={sockPoints(s.w)} strength={s.s} scale={1.45} idle />}
        {(s.kind === "two" || s.kind === "four" || s.kind === "xwind") && <SockTop to={sockPoints(s.w)} strength={s.s} x={sockSpot.x} y={sockSpot.y} scale={0.75} idle />}
        {/* --- comparing wind and runway (hint) --- */}
        {(s.kind === "xwind" || s.kind === "tcomp") && hinted && !solved && (
          <TurnArc from={s.h} deg={angleDiff(s.h, s.w)} dir={norm(s.w - s.h) <= 180 ? 1 : -1} r={170} arrow={false} className="is-hint" />
        )}
        {/* --- planes --- */}
        {(s.kind === "xwind" || s.kind === "tcomp") && (
          <PlaneTop h={s.h} x={-vec(s.h)[0] * (RUNWAY_HALF + 105)} y={-vec(s.h)[1] * (RUNWAY_HALF + 105)} scale={0.55} />
        )}
        {(s.kind === "quarter" || s.kind === "turn" || s.kind === "wrap") && (
          <>
            {hinted && !modelShown && !solved && <TurnArc from={s.h} deg={Math.min(40, s.d)} dir={s.dir} r={330} className="is-hint" />}
            {modelShown && <TurnArc from={s.h} deg={s.d} dir={s.dir} r={330} />}
            <PlaneTop h={s.h} ghost scale={1.05} className="is-was" />
            <g className={`cr-spin ${reducedMotion || dragging ? "is-instant" : ""}`} style={{ transform: `rotate(${angle}deg)` }}>
              <g data-cr-idle="true"><PlaneTop h={360} scale={1.05} className={solved ? "is-go" : ""} testId="cr-plane" /></g>
            </g>
          </>
        )}
        {showLeaf && leafFrom !== null && (
          <g transform={`rotate(${norm(leafFrom + 180) % 360})`} className="cr-leaf-path">
            <line x1="0" y1="430" x2="0" y2="-380" stroke="#fff" strokeWidth="6" strokeDasharray="4 18" strokeLinecap="round" opacity="0.9" />
            <g className={reducedMotion ? "cr-leaf-still" : "cr-leaf-fly"}><Leaf /></g>
          </g>
        )}
        {/* --- landing (right runway end chosen, or the modelled end) --- */}
        {(landing !== null || (modelShown && canAct && MAP_CHOICE.includes(s.kind) && typeof st.model === "string")) && (() => {
          const e = landing ?? Number(String(st.model).slice(2));
          const h = runwayHeading(e);
          const [vx, vy] = vec(h);
          const tx = -vx * (RUNWAY_HALF - 150), ty = -vy * (RUNWAY_HALF - 150);
          return (
            <g className={`cr-landing ${reducedMotion ? "is-still" : ""} ${landing === null ? "is-ghost-loop" : ""}`} style={{ "--fx": `${-vx * 330}px`, "--fy": `${-vy * 330}px` } as React.CSSProperties}>
              <PlaneTop h={h} x={tx} y={ty} scale={0.62} ghost={landing === null} />
            </g>
          );
        })()}
      </svg>
    );
  })();

  // runway-end buttons on the map
  const mapButtons = MAP_CHOICE.includes(s.kind) && ex.answer.kind === "choice"
    ? ex.answer.options.map((o) => {
        const n = Number(o.id.slice(2));
        const [vx, vy] = vec(runwayHeading(n));
        const r = RUNWAY_HALF + 76;
        return (
          <button
            key={o.id}
            type="button"
            className={`cr-end-btn ${optClass(o.id)}`}
            style={{ left: pct(-vx * r), top: pct(-vy * r) }}
            data-testid="choice"
            data-value={o.id}
            aria-label={`Land on runway ${o.text}`}
            aria-disabled={!canAct || isOut(o.id) || (modelShown && o.id !== st.model)}
            onClick={() => choose(o.id)}
          >
            {o.text}
          </button>
        );
      })
    : null;

  // readout chips on the map
  const chip = (() => {
    if (s.kind === "card" || s.kind === "ten" || s.kind === "round") return `Landing heading ${fmtHeading(s.h)}°`;
    if (s.kind === "opp") return `Other end: heading ${fmtHeading(s.h + 180)}°`;
    if (s.kind === "rotate") return `Arrow points ${fmtHeading(shownVal ?? s.h)}°`;
    if (mode === "turn") return `Was ${fmtHeading(s.h)}° · now ${fmtHeading(shownVal ?? s.h)}°`;
    if (s.kind === "two" || s.kind === "four" || s.kind === "xwind") return `Wind from ${fmtHeading(s.w)}° · ${s.s === 2 ? "strong" : "light"}`;
    return null;
  })();

  // ---------- the deck ----------
  const steps = modelShown ? working(s) : null;
  const deck = (() => {
    if (entry) {
      const shown = digits !== "" ? digits.padStart(entry === "runway" ? 2 : 3, "·") : value === null ? (entry === "runway" ? "--" : "---") : entry === "runway" ? fmtRunway(value) : fmtHeading(value);
      const stepsBy = entry === "runway" ? [-1, 1] : [-10, -1, 1, 10];
      const stepLabel = (by: number) =>
        entry === "runway" ? `Number ${by > 0 ? "up" : "down"} one`
          : s.kind === "rotate" ? `Turn the runway ${Math.abs(by)} degrees ${by > 0 ? "clockwise" : "anticlockwise"}`
            : `Heading ${by > 0 ? "plus" : "minus"} ${Math.abs(by)}`;
      return (
        <div className={`cr-entry is-${entry}`}>
          <div className={`cr-display ${wrongNow ? "is-wrong" : ""} ${solved ? "is-right" : ""} ${modelShown && canAct ? "is-model" : ""}`} data-testid="cr-display" data-value={value ?? ""} aria-hidden="true">
            <span className="cr-display-label">{entry === "runway" ? "Runway" : s.kind === "rotate" ? "Arrow" : "Heading"}</span>
            <span className="cr-display-num">{shown}</span>
            {entry === "heading" && <span className="cr-display-unit">°</span>}
          </div>
          <div className="cr-steps">
            {stepsBy.map((by) => (
              <button key={by} type="button" className="cr-step" data-testid="cr-step" data-by={by} aria-label={stepLabel(by)} aria-disabled={locked} onClick={() => step(by)}>
                {by > 0 ? "+" : "−"}{Math.abs(by)}
              </button>
            ))}
          </div>
          {!modelShown && (
            <div className="cr-keypad" role="group" aria-label="Number keys">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((k) => (
                <button key={k} type="button" className="cr-key" data-testid="cr-key" data-key={k} aria-label={`Type ${k}`} aria-disabled={locked} onClick={() => typeDigit(k)}>{k}</button>
              ))}
              <button type="button" className="cr-key is-back" data-testid="cr-key" data-key="back" aria-label="Delete the last digit" aria-disabled={locked} onClick={backspace}>⌫</button>
            </div>
          )}
          {steps && <Working steps={steps} />}
          <button type="button" className={`cr-check ${value !== null && canAct ? "is-ready" : ""} ${solved ? "is-right" : ""}`} data-testid="done" aria-label={entry === "runway" ? "Check the runway number" : "Check the heading"} aria-disabled={!canAct || value === null || (modelShown && value !== st.model)} onClick={check}>
            Check
          </button>
        </div>
      );
    }
    const radio = mode === "tower" ? <RadioCard s={s} hinted={hinted && !modelShown && !solved} /> : null;
    const deckOptions = !MAP_CHOICE.includes(s.kind) && ex.answer.kind === "choice" ? ex.answer.options : [];
    const ariaFor = (id: string, text: string) =>
      mode === "sock" && s.kind !== "strength" ? `Wind from ${s.kind === "fromDeg" ? `${text.replace("°", "")} degrees` : POINT_NAME[id as Point] ?? text}`
        : s.kind === "strength" ? `The wind is ${text.toLowerCase()}`
          : s.kind === "tline" ? `Fly heading ${text.replace("°", "")}`
            : `It's a ${text.toLowerCase()}`;
    return (
      <div className="cr-choices">
        {radio}
        {(s.kind === "two" || s.kind === "four") && <p className="cr-deck-note">Tap the runway end the plane should land on.</p>}
        {(s.kind === "twind" || s.kind === "tjoin") && <p className="cr-deck-note">Tap a runway end on the map.</p>}
        {deckOptions.length > 0 && (
          <div className={`cr-opts n${deckOptions.length} ${s.kind === "from4" ? "is-compass" : ""}`}>
            {deckOptions.map((o) => (
              <button key={o.id} type="button" className={`cr-opt opt-${o.id} ${optClass(o.id)}`} data-testid="choice" data-value={o.id} aria-label={ariaFor(o.id, o.text ?? o.id)}
                aria-disabled={!canAct || isOut(o.id) || (modelShown && o.id !== st.model)} onClick={() => choose(o.id)}>
                {o.text}
              </button>
            ))}
          </div>
        )}
        {steps && <Working steps={steps} />}
      </div>
    );
  })();

  const testAttrs: Record<string, string | number> = {
    "data-kind": s.kind, "data-mode": mode, "data-h": s.h, "data-n": s.n, "data-d": s.d, "data-dir": s.dir, "data-w": s.w, "data-s": s.s,
    "data-ends": ends.join(","),
  };
  return (
    <div className={`cr-stage mode-${mode} kind-${s.kind} ${solved ? "is-solved" : ""} ${modelShown ? "is-modelled" : ""}`} data-testid="cr-board" {...testAttrs}>
      <div className="cr-layout">
        <div className="cr-scene">
          <div
            className={`cr-frame ${dial && !locked ? "is-dial" : ""}`}
            ref={frameRef}
            data-testid="cr-frame"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {scene}
            {mapButtons}
            {chip && <span className="cr-chip" data-testid="cr-chip">{chip}</span>}
            {wrongNow && MAP_CHOICE.includes(s.kind) && <span className="cr-goaround" aria-hidden="true">Go around!</span>}
          </div>
        </div>
        <div className="cr-deck">
          <div className="cr-badge" aria-hidden="true"><span className={`cr-badge-dot game-${mode}`} />{GAME_NAME[mode]}</div>
          {deck}
        </div>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="cr-say">{say}</p>
    </div>
  );
}

function Working({ steps }: { steps: string[] }) {
  return (
    <ol className="cr-working" data-testid="cr-working" aria-label="Worked steps">
      {steps.map((t, i) => <li key={i} style={{ "--i": i } as React.CSSProperties}>{t}</li>)}
    </ol>
  );
}

/** The tower's radio call (Tower Talk). The first miss breaks the call into steps. */
function RadioCard({ s, hinted }: { s: ReturnType<typeof decode>; hinted: boolean }) {
  const call = (() => {
    switch (s.kind) {
      case "twind": return `Wind ${fmtHeading(s.w)} at ${TOWER_KNOTS}.`;
      case "tline": return `Cleared to land, runway ${fmtRunway(s.n)}.`;
      case "tjoin": return `Fly heading ${fmtHeading(s.h)}, then turn ${s.dir === 1 ? "right" : "left"} ${s.d}°.`;
      case "tcomp": return `Runway ${fmtRunway(runwayNumber(s.h))}, wind ${fmtHeading(s.w)} at ${TOWER_KNOTS}.`;
      default: return "";
    }
  })();
  const tips = (() => {
    switch (s.kind) {
      case "twind": return [`Wind comes FROM ${fmtHeading(s.w)}°`, "Find the runway end facing that way"];
      case "tline": return [`Runway ${fmtRunway(s.n)} = heading without its last zero`, "Put the zero back"];
      case "tjoin": return [`${s.dir === 1 ? "Right: add" : "Left: take away"} ${s.d}°`, "Heading ÷ 10 = runway number"];
      case "tcomp": return ["Compare the wind with the runway heading", "Along = headwind · across = crosswind"];
      default: return [];
    }
  })();
  return (
    <div className="cr-radio" data-testid="cr-radio">
      <div className="cr-radio-head"><span className="cr-radio-led" aria-hidden="true" />Sky School Tower</div>
      <p className="cr-radio-call">“{call}”</p>
      {s.kind === "tjoin" && (
        <svg viewBox="-60 -60 120 120" className="cr-radio-plane" aria-hidden="true">
          <circle r="54" fill="#fff" stroke={CR.ink} strokeWidth="3" />
          {hinted && <TurnArc from={s.h} deg={s.d} dir={s.dir} r={42} arrow />}
          <g transform="scale(0.32)"><PlaneTop h={s.h} /></g>
        </svg>
      )}
      {hinted && (
        <ol className="cr-radio-tips" data-testid="cr-tips">
          {tips.map((t) => <li key={t}>{t}</li>)}
        </ol>
      )}
    </div>
  );
}

export function CompassTray() {
  return <span aria-hidden="true" />;
}
