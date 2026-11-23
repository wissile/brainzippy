import { track } from "../analytics/track";
import { useState } from "react";
import { DAILY_LIMIT, getDailySettings, setDailyLimit } from "./settings";

/**
 * Grown-ups page: "Daily pace". The number of games per day can only be changed behind the parent gate
 * (2-digit × 1-digit multiplication — a speed bump for children, not a security boundary).
 */
export function DailyLimitSetting() {
  const [limit, setLimit] = useState(() => getDailySettings().limit);
  const [mode, setMode] = useState<"view" | "gate" | "edit" | "saved">("view");
  const [draft, setDraft] = useState(limit);
  const [answer, setAnswer] = useState("");
  const [gate, setGate] = useState(() => ({ a: 12 + Math.floor(Math.random() * 8), b: 6 + Math.floor(Math.random() * 4) }));

  return (
    <section className="daily-pace" aria-labelledby="daily-pace-h">
      <h2 id="daily-pace-h">Daily pace</h2>
      <p><strong>BrainZippy works best a little every day.</strong> Each day your child follows a short trail of games that mixes something new, a quick review of skills learned on earlier days (spaced out over 2, 4, 8, 16 and 32 days) and one slightly harder "star" challenge. After the last game of the day, play pauses until tomorrow (midnight on this device), so children pace themselves and come back fresh.</p>
      <p>A game that has already started always finishes. Games chosen in Explore count too. There is no way for a child to unlock more games today, and missing a day is fine: nothing is lost and there are no streaks to break.</p>
      <p className="daily-pace-now">Games per day: <b data-testid="daily-limit-value">{limit}</b></p>
      {mode !== "gate" && mode !== "edit" && (
        <p>
          <button type="button" className="pill-btn" data-testid="daily-limit-change" onClick={() => { setAnswer(""); setMode("gate"); }}>Change games per day</button>
          {mode === "saved" && <span role="status" data-testid="daily-limit-saved"> Saved. Today's trail now has {limit} games.</span>}
        </p>
      )}
      {mode === "gate" && (
        <form
          className="gate"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(answer) === gate.a * gate.b) {
              setDraft(limit);
              setMode("edit");
            } else {
              setAnswer("");
              setGate({ a: 12 + Math.floor(Math.random() * 8), b: 6 + Math.floor(Math.random() * 4) });
            }
          }}
        >
          <label htmlFor="limit-gate-answer">Grown-ups only: what is {gate.a} × {gate.b}?</label>
          <input id="limit-gate-answer" data-testid="limit-gate-answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} />
          <button type="submit" className="pill-btn" data-testid="limit-gate-confirm">Continue</button>
          <button type="button" className="pill-btn" onClick={() => setMode("view")}>Cancel</button>
        </form>
      )}
      {mode === "edit" && (
        <div className="gate daily-limit-edit">
          <button type="button" className="pill-btn" data-testid="daily-limit-minus" aria-label="One game fewer per day" disabled={draft <= DAILY_LIMIT.min} onClick={() => setDraft((d) => Math.max(DAILY_LIMIT.min, d - 1))}>−</button>
          <output data-testid="daily-limit-draft" aria-live="polite">{draft} games a day</output>
          <button type="button" className="pill-btn" data-testid="daily-limit-plus" aria-label="One game more per day" disabled={draft >= DAILY_LIMIT.max} onClick={() => setDraft((d) => Math.min(DAILY_LIMIT.max, d + 1))}>+</button>
          <button
            type="button"
            className="pill-btn"
            data-testid="daily-limit-save"
            onClick={() => {
              void setDailyLimit(draft).then((n) => {
                track("daily", { k1: "limit-changed", k2: String(n) });
                setLimit(n);
                setMode("saved");
              });
            }}
          >
            Save
          </button>
          <button type="button" className="pill-btn" onClick={() => setMode("view")}>Cancel</button>
          <p className="daily-pace-hint">Between {DAILY_LIMIT.min} and {DAILY_LIMIT.max}. Each game is one short round of 8 questions (about 3–5 minutes).</p>
        </div>
      )}
    </section>
  );
}
