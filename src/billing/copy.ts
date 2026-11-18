/** Fixed, authored billing wording shared by the paywall, the parent card, Stripe Checkout and the pricing page. */
import { CARD_TRIAL_DAYS, INTRO_TRIAL_DAYS, PRICE } from "./model";

export const PRICE_LINE = `${PRICE.display}/month after a ${CARD_TRIAL_DAYS}-day free trial, cancel anytime`;

/** Shown next to Stripe's Subscribe button (custom_text.submit.message). Dates are on the Checkout page itself. */
export const CHECKOUT_SUBMIT_MESSAGE = `When your free trial ends, BrainZippy charges ${PRICE.display} every month (plus any applicable tax) until you cancel. You can cancel anytime from the BrainZippy parent page.`;

export const CONSENT_LABEL = `I agree that BrainZippy will charge ${PRICE.display} a month to my card, starting when the free trial ends, until I cancel.`;
export const CONSENT_LABEL_NO_TRIAL = `I agree that BrainZippy will charge ${PRICE.display} today and every month after that, until I cancel.`;

export const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const HOW_IT_WORKS = [
  `${INTRO_TRIAL_DAYS} days of free play on a device. No account or card needed.`,
  `Then a grown-up adds a card and gets ${CARD_TRIAL_DAYS} more free days. Nothing is charged during the trial.`,
  `After that, ${PRICE.display} a month until you cancel. Cancel anytime from the parent page in two clicks.`,
] as const;
