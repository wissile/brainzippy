# SEO, AEO & GEO Strategy

Goal: earn organic traffic from search engines and AI answer engines through useful, fast, crawlable pages for parents and teachers. No thin or duplicate pages, no keyword stuffing, no promised placements.

## What the evidence says (checked 2026-11-17)
| Topic | Finding | Source / status |
|---|---|---|
| AI Overviews / AI Mode | Built on core Search ranking. Needs indexable pages eligible for snippets, original "non-commodity" content and clear structure. Skip: special AI files, chunking, writing "for AI", mass pages for fan-out queries (scaled content abuse). | Google, *AI optimization guide* (developers.google.com/search/docs/fundamentals/ai-optimization-guide). **Evidence: primary source, read.** |
| llms.txt | Google Search does not use it ("won't help or hurt"). Lighthouse 13.3 adds an informational, unscored llms.txt check (Agentic Browsing). Some agents and coding tools read it. | Google guide above. Lighthouse detail comes from secondary reporting (techwyse.com, May 2026). **Convention: cheap to keep, no ranking claim.** |
| Structured data | Still supports rich-result eligibility. Not needed for AI features, and no special AI markup exists. The current gallery lists Article, Breadcrumb, Organization, Course list, Education Q&A, Software app, Video and others. **FAQ, HowTo, Practice problems and Learning video are absent.** | Search gallery page (read). Google's 2025 "simplifying search results" posts. |
| FAQ rich results | Not shown in Google Search since 7 May 2026. FAQPage remains a valid schema.org type. | Secondary reporting (techwyse.com) quoting the FAQPage doc. I couldn't open the doc myself (fetch blocked). |
| Sitemaps | Google uses `<lastmod>` only if it is "consistently and verifiably" accurate. It ignores `priority` and `changefreq`. List canonical URLs. | Google *Build a sitemap* (read). |
| Site name | WebSite structured data on the home page helps Google choose the site name. | Google site-names docs (search result; not re-read). |
| Generic "AEO/GEO" advice | Most of it is vendor marketing. Google says no third-party tool has access to its internal metrics. | Google guide. **Treat as unverified.** |

