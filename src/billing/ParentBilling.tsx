import { useCallback, useEffect, useState } from "react";
import { useApp } from "../app/AppContext";
import { billingApi, errorText, refreshEntitlement, type StatusResponse } from "./client";
import { useFeatures } from "../app/features";
import { CONSENT_LABEL, CONSENT_LABEL_NO_TRIAL, EARLY_ACCESS_LINE, fmtDate } from "./copy";
import { daysLeft, PRICE, type Entitlement } from "./model";
import "./billing.css";

/** Plain-language status line for a parent. Never shown to children. */
export function statusText(e: Entitlement, now = Date.now()): string {
  if (e.source === "early-access") return `${EARLY_ACCESS_LINE}. Nothing to pay.`;
  if (e.status === "free") return e.endsAt ? `Free access with a code until ${fmtDate(e.endsAt)}.` : "Free access with a code. Nothing to pay.";
  if (e.status === "needs-payment") return e.paymentIssue ? "We couldn't take the last payment, so games are paused. Update your card in Manage billing." : `The free play period ended${e.trialEndsAt ? ` on ${fmtDate(e.trialEndsAt)}` : ""}.`;
  if (e.source === "intro" && e.trialEndsAt) {
    const d = daysLeft(e.trialEndsAt, now);
    return `Free play: ${d} day${d === 1 ? "" : "s"} left (until ${fmtDate(e.trialEndsAt)}). No card needed yet.`;
  }
  if (e.paymentIssue && e.graceEndsAt) return `We couldn't take the last payment. Please update your card by ${fmtDate(e.graceEndsAt)} to keep playing.`;
  if (e.status === "trial") return e.endsAt ? `Free trial, cancelled. Games stay open until ${fmtDate(e.endsAt)}; you won't be charged.` : `Free trial. Your first ${PRICE.display} payment is on ${e.renewsAt ? fmtDate(e.renewsAt) : "the day the trial ends"}.`;
  return e.endsAt ? `Plan cancelled. Games stay open until ${fmtDate(e.endsAt)}; no more payments.` : `BrainZippy Family, ${PRICE.display}/month.${e.renewsAt ? ` Next payment on ${fmtDate(e.renewsAt)}.` : ""}`;
}

/** Express-consent checkbox + button that opens Stripe Checkout. */
export function CheckoutButton({ offer }: { offer: StatusResponse["offer"] }) {
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trial = offer.trialEndsAt !== null;
  return (
    <div>
      <label className="pa-toggle">
        <input type="checkbox" data-testid="billing-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{trial ? CONSENT_LABEL : CONSENT_LABEL_NO_TRIAL}</span>
      </label>
      {error && <p className="pa-error" role="alert">{error}</p>}
      <button
        type="button"
        className="pa-btn primary"
        data-testid="billing-checkout"
        disabled={busy}
        onClick={async () => {
          setError("");
          if (!consent) return setError("Please tick the box to agree to the renewal terms.");
          setBusy(true);
          const r = await billingApi.checkout();
          if (r.ok) return window.location.assign(r.url);
          setBusy(false);
          setError(errorText(r.error));
        }}
      >
        {trial ? "Continue to add a card (no charge today)" : `Subscribe for ${PRICE.display}/month`}
      </button>
      <p className="pa-muted">You'll enter your card on Stripe's secure page. BrainZippy never sees your card number.</p>
    </div>
  );
}

