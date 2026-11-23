import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { AnswerOption } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { BoatHull, Critter, Picture } from "./art";
import { isTricky, parseScene } from "./content";
import {
  buildNoteOf, isReadMode, keywordLine, keywordOf, modeOf, modelUnits, noteOf, pictureWord, sailWord, sentenceLine, slowLine, spokenWord, trickyLine, wordLine,
} from "./logic";
import "./paper-boat-post.css";

/**
 * Paper Boat Post board (skin.Board). The paper boat sits on the river at the top with its sail; the docks, tiles
 * or word cards are below. Every move works three ways (D-022): drag, tap-tap (tap the boat / a tile, then a dock /
 * a slot) or a single tap where that is unambiguous, and keyboard (Tab + Enter/Space; Backspace takes the last tile
 * back; letter keys press letter tiles). Modes (logic.ts MODE):
 *   read / plural / noteRead  read the sail (never spoken before the answer), send the boat to a picture dock
 *   swap                      put the right first-letter tile in the gap on the sail
 *   tag                       hang the right name tag on the critter
 *   build / compound / noteBuild  fill the sail's slots with tiles or word cards, then Send
 *   sort                      send four little boats to the two spelling docks, then Send
 * Hints: first miss → the wrong choice greys out (engine) and, once the helper has spoken, the sail's letters light
 * front to back (keyword pictures pop up on levels 1–4; spelling items replay the word slowly). Second miss → the
 * runner's count-along steps light each letter while the slowed word plays, then the right answer pulses (is-model)
 * and the child completes it.
 */
type Zone = { kind: "dock" | "slot" | "gap" | "hook" | "sort"; value: string };
interface Drag { id: string; startX: number; startY: number; active: boolean; dx: number; dy: number; rect: DOMRect }

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const describeScene = (id: string) => {
  const s = parseScene(id);
  return `${s.who} ${s.rel === "has" ? "has a" : `${s.rel} the`} ${s.what}`;
};
const markName = (t: string) => (t === "." ? "full stop" : t === "?" ? "question mark" : t);

