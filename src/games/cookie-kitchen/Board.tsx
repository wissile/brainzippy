import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Hoot, Puff, Zuzu } from "../../characters/Crew";
import { CREW } from "../../characters/palette";
import type { MascotState } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { IconHand } from "../../ui/icons";
import { BakingTray, CookieArt, PlateArt } from "./art";
import { type Stacks, bestGrid, dealRoundRobin, emptyStacks, moveCookie, shareStatus, trayCookies } from "./sharing";
import { fairStore } from "./store";
import "./cookie-kitchen.css";

/**
 * Cookie Kitchen play board: Rumble's baking tray of cookies + a party table with one plate per friend.
 * The child shares cookies by dragging (pointer), tap-then-tap, or keyboard (Enter on a cookie, then Enter on a plate).
 * Tapping a plate with nothing picked up sends its top cookie back to the tray. The arrangement is a thinking
 * tool; the answer is chosen with the "N each" pills in the tray.
 */
type Guest = (p: { state: MascotState }) => React.JSX.Element;
const GUEST_POOL: { name: string; C: Guest; tint: string }[] = [
  { name: "Gloop", C: ({ state }) => <Gloop state={state} size="100%" />, tint: CREW.gloop },
  { name: "Zuzu", C: ({ state }) => <Zuzu state={state} size="100%" />, tint: CREW.zuzu },
  { name: "Puff", C: ({ state }) => <Puff state={state} size="100%" />, tint: CREW.puff },
  { name: "Hoot", C: ({ state }) => <Hoot state={state} size="100%" />, tint: CREW.hoot },
];
const BOBBO = { name: "Bobbo", C: (({ state }) => <Bobbo state={state} size="100%" />) as Guest, tint: CREW.bobbo };

/** Bobbo always comes to the party; the other seats rotate with the exercise seed. */
export function guestsFor(groups: number, seed: number) {
  const r = seed % GUEST_POOL.length;
  return [BOBBO, ...GUEST_POOL.slice(r), ...GUEST_POOL.slice(0, r)].slice(0, groups);
}

interface Drag {
  from: "tray" | "plate";
  cookie: number;
  plate: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  active: boolean;
}

function useSize<T extends HTMLElement>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 600, h: 240 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 1 && Math.abs(s.h - r.height) < 1 ? s : { w: r.width, h: r.height }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/** Tray layout: the largest square cookie cells for `n` cookies inside the zone, and the sheet size around them. */
function sheetLayout(n: number, w: number, h: number) {
  const pad = Math.round(Math.min(w, h) * 0.06 + 8);
  const iw = Math.max(40, w - pad * 2);
  const ih = Math.max(40, h - pad * 2);
  const { cols, rows } = bestGrid(n, iw / ih);
  const cell = Math.floor(Math.min(iw / cols, ih / rows, 104));
  return { cols, rows, cell, width: cols * cell + pad * 2, height: rows * cell + pad * 2, pad };
}

const plural = (n: number) => `${n} ${n === 1 ? "cookie" : "cookies"}`;

