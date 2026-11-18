import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { loadState, saveState } from "../services/storage";

interface AppCtx {
  path: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  muted: boolean;
  toggleMute: () => void;
  musicOn: boolean;
  toggleMusic: () => void;
  audioReady: boolean;
  /** True once we know whether the browser allows sound without a tap (so a Start button never flashes). */
  audioChecked: boolean;
  unlockAudio: () => void;
  caption: string;
  speaking: boolean;
  reducedMotion: boolean;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [muted, setMuted] = useState(() => loadState().muted);
  const [musicOn, setMusicOn] = useState(() => loadState().music);
  useEffect(() => audio.setMusicOn(musicOn), [musicOn]);
  const toggleMusic = useCallback(() => {
    setMusicOn((m) => {
      saveState({ music: !m });
      return !m;
    });
  }, []);
  const [audioReady, setAudioReady] = useState(false);
  const [audioChecked, setAudioChecked] = useState(false);
  const [caption, setCaption] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);

  useEffect(() => {
    audio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onMq = () => setReducedMotion(mq?.matches ?? false);
    mq?.addEventListener?.("change", onMq);
    let linger = 0;
    const off = audio.onSpeech((s, c) => {
      setSpeaking(s);
      window.clearTimeout(linger);
      if (s) setCaption(c);
      else if (!c) setCaption(""); // speech was stopped (skip, leave, interrupt): clear at once
      // keep the caption on screen briefly after speech so slower readers (and muted players) can finish it
      else linger = window.setTimeout(() => setCaption(""), 1800);
    });
    return () => {
      window.removeEventListener("popstate", onPop);
      mq?.removeEventListener?.("change", onMq);
      off();
      window.clearTimeout(linger);
    };
  }, []);

  const unlockAudio = useCallback(() => {
    audio.unlock();
    setAudioReady(true);
  }, []);

  // Arriving from the landing page is a full page load: if the browser still allows sound, skip the extra "Start" tap.
  useEffect(() => {
    let live = true;
    void audio.canAutoUnlock().then((ok) => {
      if (!live) return;
      if (ok) unlockAudio();
      setAudioChecked(true);
    });
    return () => {
      live = false;
    };
  }, [unlockAudio]);

  // Any first tap anywhere unlocks audio (browsers require a user gesture).
  useEffect(() => {
    if (audioReady) return;
    const once = () => unlockAudio();
    window.addEventListener("pointerdown", once, { once: true });
    window.addEventListener("keydown", once, { once: true });
    return () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
  }, [audioReady, unlockAudio]);

  const navigate = useCallback((to: string, opts: { replace?: boolean } = {}) => {
    audio.stopVoice();
    setCaption("");
    if (opts.replace) window.history.replaceState(null, "", to);
    else window.history.pushState(null, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      saveState({ muted: !m });
      return !m;
    });
  }, []);

  const value = useMemo(
    () => ({ path, navigate, muted, toggleMute, musicOn, toggleMusic, audioReady, audioChecked, unlockAudio, caption, speaking, reducedMotion }),
    [path, navigate, muted, toggleMute, musicOn, toggleMusic, audioReady, audioChecked, unlockAudio, caption, speaking, reducedMotion],
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      {/* one live region for every screen: screen-reader users hear each spoken line */}
      <div className="sr-only" aria-live="polite" data-testid="live-caption">{caption}</div>
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
