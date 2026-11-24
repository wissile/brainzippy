import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { AnswerOption } from "../../engine/types";
import type { BoardProps } from "../../game/boards";
import {
  FEELING_MARK, type Feeling, articleLine, articleOf, chainOf, claimIndex, combineOf, conciseOf, connectiveOf, connoteOf, cutOf, enoughOf, figOf,
  groupById, itemLine, modeOf, modifierOf, noteLine, optId, orderOf, pronounOf, purposeOf, segments, shiftOf, sortGroupsOf, strongestOf, tagOf,
} from "./logic";
import type { Tag } from "./sentences";
import { DEVICE_DEF, DEVICE_LABEL, type Device } from "./words";
import "./lantern-press.css";

/**
 * The Lantern Press board (skin.Board). A galley proof at the top holds what the editor reads (a sentence with a
 * gap, reporter's notes, a quote, a purpose, a fictional article); the answers sit below as proof slips, type
 * blocks, label stamps or a Check button. Every move works three ways (D-022): tap (or tap-tap: a card, then a
 * label), drag, and keyboard (Tab + Enter/Space; Backspace takes the last type block back). Text-led for ages
 * 12–14, with voice on demand: the speaker on the proof reads it aloud.
 *   choice    tap a slip (or drag it onto the proof)          connective · combine · rewrites · concise · words · voice · evidence
 *   sequence  put type blocks on the composing stick, Check  order
 *   set       tap parts of the text, then Check              modTap · pronTap · cutTap · evidenceTap · offTap
 *   match     label each card (card, then label), Check      feelSort · claimSort
 * First miss: Hoot's line (runner) + a strategy on the board (the wrong pick greys out). Second miss: the worked
 * steps appear one by one (runner count-along) and the answer is marked (is-model) for the editor to complete.
 * Nothing is timed and nothing is taken away.
 */
type Zone = { kind: "proof" | "slot" | "bin"; value: string };
interface Drag { id: string; startX: number; startY: number; active: boolean; dx: number; dy: number; rect: DOMRect; label: string }

/** Strategy notes for a wrong choice, by misconception (first miss). */
const TAG_RULE: Partial<Record<Tag, string>> = {
  "comma-splice": "Two full sentences need more than a comma: use a connective, a semicolon or a period.",
  "run-on": "Two full sentences can't just run together: they need a connective or punctuation.",
  reversed: "Check the direction: which idea causes, or comes before, the other?",
  "wrong-relation": "Is the second idea a reason, a result, a surprise, a time, a condition or a purpose?",
  "meaning-shift": "Check the meaning: does it still say what the writer means?",
  "info-loss": "Shorter isn't always better: every fact must stay.",
  wordy: "That version still uses several words for one idea.",
  "still-misplaced": "The phrase still sits next to the wrong word. Read it literally.",
  "still-ambiguous": "That pronoun could still point to two people or things.",
  "wrong-connotation": "Same meaning, opposite feeling. What does the writer feel?",
  neutral: "That word is neutral. The writer has a feeling here.",
  literal: "That's the literal meaning. What does the writer really mean?",
  misread: "Read the whole line again. What picture is the writer making?",
  "wrong-focus": "Doer first = active. Thing first = passive. Which does the purpose need?",
  shift: "Keep one doer in charge of every action.",
  irrelevant: "Relevant? It has to be about the claim.",
  anecdote: "Enough? One person's story isn't many cases.",
  opinion: "Checkable? An opinion isn't something anyone could check.",
  "small-sample": "How many were checked? Could they speak for everyone in the claim?",
  "too-strict": "Evidence doesn't have to be perfect, just enough to be fair.",
};
const RELATIONS = "reason → because · result → so · surprise → although, but · time → until, before, when · condition → if, unless · purpose → so (that)";
/** Short label hints at the first miss (≤ 2 lines in a phone's 2-column grid). */
const BIN_HINT: Readonly<Record<string, string>> = {
  claim: "what to believe", evidence: "can be checked", reasoning: "links evidence to claim", none: "doesn't back it up",
  positive: "sounds like praise", neutral: "plain description", negative: "sounds like a complaint",
};

