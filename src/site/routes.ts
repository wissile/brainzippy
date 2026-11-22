/**
 * The public site map. Every indexable page is defined here and nowhere else; the prerenderer, the
 * sitemap and the tests all read this list. Library and age pages are generated from data: a page
 * exists only when it has games AND editorial content (no thin or placeholder pages). Library pages exist
 * only for LIVE libraries (D-029); the old /subjects/* URLs redirect to /libraries/*.
 */
import { createElement as h } from "react";
import { AGES_NOW, GAMES, LIBRARIES_NOW, libraryPath } from "./catalog";
import { AGE_BANDS, SKILLS, SUBJECTS } from "./content/curriculum";
import { FAQ } from "./content/faq";
import { GAME_COPY } from "./content/games";
import { GUIDES } from "./content/guides";
import { SITE } from "./entity";
import { About, FaqPage, ForParents, ForTeachers, HowItWorks, Landing, Research } from "./pages/core";
import { AgePage, GamePage, GamesHub, LibraryPage, gamesForBand } from "./pages/catalog";
import { GuidePage, GuidesHub } from "./pages/guides";
import { PricingPage } from "./pages/pricing";
import { article, breadcrumbList, faqPage, learningResource, organization, website } from "./seo";
import type { Crumb, PageDef } from "./types";

/** Client-side app routes (served by the SPA shell, noindex). Internal links to these are allowed. */
export const APP_ROUTES = ["/hello", "/map", "/play", "/grown-ups", "/parents", "/plan"] as const;
export const isAppRoute = (p: string) => APP_ROUTES.some((r) => p === r || p.startsWith(`${r}/`));

/** A band page needs a game sharing ≥2 years with the band; games sharing 1 year are listed as "also try". */
const MAIN_OVERLAP = 2;

const HOME: Crumb = { name: "Home", path: "/" };
const crumbs = (...c: Crumb[]): Crumb[] => [HOME, ...c];

function page(p: Omit<PageDef, "jsonLd"> & { jsonLd?: readonly object[] }): PageDef {
  const ld = [...(p.jsonLd ?? [])];
  if (p.breadcrumbs.length > 1) ld.push(breadcrumbList(p.breadcrumbs));
  return { ...p, jsonLd: ld };
}

const CORE_UPDATED = "2026-11-22";

/** _redirects rules owned by the site map: /subjects/<id> moved to /libraries/<id> (D-029). */
export const ROUTE_REDIRECTS = ["# Subjects became libraries (D-029).", "/subjects/* /libraries/:splat 301"] as const;

