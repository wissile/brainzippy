import { useEffect, useMemo, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { CREW_NAMES, JumboPlane, Passenger } from "./art";
import { MAX_PASSENGERS, crewFor, modeOf } from "./generator";
import { Ghost, boardedStore, focusSel, gridFor, useCommon, useDrag, usePublish, useSize } from "./shared";

/**
 * All Aboard — Critter Crew passengers climb the steps into Ziggy's big plane. Its ten windows sit in two rows of
 * five (a ten-frame), and each passenger who boards takes the next window with its number.
 *  count — board every passenger (one tap, one passenger, one number), then choose how many got on (number + choices).
 *  make  — Ziggy needs n: board exactly n from a bigger group, "Send one back" if too many, then Ready (number).
 * Drag a passenger onto the plane, or tap / press Enter. First miss: Hoot explains; for make, the n seats Ziggy needs
 * light up as dashed rings. Second miss: the windows are counted aloud one by one and the answer glows.
 */
export function AllAboardBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const mode = modeOf(ex);
  const n = ex.answer.kind === "number" ? ex.answer.value : 0;
  const pool = mode === "make" ? Math.min(MAX_PASSENGERS, ex.params?.pool ?? n) : n;
  const crew = useMemo(() => crewFor(ex.seed, pool), [ex.seed, pool]);
  const { reducedMotion, speaking, canAct, celebrate, wrong, locked } = useCommon(st);
  const rootRef = useRef<HTMLDivElement>(null);
  const [loungeRef, lounge] = useSize<HTMLDivElement>();
  const grid = gridFor(pool, lounge.w - 16 - (mode === "make" ? 84 : 0), lounge.h - 16, 150, 8);
  const [boarded, setBoarded] = useState<number[]>([]);
  const [pop, setPop] = useState(-1);
  const modelOn = typeof st.model === "number";
  // make: the modelled answer boards passengers 0..n−1 for the child (count-along reveals them one by one)
  const shownBoarded = mode === "make" && modelOn
    ? Array.from({ length: n }, (_, i) => i).slice(0, st.phase === "feedback" && alongIndex >= 0 ? alongIndex + 1 : st.phase === "feedback" ? 0 : n)
    : boarded;
  const allIn = mode === "count" && boarded.length === n;
  const act2 = canAct && !locked;
  const boardOk = mode === "count" ? canAct && !allIn : act2;

  const board = (i: number, keyboard = false) => {
    if (!boardOk || boarded.includes(i) || boarded.length >= MAX_PASSENGERS) return;
    busy?.();
    const k = boarded.length + 1;
    setBoarded((b) => [...b, i]);
    setPop(k - 1);
    audio.playCount(k);
    audio.sayNumber(k);
    if (keyboard) {
      window.setTimeout(() => {
        if (mode === "count" && k === n) focusSel(rootRef.current, '[data-testid="choice"]');
        else focusSel(rootRef.current, '[data-testid="passenger"]:not([aria-disabled="true"])', '[data-testid="done"]');
      }, 0);
    }
  };
  const unboard = () => {
    if (!act2 || boarded.length === 0) return;
    busy?.();
    setBoarded((b) => b.slice(0, -1));
    audio.play("pickup", { gain: 0.5 });
  };
  const { drag, hot, start, ignoreClick } = useDrag(boardOk, (id, target) => {
    if (target === "plane") board(Number(id));
  }, busy);

  // count: once everyone is aboard, ask how many (once) and wake up the number choices
  useEffect(() => {
    boardedStore.set({ exId: ex.id, all: allIn });
    if (allIn && !speaking) void audio.speak("ba.count.howMany");
  }, [allIn, ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => boardedStore.set({ exId: "", all: false }), []);
  usePublish(ex.id, mode === "make" ? (modelOn ? n : boarded.length > 0 ? boarded.length : null) : null);

  const seats = shownBoarded.length;
  // worked example: count along the filled windows (count) / the seats being filled (make)
  const alongNow = st.phase === "feedback" && alongIndex >= 0 ? alongIndex : -1;
  const slots = mode === "make" && st.hintStage >= 1 ? n : 0;
  const dragged = drag ? Number(drag.id) : null;
  return (
    <div ref={rootRef} className={`ba-board mode-aboard sub-${mode} ${celebrate ? "is-celebrating" : ""} ${wrong ? "is-wrong" : ""} ${reducedMotion ? "still" : ""}`} data-testid="ba-board" data-mode={mode} data-pool={pool}>
      <div className={`ba-jumbo ${hot === "plane" || (drag && boardOk) ? "hot" : ""}`} data-ba-drop="plane" data-testid="jumbo" aria-label={`Ziggy's plane: ${seats} ${seats === 1 ? "passenger" : "passengers"} on board`} role="img">
        <div className="ba-jumbo-box">
        <JumboPlane />
        <div className="ba-windows" aria-hidden="true">
          {Array.from({ length: MAX_PASSENGERS }, (_, k) => {
            const who = shownBoarded[k];
            const along = alongNow >= 0 && k <= alongNow;
            const isSlot = k < slots;
            return (
              <span key={k} className={`ba-window ${who !== undefined ? "is-full" : ""} ${isSlot ? "is-slot" : ""} ${along ? "is-along" : ""} ${k === alongNow ? "along-now" : ""} ${modelOn && k < n ? "is-model" : ""}`} data-testid="window" data-full={who !== undefined}>
                {who !== undefined && (
                  <span className={`ba-face ${k === pop ? "ba-pop" : ""}`}><Passenger who={crew[who] ?? 0} state={celebrate ? "celebrating" : "idle"} /></span>
                )}
                {(who !== undefined || along) && <span className="ba-num">{k + 1}</span>}
              </span>
            );
          })}
        </div>
        {mode === "make" && (
          <span className="ba-need" aria-hidden="true">
            <span className="ba-need-n">{n}</span>
            <span className="ba-need-dots">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>
          </span>
        )}
        </div>
      </div>
      <div className="ba-lounge" ref={loungeRef}>
        <div className="ba-queue" role="group" aria-label={mode === "count" ? "Passengers waiting to board" : "Passengers in the lounge"} style={{ gridTemplateColumns: `repeat(${grid.cols}, ${grid.cell}px)` }}>
          {crew.map((who, i) => {
            const on = shownBoarded.includes(i);
            if (on) return <span key={i} className="ba-slot" style={{ width: grid.cell, height: grid.cell }} aria-hidden="true" />;
            return (
              <button
                key={i}
                type="button"
                className={`ba-item ba-passenger ${drag?.id === String(i) ? "ghosted" : ""}`}
                style={{ width: grid.cell, height: grid.cell, animationDelay: `${i * 70}ms` }}
                data-testid="passenger"
                data-value={i}
                {...(i === crew.findIndex((_, j) => !shownBoarded.includes(j)) ? { "data-ba-idle": "" } : {})}
                aria-disabled={!boardOk}
                aria-label={`${CREW_NAMES[who]}, waiting. Press to help ${CREW_NAMES[who]} on board`}
                onPointerDown={(e) => start(e, String(i))}
                onClick={(e) => !ignoreClick(e) && board(i, e.detail === 0)}
              >
                <Passenger who={who} state={canAct ? "greeting" : "idle"} />
              </button>
            );
          })}
        </div>
        {mode === "make" && (
          <button type="button" className="ba-unboard" data-testid="unboard" aria-disabled={!act2 || boarded.length === 0} aria-label="Send one passenger back off the plane" onClick={unboard}>
            <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 10 L14 24 L30 38" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="ba-unboard-n" aria-hidden="true">1</span>
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{seats} on board.{mode === "count" && allIn ? " Everyone is on. How many?" : ""}</p>
      <Ghost drag={drag} size={grid.cell}>{dragged !== null && <Passenger who={crew[dragged] ?? 0} state="greeting" />}</Ghost>
    </div>
  );
}
