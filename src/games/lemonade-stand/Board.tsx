import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Hoot, Puff, Rumble, Zuzu } from "../../characters/Crew";
import type { BoardProps } from "../../game/boards";
import { choicesOf, targetOf } from "../../engine/validation";
import type { Exercise } from "../../engine/types";
import { AwningArt, CupArt, JarArt, LemonArt, MoneyArt, PitcherArt, StandObject, StandSignArt, TelescopeArt } from "./art";
import { useDragDrop } from "./drag";
import {
  DENOM_INFO,
  type Denom,
  type Mode,
  SUPPLIES,
  costOf,
  denomLabel,
  denomWords,
  fmt,
  ledgerOf,
  modeOf,
  modelCoins,
  modelStepCount,
  revenue,
  stacks,
  surveyOf,
  surveyProfit,
  total,
  trayOf,
  words,
} from "./logic";
import { standStore } from "./store";
import "./lemonade-stand.css";

/**
 * Budge's Lemonade Stand play board: a real stand on the beach.
 *  pay / change / profit / loss  — drag coins and notes from the till onto the counter (or into the savings jar);
 *                                  tap a coin to put it down, tap a stack to take one back; Enter / Backspace by keyboard.
 *  cost                          — drag the three supplies into the stand; the ledger fills in.
 *  revenue                       — serve every customer (drag a cup from the pitcher, tap it, or press Enter).
 *  price                         — slide the price along four notches; the survey row lights up.
 * Answers are given in the tray (Pay / choice cards / Set price), fed by standStore.
 */

/** Real-life diameters relative to a quarter: the dime is the smallest coin, the quarter the biggest. */
const COIN_K: Record<Denom, number> = { 1: 0.8, 5: 0.88, 10: 0.74, 25: 1, 100: 1, 500: 1 };
const CUSTOMERS = [Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff] as const;
const noop = () => undefined;
const NO_PROGRESS = { done: 0, total: 0 };
const CUSTOMER_NAMES = ["Bobbo", "Zuzu", "Gloop", "Hoot", "Rumble", "Puff"] as const;

/** Speak a running total when it is one of the pre-rendered amounts (1¢–$1). Silent when muted. */
function sayTotal(muted: boolean, cents: number) {
  if (muted) return;
  if (cents >= 1 && cents <= 99) void audio.speak("ls.total", { c: cents });
  else if (cents === 100) void audio.speak("ls.total.dollar");
}

export function StandBoard(props: BoardProps) {
  const mode = modeOf(props.st.exercise.params);
  useEffect(() => () => standStore.reset(), []);
  if (mode === "cost") return <SupplyBoard {...props} />;
  if (mode === "revenue") return <ServeBoard {...props} />;
  if (mode === "price") return <PriceBoard {...props} />;
  return <CoinBoard {...props} />;
}

// ---------------------------------------------------------------- the stand frame

function Fund({ done, total: n }: { done: number; total: number }) {
  return (
    <div className="ls-fund" aria-hidden="true" title="Telescope fund">
      <span className="ls-fund-jar"><JarArt fill={n ? done / n : 0} /></span>
      <span className="ls-fund-scope"><TelescopeArt /></span>
    </div>
  );
}

function StandScene({ children, side, progress, className = "" }: { children: React.ReactNode; side?: React.ReactNode; progress: { done: number; total: number }; className?: string }) {
  return (
    <div className={`ls-scene ${className}`}>
      <div className="ls-awning"><AwningArt /></div>
      <span className="ls-post l" aria-hidden="true" />
      <span className="ls-post r" aria-hidden="true" />
      <div className="ls-top">{children}</div>
      <div className="ls-front"><span className="ls-front-sign"><StandSignArt /></span></div>
      {side && <div className="ls-side-char" aria-hidden="true">{side}</div>}
      <Fund done={progress.done} total={progress.total} />
    </div>
  );
}

function stageClass(st: BoardProps["st"], mode: Mode, extra: string, reduced: boolean) {
  const fb = st.feedback;
  return [
    "ls-stage",
    `mode-${mode}`,
    st.phase === "solved" || (st.phase === "feedback" && fb?.correct) ? "is-celebrating" : "",
    st.phase === "feedback" && fb && !fb.correct ? "is-wrong" : "",
    st.hintStage === 2 ? "is-modelling" : "",
    reduced ? "still" : "",
    extra,
  ].join(" ");
}

// ---------------------------------------------------------------- coins: pay, change, profit, loss

