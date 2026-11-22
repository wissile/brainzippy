import { useCallback, useEffect, useState } from "react";
import { useApp } from "../app/AppContext";
import { useFeatures } from "../app/features";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../app/support";
import { loadState } from "../services/storage";
import { api, type Me } from "./api";
import { CONSENT_LINK_TEXT, CONSENT_TEXT_AFTER_LINK, CONSENT_TEXT_BEFORE_LINK } from "./consent";
import { Dashboard } from "./Dashboard";
import { InviteAccept } from "./InviteAccept";
import { ParentGate, useParentGate } from "./ui";
import "./parents.css";

/**
 * Parent area (/parents, /parents/invite/:code). Behind the parent gate. Calm, plain layout; no child-facing art
 * beyond each child's own monster. Sign-in is by email magic link only.
 * Accounts off (ACCOUNTS_ENABLED, D-030): a calm "coming soon" page; no form, nothing asked, no API call.
 */
export default function ParentsApp() {
  const { accounts } = useFeatures();
  return accounts ? <ParentArea /> : <AccountsComingSoon />;
}

export const ACCOUNTS_COMING_SOON = "Grown-up accounts are coming soon. Progress is saved on this device.";

function AccountsComingSoon() {
  const { navigate } = useApp();
  return (
    <main className="pa-screen" data-testid="parents">
      <header className="pa-top">
        <h1>BrainZippy for parents</h1>
        <button type="button" className="pa-btn" data-testid="pa-back-to-games" onClick={() => navigate(loadState().profile.step === "done" ? "/map" : "/")}>
          Back to the games
        </button>
      </header>
      <div className="pa-main">
        <section className="pa-card" data-testid="parents-coming-soon">
          <h2>Coming soon</h2>
          <p>{ACCOUNTS_COMING_SOON}</p>
          <p className="pa-muted">
            You can set the daily game limit, daily reminders and delete this device's progress on the{" "}
            <a className="pa-link" href="/grown-ups" onClick={(e) => { e.preventDefault(); navigate("/grown-ups"); }}>
              grown-ups page
            </a>
            . Questions? Email{" "}
            <a className="pa-link" href={SUPPORT_MAILTO}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

function ParentArea() {
  const { path, navigate } = useApp();
  const { passed, pass } = useParentGate();
  const [me, setMe] = useState<Me | null | "loading">("loading");
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    const r = await api.me();
    if (r.ok) {
      setMe(r);
      setOffline(false);
    } else {
      setMe(null);
      setOffline(r.status === 0);
    }
  }, []);

  useEffect(() => {
    if (passed) void refresh();
  }, [passed, refresh]);

  const inviteCode = path.match(/^\/parents\/invite\/([^/]+)$/)?.[1] ?? null;

  return (
    <main className="pa-screen" data-testid="parents">
      <header className="pa-top">
        <h1>BrainZippy for parents</h1>
        <button type="button" className="pa-btn" data-testid="pa-back-to-games" onClick={() => navigate(loadState().profile.step === "done" ? "/map" : "/")}>
          Back to the games
        </button>
      </header>
      <div className="pa-main">
        {!passed ? (
          <ParentGate onPass={pass} onCancel={() => navigate("/")} />
        ) : me === "loading" ? (
          <p className="pa-muted" aria-busy="true">Loading…</p>
        ) : me === null ? (
          <>
            {offline && <p className="pa-error" role="alert">We couldn't reach BrainZippy. Check your connection and try again.</p>}
            {inviteCode && <p className="pa-card">Sign in first, then open the invite link again to accept it.</p>}
            <SignIn />
          </>
        ) : inviteCode ? (
          <InviteAccept code={decodeURIComponent(inviteCode)} me={me} onDone={() => navigate("/parents", { replace: true })} />
        ) : (
          <Dashboard me={me} refresh={refresh} onSignedOut={() => setMe(null)} />
        )}
      </div>
    </main>
  );
}

function SignIn() {
  const { friends } = useFeatures();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ devLink?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (mode === "signup" && !consent) return setError("Please tick the box to give consent.");
    setBusy(true);
    const r = await api.magicLink(email.trim(), mode, consent);
    setBusy(false);
    if (r.ok) return setSent({ devLink: r.devLink });
    setError(
      r.error === "rate_limited"
        ? "Too many requests. Please wait a few minutes and try again."
        : r.error === "email_delivery_not_configured"
          ? "Email sign-in isn't available yet."
          : r.error === "offline"
            ? "We couldn't reach BrainZippy. Check your connection."
            : "Something went wrong. Please try again.",
    );
  };

  if (sent) {
    return (
      <section className="pa-card" aria-live="polite">
        <h2>Check your inbox</h2>
        <p>
          {mode === "signup" ? "We sent a link to " : "If there's an account for "}
          <strong>{email.trim()}</strong>
          {mode === "signup" ? ". Open it on this device to finish." : ", a sign-in link is on its way."} The link works once and expires in 15 minutes.
        </p>
        {sent.devLink && (
          <p className="pa-dev">
            Development mode: no email is sent.{" "}
            <a href={sent.devLink} data-testid="dev-magic-link">
              Open the sign-in link
            </a>
          </p>
        )}
        <button type="button" className="pa-btn" onClick={() => setSent(null)}>
          Use a different email
        </button>
      </section>
    );
  }

  return (
    <form
      className="pa-card"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      aria-labelledby="pa-signin-title"
    >
      <h2 id="pa-signin-title">{mode === "signup" ? "Create a parent account" : "Sign in"}</h2>
      <div className="pa-tabs" role="group" aria-label="Account">
        <button type="button" className="pa-btn" aria-pressed={mode === "signup"} data-testid="pa-mode-signup" onClick={() => setMode("signup")}>
          New here
        </button>
        <button type="button" className="pa-btn" aria-pressed={mode === "signin"} data-testid="pa-mode-signin" onClick={() => setMode("signin")}>
          I have an account
        </button>
      </div>
      <p className="pa-muted">
        An account lets you see your child's progress, set a daily game limit{friends ? ", save progress across devices and add friends" : " and save progress across devices"}. We only ask for <strong>your</strong> email; no password, and never your child's email.
      </p>
      <div className="pa-field">
        <label htmlFor="pa-email">Your email</label>
        <input id="pa-email" type="email" data-testid="pa-email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
      </div>
      {mode === "signup" && (
        <label className="consent pa-toggle">
          <input type="checkbox" data-testid="pa-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            {CONSENT_TEXT_BEFORE_LINK}
            <a href="/grown-ups" target="_blank" rel="noreferrer" className="pa-link">
              {CONSENT_LINK_TEXT}
            </a>
            {CONSENT_TEXT_AFTER_LINK}
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="pa-error">
          {error}
        </p>
      )}
      <button type="submit" className="pa-btn primary" data-testid="pa-send-link" disabled={busy}>
        {mode === "signup" ? "Email me a link" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
