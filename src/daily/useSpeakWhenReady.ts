import { useEffect, useRef } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";

/**
 * Speak a sequence of voice lines on mount. Captions always show at once (the no-audio alternative). If the
 * browser hasn't unlocked audio yet (e.g. after a full page load from the landing page), the sequence is
 * queued and voiced right after the first tap — unless `skip()` says that tap started something else (a
 * stop opening), so the first tap is never swallowed and never talked over.
 */
export function useSpeakWhenReady(lines: () => string[], skip: () => boolean = () => false, delayMs = 450) {
  const { audioReady } = useApp();
  const readyAtMount = useRef(audioReady);
  const replayed = useRef(false);
  const run = useRef(0);

  const play = (wait: number) => {
    const id = ++run.current;
    void (async () => {
      await new Promise((r) => window.setTimeout(r, wait));
      for (const line of lines()) {
        if (id !== run.current || skip()) return;
        await audio.speak(line);
      }
    })();
  };

  useEffect(() => {
    play(delayMs);
    return () => {
      run.current++;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!audioReady || readyAtMount.current || replayed.current) return;
    replayed.current = true;
    play(250); // after the click handler of the unlocking tap has run
  }, [audioReady]); // eslint-disable-line react-hooks/exhaustive-deps
}
