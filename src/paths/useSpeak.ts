import { useEffect, useRef } from "react";
import { useApp } from "../app/AppContext";
import { audio } from "../audio/AudioEngine";

export interface Say {
  id: string;
  vars?: Record<string, string | number>;
}

/**
 * Speak lines (with variables) on mount, like src/daily/useSpeakWhenReady: captions show at once; if audio is still
 * locked after a full page load, the lines are voiced after the first tap unless `skip()` says that tap moved on.
 */
export function useSpeakOnMount(lines: () => Say[], skip: () => boolean = () => false, delayMs = 450) {
  const { audioReady } = useApp();
  const readyAtMount = useRef(audioReady);
  const replayed = useRef(false);
  const run = useRef(0);
  const play = (wait: number) => {
    const id = ++run.current;
    void (async () => {
      await new Promise((r) => window.setTimeout(r, wait));
      for (const l of lines()) {
        if (id !== run.current || skip()) return;
        await audio.speak(l.id, l.vars);
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
    play(250);
  }, [audioReady]); // eslint-disable-line react-hooks/exhaustive-deps
}