function CoinBoard({ st, alongIndex, busy = noop, progress = NO_PROGRESS }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const mode = modeOf(p);
  const value = targetOf(ex);
  const tray = useMemo(() => trayOf(p.tray ?? 0), [p.tray]);
  const { muted, reducedMotion } = useApp();
  const [coins, setCoins] = useState<Denom[]>([]);
  const [sign, setSign] = useState<-1 | 0 | 1 | null>(mode === "loss" ? null : 1);
  const root = useRef<HTMLDivElement>(null);
  const modelLock = st.hintStage === 2;
  const canAct = st.phase === "answering" && !modelLock;
  const canPlace = canAct && sign !== 0;
  const sum = total(coins);
  const led = ledgerOf(p);

  useEffect(() => standStore.set({ exId: ex.id, coins, ready: true, sign, pick: null }), [ex.id, coins, sign]);

  const add = (d: Denom) => {
    if (!canPlace) return;
    busy();
    const next = [...coins, d];
    setCoins(next);
    audio.play("drop", { gain: 0.6 });
    sayTotal(muted, total(next));
  };
  const removeOne = (d?: Denom) => {
    if (!canAct || coins.length === 0) return;
    busy();
    const i = d === undefined ? coins.length - 1 : coins.lastIndexOf(d);
    if (i < 0) return;
    const next = coins.filter((_, k) => k !== i);
    setCoins(next);
    audio.play("pickup", { gain: 0.5 });
    sayTotal(muted, total(next));
  };

  // keyboard: Backspace takes the last coin back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" || (e.target as HTMLElement | null)?.closest("input, textarea")) return;
      e.preventDefault();
      removeOne();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const dnd = useDragDrop<{ from: "till" | "drop"; d: Denom }>(root, {
    canAct,
    busy,
    onDrop: (zone, pl) => {
      if (pl.from === "till" && zone === "drop") add(pl.d);
      if (pl.from === "drop" && zone !== "drop") removeOne(pl.d);
    },
  });

  // second miss: the coins go down one by one (largest first; change counts up from the price), totals said aloud
  useEffect(() => {
    if (alongIndex < 0) return;
    const mc = modelCoins(p, value);
    const shown = mc.slice(0, alongIndex + 1);
    setCoins(shown);
    if (mode === "loss") setSign(value > 0 ? 1 : value < 0 ? -1 : 0);
    audio.play("drop", { gain: 0.55 });
    sayTotal(muted, mode === "change" ? (p.price ?? 0) + total(shown) : total(shown));
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const chooseSign = (s: -1 | 0 | 1) => {
    if (!canAct) return;
    busy();
    setSign(s);
    if (s === 0) setCoins([]);
    audio.play("tap", { gain: 0.5 });
  };

  // first-miss scaffold: a value bar with the gap (pay, change) or a direction note (profit, loss)
  const hinting = st.hintStage >= 1 && !modelLock;
  const goal = mode === "pay" ? value : mode === "change" ? 100 - (p.price ?? 0) : Math.abs(value);
  const gap = goal - sum;
  const last = typeof st.lastAnswer === "number" ? st.lastAnswer : null;
  const note =
    !hinting || last === null
      ? null
      : mode === "pay" || mode === "change"
        ? gap > 0 ? `${fmt(gap)} more` : gap < 0 ? `${fmt(-gap)} too much` : "Just right!"
        : Math.sign(last) !== Math.sign(value)
          ? "Check: was it a profit or a loss?"
          : Math.abs(last) > Math.abs(value)
            ? "That was too much."
            : "That was not enough.";

  const dropName = mode === "profit" || (mode === "loss" && sign === 1) ? "savings jar" : mode === "loss" && sign === -1 ? "missing-money slip" : "counter";
  const side =
    mode === "pay" ? <Rumble state={st.phase === "solved" ? "celebrating" : "idle"} size="100%" /> : mode === "change" ? <Bobbo state={st.phase === "solved" ? "celebrating" : "idle"} size="100%" /> : null;

  const drop = (
    <div
      className={`ls-drop drop-${dropName.split(" ")[0]} ${dnd.hot === "drop" ? "is-hot" : ""} ${dnd.drag?.payload.from === "till" ? "is-target" : ""} ${sign === 0 ? "is-off" : ""}`}
      data-drop="drop"
      data-testid="drop"
      data-total={sum}
    >
      {(mode === "profit" || (mode === "loss" && sign === 1)) && <span className="ls-drop-jar" aria-hidden="true"><JarArt fill={Math.min(1, sum / Math.max(100, goal || 100))} /></span>}
      {mode === "loss" && sign === -1 && <span className="ls-drop-slip" aria-hidden="true">Missing money</span>}
      {mode === "loss" && sign === null && <span className="ls-drop-hint">First choose profit, loss or break even.</span>}
      {mode === "loss" && sign === 0 && <span className="ls-drop-hint">Break even: nothing to save, nothing missing.</span>}
      <div className="ls-stacks">
        {stacks(coins).map(({ d, n }) => (
          <button
            key={d}
            type="button"
            className={`ls-stack ${DENOM_INFO[d].note ? "is-note" : ""}`}
            data-testid="placed"
            data-value={d}
            data-count={n}
            style={{ "--k": COIN_K[d] } as React.CSSProperties}
            aria-disabled={!canAct}
            aria-label={`${n} ${n === 1 ? DENOM_INFO[d].name : DENOM_INFO[d].plural} on the ${dropName}. Press to take one back`}
            onPointerDown={(e) => dnd.start(e, { from: "drop", d })}
            onClick={(e) => !dnd.wasDrag(e) && removeOne(d)}
          >
            {Array.from({ length: Math.min(n, 4) }, (_, i) => (
              <span key={i} className="ls-stack-item" style={{ "--i": i } as React.CSSProperties}><MoneyArt d={d} /></span>
            ))}
            {n > 1 && <span className="ls-badge">×{n}</span>}
          </button>
        ))}
      </div>
      <span className="ls-total" data-testid="counter-total">{mode === "profit" ? "In the jar" : mode === "change" ? "Change" : mode === "loss" ? "Amount" : "On the counter"}: <b>{fmt(sum)}</b></span>
    </div>
  );

  const info =
    mode === "pay" ? (
      <div className="ls-card ls-tag" data-testid="price-tag">
        <span className="ls-tag-art" aria-hidden="true">{value > 20 ? <StandObject kind="lemons" /> : <LemonArt />}</span>
        <span className="ls-tag-label">{value > 20 ? "Bag of lemons" : "Lemon"}</span>
        <span className="ls-tag-price">{fmt(value)}</span>
        {hinting && <ValueBar from={0} to={value} have={sum} max={Math.max(value, sum)} note={note} />}
      </div>
    ) : mode === "change" ? (
      <div className="ls-card ls-tag ls-change" data-testid="price-tag">
        <span className="ls-tag-art" aria-hidden="true"><CupArt /></span>
        <span className="ls-tag-label">Cup <b>{fmt(p.price ?? 0)}</b></span>
        <span className="ls-tag-paid"><span className="ls-mini-note" aria-hidden="true"><MoneyArt d={100} /></span>Bobbo paid <b>$1.00</b></span>
        {hinting && <ValueBar from={p.price ?? 0} to={100} have={sum} max={Math.max(100, (p.price ?? 0) + sum)} note={note} countUp />}
      </div>
    ) : (
      <div className="ls-card ls-ledger" data-testid="ledger">
        <p className="ls-ledger-title">{mode === "loss" ? "Rainy day ledger" : "Today's ledger"}</p>
        <p className="ls-row"><span>Money in: {led.cups} {led.cups === 1 ? "cup" : "cups"} × {fmt(led.price)}</span><b>{fmt(revenue(led))}</b></p>
        <p className="ls-row"><span>Supplies</span><b>− {fmt(costOf(led))}</b></p>
        <p className="ls-row ls-row-q"><span>{mode === "loss" ? "Profit or loss?" : "Profit"}</span><b>?</b></p>
        {mode === "loss" && (
          <div className="ls-outcomes" role="group" aria-label="Was it a profit, a loss or break even?">
            {([[1, "profit", "Profit"], [-1, "loss", "Loss"], [0, "even", "Break even"]] as const).map(([s, id, label]) => (
              <button
                key={id}
                type="button"
                className={`ls-outcome ${sign === s ? "is-on" : ""} ${modelLock && sign === s ? "is-model" : ""}`}
                data-testid="outcome"
                data-value={id}
                aria-pressed={sign === s}
                aria-disabled={!canAct}
                aria-label={`It was ${label === "Break even" ? "break even" : `a ${id}`}`}
                onClick={() => chooseSign(s)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {note && <p className="ls-note" data-testid="gap">{note}</p>}
      </div>
    );

  return (
    <div className={stageClass(st, mode, dnd.drag ? "is-carrying" : "", reducedMotion)} ref={root} data-testid="stand-board" data-mode={mode} data-params={JSON.stringify(p)} data-step={alongIndex}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="ls-layout">
        <div className="ls-info">{info}</div>
        <StandScene side={side} progress={progress}>{drop}</StandScene>
        <div className="ls-source" role="group" aria-label={mode === "pay" ? "Budge's coins" : "The till"}>
          {tray.map((d, i) => (
            <button
              key={d}
              type="button"
              className={`ls-coin-btn ${DENOM_INFO[d].note ? "is-note" : ""}`}
              data-testid="coin"
              data-value={d}
              data-idle={i === 0 ? "true" : undefined}
              style={{ "--k": COIN_K[d] } as React.CSSProperties}
              aria-disabled={!canPlace}
              aria-label={`Put down a ${denomWords(d)}`}
              onPointerDown={(e) => canPlace && dnd.start(e, { from: "till", d })}
              onClick={(e) => !dnd.wasDrag(e) && add(d)}
            >
              <span className="ls-coin-face"><MoneyArt d={d} /></span>
              <span className="ls-coin-name">{DENOM_INFO[d].note ? denomLabel(d) : DENOM_INFO[d].name}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{`${mode === "profit" ? "In the jar" : "On the counter"}: ${words(sum)}.${note ? ` ${note.replace("¢", " cents")}` : ""}`}</p>
      {dnd.drag && (
        <div className={`ls-ghost ${DENOM_INFO[dnd.drag.payload.d].note ? "is-note" : ""}`} style={{ left: dnd.drag.x, top: dnd.drag.y, "--k": COIN_K[dnd.drag.payload.d] } as React.CSSProperties} aria-hidden="true">
          <MoneyArt d={dnd.drag.payload.d} />
        </div>
      )}
    </div>
  );
}

/** Value bar (first-miss scaffold): what is down so far against the goal; change counts up from the price to $1. */
function ValueBar({ from, to, have, max, note, countUp = false }: { from: number; to: number; have: number; max: number; note: string | null; countUp?: boolean }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`;
  return (
    <div className="ls-bar" data-testid="value-bar" aria-hidden="true">
      <div className="ls-bar-track">
        {countUp && <span className="ls-bar-price" style={{ width: pct(from) }} />}
        <span className="ls-bar-fill" style={{ left: countUp ? pct(from) : "0%", width: pct(have) }} />
        <span className="ls-bar-goal" style={{ left: pct(to) }} />
      </div>
      <div className="ls-bar-labels">
        <span>{countUp ? fmt(from) : "0¢"}</span>
        {note && <b data-testid="gap">{note}</b>}
        <span>{fmt(to)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cost: supplies into the stand

function SupplyBoard({ st, alongIndex, busy = noop, progress = NO_PROGRESS }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const items = ledgerOf(p).items;
  const { speaking, reducedMotion } = useApp();
  const [placed, setPlaced] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const canAct = st.phase === "answering" && st.hintStage < 2;
  const ready = placed.length === 3;
  const costById = (id: string) => items[SUPPLIES.findIndex((s) => s.id === id)]!;

  useEffect(() => standStore.set({ exId: ex.id, coins: [], ready, sign: null, pick: null }), [ex.id, ready]);
  const said = useRef(false);
  useEffect(() => {
    if (ready && !said.current && alongIndex < 0) {
      said.current = true;
      audio.play("star", { gain: 0.4 });
      if (!speaking) void audio.speak("ls.supplies.in");
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const put = (id: string) => {
    if (!canAct || placed.includes(id)) return;
    busy();
    setPlaced((x) => [...x, id]);
    audio.play("drop", { gain: 0.6 });
  };
  const back = (id: string) => {
    if (!canAct) return;
    busy();
    setPlaced((x) => x.filter((y) => y !== id));
    audio.play("pickup", { gain: 0.5 });
  };
  const dnd = useDragDrop<{ id: string; from: "shelf" | "box" }>(root, {
    canAct,
    busy,
    onDrop: (zone, pl) => {
      if (pl.from === "shelf" && zone === "box") put(pl.id);
      if (pl.from === "box" && zone !== "box") back(pl.id);
    },
  });
  useEffect(() => {
    if (alongIndex < 0) return;
    setPlaced(SUPPLIES.map((s) => s.id));
    audio.play("drop", { gain: 0.5 });
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const order = alongIndex >= 0 ? SUPPLIES.map((s) => s.id) : placed;
  let running = 0;
  return (
    <div className={stageClass(st, "cost", dnd.drag ? "is-carrying" : "", reducedMotion)} ref={root} data-testid="stand-board" data-mode="cost" data-params={JSON.stringify(p)} data-ready={String(ready)} data-step={alongIndex}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="ls-layout">
        <div className="ls-info">
          <div className="ls-card ls-ledger" data-testid="ledger">
            <p className="ls-ledger-title">One batch costs…</p>
            {order.map((id, i) => {
              const s = SUPPLIES.find((x) => x.id === id)!;
              running += costById(id);
              return (
                <p key={id} className={`ls-row ${alongIndex >= i ? "is-step" : ""}`} data-testid="ledger-row">
                  <span>{s.label}</span>
                  <b>{alongIndex >= 0 && i > 0 ? "+ " : ""}{fmt(costById(id))}</b>
                  {alongIndex >= i && <i className="ls-running">= {fmt(running)}</i>}
                </p>
              );
            })}
            {order.length < 3 && <p className="ls-row ls-row-wait"><span>{3 - order.length} more to move in</span></p>}
            <p className="ls-row ls-row-q"><span>Cost</span><b>?</b></p>
          </div>
        </div>
        <StandScene progress={progress}>
          <div className={`ls-drop ls-box ${dnd.hot === "box" ? "is-hot" : ""} ${dnd.drag?.payload.from === "shelf" ? "is-target" : ""}`} data-drop="box" data-testid="supply-box">
            {placed.length === 0 && <span className="ls-drop-hint">Supplies go here</span>}
            <div className="ls-stacks">
              {placed.map((id) => {
                const s = SUPPLIES.find((x) => x.id === id)!;
                return (
                  <button key={id} type="button" className="ls-supply is-in" data-testid="placed-supply" data-value={id} aria-disabled={!canAct} aria-label={`${s.label} are in the stand. Press to take them out`}
                    onPointerDown={(e) => dnd.start(e, { id, from: "box" })} onClick={(e) => !dnd.wasDrag(e) && back(id)}>
                    <span className="ls-supply-art"><StandObject kind={s.art} /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </StandScene>
        <div className="ls-source ls-shelf" role="group" aria-label="Market shelf">
          {SUPPLIES.map((s, i) => {
            const isIn = placed.includes(s.id);
            return (
              <button key={s.id} type="button" className={`ls-supply ${isIn ? "is-gone" : ""}`} data-testid="supply" data-value={s.id} data-idle={!isIn && placed.length === i ? "true" : undefined}
                aria-disabled={!canAct || isIn} aria-label={isIn ? `${s.label}: already in the stand` : `Move the ${s.label.toLowerCase()} into the stand. They cost ${words(items[i]!)}`}
                onPointerDown={(e) => !isIn && dnd.start(e, { id: s.id, from: "shelf" })} onClick={(e) => !dnd.wasDrag(e) && put(s.id)}>
                <span className="ls-supply-art"><StandObject kind={s.art} /></span>
                <span className="ls-price-chip">{fmt(items[i]!)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{ready ? "All three supplies are in the stand. Choose the cost." : `${placed.length} of 3 supplies in the stand.`}</p>
      {dnd.drag && (
        <div className="ls-ghost is-supply" style={{ left: dnd.drag.x, top: dnd.drag.y }} aria-hidden="true"><StandObject kind={SUPPLIES.find((s) => s.id === dnd.drag!.payload.id)!.art} /></div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- revenue: serve the customers

function ServeBoard({ st, alongIndex, busy = noop, progress = NO_PROGRESS }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const { cups, price } = ledgerOf(p);
  const { speaking, reducedMotion } = useApp();
  const [served, setServed] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const canAct = st.phase === "answering" && st.hintStage < 2;
  const ready = served >= cups;

  useEffect(() => standStore.set({ exId: ex.id, coins: [], ready, sign: null, pick: null }), [ex.id, ready]);
  const said = useRef(false);
  useEffect(() => {
    if (ready && !said.current && alongIndex < 0) {
      said.current = true;
      audio.play("star", { gain: 0.4 });
      if (!speaking) void audio.speak("ls.served");
    }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const serve = () => {
    if (!canAct || served >= cups) return;
    busy();
    setServed((n) => Math.min(cups, n + 1));
    audio.play("drop", { gain: 0.6 });
    audio.playCount(served + 1);
  };
  const dnd = useDragDrop<"cup">(root, { canAct, busy, onDrop: (zone) => zone === "queue" && serve() });
  useEffect(() => {
    if (alongIndex < 0) return;
    setServed(cups);
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={stageClass(st, "revenue", dnd.drag ? "is-carrying" : "", reducedMotion)} ref={root} data-testid="stand-board" data-mode="revenue" data-params={JSON.stringify(p)} data-ready={String(ready)} data-served={served} data-step={alongIndex}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="ls-layout">
        <div className="ls-info">
          <div className="ls-card ls-cash" data-testid="cash-rows">
            <p className="ls-ledger-title">Money from cups</p>
            <div className="ls-cash-grid" style={{ "--cols": Math.min(5, cups) } as React.CSSProperties}>
              {Array.from({ length: cups }, (_, i) => (
                <span key={i} className={`ls-cash-slot ${i < served ? "is-paid" : ""} ${alongIndex >= i ? "is-step" : ""}`}>
                  {i < served ? fmt(price) : ""}
                  {alongIndex >= i && <i className="ls-running">{fmt((i + 1) * price)}</i>}
                </span>
              ))}
            </div>
          </div>
        </div>
        <StandScene progress={progress} className="ls-scene-queue">
          <button
            type="button"
            className={`ls-drop ls-queue ${dnd.hot === "queue" ? "is-hot" : ""} ${dnd.drag ? "is-target" : ""}`}
            data-drop="queue"
            data-testid="queue"
            aria-disabled={!canAct || ready}
            aria-label={ready ? "Every customer has lemonade" : `Serve the next customer. ${cups - served} still waiting`}
            onClick={(e) => !dnd.wasDrag(e) && serve()}
          >
            {Array.from({ length: cups }, (_, i) => {
              const C = CUSTOMERS[i % CUSTOMERS.length]!;
              return (
                <span key={i} className={`ls-customer ${i < served ? "is-served" : i === served ? "is-next" : ""}`} style={{ "--i": i } as React.CSSProperties} aria-hidden="true">
                  <C state={i < served ? "celebrating" : "idle"} size="100%" />
                  {i < served && <span className="ls-customer-cup"><CupArt /></span>}
                </span>
              );
            })}
          </button>
        </StandScene>
        <div className="ls-source ls-pitcher-row">
          <button
            type="button"
            className="ls-pitcher"
            data-testid="pitcher"
            data-idle="true"
            aria-disabled={!canAct || ready}
            aria-label={ready ? "Every customer has lemonade" : `Pour a cup for ${CUSTOMER_NAMES[served % CUSTOMER_NAMES.length]}`}
            onPointerDown={(e) => !ready && dnd.start(e, "cup")}
            onClick={(e) => !dnd.wasDrag(e) && serve()}
          >
            <span className="ls-pitcher-art"><PitcherArt /></span>
            <span className="ls-price-chip">{fmt(price)} a cup</span>
          </button>
          <span className="ls-served-count" aria-hidden="true">{served} / {cups} served</span>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{ready ? `All ${cups} customers served. Choose how much money came in.` : `${served} of ${cups} customers served.`}</p>
      {dnd.drag && <div className="ls-ghost is-supply" style={{ left: dnd.drag.x, top: dnd.drag.y }} aria-hidden="true"><CupArt /></div>}
    </div>
  );
}

// ---------------------------------------------------------------- price: the slider

function PriceBoard({ st, alongIndex, busy = noop, progress = NO_PROGRESS }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const s = useMemo(() => surveyOf(p), [p]);
  const { reducedMotion } = useApp();
  const [pick, setPick] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const pressing = useRef(false);
  const canAct = st.phase === "answering" && st.hintStage < 2;
  const allowed = s.prices.filter((x) => !st.eliminated.includes(x));
  const idx = pick === null ? -1 : s.prices.indexOf(pick as (typeof s.prices)[number]);
  const maxCups = Math.max(...s.cups);

  useEffect(() => standStore.set({ exId: ex.id, coins: [], ready: true, sign: null, pick }), [ex.id, pick]);
  useEffect(() => {
    if (st.hintStage === 2 && typeof st.model === "number") setPick(st.model);
  }, [st.hintStage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (alongIndex >= 0) audio.play("tap", { gain: 0.4 });
  }, [alongIndex]);

  const choose = (price: number) => {
    if (!canAct || !allowed.includes(price) || price === pick) return;
    busy();
    setPick(price);
    audio.play("tap", { gain: 0.55 });
  };
  const fromX = (x: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    const t = Math.max(0, Math.min(1, (x - r.left) / r.width));
    const want = Math.round(t * 3);
    // nearest allowed notch
    const best = allowed.map((v) => ({ v, d: Math.abs(s.prices.indexOf(v as (typeof s.prices)[number]) - want) })).sort((a, b) => a.d - b.d)[0];
    if (best) choose(best.v);
  };
  const step = (dir: 1 | -1 | "home" | "end") => {
    if (!canAct || allowed.length === 0) return;
    const ai = pick === null ? -1 : allowed.indexOf(pick);
    const next = dir === "home" ? 0 : dir === "end" ? allowed.length - 1 : ai < 0 ? (dir === 1 ? 0 : allowed.length - 1) : Math.max(0, Math.min(allowed.length - 1, ai + dir));
    choose(allowed[next]!);
  };

  const shownCups = idx >= 0 ? s.cups[idx]! : null;
  return (
    <div className={stageClass(st, "price", "", reducedMotion)} data-testid="stand-board" data-mode="price" data-params={JSON.stringify(p)} data-pick={pick ?? ""} data-step={alongIndex}>
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="ls-layout">
        <div className="ls-info">
          <div className="ls-card ls-survey" data-testid="survey">
            <p className="ls-ledger-title">Survey: cups sold at each price</p>
            <p className="ls-survey-cost">Each cup costs Budge <b>{fmt(s.cost)}</b> to make.</p>
            <table>
              <thead>
                <tr><th scope="col">Price</th><th scope="col">Cups sold</th>{alongIndex >= 0 && <th scope="col">Profit</th>}</tr>
              </thead>
              <tbody>
                {s.prices.map((price, i) => (
                  <tr key={price} className={`${i === idx ? "is-on" : ""} ${st.eliminated.includes(price) ? "is-out" : ""} ${st.model === price ? "is-model" : ""}`} data-testid="survey-row">
                    <th scope="row">{fmt(price)}</th>
                    <td><span className="ls-cupbar" style={{ width: `${(s.cups[i]! / maxCups) * 100}%` }} aria-hidden="true" /><b>{s.cups[i]}</b></td>
                    {alongIndex >= 0 && <td className="ls-profit-cell">{alongIndex >= i ? <>({fmt(price)} − {fmt(s.cost)}) × {s.cups[i]} = <b>{fmt(surveyProfit(s, i))}</b></> : ""}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <StandScene progress={progress} className="ls-scene-price">
          <div className="ls-drop ls-pricesign" data-testid="price-sign">
            <span className="ls-pricesign-board"><span className="ls-pricesign-label">Price</span><b>{pick === null ? "?" : fmt(pick)}</b></span>
            {shownCups !== null && <span className="ls-cup-grid" key={pick ?? 0} aria-hidden="true">{Array.from({ length: shownCups }, (_, i) => <span key={i} style={{ animationDelay: `${i * 8}ms` }}><CupArt /></span>)}</span>}
            <span className="ls-pricesign-crowd">{shownCups === null ? "Slide to try a price" : <><span className="ls-crowd-cup" aria-hidden="true"><CupArt /></span>{shownCups} cups sold</>}</span>
          </div>
        </StandScene>
        <div className="ls-source ls-slider-row">
          <div className="ls-slider" ref={track}
            onPointerDown={(e) => { if (!canAct || (e.target as HTMLElement).closest("button")) return; pressing.current = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); fromX(e.clientX); }}
            onPointerMove={(e) => pressing.current && fromX(e.clientX)}
            onPointerUp={() => { pressing.current = false; }}
            onPointerCancel={() => { pressing.current = false; }}
          >
            <span className="ls-slider-rail" aria-hidden="true" />
            {s.prices.map((price, i) => (
              <button
                key={price}
                type="button"
                className={`ls-notch ${pick === price ? "is-on" : ""} ${st.eliminated.includes(price) ? "is-out" : ""} ${st.model === price ? "is-model" : ""}`}
                style={{ "--x": `${(i / 3) * 100}%` } as React.CSSProperties}
                data-testid="choice"
                data-value={price}
                aria-disabled={!canAct || st.eliminated.includes(price)}
                aria-label={`Try the price ${words(price)}: ${s.cups[i]} cups sell`}
                onClick={() => choose(price)}
              >
                {fmt(price)}
              </button>
            ))}
            <button
              type="button"
              role="slider"
              className={`ls-knob ${pick === null ? "is-unset" : ""}`}
              style={{ "--x": `${((idx < 0 ? 0 : idx) / 3) * 100}%` } as React.CSSProperties}
              data-testid="price-slider"
              data-idle="true"
              aria-label="Price slider"
              aria-valuemin={s.prices[0]}
              aria-valuemax={s.prices[3]}
              aria-valuenow={pick ?? s.prices[0]}
              aria-valuetext={pick === null ? "No price chosen yet" : `${words(pick)}, ${shownCups} cups sell`}
              aria-disabled={!canAct}
              onKeyDown={(e) => {
                const map: Record<string, 1 | -1 | "home" | "end"> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, Home: "home", End: "end" };
                const d = map[e.key];
                if (d === undefined) return;
                e.preventDefault();
                step(d);
              }}
              onPointerDown={(e) => { if (!canAct) return; pressing.current = true; track.current?.setPointerCapture?.(e.pointerId); }}
            >
              <span className="ls-knob-art" aria-hidden="true"><LemonArt /></span>
            </button>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{pick === null ? "" : `Price ${words(pick)}: ${shownCups} cups sell.`}</p>
    </div>
  );
}

// ---------------------------------------------------------------- tray

const PAY_LABEL: Record<Mode, string> = { pay: "Pay", change: "Give change", profit: "Save it", loss: "Done", cost: "", revenue: "", price: "Set price" };

export function StandTray({ st, act }: BoardProps) {
  const status = useSyncExternalStore(standStore.subscribe, standStore.get);
  const ex = st.exercise;
  const mode = modeOf(ex.params);
  const fresh = status.exId === ex.id;
  const fb = st.feedback;
  const answering = st.phase === "answering";

  if (mode === "cost" || mode === "revenue") {
    const ready = fresh && status.ready;
    return (
      <div className={`choice-tray ls-choices ${ready ? "" : "is-waiting"}`} role="group" aria-label={mode === "cost" ? "Choose the cost of one batch" : "Choose how much money came in"}>
        {choicesOf(ex).map((c, i) => {
          const disabled = !ready || st.eliminated.includes(c) || !answering;
          const isModel = st.model === c && answering;
          const state = st.phase === "feedback" && st.lastAnswer === c ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" && c === targetOf(ex) ? "is-right" : "";
          return (
            <button
              key={c}
              type="button"
              className={`choice ls-money-card ${state} ${isModel ? "is-model" : ""} ${st.eliminated.includes(c) ? "is-out" : ""}`}
              style={{ animationDelay: `${i * 70}ms` }}
              data-testid="choice"
              data-value={c}
              aria-label={ready ? `${words(c)}` : `${words(c)} (${mode === "cost" ? "move the supplies in first" : "serve every customer first"})`}
              aria-disabled={disabled}
              onClick={() => !disabled && act({ type: "SUBMIT", value: c })}
            >
              <span className="numeral">{fmt(c)}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (mode === "price") {
    const pick = fresh ? status.pick : null;
    const disabled = pick === null || !answering || st.eliminated.includes(pick);
    const state = st.phase === "feedback" ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" ? "is-right" : "";
    return (
      <div className="choice-tray ls-pay-tray">
        <button type="button" className={`ls-pay ${state} ${st.hintStage === 2 && answering ? "is-model" : ""}`} data-testid="done" aria-disabled={disabled}
          aria-label={pick === null ? "Set the price (slide to a price first)" : `Set the price to ${words(pick)}`} onClick={() => !disabled && act({ type: "SUBMIT", value: pick })}>
          <span>Set price</span><b>{pick === null ? "?" : fmt(pick)}</b>
        </button>
      </div>
    );
  }

  const coins = fresh ? status.coins : [];
  const sum = total(coins);
  const sign = fresh ? status.sign : null;
  const value = mode === "loss" ? (sign ?? 0) * sum : sum;
  const can = mode === "loss" ? sign !== null && (sign === 0 || sum > 0) : sum > 0;
  const disabled = !can || !answering;
  const state = st.phase === "feedback" ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" ? "is-right" : "";
  const label =
    mode === "loss"
      ? sign === null ? "Done (choose profit, loss or break even first)" : sign === 0 ? "Done: it was break even" : `Done: a ${sign > 0 ? "profit" : "loss"} of ${words(sum)}`
      : `${PAY_LABEL[mode]}: ${words(sum)}`;
  return (
    <div className="choice-tray ls-pay-tray">
      <button type="button" className={`ls-pay ${state} ${st.hintStage === 2 && answering ? "is-model" : ""}`} data-testid="done" data-value={value} aria-disabled={disabled} aria-label={label}
        onClick={() => !disabled && act({ type: "SUBMIT", value })}>
        <span>{PAY_LABEL[mode]}</span><b>{mode === "loss" && sign === 0 ? "even" : fmt(sum)}</b>
      </button>
    </div>
  );
}

/** Worked-example steps for the runner (model hint). */
export const lemonadeSteps = (ex: Exercise) => modelStepCount(ex.params, targetOf(ex));
