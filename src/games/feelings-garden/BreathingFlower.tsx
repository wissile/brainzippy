import { useEffect, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { audio } from "../../audio/AudioEngine";
import { BreathFlowerArt } from "./art";

/**
 * Optional calm-down practice: a flower that opens while the child breathes in and closes while they breathe out.
 * The CHILD sets the pace (no timer on breathing in, never a score). Three ways to use it:
 *   hold the flower = breathe in, let go = breathe out ·
 *   tap once = breathe in, tap again = breathe out (no holding needed) ·
 *   keyboard Enter/Space = the same as a tap.
 * Reduced motion: the flower does not grow; the petals light up and the words change instead.
 * Labelled "calm-down practice" in the grown-ups' notes; no claims about outcomes.
 */
type Phase = "rest" | "in" | "out";
const OUT_MS = 3500;
const HOLD_MS = 450;

export function BreathingFlower({ onClose, busy }: { onClose: () => void; busy: () => void }) {
  const { reducedMotion } = useApp();
  const [phase, setPhase] = useState<Phase>("rest");
  const [breaths, setBreaths] = useState(0);
  const downAt = useRef<number | null>(null);
  const wasIn = useRef(false);
  const phaseRef = useRef<Phase>("rest");
  phaseRef.current = phase;
  const outTimer = useRef<number | null>(null);
  const flowerRef = useRef<HTMLButtonElement>(null);
  const done = breaths >= 3;

  useEffect(() => {
    flowerRef.current?.focus({ preventScroll: true });
    void (async () => {
      await audio.speak("fg.breath.open");
      if (phaseRef.current === "rest") await audio.speak("fg.breath.how");
      if (phaseRef.current === "rest") await audio.speak("fg.breath.tap", {}, { interrupt: false });
    })();
    const keepAwake = window.setInterval(busy, 2500); // the game's idle helper waits while the child breathes
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(keepAwake);
      window.removeEventListener("keydown", onKey);
      if (outTimer.current) window.clearTimeout(outTimer.current);
      audio.stopVoice();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const breatheIn = () => {
    if (done || phaseRef.current === "in") return;
    if (outTimer.current) window.clearTimeout(outTimer.current);
    setPhase("in");
    void audio.speak("fg.breath.in");
  };
  const breatheOut = () => {
    if (phaseRef.current !== "in") return;
    setPhase("out");
    void audio.speak("fg.breath.out");
    outTimer.current = window.setTimeout(() => {
      setPhase("rest");
      setBreaths((b) => {
        const next = b + 1;
        if (next === 3) {
          audio.play("star");
          void audio.speak("fg.breath.done");
        }
        return next;
      });
    }, reducedMotion ? 1800 : OUT_MS);
  };
  const toggle = () => (phaseRef.current === "in" ? breatheOut() : breatheIn());

  const word = done ? "Your flower is open!" : phase === "in" ? "Breathe in…" : phase === "out" ? "Breathe out…" : breaths === 0 ? "Hold or tap the flower" : "Again, slowly";
  return (
    <div className="fg-breath" role="dialog" aria-modal="true" aria-label="Breathing flower" data-testid="breath">
      <div className={`fg-breath-card phase-${phase} ${done ? "is-done" : ""} ${reducedMotion ? "still" : ""}`}>
        <button
          ref={flowerRef}
          type="button"
          className="fg-breath-flower"
          data-testid="breath-flower"
          data-phase={phase}
          data-breaths={breaths}
          aria-label={done ? "Your flower is open. Three slow breaths" : phase === "in" ? "Breathing in. Let go or press again to breathe out" : "Hold to breathe in, or press once. Then let go, or press again, to breathe out"}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            busy();
            downAt.current = performance.now();
            wasIn.current = phaseRef.current === "in";
            if (!wasIn.current) breatheIn();
          }}
          onPointerUp={() => {
            if (downAt.current === null) return;
            const held = performance.now() - downAt.current >= HOLD_MS;
            downAt.current = null;
            // second tap while breathing in, or letting go after a hold → breathe out; a quick first tap keeps breathing in
            if (wasIn.current || held) breatheOut();
          }}
          onPointerCancel={() => {
            downAt.current = null;
          }}
          onClick={(e) => {
            if (e.detail === 0) toggle(); // keyboard: Enter / Space
          }}
        >
          <span className="fg-breath-grow"><BreathFlowerArt breaths={breaths} /></span>
        </button>
        <p className="fg-breath-word" aria-live="polite">{word}</p>
        <div className="fg-breath-dots" aria-label={`${breaths} of 3 breaths`} role="img">
          {[0, 1, 2].map((i) => <span key={i} className={i < breaths ? "is-on" : ""} />)}
        </div>
        <button type="button" className="fg-breath-close" data-testid="breath-close" aria-label={done ? "Done, back to the garden" : "Back to the garden"} onClick={onClose}>
          <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 12 L28 28 M28 12 L12 28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
}
