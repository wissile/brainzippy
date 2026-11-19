import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import type { AnswerValue, Exercise } from "../../engine/types";
import { targetOf } from "../../engine/validation";
import { CrateArt, EngineArt, FlameArt, MoonBackdrop, PadArt, PuffArt, RL, RocketArt, SpringScaleArt, TankArt } from "./art";
import {
  BAND_FLOORS,
  BAND_SHORT,
  ENGINE_COST,
  TANK_CHOICES,
  TANK_COST,
  TANK_KG,
  type Result,
  type Scenario,
  TEST_KIND,
  accelOf,
  apogee,
  engineId,
  engineThrust,
  fmtA,
  missionTable,
  resultOf,
  scenarioOf,
  usesPushes,
  weightHidden,
  weightOf,
} from "./logic";
import { type Carry, type Lab, allowed, labStore, submission } from "./store";
import "./rocket-lab.css";

/**
 * Dabble's Rocket Lab board: a launch pad with a rocket in side view, force arrows drawn exactly to scale,
 * and a parts shelf. The child builds (drag, tap-then-tap, or keyboard Enter → Enter), predicts in the tray,
 * and presses the big test button. The flight is computed from the same physics as the answer (./logic.ts),
 * so what the child observes is always true — including a rocket that flies but wasn't the mission's ask.
 * Reduced motion: no movement; start (ghost) and end positions only.
 */

interface Flight {
  seq: number;
  result: Result;
  correct: boolean;
  at: number;
  value: AnswerValue | null;
}
interface Drag {
  carry: Carry;
  x: number;
  y: number;
  sx: number;
  sy: number;
  active: boolean;
}

const unitOf = (s: Scenario) => (usesPushes(s.mode) ? "pushes" : "N");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Largest force any arrow can show in this experiment: every arrow shares one scale (lengths stay proportional). */
function forceScale(s: Scenario): number {
  switch (s.mode) {
    case "lift":
      return Math.max(s.t, s.w);
    case "cargo":
      return Math.max(s.t, s.w + s.shelf * s.c);
    case "engine":
    case "engineKg":
    case "moonEngine":
      return Math.max(s.w, ...s.engines);
    case "weight":
    case "moonMass":
      return weightOf(s.m, "earth");
    case "mission": {
      const maxM = s.m + TANK_KG * 3;
      return Math.max(weightOf(maxM), ...s.thrusts);
    }
    default:
      return 1;
  }
}

function useLab(exId: string): Lab {
  return useSyncExternalStore(labStore.subscribe, () => labStore.for(exId), () => labStore.for(exId));
}

// ---------------------------------------------------------------- arrows

function Arrow({ dir, value, scale, unit, hidden, pulse }: { dir: "up" | "down"; value: number; scale: number; unit: string; hidden?: boolean; pulse?: boolean }) {
  const len = hidden ? 0.28 : Math.max(0, value / scale);
  const name = dir === "up" ? "push up" : "pull down";
  return (
    <div
      className={`rl-arrow ${dir} ${hidden ? "is-hidden" : ""} ${pulse ? "is-pulse" : ""}`}
      style={{ "--len": len } as React.CSSProperties}
      data-testid={dir === "up" ? "thrust-arrow" : "weight-arrow"}
      data-value={hidden ? "?" : value}
      aria-hidden="true"
    >
      <span className="rl-shaft" />
      <span className="rl-head" />
      <span className="rl-arrow-label">
        <small>{name}</small>
        <b>{hidden ? "?" : value}</b> {unit}
      </span>
    </div>
  );
}