export function BoatBoard({ st, act, alongIndex, busy: busyProp }: BoardProps) {
  const busy = () => busyProp?.();
  const ex = st.exercise;
  const a = ex.answer;
  const mode = modeOf(ex);
  const reading = isReadMode(mode);
  const { reducedMotion, speaking } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const stRef = useRef(st);
  stRef.current = st;
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  const canAct = st.phase === "answering";
  const fb = st.feedback;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const wrongNow = st.phase === "feedback" && fb?.correct === false;
  const out = (id: string) => st.eliminated.includes(id);
  const modelOn = st.hintStage === 2 && canAct;
  const tried = typeof st.lastAnswer === "string" ? st.lastAnswer : null;
  const early = (ex.skillId === "english.phonics.cvc" || ex.skillId === "english.phonics.onset-rime");

  const [selected, setSelected] = useState<string | null>(null);
  const [lit, setLit] = useState<number[]>([]);
  const [pop, setPop] = useState<number | null>(null);
  const [saying, setSaying] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(-Infinity);
  const token = useRef(0);
  const zoneKey = (z: Zone) => `${z.kind}:${z.value}`;
  /** When the child last moved focus with Tab/arrows (focusing a dock then names its picture). */
  const navAt = useRef(-Infinity);
  const navRecent = () => performance.now() - navAt.current < 600;

  // ---------------------------------------------------------------- sequence state (build, compound, noteBuild)
  const slots = a.kind === "sequence" ? a.order.length : 0;
  const pieces: readonly AnswerOption[] = a.kind === "sequence" ? a.pieces : [];
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: slots }, () => null));
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const pieceText = (id: string) => pieces.find((p) => p.id === id)?.text ?? id;
  const quietE = mode === "build" && ex.params?.e === 1;
  const filled = placed.filter(Boolean).length;
  const canSend = canAct && (filled === slots || (quietE && filled === slots - 1 && placed[slots - 1] === null));

  // ---------------------------------------------------------------- match state (sort)
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const items = a.kind === "match" ? a.items : [];
  const bins = a.kind === "match" ? a.targets : [];

  // ---------------------------------------------------------------- speech helpers
  const say = (line: string, key: string) => {
    token.current++;
    setSaying(key);
    void audio.speak(line).then(() => setSaying((s) => (s === key ? null : s)));
  };
  const target = sailWord(ex);
  const heard = spokenWord(ex);

  // Name the dock pictures once the runner's prompt (and any helper) has finished. Pictures only: the boat's
  // word is never spoken before the answer. Muted play skips this (captions would just parade past).
  useEffect(() => {
    if (!reading || mode === "noteRead" || audio.isMuted() || a.kind !== "choice") return;
    const my = ++token.current;
    let seen = false;
    let quiet = 0;
    const started = Date.now();
    const id = window.setInterval(() => {
      if (my !== token.current) return window.clearInterval(id);
      if (speakingRef.current) {
        seen = true;
        quiet = 0;
        return;
      }
      if (stRef.current.phase !== "answering" || document.querySelector('[data-testid="helper"]') || (!seen && Date.now() - started < 3000)) return;
      if (!quiet) quiet = Date.now();
      if (Date.now() - quiet < 350) return;
      window.clearInterval(id);
      void (async () => {
        for (const o of a.options) {
          if (my !== token.current || stRef.current.phase !== "answering") break;
          setSaying(o.id);
          busy();
          await audio.speak(wordLine(pictureWord(o.art ?? o.id)));
          await sleep(180);
        }
        if (my === token.current) setSaying(null);
      })();
    }, 120);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    token.current++;
  }, []);

  // ---------------------------------------------------------------- after a miss
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    setSelected(null);
    if (a.kind === "sequence") {
      const parts = st.check?.parts ?? {};
      const last = Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly (string | null)[]) : [];
      // keep the tiles that were right where they are (gold), send the rest back
      setPlaced(Array.from({ length: slots }, (_, i) => (parts[String(i)] === true && last[i] ? last[i]! : null)));
    }
    if (a.kind === "match") {
      if (st.hintStage === 2 && st.model && typeof st.model === "object" && !Array.isArray(st.model)) setSorted({ ...(st.model as Record<string, string>) });
      else setSorted((s) => Object.fromEntries(Object.entries(s).filter(([k]) => st.check?.parts?.[k] === true)));
    }
    if (st.hintStage !== 1) return;
    // first miss: light the sail front to back (keyword pictures on early levels), or replay the word slowly
    const my = ++token.current;
    void (async () => {
      await sleep(250);
      if (reading && mode !== "noteRead") {
        const units = modelUnits(ex);
        for (let i = 0; i < units.length; i++) {
          if (my !== token.current) return;
          setLit((l) => [...l, i]);
          const k = units[i]!.length === 1 ? keywordOf(units[i]!) : undefined;
          if (early && k) {
            setPop(i);
            if (!audio.isMuted()) await audio.speak(keywordLine(units[i]!));
            else await sleep(650);
          } else await sleep(520);
        }
        await sleep(500);
        if (my === token.current) {
          setPop(null);
          setLit([]);
        }
      } else if ((mode === "build" || mode === "swap" || mode === "compound") && heard) {
        say(slowLine(heard), "slow");
      }
    })();
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- second miss: the modelled answer
  useEffect(() => {
    if (alongIndex < 0) return;
    token.current++;
    setSelected(null);
    if (reading) {
      const units = modelUnits(ex);
      if (alongIndex < units.length) setLit(Array.from({ length: alongIndex + 1 }, (_, i) => i));
      if (mode === "noteRead") {
        if (alongIndex === units.length) say(sentenceLine(noteOf(ex).id), "note");
        return;
      }
      const w = target;
      if (!w) return;
      if (alongIndex === 0) say(slowLine(w), "slow");
      if (alongIndex === units.length) say(wordLine(w), "word");
      return;
    }
    if (alongIndex === 0) {
      if (mode === "noteBuild") say(sentenceLine(buildNoteOf(ex).id), "note");
      else if (heard) say(slowLine(heard), "slow");
    }
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (st.phase === "answering" && st.hintStage === 2 && alongIndex < 0) setLit([]);
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- actions
  const submit = (value: string | string[] | Record<string, string>) => {
    token.current++;
    setSaying(null);
    setSelected(null);
    act({ type: "SUBMIT", value });
  };
  const focusEl = (sel: string) => {
    const from = document.activeElement;
    window.setTimeout(() => {
      // only if focus hasn't moved on since (the child may already have tabbed somewhere else)
      if (document.activeElement !== from && document.activeElement !== document.body) return;
      (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });
    }, 30);
  };

  const choose = (id: string) => {
    if (!canAct || out(id)) return;
    busy();
    submit(id);
  };
  const placeTile = (id: string, at?: number) => {
    if (!canAct || out(id) || placedRef.current.includes(id)) return;
    busy();
    const next = [...placedRef.current];
    const i = at !== undefined && next[at] === null ? at : next.indexOf(null);
    if (i < 0) return;
    next[i] = id;
    setPlaced(next);
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    // keyboard users never drop to <body>: the next free tile after this one, or Send when the sail is full
    if (lastKeyboard.current) {
      if (next.every(Boolean)) focusEl('[data-testid="done"]');
      else focusNextTile(id);
    }
  };
  const focusNextTile = (after: string) =>
    window.setTimeout(() => {
      // never steal focus the child has already moved: only rescue it from the tile that just left (or <body>)
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ae !== document.body && ae.dataset.value !== after) return;
      const all = [...(rootRef.current?.querySelectorAll<HTMLElement>('.pb-tiles [data-testid="choice"]') ?? [])];
      const free = (el: HTMLElement) => !el.classList.contains("is-away") && el.getAttribute("aria-disabled") !== "true";
      const at = all.findIndex((el) => el.dataset.value === after);
      const next = [...all.slice(at + 1), ...all.slice(0, Math.max(0, at))].find(free);
      (next ?? rootRef.current?.querySelector<HTMLElement>('[data-testid="slot"][data-filled="true"]'))?.focus({ preventScroll: true });
    }, 40);
  const unplace = (i: number) => {
    if (!canAct) return;
    const id = placedRef.current[i];
    if (!id) return;
    busy();
    audio.play("pickup", { gain: 0.4 });
    setPlaced((p) => p.map((x, k) => (k === i ? null : x)));
  };
  const send = () => {
    if (!canSend) return;
    submit(placedRef.current.filter((x): x is string => !!x));
  };
  const sortTo = (item: string, bin: string) => {
    if (!canAct) return;
    busy();
    setSorted((s) => ({ ...s, [item]: bin }));
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    if (lastKeyboard.current) focusEl(Object.keys(sorted).length + (sorted[item] ? 0 : 1) === items.length ? '[data-testid="done"]' : '.pb-fleet [data-testid="choice"]');
  };
  const unsort = (item: string) => {
    if (!canAct) return;
    busy();
    audio.play("pickup", { gain: 0.4 });
    setSorted((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== item)));
    if (lastKeyboard.current) focusEl(`.pb-fleet [data-testid="choice"][data-value="${CSS.escape(item)}"]`);
  };
  const sendSort = () => {
    if (!canAct || Object.keys(sorted).length !== items.length) return;
    submit(sorted);
  };

  /** Drop `id` on a zone (drag, tap-tap or keyboard). */
  const dropOn = (id: string, z: Zone) => {
    if (!canAct) return;
    if (z.kind === "dock" && reading) return choose(z.value);
    if ((z.kind === "gap" || z.kind === "hook") && (mode === "swap" || mode === "tag")) return choose(id);
    if (z.kind === "slot") return placeTile(id, Number(z.value));
    if (z.kind === "sort") return sortTo(id, z.value);
  };

  // keyboard: Backspace returns the last tile; letter keys press a matching letter tile (never a text field)
  const lastKeyboard = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow")) navAt.current = performance.now();
      lastKeyboard.current = e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow") || e.key === "Backspace" || lastKeyboard.current;
      if (stRef.current.phase !== "answering" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (a.kind === "sequence" && e.key === "Backspace") {
        const p = placedRef.current;
        for (let i = p.length - 1; i >= 0; i--) if (p[i]) return unplace(i);
      }
      if (a.kind === "sequence" && mode === "build" && /^[a-z]$/.test(e.key)) {
        const tile = pieces.find((t) => t.text === e.key && !placedRef.current.includes(t.id) && !stRef.current.eliminated.includes(t.id));
        if (tile) placeTile(tile.id);
      }
    };
    const onPointer = () => {
      lastKeyboard.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- drag
  const zoneAt = (x: number, y: number): Zone | null => {
    let best: { z: Zone; d: number } | null = null;
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>("[data-pb-zone]") ?? []) {
      const r = el.getBoundingClientRect();
      const m = 24;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      const [kind, value] = el.dataset.pbZone!.split(":") as [Zone["kind"], string];
      if (!best || d < best.d) best = { z: { kind, value }, d };
    }
    return best?.z ?? null;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const active = d.active || Math.hypot(dx, dy) > 10;
      if (active && !d.active) {
        token.current++;
        busy();
        audio.play("pickup", { gain: 0.5 });
      }
      const next = { ...d, active, dx, dy };
      dragRef.current = next;
      if (active) {
        setDrag(next);
        const z = zoneAt(e.clientX, e.clientY);
        setHot(z ? zoneKey(z) : null);
      }
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      setHot(null);
      if (!d?.active) return;
      suppressClick.current = e.timeStamp;
      const z = e.type === "pointerup" ? zoneAt(e.clientX, e.clientY) : null;
      if (z) dropOn(d.id, z);
      else audio.play("whoosh", { gain: 0.3 });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const dragProps = (id: string, enabled = true) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!canAct || !enabled || out(id) || e.button !== 0) return;
      const d: Drag = { id, startX: e.clientX, startY: e.clientY, active: false, dx: 0, dy: 0, rect: e.currentTarget.getBoundingClientRect() };
      dragRef.current = d;
      setDrag(d);
    },
  });
  const guard = (e: React.MouseEvent) => e.timeStamp - suppressClick.current < 80;
  const zoneProps = (z: Zone) => ({ "data-pb-zone": zoneKey(z) });
  const isHot = (z: Zone) => hot === zoneKey(z);

  // ---------------------------------------------------------------- correct: the boat sails to its dock
  const boatRef = useRef<HTMLElement | null>(null);
  const setBoat = (el: HTMLElement | null) => {
    boatRef.current = el;
  };
  const [sail, setSail] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!solved || !reading || !tried) return setSail(null);
    const b = boatRef.current?.getBoundingClientRect();
    const d = rootRef.current?.querySelector(`[data-testid="choice"][data-value="${CSS.escape(tried)}"]`)?.getBoundingClientRect();
    if (b && d) setSail({ x: d.left + d.width / 2 - (b.left + b.width / 2), y: d.top - (b.top + b.height * 0.7) });
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- render pieces
  const sailLetters = (units: readonly string[], opts: { gapAt?: number; gapFill?: string | null } = {}) => (
    <span className="pb-letters" aria-hidden="true">
      {units.map((u, i) => (
        <span key={i} className={`pb-g ${lit.includes(i) ? "is-lit" : ""} ${opts.gapAt === i ? "is-gap" : ""}`} data-i={i}>
          {opts.gapAt === i ? (opts.gapFill ?? " ") : u}
          {pop === i && keywordOf(u) && (
            <span className="pb-pop"><Picture art={keywordOf(u)!} /></span>
          )}
        </span>
      ))}
    </span>
  );

  const boatButton = (content: React.ReactNode, label: string, extra = "") => (
    <button
      ref={setBoat}
      type="button"
      className={`pb-boat ${selected === "boat" ? "is-picked" : ""} ${drag?.active && drag.id === "boat" ? "is-dragging" : ""} ${sail ? "is-sailing" : ""} ${wrongNow ? "is-wobble" : ""} ${extra}`}
      style={sail ? ({ "--sx": `${sail.x}px`, "--sy": `${sail.y}px` } as React.CSSProperties) : undefined}
      data-testid="boat"
      data-pb-idle
      aria-pressed={selected === "boat"}
      aria-label={label}
      {...dragProps("boat")}
      onClick={(e) => {
        if (guard(e) || !canAct) return;
        audio.play("pickup", { gain: 0.4 });
        setSelected((s) => (s === "boat" ? null : "boat"));
        if (e.detail === 0) focusEl('[data-testid="choice"]:not([aria-disabled="true"])');
      }}
    >
      <span className="pb-mast" aria-hidden="true" />
      <span className="pb-sail">{content}</span>
      <BoatHull />
    </button>
  );

  // ================================================================ layouts
  let top: React.ReactNode = null;
  let lower: React.ReactNode = null;
  let action: React.ReactNode = null;

  if (reading && a.kind === "choice") {
    const units = modelUnits(ex);
    let sailContent: React.ReactNode;
    let label: string;
    if (mode === "noteRead") {
      const note = noteOf(ex);
      label = `Note on the boat, word by word: ${note.words.map((w) => w.split("").join(" ")).join("; ")}; ${note.text.endsWith("?") ? "question mark" : "full stop"}.`;
      sailContent = (
        <span className="pb-note">
          {note.words.map((w, i) => (
            <span key={i} className={`pb-word ${lit.includes(i) ? "is-lit" : ""}`}>
              {isTricky(w) ? (
                <button type="button" className={`pb-tricky ${saying === `t${i}` ? "is-saying" : ""}`} data-testid="tricky" aria-label={`Hear the tricky word ${w.toLowerCase()}`} onClick={() => say(trickyLine(w), `t${i}`)}>
                  {w}
                </button>
              ) : <span aria-hidden="true">{w}</span>}
              {i === note.words.length - 1 ? note.text.slice(-1) : ""}
            </span>
          ))}
        </span>
      );
    } else {
      label = `Word on the boat: ${(target ?? "").split("").join(", ")}. Press to pick up the boat, then press a picture dock`;
      sailContent = sailLetters(units);
    }
    top = mode === "noteRead" ? (
      <div ref={setBoat} className={`pb-boat is-static is-note ${sail ? "is-sailing" : ""} ${wrongNow ? "is-wobble" : ""}`} style={sail ? ({ "--sx": `${sail.x}px`, "--sy": `${sail.y}px` } as React.CSSProperties) : undefined} data-testid="boat" data-pb-idle>
        <span className="sr-only">{label}</span>
        <span className="pb-mast" aria-hidden="true" />
        <span className="pb-sail">{sailContent}</span>
        <BoatHull />
      </div>
    ) : boatButton(sailContent, label);
    lower = (
      <div className="pb-docks" role="group" aria-label="Docks" style={{ "--n": a.options.length } as React.CSSProperties}>
        {a.options.map((o, i) => {
          const name = o.art?.startsWith("scene:") ? describeScene(o.art.slice(6)) : pictureWord(o.art ?? o.id).replace(/^(\w+)$/, "$1");
          const pic = o.art ?? o.id;
          const count = pic.endsWith(":3") ? `three ${name}` : pic.endsWith(":1") ? `one ${name}` : name;
          const z: Zone = { kind: "dock", value: o.id };
          const state = st.phase === "feedback" && tried === o.id ? (fb?.correct ? "is-right" : "is-wrong") : solved && a.correct === o.id ? "is-right" : "";
          return (
            <button
              key={o.id}
              type="button"
              className={`choice pb-dock ${state} ${out(o.id) ? "is-out" : ""} ${modelOn && a.correct === o.id ? "is-model" : ""} ${isHot(z) ? "is-hot" : ""} ${selected === "boat" && !out(o.id) ? "is-ready" : ""} ${saying === o.id ? "is-saying" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              data-testid="choice"
              data-value={o.id}
              aria-disabled={out(o.id) || !canAct}
              aria-label={out(o.id) ? `${count} dock, not this one` : `Send the boat to the ${count} dock`}
              {...zoneProps(z)}
              onFocus={() => mode !== "noteRead" && navRecent() && say(wordLine(pictureWord(pic)), o.id)}
              onClick={(e) => !guard(e) && choose(o.id)}
            >
              <span className="pb-flag"><Picture art={pic} /></span>
              <span className="pb-post" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    );
  } else if ((mode === "swap" || mode === "tag") && a.kind === "choice") {
    const right = solved ? a.correct : null;
    if (mode === "swap") {
      const from = String(ex.prompt?.vars?.from ?? "");
      const to = String(ex.prompt?.vars?.to ?? "");
      const rime = to.slice(1);
      const z: Zone = { kind: "gap", value: "0" };
      top = (
        <div className="pb-swap-top">
          <div className="pb-card" aria-hidden="true"><Picture art={from} /><span className="pb-card-word">{from}</span></div>
          <div className="pb-arrow" aria-hidden="true">→</div>
          <div className={`pb-boat is-static ${isHot(z) ? "is-hot" : ""} ${selected ? "is-ready" : ""}`} data-pb-idle {...zoneProps(z)} data-testid="gap"
            role="img" aria-label={`The sail shows a gap, then ${rime.split("").join(", ")}${right ? `. Now it says ${to}` : ""}`}>
            <span className="pb-mast" aria-hidden="true" />
            <span className="pb-sail">{sailLetters([right ?? "_", ...rime.split("")], { gapAt: 0, gapFill: right ?? (wrongNow ? tried : null) })}</span>
            <BoatHull />
            {right && <span className="pb-reveal" aria-hidden="true"><Picture art={to} /></span>}
          </div>
        </div>
      );
    } else {
      const z: Zone = { kind: "hook", value: "0" };
      top = (
        <div className={`pb-boat is-static pb-tag-boat ${isHot(z) ? "is-hot" : ""} ${selected ? "is-ready" : ""}`} data-pb-idle {...zoneProps(z)} data-testid="gap" role="img"
          aria-label={right ? `The critter wears the tag ${right.split("").join(" ")}` : "A made-up critter on the boat, waiting for its name tag"}>
          <span className="pb-critter-wrap" aria-hidden="true"><Critter hue={["#7EDFC3", "#FFB3D9", "#B5A6FF", "#FFD27A"][ex.seed % 4]} /></span>
          <span className="pb-tag-hook" aria-hidden="true">{right ?? "?"}</span>
          <BoatHull />
        </div>
      );
    }
    lower = (
      <div className={`pb-tiles ${mode === "tag" ? "is-tags" : "is-letters"}`} role="group" aria-label={mode === "tag" ? "Name tags" : "Letter tiles"}>
        {a.options.map((o) => {
          const state = st.phase === "feedback" && tried === o.id ? (fb?.correct ? "is-right" : "is-wrong") : "";
          return (
            <button
              key={o.id}
              type="button"
              className={`choice pb-tile ${mode === "tag" ? "pb-tagcard" : ""} ${state} ${out(o.id) ? "is-out" : ""} ${modelOn && a.correct === o.id ? "is-model" : ""} ${selected === o.id ? "is-picked" : ""} ${drag?.active && drag.id === o.id ? "is-dragging" : ""} ${solved && a.correct === o.id ? "is-away" : ""}`}
              data-testid="choice"
              data-value={o.id}
              aria-disabled={out(o.id) || !canAct}
              aria-label={mode === "tag" ? `Name tag ${o.text?.split("").join(" ")}` : `Letter ${o.text}, as in ${o.art}`}
              {...dragProps(o.id)}
              onFocus={() => mode === "swap" && navRecent() && o.text && say(keywordLine(o.text), o.id)}
              onClick={(e) => !guard(e) && choose(o.id)}
            >
              <span className="pb-tile-text">{o.text}</span>
              {o.art && <span className="pb-tile-pic" aria-hidden="true"><Picture art={o.art} /></span>}
            </button>
          );
        })}
      </div>
    );
  } else if (a.kind === "sequence") {
    const note = mode === "noteBuild";
    const model = Array.isArray(st.model) ? (st.model as readonly string[]) : null;
    const pic = note ? `scene:${buildNoteOf(ex).scene.who}-${buildNoteOf(ex).scene.rel}-${buildNoteOf(ex).scene.what}` : String(heard ?? ex.objectKind);
    const shown: readonly (string | null)[] = solved && Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly string[]) : wrongNow && Array.isArray(st.lastAnswer) ? Array.from({ length: slots }, (_, i) => (st.lastAnswer as readonly string[])[i] ?? null) : placed;
    top = (
      <div className={`pb-build-top ${note ? "is-note" : ""}`}>
        <button type="button" className={`pb-card pb-card-pic ${saying === "pic" ? "is-saying" : ""} ${note ? "" : "can-hear"}`} data-testid="picture"
          aria-label={note ? `Picture: ${describeScene(pic.slice(6))}` : `Picture of a ${pic}. Press to hear it`}
          onClick={() => !note && heard && say(wordLine(heard), "pic")}>
          <Picture art={pic} />
          {!note && <span className="pb-hear" aria-hidden="true"><HearIcon /></span>}
        </button>
        <div className={`pb-boat is-static ${note ? "is-note" : ""} ${solved ? "is-sailing-off" : ""}`} data-pb-idle>
          <span className="pb-mast" aria-hidden="true" />
          <span className="pb-sail">
            <ol className="pb-slots" aria-label={note ? "Your note" : "Your word"} style={{ "--n": slots } as React.CSSProperties}>
              {Array.from({ length: slots }, (_, i) => {
                const id = shown[i] ?? null;
                const ok = st.attempts > 0 && canAct && id && st.check?.parts?.[String(i)] === true;
                const bad = wrongNow && st.check?.parts?.[String(i)] === false;
                const ghost = model && alongIndex >= i && !id ? model[i] : undefined;
                const z: Zone = { kind: "slot", value: String(i) };
                return (
                  <li key={i} className={`pb-slot ${ok || solved ? "is-ok" : ""} ${bad ? "is-wrong" : ""} ${isHot(z) ? "is-hot" : ""} ${selected && !id ? "is-ready" : ""} ${quietE && i === slots - 1 ? "is-quiet" : ""}`}>
                    <button
                      type="button"
                      className="pb-slot-btn"
                      data-testid="slot"
                      data-slot={i}
                      data-filled={id ? "true" : "false"}
                      aria-label={id ? `${markName(pieceText(id))}, place ${i + 1}. Press to take it back` : selected ? `Empty place ${i + 1}. Press to put ${markName(pieceText(selected))} here` : `Empty place ${i + 1}`}
                      {...zoneProps(z)}
                      onClick={(e) => {
                        if (guard(e)) return;
                        if (id) return unplace(i);
                        if (selected) placeTile(selected, i);
                      }}
                    >
                      {id ? <span className="pb-slot-text">{pieceText(id)}</span> : ghost ? <span className="pb-ghost" aria-hidden="true">{pieceText(ghost)}</span> : <span className="pb-empty" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </span>
          <BoatHull />
        </div>
      </div>
    );
    const nextModel = model && canAct ? model[placed.indexOf(null)] : undefined;
    lower = (
      <div className={`pb-tiles ${note || mode === "compound" ? "is-cards" : "is-letters"}`} role="group" aria-label={note || mode === "compound" ? "Word cards" : "Letter tiles"} style={{ "--n": pieces.length } as React.CSSProperties}>
        {pieces.map((p) => {
          const inSlot = placed.includes(p.id) || (solved && (shown as readonly (string | null)[]).includes(p.id));
          const disabled = out(p.id) || !canAct || filled === slots;
          return (
            <button
              key={p.id}
              type="button"
              className={`choice pb-tile ${note || mode === "compound" ? "pb-wordcard" : ""} ${out(p.id) ? "is-out" : ""} ${nextModel === p.id ? "is-model" : ""} ${selected === p.id ? "is-picked" : ""} ${inSlot ? "is-away" : ""} ${drag?.active && drag.id === p.id ? "is-dragging" : ""}`}
              data-testid="choice"
              data-value={p.id}
              data-text={p.text}
              aria-disabled={disabled || inSlot}
              aria-label={`${note || mode === "compound" ? "Card" : "Tile"} ${markName(p.text ?? p.id)}. Press to put it on the sail`}
              tabIndex={inSlot ? -1 : undefined}
              {...dragProps(p.id, !inSlot)}
              onClick={(e) => {
                if (guard(e) || disabled || inSlot) return;
                placeTile(p.id);
              }}
            >
              <span className="pb-tile-text">{p.text}</span>
            </button>
          );
        })}
      </div>
    );
    action = (
      <button type="button" className={`done-btn pb-send ${solved ? "is-right" : modelOn && filled === slots ? "is-model" : ""}`} data-testid="done" aria-label="Send the boat" aria-disabled={!canSend} onClick={send}>
        <SendIcon /><span>Send</span>
      </button>
    );
  } else if (a.kind === "match") {
    const shownSort = solved && st.lastAnswer && typeof st.lastAnswer === "object" && !Array.isArray(st.lastAnswer) ? (st.lastAnswer as Record<string, string>) : sorted;
    const card = (it: AnswerOption, docked: boolean) => {
      const ok = st.attempts > 0 && docked && st.check?.parts?.[it.id] === true;
      return (
        <button
          key={it.id}
          type="button"
          className={`choice pb-mini ${selected === it.id ? "is-picked" : ""} ${ok || (solved && docked) ? "is-ok" : ""} ${modelOn && docked ? "is-model" : ""} ${drag?.active && drag.id === it.id ? "is-dragging" : ""} ${saying === it.id ? "is-saying" : ""}`}
          data-testid={docked ? "docked" : "choice"}
          data-value={it.id}
          aria-disabled={!canAct}
          aria-pressed={docked ? undefined : selected === it.id}
          aria-label={docked ? `${it.text} boat at the ${bins.find((b) => b.id === shownSort[it.id])?.text} dock. Press to take it back` : `${it.text} boat. Press to pick it up, then press a dock`}
          {...(docked ? {} : dragProps(it.id))}
          onClick={(e) => {
            if (guard(e) || !canAct) return;
            if (docked) return unsort(it.id);
            audio.play("pickup", { gain: 0.4 });
            setSelected((s) => (s === it.id ? null : it.id));
            say(wordLine(it.id), it.id);
            if (e.detail === 0) focusEl('[data-testid="dock"]');
          }}
        >
          <span className="pb-mini-pic" aria-hidden="true"><Picture art={it.art ?? it.id} /></span>
          <span className="pb-mini-word">{it.text}</span>
        </button>
      );
    };
    top = (
      <div className="pb-fleet" role="group" aria-label="Boats to sort" data-pb-idle>
        {items.filter((it) => !shownSort[it.id]).map((it) => card(it, false))}
        {items.every((it) => shownSort[it.id]) && <span className="pb-fleet-empty" aria-hidden="true" />}
      </div>
    );
    lower = (
      <div className="pb-sortdocks">
        {bins.map((b) => {
          const z: Zone = { kind: "sort", value: b.id };
          const here = items.filter((it) => shownSort[it.id] === b.id);
          return (
            <div key={b.id} className={`pb-sortdock ${isHot(z) ? "is-hot" : ""} ${selected ? "is-ready" : ""}`}>
              <button type="button" className="pb-sortdock-btn" data-testid="dock" data-value={b.id} {...zoneProps(z)}
                aria-label={selected ? `${b.text} dock. Press to send the ${selected} boat here` : `${b.text} dock`}
                onClick={(e) => !guard(e) && selected && sortTo(selected, b.id)}>
                <span className="pb-sortdock-label">{b.text}</span>
              </button>
              <div className="pb-sortdock-boats">{here.map((it) => card(it, true))}</div>
            </div>
          );
        })}
      </div>
    );
    action = (
      <button type="button" className={`done-btn pb-send ${solved ? "is-right" : modelOn ? "is-model" : ""}`} data-testid="done" aria-label="Send the boats" aria-disabled={!canAct || Object.keys(sorted).length !== items.length} onClick={sendSort}>
        <SendIcon /><span>Send</span>
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`pb-stage mode-${mode} ${solved ? "is-solved" : ""} ${alongIndex >= 0 ? "is-teaching" : ""} ${reducedMotion ? "still" : ""}`}
      data-testid="pb-board"
      data-mode={mode}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="pb-top">{top}</div>
      <div className="pb-lower">
        {lower}
        {action}
      </div>
      {drag?.active &&
        createPortal(
          <div className="pb-ghost-drag" aria-hidden="true" style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, height: drag.rect.height, transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-4deg) scale(1.06)` }}>
            {drag.id === "boat" ? <span className="pb-ghost-boat"><BoatHull /></span> : <span className="pb-ghost-tile">{a.kind === "sequence" ? pieceText(drag.id) : a.kind === "choice" ? (a.options.find((o) => o.id === drag.id)?.text ?? "") : drag.id}</span>}
          </div>,
          document.body,
        )}
    </div>
  );
}

function HearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" />
      <path d="M16 9 Q18.5 12 16 15 M18.5 6.5 Q23 12 18.5 17.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <path d="M6 30 L42 30 L34 42 L14 42 Z" fill="#fff" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M24 6 L24 30 M26 8 L40 26 L26 26 Z" fill="#fff" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The answers live on the board, so the shared tray is empty (and collapsed by CSS). */
export function BoatTray(_p: BoardProps) {
  return <div className="pb-tray" aria-hidden="true" />;
}
