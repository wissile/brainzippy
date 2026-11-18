import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { DEFAULT_MONSTER, Monster } from "../characters/Monster";
import { loadState } from "../services/storage";
import { NavButton, SoundButton, SpeechBubble } from "../ui/controls";
import { currentDecision, markFirstPlay, onBillingChange, refreshEntitlement } from "./client";
import "./billing.css";

/**
 * Wraps every game. Decides from the device at once (no network wait). A background refresh can UNLOCK straight away
 * (a grown-up just paid) but only LOCKS at the next game open, so a round in progress is never cut off.
 * Children never see prices here: only a sleepy monster and a button that fetches a grown-up.
 */
export function PlayGate({ children }: { children: React.ReactNode }) {
  const [playable, setPlayable] = useState(() => {
    markFirstPlay();
    return currentDecision().playable;
  });
  const playableRef = useRef(playable);
  playableRef.current = playable;

  useEffect(() => {
    let live = true;
    const check = async () => {
      await refreshEntitlement();
      if (live && !playableRef.current && currentDecision().playable) setPlayable(true);
    };
    void check();
    const onVisible = () => document.visibilityState === "visible" && !playableRef.current && void check();
    document.addEventListener("visibilitychange", onVisible);
    const off = onBillingChange(() => !playableRef.current && currentDecision().playable && setPlayable(true));
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      off();
    };
  }, []);

  return playable ? <>{children}</> : <AskGrownUp />;
}

export function AskGrownUp() {
  const { navigate, caption, audioReady } = useApp();
  const st = loadState();
  const monster = { ...(st.profile.monster ?? DEFAULT_MONSTER), eyes: "sleepy" as const, mouth: "o" as const };
  useEffect(() => {
    if (!audioReady) return;
    const t = window.setTimeout(() => void audio.speak("paywall.askGrownUp"), 350);
    return () => window.clearTimeout(t);
  }, [audioReady]);
  return (
    <main className="screen bz-nap" data-testid="ask-grown-up">
      <div className="screen-top">
        <NavButton to="/map" kind="back" label="Back to the map" />
        <h1 className="screen-title">Time for a grown-up!</h1>
        <SoundButton />
      </div>
      <div className="bz-nap-scene" aria-hidden="true">
        <span className="bz-nap-z z1">z</span>
        <span className="bz-nap-z z2">z</span>
        <span className="bz-nap-z z3">Z</span>
        <div className="bz-nap-monster">
          <Monster config={monster} size={190} label="" />
        </div>
        <div className="bz-nap-pillow" />
      </div>
      <SpeechBubble text={caption || "Your monster is having a nap. Ask a grown-up to help you keep playing!"} className="bz-nap-bubble" tail="down" />
      <button
        type="button"
        className="big-play bz-nap-go"
        data-testid="ask-grown-up-go"
        aria-label="Get a grown-up"
        onClick={() => {
          audio.play("tap");
          navigate("/plan");
        }}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="17" cy="14" r="7" fill="#fff" stroke="#2B2140" strokeWidth="3" />
          <path d="M5 42 C5 30 11 24 17 24 C23 24 29 30 29 42 Z" fill="#fff" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="35" cy="22" r="5" fill="#FFD43B" stroke="#2B2140" strokeWidth="3" />
          <path d="M27 42 C27 34 31 30 35 30 C39 30 43 34 43 42 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />
        </svg>
        <span>Grown-up</span>
      </button>
    </main>
  );
}
