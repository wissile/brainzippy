import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import {
  ArrowGlyph, AxisIcon, ForceArrows, ForceDiagram, ForceLegend, HoopRing, HoopSparkle, PartIcon, PedalArt, PlaneShape, Runway,
  SCENE_VIEW, SceneClouds, StickKnob, arrowScreen,
} from "./art";
import { CAMERAS, type ForceId, type PartId, type Pose, REST, type Track, VIEW_H, VIEW_W, hoopOnTrack, pastHoop, poseAt } from "./flight";
import {
  AXIS_NAME, AXIS_PART, type Axis, CTL_AXIS, CTL_LABEL, CTL_SHORT, CTL_TEXT, type Ctl, DIAGRAM_FORCES, DIAGRAM_TEXT, type Diagram,
  FORCE_NAME, HOOP_CTL, PART_NAME, type Stick, STICKS, bob, correctFor, decode, demoCtl, demoPose, flyAwayPose, forcePose,
  isArrowTemplate, isPedal, sceneOf,
} from "./logic";
import "./sky-hoops.css";

/**
 * Zephy's Sky Hoops play board: the sky (3D plane, hoops, runway or force arrows) and the control deck.
 *
 *  hoop / line / turn   press a control → Zephy's plane flies the result (through the hoop or gently beside it) →
 *                       then the answer is checked. Controls: drag the stick knob (snaps to 4 directions), tap a
 *                       stick arrow or pedal, or keys: ↑ push forward · ↓ pull back · ← → stick left/right · Q/E pedals.
 *  course               the same controls add moves to a 3-slot plan (Backspace / Undo removes one), then Fly.
 *  name / part          watch a move (Watch again replays it), then choose pitch/roll/yaw or elevator/ailerons/rudder.
 *  force                choose a forces picture (the plane then shows what those forces would do) or tap an arrow.
 *
 * Hints: first miss → the plane has shown the miss, Bobbo explains the idea, the wrong control greys out.
 * Second miss (model) → a see-through ghost plane flies the right way (on a loop), the right control glows and
 * the control surface it moves lights up on the plane. With reduced motion the ghost holds its final pose.
 */

type Anim =
  | { kind: "fly"; track: Track; t0: number; ms: number; value: Ctl | Ctl[]; still: boolean }
  | { kind: "demo"; ctl: Ctl; t0: number; ms: number }
  | { kind: "away"; t0: number; ms: number }
  | { kind: "force"; d: Diagram; t0: number; ms: number; value: string };

const KEY_CTL: Record<string, Ctl> = { ArrowUp: "fwd", ArrowDown: "back", ArrowLeft: "left", ArrowRight: "right", q: "lpedal", Q: "lpedal", e: "rpedal", E: "rpedal" };
const EFFECT: Record<Ctl, string> = {
  back: "The nose pitched up",
  fwd: "The nose pitched down",
  left: "The wings rolled left",
  right: "The wings rolled right",
  lpedal: "The nose yawed left",
  rpedal: "The nose yawed right",
};
const DEMO_MS = 2300;

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const tick = () => {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);
  return now;
}

