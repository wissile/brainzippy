import { useState } from "react";
import { DEFAULT_MONSTER, Monster, isMonsterConfig } from "../characters/Monster";
import type { MonsterSpec } from "./schema";

export function MonsterArt({ monster, size = 64, label = "" }: { monster: MonsterSpec | null | undefined; size?: number; label?: string }) {
  return <Monster config={isMonsterConfig(monster) ? monster : DEFAULT_MONSTER} size={size} label={label} />;
}

/** Parent gate: 2-digit × 1-digit multiplication (a speed bump for children, not a security control). */
const GATE_KEY = "bz.parentGate";
export function useParentGate() {
  const [passed, setPassed] = useState(() => {
    try {
      return sessionStorage.getItem(GATE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const pass = () => {
    try {
      sessionStorage.setItem(GATE_KEY, "1");
    } catch {
      /* memory only */
    }
    setPassed(true);
  };
  return { passed, pass };
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [gate] = useState(() => ({ a: 13 + Math.floor(Math.random() * 7), b: 6 + Math.floor(Math.random() * 4) }));
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <section className="pa-card pa-gate" aria-labelledby="pa-gate-title">
      <h2 id="pa-gate-title">Grown-ups only</h2>
      <p>This area is for parents and guardians.</p>
      <form
        className="gate"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(answer) === gate.a * gate.b) onPass();
          else {
            setWrong(true);
            setAnswer("");
          }
        }}
      >
        <label htmlFor="pa-gate-answer">
          What is {gate.a} × {gate.b}?
        </label>
        <input id="pa-gate-answer" data-testid="pa-gate-answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        <button type="submit" className="pa-btn primary" data-testid="pa-gate-ok">Continue</button>
        <button type="button" className="pa-btn" onClick={onCancel}>Back to the games</button>
      </form>
      {wrong && <p role="alert" className="pa-error">That's not quite it. Please try again.</p>}
    </section>
  );
}

/** Web Share API when available, otherwise copy to the clipboard. Text is always our fixed, authored wording. */
export async function shareLink(title: string, text: string, url: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared";
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

export function Toggle({ label, checked, onChange, testId, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string; hint?: string }) {
  return (
    <label className="pa-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