export function buildRoutes(): PageDef[] {
  const pages: PageDef[] = [];

  const ageBands = AGE_BANDS.map((band) => ({ band, main: gamesForBand(band, MAIN_OVERLAP), stretch: gamesForBand(band, 1).filter((g) => !gamesForBand(band, MAIN_OVERLAP).includes(g)) })).filter((b) => b.main.length > 0);
  // live libraries with published games AND editorial copy (keyed by library id) get a page
  const libraries = LIBRARIES_NOW.flatMap((l) => {
    const copy = SUBJECTS.find((s) => s.slug === l.id);
    return copy ? [{ l, s: copy, games: l.games }] : [];
  });

  const ages = `${AGES_NOW.min}–${AGES_NOW.max}`;
  const subjectWords = SITE.subjectsShort;
  const subjectPaths = libraries.map(({ l, s }) => ({ path: libraryPath(l.id), label: `${s.name} games` }));
  pages.push(
    page({
      path: "/",
      title: `${SITE.name}: story-based learning games for kids aged ${ages}`,
      description: `Story-based learning games for kids aged ${ages}: ${subjectWords}, from counting and rhymes to coding and feelings. Spoken help, no ads.`,
      updated: CORE_UPDATED,
      breadcrumbs: [HOME],
      jsonLd: [organization(), website()],
      bodyClass: "home",
      render: () => h(Landing, { agePaths: ageBands.map(({ band }) => ({ path: `/ages/${band.slug}`, label: `Ages ${band.label}` })), subjectPaths }),
    }),
    page({
      path: "/how-it-works",
      title: "How BrainZippy works: stories, hints and published difficulty rules",
      description: "How BrainZippy's games work: a story sets up the problem, children learn by doing, helpers explain, and mistakes bring hints. Plus the exact difficulty rules.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "How it works", path: "/how-it-works" }),
      render: () => h(HowItWorks),
    }),
    page({
      path: "/research",
      title: "The research behind BrainZippy's learning games",
      description: "The research BrainZippy is built on, from counting, rhyme, patterns and number lines to worked examples, praise and spacing, and how strong the evidence is.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "Research", path: "/research" }),
      render: () => h(Research),
    }),
    page({
      path: "/for-parents",
      title: "BrainZippy for parents: what kids learn, privacy and safety",
      description: "What your child learns in each BrainZippy game, how guest play keeps their data on your device, no ads or chat, and simple ways to support learning at home.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "For parents", path: "/for-parents" }),
      render: () => h(ForParents),
    }),
    page({
      path: "/for-teachers",
      title: "BrainZippy for teachers: ad-free learning games and curriculum links",
      description: "Using BrainZippy's ad-free learning games in class: guest mode with no student data, spoken instructions, and how each skill links to Common Core, NGSS and CSTA.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "For teachers", path: "/for-teachers" }),
      render: () => h(ForTeachers),
    }),
    page({
      path: "/faq",
      title: "BrainZippy FAQ: ages, learning, privacy and price",
      description: "Answers about BrainZippy: what ages it's for, whether children need to read, how difficulty adapts, what happens after mistakes, ads, accounts, privacy and price.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "FAQ", path: "/faq" }),
      jsonLd: [faqPage(FAQ.flatMap((g) => g.items))],
      render: () => h(FaqPage),
    }),
    page({
      path: "/pricing",
      title: "BrainZippy pricing: $6.99/month after a free trial",
      description: "BrainZippy costs $6.99 a month for the family after 14 days of free play and a 14-day free trial with a card. Cancel anytime; children never see prices.",
      updated: "2026-11-18",
      breadcrumbs: crumbs({ name: "Pricing", path: "/pricing" }),
      render: () => h(PricingPage),
    }),
    page({
      path: "/about",
      title: "About BrainZippy",
      description: "Why BrainZippy exists: learning games with one clear goal each, feedback that teaches, no ads or prize shops, published rules and original characters.",
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "About", path: "/about" }),
      render: () => h(About),
    }),
    page({
      path: "/games",
      title: `All BrainZippy games by subject, age and skill (ages ${ages})`,
      description: `Every BrainZippy game in one place: ${GAMES.length} story games in ${subjectWords} for ages ${ages}, with the skills each one teaches and how its levels grow.`,
      updated: CORE_UPDATED,
      breadcrumbs: crumbs({ name: "Games", path: "/games" }),
      render: () => h(GamesHub, { libraries: LIBRARIES_NOW, paged: libraries.map(({ l }) => l.id) }),
    }),
  );

  for (const g of GAMES) {
    const c = GAME_COPY[g.id];
    if (!c) continue; // a game without editorial copy gets no public page yet
    const path = `/games/${g.id}`;
    const og = `/og/games/${g.id}.png`;
    pages.push(
      page({
        path,
        title: c.title,
        description: c.description,
        updated: c.updated,
        breadcrumbs: crumbs({ name: "Games", path: "/games" }, { name: g.title, path }),
        ogImage: og,
        ogImageAlt: `${g.title}, a BrainZippy game for ages ${g.ages[0]}–${g.ages[1]}`,
        jsonLd: [learningResource({ name: g.title, description: c.description, path, ages: g.ages, teaches: g.skillIds.map((s) => SKILLS[s]?.name ?? s), image: og })],
        render: () => h(GamePage, { game: g }),
      }),
    );
  }

  for (const { l, s, games } of libraries) {
    const path = libraryPath(l.id);
    pages.push(page({ path, title: s.title, description: s.description, updated: s.updated, breadcrumbs: crumbs({ name: `${s.name} games`, path }), render: () => h(LibraryPage, { library: l, copy: s, games }) }));
  }

  for (const { band, main, stretch } of ageBands) {
    const path = `/ages/${band.slug}`;
    pages.push(page({ path, title: band.title, description: band.description, updated: band.updated, breadcrumbs: crumbs({ name: `Ages ${band.label}`, path }), render: () => h(AgePage, { band, main, stretch }) }));
  }

  pages.push(
    page({
      path: "/guides",
      title: "Parent guides to early maths at home",
      description: "Parent guides built on research: teaching counting, subitizing, number lines, making ten, fair sharing, daily learning habits, screen time and handling mistakes.",
      updated: GUIDES.map((g) => g.updated).sort().at(-1) ?? CORE_UPDATED,
      breadcrumbs: crumbs({ name: "Guides", path: "/guides" }),
      render: () => h(GuidesHub),
    }),
  );
  for (const g of GUIDES) {
    const path = `/guides/${g.slug}`;
    const og = `/og/guides/${g.slug}.png`;
    pages.push(
      page({
        path,
        title: g.title,
        description: g.description,
        updated: g.updated,
        ogType: "article",
        ogImage: og,
        ogImageAlt: g.title,
        breadcrumbs: crumbs({ name: "Guides", path: "/guides" }, { name: g.short, path }),
        jsonLd: [article(g, path, og)],
        bodyClass: "guide-page",
        render: () => h(GuidePage, { guide: g }),
      }),
    );
  }
  return pages;
}
