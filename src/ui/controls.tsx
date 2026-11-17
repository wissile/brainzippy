import { audio } from "../audio/AudioEngine";
import { useApp } from "../app/AppContext";
import { IconBack, IconHome, IconSound } from "./icons";

export function SoundButton() {
  const { muted, toggleMute } = useApp();
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
      aria-pressed={!muted}
      data-testid="sound-toggle"
      onClick={() => {
        toggleMute();
        if (muted) window.setTimeout(() => audio.play("tap"), 30);
      }}
    >
      <IconSound on={!muted} />
    </button>
  );
}

export function NavButton({ to, kind = "home", label }: { to: string; kind?: "home" | "back"; label: string }) {
  const { navigate } = useApp();
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      data-testid={`nav-${kind}`}
      onClick={() => {
        audio.play("tap");
        navigate(to);
      }}
    >
      {kind === "home" ? <IconHome /> : <IconBack />}
    </button>
  );
}

/** Speech bubble that mirrors the current spoken line (always visible: the caption IS the no-audio alternative). */
export function SpeechBubble({ text, className = "", tail = "left" }: { text: string; className?: string; tail?: "left" | "down" }) {
  if (!text) return null;
  return (
    <div className={`speech-bubble tail-${tail} ${className}`} data-testid="speech-bubble">
      {text}
    </div>
  );
}
