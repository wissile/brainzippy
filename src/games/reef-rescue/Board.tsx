import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import type { AnswerValue, Exercise } from "../../engine/types";
import { CoralPatch, Damselfish, FrameSlotArt, HealthIcon, Parrotfish, Polyp, ReefObject, Surgeonfish, type PatchState } from "./art";
import { ANIMALS, FOODS, HOME_ITEMS, NEED_LABEL, SLOT_TEXT, USUAL_HIGH, ZONES, type FoodId, type HomeItemId, type ZoneId, riskiestRun, runId } from "./facts";
import { FRAG_IDS, type Scene, type Target, allowed, cardsOn, explain, keepAfterMiss, modelPlacement, placeCard, sceneOf, stepsOf, submission } from "./logic";
import { type Carry, type ReefState, reefStore } from "./store";
import "./reef-rescue.css";

/**
 * Ripple's Reef Rescue board: a living reef in side view. Cards (species, helpers, story and action cards,
 * coral pieces) wait on the shelf and go to targets in the reef (food spots, habitat zones, chain slots,
 * Help/Harm bins, the frame) by drag, by tap-then-tap, or by keyboard (Enter on a card → focus jumps to the
 * reef → Enter places; Escape cancels). Each solved item brings one white or pale coral patch back to colour
 * and another fish arrives. Reduced motion: no swimming or swaying; colour changes are instant.
 */

interface Drag {
  carry: Carry;
  x: number;
  y: number;
  sx: number;
  sy: number;
  active: boolean;
}

const RESTORE_ORDER = [4, 5, 3, 6, 2, 7, 1, 8];
const START_STATE: PatchState[] = ["healthy", "white", "pale", "white", "white", "pale", "white", "pale", "white", "healthy"];
const FISH_SPOTS = [[14, 22], [70, 14], [40, 30], [86, 34], [24, 44], [58, 40], [8, 36], [48, 12], [78, 50]] as const;

function useReef(exId: string): ReefState {
  return useSyncExternalStore(reefStore.subscribe, () => reefStore.for(exId), () => reefStore.for(exId));
}

const SHELF_TITLE: Record<Scene["mode"], string> = {
  eats: "Who's hungry?",
  home: "Reef helpers",
  chain: "Food-chain cards",
  fact: "Answer cards",
  story: "Story cards",
  sort: "Action cards",
  grazers: "Reef animals",
  plant: "Coral pieces",
  risk: "Field notes",
  count: "Field notes",
};

const LENS: Record<Scene["mode"], string> = {
  eats: "",
  home: "",
  chain: "Arrow: from the food to the eater",
  fact: "Tiny algae live inside each coral polyp",
  story: "",
  sort: "Clean, cool water and lots of grazers help",
  grazers: "Look for animals that nibble algae",
  plant: "Coral needs light, clean water, a steady base",
  risk: "Many warm weeks in a row are hardest",
  count: "Count only bars above the dashed line",
};

