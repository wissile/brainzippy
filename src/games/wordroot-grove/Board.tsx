import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { AnswerOption } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import { LeafShape, OwnerIcons, OwnerPicture } from "./art";
import {
  CLASS_JOB, ROOT_OF, type Seg, affixWordOf, chainOf, familyOf, fitOf, frameFor, gapOf, modeOf, ownerOf, passageLine,
  passageOf, rootContextOf, rootWordOf, segments, sentenceLine, spellLine, stretchOf, tileMeaning, wordForOf, wordLine,
} from "./logic";
import type { Tag, WordClass } from "./morphology";
import { ROOT } from "./roots";
import "./wordroot-grove.css";

/**
 * Wordroot Grove board (skin.Board). A big leaf at the top holds what the child reads (a word, a meaning, a sentence,
 * a passage or a picture); the answers sit below as leaves, word-part tiles, branches or a Grow button. Every move
 * works three ways (D-022): tap (or tap-tap: a card, then a branch), drag, and keyboard (Tab + Enter/Space;
 * Backspace takes the last part back). Text-led for ages 9–11, with voice on demand: the speaker on the leaf reads
 * its text aloud.
 *   choice  tap a leaf (or drag it onto the big leaf)               meaning · fit · family · roots · clues · apostrophes
 *   sequence  put part tiles on the branch in order, then Grow      build · build2
 *   match   sort cards onto branches, then Grow                     sort (word class) · rootmatch
 *   set     tap the clue chunks in the passage, then Grow           clueTap
 * First miss: Gloop's line (runner) + a strategy on the board: the word stretches into parts with meaning cards, tiles
 * show their meanings, the clue is lit and its type named, owners are counted, or a test card appears. Second miss:
 * the worked chain appears step by step (runner count-along) and the right answer pulses (is-model) for the child to
 * complete. Nothing is timed and nothing is taken away.
 */
type Zone = { kind: "leaf" | "slot" | "bin"; value: string };
interface Drag { id: string; startX: number; startY: number; active: boolean; dx: number; dy: number; rect: DOMRect; label: string }

const RULE_CHIP: Partial<Record<Tag, string>> = {
  there: "there = a place, or there is", their: "their = belongs to them", theyre: "they're = they are",
  to: "to = toward", too: "too = also, or more than enough", two: "two = 2",
  your: "your = belongs to you", youre: "you're = you are",
  "its-possessive": "its = belongs to it · it's = it is", "its-contraction": "its = belongs to it · it's = it is",
  than: "than compares · then = next", then: "than compares · then = next",
  "no-apostrophe": "just more than one → no apostrophe", irregular: "plural without s → add 's (children's)",
  contraction: "the apostrophe replaces missing letters (cannot → can't)", "plural-owner": "one owner → 's · more than one → s'",
  "singular-owner": "one owner → 's · more than one → s'",
};
const CLUE_NAME: Readonly<Record<string, string>> = {
  definition: "Definition clue: the words right after it (or after is / which is) explain it",
  synonym: "Synonym clue: or gives another name",
  example: "Example clue: such as / like give examples",
  restatement: "Restatement clue: in other words / that is / which means",
  cause: "Cause and effect clue: because / so",
  contrast: "Contrast clue: but / unlike / although / however / while",
  multi: "Clues in other sentences: what do they show?",
};
const ENDINGS: Readonly<Record<WordClass, string>> = { noun: "-ness  -ment", verb: "-en", adjective: "-ful  -less  -able", adverb: "-ly (usually)" };

