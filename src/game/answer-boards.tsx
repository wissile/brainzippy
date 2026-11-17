import { useEffect, useState } from "react";
import type { AnswerOption } from "../engine/types";
import type { BoardProps } from "./boards";
import { IconCheck } from "../ui/icons";
import "./answer-boards.css";

/**
 * Default boards for non-number answers (used when a skin has no custom Board/Tray):
 *   choice   → OptionBoard: tap one option (submits its id)
 *   set      → OptionBoard: toggle options, then tap the check button (submits the selected ids)
 *   sequence → SequenceBoard: tap pieces into slots in order, tap a placed piece to take it back, then check
 * match and numeric answers need a game-specific Board (docs/GAME_AUTHORING.md).
 * Every control is a <button> (keyboard + touch, no drag needed); feedback classes match the number boards.
 */

function OptionFace({ o, ObjectArt }: { o: AnswerOption; ObjectArt: BoardProps["ObjectArt"] }) {
  return (
    <>
      {o.art && <span className="ab-art" aria-hidden="true"><ObjectArt kind={o.art} /></span>}
      {o.text && <span className="ab-text">{o.text}</span>}
    </>
  );
}
const label = (o: AnswerOption) => o.text ?? o.art ?? o.id;

export function OptionBoard({ st, act, ObjectArt }: BoardProps) {
  const a = st.exercise.answer;
  const [picked, setPicked] = useState<string[]>([]);
  const fbSeq = st.feedback?.seq;
  // after a miss on a set, drop eliminated picks; keep the right ones (mark-parts)
  useEffect(() => {
    if (st.phase === "answering") setPicked((p) => p.filter((id) => !st.eliminated.includes(id)));
  }, [fbSeq, st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  if (a.kind !== "choice" && a.kind !== "set") return <div />;
  const multi = a.kind === "set";
  const answering = st.phase === "answering";
  const model = st.hintStage === 2 && answering ? st.model : null;
  const isModel = (id: string) => (typeof model === "string" ? model === id : Array.isArray(model) && model.includes(id));
  const last = st.lastAnswer;
  const wasPicked = (id: string) => (typeof last === "string" ? last === id : Array.isArray(last) && last.includes(id));
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);

  return (
    <div className={`ab-wrap ${multi ? "ab-set" : "ab-choice"}`}>
      <div className="ab-options" role="group" aria-label={multi ? "Choose all the right ones" : "Choose one"}>
        {a.options.map((o, i) => {
          const out = st.eliminated.includes(o.id);
          const on = multi ? picked.includes(o.id) : false;
          const fbState =
            st.phase === "feedback" && wasPicked(o.id) ? (st.feedback?.correct ? "is-right" : st.check?.parts?.[o.id] === true ? "is-ok" : "is-wrong")
            : solved && isCorrect(a, o.id) ? "is-right"
            : answering && multi && on && st.check?.parts?.[o.id] === true ? "is-ok" : "";
          const disabled = out || !answering;
          return (
            <button
              key={o.id}
              type="button"
              className={`choice ab-option ${fbState} ${on ? "is-on" : ""} ${out ? "is-out" : ""} ${isModel(o.id) ? "is-model" : ""}`}
              style={{ animationDelay: `${i * 70}ms` }}
              data-testid="choice"
              data-value={o.id}
              aria-label={label(o)}
              aria-pressed={multi ? on : undefined}
              aria-disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (multi) setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
                else act({ type: "SUBMIT", value: o.id });
              }}
            >
              <OptionFace o={o} ObjectArt={ObjectArt} />
            </button>
          );
        })}
      </div>
      {multi && (
        <button
          type="button"
          className={`done-btn ab-check ${model && answering ? "is-model" : ""} ${solved ? "is-right" : ""}`}
          data-testid="done"
          aria-label="Check my answer"
          aria-disabled={!answering || picked.length === 0}
          onClick={() => answering && picked.length > 0 && act({ type: "SUBMIT", value: picked })}
        >
          <IconCheck />
        </button>
      )}
    </div>
  );
}

