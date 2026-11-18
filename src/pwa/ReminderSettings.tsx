import { useState } from "react";
import { HOURS, type EnableResult, deviceTimeZone, disableReminders, enableReminders, loadReminderSettings, notificationPermission, pushSupport } from "./push";
import "./pwa.css";

const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const MESSAGES: Record<Exclude<EnableResult, "on">, string> = {
  denied: "Notifications are blocked for BrainZippy. You can allow them in your browser or device settings, then try again.",
  unsupported: "This browser can't show reminders.",
  server: "Reminders aren't available right now. Please try again later.",
  failed: "Something went wrong setting up the reminder. Please try again.",
};

/**
 * Grown-ups page → "Daily reminder". Behind the parent gate (2-digit × 1-digit multiplication, same as the
 * other grown-up actions). Nothing asks for notification permission until the grown-up taps "Turn on".
 */
export function ReminderSettings() {
  const [stage, setStage] = useState<"closed" | "gate" | "open">("closed");
  const [answer, setAnswer] = useState("");
  const [gate] = useState(() => ({ a: 13 + Math.floor(Math.random() * 7), b: 6 + Math.floor(Math.random() * 4) }));
  const [settings, setSettings] = useState(loadReminderSettings);
  const [hour, setHour] = useState(settings.hour);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const support = pushSupport();
  const tz = deviceTimeZone();

  const turnOn = async () => {
    setBusy(true);
    setNote("");
    const r = await enableReminders(hour); // permission prompt happens here, from this tap
    setBusy(false);
    setSettings(loadReminderSettings());
    setNote(r === "on" ? `Done. One gentle reminder a day at ${hourLabel(hour)}.` : MESSAGES[r]);
  };
  const turnOff = async () => {
    setBusy(true);
    await disableReminders();
    setBusy(false);
    setSettings(loadReminderSettings());
    setNote("Reminders are off.");
  };

  return (
    <section className="bz-reminders" aria-labelledby="bz-reminders-h">
      <h2 id="bz-reminders-h">Daily reminder</h2>
      <p>If you like, BrainZippy can send you (not your child) one gentle notification a day, at a time you choose. Never in the evening or at night (8 pm – 8 am), never more than once a day, and you can turn it off any time.</p>

      {stage === "closed" && (
        <p>
          <button type="button" className="pill-btn" data-testid="reminder-open" onClick={() => setStage("gate")}>
            {settings.enabled ? "Change daily reminder" : "Set up a daily reminder"}
          </button>
        </p>
      )}

      {stage === "gate" && (
        <form
          className="gate"
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(answer) === gate.a * gate.b) setStage("open");
            else setAnswer("");
          }}
        >
          <label htmlFor="reminder-gate">Grown-ups only: what is {gate.a} × {gate.b}?</label>
          <input id="reminder-gate" data-testid="reminder-gate-answer" inputMode="numeric" autoComplete="off" value={answer} onChange={(e) => setAnswer(e.target.value.replace(/\D/g, "").slice(0, 3))} />
          <button type="submit" className="pill-btn" data-testid="reminder-gate-ok">OK</button>
          <button type="button" className="pill-btn bz-quiet" onClick={() => setStage("closed")}>Cancel</button>
        </form>
      )}

      {stage === "open" && (
        <div className="bz-reminder-panel" data-testid="reminder-panel">
          {support === "ios-install" && (
            <p className="bz-note" data-testid="reminder-ios">
              On iPhone and iPad, reminders work once BrainZippy is on your Home Screen (iOS / iPadOS 16.4 or later): tap the Share button, choose <strong>Add to Home Screen</strong>, then open BrainZippy from there and come back to this page.
            </p>
          )}
          {support === "unsupported" && <p className="bz-note">This browser can't show reminders. Try a recent Chrome, Edge, Firefox or Safari.</p>}
          {support === "supported" && (
            <>
              <p className="bz-status" data-testid="reminder-status">
                {settings.enabled ? `On — every day at ${hourLabel(settings.hour)}.` : "Off."}
                {notificationPermission() === "denied" && " Notifications are currently blocked in your browser settings."}
              </p>
              <div className="bz-row">
                <label htmlFor="reminder-hour">Time</label>
                <select id="reminder-hour" data-testid="reminder-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{hourLabel(h)}</option>
                  ))}
                </select>
              </div>
              <p className="bz-small" data-testid="reminder-tz">Time zone: {tz} (from this device)</p>
              <div className="bz-row">
                <button type="button" className="pill-btn" data-testid="reminder-on" disabled={busy} onClick={() => void turnOn()}>
                  {settings.enabled ? "Save time" : "Turn on"}
                </button>
                {settings.enabled && (
                  <button type="button" className="pill-btn bz-quiet" data-testid="reminder-off" disabled={busy} onClick={() => void turnOff()}>
                    Turn off
                  </button>
                )}
                <button type="button" className="pill-btn bz-quiet" onClick={() => setStage("closed")}>Done</button>
              </div>
            </>
          )}
          {note && <p role="status" className="bz-status" data-testid="reminder-note">{note}</p>}
        </div>
      )}
    </section>
  );
}