export function GroveBoard({ st, act, alongIndex, busy: busyProp }: BoardProps) {
  const busy = () => busyProp?.();
  const ex = st.exercise;
  const a = ex.answer;
  const mode = modeOf(ex);
  const { reducedMotion } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const stRef = useRef(st);
  stRef.current = st;

  const canAct = st.phase === "answering";
  const fb = st.feedback;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const wrongNow = st.phase === "feedback" && fb?.correct === false;
  const out = (id: string) => st.eliminated.includes(id);
  const hinted = st.hintStage >= 1;
  const modelOn = st.hintStage === 2 && canAct;
  const tried = typeof st.lastAnswer === "string" ? st.lastAnswer : null;

  const [selected, setSelected] = useState<string | null>(null);
  const [saying, setSaying] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(-Infinity);
  const lastKeyboard = useRef(false);
  const zoneKey = (z: Zone) => `${z.kind}:${z.value}`;

  // sequence (build)
  const slots = a.kind === "sequence" ? a.order.length : 0;
  const pieces: readonly AnswerOption[] = a.kind === "sequence" ? a.pieces : [];
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: slots }, () => null));
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const pieceText = (id: string) => pieces.find((p) => p.id === id)?.text ?? id;
  const filled = placed.filter(Boolean).length;
  // match (sort)
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const items = a.kind === "match" ? a.items : [];
  const bins = a.kind === "match" ? a.targets : [];
  // set (clue tapping)
  const [picked, setPicked] = useState<string[]>([]);

  // ---------------------------------------------------------------- speech on demand
  const token = useRef(0);
  const say = async (lines: string[], key: string) => {
    const my = ++token.current;
    setSaying(key);
    busy();
    for (const l of lines) {
      if (my !== token.current) return;
      await audio.speak(l);
    }
    if (my === token.current) setSaying(null);
  };
  useEffect(() => () => {
    token.current++;
  }, []);

  // ---------------------------------------------------------------- focus (keyboard users only)
  const focusTimer = useRef(0);
  const focusLater = (fn: () => void, ms = 40) => {
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(fn, ms);
  };
  const focusSel = (sel: string) =>
    focusLater(() => {
      const ae = document.activeElement as HTMLElement | null;
      // only rescue focus from an element that just went away or got disabled (or <body>); never steal it
      if (ae && ae !== document.body && rootRef.current?.contains(ae) && ae.getAttribute("aria-disabled") !== "true" && !ae.classList.contains("is-away")) {
        if (!ae.matches('[data-testid="choice"], [data-testid="dock"], [data-testid="docked"]')) return;
      }
      (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key.startsWith("Arrow") || e.key === "Backspace") lastKeyboard.current = true;
      if (stRef.current.phase !== "answering" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (a.kind === "sequence" && e.key === "Backspace") {
        const p = placedRef.current;
        for (let i = p.length - 1; i >= 0; i--) if (p[i]) return unplace(i);
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

  // ---------------------------------------------------------------- after a miss
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    setSelected(null);
    const parts = st.check?.parts ?? {};
    if (a.kind === "sequence") {
      const last = Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly (string | null)[]) : [];
      setPlaced(Array.from({ length: slots }, (_, i) => (parts[String(i)] === true && last[i] ? last[i]! : null)));
    }
    if (a.kind === "match") {
      if (st.hintStage === 2 && st.model && typeof st.model === "object" && !Array.isArray(st.model)) {
        // the model places every card but the last; the child places that one (errorless, docs §4)
        const m = st.model as Record<string, string>;
        const last = items[items.length - 1]?.id;
        setSorted(Object.fromEntries(Object.entries(m).filter(([k]) => k !== last)));
      }
      else setSorted((s) => Object.fromEntries(Object.entries(s).filter(([k]) => parts[k] === true)));
    }
    if (a.kind === "set") setPicked((p) => p.filter((id) => parts[id] === true && !st.eliminated.includes(id)));
    if (lastKeyboard.current) focusSel('[data-testid="choice"]:not([aria-disabled="true"])');
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- actions
  const submit = (value: string | string[] | Record<string, string>) => {
    token.current++;
    setSaying(null);
    setSelected(null);
    act({ type: "SUBMIT", value });
  };
  const choose = (id: string) => {
    if (!canAct || out(id) || a.kind !== "choice") return;
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
    if (lastKeyboard.current) {
      if (next.every(Boolean)) focusSel('[data-testid="done"]');
      else focusLater(() => {
        const all = [...(rootRef.current?.querySelectorAll<HTMLElement>('.wg-tiles [data-testid="choice"]') ?? [])];
        const at2 = all.findIndex((el) => el.dataset.value === id);
        const free = (el: HTMLElement) => !el.classList.contains("is-away") && el.getAttribute("aria-disabled") !== "true";
        const nxt = [...all.slice(at2 + 1), ...all.slice(0, Math.max(0, at2))].find(free);
        const ae = document.activeElement as HTMLElement | null;
        if (ae && ae !== document.body && ae.dataset.value !== id) return;
        nxt?.focus({ preventScroll: true });
      });
    }
  };
  const unplace = (i: number) => {
    if (!canAct) return;
    if (!placedRef.current[i]) return;
    busy();
    audio.play("pickup", { gain: 0.4 });
    setPlaced((p) => p.map((x, k) => (k === i ? null : x)));
  };
  const grow = () => {
    if (!canAct) return;
    if (a.kind === "sequence" && filled === slots) submit(placedRef.current.filter((x): x is string => !!x));
    if (a.kind === "match" && Object.keys(sorted).length === items.length) submit(sorted);
    if (a.kind === "set" && picked.length > 0) submit(picked);
  };
  const sortTo = (item: string, bin: string) => {
    if (!canAct) return;
    busy();
    const next = { ...sorted, [item]: bin };
    setSorted(next);
    setSelected(null);
    audio.play("drop", { gain: 0.6 });
    if (lastKeyboard.current) focusSel(Object.keys(next).length === items.length ? '[data-testid="done"]' : '.wg-cards [data-testid="choice"]');
  };
  const unsort = (item: string) => {
    if (!canAct) return;
    busy();
    audio.play("pickup", { gain: 0.4 });
    setSorted((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== item)));
    if (lastKeyboard.current) focusSel(`.wg-cards [data-testid="choice"][data-value="${CSS.escape(item)}"]`);
  };
  const toggleChunk = (id: string) => {
    if (!canAct || out(id)) return;
    busy();
    audio.play(picked.includes(id) ? "pickup" : "drop", { gain: 0.45 });
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const dropOn = (id: string, z: Zone) => {
    if (!canAct) return;
    if (z.kind === "leaf" && a.kind === "choice") return choose(id);
    if (z.kind === "slot") return placeTile(id, Number(z.value));
    if (z.kind === "bin") return sortTo(id, z.value);
  };

  // ---------------------------------------------------------------- drag
  const zoneAt = (x: number, y: number): Zone | null => {
    let best: { z: Zone; d: number } | null = null;
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>("[data-wg-zone]") ?? []) {
      const r = el.getBoundingClientRect();
      const m = 18;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      const [kind, value] = el.dataset.wgZone!.split(":") as [Zone["kind"], string];
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
  const dragProps = (id: string, label: string, enabled = true) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!canAct || !enabled || out(id) || e.button !== 0) return;
      const d: Drag = { id, label, startX: e.clientX, startY: e.clientY, active: false, dx: 0, dy: 0, rect: e.currentTarget.getBoundingClientRect() };
      dragRef.current = d;
      setDrag(d);
    },
  });
  const guard = (e: React.MouseEvent) => e.timeStamp - suppressClick.current < 80;
  const zoneProps = (z: Zone) => ({ "data-wg-zone": zoneKey(z) });
  const isHot = (z: Zone) => hot === zoneKey(z);
  const dragging = (id: string) => drag?.active && drag.id === id;

  // ---------------------------------------------------------------- shared pieces
  const chain = chainOf(ex);
  const chainShown = st.hintStage === 2 && chain.length > 0 && (alongIndex >= 0 || canAct || solved);
  const chainUpTo = alongIndex >= 0 ? alongIndex : chain.length - 1;
  const rightText = a.kind === "choice" ? (a.options.find((o) => o.id === a.correct)?.text ?? "") : "";
  const gapFill = solved && a.kind === "choice" ? rightText : wrongNow && tried && a.kind === "choice" ? (a.options.find((o) => o.id === tried)?.text ?? "") : null;

  const hearBtn = (lines: string[], key = "leaf") => (
    <button type="button" className={`wg-hear ${saying === key ? "is-saying" : ""}`} data-testid="hear" aria-label="Read it to me" onClick={() => void say(lines, key)}>
      <HearIcon />
    </button>
  );
  const sentence = (segs: Seg[], opts: { highlight?: string } = {}) => (
    <p className="wg-sentence">
      {segs.map((s, i) =>
        s.gap ? (
          <span key={i} className={`wg-gap ${gapFill ? (solved ? "is-right" : "is-wrong") : ""}`} data-testid="gap">{gapFill ?? " "}</span>
        ) : s.bold ? (
          <b key={i} className="wg-bold">{opts.highlight ? markRoot(s.text, opts.highlight) : s.text}</b>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </p>
  );
  const ruleChip = (text: string | undefined) => (text ? <p className="wg-rule" data-testid="rule">{text}</p> : null);
  const chainEl = chainShown ? (
    <ol className="wg-chain" data-testid="model-chain" aria-label="Worked example" aria-live="polite">
      {chain.map((c, i) => (
        <li key={i} className={i <= chainUpTo ? "is-on" : ""} aria-hidden={i > chainUpTo}>{c}</li>
      ))}
    </ol>
  ) : null;

  // ================================================================ layouts
  let top: React.ReactNode = null;
  let lower: React.ReactNode = null;
  let action: React.ReactNode = null;
  let leafLabel = "";
  let leafBody: React.ReactNode = null;
  let hear: React.ReactNode = null;
  let leafIsZone = a.kind === "choice";

  if (mode === "meaning" || mode === "rootmeaning") {
    const word = mode === "meaning" ? affixWordOf(ex).word : rootWordOf(ex).word;
    const stretch = stretchOf(ex);
    leafLabel = "Word";
    hear = hearBtn([wordLine(word)]);
    leafBody = (
      <>
        {hinted && stretch ? (
          <div className={`wg-stretch ${reducedMotion ? "is-still" : ""}`} data-testid="parts" aria-label={`${word} in parts: ${stretch.parts.map((p) => (p.meaning ? `${p.text}, ${p.meaning}` : p.text)).join("; ")}`}>
            {stretch.parts.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="wg-goo" aria-hidden="true" />}
                {p.line ? (
                  <button type="button" className="wg-part" onClick={() => void say([p.line!], `part${i}`)} aria-label={`Hear: ${p.text} means ${p.meaning}`}>
                    <span className="wg-part-text">{p.text}</span>
                    <span className="wg-part-mean">{p.meaning}</span>
                  </button>
                ) : (
                  <span className="wg-part is-base"><span className="wg-part-text">{p.text}</span></span>
                )}
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="wg-word" data-testid="word">{word}</p>
        )}
      </>
    );
  } else if (mode === "build" || mode === "build2") {
    const gloss = mode === "build" ? affixWordOf(ex).gloss : (ex.prompt?.vars?.gloss as string);
    const model = Array.isArray(st.model) ? (st.model as readonly string[]) : null;
    const shown: readonly (string | null)[] = solved && Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly string[]) : wrongNow && Array.isArray(st.lastAnswer) ? Array.from({ length: slots }, (_, i) => (st.lastAnswer as readonly string[])[i] ?? null) : placed;
    leafLabel = "Meaning";
    leafIsZone = false;
    leafBody = (
      <>
        <p className="wg-gloss" data-testid="gloss">“{gloss}”</p>
        <ol className={`wg-branch ${solved ? "is-grown" : ""}`} aria-label="Your word" style={{ "--n": slots } as React.CSSProperties}>
          {Array.from({ length: slots }, (_, i) => {
            const id = shown[i] ?? null;
            const ok = st.attempts > 0 && canAct && id && st.check?.parts?.[String(i)] === true;
            const bad = wrongNow && st.check?.parts?.[String(i)] === false;
            const ghost = model && (alongIndex >= i || (alongIndex < 0 && canAct)) && !id ? model[i] : undefined;
            const z: Zone = { kind: "slot", value: String(i) };
            return (
              <li key={i} className={`wg-slot ${ok || solved ? "is-ok" : ""} ${bad ? "is-wrong" : ""} ${isHot(z) ? "is-hot" : ""} ${selected && !id ? "is-ready" : ""}`}>
                <button
                  type="button"
                  className="wg-slot-btn"
                  data-testid="slot"
                  data-slot={i}
                  data-filled={id ? "true" : "false"}
                  aria-label={id ? `${pieceText(id)}, part ${i + 1}. Press to take it back` : selected ? `Empty place ${i + 1}. Press to put ${pieceText(selected)} here` : `Empty place ${i + 1}`}
                  {...zoneProps(z)}
                  onClick={(e) => {
                    if (guard(e)) return;
                    if (id) return unplace(i);
                    if (selected) placeTile(selected, i);
                  }}
                >
                  {id ? <span className="wg-slot-text">{pieceText(id)}</span> : ghost ? <span className="wg-ghost" aria-hidden="true">{pieceText(ghost)}</span> : <span className="wg-empty" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ol>
        {solved && <p className="wg-built" aria-live="polite">{(Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[]) : []).map(pieceText).join("")}</p>}
      </>
    );
    const nextModel = model && canAct ? model[placed.indexOf(null)] : undefined;
    lower = (
      <div className="wg-tiles" role="group" aria-label="Word parts">
        {pieces.map((p) => {
          const inSlot = placed.includes(p.id) || (solved && shown.includes(p.id));
          const disabled = out(p.id) || !canAct || filled === slots;
          const meaning = hinted ? tileMeaning(p.text ?? "") : undefined;
          return (
            <button
              key={p.id}
              type="button"
              className={`wg-tile ${out(p.id) ? "is-out" : ""} ${nextModel === p.id ? "is-model" : ""} ${selected === p.id ? "is-picked" : ""} ${inSlot ? "is-away" : ""} ${dragging(p.id) ? "is-dragging" : ""}`}
              data-testid="choice"
              data-value={p.id}
              data-text={p.text}
              aria-disabled={disabled || inSlot}
              aria-label={`Part ${p.text}${meaning ? `, ${meaning}` : ""}${nextModel === p.id ? ", the next part" : ""}. Press to put it on the branch`}
              tabIndex={inSlot ? -1 : undefined}
              {...dragProps(p.id, p.text ?? "", !inSlot)}
              onClick={(e) => {
                if (guard(e) || disabled || inSlot) return;
                placeTile(p.id);
              }}
            >
              <span className="wg-tile-text">{p.text}</span>
              {meaning && <span className="wg-tile-mean" aria-hidden="true">{meaning}</span>}
            </button>
          );
        })}
      </div>
    );
    action = growButton(canAct && filled === slots, solved, modelOn && filled === slots, grow, "Grow the word");
  } else if (a.kind === "match") {
    const shownSort = solved && st.lastAnswer && typeof st.lastAnswer === "object" && !Array.isArray(st.lastAnswer) ? (st.lastAnswer as Record<string, string>) : sorted;
    const isSort = mode === "sort";
    const textOf = (id: string) => items.find((i) => i.id === id)?.text ?? id;
    const modelPairs = modelOn && st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
    const modelLeft = modelPairs ? items.find((it) => !sorted[it.id]) : undefined;
    const modelTarget = modelLeft && modelPairs ? modelPairs[modelLeft.id] : undefined;
    const card = (it: AnswerOption, docked: boolean) => {
      const ok = st.attempts > 0 && docked && st.check?.parts?.[it.id] === true;
      return (
        <button
          key={it.id}
          type="button"
          className={`wg-card ${selected === it.id ? "is-picked" : ""} ${ok || (solved && docked) ? "is-ok" : ""} ${modelOn && !docked ? "is-model" : ""} ${dragging(it.id) ? "is-dragging" : ""}`}
          data-testid={docked ? "docked" : "choice"}
          data-value={it.id}
          aria-disabled={!canAct}
          aria-pressed={docked ? undefined : selected === it.id}
          aria-label={docked ? `${it.text}, on the ${bins.find((b) => b.id === shownSort[it.id])?.text} branch. Press to take it back` : `${it.text}${modelPairs?.[it.id] ? `, goes on the ${bins.find((b) => b.id === modelPairs[it.id])?.text} branch` : ""}. Press to pick it up, then press a branch`}
          {...(docked ? {} : dragProps(it.id, it.text ?? it.id))}
          onClick={(e) => {
            if (guard(e) || !canAct) return;
            if (docked) return unsort(it.id);
            audio.play("pickup", { gain: 0.4 });
            setSelected((s) => (s === it.id ? null : it.id));
            if (e.detail === 0 || lastKeyboard.current) focusLater(() => (rootRef.current?.querySelector('[data-testid="dock"]') as HTMLElement | null)?.focus({ preventScroll: true }), 30);
          }}
        >
          <span className="wg-card-leaf" aria-hidden="true"><svg viewBox="0 0 100 100"><LeafShape vein={false} /></svg></span>
          <span className="wg-card-text">{it.text}</span>
        </button>
      );
    };
    leafIsZone = false;
    top = (
      <div className="wg-cards" role="group" aria-label={isSort ? "Words to sort" : "Roots to match"} data-wg-idle>
        {items.filter((it) => !shownSort[it.id]).map((it) => card(it, false))}
        {items.every((it) => shownSort[it.id]) && <span className="wg-cards-empty" aria-hidden="true">{solved ? "" : "All placed. Press Grow."}</span>}
      </div>
    );
    lower = (
      <div className={`wg-bins ${isSort ? "is-sort" : "is-roots"}`}>
        {bins.map((b) => {
          const z: Zone = { kind: "bin", value: b.id };
          const here = items.filter((it) => shownSort[it.id] === b.id);
          return (
            <div key={b.id} className={`wg-bin ${isHot(z) ? "is-hot" : ""} ${selected ? "is-ready" : ""} ${modelTarget === b.id ? "is-model" : ""}`}>
              <button type="button" className="wg-bin-btn" data-testid="dock" data-value={b.id} {...zoneProps(z)}
                aria-label={selected ? `${b.text} branch. Press to put ${textOf(selected)} here` : `${b.text} branch`}
                onClick={(e) => {
                  if (guard(e) || !selected) return;
                  sortTo(selected, b.id);
                }}>
                <span className="wg-bin-label">{b.text}</span>
                {isSort && hinted && <span className="wg-bin-hint" aria-hidden="true">{ENDINGS[b.id as WordClass]}</span>}
              </button>
              <div className="wg-bin-cards">
                {here.map((it) => (
                  <Fragment key={it.id}>
                    {card(it, true)}
                    {isSort && st.hintStage === 2 && <span className="wg-frame" aria-hidden="true">{frameFor(b.id as WordClass, it.text ?? it.id)}</span>}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
    action = growButton(canAct && Object.keys(sorted).length === items.length, solved, modelOn && Object.keys(sorted).length === items.length, grow, isSort ? "Grow: check the sorting" : "Grow: check the matching");
  } else if (mode === "clueTap" && a.kind === "set") {
    const x = passageOf(ex);
    const model = Array.isArray(st.model) ? (st.model as readonly string[]) : [];
    const shownPicked = solved && Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[]) : picked;
    leafLabel = x.clues.length === 2 ? "Passage: tap both clues" : "Passage: tap the clue";
    leafIsZone = false;
    hear = hearBtn([passageLine(x.word), spellLine(x.word)]);
    leafBody = (
      <p className="wg-passage is-tappable" role="group" aria-label="Passage parts">
        {a.options.map((o, i) => {
          const on = shownPicked.includes(o.id);
          const right = (solved || (st.attempts > 0 && canAct)) && on && (solved || st.check?.parts?.[o.id] === true);
          const segs = segments(x.chunks[i]!);
          return (
            <Fragment key={o.id}>
              <button
                type="button"
                className={`wg-chunk ${on ? "is-on" : ""} ${right ? "is-right" : ""} ${out(o.id) ? "is-out" : ""} ${modelOn && model.includes(o.id) && !on ? "is-model" : ""} ${wrongNow && on && st.check?.parts?.[o.id] === false ? "is-wrong" : ""}`}
                data-testid="choice"
                data-value={o.id}
                aria-pressed={on}
                aria-disabled={out(o.id) || !canAct}
                aria-label={`${o.text}${out(o.id) ? " (not a clue)" : modelOn && model.includes(o.id) ? ", a clue" : ""}`}
                onClick={(e) => !guard(e) && toggleChunk(o.id)}
              >
                {segs.map((s, k) => (s.bold ? <b key={k} className="wg-bold">{s.text}</b> : <Fragment key={k}>{s.text}</Fragment>))}
              </button>{" "}
            </Fragment>
          );
        })}
      </p>
    );
    lower = (
      <div className="wg-tapinfo">
        <p className="wg-count" aria-live="polite">{x.clues.length === 2 ? `Clues tapped: ${picked.length} (find 2)` : `Clues tapped: ${picked.length} (find 1)`}</p>
        {hinted && <p className="wg-rule" data-testid="rule">{CLUE_NAME[x.type]}</p>}
      </div>
    );
    action = growButton(canAct && picked.length > 0, solved, modelOn && model.every((m) => picked.includes(m)), grow, "Grow: check the clues");
  } else if (a.kind === "choice") {
    // the reading side of every choice mode
    switch (mode) {
      case "fit": {
        const f = fitOf(ex);
        leafLabel = "Sentence";
        hear = hearBtn([sentenceLine("fit", f.id)]);
        leafBody = <>{sentence(segments(f.text))}{hinted && ruleChip(`The gap ${CLASS_JOB[f.cls]}.`)}</>;
        break;
      }
      case "family": {
        const f = familyOf(ex);
        leafLabel = "A word you know";
        hear = hearBtn([sentenceLine("family", f.id)]);
        leafBody = (
          <>
            <p className="wg-known"><b className="wg-bold">{f.known}</b> means “{f.knownMeaning}”.</p>
            <p className="wg-word is-mid" data-testid="word">{hinted ? markRoot(f.target, f.root) : f.target}</p>
          </>
        );
        break;
      }
      case "wordfor": {
        const w = wordForOf(ex);
        leafLabel = "Meaning";
        leafBody = <p className="wg-gloss">“{w.meaning}”</p>;
        break;
      }
      case "rootcontext": {
        const r = rootContextOf(ex);
        const root = ROOT[r.root]!;
        leafLabel = "Sentence";
        hear = hearBtn([sentenceLine("rootcontext", r.id)]);
        leafBody = (
          <>
            {sentence(segments(r.text), { highlight: hinted ? (r.root === "scrib" ? "scri" : r.root) : undefined })}
            <p className="wg-root-note"><span className="wg-root-chip">{root.label}</span> means “{root.meaning}”.</p>
            <p className="wg-ask">{r.ask}</p>
          </>
        );
        break;
      }
      case "clueMeaning": {
        const x = passageOf(ex);
        leafLabel = "Passage";
        hear = hearBtn([passageLine(x.word), spellLine(x.word)]);
        leafBody = (
          <>
            <p className="wg-passage">
              {x.chunks.map((c, i) => (
                <Fragment key={i}>
                  <span className={`wg-chunk-text ${hinted && x.clues.includes(i) ? "is-clue" : ""}`} data-testid={hinted && x.clues.includes(i) ? "clue-hl" : undefined}>
                    {segments(c).map((s, k) => (s.bold ? <b key={k} className="wg-bold">{s.text}</b> : <Fragment key={k}>{s.text}</Fragment>))}
                  </span>{" "}
                </Fragment>
              ))}
            </p>
            {hinted && ruleChip(CLUE_NAME[x.type])}
          </>
        );
        break;
      }
      case "owner": {
        const o = ownerOf(ex);
        const many = ex.params?.v === 1;
        leafLabel = "Picture";
        leafBody = (
          <div className="wg-owner">
            <OwnerPicture owner={o.owner} thing={o.thing} many={many} />
            {hinted && (
              <p className="wg-rule" data-testid="rule">
                <OwnerIcons owner={o.owner} many={many} /> {many ? "3 owners" : "1 owner"}: {many ? "s'" : "'s"}
              </p>
            )}
          </div>
        );
        break;
      }
      default: {
        const g = gapOf(ex);
        leafLabel = "Sentence";
        hear = hearBtn([sentenceLine(mode === "confused" ? "confused" : "apostrophe", g.id)]);
        leafBody = <>{sentence(segments(g.text))}{hinted && ruleChip(RULE_CHIP[g.kind])}</>;
      }
    }
  }

  // the answer leaves of every choice mode
  if (a.kind === "choice") {
    const roots = mode === "wordfor" && hinted;
    lower = (
      <div className={`wg-options ${a.options.some((o) => (o.text ?? "").length > 22) ? "is-long" : ""}`} role="group" aria-label="Answers" style={{ "--n": a.options.length } as React.CSSProperties}>
        {a.options.map((o) => {
          const state = st.phase === "feedback" && tried === o.id ? (fb?.correct ? "is-right" : "is-wrong") : solved && a.correct === o.id ? "is-right" : "";
          const r = roots ? ROOT_OF[o.text ?? ""] : undefined;
          return (
            <button
              key={o.id}
              type="button"
              className={`wg-option ${state} ${out(o.id) ? "is-out" : ""} ${modelOn && a.correct === o.id ? "is-model" : ""} ${dragging(o.id) ? "is-dragging" : ""}`}
              data-testid="choice"
              data-value={o.id}
              aria-disabled={out(o.id) || !canAct}
              aria-label={out(o.id) ? `${o.text}: not this one` : `Choose: ${o.text}${modelOn && a.correct === o.id ? ", the answer" : ""}`}
              {...dragProps(o.id, o.text ?? "")}
              onClick={(e) => !guard(e) && choose(o.id)}
            >
              <span className="wg-option-leaf" aria-hidden="true"><svg viewBox="0 0 100 100"><LeafShape vein={false} /></svg></span>
              <span className="wg-option-text">{r ? markRoot(o.text ?? "", r === "scrib" ? "scri" : r) : o.text}</span>
              {r && <span className="wg-option-root" aria-hidden="true">{ROOT[r]!.label} = {ROOT[r]!.meaning}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (!top) {
    const z: Zone = { kind: "leaf", value: "0" };
    top = (
      <div className={`wg-leaf ${solved ? "is-solved" : ""} ${wrongNow ? "is-wobble" : ""} ${leafIsZone && isHot(z) ? "is-hot" : ""}`} data-testid="leaf" data-wg-idle {...(leafIsZone ? zoneProps(z) : {})}>
        <div className="wg-leaf-head">
          <span className="wg-leaf-label">{leafLabel}</span>
          {hear}
        </div>
        <div className="wg-leaf-body">{leafBody}</div>
        {chainEl}
      </div>
    );
  } else if (chainEl) {
    top = <>{top}{chainEl}</>;
  }

  return (
    <div
      ref={rootRef}
      className={`wg-stage mode-${mode} ${solved ? "is-solved" : ""} ${alongIndex >= 0 ? "is-teaching" : ""} ${reducedMotion ? "still" : ""}`}
      data-testid="wg-board"
      data-mode={mode}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="wg-top">{top}</div>
      <div className="wg-lower">
        {lower}
        {action}
      </div>
      {drag?.active &&
        createPortal(
          <div className="wg-ghost-drag" aria-hidden="true" style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, height: drag.rect.height, transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-3deg) scale(1.04)` }}>
            <span className="wg-ghost-card">{drag.label}</span>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Highlight the root letters inside a word (first miss: find the part you know). */
function markRoot(word: string, root: string) {
  const i = word.toLowerCase().indexOf(root.toLowerCase());
  if (i < 0) return word;
  return (
    <>
      {word.slice(0, i)}
      <mark className="wg-root-mark">{word.slice(i, i + root.length)}</mark>
      {word.slice(i + root.length)}
    </>
  );
}

function growButton(enabled: boolean, solved: boolean, model: boolean, onClick: () => void, label: string) {
  return (
    <button type="button" className={`done-btn wg-grow ${solved ? "is-right" : model ? "is-model" : ""}`} data-testid="done" aria-label={label} aria-disabled={!enabled} onClick={onClick}>
      <GrowIcon /><span>Grow</span>
    </button>
  );
}

function HearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" />
      <path d="M16 9 Q18.5 12 16 15 M18.5 6.5 Q23 12 18.5 17.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function GrowIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
      <path d="M24 44 V22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 26 Q10 26 8 12 Q22 12 24 26 Z M24 22 Q26 6 40 6 Q40 20 24 22 Z" fill="#B5E48C" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

/** The answers live on the board, so the shared tray is empty (and collapsed by CSS). */
export function GroveTray(_p: BoardProps) {
  return <div className="wg-tray" aria-hidden="true" />;
}