export function CookieBoard({ st, act, alongIndex }: BoardProps) {
  const ex = st.exercise;
  const total = ex.params?.total ?? ex.target;
  const groups = ex.params?.groups ?? 1;
  const { speaking, reducedMotion } = useApp();
  const guests = useMemo(() => guestsFor(groups, ex.seed), [groups, ex.seed]);

  const [stacks, setStacks] = useState<Stacks>(() => emptyStacks(groups));
  const [selected, setSelected] = useState<number | null>(null);
  const [landed, setLanded] = useState<{ ids: number[]; stagger: boolean }>({ ids: [], stagger: false });
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [hot, setHot] = useState<number | null>(null); // plate under the dragged cookie (−1 = tray)
  /** Time of the last drag release: the click the browser fires right after it is ignored (event timestamps, so a busy device never swallows a later tap). */
  const suppressClick = useRef(-Infinity);
  const [moves, setMoves] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const [zoneRef, zone] = useSize<HTMLDivElement>();
  const sheet = useMemo(() => sheetLayout(total, zone.w, zone.h), [total, zone.w, zone.h]);

  const canAct = st.phase === "answering";
  const status = shareStatus(total, stacks);
  const onTray = trayCookies(total, stacks);
  const celebrate = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const wrong = st.phase === "feedback" && st.feedback?.correct === false;
  const guestState: MascotState = celebrate ? "celebrating" : wrong ? "retry" : status.each !== null ? "greeting" : "idle";

  /** Tell the runner the child is busy (resets its idle nudge) without changing exercise state. */
  const ping = () => act({ type: "REMOVE_FROM_BASKET", index: -1 });

  const place = (cookie: number, plate: number, keyboard = false) => {
    if (!canAct) return;
    ping();
    const next = moveCookie(stacks, cookie, plate);
    setStacks(next);
    setMoves((m) => m + 1);
    setSelected(null);
    if (plate >= 0) {
      setLanded({ ids: [cookie], stagger: false });
      audio.play("drop", { gain: 0.6 });
      audio.playCount(next[plate]!.length);
    } else {
      audio.play("pickup", { gain: 0.5 });
    }
    if (keyboard) {
      // keep keyboard users flowing: back to the next cookie on the tray (or stay on the plates when the tray is empty)
      const nextId = trayCookies(total, next)[0];
      const root = rootRef.current;
      const el = (nextId !== undefined ? root?.querySelector(`[data-cookie="${nextId}"]`) : root?.querySelector(`[data-plate="${plate}"]`)) as HTMLElement | null;
      el?.focus({ preventScroll: true });
    }
  };

  // Worked example (hints): deal one at a time, round and round. The dealt arrangement stays as a model.
  useEffect(() => {
    if (alongIndex < 0) return;
    setSelected(null);
    setStacks(dealRoundRobin(total, groups, alongIndex + 1));
    setLanded({ ids: [alongIndex], stagger: false });
  }, [alongIndex, total, groups]);

  // Correct: show the fair share on the table (deal the rest if the child answered without sharing).
  useEffect(() => {
    if (!celebrate) return;
    if (shareStatus(total, stacks).each === null) {
      setStacks(dealRoundRobin(total, groups, total));
      setLanded({ ids: Array.from({ length: total }, (_, i) => i), stagger: true });
    }
  }, [celebrate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Self-check: publish the fair share to the tray; say whether the shared-out plates are fair.
  useEffect(() => {
    fairStore.set({ exId: ex.id, each: moves > 0 || alongIndex >= 0 || celebrate ? status.each : null });
  }, [ex.id, status.each, moves, alongIndex, celebrate]);
  useEffect(() => () => fairStore.set({ exId: "", each: null }), []);
  const spokenFor = useRef("");
  useEffect(() => {
    if (!status.allShared || !canAct || moves === 0) {
      spokenFor.current = "";
      return;
    }
    const key = status.equal ? "fair" : "unfair";
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    if (status.equal) audio.play("star", { gain: 0.5 });
    if (!speaking) void audio.speak(status.equal ? "ck.fair" : "ck.unfair");
  }, [status.allShared, status.equal, moves]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- pointer drag ----------
  const targetAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const plate = el?.closest<HTMLElement>("[data-plate]");
    if (plate && rootRef.current?.contains(plate)) return Number(plate.dataset.plate);
    if (el?.closest('[data-testid="cookie-tray"]')) return -1;
    return null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10;
      if (active && !d.active) {
        audio.play("pickup", { gain: 0.5 });
        setSelected(null);
      }
      const next = { ...d, x: e.clientX, y: e.clientY, active };
      dragRef.current = next;
      setDrag(next);
      setHot(active ? targetAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d?.active) {
        suppressClick.current = e.timeStamp;
        const t = targetAt(e.clientX, e.clientY);
        if (t !== null && t >= 0 && t !== d.plate) place(d.cookie, t);
        else if (t === -1 && d.from === "plate") place(d.cookie, -1);
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
  }, [drag !== null, stacks, canAct]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, from: Drag["from"], cookie: number, plate: number) => {
    if (!canAct || e.button !== 0) return;
    const d0: Drag = { from, cookie, plate, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, active: false };
    dragRef.current = d0;
    setDrag(d0);
  };

  // ---------- tutorial demo: a hand slides a cookie to the first plate until the child moves one ----------
  const [demo, setDemo] = useState<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const showDemo = !!ex.tutorial && moves === 0 && canAct && selected === null && !drag && alongIndex < 0;
  useEffect(() => {
    if (!showDemo) return setDemo(null);
    const measure = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const from = rootRef.current?.querySelector('[data-testid="tray-cookie"]')?.getBoundingClientRect();
      const to = rootRef.current?.querySelector('[data-testid="plate"]')?.getBoundingClientRect();
      if (!root || !from || !to) return;
      setDemo({ x: from.left - root.left + from.width / 2, y: from.top - root.top + from.height / 2, tx: to.left - root.left + to.width / 2, ty: to.top - root.top + to.height * 0.55 });
    };
    const t = window.setTimeout(measure, 2600);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [showDemo]);

  const boardCls = [
    "ck-board",
    wrong ? "is-wrong" : "",
    celebrate ? "is-celebrating" : "",
    status.each !== null && moves + (alongIndex >= 0 ? 1 : 0) > 0 ? "is-fair" : "",
    status.allShared && !status.equal ? "is-unfair" : "",
    selected !== null || drag?.active ? "is-carrying" : "",
    reducedMotion ? "still" : "",
  ].join(" ");
  const maxCount = Math.max(...stacks.map((s) => s.length));
  const minCount = Math.min(...stacks.map((s) => s.length));

  return (
    <div className={boardCls} ref={rootRef} data-testid="cookie-board" data-fair={status.each ?? ""} data-shared={status.allShared}>
      <div className="ck-layout">
      <div className="ck-trayzone" ref={zoneRef}>
        <div className={`ck-sheet ${hot === -1 ? "hot" : ""}`} style={{ width: sheet.width, height: sheet.height }} data-testid="cookie-tray" role="group" aria-label={`Rumble's tray: ${plural(onTray.length)} left to share`}>
          <BakingTray />
          <div className="ck-sheet-grid" style={{ inset: sheet.pad, gridTemplateColumns: `repeat(${sheet.cols}, ${sheet.cell}px)`, gridTemplateRows: `repeat(${sheet.rows}, ${sheet.cell}px)` }}>
            {Array.from({ length: total }, (_, i) => {
              const here = onTray.includes(i);
              if (!here) return <span key={i} className="ck-slot" aria-hidden="true" />;
              const lifted = (drag?.active && drag.cookie === i) || selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  className={`ck-cookie ${lifted ? "lifted" : ""} ${drag?.active && drag.cookie === i ? "ghosted" : ""}`}
                  style={{ animationDelay: `${(i % 12) * 40}ms` } as React.CSSProperties}
                  data-testid="tray-cookie"
                  data-cookie={i}
                  tabIndex={i === onTray[0] ? 0 : -1}
                  aria-pressed={selected === i}
                  aria-label={selected === i ? "Cookie picked up. Now choose a plate" : "Cookie. Press to pick it up"}
                  aria-disabled={!canAct}
                  onPointerDown={(e) => startDrag(e, "tray", i, -1)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSelected(null);
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      const k = onTray.indexOf(i) + (e.key === "ArrowRight" ? 1 : -1);
                      const id = onTray[(k + onTray.length) % onTray.length];
                      (rootRef.current?.querySelector(`[data-cookie="${id}"]`) as HTMLElement | null)?.focus();
                    }
                  }}
                  onClick={(e) => {
                    if (e.timeStamp - suppressClick.current < 80 || !canAct) return;
                    ping();
                    if (selected === i) return setSelected(null);
                    setSelected(i);
                    audio.play("pickup", { gain: 0.5 });
                    if (e.detail === 0) (rootRef.current?.querySelector('[data-testid="plate"]') as HTMLElement | null)?.focus({ preventScroll: true });
                  }}
                >
                  <CookieArt kind="cookie" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ck-table" style={{ "--n": groups } as React.CSSProperties}>
        <div className="ck-tabletop" aria-hidden="true" />
        <div className="ck-seats" role="list" aria-label="Party plates">
          {stacks.map((stack, k) => {
            const g = guests[k]!;
            const n = stack.length;
            const top = stack[n - 1];
            const scale = n <= 6 ? 1 : n <= 9 ? 0.8 : n <= 12 ? 0.66 : 0.52;
            const uneven = status.allShared && !status.equal ? (n === maxCount ? "more" : n === minCount ? "less" : "") : "";
            const label =
              selected !== null
                ? `${g.name}'s plate, ${plural(n)}. Press to put the cookie here`
                : n > 0
                  ? `${g.name}'s plate, ${plural(n)}. Press to send one back to the tray`
                  : `${g.name}'s plate, empty`;
            return (
              <div key={k} className={`ck-seat ${hot === k ? "hot" : ""} ${uneven}`} role="listitem" style={{ "--k": k } as React.CSSProperties}>
                <div className="ck-guest" aria-hidden="true">
                  <div className="ck-guest-in">
                    <g.C state={k === 0 && wrong ? "retry" : guestState} />
                    {k === 0 && wrong && <span className="ck-notfair">{status.each !== null ? `${st.lastChoice} each?` : "Not fair!"}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="ck-plate"
                  data-testid="plate"
                  data-plate={k}
                  data-count={n}
                  aria-label={label}
                  aria-disabled={!canAct}
                  onPointerDown={(e) => {
                    if (selected === null && top !== undefined) startDrag(e, "plate", top, k);
                  }}
                  onClick={(e) => {
                    if (e.timeStamp - suppressClick.current < 80 || !canAct) return;
                    if (selected !== null) return place(selected, k, e.detail === 0);
                    if (top !== undefined) place(top, -1);
                  }}
                >
                  <span className="ck-pile" style={{ "--pc": scale } as React.CSSProperties}>
                    {stack.map((c, j) => {
                      const isNew = landed.ids.includes(c);
                      return (
                        <span key={c} className={`ck-pcookie ${isNew ? "land" : ""}`} style={isNew && landed.stagger ? { animationDelay: `${(c % 40) * 45}ms` } : undefined}>
                          <CookieArt kind="cookie" />
                          {celebrate && j === n - 1 && <i className="ck-sparkle" aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </span>
                  <span className="ck-dish"><PlateArt tint={g.tint} /></span>
                  <span className={`ck-count ${n === 0 ? "empty" : ""}`} aria-hidden="true" key={n}>{n === 0 ? "?" : n}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {stacks.map((s, k) => `${guests[k]!.name}: ${s.length}.`).join(" ")} {onTray.length} on the tray.
        {status.each !== null ? " Every plate has the same." : ""}
      </p>

      {drag?.active && (
        <div className="ck-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <CookieArt kind="cookie" />
        </div>
      )}
      {demo && showDemo && (
        <div className={`ck-demo ${reducedMotion ? "still" : ""}`} aria-hidden="true" data-testid="drag-demo" style={{ left: demo.x, top: demo.y, "--tx": `${demo.tx - demo.x}px`, "--ty": `${demo.ty - demo.y}px` } as React.CSSProperties}>
          <span className="ck-demo-cookie"><CookieArt kind="cookie" /></span>
          <span className="ck-demo-hand"><IconHand /></span>
        </div>
      )}
    </div>
  );
}

/** "N each" answer pills. The pill matching a fair, complete share glows gently (self-check after sharing). */
export function ShareTray({ st, act }: BoardProps) {
  const fair = useSyncExternalStore(fairStore.subscribe, fairStore.get);
  const ex = st.exercise;
  const each = fair.exId === ex.id ? fair.each : null;
  const fb = st.feedback;
  return (
    <div className="choice-tray ck-pills" role="group" aria-label="How many cookies on each plate? Choose one">
      {(ex.choices ?? []).map((c, i) => {
        const disabled = st.disabledChoices.includes(c) || st.phase !== "answering";
        const isModel = st.modelChoice === c && st.phase === "answering";
        const state =
          st.phase === "feedback" && st.lastChoice === c ? (fb?.correct ? "is-right" : "is-wrong") : st.phase === "solved" && c === ex.target ? "is-right" : "";
        const match = each === c && st.phase === "answering" && !isModel ? "ck-match" : "";
        return (
          <button
            key={c}
            type="button"
            className={`choice ck-pill ${state} ${isModel ? "is-model" : ""} ${st.disabledChoices.includes(c) ? "is-out" : ""} ${match}`}
            style={{ animationDelay: `${i * 80}ms` }}
            data-testid="choice"
            data-value={c}
            aria-label={`${c} each`}
            aria-disabled={disabled}
            onClick={() => !disabled && act({ type: "CHOOSE", value: c })}
          >
            <span className="numeral">{c}</span>
            <span className="ck-each">each</span>
          </button>
        );
      })}
    </div>
  );
}
