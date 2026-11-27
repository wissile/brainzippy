import { useEffect, useRef, useState } from "react";
import { audio } from "../../../audio/AudioEngine";
import type { BoardProps } from "../../../game/boards";
import { decode, lineText, lineValue, typeDigit } from "../logic";
import { Keypad, ModelSteps, Tab, flags, useBoardKeys, useSubmit } from "./shared";

/**
 * Festival Order Sheet (the round's finale, engine R5a closer; math.solve.bar-model): 2–3 order lines that use the
 * inner games (rows of cookies, boxes, a brownie slab's squares, a fraction of a batch, bags plus extras). The child
 * may work out each line (tap a line, then type — the lines are their working and are not marked until a miss), then
 * the total for the cart, which is what Check submits. First miss: the lines they filled in get a tick or a "check
 * again" mark and Puff names the likely slip; second miss: every line and the total are filled in.
 */
export function OrderBoard({ st, act, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const s = decode(ex);
  const f = flags(st);
  const submit = useSubmit({ st, act, busy });
  const n = s.lines.length;
  const [vals, setVals] = useState<string[]>(() => Array.from({ length: n + 1 }, () => ""));
  const [active, setActive] = useState(0);
  const fresh = useRef(false);
  const model = f.modelOn && typeof st.model === "number" ? st.model : null;
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    if (model !== null) {
      setVals([...s.lines.map((l) => String(lineValue(l))), String(model)]);
      setActive(n);
    } else fresh.current = true;
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const locked = !f.canAct || model !== null;
  const edit = (fn: (v: string) => string) => setVals((vs) => vs.map((v, i) => (i === active ? fn(v) : v)));
  const type = (k: string) => {
    if (locked) return;
    audio.play("tap", { gain: 0.3 });
    busy?.();
    const wasFresh = fresh.current && active === n;
    fresh.current = false;
    edit((v) => typeDigit(wasFresh ? "" : v, k));
  };
  const back = () => {
    if (locked) return;
    fresh.current = false;
    edit((v) => v.slice(0, -1));
  };
  const total = vals[n] ?? "";
  const check = () => {
    if (!f.canAct || total === "") return;
    const v = Number(total);
    if (model !== null && v !== model) return;
    submit(v);
  };
  useBoardKeys({
    digit: type,
    back,
    enter: check,
    arrow: (d) => !locked && (d === "up" || d === "down") && setActive((a) => Math.max(0, Math.min(n, a + (d === "down" ? 1 : -1)))),
  });
  const marked = f.hinted || f.solved;
  const mark = (i: number) => {
    if (!marked || vals[i] === "") return "";
    return Number(vals[i]) === lineValue(s.lines[i]!) ? "is-ok" : "is-off";
  };
  const rowBtn = (i: number, text: string, isTotal = false) => (
    <li key={i} className={`bk-line ${active === i ? "is-active" : ""} ${isTotal ? "is-total" : mark(i)} ${isTotal && f.solved ? "is-right" : ""} ${isTotal && f.wrongNow ? "is-wrong" : ""}`}>
      <button
        type="button"
        className="bk-line-btn"
        data-testid="bk-line"
        data-value={isTotal ? "total" : i}
        aria-label={`${text}: ${vals[i] || "empty"}${!isTotal && mark(i) ? (mark(i) === "is-ok" ? ", right" : ", check again") : ""}${active === i ? " (typing here)" : ", tap to type here"}`}
        aria-pressed={active === i}
        aria-disabled={locked}
        onClick={() => {
          if (locked) return;
          audio.play("tap", { gain: 0.25 });
          setActive(i);
        }}
      >
        <span className="bk-line-text">{text}</span>
        <span className="bk-line-val" data-testid={isTotal ? "bk-total" : undefined}>{vals[i] || " "}</span>
        {!isTotal && marked && vals[i] !== "" && <span className="bk-line-mark" aria-hidden="true">{mark(i) === "is-ok" ? "✓" : "?"}</span>}
      </button>
    </li>
  );
  return (
    <div className="bk-stage mode-order kind-order" data-testid="bk-board" data-mode="order" data-kind="order" data-value={total} data-active={active}>
      <Tab mode="order" sub="The cart is waiting" />
      <div className="bk-layout">
        <section className="bk-scene" aria-label="Order sheet">
          <div className="bk-sheet">
            <p className="bk-sheet-title">Island Festival · Order</p>
            <ol className="bk-lines">
              {s.lines.map((l, i) => rowBtn(i, lineText(l)))}
              {rowBtn(n, "Total treats for the cart", true)}
            </ol>
          </div>
        </section>
        <section className="bk-panel" aria-label="Keypad">
          <Keypad st={st} entry={vals[active] ?? ""} onType={type} onBack={back} onCheck={check} label={active === n ? "Total" : `Line ${active + 1}`} showDisplay={false}
            checkLabel={total === "" ? "Check the total (nothing typed yet)" : `Check the total: ${total}`} ready={total !== ""} />
          {total === "" && !f.modelOn && <p className="bk-note is-soft" data-testid="bk-order-note">Tap a line to work it out, then fill in the total.</p>}
          <ModelSteps ex={ex} st={st} alongIndex={alongIndex} />
        </section>
      </div>
    </div>
  );
}
