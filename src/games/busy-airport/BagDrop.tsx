import { useEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { IconHand } from "../../ui/icons";
import { Bag, Plane } from "./art";
import { parseArt, ruleOf, type BagRule } from "./generator";
import { Ghost, focusSel, gridFor, modelSlice, useAfterMiss, useCommon, useDrag, usePublish, useReadyCue, useSize } from "./shared";

/**
 * Bag Drop — suitcases ride the conveyor; the child loads each one onto the plane with the same colour / shape /
 * colour and shape (match answer: bag → plane). Drag a bag onto a plane, or tap the bag then the plane
 * (keyboard: Enter on a bag, then Enter on a plane). Tapping a plane with nothing picked up takes its last bag back.
 * Ready checks. First miss: right bags stay loaded with a tick, wrong ones roll back. Second miss: every bag is
 * loaded for the child, one by one, and Ready glows.
 */
const describeBag = (art: string | undefined, rule: BagRule) => {
  const { colour, tag } = parseArt(art);
  if (rule === "colour") return `${colour} suitcase`;
  if (rule === "shape") return `${colour} suitcase with a ${tag} tag`;
  return `${colour} suitcase with a ${tag} tag`;
};
const describePlane = (art: string | undefined, rule: BagRule) => {
  const { colour, tag } = parseArt(art);
  if (rule === "colour") return `the ${colour} plane`;
  if (rule === "shape") return `the plane with a ${tag} on its tail`;
  return `the ${colour} plane with a ${tag} on its tail`;
};

export function BagDropBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  if (ex.answer.kind !== "match") throw new Error("Bag Drop needs a match answer");
  const { items, targets } = ex.answer;
  const rule = ruleOf(ex);
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const nextFocus = useRef(0);
  useEffect(() => () => window.clearTimeout(nextFocus.current), []);
  const [beltRef, belt] = useSize<HTMLDivElement>();
  const grid = gridFor(items.length, belt.w - 16, belt.h - 12, 124, 10);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [okLocked, setOkLocked] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const model = st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
  const shown: Record<string, string> = model ? Object.fromEntries(modelSlice(items.map((it) => it.id), alongIndex, st.phase).map((id) => [id, model[id]!])) : assign;
  const act2 = canAct && !locked;

  const place = (id: string, plane: string, keyboard = false) => {
    if (!act2 || okLocked.includes(id)) return;
    busy?.();
    setTouched(true);
    setAssign((a) => ({ ...a, [id]: plane }));
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    if (keyboard) {
      // move on to the next bag, unless the child has already moved on (picking a bag cancels this; a late timer
      // used to pull focus back to the first bag after the next bag was picked)
      const from = document.activeElement;
      window.clearTimeout(nextFocus.current);
      nextFocus.current = window.setTimeout(() => {
        const now = document.activeElement;
        if (now === from || !now || now === document.body || !now.isConnected) focusSel(rootRef.current, '[data-testid="bag"]:not([aria-disabled="true"])', '[data-testid="done"]');
      }, 0);
    }
  };
  const takeBack = (plane: string) => {
    if (!act2) return;
    const last = Object.keys(assign).filter((id) => assign[id] === plane && !okLocked.includes(id)).pop();
    if (!last) return;
    busy?.();
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== last)));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(act2, (id, target) => {
    if (target?.startsWith("plane:")) place(id, target.slice(6));
  }, busy);
  useAfterMiss(st, (parts) => {
    setOkLocked(Object.keys(parts).filter((id) => parts[id]));
    setAssign((a) => Object.fromEntries(Object.entries(a).filter(([k]) => parts[k])));
  });
  const complete = items.every((it) => shown[it.id] !== undefined);
  usePublish(ex.id, model ? model : complete ? assign : null);
  useReadyCue(complete && !model && canAct, speaking);

  // tutorial: a hand drags a ghost bag to the right plane until the child acts
  const [demo, setDemo] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const first = items[0]!;
  const showDemo = !!ex.tutorial && !touched && canAct && !selected && !drag;
  useEffect(() => {
    if (!showDemo) return setDemo(null);
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const a = rootRef.current?.querySelector(`[data-testid="bag"][data-value="${first.id}"]`)?.getBoundingClientRect();
      const b = rootRef.current?.querySelector(`[data-testid="plane"][data-value="${ex.answer.kind === "match" ? ex.answer.pairs[first.id] : ""}"]`)?.getBoundingClientRect();
      if (!root || !a || !b) return;
      setDemo({ x: a.left - root.left + a.width / 2, y: a.top - root.top + a.height / 2, tx: b.left - root.left + b.width / 2, ty: b.top - root.top + b.height / 2 });
    };
    const t = window.setTimeout(measure, 2400);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [showDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragged = drag ? items.find((o) => o.id === drag.id) : undefined;
  const bagOf = (art?: string) => parseArt(art);
  return (
    <div ref={rootRef} className={`ba-board mode-bags ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ba-board" data-mode="bags" data-rule={rule}>
      <div className={`ba-hangar n${targets.length}`} role="group" aria-label="Planes">
        {targets.map((t) => {
          const p = parseArt(t.art);
          const inside = items.filter((it) => shown[it.id] === t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`ba-plane ${hot === `plane:${t.id}` || (selected && !locked) ? "hot" : ""} ${celebrate ? "is-right" : ""}`}
              data-testid="plane"
              data-value={t.id}
              data-colour={p.colour}
              data-tag={p.tag}
              data-ba-drop={`plane:${t.id}`}
              aria-disabled={!act2}
              aria-label={`${describePlane(t.art, rule)}, ${inside.length} ${inside.length === 1 ? "bag" : "bags"} loaded. ${selected ? "Press to load the bag here" : inside.length ? "Press to take the last bag back" : ""}`}
              onClick={(e) => {
                if (ignoreClick(e)) return;
                if (selected) place(selected, t.id, e.detail === 0);
                else takeBack(t.id);
              }}
            >
              <span className="ba-plane-pic"><Plane colour={p.colour} tag={p.tag} /></span>
              <span className="ba-hold" aria-hidden="true">
                {inside.map((it) => {
                  const b = bagOf(it.art);
                  const ok = okLocked.includes(it.id);
                  return (
                    <span key={it.id} className={`ba-loaded ${ok ? "is-ok" : ""} ${model ? "is-model" : ""}`} data-testid="loaded" data-value={it.id}>
                      <Bag colour={b.colour} tag={b.tag} />
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
      <div className="ba-belt" ref={beltRef}>
        <div className={`ba-belt-track ${celebrate ? "" : "is-moving"}`} aria-hidden="true" />
        <div className="ba-belt-bags" role="group" aria-label="Bags on the conveyor belt" style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {items.map((it, i) => {
            const b = bagOf(it.art);
            if (shown[it.id] !== undefined) return <span key={it.id} className="ba-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
            const backAfterMiss = st.hintStage >= 1 && st.check?.parts?.[it.id] === false;
            return (
              <button
                key={it.id}
                type="button"
                className={`ba-item ba-bag ${selected === it.id ? "lifted" : ""} ${drag?.id === it.id ? "ghosted" : ""} ${backAfterMiss ? "is-back" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 90}ms` }}
                data-testid="bag"
                data-value={it.id}
                data-colour={b.colour}
                data-tag={b.tag}
                {...(i === 0 ? { "data-ba-idle": "" } : {})}
                aria-pressed={selected === it.id}
                aria-disabled={!act2}
                aria-label={selected === it.id ? "Bag picked up. Now choose a plane" : `Bag ${i + 1}: ${describeBag(it.art, rule)}. Press to pick it up`}
                onPointerDown={(e) => start(e, it.id)}
                onClick={(e) => {
                  if (ignoreClick(e) || !act2) return;
                  window.clearTimeout(nextFocus.current);
                  busy?.();
                  setTouched(true);
                  setSelected((s) => (s === it.id ? null : it.id));
                  audio.play("pickup", { gain: 0.5 });
                  if (e.detail === 0) focusSel(rootRef.current, '[data-testid="plane"]');
                }}
              >
                <Bag colour={b.colour} tag={b.tag} />
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{targets.map((t) => `${describePlane(t.art, rule)}: ${items.filter((it) => shown[it.id] === t.id).length} loaded.`).join(" ")}</p>
      <Ghost drag={drag} size={grid.cell}>{dragged && <Bag colour={bagOf(dragged.art).colour} tag={bagOf(dragged.art).tag} />}</Ghost>
      {demo && showDemo && (
        <div className={`ba-demo ${reducedMotion ? "still" : ""}`} aria-hidden="true" data-testid="drag-demo" style={{ left: demo.x, top: demo.y, "--dx": `${demo.tx - demo.x}px`, "--dy": `${demo.ty - demo.y}px` } as React.CSSProperties}>
          <span className="ba-demo-thing"><Bag colour={bagOf(first.art).colour} tag={bagOf(first.art).tag} /></span>
          <span className="ba-demo-hand"><IconHand /></span>
        </div>
      )}
    </div>
  );
}
