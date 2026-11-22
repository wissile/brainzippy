import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { FRIEND_NAME, type FaceId, type FriendSpot, isAction, optionText } from "./bank";
import { FlowerBed, FlowerFace, GardenRow, IdeaCard, PETALS, ScenePicture } from "./art";
import { BreathingFlower } from "./BreathingFlower";
import { FeelingCritter, critterSkin } from "./critters";
import { acceptedByFriend, modelLine, optionLine, scenarioOf, usesCards } from "./logic";
import "./feelings-garden.css";

/**
 * Snug's Feelings Garden play board. A friend stands by their flower bed, with a scene bubble showing what
 * happened. The child brings a feeling flower (or an idea card) to the friend; the bed blooms when it fits.
 *
 * Bringing a flower: drag it onto the friend, OR tap it (it lifts and says its name) then tap the friend, OR
 * Tab to it + Enter, then Enter on the friend (focus jumps there for keyboard users). Two-friend items: give a
 * flower to each friend (tap a placed flower to take it back); it checks when both have one.
 * Hints (the runner's helper, Rumble, speaks first): first "not yet" → the flower floats back and dims, no
 * "wrong" sound (skin.missSfx is a neutral chime) and the friend stays as they are. Second → Snug names the
 * clue and a fitting feeling (modelled answer) while every flower that fits glows; the child still brings one.
 * The breathing flower (corner button) is optional calm-down practice and never blocks play.
 */
interface Drag {
  id: string;
  startX: number;
  startY: number;
  active: boolean;
  dx: number;
  dy: number;
  rect: { left: number; top: number; width: number; height: number };
}
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
let lastNavKey = -Infinity;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key.startsWith("Arrow")) lastNavKey = performance.now();
  }, true);
}

