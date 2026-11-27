import { useSyncExternalStore } from "react";
import type { BoardProps } from "../../game/boards";
import { IconCheck } from "../../ui/icons";
import { DicePicture, Duck, FoamToy, ParadeBubble, PlainBubble, SizePiece } from "./art";
import { BubbleParadeBoard } from "./BubbleParade";
import { GAME_OF, modeOf, paradeForm, type InnerGame } from "./generator";
import { MoreOrFewerBoard } from "./MoreOrFewer";
import { QuickLookBoard } from "./QuickLook";
import { FindBoard, SortBoard } from "./ShapeSplash";
import { readyStore, seenStore } from "./shared";
import { SizeLineBoard } from "./SizeLine";
import "./bubble-bath.css";

/**
 * Gloop's Bubble Bath play board: one bathtub, five inner games. Each exercise names its game in `params.mode`; a
 * little sign floats in for a moment (picture first, word second) so the child sees which game this is.
 */
const TITLES: Record<InnerGame, string> = { "shape-splash": "Shape Splash", "quick-look": "Quick Look", "more-fewer": "More or Fewer", "size-line": "Size Line", "bubble-parade": "Bubble Parade" };

function StationSign({ game }: { game: InnerGame }) {
  const pic =
    game === "shape-splash" ? <FoamToy art="toy~triangle~green~0~90~0" />
    : game === "quick-look" ? <PlainBubble />
    : game === "more-fewer" ? <Duck />
    : game === "size-line" ? <SizePiece art="size~boat~100" />
    : <ParadeBubble k={1} dots />;
  return (
    <span className={`gb-sign is-${game}`} aria-hidden="true" data-testid="station-sign" data-game={game}>
      <span className="gb-sign-pic">{pic}</span>
      <span className="gb-sign-word">{TITLES[game]}</span>
    </span>
  );
}

export function BathBoard(props: BoardProps) {
  const mode = modeOf(props.st.exercise);
  const game = GAME_OF[mode];
  return (
    <div className="gb-wrap" data-game={game}>
      <StationSign game={game} />
      {mode === "sort" ? <SortBoard {...props} />
        : mode === "find" ? <FindBoard {...props} />
        : mode === "look" ? <QuickLookBoard {...props} />
        : mode === "compare" ? <MoreOrFewerBoard {...props} />
        : mode === "size" ? <SizeLineBoard {...props} />
        : <BubbleParadeBoard {...props} />}
    </div>
  );
}

/** Does this exercise answer with the Ready button (built up first) rather than one direct pick? */
export const usesReady = (ex: BoardProps["st"]["exercise"]): boolean => {
  const m = modeOf(ex);
  return m === "sort" || m === "size";
};

/** The tray: number choices (Quick Look), Same (More or Fewer), Ready (Shape Splash sort, Size Line), else nothing. */
export function BathTray({ st, act }: BoardProps) {
  const ready = useSyncExternalStore(readyStore.subscribe, readyStore.get, readyStore.get);
  const seen = useSyncExternalStore(seenStore.subscribe, seenStore.get, seenStore.get);
  const ex = st.exercise;
  const mode = modeOf(ex);
  const right = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrongPick = (v: string | number) => st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === v;

  if ((mode === "look" || (mode === "parade" && paradeForm(ex) === "count")) && ex.answer.kind === "number") {
    // Quick Look: awake once the bubbles have been shown · Parade (count): once every bubble is popped
    const awake = seen.exId === ex.id && seen.seen;
    return (
      <div className={`choice-tray gb-look-tray ${awake ? "is-awake" : "is-asleep"}`} role="group" aria-label={mode === "look" ? "How many bubbles did you see?" : "How many bubbles did you pop?"}>
        {(ex.answer.choices ?? []).map((c) => {
          const out = st.eliminated.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={`choice gb-num-choice ${out ? "is-out" : ""} ${right && st.lastAnswer === c ? "is-right" : ""} ${wrongPick(c) ? "is-wrong" : ""} ${st.model === c ? "is-model" : ""}`}
              data-testid="choice"
              data-value={c}
              aria-disabled={!awake || st.phase !== "answering" || out}
              tabIndex={!awake || out ? -1 : 0}
              aria-label={`${c} ${c === 1 ? "bubble" : "bubbles"}`}
              onClick={() => awake && st.phase === "answering" && !out && act({ type: "SUBMIT", value: c })}
            >
              <span className="numeral">{c}</span>
              <DicePicture n={c} />
            </button>
          );
        })}
      </div>
    );
  }
  if (mode === "compare" && ex.answer.kind === "choice" && ex.answer.options.some((o) => o.id === "same")) {
    const out = st.eliminated.includes("same");
    return (
      <div className="choice-tray gb-same-tray">
        <button
          type="button"
          className={`choice gb-same ${out ? "is-out" : ""} ${right && st.lastAnswer === "same" ? "is-right" : ""} ${wrongPick("same") ? "is-wrong" : ""} ${st.model === "same" ? "is-model" : ""}`}
          data-testid="choice"
          data-value="same"
          aria-disabled={st.phase !== "answering" || out}
          tabIndex={out ? -1 : 0}
          aria-label="The same: both tubs have the same number of ducks"
          onClick={() => st.phase === "answering" && !out && act({ type: "SUBMIT", value: "same" })}
        >
          {/* two ducks, partner to partner: nobody left over */}
          <span className="gb-same-pic" aria-hidden="true">
            <span className="gb-same-duck"><Duck /></span>
            <svg viewBox="0 0 20 20" className="gb-same-eq"><rect x="2" y="5" width="16" height="3.5" rx="1.75" fill="#fff" /><rect x="2" y="11.5" width="16" height="3.5" rx="1.75" fill="#fff" /></svg>
            <span className="gb-same-duck"><Duck flip /></span>
          </span>
          <span className="gb-same-word">Same</span>
        </button>
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
        className={`done-btn gb-ready ${st.model !== null && st.phase === "answering" ? "is-model" : ""} ${right ? "is-right" : ""}`}
        data-testid="done"
        aria-label="Ready! Check my work"
        aria-disabled={!enabled}
        tabIndex={enabled ? 0 : -1}
        onClick={() => enabled && value !== null && act({ type: "SUBMIT", value })}
      >
        <IconCheck />
        <span className="gb-ready-word">Ready!</span>
      </button>
    </div>
  );
}
