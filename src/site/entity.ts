/**
 * The single source of truth for facts about BrainZippy that appear on public pages, in JSON-LD,
 * in llms.txt and in OG tags. Keep every public description consistent with this file
 * (entity consistency matters for search engines and AI answer engines alike).
 *
 * Update rule: change a fact here first, then run `npm test` (tests/unit/site.test.ts checks
 * public/llms.txt still matches these facts).
 */
export const SITE = {
  name: "BrainZippy",
  origin: "https://brainzippy.com",
  locale: "en",
  /** One-sentence definition used as the default meta description and Organization description. */
  definition:
    "BrainZippy is a website of story-based learning games for children. The games available today teach early maths (counting, addition and fair sharing) to children aged about 4 to 9.",
  short: "Story-based learning games for kids. Early maths for ages 4–9, with no ads.",
  /** Ages the games available today are designed for. */
  agesNow: { min: 4, max: 9 },
  /** Ages the product is being built for (vision, not a claim about today's games). */
  agesPlanned: { min: 3, max: 14 },
  subjectsNow: ["Maths"],
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
  logoPath: "/og/logo.png",
  defaultOgImage: "/og/default.png",
} as const;

export const absoluteUrl = (path: string) => (path === "/" ? `${SITE.origin}/` : `${SITE.origin}${path}`);
