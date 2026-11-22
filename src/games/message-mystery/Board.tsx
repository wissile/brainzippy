import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import {
  AskDeskArt, EnvelopeIcon, FileIcon, GrownUpIcon, LinkIcon, MagnifierIcon, SafeBagArt, SpeakerIcon, TickIcon,
} from "./art";
import { ACTION_OPTIONS, NONE, VERIFY_OPTIONS, decode, hintClue } from "./generator";
import { CLUE_LABEL, type Msg, addressOf, host, linkIsClue, msgLine, partsOf } from "./messages";
import { type Bin, mmStore, useMm } from "./store";
import "./message-mystery.css";

/**
 * Fenn's Message Mystery play board: the town mailbox with one message card (or an inbox of four), and the
 * detective's tools beside it.
 *
 *  sort    drag the message onto Safe / Ask a grown-up · or tap the envelope, then a bin · or tap a bin ·
 *          or Tab to a bin and press Enter. Tap the sender, a link or a file to magnify it (reveals the real
 *          address on levels 5–6); tap the speaker or the words to hear the whole message.
 *  clues   tap (or Enter) every part that is a clue — it gets circled — or "No clues", then Done.
 *  action  / verify: choose one of three cards (each has its own speaker).
 *  inbox   tap an envelope to open it, sort it like above; Done when all four are in a bin.
 *
 * Hints: sort is a two-bin choice, so the first miss already shows the worked answer (clue circled and named,
 * the right bin glows). Other modes: first miss glows the area that holds the clue without naming it; the
 * second miss circles and names it (docs/curriculum/cyber.md §4.6).
 */

function useWide<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setWide(r.width > r.height * 1.35 && r.width > 560);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, wide];
}

let suppressUntil = 0;
const isTap = (e: React.MouseEvent) => e.timeStamp >= suppressUntil;
const binAt = (x: number, y: number): Bin | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  return (el?.closest<HTMLElement>("[data-mm-bin]")?.dataset.mmBin as Bin | undefined) ?? null;
};

const BIN_LABEL: Record<Bin, string> = { safe: "Safe", ask: "Ask a grown-up" };
const BIN_ARIA: Record<Bin, string> = {
  safe: "Safe: put the message in the mailbag",
  ask: "Ask a grown-up: take the message to the help desk",
};

