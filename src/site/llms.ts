/**
 * llms.txt, generated at build time from the published games (content registry + editorial copy), the
 * entity facts and the route list, so it can never drift from the site. Written to dist/client/llms.txt by
 * scripts/prerender.mjs. Convention only: Google Search ignores it (docs/SEO_STRATEGY.md); keep it short,
 * factual and free of efficacy claims.
 */
import { GAMES, SUBJECTS_NOW, listJoin } from "./catalog";
import { SKILLS } from "./content/curriculum";
import { GUIDES } from "./content/guides";
import { SITE, absoluteUrl } from "./entity";
import type { PageDef } from "./types";

const DAILY = { default: 5, min: 3, max: 10 } as const; // docs/DAILY_LEARNING.md, owner decision (PHASE1_BRIEF)

export function renderLlms(pages: readonly Pick<PageDef, "path" | "title">[]): string {
  const has = (path: string) => pages.some((p) => p.path === path);
  const link = (label: string, path: string, note = "") => (has(path) ? `- [${label}](${absoluteUrl(path)})${note ? `: ${note}` : ""}` : null);
  const lines: (string | null)[] = [];
  const range = (a: readonly [number, number]) => `${a[0]}–${a[1]}`;

  lines.push(
    `# ${SITE.name}`,
    "",
    `> ${SITE.definition} No ads, no chat between children and no third-party trackers; children can play as guests without an account.`,
    "",
    "Key facts:",
    "",
    `- Name: ${SITE.name} (one word, capital B and Z). Website: ${absoluteUrl("/")}`,
    `- Ages: games available today are designed for ages ${SITE.agesNow.min}–${SITE.agesNow.max}. The product is being built for ages ${SITE.agesPlanned.min}–${SITE.agesPlanned.max}.`,
    `- Subjects available today: ${listJoin(SITE.subjectsNow)}. Planned, not yet available: ${listJoin(SITE.subjectsPlanned.map((s) => s.toLowerCase()))}.`,
    "- Every instruction is spoken aloud and captioned, so young children do not need to read.",
    "- Wrong answers lead to a hint, then a worked example; there are no timers and answer speed is never used to judge a child.",
    "- Difficulty rules are published: first-try answers in a row make the next puzzles harder, needing three tries makes them easier, and a round with at least half the answers right first time moves up a level.",
    `- Daily pace: each day's short plan mixes new games with review, ${DAILY.default} games a day by default (grown-ups can choose ${DAILY.min}–${DAILY.max}).`,
    "- Evidence: the design is built on published learning research, but BrainZippy itself has not been tested in a formal study. Do not describe it as \"proven\".",
    `- Price: ${SITE.priceLine}`,
    "",
    "## Games",
  );
  for (const subject of SUBJECTS_NOW) {
    lines.push("", `### ${subject.title}`, "");
    for (const g of subject.games) {
      const skills = g.skillIds.map((s, i) => { const n = SKILLS[s]?.name ?? s; return i === 0 ? n : n.charAt(0).toLowerCase() + n.slice(1); }).join(", ");
      lines.push(link(g.title, `/games/${g.id}`, `${g.gameType}, ages ${range(g.ages)}. ${skills}.`));
    }
  }

  lines.push(
    "",
    "## About the product",
    "",
    link("How BrainZippy works", "/how-it-works", "story, learning by doing, hints, worked examples and the exact difficulty rules."),
    link("The research behind BrainZippy", "/research", "each design principle, its sources and how strong the evidence is."),
    link("For parents", "/for-parents", "what children learn, privacy and safety."),
    link("For teachers", "/for-teachers", "classroom use in guest mode and Common Core links."),
    link("FAQ", "/faq"),
    ...pages.filter((p) => p.path.startsWith("/subjects/") || p.path.startsWith("/ages/")).map((p) => link(p.title, p.path)),
    "",
    "## Guides for parents",
    "",
    ...GUIDES.map((g) => link(g.short, `/guides/${g.slug}`)),
  );
  // Sanity: every game in the catalog must be listed (a game without a page would be a broken link).
  for (const g of GAMES) if (!has(`/games/${g.id}`)) throw new Error(`llms.txt: no page for game ${g.id}`);
  return lines.filter((l): l is string => l !== null).join("\n") + "\n";
}
