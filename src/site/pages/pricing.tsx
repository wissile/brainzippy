import { PageHead, Section } from "../components";
import { CARD_TRIAL_DAYS, INTRO_TRIAL_DAYS, PRICE } from "../../billing/model";
import { HOW_IT_WORKS } from "../../billing/copy";

/** Public pricing page (prerendered). Facts come from src/billing/model.ts so the site and the paywall never disagree. */
export function PricingPage() {
  return (
    <>
      <PageHead title="BrainZippy pricing" lead={`One family plan: ${PRICE.display} a month after ${INTRO_TRIAL_DAYS} days of free play and a ${CARD_TRIAL_DAYS}-day free trial. Cancel anytime.`} art="bobbo" />
      <Section title="How the free time works">
        <ol className="steps">
          {HOW_IT_WORKS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p>You can add your card any time during the free play days. Your remaining free days are kept: the {CARD_TRIAL_DAYS}-day trial starts when the free play period ends.</p>
      </Section>
      <Section title="What the family plan includes" className="tinted">
        <ul>
          <li>Every BrainZippy game, with spoken instructions, hints and worked examples.</li>
          <li>Up to four child profiles, with progress saved across devices.</li>
          <li>A parent dashboard with skills practised, time played and a daily game limit you choose.</li>
          <li>No ads, no chat between children, no third-party trackers, and no in-game purchases.</li>
        </ul>
      </Section>
      <Section title="Renewal and cancellation">
        <ul>
          <li>Nothing is charged during the free trial. When it ends, your card is charged {PRICE.display} (plus any applicable sales tax) every month until you cancel.</li>
          <li>Cancel anytime from the parent page: choose “Cancel plan”, then confirm. Cancel during the trial and you pay nothing; cancel later and games stay open until the end of the month you've paid for.</li>
          <li>We tell you the price and the renewal terms, and ask you to agree to them, before you enter a card. Payments are handled by Stripe; BrainZippy never sees your card number.</li>
          <li>Each family gets one free trial.</li>
        </ul>
      </Section>
      <Section title="Children never see prices" className="tinted">
        <p>When the free time ends, a child sees a sleepy monster and a button to fetch a grown-up, never a price or a purchase button. Plans, cards and codes sit behind a grown-up check.</p>
      </Section>
      <Section title="Free-access codes">
        <p>Sometimes we give free-access codes, for example to partners. If you have one, redeem it in Plan and billing on the parent page; no card is needed. Discount codes are entered on the payment page instead.</p>
      </Section>
    </>
  );
}