export function ReefBoard({ st, alongIndex, busy, progress }: BoardProps) {
  const ex = st.exercise;
  const scene = useMemo(() => sceneOf(ex), [ex]);
  const rs = useReef(ex.id);
  const { reducedMotion, speaking } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const suppress = useRef(-Infinity);
  const [result, setResult] = useState<{ seq: number; text: string; correct: boolean } | null>(null);
  const [lens, setLens] = useState(false);
  const coached = useRef(false);

  const fb = st.feedback;
  const canAct = st.phase === "answering";
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const modelling = st.hintStage === 2 && alongIndex >= 0;
  const set = (change: (s: ReefState) => Partial<ReefState>) => reefStore.update(ex.id, change);
  const out = (id: string) => st.eliminated.includes(id);

  // a new item: clear the banner and the lens
  useEffect(() => {
    setResult(null);
    setLens(false);
    coached.current = false;
  }, [ex.id]);

  // ---------- feedback → explain banner, zoom lens ----------
  const seq = fb?.seq;
  useEffect(() => {
    if (!fb || st.phase !== "feedback") return;
    setResult({ seq: fb.seq, text: explain(scene, st.lastAnswer, fb.correct), correct: fb.correct });
    set(() => ({ carry: null }));
    if (!fb.correct) setLens(true);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // after a miss: wrong cards float back to the shelf, right parts stay (the model, on miss 2, stays placed)
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0 || st.hintStage === 2) return;
    set((s) => ({ place: keepAfterMiss(scene, s.place, st.check?.parts), pick: s.pick !== null && out(String(s.pick)) ? null : s.pick }));
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // worked example (miss 2): cards move into place one by one; the child then presses Check (errorless)
  useEffect(() => {
    if (st.hintStage !== 2 || alongIndex < 0) return;
    const n = stepsOf(scene, ex);
    if (scene.mode === "risk" || scene.mode === "count") {
      if (alongIndex >= n - 1) set(() => ({ pick: st.model as string | number, carry: null }));
    } else set(() => ({ place: modelPlacement(scene, st.model, alongIndex + 1), carry: null }));
    audio.play(alongIndex === 0 ? "hint" : "tap", { gain: 0.5 });
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // tutorial coaching: once the parrotfish is placed, point to Check
  useEffect(() => {
    if (!ex.tutorial || coached.current || speaking || st.attempts > 0) return;
    if (submission(scene, rs.place, rs.pick) !== null) {
      coached.current = true;
      void audio.speak("rr.coach.check");
    }
  }, [rs.place]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- moving cards ----------
  const focus = (sel: string) => window.setTimeout(() => (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true }), 0);
  const targetOut = (t: string) => (scene.mode === "eats" || scene.mode === "plant") && out(t);
  const cardOut = (c: string) => scene.mode !== "eats" && scene.mode !== "plant" && out(c);
  const nextFrag = (place: Record<string, string>) => FRAG_IDS.find((f) => !place[f]);

  const drop = (c: Carry, target: string, keyboard = false): boolean => {
    if (!canAct) return false;
    busy?.();
    if (target !== "shelf" && targetOut(target)) {
      audio.play("tap", { gain: 0.5 });
      return false;
    }
    let changed = false;
    set((s) => {
      const place = placeCard(scene, s.place, c.card, target);
      changed = JSON.stringify(place) !== JSON.stringify(s.place);
      // coral pieces stay "in hand": tap another spot to plant the next one
      const more = scene.mode === "plant" && c.from === "shelf" && target !== "shelf" ? nextFrag(place) : undefined;
      return { place, carry: more ? { card: more, from: "shelf" } : null };
    });
    audio.play(changed ? (target === "shelf" ? "pickup" : "drop") : "tap", { gain: 0.6 });
    if (keyboard) {
      const now = reefStore.get();
      if (now.carry) focus('[data-testid="target"]:not([aria-disabled="true"])');
      else if (submission(scene, now.place, now.pick) !== null) focus('[data-testid="done"]');
      else focus('[data-testid="choice"]:not([aria-disabled="true"])');
    }
    return changed;
  };

  const lift = (c: Carry, keyboard: boolean) => {
    if (!canAct) return;
    busy?.();
    const same = rs.carry && rs.carry.card === c.card && rs.carry.from === c.from;
    set(() => ({ carry: same ? null : c }));
    if (same) return;
    audio.play("pickup", { gain: 0.45 });
    if (keyboard) {
      const empty = scene.targets.find((t) => !targetOut(t.id) && (t.cap > 1 || cardsOn(rs.place, t.id).length === 0));
      focus(empty ? `[data-testid="target"][data-value="${empty.id}"]` : '[data-testid="target"]');
    }
  };

  const clicked = (e: React.MouseEvent) => e.timeStamp - suppress.current < 80;
  const kb = (e: React.MouseEvent) => e.detail === 0;

  const onShelfCard = (card: string, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    if (rs.carry && rs.carry.from !== "shelf") return void drop(rs.carry, "shelf", kb(e));
    if (cardOut(card)) return;
    lift({ card, from: "shelf" }, kb(e));
  };
  const onTarget = (t: Target, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    if (rs.carry) return void drop(rs.carry, t.id, kb(e));
    const here = cardsOn(rs.place, t.id);
    if (t.cap === 1 && here[0]) return lift({ card: here[0], from: t.id }, kb(e));
    // one card to place (food items): tapping a spot places it straight away
    if (scene.cards.length === 1 && !rs.place[scene.cards[0]!.id]) return void drop({ card: scene.cards[0]!.id, from: "shelf" }, t.id, kb(e));
  };
  const onPlaced = (card: string, from: string, e: React.MouseEvent) => {
    if (clicked(e) || !canAct) return;
    if (rs.carry && rs.carry.card !== card) return void drop(rs.carry, from, kb(e));
    lift({ card, from }, kb(e));
  };
  const onShelf = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget || clicked(e) || !canAct) return;
    if (rs.carry && rs.carry.from !== "shelf") drop(rs.carry, "shelf");
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
        if (t && t !== "shelf") drop(d.carry, t);
        else if (d.carry.from !== "shelf") drop(d.carry, "shelf");
        set((s) => (s.carry && scene.mode !== "plant" ? { carry: null } : {}));
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
  }, [drag !== null, canAct, rs]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, carry: Carry) => {
    if (!canAct || e.button !== 0) return;
    if (carry.from === "shelf" && cardOut(carry.card)) return;
    busy?.();
    const d: Drag = { carry, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, active: false };
    dragRef.current = d;
    setDrag(d);
  };

  // ---------- derived view ----------
  const done = progress?.done ?? 0;
  const restored = Math.min(RESTORE_ORDER.length, done + (celebrate ? 1 : 0));
  const patches = START_STATE.map((s, i) => {
    const k = RESTORE_ORDER.indexOf(i);
    return k >= 0 && k < restored ? "healthy" : s;
  });
  const healthy = patches.filter((p) => p === "healthy").length;
  const carrying = rs.carry ?? (drag?.active ? drag.carry : null);
  const cardById = (id: string) => scene.cards.find((c) => c.id === id);
  const carryLabel = carrying ? (cardById(carrying.card)?.label ?? "card") : "";
  const ok = (key: string) => st.attempts > 0 && st.check?.parts?.[key] === true;
  const status = `${healthy} of ${patches.length} coral patches healthy.`;

  const cls = ["rr-stage", `mode-${scene.mode}`, celebrate ? "is-celebrating" : "", carrying ? "is-carrying" : "", modelling ? "is-modelling" : "", reducedMotion ? "still" : ""].join(" ");

  const cardFace = (id: string, small = false) => {
    const c = cardById(id);
    if (!c) return null;
    return (
      <>
        {c.art && <span className="rr-card-art"><ReefObject kind={c.art} /></span>}
        {!(small && c.art) && <span className="rr-card-label">{c.label}</span>}
      </>
    );
  };

  /** A one-card target (food spot, chain slot, gap, frame spot): the target button itself shows its card. */
  const slot = (t: Target, extra: React.ReactNode = null, i = -1) => {
    const here = cardsOn(rs.place, t.id)[0];
    const isOut = targetOut(t.id);
    const partKey = scene.mode === "chain" || scene.mode === "story" ? String(i) : t.id;
    const modelHere = modelling && here !== undefined;
    return (
      <button
        key={t.id}
        type="button"
        className={`rr-target rr-slot ${here ? "is-full" : ""} ${isOut ? "is-out" : ""} ${hot === t.id ? "is-hot" : ""} ${carrying && !isOut ? "is-open" : ""} ${here && ok(partKey) ? "is-ok" : ""} ${modelHere ? "is-model" : ""} ${t.cond ? `cond-${t.cond}` : ""}`}
        data-testid="target"
        data-value={t.id}
        data-drop={t.id}
        data-card={here ?? ""}
        aria-disabled={!canAct || isOut}
        aria-label={
          carrying ? (isOut ? `${t.label}: not this one` : `Put the ${carryLabel} on ${t.label}`) : here ? `${t.label}: ${cardById(here)?.label}. Press to move it` : `${t.label}: empty`
        }
        onPointerDown={(e) => here && startDrag(e, { card: here, from: t.id })}
        onClick={(e) => onTarget(t, e)}
      >
        {extra}
        {here && <span className={`rr-placed ${scene.mode === "eats" ? "rr-eater" : ""}`}>{cardFace(here)}</span>}
      </button>
    );
  };

  /** A many-card target (habitat zone, Help/Harm bin, the reef): a drop button plus the placed cards beside it. */
  const zone = (t: Target, art: React.ReactNode, label: React.ReactNode) => {
    const here = cardsOn(rs.place, t.id);
    return (
      <div key={t.id} className={`rr-zone ${hot === t.id ? "is-hot" : ""} ${carrying ? "is-open" : ""} zone-${t.id}`} data-drop={t.id} role="group" aria-label={t.label}>
        <button
          type="button"
          className="rr-target rr-zone-btn"
          data-testid="target"
          data-value={t.id}
          data-count={here.length}
          aria-disabled={!canAct}
          aria-label={carrying ? `Put the ${carryLabel} on ${t.label}` : `${t.label}: ${here.length ? here.map((c) => cardById(c)?.label).join(", ") : "empty"}`}
          onClick={(e) => onTarget(t, e)}
        >
          <span className="rr-zone-art">{art}</span>
          <span className="rr-zone-label">{label}</span>
        </button>
        {here.length > 0 && (
          <div className="rr-zone-cards">
            {here.map((c) => (
              <button
                key={c}
                type="button"
                className={`rr-chip ${ok(c) ? "is-ok" : ""} ${modelling ? "is-model" : ""} ${rs.carry?.card === c ? "is-lifted" : ""}`}
                data-testid="placed"
                data-value={c}
                aria-disabled={!canAct}
                aria-label={`${cardById(c)?.label} on ${t.label}. Press to move it`}
                title={cardById(c)?.label}
                onPointerDown={(e) => startDrag(e, { card: c, from: t.id })}
                onClick={(e) => onPlaced(c, t.id, e)}
              >
                {cardFace(c, true)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cls}
      ref={rootRef}
      data-testid="reef-board"
      data-mode={scene.mode}
      data-params={JSON.stringify(ex.params ?? {})}
      data-place={JSON.stringify(rs.place)}
      data-healthy={healthy}
      onKeyDown={(e) => {
        if (e.key === "Escape" && rs.carry) set(() => ({ carry: null }));
      }}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="rr-layout">
        <div className="rr-scene" data-testid="scene">
          <Fishes count={1 + restored} still={reducedMotion} />
          <div className="rr-meter" data-testid="reef-meter" aria-label={status} role="img">
            <HealthIcon state="healthy" />
            <b>{healthy}</b>/{patches.length}
          </div>
          <div className="rr-play">
            <Play scene={scene} ex={ex} rs={rs} st={st} slot={slot} zone={zone} canAct={canAct} celebrate={celebrate} modelling={modelling} alongIndex={alongIndex} set={set} busy={busy} />
          </div>
          <div className="rr-reefline" aria-hidden="true">
            {patches.map((p, i) => (
              <span key={i} className={`rr-patch is-${p} ${celebrate && RESTORE_ORDER.indexOf(i) === restored - 1 ? "is-new" : ""}`} data-state={p}>
                <CoralPatch state={p} variant={i} />
                <HealthIcon state={p} />
              </span>
            ))}
          </div>
          {lens && LensBubble(scene, ex)}
          {result && (result.correct || st.phase !== "answering") && (
            <p className={`rr-result ${result.correct ? "is-right" : "is-try"}`} data-testid="result">
              {result.text}
            </p>
          )}
        </div>

        <div className={`rr-shelf ${rs.carry && rs.carry.from !== "shelf" ? "is-target" : ""} ${hot === "shelf" ? "is-hot" : ""}`} data-drop="shelf" data-testid="shelf" role="group" aria-label={SHELF_TITLE[scene.mode]} onClick={onShelf}>
          <p className="rr-shelf-title">{SHELF_TITLE[scene.mode]}</p>
          <Shelf scene={scene} rs={rs} st={st} canAct={canAct} onShelfCard={onShelfCard} startDrag={startDrag} cardOut={cardOut} set={set} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite" data-testid="announce">
        {result ? result.text : carrying ? `Holding ${carryLabel}. Choose where it goes.` : status}
      </p>

      {drag?.active && (
        <div className="rr-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {cardFace(drag.carry.card)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the reef's living parts

function Fishes({ count, still }: { count: number; still: boolean }) {
  return (
    <div className={`rr-fishes ${still ? "still" : ""}`} aria-hidden="true">
      {FISH_SPOTS.slice(0, count).map(([x, y], i) => (
        <span key={i} className={`rr-fish f${i % 3} ${i === count - 1 && i > 0 ? "is-new" : ""}`} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i * 0.7) % 3}s` }}>
          {i % 3 === 0 ? <Damselfish /> : i % 3 === 1 ? <Surgeonfish /> : <Parrotfish />}
        </span>
      ))}
    </div>
  );
}

function LensBubble(scene: Scene, ex: Exercise) {
  let art: React.ReactNode = <Polyp />;
  let text = LENS[scene.mode];
  if (scene.mode === "eats" && scene.animal) {
    art = <ReefObject kind={scene.animal.id} />;
    text = scene.animal.clue;
  } else if (scene.mode === "home") {
    art = <Polyp />;
    text = scene.cards.map((c) => `${c.label}: ${HOME_ITEMS[c.id as HomeItemId].needs.map((n) => NEED_LABEL[n]).join(" + ")}`).join(" · ");
  } else if (scene.mode === "chain" || scene.mode === "grazers") art = <ReefObject kind="parrotfish" />;
  else if (scene.mode === "story" || scene.mode === "risk" || scene.mode === "count") {
    art = <ReefObject kind={scene.story?.key === "recover" ? "story-cool" : "thermo"} />;
    if (scene.mode === "story") text = scene.story?.key === "recover" ? "It starts when the water cools" : "It starts with water that stays too warm";
  } else if (scene.mode === "plant" || scene.mode === "sort") art = <ReefObject kind="sun" />;
  return (
    <div className={`rr-lens mode-${scene.mode}`} data-testid="lens" key={ex.id}>
      <span className="rr-lens-glass">{art}</span>
      <span className="rr-lens-text"><small>Dabble's lens</small>{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------- mode layouts (inside the reef)

interface PlayProps {
  scene: Scene;
  ex: Exercise;
  rs: ReefState;
  st: BoardProps["st"];
  slot: (t: Target, extra?: React.ReactNode, i?: number) => React.JSX.Element;
  zone: (t: Target, art: React.ReactNode, label: React.ReactNode) => React.JSX.Element;
  canAct: boolean;
  celebrate: boolean;
  modelling: boolean;
  alongIndex: number;
  set: (c: (s: ReefState) => Partial<ReefState>) => void;
  busy?: () => void;
}

function Play({ scene, ex, rs, st, slot, zone, canAct, celebrate, modelling, alongIndex, set, busy }: PlayProps) {
  switch (scene.mode) {
    case "eats":
      return (
        <div className={`rr-foods n${scene.targets.length}`}>
          {scene.targets.map((t) =>
            slot(
              t,
              <>
                <span className="rr-food-art"><ReefObject kind={t.art ?? ""} /></span>
                <span className="rr-food-label">{FOODS[t.id as FoodId]?.label ?? t.label}</span>
              </>,
            ),
          )}
        </div>
      );
    case "home":
      return (
        <div className={`rr-zones n${scene.targets.length}`}>
          {scene.targets.map((t) =>
            zone(
              t,
              <ReefObject kind={t.art ?? ""} />,
              <>
                <b>{t.label}</b>
                <small>{ZONES[t.id as ZoneId].gives.length ? ZONES[t.id as ZoneId].gives.map((n) => NEED_LABEL[n]).join(" + ") : "no light, no ground"}</small>
              </>,
            ),
          )}
        </div>
      );
    case "chain":
    case "story":
      return (
        <ol className={`rr-strip n${scene.targets.length}`} aria-label={scene.mode === "chain" ? "Food chain: each arrow means gives energy to" : "Story in order"}>
          {scene.targets.map((t, i) => (
            <li key={t.id} className={`rr-step ${modelling && alongIndex >= i ? "is-shown" : ""}`}>
              {slot(t, !cardsOn(rs.place, t.id).length ? <span className="rr-slot-hint">{scene.mode === "chain" && i === 0 ? "start" : i + 1}</span> : null, i)}
              {i < scene.targets.length - 1 && (
                <span className="rr-arrow" aria-hidden="true">
                  <svg viewBox="0 0 40 20"><path d="M2 10 H30 M24 3 L34 10 L24 17" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {scene.mode === "chain" && <small>energy</small>}
                </span>
              )}
            </li>
          ))}
        </ol>
      );
    case "fact": {
      const f = scene.fact!;
      return (
        <div className="rr-sentence">
          <span className="rr-polyp"><Polyp algae={st.hintStage > 0 || celebrate} /></span>
          <p>
            <span>{f.stem.replace("…", "")}</span> {slot(scene.targets[0]!, !cardsOn(rs.place, "blank").length ? <span className="rr-slot-hint">?</span> : null)}
          </p>
        </div>
      );
    }
    case "sort":
      return (
        <div className="rr-bins">
          {scene.targets.map((t) =>
            zone(
              t,
              <svg viewBox="0 0 40 40" aria-hidden="true">
                {t.id === "help" ? (
                  <path d="M20 34 C8 26 4 18 8 12 C12 6 18 8 20 13 C22 8 28 6 32 12 C36 18 32 26 20 34 Z" fill="#FF7A8A" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />
                ) : (
                  <g><path d="M20 4 L37 34 H3 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" /><path d="M20 14 V24 M20 28 V30" stroke="#2B2140" strokeWidth="3.5" strokeLinecap="round" /></g>
                )}
              </svg>,
              <b>{t.label}</b>,
            ),
          )}
        </div>
      );
    case "grazers":
      return (
        <div className={`rr-overgrown ${celebrate ? "is-clean" : ""}`}>
          {zone(
            scene.targets[0]!,
            <span className="rr-overgrown-art">
              <CoralPatch state={celebrate ? "healthy" : "pale"} variant={1} />
              <span className="rr-algae-cover"><ReefObject kind="algae" /></span>
            </span>,
            <b>Algae is covering this coral</b>,
          )}
        </div>
      );
    case "plant":
      return (
        <div className="rr-frame" role="group" aria-label="Reef restoration frame with 8 spots">
          {scene.targets.map((t) => slot(t, <><FrameSlotArt cond={t.cond ?? "good"} /><span className="rr-cond">{SLOT_TEXT[t.cond ?? "good"].label}</span></>))}
        </div>
      );
    case "risk":
    case "count":
      return <Chart scene={scene} ex={ex} rs={rs} st={st} canAct={canAct} modelling={modelling} alongIndex={alongIndex} set={set} busy={busy} />;
  }
}

function Chart({ scene, ex, rs, st, canAct, modelling, alongIndex, set, busy }: Omit<PlayProps, "slot" | "zone" | "celebrate">) {
  const temps = scene.temps ?? [];
  const runs = scene.runs ?? [];
  const lo = 25;
  const hi = 33;
  const y = (t: number) => ((t - lo) / (hi - lo)) * 100;
  const line = ex.params?.line ?? USUAL_HIGH;
  const risk = scene.mode === "risk";
  const best = riskiestRun(temps);
  // count model: mark warm weeks one by one with their number
  const aboveIdx = temps.map((t, i) => (t > line ? i : -1)).filter((i) => i >= 0);
  const marked = (i: number) => (scene.mode === "count" && modelling ? aboveIdx.indexOf(i) : -1);
  const choose = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    busy?.();
    audio.play("tap", { gain: 0.5 });
    set((s) => ({ pick: s.pick === id ? null : id }));
  };
  if (rs.table) {
    return (
      <div className="rr-table-wrap">
        <table className="rr-table" data-testid="chart-table">
          <caption>Example sea temperatures (°C). Usual summer high: {line} °C</caption>
          <thead><tr><th scope="col">Week</th><th scope="col">°C</th><th scope="col">Above?</th></tr></thead>
          <tbody>
            {temps.map((t, i) => (
              <tr key={i} className={t > line ? "is-above" : ""}><th scope="row">{i + 1}</th><td>{t}</td><td>{t > line ? "above" : "–"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="rr-chart" data-testid="chart" aria-hidden={false}>
      <div className="rr-chart-plot">
        <div className="rr-plotarea" aria-hidden="true"><div className="rr-usual" style={{ bottom: `${y(line)}%` }}><span>usual summer high {line} °C</span></div></div>
        <div className="rr-bars">
          {temps.map((t, i) => (
            <div key={i} className={`rr-bar-col ${t > line ? "is-above" : ""}`}>
              <span className="rr-bar" style={{ height: `${y(t)}%` }} data-value={t}>
                <small>{t}</small>
                {marked(i) >= 0 && marked(i) <= alongIndex && <em className="rr-mark">{marked(i) + 1}</em>}
              </span>
              <span className="rr-week">{i + 1}</span>
            </div>
          ))}
        </div>
        {risk && (
          <div className="rr-runs">
            {runs.map((r, k) => {
              const id = runId(r);
              const picked = rs.pick === id;
              const isOut = st.eliminated.includes(id);
              const isModel = modelling && (alongIndex >= runs.length - 1 ? id === st.model : k === alongIndex);
              const state = st.phase === "feedback" && st.lastAnswer === id ? (st.feedback?.correct ? "is-right" : "is-wrong") : "";
              return (
                <button
                  key={id}
                  type="button"
                  className={`rr-run ${picked ? "is-picked" : ""} ${isOut ? "is-out" : ""} ${isModel ? "is-model" : ""} ${state}`}
                  style={{ "--l": `${(r.start / temps.length) * 100}%`, "--w": `${(r.len / temps.length) * 100}%` } as React.CSSProperties}
                  data-testid="choice"
                  data-value={id}
                  aria-pressed={picked}
                  aria-disabled={!canAct || isOut}
                  aria-label={`${r.len === 1 ? `Week ${r.start + 1}` : `Weeks ${r.start + 1} to ${r.end + 1}`}: ${r.len} warm ${r.len === 1 ? "week" : "weeks"} above the usual high, up to ${Math.max(...temps.slice(r.start, r.end + 1))} °C. Press to choose`}
                  onClick={() => choose(id)}
                >
                  {modelling && k <= alongIndex && <span className="rr-run-len">{r.len} wk</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="rr-example">Example data · °C, weeks 1–12{risk ? " · tap a warm spell" : ""}{best && modelling && risk ? ` · longest warm spell: ${best.len} weeks` : ""}</p>
    </div>
  );
}

// ---------------------------------------------------------------- the shelf

interface ShelfProps {
  scene: Scene;
  rs: ReefState;
  st: BoardProps["st"];
  canAct: boolean;
  onShelfCard: (card: string, e: React.MouseEvent) => void;
  startDrag: (e: React.PointerEvent, c: Carry) => void;
  cardOut: (c: string) => boolean;
  set: (c: (s: ReefState) => Partial<ReefState>) => void;
}

function Shelf({ scene, rs, st, canAct, onShelfCard, startDrag, cardOut, set }: ShelfProps) {
  const returning = rs.carry && rs.carry.from !== "shelf";
  if (scene.mode === "risk" || scene.mode === "count") {
    return (
      <div className="rr-notes">
        <p><span className="rr-key above" aria-hidden="true" /> above the usual summer high</p>
        <p><span className="rr-key" aria-hidden="true" /> at or below it</p>
        <button type="button" className="rr-table-btn" data-testid="table-toggle" aria-pressed={rs.table} onClick={() => set((s) => ({ table: !s.table }))}>
          {rs.table ? "Show the chart" : "Show as a table"}
        </button>
      </div>
    );
  }
  if (scene.mode === "plant") {
    const left = FRAG_IDS.filter((f) => !rs.place[f]);
    const next = left[0];
    const lifted = rs.carry?.from === "shelf";
    return (
      <div className="rr-cards">
        <button
          type="button"
          className={`rr-card rr-frags ${lifted ? "is-lifted" : ""}`}
          data-testid="choice"
          data-value="frag"
          data-left={left.length}
          aria-pressed={!!lifted}
          aria-disabled={!canAct || (!next && !returning)}
          aria-label={returning ? "Put the coral piece back" : `${left.length} coral ${left.length === 1 ? "piece" : "pieces"} left. Press, then press a spot on the frame to plant one`}
          onPointerDown={(e) => next && startDrag(e, { card: next, from: "shelf" })}
          onClick={(e) => (next || returning) && onShelfCard(next ?? rs.carry!.card, e)}
        >
          <span className="rr-frag-stack">{left.map((f) => <span key={f} className="rr-frag"><ReefObject kind="coral" /></span>)}</span>
          <span className="rr-card-label">×{left.length}</span>
        </button>
      </div>
    );
  }
  const waiting = scene.cards.filter((c) => !rs.place[c.id]);
  return (
    <div className={`rr-cards n${scene.cards.length} mode-${scene.mode}`}>
      {waiting.map((c) => {
        const isOut = cardOut(c.id);
        const lifted = rs.carry?.card === c.id;
        const model = st.hintStage === 2 && !isOut;
        return (
          <button
            key={c.id}
            type="button"
            className={`rr-card ${lifted ? "is-lifted" : ""} ${isOut ? "is-out" : ""} ${model ? "is-model" : ""} ${c.art ? "has-art" : ""}`}
            data-testid="choice"
            data-value={c.id}
            aria-pressed={lifted}
            aria-disabled={!canAct || isOut}
            aria-label={returning ? `Put it back on the shelf` : isOut ? `${c.label} (not this one)` : `${c.label}. Press, then press where it goes`}
            onPointerDown={(e) => startDrag(e, { card: c.id, from: "shelf" })}
            onClick={(e) => onShelfCard(c.id, e)}
          >
            {c.art && <span className="rr-card-art"><ReefObject kind={c.art} /></span>}
            <span className="rr-card-label">{c.label}</span>
          </button>
        );
      })}
      {waiting.length === 0 && <p className="rr-shelf-empty">All placed! Press Check.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- tray: number picks + Check

export function ReefTray({ st, act }: BoardProps) {
  const ex = st.exercise;
  const scene = useMemo(() => sceneOf(ex), [ex]);
  const rs = useReef(ex.id);
  const canAct = st.phase === "answering";
  const value = submission(scene, rs.place, rs.pick);
  const ordered = ex.answer.kind === "sequence";
  const ok = canAct && allowed(value, st.eliminated, st.model, ordered);
  const coach = !!ex.tutorial && canAct && st.attempts === 0 && value !== null;
  const nums = ex.answer.kind === "number" ? (ex.answer.choices ?? []) : [];
  const check = () => {
    if (!ok || value === null) return;
    act({ type: "SUBMIT", value: value as AnswerValue });
  };
  return (
    <div className={`choice-tray rr-tray ${nums.length ? "has-nums" : ""}`} role="group" aria-label="Answer">
      {nums.length > 0 && (
        <div className="rr-nums" role="group" aria-label="How many weeks?">
          {nums.map((n) => {
            const isOut = st.eliminated.includes(n);
            const picked = rs.pick === n;
            const model = st.model === n && canAct;
            return (
              <button
                key={n}
                type="button"
                className={`choice rr-num ${picked ? "is-picked" : ""} ${isOut ? "is-out" : ""} ${model ? "is-model" : ""}`}
                data-testid="choice"
                data-value={n}
                aria-pressed={picked}
                aria-disabled={!canAct || isOut}
                aria-label={`${n} weeks`}
                onClick={() => {
                  if (!canAct || isOut) return;
                  audio.play("tap", { gain: 0.5 });
                  reefStore.update(ex.id, (s) => ({ pick: s.pick === n ? null : n }));
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={`rr-check ${ok ? "is-ready" : ""} ${coach || (ok && st.hintStage === 2) ? "is-coach" : ""}`}
        data-testid="done"
        aria-disabled={!ok}
        aria-label={ok ? "Check my answer" : "Check (place the cards first)"}
        onClick={check}
      >
        <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 21 L17 30 L33 11" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>Check</span>
      </button>
    </div>
  );
}

/** Worked-example steps for the runner's model hint. */
export const modelSteps = (ex: Exercise) => stepsOf(sceneOf(ex), ex);

/** For e2e helpers and docs: the full name of an animal id. */
export const animalName = (id: string) => ANIMALS.find((a) => a.id === id)?.name ?? id;
