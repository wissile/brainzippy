import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { Lantern, NoIcon, PAPER, SleepyBasket, YesIcon } from "./art";
import { correctIds, lanternsOf, modelWordAt, modelWords, namingWords, slowLine, wordLine } from "./logic";
import { rhymes } from "./words";
import "./rhyme-lanterns.css";

/**
 * Hoot's Rhyme Lanterns play board. A night-forest string with Hoot's lantern (and empty hooks), and the
 * child's picture lanterns. Every picture is spoken when tapped or keyboard-focused, and named in turn when
 * an exercise starts (and again after a miss), so no reading is needed.
 *
 * Moving a lantern: drag it onto a hook / the basket, OR tap it (it lifts and says its word) then tap the
 * hook, OR Tab to it + Enter, then Enter on the hook (focus jumps there for keyboard users).
 * Modes (generator.ts): yesno (two lanterns + yes/no lanterns) · pick (hang the rhyme next to Hoot's) ·
 * odd (put the one that does not rhyme in the basket) · chain (fill every hook with rhymes; submits when full).
 * Hints: first miss → the helper explains, the wrong lantern greys out, and the words are named again SLOWLY.
 * Second miss → Hoot says the model words slowly (count-along steps) while the rhyming lanterns light up;
 * the right lantern shines (is-model) and the child still moves it (errorless).
 */
type Zone = "slot" | "basket" | "yes" | "no" | `slot-${number}`;
interface Drag {
  id: string;
  startX: number;
  startY: number;
  active: boolean;
  dx: number;
  dy: number;
  rect: { left: number; top: number; width: number; height: number } | null;
}
interface NameRequest {
  id: number;
  slow: boolean;
  /** wait until the runner's spoken prompt has started and finished */
  afterPrompt: boolean;
  at: number;
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
let lastNavKey = -Infinity;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key.startsWith("Arrow")) lastNavKey = performance.now();
  }, true);
}

