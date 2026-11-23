import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { getSpeaker, nameChipStyle } from "../audio/cast";
import type { MascotState } from "../engine/types";
import { dialogueSpeakers, getDialogue } from "./dialogues";
import type { Dialogue, DialogueEnd, DialogueVoice } from "./types";
import { useDialogue } from "./useDialogue";
import "./dialogue.css";

export interface ActorRenderProps {
  /** Pose: the beat's emote while speaking, "idle" while listening. */
  state: MascotState;
  /** Lip-flap: true only while this character's line plays. */
  talking: boolean;
  /** This character has the current line (also true in the short pause after it). */
  speaking: boolean;
}

export interface DialogueSceneProps {
  /** A dialogue or its id in dialogues.json. */
  dialogue: Dialogue | string;
  /** Draws one character. Pass size="100%" to fill the actor box, e.g. (id, p) => <Bobbo size="100%" {...p} />. */
  renderCharacter: (speakerId: string, props: ActorRenderProps) => ReactNode;
  /** Left-to-right stage order (2-3 ids). Default: speakers in order of first line. */
  speakers?: string[];
  /** Called when the dialogue completes or the child skips it. Not called on unmount. */
  onDone?: (reason: DialogueEnd) => void;
  /** Default true. */
  play?: boolean;
  /** Override the voice (tests). Default: AudioEngine. */
  voice?: DialogueVoice;
  /** Escape key skips (default true). Ignored while a modal dialog is open, on key repeat, or if already handled. */
  escapeSkips?: boolean;
  className?: string;
}

const NextIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
    <path d="M8 4l9 8-9 8z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const SkipIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
    <path d="M4 5l8 7-8 7z M12 5l8 7-8 7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

/**
 * A short conversation between 2-3 characters standing side by side. The speaker talks and does a small hop
 * (reduced motion: no hop, a highlight ring only); the others listen. The caption shows who is talking (name chip in
 * their colour) and what they say, in an aria-live region. Works muted (captions advance on a reading timer),
 * never blocks: Skip (or Escape) ends it at once.
 *
 * Timing (WCAG 2.2.1/2.2.2): lines advance on their own for unattended play, but Next (or tapping the caption)
 * advances at once, and hovering or focusing the caption/Next holds the current line until the pointer/focus leaves.
 * Focus: when Skip/Next disappear at the end, focus moves to the scene container (tabIndex -1) unless onDone already
 * moved it somewhere else, so keyboard users never drop to <body>.
 */
export function DialogueScene({ dialogue, renderCharacter, speakers, onDone, play = true, voice, escapeSkips = true, className = "" }: DialogueSceneProps) {
  const d = typeof dialogue === "string" ? getDialogue(dialogue) : dialogue;
  const rootRef = useRef<HTMLElement>(null);
  const focusWasInside = useRef(false);
  const handleDone = useCallback(
    (reason: DialogueEnd) => {
      // runs before React removes Skip/Next: remember whether keyboard focus was in the scene
      const root = rootRef.current;
      focusWasInside.current = Boolean(root && document.activeElement && root.contains(document.activeElement));
      onDone?.(reason);
    },
    [onDone],
  );
  const { caption, talking, ended, next, skip, pause, resume } = useDialogue(d, { play, voice, onDone: handleDone });
  const cast = (speakers ?? (d ? dialogueSpeakers(d) : [])).slice(0, 3);

  // hold auto-advance while the child hovers (mouse) or focuses the caption/Next panel
  const holds = useRef(new Set<"hover" | "focus">());
  const hold = useCallback(
    (why: "hover" | "focus", on: boolean) => {
      const h = holds.current;
      if (on) h.add(why);
      else h.delete(why);
      if (h.size) pause();
      else resume();
    },
    [pause, resume],
  );
  const onPointerEnter = (e: ReactPointerEvent) => e.pointerType === "mouse" && hold("hover", true);
  const onPointerLeave = (e: ReactPointerEvent) => e.pointerType === "mouse" && hold("hover", false);

  useEffect(() => {
    if (!ended) return;
    holds.current.clear();
    const lost = !document.activeElement || document.activeElement === document.body;
    if (focusWasInside.current && lost) rootRef.current?.focus({ preventScroll: true });
    focusWasInside.current = false;
  }, [ended]);

  useEffect(() => {
    if (!escapeSkips || ended) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.repeat || isEditable(e.target)) return;
      // a modal dialog (parent gate, settings...) owns Escape while it is open
      const modal = document.querySelector('[aria-modal="true"]');
      if (modal && !rootRef.current?.contains(modal)) return;
      e.preventDefault();
      skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escapeSkips, ended, skip]);

  if (!d) return null;
  const activeId = caption?.speaker.id;

  return (
    <section ref={rootRef} tabIndex={-1} className={`dlg-scene ${className}`} data-testid="dialogue-scene" data-dialogue={d.id} aria-label="Characters talking">
      <div className={`dlg-stage dlg-count-${cast.length}`}>
        {cast.map((id) => {
          const s = getSpeaker(id);
          const speaking = id === activeId;
          const state: MascotState = speaking ? (caption?.beat.emote ?? "encouraging") : "idle";
          return (
            <div
              key={id}
              className={`dlg-actor ${speaking ? "is-speaking" : activeId ? "is-listening" : ""}`}
              data-speaker={id}
              data-speaking={speaking ? "true" : "false"}
              style={{ "--dlg-color": s.color } as CSSProperties}
            >
              {/* keyed by beat so the hop replays on each new line */}
              <div className="dlg-body" key={speaking ? `beat-${caption?.index}` : "still"}>
                {renderCharacter(id, { state, talking: speaking && talking, speaking })}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="dlg-panel"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={() => hold("focus", true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hold("focus", false);
        }}
      >
      {/* tapping the caption = Next (pointer shortcut; the Next button is the keyboard/AT path) */}
      <div className="dlg-caption" role="status" aria-live="polite" aria-atomic="true" data-testid="dialogue-caption" onClick={caption ? next : undefined}>
        {caption && (
          <p className="dlg-line" data-speaker={caption.speaker.id}>
            <span className="dlg-name" style={nameChipStyle(caption.speaker.color)}>
              {caption.speaker.name}
            </span>
            <span className="sr-only"> says: </span>
            <span className="dlg-text">{caption.text}</span>
          </p>
        )}
      </div>
      {!ended && (
        <button type="button" className="dlg-next" onClick={next} aria-label="Next line" data-testid="dialogue-next" disabled={!caption}>
          <NextIcon />
        </button>
      )}
      </div>

      {!ended && (
        <button type="button" className="dlg-skip" onClick={skip} aria-label="Skip the conversation" data-testid="dialogue-skip">
          <SkipIcon />
          <span className="dlg-skip-label">Skip</span>
        </button>
      )}
    </section>
  );
}