## Decisions
1. **Prerendering.** Pages are plain React TSX in `src/site`, rendered by `react-dom/server` in `scripts/prerender.mjs` after `vite build` (loaded via Vite's `runnerImport`, so no new dependencies). Each page goes to `dist/client/<path>.html`. Workers Static Assets serves `/x` from `x.html`; `/x/` gets a 307 to `/x` (`auto-trailing-slash`). Canonical URLs have no trailing slash.
2. **Landing at `/` without breaking the SPA fallback.** `index.html` stays the SPA shell, now `noindex` with no canonical. The SPA fallback (`not_found_handling: single-page-application`) still serves it for `/hello`, `/map`, `/play/*`, `/parents`, `/grown-ups` and any new app route, with no config change. The landing page is `landing.html`, and the generated `_redirects` rewrites it: `/ /landing 200`, plus `/landing / 301` to avoid a duplicate URL. Verified with `vite preview` and curl, and covered by e2e. Unknown paths return the noindex shell with 200; a real 404 page would need `404-page` mode plus an explicit list of app routes (deferred).
3. **Child path.** The landing hero has a 104 px Play link to `/hello`. `site.js` (0.5 KB, the only script on content pages) switches it to `/map` once onboarding is done. Coming from a static page, the app shows its own "Start" tap first: browsers need a fresh gesture to unlock audio.
4. **Information architecture.** `/`, `/how-it-works`, `/research`, `/for-parents`, `/for-teachers`, `/faq`, `/about`, `/games`, `/games/<game-id>` (the same id as `/play/<id>`), `/pricing`, `/libraries/<id>` (live libraries only; `/subjects/*` 301s there, D-028), `/ages/<band>`, `/guides`, and `/guides/<slug>` ×8. The exact set is derived from data (see below and `tests/unit/site.test.ts`).
   - A subject or age page is generated only if it has games in the catalog **and** editorial content. An age band needs a game sharing ≥2 years with it. A world gets a game page only once its editorial copy exists in `src/site/content/games.ts`. 9–11 has content but no qualifying game yet, so it has no page; it will appear automatically once one qualifies.
5. **Single data adapter.** `src/site/catalog.ts` is the only place the site reads game data. Ages, skills, level ranges and example puzzles come straight from `definition.ts`. Repoint it at `src/content/registry.ts` when that lands.
6. **Entity facts** live in `src/site/entity.ts`: name, definition, privacy facts, planned ages (3–14) and pricing (from `src/billing/model.ts`, see `docs/BILLING.md`). Ages and subjects available today are **derived** from the published games (`src/site/catalog.ts`). **`llms.txt` is generated at build time** by `src/site/llms.ts` from these facts, the catalog and the route list, and written to `dist/client/llms.txt` by `scripts/prerender.mjs`. There is no static `public/llms.txt` (the prerender fails if one appears); the unit test checks the generated text.
7. **JSON-LD (only where it is true):**
   - Home: Organization and WebSite.
   - Every other page: BreadcrumbList, with visible breadcrumbs.
   - Guides: Article (with `citation`).
   - `/faq`: FAQPage. No Google rich result, but it matches the visible text and costs nothing.
   - Game pages: LearningResource. schema.org convention only, with no Google feature.
   - Not used: SoftwareApplication/VideoGame (rich results need ratings, which we won't fake), Quiz and Practice problems (removed by Google, and they don't fit).
8. **Robots.** Allow everything, including AI search crawlers; disallow only `/api/`. App screens use `noindex` meta rather than Disallow, so crawlers can see the instruction. **Owner decision pending:** whether to opt out of AI *training* crawlers (GPTBot, Google-Extended, CCBot). This doesn't affect search visibility.
9. **OG images.** Original branded 1200×630 PNGs of the Critter Crew (`public/og/`), plus real 960×600 game screenshots captured with synthetic local state. Generate them with `node scripts/prerender-images.mjs [--shots <preview-url>]`, then commit.
10. **Fonts.** Self-hosted Baloo 2 800 and Nunito 400/700 (Latin subset), hashed under `/assets/` (immutable cache), with `font-display: swap`. Baloo 800 is preloaded. CSS (~11 KB) is inlined, so there is no render-blocking request.

## Performance budget (content pages)
LCP < 2.0 s on a mid-range phone, CLS < 0.05, JS ≤ 30 KB.

Measured with Lighthouse 12.8.2 (mobile preset, simulated slow 4G + 4× CPU) against `vite preview` on the shared, loaded dev box, so treat these as indicative:

| Page | LCP | CLS | TBT | Transfer |
|---|---|---|---|---|
| `/` | 1.5 s | 0 | 30 ms | 93 KiB |
| `/games/glow-cave-hops` | 1.3–1.4 s | 0.001 | 10–40 ms | 131 KiB |
| `/guides/making-ten…` | 1.3 s | 0.001 | 130 ms | 79 KiB |

- Lighthouse SEO and Accessibility scored 100 on all three.
- JS is 1.3 KB transferred per page; e2e asserts exactly one script under 30 KB.
- One earlier game-page run showed TBT of 1.2 s while CPU load was about 11; reruns under `flock` were normal.
- Real-device numbers and field CWV are not measured yet.

## Content quality
See `docs/CONTENT_QUALITY.md`. `tests/unit/site.test.ts` enforces it mechanically:
- per page: title, description, canonical, OG, exactly one h1, heading outline, valid JSON-LD;
- every internal link, anchor and image resolves;
- the sitemap equals the page set;
- banned efficacy wording;
- guides: every citation resolves, and each guide has more than 450 words.

## Open items
- Real 404 page.
- Search Console and Bing Webmaster verification (needs the owner's account).
- Field CWV via Cloudflare Web Analytics only after a privacy review (child pages must stay tracker-free).
- `hreflang` when other locales launch.
- Re-check the guides with the curriculum agent.