export function RedeemForm({ onRedeemed }: { onRedeemed: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="bz-code"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await billingApi.redeem(code);
        setBusy(false);
        if (r.ok) {
          setCode("");
          setMsg({ ok: true, text: "Code accepted. Free access is on." });
          onRedeemed();
        } else setMsg({ ok: false, text: errorText(r.error) });
      }}
    >
      <label htmlFor="bz-code-input" className="pa-field">
        <strong>Have a free-access code?</strong>
      </label>
      <div className="bz-code-row">
        <input id="bz-code-input" type="text" data-testid="redeem-code-input" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} value={code} onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="pa-btn" data-testid="redeem-code-submit" disabled={busy || code.trim().length < 6}>
          Redeem
        </button>
      </div>
      {msg && (
        <p className={msg.ok ? "pa-ok" : "pa-error"} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

/** Billing card on /parents: status, start trial, Manage billing (Customer Portal), Cancel plan (2 clicks), codes. */
export function BillingCard({ initial }: { initial?: Entitlement }) {
  const { billing } = useFeatures();
  return billing ? <LiveBillingCard initial={initial} /> : <EarlyAccessCard />;
}

/** Billing off (D-030): no plan, no card, no codes. */
function EarlyAccessCard() {
  return (
    <section className="pa-card" data-testid="billing-card" aria-labelledby="bz-billing-title">
      <h2 id="bz-billing-title">Plan</h2>
      <p className="bz-billing-status" data-testid="billing-status" data-status="free" data-source="early-access">
        {EARLY_ACCESS_LINE}. Nothing to pay and no card needed.
      </p>
    </section>
  );
}

function LiveBillingCard({ initial }: { initial?: Entitlement }) {
  const { navigate } = useApp();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const returning = new URLSearchParams(window.location.search).get("billing");

  const load = useCallback(async () => {
    const r = await refreshEntitlement();
    if (typeof r === "object") setStatus(r);
    return r;
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      const r = await load();
      // Back from Checkout: the webhook usually lands within seconds; poll briefly until it does.
      for (let i = 0; live && returning === "success" && i < 10 && !(typeof r === "object" && r.entitlement.source === "stripe"); i++) {
        await new Promise((res) => setTimeout(res, 1500));
        const again = live ? await load() : null;
        if (typeof again === "object" && again?.entitlement.source === "stripe") break;
      }
    })();
    return () => {
      live = false;
    };
  }, [load, returning]);

  const ent = status?.entitlement ?? initial;
  if (!ent) return null;
  const live = ent.source === "stripe" && ent.status !== "needs-payment";
  const cancelling = !!ent.endsAt && ent.source === "stripe";

  const portal = async (flow?: "cancel") => {
    setBusy(true);
    setError("");
    const r = await billingApi.portal(flow);
    if (r.ok) return window.location.assign(r.url);
    setBusy(false);
    setError(errorText(r.error));
  };

  return (
    <section className="pa-card" data-testid="billing-card" aria-labelledby="bz-billing-title">
      <h2 id="bz-billing-title">Plan and billing</h2>
      {returning === "success" && ent.source !== "stripe" && <p className="pa-muted" aria-live="polite">Thanks! Setting up your plan…</p>}
      <p className="bz-billing-status" data-testid="billing-status" data-status={ent.status} data-source={ent.source}>
        {statusText(ent)}
      </p>
      <div className="pa-row">
        {!live && ent.status !== "free" && (
          <button type="button" className="pa-btn primary" data-testid="billing-start" onClick={() => navigate("/plan")}>
            {status?.offer.trialEndsAt === null ? `Subscribe, ${PRICE.display}/month` : "Add a card for 14 more free days"}
          </button>
        )}
        {ent.manageable && (
          <button type="button" className="pa-btn" data-testid="billing-manage" disabled={busy} onClick={() => void portal()}>
            Manage billing
          </button>
        )}
        {live && !cancelling && (
          <button type="button" className="pa-btn" data-testid="billing-cancel" disabled={busy} onClick={() => void portal("cancel")}>
            Cancel plan
          </button>
        )}
        {!live && !showCode && (
          <button type="button" className="pa-btn" data-testid="billing-show-code" onClick={() => setShowCode(true)}>
            I have a code
          </button>
        )}
      </div>
      {error && <p className="pa-error" role="alert">{error}</p>}
      {showCode && !live && <RedeemForm onRedeemed={() => void load()} />}
      <p className="pa-muted">
        {PRICE.display}/month after the free trial. Cancel anytime here: "Cancel plan", then confirm. <a className="pa-link" href="/pricing">Pricing details</a>
      </p>
    </section>
  );
}
