import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import type { MascotState, SfxId } from "../engine/types";
import { SpeechBubble } from "../ui/controls";
import { IconPlay } from "../ui/icons";

/**
 * Cinematic story player. A story is a list of beats; each beat renders a scene (SVG/React), moves the
 * camera, plays an optional sound, and speaks one voice line shown as a subtitle. Children can tap to
 * advance and skip at any time; nothing waits on audio (every beat has a time cap).
 */
export type Camera = "wide" | "close" | "zoom-in" | "pan-left" | "pan-right" | "rise" | "shake";

export interface StoryBeat {
  line: string;
  vars?: Record<string, string | number>;
  /** Scene for this beat. `speaking` lets characters lip-flap; `beat` is the index (for continuity). */
  scene: (p: { speaking: boolean; beat: number }) => React.JSX.Element;
  camera?: Camera;
  sfx?: SfxId;
  /** Minimum time on screen (ms) even when muted. */
  holdMs?: number;
}

export function StoryPlayer({ beats, onDone, label = "Story", testId = "story" }: { beats: StoryBeat[]; onDone: () => void; label?: string; testId?: string }) {
  const { caption, speaking, audioReady, audioChecked, unlockAudio, reducedMotion } = useApp();
  const [i, setI] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const token = useRef(0);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    token.current++;
    audio.stopVoice();
    onDone();
  };

  useEffect(() => {
    const t = window.setTimeout(() => setCanSkip(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!audioReady) return;
    const beat = beats[i];
    if (!beat) return finish();
    const tk = ++token.current;
    if (beat.sfx) audio.play(beat.sfx);
    void (async () => {
      await Promise.all([audio.speak(beat.line, beat.vars ?? {}), new Promise((r) => window.setTimeout(r, beat.holdMs ?? 1600))]);
      if (tk !== token.current) return;
      await new Promise((r) => window.setTimeout(r, 450));
      if (tk === token.current) setI((x) => x + 1);
    })();
    return () => {
      token.current++;
    };
  }, [i, audioReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => audio.stopVoice(), []);

  const beat = beats[Math.min(i, beats.length - 1)];
  if (!beat) return null;
  return (
    <section
      className={`story cam-${beat.camera ?? "wide"} ${reducedMotion ? "still" : ""}`}
      aria-label={label}
      data-testid={testId}
      data-beat={i}
      onClick={() => {
        if (!audioReady) return;
        audio.play("tap", { gain: 0.3 });
        setI((x) => x + 1);
      }}
    >
      <div className="story-camera" key={i}>
        {beat.scene({ speaking, beat: i })}
      </div>
      <div className="letterbox top" aria-hidden="true" />
      <div className="letterbox bottom" aria-hidden="true" />
      <div className="subtitle" aria-live="off">
        {caption && <p>{caption}</p>}
      </div>
      <div className="story-dots" aria-hidden="true">
        {beats.map((_, k) => <i key={k} className={k <= i ? "on" : ""} />)}
      </div>
      {!audioReady ? (
        // shown only once we know the browser needs a tap for sound, so it never flashes before auto-start
        audioChecked && <button type="button" className="big-play story-start" data-testid={`${testId}-begin`} aria-label="Start the story" onClick={(e) => { e.stopPropagation(); unlockAudio(); audio.play("tap"); }}>
          <IconPlay />
        </button>
      ) : (
        canSkip && (
          <button type="button" className="story-skip" data-testid={`${testId}-skip`} aria-label="Skip the story" onClick={(e) => { e.stopPropagation(); finish(); }}>
            Skip ›
          </button>
        )
      )}
    </section>
  );
}

/** A helper character slides in to explain a concept, then slides out. */
export function HelperOverlay({
  Character, name, line, vars, onDone, captionInPrompt = false,
}: {
  Character: (p: { state: MascotState; talking?: boolean; size?: number | string }) => React.JSX.Element;
  name: string;
  line: string;
  vars?: Record<string, string | number>;
  onDone: () => void;
  /** The game shows the caption in its prompt pill (small screens): no bubble of its own, drawn in the mascot's spot. */
  captionInPrompt?: boolean;
}) {
  const { caption, speaking } = useApp();
  const [leaving, setLeaving] = useState(false);
  // The helper sits fixed in the top-right corner; on wide screens a long prompt pill reaches under its bubble.
  // When they would overlap, the helper steps down to just below the prompt pill (every game, every viewport).
  const box = useRef<HTMLDivElement>(null);
  const [below, setBelow] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (captionInPrompt) return;
    const place = () => {
      const el = box.current;
      const pill = document.querySelector<HTMLElement>(".prompt-pill");
      if (!el || !pill || getComputedStyle(el).position !== "fixed") return setBelow(null);
      const p = pill.getBoundingClientRect();
      // the layout box, not getBoundingClientRect: the helper-in slide (translateX 120%) is still at its first frame
      // here (also when a resize swaps the inline helper for the fixed one), which made it look "side by side"
      const h = { left: el.offsetLeft, right: el.offsetLeft + el.offsetWidth, top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight };
      if (!(h.left < p.right && p.left < h.right)) return setBelow(null); // side by side: the corner is free
      // once moved, stay below the pill (keep following its height); otherwise move only when they really overlap
      setBelow((old) => (old !== null || (h.top < p.bottom && p.top < h.bottom) ? Math.round(p.bottom + 10) : null));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [caption, captionInPrompt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    audio.play("whoosh");
    void (async () => {
      await new Promise((r) => window.setTimeout(r, 350));
      await Promise.all([audio.speak(line, vars ?? {}), new Promise((r) => window.setTimeout(r, 1500))]);
      if (!alive) return;
      setLeaving(true);
      window.setTimeout(() => alive && onDone(), 450);
    })();
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div ref={box} className={`helper ${captionInPrompt ? "inline" : ""} ${leaving ? "leaving" : ""}`} style={below !== null ? { top: below } : undefined} data-testid="helper" aria-label={`${name} explains`}>
      {!captionInPrompt && <SpeechBubble text={caption} tail="right" className="helper-bubble" />}
      <div className="helper-char">
        <Character state={speaking ? "encouraging" : "greeting"} talking={speaking} size="100%" />
      </div>
    </div>
  );
}
