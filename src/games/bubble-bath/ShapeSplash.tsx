import { useEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { IconHand } from "../../ui/icons";
import { FoamToy, Hole, WallThingArt } from "./art";
import { holeShape, isTipped, parseThing, parseToy } from "./generator";
import { Ghost, focusSel, gridFor, modelSlice, useAfterMiss, useCommon, useDrag, usePublish, useReadyCue, useSize } from "./shared";

/**
 * Shape Splash — two scenes in one inner game.
 *  sort: foam bath toys float in the water; post each one into the toy box hole with the same shape (match toy → hole).
 *        Drag a toy onto a hole, or tap the toy then the hole (keyboard: Enter, Enter). Tapping a hole with nothing
 *        picked up takes its last toy back. Ready checks. First miss: right toys stay posted with a tick, wrong ones
 *        float back. Second miss: every toy is posted for the child, one by one, and Ready glows.
 *  find: things hang on the bathroom wall; tap the one with the named shape (choice). First miss: the wrong pick greys
 *        out and every thing shows its corner dots. Second miss: the right one glows and Gloop counts its corners.
 */
const describeToy = (art: string | undefined) => {
  const t = parseToy(art);
  const shape = t.skinny ? "long, thin triangle" : t.shape;
  return `${t.colour} ${shape}${isTipped(t.shape, t.rot) ? ", tipped over" : ""}`;
};
const SIDES = { circle: "round all the way, no corners", square: "4 straight sides the same length, 4 corners", triangle: "3 straight sides, 3 corners" } as const;
const THING_NAME = { mirror: "Round mirror", clock: "Clock", ball: "Ball", window: "Window", tile: "Tile", box: "Tissue box", flag: "Flag", shelf: "Corner shelf" } as const;
export const describeThing = (art: string | undefined) => {
  const t = parseThing(art);
  return `${THING_NAME[t.thing]}: ${SIDES[t.shape]}${t.skinny ? ", long and thin" : ""}${isTipped(t.shape, t.rot) ? ", turned" : ""}`;
};

export function SortBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "match") throw new Error("Shape Splash sort needs a match answer");
  const { items, targets } = ex.answer;
  const pairs = ex.answer.pairs;
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const nextFocus = useRef(0);
  useEffect(() => () => window.clearTimeout(nextFocus.current), []);
  const [boxRef, box] = useSize<HTMLDivElement>();
  const [waterRef, water] = useSize<HTMLDivElement>();
  const holeGrid = gridFor(targets.length, box.w - 16, box.h - 12, 150, 12);
  const toyGrid = gridFor(items.length, water.w - 16, water.h - 12, 128, 10);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [okLocked, setOkLocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const model = st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
  const shown: Record<string, string> = model ? Object.fromEntries(modelSlice(items.map((it) => it.id), alongIndex, st.phase).map((id) => [id, model[id]!])) : assign;
  const act2 = canAct && !locked;

  const place = (id: string, hole: string, keyboard = false) => {
    if (!act2 || okLocked.includes(id)) return;
    busy?.();
    setAssign((a) => ({ ...a, [id]: hole }));
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    if (keyboard) {
      const from = document.activeElement;
      window.clearTimeout(nextFocus.current);
      nextFocus.current = window.setTimeout(() => {
        const now = document.activeElement;
        if (now === from || !now || now === document.body || !now.isConnected) focusSel(rootRef.current, '[data-testid="toy"]:not([aria-disabled="true"])', '[data-testid="done"]');
      }, 0);
    }
  };
  const takeBack = (hole: string) => {
    if (!act2) return;
    const last = Object.keys(assign).filter((id) => assign[id] === hole && !okLocked.includes(id)).pop();
    if (!last) return;
    busy?.();
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== last)));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target?.startsWith("hole:")) place(id, target.slice(5));
  }, busy);
  useAfterMiss(st, (parts) => {
    setOkLocked(Object.keys(parts).filter((id) => parts[id]));
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => parts[k])));
  });
  const complete = items.every((it) => shown[it.id] !== undefined);
  usePublish(ex.id, model ? model : complete ? assign : null);
  useReadyCue(complete && !model && canAct, speaking);

  // tutorial: once the first toy is picked up, a hand shows which hole it goes in
  const tutorialHole = ex.tutorial && selected && Object.keys(assign).length === 0 ? pairs[selected] : null;
  const firstFree = items.find((it) => shown[it.id] === undefined)?.id;
  const dragged = drag ? items.find((o) => o.id === drag.id) : undefined;
  return (
    <div ref={rootRef} className={`gb-board mode-sort ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="sort">
      <div className="gb-toybox" ref={boxRef}>
        <div className="gb-holes" role="group" aria-label="Toy box holes" style={{ gridTemplateColumns: `repeat(${holeGrid.cols}, ${holeGrid.cell}px)` }}>
          {targets.map((t) => {
            const shape = holeShape(t.art);
            const inside = items.filter((it) => shown[it.id] === t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`gb-hole ${hot === `hole:${t.id}` || (selected && !locked) ? "hot" : ""} ${celebrate ? "is-right" : ""}`}
                style={{ width: holeGrid.cell, height: holeGrid.cell }}
                data-testid="hole"
                data-value={t.id}
                data-shape={shape}
                data-gb-drop={`hole:${t.id}`}
                aria-disabled={!act2}
                aria-label={`The ${shape} hole, ${inside.length} ${inside.length === 1 ? "toy" : "toys"} inside. ${selected ? "Press to post the toy here" : inside.length ? "Press to take the last toy back" : ""}`}
                onClick={(e) => {
                  if (ignoreClick(e)) return;
                  if (selected) place(selected, t.id, e.detail === 0);
                  else takeBack(t.id);
                }}
              >
                <Hole shape={shape} />
                <span className="gb-posted" aria-hidden="true">
                  {inside.map((it) => (
                    <span key={it.id} className={`gb-chip ${okLocked.includes(it.id) ? "is-ok" : ""} ${model ? "is-model" : ""}`} data-testid="posted" data-value={it.id}>
                      <FoamToy art={it.art} />
                    </span>
                  ))}
                </span>
                {tutorialHole === t.id && <span className="gb-tut-hand" data-testid="tutorial-hand"><IconHand /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="gb-water" ref={waterRef}>
        <div className="gb-toys" role="group" aria-label="Toys floating in the bath" style={{ gridTemplateColumns: `repeat(${toyGrid.cols}, ${toyGrid.cell}px)` }}>
          {items.map((it, i) => {
            if (shown[it.id] !== undefined) return <span key={it.id} className="gb-slot-ring" style={{ width: toyGrid.cell, height: toyGrid.cell }} aria-hidden="true" />;
            const back = st.hintStage >= 1 && st.check?.parts?.[it.id] === false;
            const t = parseToy(it.art);
            return (
              <button
                key={it.id}
                type="button"
                className={`gb-item gb-toy-btn ${selected === it.id ? "lifted" : ""} ${drag?.id === it.id ? "ghosted" : ""} ${back ? "is-back" : ""}`}
                style={{ width: toyGrid.cell, height: toyGrid.cell, animationDelay: `${i * 90}ms` }}
                data-testid="toy"
                data-value={it.id}
                data-shape={t.shape}
                {...(it.id === firstFree ? { "data-gb-idle": "" } : {})}
                {...(ex.tutorial && it.id === firstFree ? { "data-gb-tutorial": "" } : {})}
                aria-pressed={selected === it.id}
                aria-disabled={!act2}
                aria-label={selected === it.id ? "Toy picked up. Now choose a hole" : `Toy ${i + 1}: ${describeToy(it.art)}. Press to pick it up`}
                onPointerDown={(e) => start(e, it.id)}
                onClick={(e) => {
                  if (ignoreClick(e) || !act2) return;
                  window.clearTimeout(nextFocus.current);
                  busy?.();
                  setSelected((s) => (s === it.id ? null : it.id));
                  audio.play("pickup", { gain: 0.5 });
                  if (e.detail === 0) focusSel(rootRef.current, '[data-testid="hole"]');
                }}
              >
                <FoamToy art={it.art} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      <p className="sr-only" aria-live="polite">{targets.map((t) => `${holeShape(t.art)} hole: ${items.filter((it) => shown[it.id] === t.id).length} toys.`).join(" ")}</p>
      <Ghost drag={drag} size={toyGrid.cell}>{dragged && <FoamToy art={dragged.art} />}</Ghost>
    </div>
  );
}

export function FindBoard({ st, act, alongIndex }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "choice") throw new Error("Shape Splash find needs a choice answer");
  const { options, correct } = ex.answer;
  const { reducedMotion, canAct, celebrate } = useCommon(st);
  const [wallRef, wall] = useSize<HTMLDivElement>();
  const grid = gridFor(options.length, wall.w - 24, wall.h - 20, 220, 14);
  const right = celebrate;
  const corners = st.hintStage >= 1;
  const counting = st.phase === "feedback" && st.model !== null && alongIndex >= 0;
  return (
    <div className={`gb-board mode-find ${celebrate ? "is-celebrating" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="find">
      <div className="gb-wall" ref={wallRef} data-gb-idle="">
        <div className="gb-things" role="group" aria-label="Things on the bathroom wall" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {options.map((o, i) => {
            const out = st.eliminated.includes(o.id);
            const isRight = right && st.lastAnswer === o.id;
            const isWrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === o.id;
            const isModel = st.model === o.id;
            return (
              <button
                key={o.id}
                type="button"
                className={`gb-item gb-thing-btn tilt-${i % 3} ${out ? "is-out" : ""} ${isRight ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${isModel ? "is-model" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 80}ms` }}
                data-testid="choice"
                data-value={o.id}
                data-shape={parseThing(o.art).shape}
                aria-disabled={!canAct || out}
                aria-label={describeThing(o.art)}
                onClick={() => canAct && !out && act({ type: "SUBMIT", value: o.id })}
              >
                <WallThingArt art={o.art} corners={(corners && !out) || isModel} upTo={isModel && counting ? alongIndex : -1} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      {st.model === correct && <p className="sr-only" aria-live="polite">{describeThing(options.find((o) => o.id === correct)?.art)}.</p>}
    </div>
  );
}