function isCorrect(a: BoardProps["st"]["exercise"]["answer"], id: string) {
  return a.kind === "choice" ? a.correct === id : a.kind === "set" ? a.correct.includes(id) : false;
}

export function SequenceBoard({ st, act, alongIndex, ObjectArt }: BoardProps) {
  const a = st.exercise.answer;
  const [placed, setPlaced] = useState<string[]>([]);
  const fbSeq = st.feedback?.seq;
  // after a miss keep the correct leading pieces (mark-parts) and send the rest back
  useEffect(() => {
    if (st.phase !== "answering" || !st.check || st.check.correct) return;
    const parts = st.check.parts ?? {};
    setPlaced((p) => {
      const keep: string[] = [];
      for (let i = 0; i < p.length && parts[String(i)] === true; i++) keep.push(p[i]!);
      return keep;
    });
  }, [fbSeq, st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  if (a.kind !== "sequence") return <div />;
  const answering = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const model = Array.isArray(st.model) ? (st.model as readonly string[]) : null;
  const byId = (id: string) => a.pieces.find((p) => p.id === id)!;
  const shown = solved ? (Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly string[]) : placed) : st.phase === "feedback" && Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly string[]) : placed;
  const full = placed.length === a.order.length;

  return (
    <div className="ab-wrap ab-sequence">
      <ol className="ab-slots" aria-label="Your order">
        {a.order.map((_, i) => {
          const id = shown[i];
          const ok = st.phase === "feedback" ? st.check?.parts?.[String(i)] : undefined;
          const modelHere = model && alongIndex >= i ? model[i] : undefined;
          return (
            <li key={i} className={`ab-slot ${ok === true || solved ? "is-ok" : ok === false ? "is-wrong" : ""}`} data-testid="slot">
              {id ? (
                <button type="button" className="choice ab-piece placed" data-testid="placed" data-value={id} aria-label={`${label(byId(id))}, place ${i + 1}. Press to take it back`} aria-disabled={!answering} onClick={() => answering && setPlaced((p) => p.filter((x) => x !== id))}>
                  <OptionFace o={byId(id)} ObjectArt={ObjectArt} />
                </button>
              ) : modelHere ? (
                <span className="ab-ghost" aria-hidden="true"><OptionFace o={byId(modelHere)} ObjectArt={ObjectArt} /></span>
              ) : (
                <span className="ab-empty" aria-hidden="true">{i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="ab-options" role="group" aria-label="Pieces">
        {a.pieces.map((p) => {
          if (placed.includes(p.id) || solved) return null;
          const out = st.eliminated.includes(p.id);
          const next = model && answering ? model[placed.length] === p.id : false;
          const disabled = out || !answering || full;
          return (
            <button key={p.id} type="button" className={`choice ab-piece ${out ? "is-out" : ""} ${next ? "is-model" : ""}`} data-testid="choice" data-value={p.id} aria-label={label(p)} aria-disabled={disabled} onClick={() => !disabled && setPlaced((x) => [...x, p.id])}>
              <OptionFace o={p} ObjectArt={ObjectArt} />
            </button>
          );
        })}
      </div>
      <button type="button" className={`done-btn ab-check ${solved ? "is-right" : full && model ? "is-model" : ""}`} data-testid="done" aria-label="Check my order" aria-disabled={!answering || !full} onClick={() => answering && full && act({ type: "SUBMIT", value: placed })}>
        <IconCheck />
      </button>
    </div>
  );
}

/** Default board for an exercise's answer kind when the skin has none (null → the runner's counting boards). */
export function defaultAnswerBoard(kind: string): ((p: BoardProps) => React.JSX.Element) | null {
  if (kind === "choice" || kind === "set") return OptionBoard;
  if (kind === "sequence") return SequenceBoard;
  return null;
}