export function FgBoard({ st, act, busy: busyProp, progress }: BoardProps) {
  const busy = () => busyProp?.();
  const ex = st.exercise;
  const sc = scenarioOf(ex);
  const cards = usesCards(ex);
  const two = !!sc.second;
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
  const options = ex.answer.kind === "choice" ? ex.answer.options : ex.answer.kind === "match" ? ex.answer.targets : [];
  const accepted = acceptedByFriend(ex);
  const out = (id: string) => st.eliminated.includes(id);
  const modelOn = st.hintStage === 2 && canAct;
  const spots: FriendSpot[] = [{ friend: sc.friend, face: sc.face, pose: sc.pose, accepted: sc.accepted as FriendSpot["accepted"] }, ...(sc.second ? [sc.second] : [])];

  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const [saying, setSaying] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(-Infinity);
  const [breathOpen, setBreathOpen] = useState(false);

  // ---------------------------------------------------------------- speech
  const nameToken = useRef(0);
  const say = (id: string) => {
    nameToken.current++;
    setSaying(id);
    void audio.speak(optionLine(id)).then(() => setSaying((s) => (s === id ? null : s)));
  };
  const stopNaming = () => {
    nameToken.current++;
  };

  // Pre-readers: name the idea cards (and the 2–4 flowers of the early levels) once the prompt and helper are done.
  const autoName = cards || sc.level <= 4;
  useEffect(() => {
    if (!autoName || audio.isMuted()) return;
    const at = Date.now();
    let seen = false;
    let quietSince = 0;
    const id = window.setInterval(() => {
      const s = stRef.current;
      if (speakingRef.current) {
        seen = true;
        quietSince = 0;
        return;
      }
      if (s.phase !== "answering" || document.querySelector('[data-testid="helper"]') || (!seen && Date.now() - at < 3000)) {
        quietSince = 0;
        return;
      }
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince < 350) return;
      window.clearInterval(id);
      const token = ++nameToken.current;
      void (async () => {
        for (const o of options) {
          if (token !== nameToken.current || stRef.current.phase !== "answering") break;
          if (stRef.current.eliminated.includes(o.id)) continue;
          setSaying(o.id);
          busy();
          await audio.speak(optionLine(o.id));
          await sleep(180);
        }
        if (token === nameToken.current) setSaying(null);
      })();
    }, 120);
    return () => window.clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    nameToken.current++;
  }, []);

  // ---------------------------------------------------------------- answers
  const submit = (value: string | Record<string, string>) => {
    stopNaming();
    setSelected(null);
    act({ type: "SUBMIT", value });
  };
  const focusEl = (sel: string) => (rootRef.current?.querySelector(sel) as HTMLElement | null)?.focus({ preventScroll: true });
  const firstOpenFriend = () => spots.find((s) => !placedRef.current[s.friend])?.friend ?? spots[0]!.friend;

  /** Bring option `id` to friend `friend` (drop, tap-tap or keyboard). */
  const drop = (id: string, friend: string) => {
    if (!canAct || out(id)) return;
    busy();
    if (!two) return submit(id);
    const next = { ...placedRef.current, [friend]: id };
    setPlaced(next);
    setSelected(null);
    audio.play("drop", { gain: 0.5 });
    if (spots.every((s) => next[s.friend])) submit(next);
    else if (lastKeyboard.current) window.setTimeout(() => focusEl('[data-testid="choice"]:not([aria-disabled="true"])'), 30);
  };

  const lastKeyboard = useRef(false);
  const pick = (id: string, keyboard: boolean) => {
    lastKeyboard.current = keyboard;
    say(id);
    if (!canAct || out(id)) return;
    busy();
    audio.play("pickup", { gain: 0.45 });
    setSelected((s) => (s === id ? null : id));
    if (keyboard) window.setTimeout(() => focusEl(`[data-testid="friend"][data-friend="${firstOpenFriend()}"]`), 30);
  };

  const tapFriend = (friend: string, keyboard: boolean) => {
    lastKeyboard.current = keyboard;
    if (selected && canAct) return drop(selected, friend);
    if (two && placed[friend] && canAct) {
      busy();
      audio.play("pickup", { gain: 0.4 });
      setPlaced((p) => {
        const n = { ...p };
        delete n[friend];
        return n;
      });
      return;
    }
    if (canAct) void audio.speak(cards ? "fg.pickcard" : "fg.pick");
  };

  // After a miss: two-friend items keep the right flowers; everyone else's floats back.
  useEffect(() => {
    if (st.phase !== "answering" || st.attempts === 0) return;
    if (two) setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([f]) => st.check?.parts?.[f])));
    if (st.hintStage === 2) {
      // modelled answer: Snug names the clue and a fitting feeling (spec §4.6), every fitting flower glows
      stopNaming();
      void audio.speak(modelLine(ex));
    }
  }, [st.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- drag
  const zoneAt = (x: number, y: number): string | null => {
    let best: { z: string; d: number } | null = null;
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>("[data-fg-zone]") ?? []) {
      const r = el.getBoundingClientRect();
      const m = 24;
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) continue;
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (!best || d < best.d) best = { z: el.dataset.fgZone!, d };
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
        audio.play("pickup", { gain: 0.45 });
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
  const clickGuard = (e: React.MouseEvent) => e.timeStamp - suppressClick.current < 80;

  // ---------------------------------------------------------------- render helpers
  const trying = st.phase === "feedback" || st.phase === "solved" ? st.lastAnswer : null;
  const tryingFor = (friend: string): string | null => {
    if (two) return (trying && typeof trying === "object" && !Array.isArray(trying) ? (trying as Record<string, string>)[friend] : null) ?? placed[friend] ?? null;
    return typeof trying === "string" ? trying : null;
  };
  const isModel = (id: string) => modelOn && (two ? Object.values(accepted).some((a) => a.includes(id)) : !out(id));
  const petalOf = (id: string) => PETALS[Math.max(0, options.findIndex((o) => o.id === id)) % PETALS.length]!;

  const optionArt = (id: string, small = false) =>
    isAction(id) ? (
      <span className={`fg-card ${small ? "is-small" : ""}`}><IdeaCard id={id} /></span>
    ) : (
      <span className="fg-flower"><FlowerFace feeling={id as FaceId} petal={petalOf(id)} /></span>
    );

  const friendFace = (spot: FriendSpot): FaceId => {
    if (solved && (sc.cue === "help" || sc.cue === "calm")) return "content"; // a kind or calm idea helped
    return spot.face;
  };

  const optionLabel = (id: string) => {
    const name = optionText(id);
    if (out(id)) return `${name}. Not this one`;
    if (isAction(id)) return `Idea card: ${name}. Press to pick it, then press ${FRIEND_NAME[sc.friend]}`;
    return two ? `${name} flower. Press to pick it, then press a friend` : `${name} flower. Press to pick it, then press ${FRIEND_NAME[sc.friend]}`;
  };

  const friendLabel = (spot: FriendSpot) => {
    const name = FRIEND_NAME[spot.friend];
    const p = placed[spot.friend];
    if (selected && canAct) return `${name}. Press to give the ${optionText(selected).toLowerCase()} ${isAction(selected) ? "idea" : "flower"} to ${name}`;
    if (two && p && canAct) return `${name} has the ${optionText(p).toLowerCase()} flower. Press to take it back`;
    return sc.view === "back" ? `${name}, turned away` : `${name}`;
  };

  const n = options.length;
  return (
    <div
      ref={rootRef}
      className={`fg-stage cue-${sc.cue} ${cards ? "has-cards" : "has-flowers"} ${two ? "is-two" : ""} ${solved ? "is-solved" : ""} ${modelOn ? "is-model-on" : ""} ${reducedMotion ? "still" : ""}`}
      data-testid="fg-board"
      data-cue={sc.cue}
      data-level={sc.level}
      style={{ "--n": n, "--row": n <= 4 ? n : 3 } as React.CSSProperties}
    >
      <p className="sr-only">{ex.a11yDescription}</p>
      <div className={`fg-scene ${sc.prop ? "has-bubble" : ""}`}>
        {sc.prop && (
          <div className="fg-bubble" aria-hidden="true">
            <ScenePicture id={sc.prop} />
          </div>
        )}
        <div className="fg-friends">
          {spots.map((spot) => {
            const t = tryingFor(spot.friend);
            const right = solved || (two && !!st.check?.parts?.[spot.friend] && st.attempts > 0 && !!placed[spot.friend]);
            const missing = wrongNow && (!two || !st.check?.parts?.[spot.friend]);
            return (
              <button
                key={spot.friend}
                type="button"
                className={`fg-friend ${hot === spot.friend ? "is-hot" : ""} ${selected && canAct ? "is-ready" : ""} ${right ? "is-bloom" : ""}`}
                data-testid="friend"
                data-friend={spot.friend}
                data-fg-zone={spot.friend}
                data-filled={placed[spot.friend] ? "true" : "false"}
                aria-label={friendLabel(spot)}
                onClick={(e) => {
                  if (!clickGuard(e)) tapFriend(spot.friend, e.detail === 0);
                }}
              >
                <span className="fg-critter-wrap">
                  <FeelingCritter friend={spot.friend} face={friendFace(spot)} pose={solved && (sc.cue === "help" || sc.cue === "calm") ? "relaxed" : spot.pose} view={sc.view} label="" />
                  {right && <span className="fg-heart" aria-hidden="true" />}
                </span>
                <span className="fg-bed">
                  <FlowerBed bloom={right} colour={critterSkin(spot.friend)} />
                  {t && (
                    <span className={`fg-planted ${missing && wrongNow ? "is-wrong" : ""} ${right ? "is-right" : ""}`} aria-hidden="true">
                      {optionArt(t, true)}
                    </span>
                  )}
                </span>
                {two && <span className="fg-name" aria-hidden="true">{FRIEND_NAME[spot.friend]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="fg-options" data-fg-idle role="group" aria-label={cards ? "Idea cards" : "Feeling flowers"}>
        {options.map((o, i) => {
          const disabled = out(o.id) || !canAct;
          const away = !two && typeof trying === "string" && trying === o.id;
          return (
            <button
              key={o.id}
              type="button"
              className={[
                "fg-option",
                selected === o.id ? "is-picked" : "",
                out(o.id) ? "is-out" : "",
                isModel(o.id) ? "is-model" : "",
                saying === o.id ? "is-saying" : "",
                drag?.active && drag.id === o.id ? "is-dragging" : "",
                away ? "is-away" : "",
              ].join(" ")}
              style={{ "--i": i } as React.CSSProperties}
              data-testid="choice"
              data-value={o.id}
              aria-pressed={selected === o.id}
              aria-disabled={disabled}
              aria-label={optionLabel(o.id)}
              onPointerDown={(e) => {
                if (!canAct || out(o.id) || e.button !== 0) return;
                const r = e.currentTarget.getBoundingClientRect();
                const d: Drag = { id: o.id, startX: e.clientX, startY: e.clientY, active: false, dx: 0, dy: 0, rect: { left: r.left, top: r.top, width: r.width, height: r.height } };
                dragRef.current = d;
                setDrag(d);
              }}
              onFocus={() => {
                if (performance.now() - lastNavKey < 600) say(o.id);
              }}
              onClick={(e) => {
                if (!clickGuard(e)) pick(o.id, e.detail === 0);
              }}
            >
              {optionArt(o.id)}
              <span className="fg-label">{optionText(o.id)}</span>
            </button>
          );
        })}
      </div>
      <GardenRow done={progress?.done ?? 0} total={progress?.total ?? 8} />
      <button
        type="button"
        className={`fg-breath-open ${solved && typeof trying === "string" && trying === "breathe" ? "is-invite" : ""}`}
        data-testid="breath-open"
        aria-label="Breathing flower: breathe slowly with a flower"
        onClick={() => {
          busy();
          stopNaming();
          setBreathOpen(true);
        }}
      >
        <BreathIcon />
      </button>
      {breathOpen && <BreathingFlower busy={busy} onClose={() => {
        setBreathOpen(false);
        window.setTimeout(() => focusEl('[data-testid="breath-open"]'), 30);
      }} />}
      {drag?.active &&
        createPortal(
          <div className="fg-ghost" aria-hidden="true" style={{ left: drag.rect.left, top: drag.rect.top, width: drag.rect.width, height: drag.rect.height, transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(-6deg) scale(1.06)` }}>
            {optionArt(drag.id)}
          </div>,
          document.body,
        )}
    </div>
  );
}

function BreathIcon() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true" className="fg-tulip">
      <path d="M30 34 L30 56" stroke="#3E8E41" strokeWidth="5" strokeLinecap="round" />
      <path d="M30 48 C38 40 46 42 48 44 C42 52 36 52 30 48 Z" fill="#5DBB63" stroke="#2B2140" strokeWidth="2.5" />
      <path d="M16 14 L23 22 L30 10 L37 22 L44 14 C46 30 40 38 30 38 C20 38 14 30 16 14 Z" fill="#FF9EC4" stroke="#2B2140" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M8 26 Q2 30 8 34 M52 26 Q58 30 52 34" fill="none" stroke="#7CB7E8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Answers live on the board; the tray is empty (collapsed by CSS). */
export function FgTray(_p: BoardProps) {
  return <div className="fg-tray" aria-hidden="true" />;
}
