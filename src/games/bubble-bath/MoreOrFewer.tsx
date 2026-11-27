import { useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { Duck } from "./art";
import { questionOf } from "./generator";
import { useCommon } from "./shared";

/**
 * More or Fewer — two tubs of rubber ducks, one above the other. Which tub has more / fewer, or are they the same
 * (choice: tap a tub, or Same in the tray)? Pair up draws a line from each duck to a partner in the other tub, so
 * the child can compare by matching, not only by counting: the ducks with no partner show which tub has more.
 * From level 6 one row is spread out wide (the long-line trap: a longer row is not always more).
 * First miss: the ducks pair up by themselves and the lonely ducks glow. Second miss: the pairs are drawn one by one
 * and the right tub (or Same) glows.
 */
export interface DuckRow { xs: number[]; width: number }

/** Duck centres (% of the row) and duck width (% of the row) for one tub. Pure, so the pairing lines can reuse it. */
export function duckRow(count: number, other: number, spread: boolean, isLong: boolean): DuckRow {
  const cols = Math.max(3, count, other);
  const slot = 100 / cols;
  if (!spread) return { xs: Array.from({ length: count }, (_, i) => (i + 0.5) * slot), width: slot * 0.86 };
    const width = slot * 0.66;
  // the spread-out row reaches from edge to edge; the other row is bunched up at the start
  if (isLong) return { xs: Array.from({ length: count }, (_, i) => (count === 1 ? 50 : width / 2 + (i * (100 - width)) / (count - 1))), width };
  return { xs: Array.from({ length: count }, (_, i) => (i + 0.5) * slot * 0.72), width };
}

export function MoreOrFewerBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const a = p.a ?? 0;
  const b = p.b ?? 0;
  const spread = p.spread ?? 0;
  const q = questionOf(ex);
  const { reducedMotion, canAct, celebrate } = useCommon(st);
  const [paired, setPaired] = useState(false);
  const rowA = duckRow(a, b, !!spread, spread === 1);
  const rowB = duckRow(b, a, !!spread, spread === 2);
  const modelOn = st.model !== null;
  const auto = st.hintStage >= 1;
  const showPairs = paired || auto;
  const pairs = Math.min(a, b);
  // worked example: pairs appear one by one while the model plays, then all stay
  const upTo = st.phase === "feedback" && modelOn && alongIndex >= 0 ? alongIndex : showPairs ? Math.max(a, b) : -1;
  const lonely = (tub: "a" | "b", i: number) => showPairs && i >= pairs && i <= upTo && (tub === "a" ? a : b) > pairs;

  const tub = (id: "a" | "b", count: number, row: DuckRow) => {
    const out = st.eliminated.includes(id);
    const isRight = celebrate && st.lastAnswer === id;
    const isWrong = st.phase === "feedback" && !st.feedback?.correct && st.lastAnswer === id;
    return (
      <button
        type="button"
        className={`gb-tub ${out ? "is-out" : ""} ${isRight ? "is-right" : ""} ${isWrong ? "is-wrong" : ""} ${st.model === id ? "is-model" : ""}`}
        data-testid="choice"
        data-value={id}
        data-count={count}
        aria-disabled={!canAct || out}
        aria-label={`${id === "a" ? "Top" : "Bottom"} tub: ${count} ${count === 1 ? "duck" : "ducks"}${spread === (id === "a" ? 1 : 2) ? ", spread out wide" : ""}. Choose this tub`}
        onClick={() => canAct && !out && act({ type: "SUBMIT", value: id })}
      >
        <span className="gb-row" aria-hidden="true">
          {row.xs.map((x, i) => (
            <span key={i} className={`gb-duck-at ${lonely(id, i) ? "is-lonely" : ""}`} style={{ left: `${x}%`, "--w": row.width, animationDelay: `${i * 60}ms` } as React.CSSProperties}>
              <Duck flip={id === "b"} />
            </span>
          ))}
        </span>
      </button>
    );
  };

  return (
    <div className={`gb-board mode-compare ${celebrate ? "is-celebrating" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="compare" data-q={q} data-paired={showPairs}>
      <div className="gb-tubs" role="group" aria-label={`Which tub has ${q} ducks?`}>
        {tub("a", a, rowA)}
        {tub("b", b, rowB)}
        {showPairs && (
          <svg className="gb-pairs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-testid="pair-lines">
            {Array.from({ length: pairs }, (_, i) => i <= upTo && (
              <line key={i} x1={rowA.xs[i]} y1="36" x2={rowB.xs[i]} y2="64" className={i === upTo && st.phase === "feedback" ? "is-now" : ""} />
            ))}
          </svg>
        )}
      </div>
      <div className="gb-side">
        <button
          type="button"
          className={`gb-tool gb-pair ${showPairs ? "is-on" : ""}`}
          data-testid="pair"
          data-gb-idle=""
          aria-pressed={showPairs}
          aria-disabled={!canAct || auto}
          aria-label={showPairs ? "Ducks paired up. Press to unpair" : "Pair up the ducks: give each duck a partner"}
          onClick={() => {
            if (!canAct || auto) return;
            busy?.();
            setPaired((v) => !v);
            audio.play("pickup", { gain: 0.4 });
          }}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="14" cy="12" r="7" fill="#FFD43B" stroke="currentColor" strokeWidth="3" />
            <circle cx="34" cy="36" r="7" fill="#FFD43B" stroke="currentColor" strokeWidth="3" />
            <path d="M18 18 L30 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 4" />
            <circle cx="34" cy="12" r="7" fill="#FFD43B" stroke="currentColor" strokeWidth="3" />
            <circle cx="14" cy="36" r="7" fill="#FFD43B" stroke="currentColor" strokeWidth="3" />
            <path d="M30 18 L18 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 4" />
          </svg>
        </button>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
      <p className="sr-only" aria-live="polite">{showPairs ? `${pairs} pairs. ${a === b ? "Every duck has a partner." : `${Math.abs(a - b)} ${Math.abs(a - b) === 1 ? "duck has" : "ducks have"} no partner, in the ${a > b ? "top" : "bottom"} tub.`}` : ""}</p>
    </div>
  );
}