export function PressBoard({ st, act, alongIndex, busy: busyProp }: BoardProps) {
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
  /** First-miss strategy notes show at hint stage 1 only; at stage 2 the worked steps replace them (less to read). */
  const strategy = st.hintStage === 1;
  const modelOn = st.hintStage === 2 && canAct;
  const tried = typeof st.lastAnswer === "string" ? st.lastAnswer : null;
  const triedTag = tried ? tagOf(ex, tried) : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const [saying, setSaying] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(-Infinity);
  const lastKeyboard = useRef(false);
  const zoneKey = (z: Zone) => `${z.kind}:${z.value}`;

  // sequence (order)
  const slots = a.kind === "sequence" ? a.order.length : 0;
  const pieces: readonly AnswerOption[] = a.kind === "sequence" ? a.pieces : [];
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: slots }, () => null));
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const pieceText = (id: string) => pieces.find((p) => p.id === id)?.text ?? id;
  const filled = placed.filter(Boolean).length;
  // match (label sort)
  const [sorted, setSorted] = useState<Record<string, string>>({});
  const items = a.kind === "match" ? a.items : [];
  const bins = a.kind === "match" ? a.targets : [];
  // set (tap parts)
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

  // ---------------------------------------------------------------- focus (keyboard users only; never drops to <body>)
  const focusTimer = useRef(0);
  const focusLater = (fn: () => void, ms = 40) => {
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(fn, ms);
  };
  const focusSel = (sel: string, force = false) =>
    focusLater(() => {
      const ae = document.activeElement as HTMLElement | null;
      const stale = !ae || ae === document.body || !rootRef.current?.contains(ae) || ae.getAttribute("aria-disabled") === "true" || ae.classList.contains("is-away");
      if (!force && !stale) return;
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
      setPlaced(Array.from({ length: slots }, (_, i) => (parts[String(i)] === true && last[i] && !st.eliminated.includes(last[i]!) ? last[i]! : null)));
    }
    if (a.kind === "match") {
      if (st.hintStage === 2 && st.model && typeof st.model === "object" && !Array.isArray(st.model)) {
        // the model labels every card but the last; the editor labels that one (errorless, docs §4)
        const m = st.model as Record<string, string>;
        const last = items[items.length - 1]?.id;
        setSorted(Object.fromEntries(Object.entries(m).filter(([key]) => key !== last)));
      } else setSorted((s) => Object.fromEntries(Object.entries(s).filter(([key]) => parts[key] === true)));
    }
    if (a.kind === "set") setPicked((p) => p.filter((id) => parts[id] === true && !st.eliminated.includes(id)));
    if (lastKeyboard.current) {
      const sel = a.kind === "match" ? '.lp-cards [data-testid="choice"]:not([data-label])' : a.kind === "sequence" ? '.lp-tiles [data-testid="choice"]:not([aria-disabled="true"])' : '[data-testid="choice"]:not([aria-disabled="true"])';
      focusSel(`${sel}, [data-testid="done"]`, true);
    }
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
    audio.play("drop", { gain: 0.5 });
    if (lastKeyboard.current) {
      if (next.every(Boolean)) focusSel('[data-testid="done"]', true);
      else focusLater(() => {
        const all = [...(rootRef.current?.querySelectorAll<HTMLElement>('.lp-tiles [data-testid="choice"]') ?? [])];
        const at2 = all.findIndex((el) => el.dataset.value === id);
        const free = (el: HTMLElement) => !next.includes(el.dataset.value ?? "") && el.getAttribute("aria-disabled") !== "true";
        const nxt = [...all.slice(at2 + 1), ...all.slice(0, Math.max(0, at2))].find(free);
        (nxt ?? (rootRef.current?.querySelector('[data-testid="done"]') as HTMLElement | null))?.focus({ preventScroll: true });
      });
    }
  };
  const unplace = (i: number) => {
    if (!canAct || !placedRef.current[i]) return;
    busy();
    audio.play("pickup", { gain: 0.35 });
    const id = placedRef.current[i]!;
    setPlaced((p) => p.map((x, j) => (j === i ? null : x)));
    if (lastKeyboard.current) focusSel(`.lp-tiles [data-testid="choice"][data-value="${id}"]`, true);
  };
  const check = () => {
    if (!canAct) return;
    if (a.kind === "sequence" && filled === slots) submit(placedRef.current.filter((x): x is string => !!x));
    if (a.kind === "match" && Object.keys(sorted).length === items.length) submit(sorted);
    if (a.kind === "set" && picked.length > 0) submit(picked);
  };
  const labelAs = (item: string, bin: string) => {
    if (!canAct) return;
    busy();
    const next = { ...sorted, [item]: bin };
    setSorted(next);
    setSelected(null);
    audio.play("drop", { gain: 0.5 });
    if (lastKeyboard.current) {
      focusLater(() => {
        const cards = [...(rootRef.current?.querySelectorAll<HTMLElement>('.lp-cards [data-testid="choice"]') ?? [])];
        const at = cards.findIndex((el) => el.dataset.value === item);
        const nxt = [...cards.slice(at + 1), ...cards.slice(0, Math.max(0, at))].find((el) => !next[el.dataset.value ?? ""]);
        (nxt ?? (rootRef.current?.querySelector('[data-testid="done"]') as HTMLElement | null))?.focus({ preventScroll: true });
      });
    }
  };
  const pickCard = (id: string, viaKeyboard: boolean) => {
    if (!canAct) return;
    audio.play("pickup", { gain: 0.35 });
    setSelected((s) => (s === id ? null : id));
    if (viaKeyboard) focusLater(() => (rootRef.current?.querySelector('[data-testid="dock"]') as HTMLElement | null)?.focus({ preventScroll: true }), 30);
  };
  const toggleChunk = (id: string) => {
    if (!canAct || out(id)) return;
    busy();
    audio.play(picked.includes(id) ? "pickup" : "drop", { gain: 0.4 });
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const dropOn = (id: string, z: Zone) => {
    if (!canAct) return;
    if (z.kind === "proof" && a.kind === "choice") return choose(id);
    if (z.kind === "slot") return placeTile(id, Number(z.value));
    if (z.kind === "bin") return labelAs(id, z.value);
  };

  // ---------------------------------------------------------------- drag
  const zoneAt = (x: number, y: number): Zone | null => {
    let best: { z: Zone; d: number } | null = null;
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>("[data-lp-zone]") ?? []) {
      const r = el.getBoundingClientRect();
      const m = 14;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      const [kind, value] = el.dataset.lpZone!.split(":") as [Zone["kind"], string];
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
        audio.play("pickup", { gain: 0.4 });
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
      else audio.play("whoosh", { gain: 0.25 });
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
  const zoneProps = (z: Zone) => ({ "data-lp-zone": zoneKey(z) });
  const isHot = (z: Zone) => hot === zoneKey(z);
  const dragging = (id: string) => drag?.active && drag.id === id;

  // ---------------------------------------------------------------- shared pieces
  const chain = chainOf(ex);
  const chainShown = st.hintStage === 2 && chain.length > 0 && (alongIndex >= 0 || canAct || solved);
  const chainUpTo = alongIndex >= 0 ? alongIndex : chain.length - 1;
  const chainEl = chainShown ? (
    <ol className="lp-chain" data-testid="model-chain" aria-label="Worked steps" aria-live="polite">
      {chain.map((c, i) => <li key={i} className={i <= chainUpTo ? "is-on" : ""} aria-hidden={i > chainUpTo}>{c}</li>)}
    </ol>
  ) : null;
  const rightText = a.kind === "choice" ? (a.options.find((o) => o.id === a.correct)?.text ?? "") : "";
  const gapFill = solved && a.kind === "choice" ? rightText : wrongNow && tried && a.kind === "choice" ? (a.options.find((o) => o.id === tried)?.text ?? "") : null;
  const hearBtn = (lines: string[], key = "proof") => (
    <button type="button" className={`lp-hear ${saying === key ? "is-saying" : ""}`} data-testid="hear" aria-label="Read it to me" onClick={() => void say(lines, key)}>
      <HearIcon />
    </button>
  );
  const gapSentence = (text: string) => (
    <p className="lp-sentence">
      {segments(text).map((s, i) =>
        s.gap ? <span key={i} className={`lp-gap ${gapFill ? (solved ? "is-right" : "is-wrong") : ""}`} data-testid="gap">{gapFill ?? " "}</span> : <Fragment key={i}>{s.text}</Fragment>,
      )}
    </p>
  );
  const rule = (text: string | undefined | null, key = "rule") => (text ? <p className="lp-rule" data-testid={key}>{text}</p> : null);
  const tagRule = hinted && triedTag ? TAG_RULE[triedTag] : undefined;

  // ================================================================ what is on the proof
  let label = "Proof";
  let body: React.ReactNode = null;
  let hear: React.ReactNode = null;
  let lower: React.ReactNode = null;
  let action: React.ReactNode = null;
  let proofIsZone = a.kind === "choice";

  switch (mode) {
    case "connective": {
      const c = connectiveOf(ex);
      label = "Proof · fill the gap";
      hear = hearBtn([itemLine("connective", c.id)]);
      body = <>{gapSentence(c.text)}{strategy && rule(tagRule ?? "Is the second idea a reason, a result, a surprise, a time, a condition or a purpose?")}{strategy && <p className="lp-key">{RELATIONS}</p>}</>;
      break;
    }
    case "combine":
    case "order": {
      const notes = mode === "combine" ? combineOf(ex).notes : orderOf(ex).notes;
      const id = mode === "combine" ? combineOf(ex).id : orderOf(ex).id;
      label = "Reporter's notes";
      hear = hearBtn([itemLine(mode, id)]);
      body = (
        <>
          <ul className="lp-notes">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          {mode === "combine" && strategy && rule(tagRule)}
          {mode === "order" && strategy && rule("Is one note a reason, a surprise, a time or a condition? Use the card that says so.")}
        </>
      );
      break;
    }
    case "modTap":
    case "modFix": {
      const m = modifierOf(ex);
      label = "Proof";
      hear = hearBtn([itemLine("modifier", m.id)]);
      if (mode === "modFix") body = <><p className="lp-sentence">{m.chunks.join(" ")}</p>{strategy && rule(`Read literally: ${m.literal} It should describe ${m.target}.`)}{strategy && rule(tagRule, "rule2")}</>;
      break;
    }
    case "pronTap":
    case "pronFix": {
      const p = pronounOf(ex);
      label = "Proof";
      hear = hearBtn(mode === "pronFix" ? [itemLine("pronoun", p.id), noteLine(p.id)] : [itemLine("pronoun", p.id)]);
      if (mode === "pronFix") {
        body = (
          <>
            <p className="lp-sentence">{p.chunks.map((c, i) => (p.vague.includes(i) && hinted ? <mark key={i} className="lp-mark">{c} </mark> : <Fragment key={i}>{c} </Fragment>))}</p>
            <p className="lp-note"><span className="lp-note-tag">The writer means</span> {p.means}</p>
            {strategy && rule(`${p.vague.map((i) => p.chunks[i]).join(", ")} → ${p.could.join(" or ")}? ${tagRule ?? "Name the person or thing the writer means."}`)}
          </>
        );
      }
      break;
    }
    case "cutTap":
    case "concise": {
      label = "Proof";
      if (mode === "concise") {
        const c = conciseOf(ex);
        hear = hearBtn([itemLine("concise", c.id)]);
        body = <><p className="lp-sentence">{c.text}</p>{strategy && rule(tagRule)}</>;
      } else hear = hearBtn([itemLine("cut", cutOf(ex).id)]);
      break;
    }
    case "connote": {
      const n = connoteOf(ex);
      const g = groupById(n.group);
      label = "Proof · word choice";
      hear = hearBtn([itemLine("connote", n.id)]);
      body = (
        <>
          {gapSentence(n.text)}
          {strategy && rule(`The writer is ${n.cue}: ${n.want === "positive" ? "a positive" : "a negative"} feeling. ${tagRule ?? ""}`.trim())}
          {modelOn && <p className="lp-key">{g.positive} (+) · {g.neutral} (0) · {g.negative} (−): all mean {g.core}</p>}
        </>
      );
      break;
    }
    case "device":
    case "figMeaning": {
      const f = figOf(ex);
      label = "From tonight's column";
      hear = hearBtn([itemLine("fig", f.id)]);
      const offered = mode === "device" && a.kind === "choice" ? a.options.map((o) => (Object.keys(DEVICE_LABEL) as Device[]).find((d) => DEVICE_LABEL[d] === o.text)!).filter(Boolean) : [];
      body = (
        <>
          <blockquote className="lp-quote">{f.text}</blockquote>
          {mode === "device" && strategy && <ul className="lp-defs" data-testid="rule">{offered.filter((d) => !out(optId(DEVICE_LABEL[d]))).map((d) => <li key={d}>{DEVICE_DEF[d]}</li>)}</ul>}
          {mode === "figMeaning" && strategy && rule(`${DEVICE_DEF[f.device]} ${tagRule ?? ""}`.trim())}
        </>
      );
      break;
    }
    case "purpose": {
      const p = purposeOf(ex);
      label = "Writer's purpose";
      hear = hearBtn([itemLine("purpose", p.id)]);
      body = <><p className="lp-sentence is-purpose">{p.purpose}</p>{strategy && rule(`Doer: ${p.doer} · Thing: ${p.thing}. Which should come first? ${tagRule ?? ""}`.trim())}</>;
      break;
    }
    case "shift": {
      const s = shiftOf(ex);
      label = "Proof";
      hear = hearBtn([itemLine("shift", s.id)]);
      body = <><p className="lp-sentence">{s.text}</p>{strategy && rule(`The doer is ${s.doer}. Keep ${s.doer} doing every action.`)}</>;
      break;
    }
    case "strongest": {
      const s = strongestOf(ex);
      label = "Claim to check";
      hear = hearBtn([itemLine("strongest", s.id)]);
      body = <><p className="lp-sentence is-claim">{s.claim}</p>{strategy && rule(`Three tests: about the claim? Many cases, not one person's view? Could someone check it? ${tagRule ?? ""}`.trim())}</>;
      break;
    }
    case "enough": {
      const y = enoughOf(ex);
      label = "Fact check";
      hear = hearBtn([itemLine("enough", y.id)]);
      body = <><p className="lp-sentence">{y.text}</p><p className="lp-ask">{y.question}</p>{strategy && rule(tagRule ?? "How many were checked? Could they speak for everyone in the claim?")}</>;
      break;
    }
    default:
      break;
  }

  // ---------------------------------------------------------------- set: tap parts of the text
  if (a.kind === "set") {
    const model = Array.isArray(st.model) ? (st.model as readonly string[]) : [];
    const shownPicked = solved && Array.isArray(st.lastAnswer) ? (st.lastAnswer as string[]) : picked;
    const isArticle = mode === "evidenceTap" || mode === "offTap";
    const art = isArticle ? articleOf(ex) : null;
    const claimAt = art ? claimIndex(art) : -1;
    const chunk = (o: AnswerOption, i: number) => {
      const on = shownPicked.includes(o.id);
      const right = on && (solved || (st.attempts > 0 && canAct && st.check?.parts?.[o.id] === true));
      const isModel = modelOn && model.includes(o.id) && !on;
      const claimLit = isArticle && hinted && i === claimAt;
      return (
        <button
          key={o.id}
          type="button"
          className={`lp-chunk ${isArticle ? "is-sentence" : ""} ${on ? "is-on" : ""} ${right ? "is-right" : ""} ${out(o.id) ? "is-out" : ""} ${isModel ? "is-model" : ""} ${claimLit ? "is-claim" : ""} ${wrongNow && on && st.check?.parts?.[o.id] === false ? "is-wrong" : ""}`}
          data-testid="choice"
          data-value={o.id}
          aria-pressed={on}
          aria-disabled={out(o.id) || !canAct}
          aria-label={`${o.text}${claimLit ? " (the claim)" : ""}${out(o.id) ? " (not this one)" : isModel ? ", one to tap" : ""}`}
          onClick={(e) => !guard(e) && toggleChunk(o.id)}
        >
          {o.text}
        </button>
      );
    };
    const n = a.correct.length;
    label = isArticle ? "Fictional article for practice" : "Proof";
    if (isArticle) hear = hearBtn([articleLine(art!.id)]);
    body = isArticle ? (
      <>
        <h3 className="lp-headline">{art!.headline}</h3>
        <div className="lp-article" role="group" aria-label="Article sentences">{a.options.map(chunk)}</div>
        {strategy && rule(mode === "offTap" ? "Does each sentence back the claim, or just sit beside it?" : "Evidence is something someone could check, and it must be about the claim.")}
      </>
    ) : (
      <>
        <p className="lp-sentence is-tappable" role="group" aria-label="Sentence parts">
          {a.options.map((o, i) => <Fragment key={o.id}>{chunk(o, i)}{" "}</Fragment>)}
        </p>
        {strategy && rule(
          mode === "modTap" ? "A describing phrase attaches to the nearest noun. Read each phrase with the word beside it."
          : mode === "pronTap" ? `People and things here: ${pronounOf(ex).could.join(" · ")}. Could a word point to both?`
          : cutOf(ex).cut.length === 2 && cutOf(ex).why[0] ? `Hint: ${cutOf(ex).why[0]} What else repeats?` : "Read it without each part. Did any meaning disappear?",
        )}
      </>
    );
    lower = (
      <div className="lp-tapinfo">
        <p className="lp-count" aria-live="polite">{`Tapped: ${picked.length} of ${n}`}</p>
      </div>
    );
    action = checkButton(canAct && picked.length > 0, solved, modelOn && model.every((m) => picked.includes(m)), check, "Check: submit what you tapped");
    proofIsZone = false;
  }

  // ---------------------------------------------------------------- sequence: the composing stick
  if (a.kind === "sequence") {
    const model = Array.isArray(st.model) ? (st.model as readonly string[]) : null;
    const shown: readonly (string | null)[] = solved && Array.isArray(st.lastAnswer) ? (st.lastAnswer as readonly string[]) : wrongNow && Array.isArray(st.lastAnswer) ? Array.from({ length: slots }, (_, i) => (st.lastAnswer as readonly string[])[i] ?? null) : placed;
    body = (
      <>
        {body}
        <ol className={`lp-stick ${solved ? "is-set" : ""}`} aria-label="Your sentence">
          {Array.from({ length: slots }, (_, i) => {
            const id = shown[i] ?? null;
            const ok = st.attempts > 0 && canAct && id && st.check?.parts?.[String(i)] === true;
            const bad = wrongNow && st.check?.parts?.[String(i)] === false;
            // second miss: every empty place shows its card faintly once the worked step has been shown
            const ghost = model && (alongIndex >= 0 || canAct) && !id ? model[i] : undefined;
            const z: Zone = { kind: "slot", value: String(i) };
            return (
              <li key={i} className={`lp-slot ${ok || solved ? "is-ok" : ""} ${bad ? "is-wrong" : ""} ${isHot(z) ? "is-hot" : ""}`}>
                <button
                  type="button"
                  className="lp-slot-btn"
                  data-testid="slot"
                  data-slot={i}
                  data-filled={id ? "true" : "false"}
                  aria-label={id ? `${pieceText(id)}, place ${i + 1}. Press to take it back` : `Empty place ${i + 1}`}
                  {...zoneProps(z)}
                  onClick={(e) => {
                    if (guard(e)) return;
                    if (id) return unplace(i);
                    if (selected) placeTile(selected, i);
                  }}
                >
                  {id ? <span className="lp-slot-text">{pieceText(id)}</span> : ghost ? <span className="lp-ghost" aria-hidden="true">{pieceText(ghost)}</span> : <span className="lp-empty" aria-hidden="true">{i + 1}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </>
    );
    const nextModel = model && canAct ? model[placed.indexOf(null)] : undefined;
    lower = (
      <div className="lp-tiles" role="group" aria-label="Type blocks">
        {pieces.map((p) => {
          const inSlot = placed.includes(p.id) || (solved && shown.includes(p.id));
          const disabled = out(p.id) || !canAct || filled === slots;
          return (
            <button
              key={p.id}
              type="button"
              className={`lp-tile ${out(p.id) ? "is-out" : ""} ${nextModel === p.id ? "is-model" : ""} ${inSlot ? "is-away" : ""} ${dragging(p.id) ? "is-dragging" : ""}`}
              data-testid="choice"
              data-value={p.id}
              data-text={p.text}
              aria-disabled={disabled || inSlot}
              aria-label={`Card: ${p.text}${out(p.id) ? " (not needed)" : nextModel === p.id ? ", the next card" : ""}. Press to put it on the stick`}
              tabIndex={inSlot ? -1 : undefined}
              {...dragProps(p.id, p.text ?? "", !inSlot)}
              onClick={(e) => {
                if (guard(e) || disabled || inSlot) return;
                placeTile(p.id);
              }}
            >
              {p.text}
            </button>
          );
        })}
      </div>
    );
    action = checkButton(canAct && filled === slots, solved, modelOn && filled === slots, check, "Check the sentence");
    proofIsZone = false;
  }

  // ---------------------------------------------------------------- match: label each card
  if (a.kind === "match") {
    const shownSort = solved && st.lastAnswer && typeof st.lastAnswer === "object" && !Array.isArray(st.lastAnswer) ? (st.lastAnswer as Record<string, string>) : sorted;
    const isArticle = mode === "claimSort";
    const textOf = (id: string) => items.find((i) => i.id === id)?.text ?? id;
    const binText = (id: string) => bins.find((b) => b.id === id)?.text ?? id;
    const modelPairs = modelOn && st.model && typeof st.model === "object" && !Array.isArray(st.model) ? (st.model as Record<string, string>) : null;
    const modelLeft = modelPairs ? items.find((it) => !sorted[it.id]) : undefined;
    const modelTarget = modelLeft && modelPairs ? modelPairs[modelLeft.id] : undefined;
    const [g1, g2] = mode === "feelSort" ? sortGroupsOf(ex) : [null, null];
    const card = (it: AnswerOption) => {
      const lab = shownSort[it.id];
      const ok = lab && (solved || (st.attempts > 0 && st.check?.parts?.[it.id] === true));
      const isModel = !!modelLeft && modelLeft.id === it.id;
      return (
        <button
          key={it.id}
          type="button"
          className={`lp-card ${isArticle ? "is-sentence" : "is-word"} ${selected === it.id ? "is-picked" : ""} ${lab ? "is-labeled" : ""} ${ok ? "is-ok" : ""} ${isModel ? "is-model" : ""} ${dragging(it.id) ? "is-dragging" : ""}`}
          data-testid="choice"
          data-value={it.id}
          data-label={lab || undefined}
          aria-disabled={!canAct}
          aria-pressed={selected === it.id}
          aria-label={`${it.text}${lab ? `, labeled ${binText(lab)}` : ""}${isModel && modelTarget ? `, label it ${binText(modelTarget)}` : ""}. Press to pick it, then press a label`}
          {...dragProps(it.id, it.text ?? it.id)}
          onClick={(e) => {
            if (guard(e)) return;
            pickCard(it.id, e.detail === 0 || lastKeyboard.current);
          }}
        >
          <span className="lp-card-text">{it.text}</span>
          {lab && <span className={`lp-chip chip-${lab}`} aria-hidden="true">{mode === "feelSort" ? FEELING_MARK[lab as Feeling] : binText(lab)}</span>}
        </button>
      );
    };
    label = isArticle ? "Fictional article for practice" : "Word choice";
    if (isArticle) {
      const art = articleOf(ex);
      hear = hearBtn([articleLine(art.id)]);
      body = (
        <>
          <h3 className="lp-headline">{art.headline}</h3>
          <div className="lp-cards is-article" role="group" aria-label="Sentences to label">{items.map(card)}</div>
        </>
      );
    } else {
      body = (
        <>
          <div className="lp-cards is-words" role="group" aria-label="Words to label">{items.map(card)}</div>
          {strategy && g1 && g2 && rule(`Same meaning, different feeling: ${g1.positive}, ${g1.neutral}, ${g1.negative} all mean ${g1.core}; ${g2.positive}, ${g2.neutral}, ${g2.negative} all mean ${g2.core}.`)}
        </>
      );
    }
    lower = (
      <div className={`lp-bins ${isArticle ? "is-roles" : "is-feelings"}`} role="group" aria-label="Labels">
        {bins.map((b) => {
          const z: Zone = { kind: "bin", value: b.id };
          return (
            <button
              key={b.id}
              type="button"
              className={`lp-bin chip-${b.id} ${isHot(z) ? "is-hot" : ""} ${selected ? "is-ready" : ""} ${modelTarget === b.id ? "is-model" : ""}`}
              data-testid="dock"
              data-value={b.id}
              aria-disabled={!canAct}
              aria-label={`${b.text}${strategy ? ` (${BIN_HINT[b.id]})` : ""}${selected ? `. Press to label "${textOf(selected)}" ${b.text}` : ". Pick a card first"}`}
              {...zoneProps(z)}
              onClick={(e) => {
                if (guard(e) || !selected) return;
                labelAs(selected, b.id);
              }}
            >
              <span className="lp-bin-label">{mode === "feelSort" ? `${FEELING_MARK[b.id as Feeling]} ${b.text}` : b.text}</span>
              {strategy && <span className="lp-bin-hint" aria-hidden="true">{BIN_HINT[b.id]}</span>}
            </button>
          );
        })}
      </div>
    );
    action = checkButton(canAct && Object.keys(sorted).length === items.length, solved, modelOn && Object.keys(sorted).length === items.length, check, isArticle ? "Check the labels" : "Check the sorting");
    proofIsZone = false;
  }

  // ---------------------------------------------------------------- choice: proof slips
  if (a.kind === "choice") {
    const long = a.options.some((o) => (o.text ?? "").length > 24);
    lower = (
      <div className={`lp-options ${long ? "is-long" : "is-short"}`} role="group" aria-label="Answers" style={{ "--n": a.options.length } as React.CSSProperties}>
        {a.options.map((o) => {
          const state = st.phase === "feedback" && tried === o.id ? (fb?.correct ? "is-right" : "is-wrong") : solved && a.correct === o.id ? "is-right" : "";
          return (
            <button
              key={o.id}
              type="button"
              className={`lp-slip ${state} ${out(o.id) ? "is-out" : ""} ${modelOn && a.correct === o.id ? "is-model" : ""} ${dragging(o.id) ? "is-dragging" : ""}`}
              data-testid="choice"
              data-value={o.id}
              aria-disabled={out(o.id) || !canAct}
              aria-label={out(o.id) ? `${o.text}: not this one` : `Choose: ${o.text}${modelOn && a.correct === o.id ? ", the answer" : ""}`}
              {...dragProps(o.id, o.text ?? "")}
              onClick={(e) => !guard(e) && choose(o.id)}
            >
              <span className="lp-slip-text">{o.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const z: Zone = { kind: "proof", value: "0" };
  const top = (
    <div className={`lp-proof ${solved ? "is-solved" : ""} ${proofIsZone && isHot(z) ? "is-hot" : ""}`} data-testid="proof" data-lp-idle {...(proofIsZone ? zoneProps(z) : {})}>
      <div className="lp-proof-head">
        <span className="lp-proof-label">{label}</span>
        {hear}
      </div>
      <div className="lp-proof-body">{body}</div>
      {chainEl}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`lp-stage mode-${mode} kind-${a.kind} ${solved ? "is-solved" : ""} ${alongIndex >= 0 ? "is-teaching" : ""} ${reducedMotion ? "still" : ""}`}
      data-testid="lp-board"
      data-mode={mode}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="lp-top">{top}</div>
      <div className="lp-lower">
        {lower}
        {action}
      </div>
      {drag?.active &&
        createPortal(
          <div className="lp-ghost-drag" aria-hidden="true" style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, height: drag.rect.height, transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-2deg)` }}>
            <span className="lp-ghost-card">{drag.label}</span>
          </div>,
          document.body,
        )}
    </div>
  );
}

function checkButton(enabled: boolean, solved: boolean, model: boolean, onClick: () => void, label: string) {
  return (
    <button type="button" className={`done-btn lp-check ${solved ? "is-right" : model ? "is-model" : ""}`} data-testid="done" aria-label={label} aria-disabled={!enabled} onClick={onClick}>
      <StampIcon /><span>Check</span>
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
function StampIcon() {
  return (
    <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true">
      <path d="M18 6 H30 V20 Q30 24 36 26 H40 V34 H8 V26 H12 Q18 24 18 20 Z" fill="#FFC24D" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M8 40 H40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** The answers live on the board, so the shared tray is empty (and collapsed by CSS). */
export function PressTray(_p: BoardProps) {
  return <div className="lp-tray" aria-hidden="true" />;
}
