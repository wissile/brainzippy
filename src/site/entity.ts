/**
 * The single source of truth for facts about BrainZippy that appear on public pages, in JSON-LD,
 * in llms.txt and in OG tags. Keep every public description consistent with this file
 * (entity consistency matters for search engines and AI answer engines alike).
 *
 * Ages and subjects available today are DERIVED from the published games (src/site/catalog.ts), so
 * they update by themselves when a world gets its editorial copy. llms.txt is generated from this file
 * at build time (src/site/llms.ts), so it can never go stale.
 */
import { CARD_TRIAL_DAYS, INTRO_TRIAL_DAYS, PRICE } from "../billing/model";
import { registry } from "../content";
import { AGES_NOW, SUBJECTS_NOW, listJoin } from "./catalog";

/** Live libraries with published games, in the registry's teaching order (maths, English, science, ...). */
const subjectsNow = registry.libraries.filter((l) => SUBJECTS_NOW.some((s) => s.id === l.id)).map((l) => l.title);
/** Subject names as they read mid-sentence: "maths", "computer science", but "English" keeps its capital. */
const PROPER = new Set(["English"]);
export const subjectWord = (title: string) => (PROPER.has(title) ? title : title.toLowerCase());
const subjectsLower = listJoin(subjectsNow.map(subjectWord));
/** Short enough for titles and meta descriptions: the full list up to three subjects, then "and N more subjects". */
const SHORT_MAX = 3;
const subjectsShort =
  subjectsNow.length <= SHORT_MAX ? subjectsLower : `${subjectsNow.slice(0, SHORT_MAX).map(subjectWord).join(", ")} and ${subjectsNow.length - SHORT_MAX} more subjects`;

export const SITE = {
  name: "BrainZippy",
  origin: "https://brainzippy.com",
  locale: "en",
  /** One-sentence definition used as the default meta description and Organization description. */
  definition: `BrainZippy is a website of story-based learning games for children. The games available today teach ${subjectsLower} to children aged about ${AGES_NOW.min} to ${AGES_NOW.max}.`,
  short: `Story-based learning games for kids aged ${AGES_NOW.min}–${AGES_NOW.max}: ${subjectsShort}, with no ads.`,
  /** Ages the games available today are designed for (derived from the published games). */
  agesNow: AGES_NOW,
  /** Ages the product is being built for (vision, not a claim about today's games). */
  agesPlanned: { min: 3, max: 14 },
  /** Subjects with at least one published game (derived). */
  subjectsNow,
  /** The same, as they read mid-sentence: "maths, English, science, ... and pilot ground school". */
  subjectsPhrase: subjectsLower,
  /** For titles and meta descriptions, where the full list would be too long: "maths, English, science and 8 more subjects". */
  subjectsShort,
  /** Planned, not yet available. Reading and spelling are part of English beyond today's listening games. */
  subjectsPlanned: ["Reading", "Spelling", "Logic"],
  facts: [
    "No ads, no chat between children and no third-party trackers.",
    "Children can play as guests without an account.",
    "A child's name and progress stay on the device in guest play.",
    "Every instruction is spoken aloud and shown as a caption.",
    "Games can be played with touch, mouse or keyboard, with sound on or off.",
    "Wrong answers lead to hints and a worked example, never a penalty.",
  ],
  /** Published price (docs/BILLING.md). Must match src/billing/model.ts PRICE (checked in tests/unit/billing-site.test.ts). */
  pricing: { amount: "6.99", currency: "USD", period: "month", trialDays: 14, freePlayDays: 14 } as null | { amount: string; currency: string; period: string; trialDays: number; freePlayDays: number },
  /** Price facts for llms.txt, FAQ and teacher page, from src/billing/model.ts (docs/BILLING.md), so they can't drift. */
  priceLine: `${INTRO_TRIAL_DAYS} days of free play on a device (no account or card), then a ${CARD_TRIAL_DAYS}-day free trial once a grown-up adds a card, then ${PRICE.display} per month per family, cancel anytime. Free-access codes are available for schools and promotions. Children never see prices.`,
  logoPath: "/og/logo.png",
  defaultOgImage: "/og/default.png",
} as const;

export const absoluteUrl = (path: string) => (path === "/" ? `${SITE.origin}/` : `${SITE.origin}${path}`);
