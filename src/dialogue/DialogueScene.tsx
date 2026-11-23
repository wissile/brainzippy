import { useEffect, type CSSProperties, type ReactNode } from "react";
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
  /** Escape key skips (default true). */
  escapeSkips?: boolean;
  className?: string;
}

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
 */
export function DialogueScene({ dialogue, renderCharacter, speakers, onDone, play = true, voice, escapeSkips = true, className = "" }: DialogueSceneProps) {
  const d = typeof dialogue === "string" ? getDialogue(dialogue) : dialogue;
  const { caption, talking, ended, skip } = useDialogue(d, { play, voice, onDone });
  const cast = (speakers ?? (d ? dialogueSpeakers(d) : [])).slice(0, 3);

  useEffect(() => {
    if (!escapeSkips || ended) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escapeSkips, ended, skip]);

  if (!d) return null;
  const activeId = caption?.speaker.id;

  return (
    <section className={`dlg-scene ${className}`} data-testid="dialogue-scene" data-dialogue={d.id} aria-label="Characters talking">
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

      <div className="dlg-caption" role="status" aria-live="polite" aria-atomic="true" data-testid="dialogue-caption">
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
        <button type="button" className="dlg-skip" onClick={skip} aria-label="Skip the conversation" data-testid="dialogue-skip">
          <SkipIcon />
          <span className="dlg-skip-label">Skip</span>
        </button>
      )}
    </section>
  );
}
