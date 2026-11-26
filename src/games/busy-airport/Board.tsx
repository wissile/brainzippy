import { useSyncExternalStore } from "react";
import type { BoardProps } from "../../game/boards";
import { IconCheck } from "../../ui/icons";
import { AllAboardBoard } from "./AllAboard";
import { Bag, JumboPlane, Lamp, Wands } from "./art";
import { BagDropBoard } from "./BagDrop";
import { GAME_OF, modeOf, signalsOf } from "./generator";
import { MarshallerBoard } from "./Marshaller";
import { RunwayLightsBoard } from "./RunwayLights";
import { boardedStore, readyStore } from "./shared";
import "./busy-airport.css";

/**
 * Ziggy's Busy Airport play board: one airport, four inner games. Each exercise names its game in `params.mode`;
 * a station sign swings in for a moment so the child sees which part of the airport they are in.
 */
const TITLES = { "bag-drop": "Bag Drop", "all-aboard": "All Aboard", "runway-lights": "Runway Lights", marshaller: "Marshaller" } as const;

function StationSign({ game }: { game: keyof typeof TITLES }) {
  return (
    <span className={`ba-station is-${game}`} aria-hidden="true" data-testid="station-sign" data-game={game}>
      <span className="ba-station-pic">
        {game === "bag-drop" ? <Bag colour="red" tag="none" /> : game === "all-aboard" ? <JumboPlane /> : game === "runway-lights" ? <Lamp colour="yellow" /> : <Wands />}
      </span>
      <span className="ba-station-word">{TITLES[game]}</span>
    </span>
  );
}

export function AirportBoard(props: BoardProps) {
  const mode = modeOf(props.st.exercise);
  const game = GAME_OF[mode];
  return (
    <div className="ba-wrap" data-game={game}>
      <StationSign game={game} />
      {mode === "bags" ? <BagDropBoard {...props} /> : mode === "count" || mode === "make" ? <AllAboardBoard {...props} /> : mode === "lights" ? <RunwayLightsBoard {...props} /> : <MarshallerBoard {...props} />}
    </div>
  );
}

/** Does this exercise answer with the Ready button (anything built up first), rather than one direct pick? */
export function usesReady(ex: BoardProps["st"]["exercise"]): boolean {
  const mode = modeOf(ex);
  if (mode === "bags" || mode === "make") return true;
  if (mode === "lights") return ex.answer.kind === "sequence";
  if (mode === "signal") return signalsOf(ex).length === 2;
  return false;
}

/** The tray: Ready for built-up answers, the number choices for All Aboard counting, nothing for direct picks. */
export function AirportTray({ st, act }: BoardProps) {
  const ready = useSyncExternalStore(readyStore.subscribe, readyStore.get, readyStore.get);
  const boarded = useSyncExternalStore(boardedStore.subscribe, boardedStore.get, boardedStore.get);
  const ex = st.exercise;
  const right = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);

  if (modeOf(ex) === "count" && ex.answer.kind === "number") {
    const choices = ex.answer.choices ?? [];
    const awake = boarded.exId === ex.id && boarded.all;
    return (
      <div className={`choice-tray ba-count-tray ${awake ? "is-awake" : "is-asleep"}`} role="group" aria-label="How many passengers got on?">
        {choices.map((c) => {
          const out = st.eliminated.includes(c);
          const isRight = right && st.lastAnswer === c;
          const isWrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === c;
          return (
            <button
              key={c}
              type="button"
              className={`choice ${out ? "is-out" : ""} ${isRight ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${st.model === c ? "is-model" : ""}`}
              data-testid="choice"
              data-value={c}
              aria-disabled={!awake || st.phase !== "answering" || out}
              aria-label={`${c} ${c === 1 ? "passenger" : "passengers"}`}
              onClick={() => awake && st.phase === "answering" && !out && act({ type: "SUBMIT", value: c })}
            >
              <span className="numeral">{c}</span>
            </button>
          );
        })}
      </div>
    );
  }
  if (!usesReady(ex)) return <div className="choice-tray placeholder" aria-hidden="true" />;
  const value = ready.exId === ex.id ? ready.value : null;
  const enabled = st.phase === "answering" && value !== null;
  return (
    <div className="choice-tray">
      <button
        type="button"
        className={`done-btn ba-ready ${st.model !== null && st.phase === "answering" ? "is-model" : ""} ${right ? "is-right" : ""}`}
        data-testid="done"
        aria-label="Ready! Check my work"
        aria-disabled={!enabled}
        onClick={() => enabled && value !== null && act({ type: "SUBMIT", value })}
      >
        <IconCheck />
        <span className="ba-ready-word">Ready!</span>
      </button>
    </div>
  );
}