export function SkyBoard({ st, act, busy }: BoardProps) {
  const ex = st.exercise;
  const s = useMemo(() => decode(ex), [ex]);
  const scene = useMemo(() => sceneOf(s), [s]);
  const right = useMemo(() => correctFor(s), [s]);
  const { reducedMotion } = useApp();
  const canAct = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const modelShown = st.hintStage >= 2;
  const scaffold = ex.params?.scaffold === 1;
  const cam = scene.camera;

  const [anim, setAnim] = useState<Anim | null>(null);
  const [ended, setEnded] = useState<Anim | null>(null);
  const [plan, setPlan] = useState<(Stick | null)[]>([null, null, null]);
  const [held, setHeld] = useState<Ctl | null>(null);
  const [say, setSay] = useState("");
  const [hotForce, setHotForce] = useState<ForceId | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number; dx: number; dy: number; size: number } | null>(null);
  const [respawn, setRespawn] = useState(0);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const animRef = useRef(anim);
  animRef.current = anim;
  const endRef = useRef<() => void>(() => undefined);

  const looping = !reducedMotion && (modelShown || (!anim && !ended && ["hoop", "line", "turn", "course", "force"].includes(s.mode)));
  const now = useNow(anim !== null || looping);
  const f = anim ? Math.min(1, (now - anim.t0) / anim.ms) : 1;

  // finish an animation exactly once
  useEffect(() => {
    if (!anim || f < 1) return;
    const a = anim;
    setAnim(null);
    setEnded(a);
    endRef.current();
    endRef.current = () => undefined;
  }, [anim, f]);

  const start = (a: Anim, onEnd: () => void = () => undefined) => {
    endRef.current = onEnd;
    setEnded(null);
    setAnim(a);
  };

  // ---------- pose of the real plane ----------
  const restPose: Pose = useMemo(() => {
    const t = scene.track(Array.isArray(right) ? (right as Ctl[]) : (right as Ctl));
    return s.mode === "line" ? { ...poseAt(t, 0), fade: 1 } : REST;
  }, [scene, right, s.mode]);
  const idleBob = reducedMotion ? REST : bob(now);
  const atRest = (p: Pose): Pose => ({ ...p, y: p.y + idleBob.y, roll: p.roll + idleBob.roll });

  let pose: Pose = atRest(restPose);
  const shown = anim ?? ended;
  if (shown?.kind === "fly") {
    const fa = anim ? f : 1;
    pose = shown.still ? { ...poseAt(shown.track, 0.8), fade: anim ? 1 : 0 } : poseAt(shown.track, fa);
  } else if (shown?.kind === "demo") {
    pose = anim ? demoPose(shown.ctl, f) : atRest(REST);
  } else if (shown?.kind === "away") {
    pose = flyAwayPose(reducedMotion ? 1 : anim ? f : 1);
  } else if (shown?.kind === "force") {
    pose = forcePose(shown.d, reducedMotion ? 1 : anim ? f : 1);
  }

  // ---------- ghost (model): loops the right flight ----------
  let ghost: Pose | null = null;
  if (modelShown && canAct && !anim && ["hoop", "line", "turn", "course"].includes(s.mode)) {
    const t = scene.track(Array.isArray(right) ? (right as Ctl[]) : (right as Ctl));
    const period = t.total * scene.msPerUnit + 700;
    const g = reducedMotion ? 0.62 : Math.min(1, ((now % period) / (period - 700)));
    ghost = poseAt(t, s.mode === "course" && reducedMotion ? 0.9 : g);
    if (reducedMotion) ghost = { ...ghost, fade: 1 };
  }
  if (modelShown && canAct && !anim && (s.mode === "name" || s.mode === "part")) ghost = null;

  // ---------- after a miss: a new pass begins; after the model, replay demos ----------
  const phase = st.phase;
  const prevPhase = useRef(phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = phase;
    if (was === "feedback" && phase === "answering") {
      setEnded(null);
      setHeld(null);
      setHotForce(null);
      setRespawn((n) => n + 1);
      if (s.mode === "course") {
        const parts = st.check?.parts ?? {};
        setPlan(modelShown ? [null, null, null] : plan.map((p, i) => (parts[String(i)] ? p : null)));
      }
      if (s.mode === "name" || s.mode === "part") window.setTimeout(() => playDemo(), 400);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- name / part: the demo plays by itself once the prompt has started ----------
  const demoCtlFor = (): Ctl | null => (s.mode === "name" ? demoCtl(s.axis, s.dir) : s.mode === "part" ? s.ctl : null);
  const playDemo = () => {
    const c = demoCtlFor();
    if (!c) return;
    busy?.();
    setHeld(c);
    start({ kind: "demo", ctl: c, t0: performance.now(), ms: reducedMotion ? 1600 : DEMO_MS }, () => setHeld(null));
  };
  useEffect(() => {
    if (s.mode !== "name" && s.mode !== "part") return;
    const t = window.setTimeout(playDemo, 1100);
    return () => window.clearTimeout(t);
  }, [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- acting ----------
  const isOut = (id: string) => st.eliminated.includes(id);
  const flying = anim?.kind === "fly" || anim?.kind === "force";
  const ready = canAct && !flying;

  const describeFlight = (value: Ctl | Ctl[], t: Track) => {
    if (s.mode === "course") {
      const v = value as Ctl[];
      const k = v.findIndex((c, i) => c !== (right as string[])[i]);
      return k < 0 ? "Zephy flew through all three hoops!" : `${EFFECT[v[k]!]} at hoop ${k + 1} and Zephy passed beside it.`;
    }
    const c = value as Ctl;
    void t;
    if (s.mode === "line") return c === right ? `${EFFECT[c]}. The nose lines up with the runway!` : `${EFFECT[c]}. The nose is not lined up yet.`;
    return `${EFFECT[c]}${c === right ? " and Zephy flew through the hoop!" : " and Zephy passed beside the hoop."}`;
  };

  const fly = (value: Ctl | Ctl[]) => {
    const t = scene.track(value);
    busy?.();
    audio.play("whoosh", { gain: 0.5 });
    const still = reducedMotion;
    start({ kind: "fly", track: t, t0: performance.now(), ms: still ? 750 : Math.max(600, t.total * scene.msPerUnit), value, still }, () => {
      setSay(describeFlight(value, t));
      setHeld(null);
      act({ type: "SUBMIT", value });
    });
  };

  const pressCtl = (c: Ctl) => {
    if (!ready || isOut(c)) return;
    if (s.mode === "course") {
      if (!STICKS.includes(c as Stick)) return;
      const k = plan.indexOf(null);
      if (k < 0) return;
      if (modelShown && (right as string[])[k] !== c) return;
      busy?.();
      audio.play("tap", { gain: 0.5 });
      const next = plan.map((p, i) => (i === k ? (c as Stick) : p));
      setPlan(next);
      setSay(`Move ${k + 1}: ${CTL_TEXT[c]}.${next.every(Boolean) ? " Three moves planned. Press Fly." : ""}`);
      if (next.every(Boolean)) void audio.speak("sh.plan.full");
      return;
    }
    if (!liveCtls.includes(c)) return;
    if (modelShown && c !== right) return;
    audio.play("tap", { gain: 0.5 });
    setHeld(c);
    fly(c);
  };
  const undo = () => {
    if (!ready) return;
    const k = [...plan].reverse().findIndex(Boolean);
    if (k < 0) return;
    const idx = plan.length - 1 - k;
    busy?.();
    audio.play("pickup", { gain: 0.4 });
    setPlan(plan.map((p, i) => (i === idx ? null : p)));
    setSay(`Move ${idx + 1} removed.`);
  };
  const flyPlan = () => {
    if (!ready || plan.some((p) => !p)) return;
    const value = plan as Ctl[];
    if (value.some(isOut)) return;
    if (modelShown && value.join() !== (right as string[]).join()) return;
    fly(value);
  };
  const choose = (id: string) => {
    if (!ready || isOut(id)) return;
    busy?.();
    const ok = id === right;
    if (s.mode === "force" && !isArrowTemplate(s.t)) {
      audio.play("tap", { gain: 0.5 });
      start({ kind: "force", d: id as Diagram, t0: performance.now(), ms: reducedMotion ? 600 : 1100, value: id }, () => {
        setSay(forceSay(id as Diagram));
        act({ type: "SUBMIT", value: id });
      });
      return;
    }
    if (s.mode === "force") setHotForce(id as ForceId);
    act({ type: "SUBMIT", value: id });
    if (ok && s.mode !== "force") start({ kind: "away", t0: performance.now(), ms: reducedMotion ? 300 : 1300 });
  };

  // ---------- which controls are live ----------
  const options = ex.answer.kind === "choice" ? ex.answer.options.map((o) => o.id) : ex.answer.kind === "sequence" ? ex.answer.pieces.map((p) => p.id) : [];
  const liveCtls: Ctl[] = s.mode === "hoop" || s.mode === "line" || s.mode === "turn" || s.mode === "course" ? (options as Ctl[]) : [];
  const showStick = liveCtls.some((c) => !isPedal(c)) || s.mode === "part";
  const showPedals = liveCtls.some(isPedal) || s.mode === "part";
  const nextModel: Ctl | null = !modelShown || !canAct ? null : s.mode === "course" ? ((right as Ctl[])[plan.indexOf(null)] ?? null) : liveCtls.length ? (right as Ctl) : null;

  // ---------- keyboard ----------
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (s.mode === "course" && e.key === "Backspace") {
      e.preventDefault();
      undo();
      return;
    }
    const c = KEY_CTL[e.key];
    if (!c || !liveCtls.includes(c)) return;
    e.preventDefault();
    pressCtl(c);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ---------- stick drag (snaps to one of the live directions) ----------
  const liveSticks = liveCtls.filter((c): c is Stick => STICKS.includes(c as Stick));
  const dirOf = (dx: number, dy: number, size: number): Stick | null => {
    const min = size * 0.16;
    if (Math.hypot(dx, dy) < min) return null;
    const vert = Math.abs(dy) >= Math.abs(dx);
    const pick: Stick = vert ? (dy < 0 ? "fwd" : "back") : dx < 0 ? "left" : "right";
    if (liveSticks.includes(pick)) return pick;
    // only one axis live: project onto it
    const alt: Stick = !vert ? (dy < 0 ? "fwd" : "back") : dx < 0 ? "left" : "right";
    const altMag = vert ? Math.abs(dx) : Math.abs(dy);
    return liveSticks.includes(alt) && altMag >= min ? alt : null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const g = dragRef.current;
      if (!g) return;
      setDrag({ ...g, dx: e.clientX - g.x, dy: e.clientY - g.y });
      busy?.();
    };
    const up = (e: PointerEvent) => {
      const g = dragRef.current;
      setDrag(null);
      if (!g || e.type !== "pointerup") return;
      const d = dirOf(e.clientX - g.x, e.clientY - g.y, g.size);
      if (d && !isOut(d)) pressCtl(d);
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

  const knobOffset = (() => {
    const lim = 0.27;
    if (drag) {
      const d = dirOf(drag.dx, drag.dy, drag.size);
      const max = drag.size * lim;
      if (!d) return { x: Math.max(-12, Math.min(12, drag.dx)), y: Math.max(-12, Math.min(12, drag.dy)), dir: null as Stick | null };
      const m = Math.min(max, Math.hypot(drag.dx, drag.dy));
      const v = { fwd: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] }[d];
      return { x: v[0]! * m, y: v[1]! * m, dir: d };
    }
    const h = held && !isPedal(held) ? (held as Stick) : null;
    if (h) {
      const v = { fwd: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] }[h];
      return { x: v[0]! * 46, y: v[1]! * 46, dir: h };
    }
    return { x: 0, y: 0, dir: null };
  })();

  // ---------- render: the sky ----------
  const camera = CAMERAS[cam];
  const hoopState = (i: number): "idle" | "done" | "model" => (solved ? "done" : modelShown && canAct && (s.mode !== "course" || i === Math.max(0, plan.indexOf(null))) ? "model" : "idle");
  const ribbon = s.mode === "hoop" && (s.hoop === "left" || s.hoop === "right")
    ? [0.82, 1].map((ff) => hoopOnTrack(scene.track(right as Ctl), ff)).map((h) => ({ ...h, r: h.r * 0.8 }))
    : [];
  const glowPart: PartId | null = modelShown && canAct && nextModel ? AXIS_PART[CTL_AXIS[nextModel]] : null;
  const showSparkle = solved && scene.hoops.length > 0;
  const forceSizes = shown?.kind === "force" ? DIAGRAM_FORCES[shown.d] : s.mode === "force" && solved && !isArrowTemplate(s.t) ? DIAGRAM_FORCES[right as Diagram] : { lift: 1, weight: 1, thrust: 0.55, drag: 0.55 };
  const showArrows = s.mode === "force" && (isArrowTemplate(s.t) || shown?.kind === "force" || solved);

  const hoopsBehind = scene.hoops.filter((h) => pastHoop(pose, h) <= 0);
  const hoopsFront = scene.hoops.filter((h) => pastHoop(pose, h) > 0);
  const sky = (
    <svg viewBox={SCENE_VIEW} className="sh-sky" overflow="visible" aria-hidden="true">
      <SceneClouds drift={reducedMotion ? 0 : shown?.kind === "fly" ? (anim ? f : 1) : 0} />
      {scene.runway && <Runway cam={cam} />}
      {ribbon.map((h, i) => <HoopRing key={`r${i}`} spec={h} cam={cam} faint />)}
      {[...hoopsBehind].reverse().map((h) => <HoopRing key={scene.hoops.indexOf(h)} spec={h} cam={cam} state={hoopState(scene.hoops.indexOf(h))} />)}
      {ghost && <PlaneShape pose={ghost} cam={cam} ghost />}
      <g key={`p${respawn}`} className={respawn ? "sh-respawn" : undefined}>
        <PlaneShape pose={pose} cam={cam} glow={glowPart} testId="sh-plane" />
      </g>
      {showArrows && <ForceArrows cam={cam} pose={pose} sizes={forceSizes} labels={!isArrowTemplate(s.mode === "force" ? s.t : "level")} hot={hotForce} />}
      {hoopsFront.map((h) => <HoopRing key={scene.hoops.indexOf(h)} spec={h} cam={cam} state={hoopState(scene.hoops.indexOf(h))} />)}
      {showSparkle && !reducedMotion && scene.hoops.map((h, i) => <HoopSparkle key={`s${i}`} spec={h} cam={cam} />)}
    </svg>
  );

  // force arrows as tap targets (which force pulls down / holds up)
  const arrowButtons = s.mode === "force" && isArrowTemplate(s.t)
    ? (options as ForceId[]).map((fid) => {
        const a = arrowScreen(camera, fid, { lift: 1, weight: 1, thrust: 0.55, drag: 0.55 }[fid], REST);
        if (!a) return null;
        const out = isOut(fid);
        const isRight = solved && st.lastAnswer === fid;
        const wrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === fid;
        const model = modelShown && canAct && fid === right;
        return (
          <button
            key={fid}
            type="button"
            className={`sh-arrow-btn is-${fid} ${out ? "is-out" : ""} ${isRight ? "is-right" : ""} ${wrong ? "is-wrong" : ""} ${model ? "is-model" : ""}`}
            style={{ left: `${(a.lx / VIEW_W) * 100}%`, top: `${(a.ly / VIEW_H) * 100}%` }}
            data-testid="choice"
            data-value={fid}
            aria-label={`${FORCE_NAME[fid]} arrow`}
            aria-disabled={!ready || out}
            onClick={() => choose(fid)}
          >
            {FORCE_NAME[fid]}
          </button>
        );
      })
    : null;

  // ---------- render: the deck ----------
  const stickBtn = (c: Stick, glyph: "up" | "down" | "left" | "right") => {
    const live = liveSticks.includes(c);
    const out = isOut(c);
    const model = nextModel === c;
    const label = scaffold ? (c === "back" ? "Nose up" : c === "fwd" ? "Nose down" : CTL_SHORT[c]) : CTL_SHORT[c];
    const wrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === c;
    return (
      <button
        type="button"
        className={`sh-stick-btn at-${glyph} ${live ? "" : "is-hidden"} ${out ? "is-out" : ""} ${model ? "is-model" : ""} ${knobOffset.dir === c ? "is-armed" : ""} ${wrong ? "is-wrong" : ""} ${solved && st.lastAnswer === c ? "is-right" : ""}`}
        data-testid={live && s.mode !== "part" ? "choice" : undefined}
        data-value={c}
        aria-label={`${CTL_LABEL[c]}${scaffold && (c === "back" || c === "fwd") ? ` (${c === "back" ? "nose up" : "nose down"})` : ""}`}
        aria-hidden={live && s.mode !== "part" ? undefined : true}
        tabIndex={live && s.mode !== "part" ? undefined : -1}
        aria-disabled={!ready || out || (modelShown && nextModel !== c)}
        onClick={() => pressCtl(c)}
      >
        <ArrowGlyph dir={glyph} />
        <span className="sh-stick-label">{label}</span>
      </button>
    );
  };
  const pedalBtn = (c: "lpedal" | "rpedal") => {
    const live = liveCtls.includes(c);
    const out = isOut(c);
    const model = nextModel === c;
    const wrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === c;
    return (
      <button
        type="button"
        className={`sh-pedal ${live || s.mode === "part" ? "" : "is-hidden"} ${held === c ? "is-down" : ""} ${out ? "is-out" : ""} ${model ? "is-model" : ""} ${wrong ? "is-wrong" : ""} ${solved && st.lastAnswer === c ? "is-right" : ""}`}
        data-testid={live ? "choice" : undefined}
        data-value={c}
        aria-label={CTL_LABEL[c]}
        aria-hidden={live ? undefined : true}
        tabIndex={live ? undefined : -1}
        aria-disabled={!ready || out || (modelShown && nextModel !== c)}
        onClick={() => pressCtl(c)}
      >
        <PedalArt side={c === "lpedal" ? "left" : "right"} />
        <span className="sh-pedal-label">{c === "lpedal" ? "Left" : "Right"}</span>
      </button>
    );
  };

  const stick = showStick && (
    <div className={`sh-stick ${s.mode === "part" ? "is-display" : ""} ${liveSticks.length === 2 ? (liveSticks.includes("back") ? "is-vertical" : "is-horizontal") : ""}`}>
      <div className="sh-stick-well">
        <span className="sh-stick-slot" aria-hidden="true" />
        {stickBtn("fwd", "up")}
        {stickBtn("back", "down")}
        {stickBtn("left", "left")}
        {stickBtn("right", "right")}
        <div
          className={`sh-knob ${drag ? "is-drag" : ""} ${liveSticks.length && ready ? "can-drag" : ""}`}
          data-testid="sh-knob"
          data-sh-idle={["hoop", "turn", "course"].includes(s.mode) ? "true" : undefined}
          aria-hidden="true"
          style={{ transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))` }}
          onPointerDown={(e) => {
            if (!ready || !liveSticks.length || e.button !== 0) return;
            const well = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0, size: well.width });
            audio.play("pickup", { gain: 0.35 });
          }}
        >
          <StickKnob />
        </div>
      </div>
      <span className="sh-deck-caption">Stick</span>
    </div>
  );
  const pedals = showPedals && (
    <div className={`sh-pedals ${s.mode === "part" ? "is-display" : ""}`} data-sh-idle={s.mode === "line" ? "true" : undefined}>
      <div className="sh-pedal-row">{pedalBtn("lpedal")}{pedalBtn("rpedal")}</div>
      <span className="sh-deck-caption">Pedals</span>
    </div>
  );

  const optionCard = (id: string, icon: React.ReactNode, label: string, sayLine?: string) => {
    const out = isOut(id);
    const isRight = solved && st.lastAnswer === id;
    const wrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === id;
    const model = modelShown && canAct && id === right;
    return (
      <div key={id} className="sh-opt-row">
        <button
          type="button"
          className={`sh-opt ${out ? "is-out" : ""} ${isRight ? "is-right" : ""} ${wrong ? "is-wrong" : ""} ${model ? "is-model" : ""}`}
          data-testid="choice"
          data-value={id}
          aria-label={label}
          aria-disabled={!ready || out}
          onClick={() => choose(id)}
        >
          <span className="sh-opt-icon" aria-hidden="true">{icon}</span>
          <span className="sh-opt-text">{label}</span>
        </button>
        {sayLine && (
          <button type="button" className="sh-say" data-testid="sh-say" aria-label={`Hear: ${label}`} onClick={() => { busy?.(); void audio.speak(sayLine); }}>
            <SpeakerIcon />
          </button>
        )}
      </div>
    );
  };
  const optionsList = (() => {
    if (s.mode === "name") return (options as Axis[]).map((a) => optionCard(a, <AxisIcon axis={a} />, AXIS_NAME[a], `sh.opt.${a}`));
    if (s.mode === "part") return (options as PartId[]).map((p) => optionCard(p, <PartIcon part={p} />, PART_NAME[p], `sh.opt.${p}`));
    if (s.mode === "force" && !isArrowTemplate(s.t)) return (options as Diagram[]).map((d) => optionCard(d, <ForceDiagram d={d} />, DIAGRAM_TEXT[d], `sh.opt.${d}`));
    return null;
  })();

  const planBar = s.mode === "course" && (
    <div className="sh-plan" role="group" aria-label="Flight plan">
      <ol className="sh-plan-slots">
        {plan.map((p, i) => {
          const model = modelShown ? ((right as Ctl[])[i] as Stick) : null;
          const ok = !modelShown && st.hintStage >= 1 && p && st.check?.parts?.[String(i)] === true;
          const showC = p ?? (model && canAct ? model : null);
          const glyph = showC ? ({ fwd: "up", back: "down", left: "left", right: "right" } as const)[showC] : null;
          return (
            <li key={i} className={`sh-slot ${p ? "is-filled" : ""} ${ok ? "is-ok" : ""} ${!p && model && canAct ? "is-model" : ""}`} data-testid="sh-slot" data-value={p ?? ""} aria-label={`Move ${i + 1}: ${p ? CTL_TEXT[p] : "empty"}`}>
              <span className="sh-slot-num">{i + 1}</span>
              {glyph && <ArrowGlyph dir={glyph} />}
            </li>
          );
        })}
      </ol>
      <button type="button" className="sh-undo" data-testid="sh-undo" aria-label="Undo the last move" aria-disabled={!ready || plan.every((p) => !p)} onClick={undo}>
        <UndoIcon />
      </button>
      <button type="button" className={`sh-fly ${plan.every(Boolean) && ready ? "is-ready" : ""} ${solved ? "is-right" : ""}`} data-testid="done" aria-label="Fly the plan" aria-disabled={!ready || plan.some((p) => !p)} onClick={flyPlan}>
        Fly!
      </button>
    </div>
  );

  const replay = (s.mode === "name" || s.mode === "part") && (
    <button type="button" className="sh-replay" data-testid="sh-replay" data-sh-idle="true" aria-label="Watch the move again" aria-disabled={!!anim} onClick={() => !anim && playDemo()}>
      <EyeIcon /><span>Watch again</span>
    </button>
  );

  const data: Record<string, string> = { "data-mode": s.mode, "data-level": String(s.level) };
  if (s.mode === "hoop") data["data-hoop"] = s.hoop;
  if (s.mode === "name") data["data-axis"] = s.axis;
  if (s.mode === "part") data["data-ctl"] = s.ctl;
  if (s.mode === "line") data["data-nose"] = s.nose;
  if (s.mode === "turn") data["data-side"] = s.side;
  if (s.mode === "force") data["data-template"] = s.t;
  if (s.mode === "course") data["data-course"] = s.course.map((h) => HOOP_CTL[h]).join(",");

  return (
    <div
      className={`sh-stage mode-${s.mode} ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${modelShown ? "is-model" : ""} ${optionsList ? "has-options" : ""} ${showPedals && showStick ? "has-both" : ""}`}
      data-testid="sh-board"
      data-anim={anim ? anim.kind : "idle"}
      {...data}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="sh-layout">
      <div className="sh-scene">
        <div className="sh-frame" data-sh-idle={s.mode === "force" ? "true" : undefined}>
          {sky}
          {arrowButtons}
          {s.mode === "force" && !isArrowTemplate(s.t) && <ForceLegend />}
        </div>
        {planBar}
      </div>
      <div className="sh-deck">
        {replay}
        {optionsList && <div className="sh-options" role="group" aria-label="Answers">{optionsList}</div>}
        {(stick || pedals) && (
          <div className="sh-controls">
            {pedals}
            {stick}
          </div>
        )}
      </div>
      </div>
      <p className="sr-only" aria-live="polite" data-testid="sh-say-live">{say}</p>
    </div>
  );
}

function forceSay(d: Diagram): string {
  switch (d) {
    case "balanced":
      return "Balanced forces: Zephy keeps flying level at a steady speed.";
    case "thrustWins":
      return "Thrust is bigger than drag: Zephy speeds up.";
    case "dragWins":
      return "Drag is bigger than thrust: Zephy slows down.";
    case "liftWins":
      return "Lift is bigger than weight: Zephy starts to go up.";
  }
}

/** Everything lives on the board; the tray row is hidden for this world (CSS). */
export function SkyTray() {
  return <div className="sh-tray-empty" aria-hidden="true" />;
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 15 L15 15 L23 8 L23 32 L15 25 L8 25 Z" fill="#fff" stroke="#2B2140" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M28 14 Q32 20 28 26" fill="none" stroke="#2B2140" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M14 12 L6 19 L14 26" fill="none" stroke="#2B2140" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 19 L24 19 Q34 19 34 27 Q34 33 26 33 L20 33" fill="none" stroke="#2B2140" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 20 Q20 4 36 20 Q20 36 4 20 Z" fill="#fff" stroke="#2B2140" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="6.5" fill="#2B2140" />
      <circle cx="18" cy="18" r="2" fill="#fff" />
    </svg>
  );
}
