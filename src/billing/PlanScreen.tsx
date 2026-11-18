import { useEffect, useState } from "react";
import { useApp } from "../app/AppContext";
import { ParentGate, useParentGate } from "../account/ui";
import "../account/parents.css";
import { refreshEntitlement, type StatusResponse } from "./client";
import { fmtDate, HOW_IT_WORKS, PRICE_LINE } from "./copy";
import { CARD_TRIAL_DAYS, PRICE } from "./model";
import { CheckoutButton, RedeemForm, statusText } from "./ParentBilling";
import { loadState } from "../services/storage";

/**
 * /plan — the calm paywall, for grown-ups only (behind the parent gate). No countdowns, no urgency, no pre-ticked
 * boxes: what BrainZippy is, the price, the exact renewal terms, and an explicit consent tick before Checkout.
 */
export default function PlanScreen() {
  const { navigate } = useApp();
  const { passed, pass } = useParentGate();
  const [status, setStatus] = useState<StatusResponse | "signed-out" | "offline" | "loading">("loading");
  const cancelled = new URLSearchParams(window.location.search).get("billing") === "cancelled";

  useEffect(() => {
    if (passed) void refreshEntitlement().then(setStatus);
  }, [passed]);

  const back = () => navigate(loadState().profile.step === "done" ? "/map" : "/");

  return (
    <main className="pa-screen" data-testid="plan">
      <header className="pa-top">
        <h1>Keep playing BrainZippy</h1>
        <button type="button" className="pa-btn" data-testid="plan-back" onClick={back}>
          Back to the games
        </button>
      </header>
      <div className="pa-main">
        {!passed ? (
          <ParentGate onPass={pass} onCancel={back} />
        ) : (
          <>
            <section className="pa-card" data-testid="paywall">
              <h2>What your child gets</h2>
              <ul className="bz-plan-list">
                <li>Story-based maths games with spoken instructions, gentle hints and worked examples.</li>
                <li>A daily game limit you choose, and a parent dashboard showing what your child is learning.</li>
                <li>Up to four child profiles, progress saved across devices. No ads, no chat, no trackers.</li>
              </ul>
              <p className="bz-plan-price" data-testid="paywall-price">{PRICE_LINE}</p>
              <h3>How it works</h3>
              <ol className="bz-plan-list">
                {HOW_IT_WORKS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <Terms status={status} />
              <p className="pa-muted">
                Full details on the <a className="pa-link" href="/pricing">pricing page</a>.
              </p>
            </section>
            {cancelled && <p className="pa-card" role="status">No problem, nothing was charged. You can come back any time.</p>}
            {status === "loading" ? (
              <p className="pa-muted" aria-busy="true">Loading…</p>
            ) : status === "offline" ? (
              <p className="pa-error" role="alert">We couldn't reach BrainZippy. Check your connection and try again.</p>
            ) : status === "signed-out" ? (
              <section className="pa-card" data-testid="paywall-signin">
                <h2>First, your parent account</h2>
                <p>To add a card or a free-access code, sign in or create a parent account. We only ask for your email: no password, and never your child's email.</p>
                <button type="button" className="pa-btn primary" data-testid="paywall-to-parents" onClick={() => navigate("/parents")}>
                  Sign in or create an account
                </button>
                <p className="pa-muted">After you sign in, choose "Add a card" in Plan and billing.</p>
              </section>
            ) : (
              <section className="pa-card" data-testid="paywall-actions">
                <h2>Your plan</h2>
                <p className="bz-billing-status" data-testid="billing-status" data-status={status.entitlement.status} data-source={status.entitlement.source}>
                  {statusText(status.entitlement)}
                </p>
                {status.entitlement.source === "stripe" && status.entitlement.status !== "needs-payment" ? (
                  <p>You already have a plan. Manage or cancel it on the <a className="pa-link" href="/parents">parent page</a>.</p>
                ) : status.entitlement.status === "free" && !status.entitlement.endsAt ? (
                  <p>Your family has free access. Nothing to pay.</p>
                ) : (
                  <>
                    <CheckoutButton offer={status.offer} />
                    <div className="pa-section">
                      <RedeemForm onRedeemed={() => void refreshEntitlement().then(setStatus)} />
                    </div>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Terms({ status }: { status: StatusResponse | string }) {
  const offer = typeof status === "object" ? status.offer : null;
  return (
    <div className="bz-plan-terms" data-testid="paywall-terms">
      <h3>Renewal terms</h3>
      {offer && offer.trialEndsAt === null ? (
        <p>You've already had a free trial, so the first {PRICE.display} payment is taken today.</p>
      ) : (
        <p>
          No charge today. Your free trial ends on <strong>{offer?.trialEndsAt ? fmtDate(offer.trialEndsAt) : `the day ${CARD_TRIAL_DAYS} days after you add your card (later if you still have free days)`}</strong>.
        </p>
      )}
      <p>
        Then your card is charged <strong>{PRICE.display} (plus any applicable tax) every month</strong>, on the same day each month, until you cancel. The plan renews automatically.
      </p>
      <p>Cancel anytime on the parent page: "Cancel plan", then confirm. If you cancel during the free trial, you pay nothing. If you cancel later, games stay open until the end of the month you've paid for, with no further charges.</p>
      <p>Have a discount code? Enter it on the payment page.</p>
    </div>
  );
}