export function RhymeBoard({ st, act, alongIndex, busy: busyProp, progress }: BoardProps) {
  const busy = () => busyProp?.();
  const ex = st.exercise;
  const L = lanternsOf(ex);
  const { speaking, reducedMotion } = useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const stRef = useRef(st);
  stRef.current = st;
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  const canAct = st.phase === "answering";
  const fb = st.feedback;
  const solved = st.phase === "solved" || (st.phase === "feedback" && !!fb?.correct);
  const wrongNow = st.phase === "feedback" && fb?.correct === false;
  const right = correctIds(ex);
  const out = (id: string) => st.eliminated.includes(id);
  const isModel = (id: string) => st.hintStage === 2 && canAct && right.includes(id);

  const [selected, setSelected] = useState<string | null>(null);
  const holes = L.mode === "chain" ? L.links - 1 : 1;
  const [placed, setPlaced] = useState<(string | null)[]>(() => Array.from({ length: holes }, () => null));
  const [saying, setSaying] = useState<string | null>(null);
  const [lit, setLit] = useState<string[]>([]);
  const [sleepy, setSleepy] = useState<string[]>([]);
  const [hot, setHot] = useState<Zone | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(-Infinity);

  // ---------------------------------------------------------------- speech
  const nameToken = useRef(0);
  const [nameReq, setNameReq] = useState<NameRequest | null>(() => ({ id: 1, slow: false, afterPrompt: true, at: Date.now() }));
  const say = (w: string, slow = false) => {
    nameToken.current++;
    setNameReq(null);
    setSaying(w);
    void audio.speak(slow ? slowLine(w) : wordLine(w)).then(() => setSaying((s) => (s === w ? null : s)));
  };
  const stopNaming = () => {
    nameToken.current++;
    setNameReq(null);
  };

  // Name every picture in turn once the runner's prompt (and any helper) has finished.
  useEffect(() => {
    if (!nameReq) return;
    if (audio.isMuted()) {
      setNameReq(null); // captions-only play: tap any lantern to see its word; no long caption parade
      return;
    }
    let seen = !nameReq.afterPrompt;
    let quietSince = 0;
    const id = window.setInterval(() => {
      const s = stRef.current;
      if (speakingRef.current) {
        seen = true;
        quietSince = 0;
        return;
      }
      const helper = document.querySelector('[data-testid="helper"]');
      if (s.phase !== "answering" || helper || (!seen && Date.now() - nameReq.at < 3000)) {
        quietSince = 0;
        return;
      }
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince < 350) return;
      window.clearInterval(id);
      const token = ++nameToken.current;
      const words = namingWords(s.exercise, s.eliminated, placedRef.current.filter((w): w is string => !!w));
      void (async () => {
        for (const w of words) {
          if (token !== nameToken.current || stRef.current.phase !== "answering") break;
          setSaying(w);
          busy();
          await audio.speak(nameReq.slow ? slowLine(w) : wordLine(w));
          await sleep(200);
        }
        if (token === nameToken.current) {
          setSaying(null);
          setNameReq(null);
        }
      })();
    }, 120);
    return () => window.clearInterval(id);
  }, [nameReq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    nameToken.current++;
  }, []);

  // "Hear it again" replays the prompt; name the pictures again after it.
  useEffect(() => {
    const btn = document.querySelector('[data-testid="replay"]');
    const onReplay = () => setNameReq({ id: Date.now(), slow: false, afterPrompt: true, at: Date.now() });
    btn?.addEventListener("click", onReplay);
    return () => btn?.removeEventListener("click", onReplay);
  }, []);

  // ---------------------------------------------------------------- answers
  const placedRef = useRef(placed);
  placedRef.current = placed;

  const submit = (value: string | string[]) => {
    stopNaming();
    setSelected(null);
    act({ type: "SUBMIT", value });
  };

  const focusEl = (sel: string) => (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });

  /** Put lantern `id` on a zone (drop, tap-tap or keyboard). */
  const drop = (id: string | null, zone: Zone) => {
    if (!canAct) return;
    busy();
    if (zone === "yes" || zone === "no") return out(zone) ? undefined : submit(zone);
    if (!id || out(id)) return;
    if (L.mode === "pick" && zone === "slot") return submit(id);
    if (L.mode === "odd" && zone === "basket") return submit(id);
    if (L.mode === "chain" && zone.startsWith("slot")) {
      if (placed.includes(id)) return;
      const want = zone.startsWith("slot-") ? Number(zone.slice(5)) : -1;
      const next = [...placed];
      const at = want >= 0 && !next[want] ? want : next.indexOf(null);
      if (at < 0) return;
      next[at] = id;
      setPlaced(next);
      setSelected(null);
      audio.play("drop", { gain: 0.6 });
      audio.playCount(next.filter(Boolean).length);
      if (next.every(Boolean)) submit(next as string[]);
      return;
    }
  };

  const pick = (id: string, keyboard: boolean) => {
    if (!canAct || out(id)) {
      say(id);
      return;
    }
    busy();
    audio.play("pickup", { gain: 0.5 });
    setSelected((s) => (s === id ? null : id));
    say(id);
    if (keyboard) {
      // keep keyboard users flowing: jump to where the lantern goes
      window.setTimeout(() => {
        if (L.mode === "odd") focusEl('[data-testid="basket"]');
        else if (L.mode === "chain") focusEl('[data-testid="slot"][data-filled="false"]');
        else if (L.mode === "pick") focusEl('[data-testid="slot"]');
      }, 30);
    }
  };

  const tapZone = (zone: Zone, hear?: string) => {
    if (selected && canAct) return drop(selected, zone);
    if (hear) return say(hear);
    if (zone === "basket") void audio.speak("rl.basket");
    else if (zone.startsWith("slot")) void audio.speak("rl.slot");
  };

  // Chain: after a miss keep the right lanterns on their hooks and send the others back.
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    if (L.mode === "chain") setPlaced((p) => p.map((w) => (w && right.includes(w) && !!st.check?.parts?.[w] ? w : null)));
    if (st.hintStage === 1) setNameReq({ id: Date.now(), slow: true, afterPrompt: false, at: Date.now() });
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Model (second miss): Hoot says the model words slowly while the rhyming lanterns light up one by one.
  useEffect(() => {
    if (alongIndex < 0) return;
    const w = modelWordAt(ex, alongIndex);
    if (!w) return;
    stopNaming();
    setSelected(null);
    if (L.mode === "chain") setPlaced((p) => p.map((x) => (x && right.includes(x) ? x : null)));
    const first = modelWords(ex)[0]!;
    if (w === first || rhymes(first, w)) setLit((l) => (l.includes(w) ? l : [...l, w]));
    else setSleepy((s) => (s.includes(w) ? s : [...s, w]));
    setSaying(w);
    void audio.speak(slowLine(w)).then(() => setSaying((s) => (s === w ? null : s)));
  }, [alongIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- drag
  const zones = () => [...(rootRef.current?.querySelectorAll<HTMLElement>("[data-rl-zone]") ?? [])];
  const zoneAt = (x: number, y: number): Zone | null => {
    let best: { z: Zone; d: number } | null = null;
    for (const el of zones()) {
      const r = el.getBoundingClientRect();
      const m = 28;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (!best || d < best.d) best = { z: el.dataset.rlZone as Zone, d };
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
        stopNaming();
        busy();
        audio.play("pickup", { gain: 0.5 });
      }
      const next = { ...d, active, dx, dy };
      dragRef.current = next;
      if (active) {
        setDrag(next);
        setHot(zoneAt(e.clientX, e.clientY));
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
      if (z) drop(d.id, z);
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

  const dragProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!canAct || out(id) || e.button !== 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      const d: Drag = { id, startX: e.clientX, startY: e.clientY, active: false, dx: 0, dy: 0, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
      dragRef.current = d;
      setDrag(d);
    },
  });
  const clickGuard = (e: React.MouseEvent) => e.timeStamp - suppressClick.current < 80;
  const onFocusSay = (w: string) => () => {
    if (performance.now() - lastNavKey < 600) say(w);
  };

  // ---------------------------------------------------------------- tutorial trail (first drag levels)
  const showTrail = (L.mode === "pick" || L.mode === "chain") && canAct && st.attempts === 0 && !selected && !drag && (ex.difficulty <= 2 || (progress?.done ?? 0) === 0);
  const [trail, setTrail] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!showTrail) return setTrail(null);
    const place = () => {
      const root = rootRef.current?.getBoundingClientRect();
      const shelf = rootRef.current?.querySelector(".rl-shelf")?.getBoundingClientRect();
      const slot = rootRef.current?.querySelector('[data-testid="slot"]')?.getBoundingClientRect();
      if (!root || !shelf || !slot) return setTrail(null);
      const x1 = shelf.left + shelf.width / 2 - root.left;
      const y1 = shelf.top - root.top + 6;
      const x2 = slot.left + slot.width / 2 - root.left;
      const y2 = slot.bottom - root.top - 4;
      setTrail(`M${x1} ${y1} Q${(x1 + x2) / 2 + 40} ${(y1 + y2) / 2} ${x2} ${y2}`);
    };
    const t = window.setTimeout(place, 600);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, [showTrail]);

  // ---------------------------------------------------------------- render helpers
  const trying = st.phase === "feedback" && typeof st.lastAnswer === "string" ? st.lastAnswer : null;
  const isLit = (w: string) => lit.includes(w) || (solved && (w === L.target || right.includes(w) || (L.mode === "odd" && !right.includes(w))));

  const lanternBody = (word: string, paper: string, on: boolean, hoot = false, extra = "") => (
    <span className={`rl-lantern ${on ? "is-lit" : ""} ${saying === word ? "is-saying" : ""} ${sleepy.includes(word) ? "is-sleepy" : ""} ${extra}`}>
      <span className="rl-glow" aria-hidden="true" />
      <Lantern word={word} paper={paper} lit={on} hoot={hoot} />
      <span className="rl-wave" aria-hidden="true" />
    </span>
  );

  const shelfLantern = (w: string, i: number, where: "shelf" | "line") => {
    const gone = (solved || wrongNow) && trying === w && L.mode !== "chain";
    const isPlaced = L.mode === "chain" && placed.includes(w);
    const disabled = out(w) || !canAct;
    const cls = [
      "rl-item",
      selected === w ? "is-picked" : "",
      out(w) ? "is-out" : "",
      isModel(w) ? "is-model" : "",
      drag?.active && drag.id === w ? "is-dragging" : "",
      gone || isPlaced ? "is-away" : "",
    ].join(" ");
    return (
      <button
        key={w}
        type="button"
        className={cls}
        style={{ "--i": i } as React.CSSProperties}
        data-testid="choice"
        data-value={w}
        data-word={w}
        aria-pressed={selected === w}
        aria-disabled={disabled}
        aria-label={
          out(w)
            ? `${w} lantern, not this one`
            : L.mode === "odd"
              ? `${w} lantern. Press to pick it up, then press the basket if it does not rhyme`
              : `${w} lantern. Press to pick it up, then press the hook by Hoot's lantern`
        }
        {...dragProps(w)}
        onFocus={onFocusSay(w)}
        onClick={(e) => {
          if (clickGuard(e)) return;
          if (isPlaced) return;
          pick(w, e.detail === 0);
        }}
      >
        {lanternBody(w, PAPER[i % PAPER.length]!, isLit(w) && (where === "line" || !isPlaced))}
      </button>
    );
  };

  const hootLantern = (zone: Zone | null) => {
    const w = L.target!;
    return (
      <button
        type="button"
        className={`rl-hoot ${hot && zone && hot === zone ? "is-hot" : ""} ${selected && zone ? "is-ready" : ""}`}
        data-testid="target"
        data-word={w}
        {...(zone ? { "data-rl-zone": zone } : {})}
        aria-label={selected && zone ? `Hoot's lantern, ${w}. Press to hang the ${selected} lantern next to it` : `Hoot's lantern, ${w}. Press to hear it`}
        onFocus={onFocusSay(w)}
        onClick={(e) => {
          if (clickGuard(e)) return;
          if (zone) tapZone(zone, w);
          else say(w);
        }}
      >
        {lanternBody(w, "#FFD43B", isLit(w), true)}
      </button>
    );
  };

  const slot = (i: number) => {
    const zone: Zone = L.mode === "chain" ? `slot-${i}` : "slot";
    const w = L.mode === "chain" ? placed[i] : trying;
    const ok = !!w && L.mode === "chain" && st.attempts > 0 && !!st.check?.parts?.[w] && right.includes(w);
    const failing = !!w && wrongNow && (L.mode === "pick" || !right.includes(w));
    return (
      <button
        key={i}
        type="button"
        className={`rl-slot ${hot === zone ? "is-hot" : ""} ${selected && !w ? "is-ready" : ""} ${ok ? "is-ok" : ""} ${failing ? "is-wrong" : ""}`}
        data-testid="slot"
        data-slot={i}
        data-filled={w ? "true" : "false"}
        data-rl-zone={zone}
        aria-label={
          w
            ? `${w} lantern on the hook${L.mode === "chain" && canAct ? ". Press to take it back" : ""}`
            : selected
              ? `Empty hook. Press to hang the ${selected} lantern here`
              : "Empty hook next to Hoot's lantern"
        }
        onFocus={w ? onFocusSay(w) : undefined}
        onClick={(e) => {
          if (clickGuard(e)) return;
          if (w && L.mode === "chain" && canAct) {
            busy();
            audio.play("pickup", { gain: 0.4 });
            setPlaced((p) => p.map((x) => (x === w ? null : x)));
            return;
          }
          if (w) return say(w);
          tapZone(zone);
        }}
      >
        {w ? lanternBody(w, PAPER[Math.max(0, L.words.indexOf(w)) % PAPER.length]!, isLit(w) && !failing) : <span className="rl-lantern"><Lantern empty /></span>}
      </button>
    );
  };

  // ---------------------------------------------------------------- layout per mode
  let line: React.ReactNode;
  let lower: React.ReactNode;
  const lineCount = L.mode === "odd" ? L.words.length : L.mode === "chain" ? L.links : 2;
  if (L.mode === "yesno") {
    const b = L.candidate!;
    line = (
      <>
        {hootLantern(null)}
        <button
          type="button"
          className={`rl-cand ${drag?.active && drag.id === b ? "is-dragging" : ""}`}
          data-testid="candidate"
          data-word={b}
          aria-label={`Second lantern, ${b}. Press to hear it, or drag it onto yes or no`}
          {...dragProps(b)}
          onFocus={onFocusSay(b)}
          onClick={(e) => {
            if (!clickGuard(e)) say(b);
          }}
        >
          {lanternBody(b, PAPER[1]!, right[0] === "yes" && (solved || lit.includes(b)), false, solved && right[0] === "no" ? "is-sleepy" : "")}
        </button>
      </>
    );
    lower = (
      <div className="rl-yn" data-rl-idle>
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            className={`rl-yn-btn is-${v} ${hot === v ? "is-hot" : ""} ${out(v) ? "is-out" : ""} ${isModel(v) ? "is-model" : ""} ${trying === v ? (fb?.correct ? "is-right" : "is-wrong") : ""}`}
            data-testid="choice"
            data-value={v}
            data-rl-zone={v}
            aria-disabled={out(v) || !canAct}
            aria-label={v === "yes" ? `Yes, ${L.target} and ${b} rhyme` : `No, ${L.target} and ${b} do not rhyme`}
            onFocus={() => performance.now() - lastNavKey < 600 && void audio.speak(v === "yes" ? "rl.yes" : "rl.no")}
            onClick={() => drop(null, v)}
          >
            {v === "yes" ? <YesIcon /> : <NoIcon />}
          </button>
        ))}
      </div>
    );
  } else if (L.mode === "odd") {
    line = L.words.map((w, i) => shelfLantern(w, i, "line"));
    const inBasket = (solved || wrongNow) && trying ? trying : null;
    lower = (
      <button
        type="button"
        className={`rl-basket ${hot === "basket" ? "is-hot" : ""} ${selected ? "is-ready" : ""} ${inBasket && wrongNow ? "is-wrong" : ""}`}
        data-testid="basket"
        data-rl-zone="basket"
        data-rl-idle
        aria-label={selected ? `Basket. Press to put the ${selected} lantern in it` : "Basket for the lantern that does not rhyme"}
        onClick={(e) => {
          if (!clickGuard(e)) tapZone("basket");
        }}
      >
        {inBasket && (
          <span className="rl-basket-lantern">
            {lanternBody(inBasket, PAPER[L.words.indexOf(inBasket) % PAPER.length]!, false)}
          </span>
        )}
        <SleepyBasket />
      </button>
    );
  } else {
    line = (
      <>
        {hootLantern("slot")}
        {Array.from({ length: holes }, (_, i) => slot(i))}
      </>
    );
    lower = (
      <div className="rl-shelf" data-rl-idle style={{ "--n": L.words.length } as React.CSSProperties}>
        {L.words.map((w, i) => shelfLantern(w, i, "shelf"))}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`rl-stage mode-${L.mode} ${solved ? "is-solved" : ""} ${alongIndex >= 0 ? "is-teaching" : ""} ${reducedMotion ? "still" : ""}`}
      data-testid="rl-board"
      data-mode={L.mode}
      style={{ "--line": lineCount, "--count": L.words.length } as React.CSSProperties}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className="rl-line">
        <svg className="rl-rope" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 2 Q50 22 100 2" />
        </svg>
        {line}
      </div>
      <div className="rl-lower">{lower}</div>
      {trail && (
        <svg className="rl-trail" aria-hidden="true">
          <path d={trail} />
        </svg>
      )}
      {drag?.active &&
        drag.rect &&
        createPortal(
          <div
            className="rl-ghost"
            aria-hidden="true"
            style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, height: drag.rect.height, transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-5deg) scale(1.06)` }}
          >
            <span className="rl-lantern">
              <Lantern word={drag.id} paper={PAPER[Math.max(0, L.words.indexOf(drag.id)) % PAPER.length]!} />
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** The answers live on the board, so the tray is empty (and collapsed by CSS). */
export function RhymeTray(_p: BoardProps) {
  return <div className="rl-tray" aria-hidden="true" />;
}
