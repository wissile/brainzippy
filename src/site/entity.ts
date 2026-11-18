/**
 * The single source of truth for facts about BrainZippy that appear on public pages, in JSON-LD,
 * in llms.txt and in OG tags. Keep every public description consistent with this file
 * (entity consistency matters for search engines and AI answer engines alike).
 *
 * Ages and subjects available today are DERIVED from the published games (src/site/catalog.ts), so
 * they update by themselves when a world gets its editorial copy. llms.txt is generated from this file
 * at build time (src/site/llms.ts), so it can never go stale.
 */
import { AGES_NOW, SUBJECTS_NOW, listJoin } from "./catalog";

const subjectsNow = SUBJECTS_NOW.map((s) => s.title);
/** Subject names as they read mid-sentence: "maths", but "English" keeps its capital. */
const PROPER = new Set(["English"]);
const subjectsLower = listJoin(subjectsNow.map((t) => (PROPER.has(t) ? t : t.toLowerCase())));

export const SITE = {
  name: "BrainZippy",
  origin: "https://brainzippy.com",
  locale: "en",
  /** One-sentence definition used as the default meta description and Organization description. */
  definition: `BrainZippy is a website of story-based learning games for children. The games available today teach ${subjectsLower} to children aged about ${AGES_NOW.min} to ${AGES_NOW.max}.`,
  short: `Story-based learning games for kids aged ${AGES_NOW.min}–${AGES_NOW.max}: ${subjectsLower}, with no ads.`,
  /** Ages the games available today are designed for (derived from the published games). */
  agesNow: AGES_NOW,
  /** Ages the product is being built for (vision, not a claim about today's games). */
  agesPlanned: { min: 3, max: 14 },
  /** Subjects with at least one published game (derived). */
  subjectsNow,
  /** The same, as they read mid-sentence: "maths and English". */
  subjectsPhrase: subjectsLower,
  /** Planned, not yet available. Reading and spelling are part of English beyond today's listening games. */
  subjectsPlanned: ["Reading", "Spelling", "Science", "Logic"],
  facts: [
    "No ads, no chat between children and no third-party trackers.",
    "Children can play as guests without an account.",
    "A child's name and progress stay on the device in guest play.",
    "Every instruction is spoken aloud and shown as a caption.",
    "Games can be played with touch, mouse or keyboard, with sound on or off.",
    "Wrong answers lead to hints and a worked example, never a penalty.",
  ],
  /** Pricing is not published until billing is live. Keep null until then (see docs/SEO_STRATEGY.md). */
  pricing: null as null | { amount: string; currency: string; period: string; trialDays: number },
  /**
   * The one price sentence used in llms.txt. Owner-approved wording ("$6.99/month after a free trial").
   * TODO(billing): when Stripe billing is live, set `pricing` above and expand this line (trial length,
   * free-access codes) from the same values; don't add any other price wording here before then.
   */
  priceLine: "Guest play needs no account. A family subscription is $6.99/month after a free trial.",
  logoPath: "/og/logo.png",
  defaultOgImage: "/og/default.png",
} as const;

export const absoluteUrl = (path: string) => (path === "/" ? `${SITE.origin}/` : `${SITE.origin}${path}`);