/** Model step: both forces drawn upward from one baseline, side by side, so the lengths can be compared. */
function Compare({ thrust, weight, scale, unit }: { thrust: number; weight: number; scale: number; unit: string }) {
  const bars = [
    { key: "up", name: "push up", v: thrust },
    { key: "down", name: "pull down", v: weight },
  ];
  return (
    <div className="rl-compare" data-testid="compare" aria-hidden="true">
      {bars.map((b) => {
        const tag = thrust === weight ? "equal" : (b.key === "up") === thrust > weight ? "wins" : null;
        return (
          <div key={b.key} className={`rl-bar ${b.key}`} style={{ "--len": b.v / scale } as React.CSSProperties}>
            <span className="rl-bar-label"><small>{b.name}</small><b>{b.v}</b> {unit}{tag && <em className="rl-wins">{tag}</em>}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- the board

export function RocketBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = useMemo(() => scenarioOf(ex.params), [ex.params]);
  const lab = useLab(ex.id);
  const { reducedMotion, speaking } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const suppress = useRef(-Infinity);
  const [weighed, setWeighed] = useState(false);
  const [pulse, setPulse] = useState(false);
  const coached = useRef({ predict: false });

  const fb = st.feedback;
  const canAct = st.phase === "answering";
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const modelling = alongIndex >= 0 && st.hintStage === 2;
  const unit = unitOf(s);
  const scale = forceScale(s);
  const set = (change: (l: Lab) => Partial<Lab>) => labStore.update(ex.id, change);

  // ---------- feedback → flight (test + observe) ----------
  const seq = fb?.seq;
  useEffect(() => {
    if (!fb || st.phase !== "feedback") return;
    const result = resultOf(s, st.lastAnswer);
    setFlight({ seq: fb.seq, result, correct: fb.correct, at: performance.now(), value: st.lastAnswer });
    set(() => ({ carry: null }));
    const flies = (result.kind === "launch" && result.outcome === "lift") || result.kind === "race" || result.kind === "compare" || (result.kind === "mission" && result.outcome === "lift");
    audio.play(flies ? "whoosh" : "drop", { gain: 0.7 });
    if (!fb.correct && st.hintStage >= 1) {
      // first miss: Rumble hangs the rocket on his spring scale; the two arrows pulse side by side
      setWeighed(true);
      setPulse(true);
    }
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // after a miss, roll a fresh rocket back onto the pad (the child's build stays) once the flight has played
  useEffect(() => {
    if (st.phase !== "answering" || !flight || flight.correct) return;
    const wait = Math.max(200, 1900 - (performance.now() - flight.at));
    const t = window.setTimeout(() => setFlight(null), wait);
    return () => window.clearTimeout(t);
  }, [st.phase, flight]);
  useEffect(() => {
    if (!pulse) return;
    const t = window.setTimeout(() => setPulse(false), 5000);
    return () => window.clearTimeout(t);
  }, [pulse]);

  // after a miss: greyed-out parts go back to the shelf; right ranking slots stay, wrong ones empty
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    set((l) => {
      const out: Partial<Lab> = {};
      if (l.engine && st.eliminated.includes(l.engine)) out.engine = null;
      if (typeof l.pick !== "object" && l.pick !== null && st.eliminated.includes(l.pick)) out.pick = null;
      if (s.mode === "rank" && st.check?.parts) out.slots = l.slots.map((id, i) => (st.check?.parts?.[String(i)] ? id : null));
      return out;
    });
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // model (second miss): weigh, then compare; wrong builds are cleared so the child places the glowing part
  useEffect(() => {
    if (alongIndex < 0 || st.hintStage !== 2) return;
    if (alongIndex === 0) {
      setWeighed(true);
      audio.play("hint", { gain: 0.5 });
      set((l) => ({
        carry: null,
        engine: l.engine && l.engine === st.model ? l.engine : null,
        slots: s.mode === "rank" && Array.isArray(st.model) ? l.slots.map((id, i) => (id === (st.model as string[])[i] ? id : null)) : l.slots,
      }));
    } else audio.play("tap", { gain: 0.5 });
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // tutorial coaching: after the engine goes on, point to the prediction
  useEffect(() => {
    if (!ex.tutorial || !lab.built || coached.current.predict || speaking) return;
    coached.current.predict = true;
    void audio.speak("rl.coach.predict");
  }, [lab.built]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- placing parts ----------
  const focus = (sel: string) => window.setTimeout(() => (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true }), 0);

  /** Put the carried part on a target. Returns true when something changed. */
  const place = (c: Carry, target: string, keyboard = false): boolean => {
    if (!canAct) return false;
    busy?.();
    let changed = false;
    set((l) => {
      const out: Partial<Lab> = {};
      if (c.kind === "engine") {
        if (target === "rocket" && c.from === "shelf" && !st.eliminated.includes(c.id)) {
          out.engine = c.id;
          out.built = true;
          changed = l.engine !== c.id;
        } else if (target === "shelf" && c.from === "mount") {
          out.engine = null;
          changed = true;
        }
        out.carry = null;
      } else if (c.kind === "crate" || c.kind === "tank") {
        const key = c.kind === "crate" ? "crates" : "tanks";
        const max = c.kind === "crate" ? s.shelf : TANK_CHOICES.length;
        if (target === "rocket" && c.from === "shelf" && l[key] < max) {
          out[key] = l[key] + 1;
          changed = true;
          out.carry = l[key] + 1 < max ? c : null; // keep carrying from the shelf: tap the rocket again to add another
        } else if (target === "shelf" && c.from === "bay" && l[key] > 0) {
          out[key] = l[key] - 1;
          changed = true;
          out.carry = null;
        } else out.carry = null;
      } else if (c.kind === "rocket" && target.startsWith("slot-")) {
        const i = Number(target.slice(5));
        const slots = [...l.slots];
        const prev = slots[i] ?? null;
        if (typeof c.from === "number") slots[c.from] = prev;
        else if (prev) {
          /* the rocket that was there goes back to the hangar */
        }
        slots[i] = c.id;
        out.slots = slots;
        out.carry = null;
        changed = true;
      } else if (c.kind === "rocket" && target === "hangar" && typeof c.from === "number") {
        const slots = [...l.slots];
        slots[c.from] = null;
        out.slots = slots;
        out.carry = null;
        changed = true;
      } else out.carry = null;
      return out;
    });
    audio.play(changed ? (target === "shelf" || target === "hangar" ? "pickup" : "drop") : "tap", { gain: 0.6 });
    if (keyboard) {
      if (c.kind === "rocket") {
        const next = labStore.get().slots.findIndex((x) => !x);
        focus(next >= 0 ? `[data-testid="rank-chip"][data-placed="false"]` : '[data-testid="launch"]');
      } else if ((c.kind === "crate" || c.kind === "tank") && target === "rocket") focus('[data-testid="bay"]');
      else if (c.kind === "engine" && target === "rocket") focus(s.mode === "lift" ? '[data-testid="choice"]' : '[data-testid="launch"]');
      else focus(`[data-testid="${c.kind === "crate" ? "crate-source" : c.kind === "tank" ? "tank-source" : "choice"}"]`);
    }
    return changed;
  };

  const pick = (c: Carry, keyboard: boolean) => {
    if (!canAct) return;
    busy?.();
    const same = lab.carry && JSON.stringify(lab.carry) === JSON.stringify(c);
    set(() => ({ carry: same ? null : c }));
    if (same) return;
    audio.play("pickup", { gain: 0.45 });
    if (keyboard) {
      if (c.kind === "rocket") focus(`[data-testid="slot"][data-slot="${Math.max(0, lab.slots.findIndex((x) => !x))}"]`);
      else if (c.from === "shelf") focus(c.kind === "engine" ? '[data-testid="mount"]' : '[data-testid="bay"]');
      else focus(c.kind === "crate" ? '[data-testid="crate-source"]' : c.kind === "tank" ? '[data-testid="tank-source"]' : '[data-testid="shelf"]');
    }
  };

  const clicked = (e: React.MouseEvent) => e.timeStamp - suppress.current < 80;
  const kb = (e: React.MouseEvent) => e.detail === 0;

  /** Tap on a rocket part (bay, body, mount): place what is carried, or lift a part off. */
  const onRocket = (part: "bay" | "body" | "mount", e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    const c = lab.carry;
    if (c && c.from === "shelf") return void place(c, "rocket", kb(e));
    if (c) return set(() => ({ carry: null }));
    if (part === "mount" && lab.engine && s.mode !== "lift") return pick({ kind: "engine", id: lab.engine, from: "mount" }, kb(e));
    if (part === "bay" && s.mode === "cargo" && lab.crates > 0) return pick({ kind: "crate", from: "bay" }, kb(e));
    if (part === "bay" && s.mode === "mission" && lab.tanks > 0) return pick({ kind: "tank", from: "bay" }, kb(e));
  };
  const onShelfPart = (c: Carry, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    const carry = lab.carry;
    if (carry && carry.from !== "shelf" && carry.from !== "hangar" && carry.kind !== "rocket") return void place(carry, "shelf", kb(e));
    pick(c, kb(e));
  };
  const onSlot = (i: number, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    const c = lab.carry;
    if (c?.kind === "rocket") return void place(c, `slot-${i}`, kb(e));
    const id = lab.slots[i];
    if (id) pick({ kind: "rocket", id, from: i }, kb(e));
  };
  const onChip = (id: string, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    const c = lab.carry;
    if (c?.kind === "rocket" && typeof c.from === "number") return void place(c, "hangar", kb(e));
    const at = lab.slots.indexOf(id);
    pick({ kind: "rocket", id, from: at >= 0 ? at : "hangar" }, kb(e));
  };

  // ---------- pointer drag ----------
  const dropAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const t = el?.closest<HTMLElement>("[data-drop]");
    return t && rootRef.current?.contains(t) ? (t.dataset.drop ?? null) : null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 10;
      if (active && !d.active) audio.play("pickup", { gain: 0.5 });
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setHot(active ? dropAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d?.active) {
        suppress.current = e.timeStamp;
        const t = e.type === "pointerup" ? dropAt(e.clientX, e.clientY) : null;
        const c = d.carry;
        if (t === "rocket" && c.from === "shelf") place(c, "rocket");
        else if (t?.startsWith("slot-")) place(c, t);
        else if (c.from !== "shelf" && c.from !== "hangar") place(c, c.kind === "rocket" ? "hangar" : "shelf");
        set(() => ({ carry: null }));
      }
      dragRef.current = null;
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
  }, [drag !== null, canAct, lab]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, carry: Carry) => {
    if (!canAct || e.button !== 0) return;
    if (carry.kind === "engine" && st.eliminated.includes(carry.id)) return;
    busy?.();
    const d: Drag = { carry, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, active: false };
    dragRef.current = d;
    setDrag(d);
  };

  // ---------- derived view state ----------
  const thrustNow = s.mode === "lift" || s.mode === "cargo" ? (lab.engine || s.mode === "cargo" ? s.t : 0) : lab.engine ? engineThrust(lab.engine) : 0;
  const weightNow = s.mode === "cargo" ? s.w + lab.crates * s.c : s.mode === "mission" ? weightOf(s.m + lab.tanks * TANK_KG) : s.w;
  const hidden = weightHidden(s.mode) && !weighed && !celebrate && !(flight && flight.result.kind !== "launch");
  const flying = flight && !reducedMotion;
  const compareable = s.mode === "lift" || s.mode === "cargo" || s.mode === "engine" || s.mode === "engineKg" || s.mode === "moonEngine";
  const compare = modelling && alongIndex >= 1 && compareable;
  // the worked example compares the MODELLED build: the glowing engine, or the right number of crates
  const cmpT = s.mode === "lift" || s.mode === "cargo" ? s.t : typeof st.model === "string" ? engineThrust(st.model) : thrustNow;
  const cmpW = s.mode === "cargo" && typeof st.model === "number" ? s.w + st.model * s.c : s.w;
  const carrying = !!lab.carry || !!drag?.active;
  const carryToRocket = (lab.carry && lab.carry.from === "shelf") || (drag?.active && drag.carry.from === "shelf");

  const flightClass = (() => {
    if (!flight) return "";
    const r = flight.result;
    if (r.kind === "launch") return r.outcome === "lift" ? "is-launch" : r.outcome === "balanced" ? "is-rumble" : "is-sputter";
    if (r.kind === "weigh") return "is-weigh";
    if (r.kind === "mission") return r.outcome === "lift" ? "is-rise" : "is-sputter";
    return "";
  })();
  const missionRuler = s.mode === "mission" ? Math.max(500, ...missionTable(s.thrusts, s.m).map((c) => c.h)) * 1.08 : 1;
  const rise = flight?.result.kind === "mission" ? Math.min(1, flight.result.h / missionRuler) : 1;

  const status = describe(s, lab, thrustNow, weightNow, hidden);
  const outcomeText = flight ? explain(s, flight.result, flight.value, flight.correct) : "";

  const cls = ["rl-stage", `mode-${s.mode}`, celebrate ? "is-celebrating" : "", carrying ? "is-carrying" : "", modelling ? `is-modelling step-${alongIndex}` : "", reducedMotion ? "still" : "", s.planet === "moon" ? "on-moon" : ""].join(" ");
  const single = s.mode !== "rank" && s.mode !== "fuelNet" && s.mode !== "fuelChange";

  return (
    <div
      className={cls}
      ref={rootRef}
      data-testid="rocket-board"
      data-mode={s.mode}
      data-params={JSON.stringify(ex.params ?? {})}
      data-engine={lab.engine ?? ""}
      data-crates={lab.crates}
      data-tanks={lab.tanks}
      data-flight={flight ? flightClass || flight.result.kind : ""}
      data-step={alongIndex}
      onKeyDown={(e) => {
        if (e.key === "Escape" && lab.carry) set(() => ({ carry: null }));
      }}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="rl-layout">
        <div className={`rl-scene ${hot === "rocket" ? "is-hot" : ""}`} data-testid="scene">
          {s.planet === "moon" && <MoonBackdrop />}
          <div className="rl-pad"><PadArt /></div>
          <InfoCard s={s} hidden={hidden} step={modelling ? alongIndex : -1} />
          {s.mode === "mission" && <Ruler s={s} max={missionRuler} />}

          {single && (
            <>
              {flight && flight.result.kind !== "weigh" && <Trail flight={flight} still={reducedMotion} rise={rise} />}
              {flight && reducedMotion && (flightClass === "is-launch" || flightClass === "is-rise") && (
                <div className="rl-rig rl-ghost" aria-hidden="true"><div className="rl-bay-space" /><div className="rl-body"><RocketArt /></div><div className="rl-mount-space" /></div>
              )}
              <div className={`rl-rig ${flightClass} ${flying ? "anim" : ""}`} style={{ "--rise": rise } as React.CSSProperties} data-drop="rocket">
                {s.mode === "cargo" || s.mode === "mission" ? (
                  <button
                    type="button"
                    className={`rl-bay ${carryToRocket ? "is-target" : ""} ${lab.carry?.from === "bay" ? "is-lifted" : ""}`}
                    data-testid="bay"
                    data-count={s.mode === "cargo" ? lab.crates : lab.tanks}
                    aria-disabled={!canAct}
                    aria-label={
                      carryToRocket
                        ? `Load the ${lab.carry?.kind === "tank" ? "fuel tank" : "crate"} onto the rocket`
                        : s.mode === "cargo"
                          ? `${plural(lab.crates, "crate", "crates")} on the rocket${lab.crates ? ". Press to take one off" : ""}`
                          : `${plural(lab.tanks, "fuel tank", "fuel tanks")} on the rocket${lab.tanks ? ". Press to take one off" : ""}`
                    }
                    onPointerDown={(e) => {
                      if (s.mode === "cargo" && lab.crates > 0) startDrag(e, { kind: "crate", from: "bay" });
                      if (s.mode === "mission" && lab.tanks > 0) startDrag(e, { kind: "tank", from: "bay" });
                    }}
                    onClick={(e) => onRocket("bay", e)}
                  >
                    {s.mode === "cargo"
                      ? Array.from({ length: Math.max(lab.crates, modelling ? targetOf(ex) : 0) }, (_, i) => (
                          <span key={i} className={`rl-crate ${i >= lab.crates ? "is-slot" : ""}`}>{i < lab.crates && <CrateArt />}</span>
                        ))
                      : Array.from({ length: lab.tanks }, (_, i) => <span key={i} className="rl-tank"><TankArt /></span>)}
                    {(s.mode === "cargo" ? lab.crates : lab.tanks) === 0 && !modelling && <span className="rl-bay-empty">{s.mode === "cargo" ? "cargo" : "fuel"}</span>}
                  </button>
                ) : (
                  <div className="rl-bay-space" />
                )}
                <div className="rl-body">
                  <button
                    type="button"
                    className={`rl-body-btn ${carryToRocket ? "is-target" : ""}`}
                    data-testid="rocket"
                    aria-disabled={!canAct}
                    aria-label={carryToRocket ? "Put it on the rocket" : `The rocket. ${status}`}
                    onClick={(e) => onRocket("body", e)}
                  >
                    <RocketArt />
                  </button>
                  {s.mode !== "mission" && !compare && (
                    <div className="rl-forces">
                      {thrustNow > 0 && <Arrow dir="up" value={thrustNow} scale={scale} unit={unit} pulse={pulse} />}
                      <Arrow dir="down" value={weightNow} scale={scale} unit={unit} hidden={hidden} pulse={pulse} />
                    </div>
                  )}
                  {compare && <Compare thrust={cmpT} weight={cmpW} scale={scale} unit={unit} />}
                  {(weighed || flightClass === "is-weigh") && s.mode !== "mission" && (
                    <div className="rl-hook" data-testid="spring-scale" aria-hidden="true">
                      <SpringScaleArt stretch={weightNow / scale} reading={String(weightNow)} />
                      <span className="rl-hook-unit">{weightNow} {unit}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`rl-mount ${lab.engine || s.mode === "cargo" ? "has-engine" : ""} ${carryToRocket ? "is-target" : ""} ${lab.carry?.from === "mount" ? "is-lifted" : ""}`}
                  data-testid="mount"
                  aria-disabled={!canAct}
                  aria-label={
                    carryToRocket
                      ? "Attach it to the rocket"
                      : lab.engine
                        ? `Engine attached: ${engineThrust(lab.engine) || s.t} ${unit}${s.mode === "lift" ? "" : ". Press to take it off"}`
                        : s.mode === "cargo"
                          ? `Engine: ${s.t} pushes`
                          : "Engine mount: empty"
                  }
                  onPointerDown={(e) => lab.engine && s.mode !== "lift" && startDrag(e, { kind: "engine", id: lab.engine, from: "mount" })}
                  onClick={(e) => onRocket("mount", e)}
                >
                  {lab.engine || s.mode === "cargo" || s.mode === "mission" ? <EngineArt size={s.mode === "mission" ? lab.throttle : 1} /> : <span className="rl-mount-empty">engine</span>}
                  <span className="rl-flame"><FlameArt /></span>
                </button>
              </div>
            </>
          )}

          {s.mode === "rank" && <RankScene s={s} flight={flight} still={reducedMotion} step={modelling ? alongIndex : -1} />}
          {(s.mode === "fuelNet" || s.mode === "fuelChange") && <FuelScene s={s} flight={flight} still={reducedMotion} step={modelling ? alongIndex : -1} hideAfter={s.mode === "fuelNet" && !weighed && !flight && !celebrate} />}

          {flight && (
            <p className={`rl-result ${flight.correct ? "is-right" : "is-try"}`} data-testid="result" data-outcome={flightClass || flight.result.kind}>
              {outcomeText}
            </p>
          )}
          {s.mode !== "rank" && s.mode !== "fuelNet" && s.mode !== "fuelChange" && !usesPushes(s.mode) && <p className="rl-note">Simplified: g rounded, no air</p>}
        </div>

        <Shelf s={s} ex={ex} lab={lab} st={st} canAct={canAct} modelling={modelling} alongIndex={alongIndex} startDrag={startDrag} onShelfPart={onShelfPart} onSlot={onSlot} onChip={onChip} hot={hot} set={set} busy={busy} />
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announce">
        {flight ? outcomeText : status}
      </p>

      {drag?.active && (
        <div className="rl-ghost-drag" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {drag.carry.kind === "engine" ? <EngineArt size={1} /> : drag.carry.kind === "crate" ? <CrateArt /> : drag.carry.kind === "tank" ? <TankArt /> : <RocketArt label={drag.carry.id.slice(-1).toUpperCase()} />}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- scene pieces

function InfoCard({ s, hidden, step }: { s: Scenario; hidden: boolean; step: number }) {
  const g = s.planet === "moon" ? "1.6 N/kg" : "10 N/kg";
  if (s.mode === "rank" || s.mode === "fuelNet" || s.mode === "fuelChange") return null;
  if (usesPushes(s.mode)) {
    return (
      <div className="rl-info" data-testid="info">
        {s.mode === "cargo" && <span><CrateArt /> each crate <b>{s.c}</b> {s.c === 1 ? "push" : "pushes"}</span>}
        {s.mode === "cargo" && <span>empty rocket <b>{s.w}</b></span>}
      </div>
    );
  }
  const W = weightOf(s.m, s.planet);
  return (
    <div className="rl-info" data-testid="info">
      <span>{s.planet === "moon" ? "Moon" : "Earth"} gravity <b>{g}</b>{s.planet === "earth" && <small> (9.8, rounded)</small>}</span>
      {s.mode !== "mission" ? <span>mass <b>{s.mode === "moonMass" && hidden ? "?" : s.m} kg</b>{s.mode === "moonMass" && hidden && <small> (on Earth {s.m} kg)</small>}</span> : <span>empty rocket <b>{s.m} kg</b> · tank <b>{TANK_KG} kg</b></span>}
      {step >= 0 && s.mode !== "mission" && (
        <span className="rl-work" data-testid="work">
          {s.mode === "moonMass" && step === 0 ? <>mass stays <b>{s.m} kg</b></> : <>W = {s.m} × {s.planet === "moon" ? "1.6" : "10"}{step >= 1 || s.mode !== "moonMass" ? <> = <b>{W} N</b></> : null}</>}
        </span>
      )}
    </div>
  );
}

function Ruler({ s, max }: { s: Scenario; max: number }) {
  return (
    <div className="rl-ruler" aria-hidden="true">
      {BAND_FLOORS.slice(1).map((f, i) => (
        <span key={f} className={`rl-mark ${i + 1 === s.target ? "is-target" : ""}`} style={{ bottom: `${(f / max) * 100}%` }}>
          {f} m{i + 1 === s.target && " target"}
        </span>
      ))}
    </div>
  );
}

/** Exhaust puffs left behind at equal time steps: growing gaps show the rocket speeding up. */
function Trail({ flight, still, rise }: { flight: Flight; still: boolean; rise: number }) {
  const r = flight.result;
  const lifts = (r.kind === "launch" && r.outcome === "lift") || (r.kind === "mission" && r.outcome === "lift");
  if (!lifts) return <div className="rl-trail sputter" aria-hidden="true"><span className="rl-puff p0"><PuffArt /></span><span className="rl-puff p1"><PuffArt /></span></div>;
  const n = 6;
  return (
    <div className={`rl-trail ${still ? "still" : ""}`} style={{ "--rise": rise } as React.CSSProperties} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const f = (i / n) ** 2; // distance after equal time steps grows like t²
        return <span key={i} className="rl-puff" style={{ "--y": f, animationDelay: `${(i / n) * 1.4}s` } as React.CSSProperties}><PuffArt /></span>;
      })}
    </div>
  );
}

function RankScene({ s, flight, still, step }: { s: Scenario; flight: Flight | null; still: boolean; step: number }) {
  const as = s.rockets.map((r) => accelOf(r.t, r.m));
  const amax = Math.max(...as);
  const colors = [RL.coral, "#8E6CEF", RL.teal];
  return (
    <div className="rl-multi" data-testid="rank-scene">
      {s.rockets.map((r, i) => {
        const a = as[i]!;
        const shown = !!flight || step >= i;
        return (
          <div key={r.id} className="rl-lane">
            <div className={`rl-mini ${flight && !still ? "anim is-race" : ""} ${flight && still ? "is-race-still" : ""}`} style={{ "--rise": (a / amax) * 0.62 } as React.CSSProperties}>
              <RocketArt color={colors[i]} label={r.label} />
              <span className="rl-mini-engine"><EngineArt size={1} /></span>
              <span className="rl-flame"><FlameArt /></span>
            </div>
            <div className={`rl-tag ${step === i ? "is-now" : ""}`} data-testid="rocket-tag" data-id={r.id}>
              <b>Rocket {r.label}</b>
              <span>mass {r.m} kg</span>
              <span>thrust {r.t} N</span>
              <span>weight {weightOf(r.m)} N</span>
              {shown && <span className="rl-a">a = {r.t - weightOf(r.m)} ÷ {r.m} = <b>{fmtA(a)}</b> m/s²</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FuelScene({ s, flight, still, step, hideAfter }: { s: Scenario; flight: Flight | null; still: boolean; step: number; hideAfter: boolean }) {
  const a1 = accelOf(s.t, s.m);
  const a2 = accelOf(s.t2, s.m2);
  const amax = Math.max(a1, a2);
  const rows = [
    { key: "before", label: "Before", t: s.t, m: s.m, a: a1, show: true },
    { key: "after", label: s.change === "load" ? `After: +${s.d} kg cargo` : s.change === "throttle" ? `After: −${s.d} kg fuel, engine down` : `After: −${s.d} kg fuel`, t: s.t2, m: s.m2, a: a2, show: !hideAfter },
  ];
  return (
    <div className="rl-multi two" data-testid="fuel-scene">
      {rows.map((r, i) => (
        <div key={r.key} className="rl-lane">
          <div className={`rl-mini ${flight && !still ? "anim is-race" : ""} ${flight && still ? "is-race-still" : ""}`} style={{ "--rise": (r.a / amax) * 0.62 } as React.CSSProperties}>
            <RocketArt color={i ? RL.teal : RL.coral} />
            <span className="rl-mini-engine"><EngineArt size={1} /></span>
            <span className="rl-flame"><FlameArt /></span>
          </div>
          <div className={`rl-tag ${step === i ? "is-now" : ""}`} data-testid="fuel-tag" data-id={r.key}>
            <b>{r.label}</b>
            <span>thrust {r.t} N</span>
            <span>mass {r.m} kg</span>
            <span>weight {r.show || step >= i ? `${weightOf(r.m)} N` : "? N"}</span>
            {(i === 0 || r.show) && (i === 0 || flight || step >= i || s.mode === "fuelChange") && i === 0 && <span>net force {r.t - weightOf(r.m)} N</span>}
            {(flight || step >= i) && <span className="rl-a">{i === 1 && <>net {r.t - weightOf(r.m)} N · </>}a = <b>{fmtA(r.a)}</b> m/s²</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- shelf

interface ShelfProps {
  s: Scenario;
  ex: Exercise;
  lab: Lab;
  st: BoardProps["st"];
  canAct: boolean;
  modelling: boolean;
  alongIndex: number;
  hot: string | null;
  startDrag: (e: React.PointerEvent, c: Carry) => void;
  onShelfPart: (c: Carry, e: React.MouseEvent) => void;
  onSlot: (i: number, e: React.MouseEvent) => void;
  onChip: (id: string, e: React.MouseEvent) => void;
  set: (change: (l: Lab) => Partial<Lab>) => void;
  busy?: () => void;
}

function Shelf({ s, lab, st, canAct, modelling, alongIndex, hot, startDrag, onShelfPart, onSlot, onChip, set, busy }: ShelfProps) {
  const unit = unitOf(s);
  const returning = lab.carry && lab.carry.from !== "shelf" && lab.carry.kind !== "rocket";

  if (s.mode === "lift" || s.mode === "engine" || s.mode === "engineKg" || s.mode === "moonEngine") {
    const thrusts = s.mode === "lift" ? [s.t] : s.engines;
    const sorted = [...thrusts].sort((a, b) => a - b);
    return (
      <div className={`rl-shelf ${returning ? "is-target" : ""}`} data-drop="shelf" data-testid="shelf" role="group" aria-label="Engine shelf">
        <p className="rl-shelf-title">{s.mode === "lift" ? "Engine" : "Engines"}</p>
        <div className="rl-parts">
          {thrusts.map((t) => {
            const id = engineId(t);
            const on = lab.engine === id;
            const out = st.eliminated.includes(id);
            const model = st.model === id && modelling;
            const lifted = lab.carry?.kind === "engine" && lab.carry.id === id;
            return (
              <button
                key={id}
                type="button"
                className={`rl-part rl-engine ${on ? "is-on" : ""} ${out ? "is-out" : ""} ${model ? "is-model" : ""} ${lifted ? "is-lifted" : ""}`}
                data-testid={s.mode === "lift" ? "part" : "choice"}
                data-part="engine"
                data-value={id}
                aria-pressed={lifted}
                aria-disabled={!canAct || out || on}
                aria-label={returning ? "Put the engine back on the shelf" : on ? `The ${t} ${unit} engine is on the rocket` : `Engine that pushes ${t} ${unit}. Press, then press the rocket to attach it`}
                onPointerDown={(e) => !on && startDrag(e, { kind: "engine", id, from: "shelf" })}
                onClick={(e) => (on ? undefined : onShelfPart({ kind: "engine", id, from: "shelf" }, e))}
              >
                <span className="rl-part-art">{!on && <EngineArt size={sorted.indexOf(t)} />}</span>
                <span className="rl-part-label"><b>{t}</b> {unit}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (s.mode === "cargo") {
    const left = s.shelf - lab.crates;
    const lifted = lab.carry?.kind === "crate" && lab.carry.from === "shelf";
    return (
      <div className={`rl-shelf ${returning ? "is-target" : ""} ${hot === "shelf" ? "is-hot" : ""}`} data-drop="shelf" data-testid="shelf" role="group" aria-label="Cargo shelf">
        <p className="rl-shelf-title">Seed crates</p>
        <div className="rl-parts">
          <button
            type="button"
            className={`rl-part rl-crates ${lifted ? "is-lifted" : ""}`}
            data-testid="crate-source"
            data-left={left}
            aria-pressed={lifted}
            aria-disabled={!canAct || (left === 0 && !returning)}
            aria-label={returning ? "Put the crate back on the shelf" : `${plural(left, "crate", "crates")} left, ${plural(s.c, "push", "pushes")} each. Press, then press the rocket to load one`}
            onPointerDown={(e) => left > 0 && startDrag(e, { kind: "crate", from: "shelf" })}
            onClick={(e) => (left > 0 || returning) && onShelfPart({ kind: "crate", from: "shelf" }, e)}
          >
            <span className="rl-stack">{Array.from({ length: left }, (_, i) => <span key={i} className="rl-crate"><CrateArt /></span>)}</span>
            <span className="rl-part-label">×{left} · <b>{s.c}</b> each</span>
          </button>
        </div>
      </div>
    );
  }

  if (s.mode === "rank") {
    const model = Array.isArray(st.model) ? (st.model as string[]) : null;
    return (
      <div className="rl-shelf rl-rank" data-testid="shelf" role="group" aria-label="Order the rockets">
        <div className={`rl-hangar ${lab.carry?.kind === "rocket" && typeof lab.carry.from === "number" ? "is-target" : ""}`} data-drop="hangar">
          {s.rockets.map((r) => {
            const placed = lab.slots.includes(r.id);
            const lifted = lab.carry?.kind === "rocket" && lab.carry.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`rl-chip ${placed ? "is-placed" : ""} ${lifted ? "is-lifted" : ""}`}
                data-testid="rank-chip"
                data-value={r.id}
                data-placed={String(placed)}
                aria-pressed={lifted}
                aria-disabled={!canAct}
                aria-label={placed ? `Rocket ${r.label} is in place ${lab.slots.indexOf(r.id) + 1}. Press to move it` : `Rocket ${r.label}. Press, then press a place`}
                onPointerDown={(e) => startDrag(e, { kind: "rocket", id: r.id, from: placed ? lab.slots.indexOf(r.id) : "hangar" })}
                onClick={(e) => onChip(r.id, e)}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="rl-slots">
          {[0, 1, 2].map((i) => {
            const id = lab.slots[i];
            const r = s.rockets.find((x) => x.id === id);
            const ok = st.check?.parts?.[String(i)] === true && st.attempts > 0 && id === (st.lastAnswer as string[] | null)?.[i];
            const ghost = model && !id ? s.rockets.find((x) => x.id === model[i])?.label : undefined;
            return (
              <button
                key={i}
                type="button"
                className={`rl-slot ${id ? "is-full" : ""} ${ok ? "is-ok" : ""} ${ghost ? "is-model" : ""} ${lab.carry?.kind === "rocket" ? "is-target" : ""}`}
                data-testid="slot"
                data-slot={i}
                data-drop={`slot-${i}`}
                data-value={id ?? ""}
                aria-disabled={!canAct}
                aria-label={`${["Fastest", "Middle", "Slowest"][i]} place: ${r ? `Rocket ${r.label}` : "empty"}${lab.carry?.kind === "rocket" ? ". Press to put the rocket here" : ""}`}
                onClick={(e) => onSlot(i, e)}
              >
                <small>{["1st fastest", "2nd", "3rd slowest"][i]}</small>
                <b>{r ? r.label : (ghost ?? "")}</b>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (s.mode === "mission") {
    const cells = missionTable(s.thrusts, s.m);
    const lifted = lab.carry?.kind === "tank" && lab.carry.from === "shelf";
    const out = st.eliminated;
    const model = Array.isArray(st.model) ? (st.model as string[]) : [];
    const cost = ENGINE_COST[lab.throttle]! + lab.tanks * TANK_COST;
    return (
      <div className={`rl-shelf rl-mission ${returning ? "is-target" : ""}`} data-drop="shelf" data-testid="shelf" role="group" aria-label="Mission planner">
        <label className={`rl-slider ${model.includes(`thrust-${lab.throttle}`) || !modelling ? "" : "is-model"}`}>
          <span className="rl-shelf-title">Thrust <b data-testid="thrust-value">{s.thrusts[lab.throttle]} N</b> <small>({ENGINE_COST[lab.throttle]} coins)</small></span>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={lab.throttle}
            data-testid="thrust-slider"
            aria-valuetext={`Thrust ${s.thrusts[lab.throttle]} newtons, costs ${ENGINE_COST[lab.throttle]} coins`}
            disabled={!canAct}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (out.includes(`thrust-${v}`)) return;
              busy?.();
              audio.play("tap", { gain: 0.5 });
              set(() => ({ throttle: v }));
            }}
          />
        </label>
        <button
          type="button"
          className={`rl-part rl-tanks ${lifted ? "is-lifted" : ""}`}
          data-testid="tank-source"
          aria-pressed={lifted}
          aria-disabled={!canAct}
          aria-label={returning ? "Put the fuel tank back" : `Fuel tank, ${TANK_KG} kilograms, 1 coin. Press, then press the rocket to load it`}
          onPointerDown={(e) => lab.tanks < 3 && startDrag(e, { kind: "tank", from: "shelf" })}
          onClick={(e) => (lab.tanks < 3 || returning) && onShelfPart({ kind: "tank", from: "shelf" }, e)}
        >
          <span className="rl-stack">{Array.from({ length: 3 - lab.tanks }, (_, i) => <span key={i} className="rl-tank"><TankArt /></span>)}</span>
          <span className="rl-part-label">tank {TANK_KG} kg · 1 coin</span>
        </button>
        <table className="rl-plan" data-testid="plan">
          <caption>Test flights: height reached · cost (c = coins)</caption>
          <thead>
            <tr><th scope="col">thrust</th>{TANK_CHOICES.map((n) => <th key={n} scope="col">{plural(n, "tank", "tanks")}</th>)}</tr>
          </thead>
          <tbody>
            {s.thrusts.map((t, e) => (
              <tr key={t}>
                <th scope="row">{t} N</th>
                {TANK_CHOICES.map((n) => {
                  const c = cells.find((x) => x.engine === e && x.tanks === n)!;
                  const now = lab.throttle === e && lab.tanks === n;
                  const reach = c.band >= s.target;
                  const hl = modelling && ((alongIndex === 0 && reach) || (alongIndex >= 1 && model.includes(`thrust-${e}`) && model.includes(`tanks-${n}`)));
                  return (
                    <td key={n} className={`${now ? "is-now" : ""} ${hl ? "is-model" : ""} band-${c.band}`} data-band={c.band} data-cost={c.cost}>
                      <span>{BAND_SHORT[c.band]}</span> <small>{c.cost}c</small>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`rl-budget ${cost > s.budget ? "is-over" : ""}`} data-testid="budget">Cost <b>{lab.tanks ? cost : "–"}</b> of {s.budget} coins · target {BAND_FLOORS[s.target]} m+</p>
      </div>
    );
  }

  // weight / Moon mass / fuel: no parts — the lab notebook shows the rule being tested
  const notes: Record<string, string[]> = {
    weight: ["Weight = mass × gravity", "Earth: 10 N for every kg"],
    moonMass: ["Mass = how much stuff", "Weight = mass × gravity", "Moon: 1.6 N for every kg"],
    fuelNet: ["Net force = thrust − weight", "Weight = mass × 10"],
    fuelChange: ["Net force = thrust − weight", "Speed-up a = net force ÷ mass"],
  };
  return (
    <div className="rl-shelf rl-notebook" data-testid="shelf" aria-label="Lab notebook">
      <p className="rl-shelf-title">Lab notebook</p>
      <ul>{(notes[s.mode] ?? []).map((n) => <li key={n}>{n}</li>)}</ul>
      <p className="rl-small">Simplified: g rounded, no air resistance{s.mode.startsWith("fuel") ? ", steady thrust" : ""}.</p>
    </div>
  );
}

// ---------------------------------------------------------------- words (status, outcomes)

function describe(s: Scenario, lab: Lab, thrust: number, weight: number, hidden: boolean): string {
  const u = s.mode === "lift" || s.mode === "engine" || s.mode === "cargo" ? "pushes" : "newtons";
  const pull = hidden ? `Gravity pulls down: weigh it to find out (mass ${s.m} kilograms).` : `Gravity pulls down with ${weight} ${u}.`;
  if (s.mode === "rank" || s.mode === "fuelNet" || s.mode === "fuelChange") return "";
  if (s.mode === "mission") return `Thrust ${s.thrusts[lab.throttle]} newtons, ${plural(lab.tanks, "fuel tank", "fuel tanks")}.`;
  if (!thrust) return `No engine attached yet. ${pull}`;
  return `The engine pushes up with ${thrust} ${u}. ${pull}${s.mode === "cargo" ? ` ${plural(lab.crates, "crate", "crates")} loaded.` : ""}`;
}

/** The "explain" step: what happened and why, in words a child can read (also announced for screen readers). */
export function explain(s: Scenario, r: Result, value: AnswerValue | null, correct: boolean): string {
  const u = s.mode === "lift" || s.mode === "engine" || s.mode === "cargo" ? "" : " N";
  switch (r.kind) {
    case "launch": {
      if (r.outcome === "balanced") return `${r.thrust}${u} = ${r.weight}${u}: balanced. Equal push and pull, so the rocket stays on the pad.`;
      if (r.outcome === "stay") return `${r.thrust}${u} < ${r.weight}${u}: the pull down is bigger, so the rocket stays on the pad.`;
      const base = `${r.thrust}${u} > ${r.weight}${u}: the push up wins. Lift-off!`;
      if (correct) return base;
      if (s.mode === "cargo") return `${base} But it could carry more crates.`;
      if (s.mode === "moonEngine") return `${base} But that engine is far bigger than the Moon needs.`;
      if (s.mode === "lift") return `${base} The push up was bigger.`;
      return base;
    }
    case "weigh":
      return r.planet === "moon"
        ? `On the Moon: ${r.mass} kg × 1.6 = ${r.weight} N of weight. The mass is still ${r.mass} kg.`
        : `${r.mass} kg × 10 N/kg = ${r.weight} N. That is its weight on Earth.`;
    case "race": {
      const best = s.rockets.reduce((a, b) => (accelOf(b.t, b.m) > accelOf(a.t, a.m) ? b : a));
      return `Rocket ${best.label} speeds up fastest: ${fmtA(accelOf(best.t, best.m))} m/s². Net force ÷ mass decides it, not engine size.`;
    }
    case "compare": {
      const word = r.after > r.before ? "faster" : r.after < r.before ? "slower" : "the same";
      const net2 = s.t2 - weightOf(s.m2);
      return s.mode === "fuelNet"
        ? `Net force now: ${s.t2} − ${weightOf(s.m2)} = ${net2} N. Speed-up ${fmtA(r.before)} → ${fmtA(r.after)} m/s².`
        : `Speed-up ${fmtA(r.before)} → ${fmtA(r.after)} m/s²: ${word}.`;
    }
    case "mission": {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      if (r.outcome !== "lift") return "Too heavy for that thrust: it stays on the pad.";
      const reach = r.band >= s.target;
      const fits = r.cost <= s.budget;
      if (reach && fits) return `Reached ${Math.round(r.h)} m for ${r.cost} coins: on target and on budget!`;
      if (!reach) return `Reached ${Math.round(r.h)} m: short of ${BAND_FLOORS[s.target]} m.${ids.length ? "" : ""}`;
      return `Reached ${Math.round(r.h)} m, but it cost ${r.cost} coins: over the ${s.budget}-coin budget.`;
    }
  }
}

// ---------------------------------------------------------------- tray: predictions + the big test button

const LAUNCH_TEXT = { launch: "Launch!", weigh: "Weigh it!", race: "Launch all!", compare: "Run the test!" } as const;

export function RocketTray({ st, act }: BoardProps) {
  const ex = st.exercise;
  const s = useMemo(() => scenarioOf(ex.params), [ex.params]);
  const lab = useLab(ex.id);
  const a = ex.answer;
  const canAct = st.phase === "answering";
  const value = submission(s, lab);
  const ok = canAct && allowed(value, st.eliminated, st.model, a.kind === "sequence");
  const needsPick = s.mode === "lift" || a.kind === "number" ? s.mode !== "cargo" : s.mode === "fuelChange";
  const locked = s.mode === "lift" && !lab.built;
  const fb = st.feedback;
  const options: { key: string | number; text: string }[] =
    a.kind === "choice" && needsPick ? a.options.map((o) => ({ key: o.id, text: o.text ?? o.id })) : a.kind === "number" && needsPick ? (a.choices ?? []).map((c) => ({ key: c, text: `${c} ${s.mode === "moonMass" ? "kg" : "N"}` })) : [];
  const kind = TEST_KIND[s.mode];
  const coach = !!ex.tutorial && canAct && lab.built && st.attempts === 0;

  const choose = (key: string | number) => {
    if (!canAct || locked || st.eliminated.includes(key)) return;
    audio.play("tap", { gain: 0.5 });
    const was = labStore.for(ex.id).pick;
    labStore.update(ex.id, () => ({ pick: was === key ? null : key }));
    if (ex.tutorial && was === null) void audio.speak("rl.coach.launch");
  };
  const launch = () => {
    if (!ok || value === null) return;
    act({ type: "SUBMIT", value });
  };

  return (
    <div className={`choice-tray rl-tray ${options.length ? "has-cards" : ""}`} role="group" aria-label="Predict and test">
      {options.length > 0 && (
        <div className={`rl-cards n${options.length} ${locked ? "is-waiting" : ""}`} role="group" aria-label={locked ? "Attach the engine first" : "Your prediction"}>
          {options.map((o, i) => {
            const out = st.eliminated.includes(o.key);
            const picked = lab.pick === o.key;
            const model = st.model === o.key && canAct;
            const state = st.phase === "feedback" && st.lastAnswer === o.key ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" && o.key === (a.kind === "choice" ? a.correct : targetOf(ex)) ? "is-right" : "";
            return (
              <button
                key={String(o.key)}
                type="button"
                className={`choice rl-card ${picked ? "is-picked" : ""} ${out ? "is-out" : ""} ${model ? "is-model" : ""} ${state} ${coach && !lab.pick ? "is-coach" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
                data-testid="choice"
                data-value={o.key}
                aria-pressed={picked}
                aria-disabled={!canAct || out || locked}
                aria-label={locked ? `${o.text} (attach the engine first)` : `Predict: ${o.text}`}
                onClick={() => choose(o.key)}
              >
                {o.text}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={`rl-launch kind-${kind} ${ok ? "is-ready" : ""} ${coach && lab.pick ? "is-coach" : ""}`}
        data-testid="launch"
        aria-disabled={!ok}
        aria-label={ok ? `${LAUNCH_TEXT[kind].replace("!", "")}: test it` : `${LAUNCH_TEXT[kind].replace("!", "")} (build and predict first)`}
        onClick={launch}
      >
        <svg className="rl-launch-icon" viewBox="0 0 40 40" aria-hidden="true">
          {kind === "weigh" ? (
            <path d="M20 4 V12 M10 12 H30 L34 30 Q20 36 6 30 Z" fill="#fff" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
          ) : (
            <path d="M20 3 C27 9 29 18 28 26 L12 26 C11 18 13 9 20 3 Z M12 26 L7 34 L14 30 M28 26 L33 34 L26 30 M17 30 L20 37 L23 30" fill="#fff" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          )}
        </svg>
        <span>{LAUNCH_TEXT[kind]}</span>
      </button>
    </div>
  );
}

/** Worked-example steps for the runner's model hint. */
export const modelSteps = (ex: Exercise) => (scenarioOf(ex.params).mode === "rank" ? 3 : 2);

/** For tests and docs: the height a mission combination reaches. */
export const missionHeight = (s: Scenario, e: number, n: number) => apogee(s.thrusts[e]!, s.m, n);