export function MessageBoard({ st, act, busy }: BoardProps) {
  const ex = st.exercise;
  const d = useMemo(() => decode(ex), [ex]);
  const sh = useMm(ex);
  const { reducedMotion, speaking } = useApp();
  const set = (patch: Parameters<typeof mmStore.set>[1]) => mmStore.set(ex.id, patch);
  const canAct = st.phase === "answering";
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!st.feedback?.correct);
  const inbox = d.mode === "inbox";
  const m: Msg = inbox ? d.msgs[Math.min(sh.open, d.msgs.length - 1)]! : d.msgs[0]!;
  /** Worked answer visible: sort after one miss (two bins), every other mode after two. */
  const modelShown = d.mode === "sort" ? st.hintStage >= 1 : st.hintStage >= 2;
  const glowShown = !modelShown && st.hintStage >= 1 && d.mode !== "inbox";
  const [rootRef, wide] = useWide<HTMLDivElement>();
  const [say, setSay] = useState("");
  const [drag, setDrag] = useState<{ x: number; y: number; dx: number; dy: number; active: boolean } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  const touch = () => {
    busy?.();
    if (!sh.touched) set({ touched: true });
  };

  // ---------- automatic read-aloud once the prompt (and any helper) has finished ----------
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  useEffect(() => {
    if (inbox || st.attempts > 0) return;
    const t0 = Date.now();
    let quiet: number | null = null;
    const id = window.setInterval(() => {
      if (mmStore.get().exId !== ex.id || mmStore.get().touched || stPhase.current !== "answering") return window.clearInterval(id);
      if (speakingRef.current || document.querySelector('[data-testid="helper"]')) {
        quiet = null;
        return;
      }
      if (Date.now() - t0 < 900) return;
      if (quiet === null) quiet = Date.now();
      else if (Date.now() - quiet >= 350) {
        window.clearInterval(id);
        void audio.speak(msgLine(m));
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const stPhase = useRef(st.phase);
  stPhase.current = st.phase;

  // ---------- reading and magnifying ----------
  const readMessage = () => {
    touch();
    audio.play("tap", { gain: 0.35 });
    void audio.speak(msgLine(m));
  };
  const magnify = (partId: string) => {
    touch();
    audio.play("pickup", { gain: 0.35 });
    const revealed = sh.revealed.includes(`${m.id}:${partId}`) ? sh.revealed : [...sh.revealed, `${m.id}:${partId}`];
    set({ zoom: `${m.id}:${partId}`, revealed });
    const tagged = modelShown && !m.safe ? partsOf(m).find((p) => p.id === partId)?.clue : null;
    if (tagged && tagFor(partId)) {
      void audio.speak(`mm.clue.${tagged}`);
      setSay(CLUE_LABEL[tagged]);
    } else if (partId === "from") {
      void audio.speak("mm.zoom.from", { addr: host(m.domain) });
      setSay(`${m.from}. It really comes from ${addressOf(m)}.`);
    } else if (partId === "link" && m.link) {
      void audio.speak("mm.zoom.to", { addr: host(m.link.to) });
      setSay(`Link: ${m.link.text}. It really goes to ${host(m.link.to)}.`);
    } else if (partId === "file" && m.file) {
      void audio.speak("mm.zoom.file");
      setSay(`File: ${m.file.name}.`);
    } else void audio.speak(msgLine(m));
  };
  useEffect(() => {
    if (!sh.zoom) return;
    const z = sh.zoom;
    const t = window.setTimeout(() => mmStore.get().zoom === z && set({ zoom: null }), 3200);
    return () => window.clearTimeout(t);
  }, [sh.zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- answering ----------
  const post = (bin: Bin) => {
    if (!canAct || st.eliminated.includes(bin)) return;
    touch();
    if (inbox) {
      if (sh.locked.includes(m.id)) return;
      audio.play("drop", { gain: 0.5 });
      const assign = { ...sh.assign, [m.id]: bin };
      const next = d.msgs.findIndex((x) => !assign[x.id]);
      set({ assign, lifted: false, hot: null, open: next >= 0 ? next : sh.open });
      setSay(`${m.from} is in ${BIN_LABEL[bin]}. ${Object.keys(assign).length} of ${d.msgs.length} sorted.`);
      return;
    }
    set({ lifted: false, hot: null });
    act({ type: "SUBMIT", value: bin });
  };
  const unpost = (id: string) => {
    if (!canAct || sh.locked.includes(id)) return;
    touch();
    audio.play("pickup", { gain: 0.45 });
    const assign = { ...sh.assign };
    delete assign[id];
    set({ assign, open: d.msgs.findIndex((x) => x.id === id) });
  };
  const togglePick = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    touch();
    audio.play("tap", { gain: 0.45 });
    let picks = sh.picks.includes(id) ? sh.picks.filter((p) => p !== id) : [...sh.picks, id];
    if (id === NONE && picks.includes(NONE)) picks = [NONE];
    else if (id !== NONE) picks = picks.filter((p) => p !== NONE);
    set({ picks });
    setSay(picks.length ? `Circled: ${picks.map((p) => (p === NONE ? "no clues" : partsOf(m).find((x) => x.id === p)?.text ?? p)).join("; ")}.` : "Nothing circled.");
  };
  const done = () => {
    if (!canAct) return;
    touch();
    if (d.mode === "clues" && sh.picks.length) act({ type: "SUBMIT", value: sh.picks });
    if (inbox && d.msgs.every((x) => sh.assign[x.id])) act({ type: "SUBMIT", value: sh.assign });
  };
  const choose = (id: string) => {
    if (!canAct || st.eliminated.includes(id)) return;
    touch();
    act({ type: "SUBMIT", value: id });
  };

  // ---------- feedback ----------
  const fbSeq = st.feedback?.seq;
  useEffect(() => {
    if (!st.feedback || st.feedback.correct) return;
    if (d.mode === "clues") {
      const keep = st.hintStage >= 2 && Array.isArray(st.model) ? [...(st.model as string[])] : sh.picks.filter((p) => st.check?.parts?.[p] !== false && !st.eliminated.includes(p));
      set({ picks: keep });
    } else if (inbox) {
      const parts = st.check?.parts ?? {};
      const assign: Record<string, Bin> = {};
      for (const [id, bin] of Object.entries(sh.assign)) if (parts[id]) assign[id] = bin;
      const next = d.msgs.findIndex((x) => !assign[x.id]);
      set({ assign, locked: Object.keys(assign), open: next >= 0 ? next : 0 });
    }
  }, [fbSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- drag (sort + inbox) ----------
  const draggable = (d.mode === "sort" || inbox) && canAct && !(inbox && sh.locked.includes(m.id));
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const g = dragRef.current;
      if (!g) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      const active = g.active || Math.hypot(dx, dy) > 10;
      if (active && !g.active) {
        audio.play("pickup", { gain: 0.4 });
        touch();
      }
      setDrag({ ...g, dx, dy, active });
      const hot = active ? binAt(e.clientX, e.clientY) : null;
      if (hot !== mmStore.get().hot) set({ hot });
    };
    const up = (e: PointerEvent) => {
      const g = dragRef.current;
      setDrag(null);
      if (!g?.active) return;
      suppressUntil = e.timeStamp + 80;
      const bin = e.type === "pointerup" ? binAt(e.clientX, e.clientY) : null;
      set({ hot: null });
      if (bin) post(bin);
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
  const startDrag = (e: React.PointerEvent) => {
    if (!draggable || e.button !== 0) return;
    setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0, active: false });
  };

  // ---------- model / glow marks ----------
  const parts = partsOf(m);
  const main = m.safe ? null : hintClue(ex, m);
  const mainPart = main ? parts.find((p) => p.clue === main)?.id : undefined;
  const isModelPart = (id: string) => {
    if (!modelShown || inbox) return false;
    if (d.mode === "clues") return !m.safe && !!parts.find((p) => p.id === id)?.clue;
    return !m.safe && id === mainPart;
  };
  const isGlowPart = (id: string) => {
    if (!glowShown) return false;
    if (d.mode === "clues") return !m.safe && !!parts.find((p) => p.id === id)?.clue && !sh.picks.includes(id);
    return !m.safe && id === mainPart;
  };
  const tagFor = (id: string): string | null => {
    if (!modelShown || inbox) return null;
    if (m.safe) return id === "from" ? "Real town address" : id === "b0" ? "Asks for nothing secret" : null;
    const p = parts.find((x) => x.id === id);
    if (!p?.clue) return null;
    return d.mode === "clues" || id === mainPart ? CLUE_LABEL[p.clue] : null;
  };

  // ---------- render helpers ----------
  const zoomed = (id: string) => sh.zoom === `${m.id}:${id}`;
  const seen = (id: string) => !d.fold || modelShown || sh.revealed.includes(`${m.id}:${id}`);
  const clueMode = d.mode === "clues";
  const partProps = (id: string, label: string) => {
    const picked = sh.picks.includes(id);
    const out = st.eliminated.includes(id);
    const ok = clueMode && st.hintStage >= 1 && picked && st.check?.parts?.[id] === true;
    return {
      type: "button" as const,
      className: `mm-part ${zoomed(id) ? "is-zoom" : ""} ${picked ? "is-picked" : ""} ${isModelPart(id) ? "is-model" : ""} ${isGlowPart(id) ? "is-glow" : ""} ${out ? "is-out" : ""} ${ok ? "is-ok" : ""}`,
      "data-testid": clueMode ? "choice" : "mm-part",
      "data-part": id,
      "data-value": id,
      "data-clue": parts.find((p) => p.id === id)?.clue ?? "",
      "aria-pressed": clueMode ? picked : undefined,
      "aria-disabled": clueMode ? !canAct || out : undefined,
      "aria-label": clueMode ? `${label}. ${picked ? "Circled as a clue. Press to un-circle" : "Press to circle it as a clue"}` : label,
      onClick: (e: React.MouseEvent) => {
        if (!isTap(e)) return;
        if (clueMode) togglePick(id);
        else magnify(id);
      },
    };
  };
  const Tag = ({ id }: { id: string }) => {
    const t = tagFor(id);
    return t ? <span className={`mm-tag ${m.safe ? "is-safe" : ""}`} data-testid="mm-tag">{t}</span> : null;
  };

  const lifted = sh.lifted && canAct;
  const fromAddr = seen("from") ? addressOf(m) : "Real address: tap to check";
  const cardStyle = drag?.active ? ({ transform: `translate(${drag.dx}px, ${drag.dy}px) scale(0.72) rotate(-4deg)` } as React.CSSProperties) : undefined;
  const sent = solved && (d.mode === "sort") ? (st.lastAnswer as Bin) : null;
  const idleOnFrom = d.fold && !sh.revealed.includes(`${m.id}:from`);

  const card = (
    <article
      className={`mm-card ${lifted ? "is-lifted" : ""} ${drag?.active ? "is-dragging" : ""} ${sent ? `is-sent is-sent-${sent}` : ""} ${draggable ? "can-drag" : ""}`}
      data-testid="mm-card"
      data-msg={m.id}
      data-safe={m.safe ? "true" : "false"}
      aria-label={`Message from ${m.from}`}
      style={cardStyle}
      onPointerDown={startDrag}
    >
      <header className="mm-card-top">
        {(d.mode === "sort" || inbox) && (
          <button
            type="button"
            className={`mm-lift ${lifted ? "is-on" : ""}`}
            data-testid="mm-lift"
            aria-label={lifted ? "Message picked up. Now choose a bin" : "Pick up the message, then choose a bin"}
            aria-pressed={lifted}
            aria-disabled={!draggable}
            onClick={(e) => {
              if (!isTap(e) || !draggable) return;
              touch();
              audio.play(lifted ? "drop" : "pickup", { gain: 0.4 });
              set({ lifted: !lifted });
              if (!lifted) setSay("Message picked up. Choose Safe or Ask a grown-up.");
            }}
          >
            <EnvelopeIcon open={lifted} />
          </button>
        )}
        <div className="mm-from-wrap">
          <button {...partProps("from", `From ${m.from}. ${seen("from") ? `Address ${addressOf(m)}.` : "Press the magnifier to see the real address."}`)} data-mm-idle={idleOnFrom ? "true" : undefined}>
            <span className="mm-from-label">From</span>
            <span className="mm-from-name">{m.from}</span>
            <span className={`mm-addr ${seen("from") ? "is-seen" : ""}`} data-testid="mm-addr">{fromAddr}</span>
            {!clueMode && <span className="mm-lens-badge" aria-hidden="true"><MagnifierIcon /></span>}
          </button>
          <Tag id="from" />
        </div>
        <button type="button" className="mm-read" data-testid="mm-read" aria-label="Read the message to me" onClick={readMessage} data-mm-idle={idleOnFrom ? undefined : "true"}>
          <SpeakerIcon />
        </button>
      </header>
      <div className="mm-body">
        {m.body.map((p, i) => (
          <span key={i} className="mm-part-wrap">
            <button {...partProps(`b${i}`, p.text)}>{p.text}</button>
            <Tag id={`b${i}`} />
          </span>
        ))}
      </div>
      {(m.link || m.file) && (
        <div className="mm-extras">
          {m.link && (
            <span className="mm-part-wrap">
              <button {...partProps("link", `Link: ${m.link.text}. ${seen("link") ? `It really goes to ${host(m.link.to)}.` : "Press the magnifier to see where it really goes."}`)}>
                <span className="mm-chip-icon" aria-hidden="true"><LinkIcon /></span>
                <span className="mm-chip-text">
                  <span className="mm-link-text">{m.link.text}</span>
                  <span className={`mm-addr ${seen("link") ? "is-seen" : ""}`}>{seen("link") ? `goes to ${host(m.link.to)}` : "goes to: tap to check"}</span>
                </span>
              </button>
              <Tag id="link" />
            </span>
          )}
          {m.file && (
            <span className="mm-part-wrap">
              <button {...partProps("file", `File: ${m.file.name}`)}>
                <span className="mm-chip-icon" aria-hidden="true"><FileIcon /></span>
                <span className="mm-chip-text"><span className="mm-link-text">{m.file.name}</span></span>
              </button>
              <Tag id="file" />
            </span>
          )}
        </div>
      )}
    </article>
  );

  // ---------- side: bins / options / done ----------
  const binButton = (bin: Bin) => {
    const out = st.eliminated.includes(bin) && !inbox;
    const right = solved && st.lastAnswer === bin;
    const model = modelShown && !inbox && ex.answer.kind === "choice" && ex.answer.correct === bin && canAct;
    const inside = inbox ? d.msgs.filter((x) => sh.assign[x.id] === bin) : [];
    return (
      <div key={bin} className={`mm-bin-wrap is-${bin}`}>
        <button
          type="button"
          className={`mm-bin is-${bin} ${sh.hot === bin ? "is-hot" : ""} ${lifted ? "is-ready" : ""} ${out ? "is-out" : ""} ${right ? "is-right" : ""} ${model ? "is-model" : ""}`}
          data-testid="choice"
          data-value={bin}
          data-mm-bin={bin}
          aria-label={BIN_ARIA[bin]}
          aria-disabled={!canAct || out || (inbox && sh.locked.includes(m.id))}
          onClick={(e) => isTap(e) && post(bin)}
        >
          <span className="mm-bin-art" aria-hidden="true">{bin === "safe" ? <SafeBagArt full={inside.length > 0 || right} /> : <AskDeskArt full={inside.length > 0 || right} />}</span>
          <span className="mm-bin-label">{BIN_LABEL[bin]}</span>
        </button>
        {inbox && inside.length > 0 && (
          <ul className="mm-binned bz-list" role="list" aria-label={`In ${BIN_LABEL[bin]}`}>
            {inside.map((x) => (
              <li key={x.id} className="bz-li">
              <button
                type="button"
                className={`mm-mini ${sh.locked.includes(x.id) ? "is-ok" : ""}`}
                data-testid="mm-binned"
                data-msg={x.id}
                aria-label={`${x.from}, in ${BIN_LABEL[bin]}.${sh.locked.includes(x.id) ? " Checked." : " Press to take it out"}`}
                aria-disabled={!canAct || sh.locked.includes(x.id)}
                onClick={() => unpost(x.id)}
              >
                <EnvelopeIcon />
              </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const options = d.mode === "action" ? ACTION_OPTIONS : d.mode === "verify" ? VERIFY_OPTIONS : null;
  const allSorted = inbox && d.msgs.every((x) => sh.assign[x.id]);
  const side = (
    <div className={`mm-side mode-${d.mode}`}>
      {(d.mode === "sort" || inbox) && <div className="mm-bins">{binButton("safe")}{binButton("ask")}</div>}
      {options && (
        <div className="mm-options" role="group" aria-label="What to do">
          {options.map((o) => {
            const out = st.eliminated.includes(o.id);
            const right = solved && st.lastAnswer === o.id;
            const model = modelShown && st.model === o.id && canAct;
            return (
              <div key={o.id} className="mm-option-row">
                <button
                  type="button"
                  className={`mm-option ${out ? "is-out" : ""} ${right ? "is-right" : ""} ${model ? "is-model" : ""} ${st.lastAnswer === o.id && st.phase === "feedback" && !st.feedback?.correct ? "is-wrong" : ""}`}
                  data-testid="choice"
                  data-value={o.id}
                  aria-label={o.text!}
                  aria-disabled={!canAct || out}
                  onClick={() => choose(o.id)}
                >
                  <span className="mm-option-icon" aria-hidden="true">{o.id === "tell" || o.id === "check" ? <GrownUpIcon /> : o.id === "read" || o.id === "ok" ? <TickIcon /> : <EnvelopeIcon open />}</span>
                  <span>{o.text}</span>
                </button>
                <button type="button" className="mm-say" data-testid="mm-say" aria-label={`Hear: ${o.text}`} onClick={() => { touch(); void audio.speak(o.say!); }}>
                  <SpeakerIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {clueMode && (
        <div className="mm-clue-tools">
          <button
            type="button"
            className={`mm-none ${sh.picks.includes(NONE) ? "is-picked" : ""} ${modelShown && m.safe ? "is-model" : ""} ${st.eliminated.includes(NONE) ? "is-out" : ""}`}
            data-testid="choice"
            data-value={NONE}
            aria-pressed={sh.picks.includes(NONE)}
            aria-label="No clues: it looks safe"
            aria-disabled={!canAct || st.eliminated.includes(NONE)}
            onClick={() => togglePick(NONE)}
          >
            <TickIcon /><span>No clues</span>
          </button>
          <button type="button" className={`mm-done ${sh.picks.length && canAct ? "is-ready" : ""} ${solved ? "is-right" : ""}`} data-testid="done" aria-label="Done: check my clues" aria-disabled={!canAct || !sh.picks.length} onClick={done}>
            Done
          </button>
        </div>
      )}
      {inbox && (
        <button type="button" className={`mm-done ${allSorted && canAct ? "is-ready" : ""} ${solved ? "is-right" : ""}`} data-testid="done" aria-label="Done: check my sorting" aria-disabled={!canAct || !allSorted} onClick={done}>
          Done
        </button>
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={`mm-stage ${wide ? "is-wide" : "is-tall"} mode-${d.mode} ${reducedMotion ? "still" : ""} ${solved ? "is-solved" : ""} ${modelShown ? "is-model" : ""} ${drag?.active ? "is-dragging" : ""}`}
      data-testid="mm-board"
      data-mode={d.mode}
      data-fold={d.fold ? "true" : "false"}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="mm-main">
        {inbox && (
          <ul className="mm-inbox bz-list" role="list" aria-label="Inbox">
            {d.msgs.map((x, i) => {
              const bin = sh.assign[x.id];
              const model = st.hintStage >= 2 && st.model && typeof st.model === "object" ? (st.model as Record<string, string>)[x.id] : undefined;
              return (
                <li key={x.id} className="bz-li mm-env-li">
                <button
                  type="button"
                  className={`mm-envelope ${i === sh.open ? "is-open" : ""} ${bin ? "is-sorted" : ""} ${sh.locked.includes(x.id) ? "is-ok" : ""} ${st.hintStage >= 1 && !bin && canAct ? "is-glow" : ""}`}
                  data-testid="mm-envelope"
                  data-msg={x.id}
                  data-bin={bin ?? ""}
                  aria-pressed={i === sh.open}
                  aria-label={`Message ${i + 1} from ${x.from}${bin ? `, in ${BIN_LABEL[bin]}` : ""}. Press to open and hear it`}
                  onClick={() => {
                    touch();
                    audio.play("tap", { gain: 0.4 });
                    set({ open: i, zoom: null });
                    void audio.speak(msgLine(x));
                  }}
                >
                  <span className="mm-env-art" aria-hidden="true"><EnvelopeIcon open={i === sh.open} /></span>
                  <span className="mm-env-from">{x.from}</span>
                  {model && <span className={`mm-tag ${model === "safe" ? "is-safe" : ""}`}>{BIN_LABEL[model as Bin]}</span>}
                </button>
                </li>
              );
            })}
          </ul>
        )}
        {card}
      </div>
      {side}
      <p className="sr-only" aria-live="polite" data-testid="mm-say-live">{say}</p>
    </div>
  );
}

/** Everything lives on the board; the tray is hidden for this world (CSS). */
export function MessageTray() {
  return <div className="mm-tray-empty" aria-hidden="true" />;
}

/** Clue mode helper for e2e/docs: the part ids that are clues. */
export const clueParts = (m: Msg) => partsOf(m).filter((p) => p.clue).map((p) => p.id);
export { linkIsClue };
