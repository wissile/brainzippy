# SEO, AEO & GEO Strategy

## Principles
Useful, factual pages for parents and teachers; the game itself is the product, not the SEO surface. No thin or duplicated landing pages; no promised AI-answer placement.

## Information architecture (Phase 7)
```
/                         brand + what BrainZippy is
/games/                   game directory (one page per game)
/games/counting-adventure learning objective, skills, how to play, screenshots, age, "Play" CTA
/subjects/math/           subject hub → skills → games
/ages/4-6/                age hub with developmental notes
/skills/counting/         plain-language explainer for parents/teachers (what, why, how to practise at home)
/grown-ups/               privacy, safety, how progression works
/sitemap.xml  /robots.txt
```
Play routes (`/play/*`) are `noindex` app screens; content pages are prerendered static HTML (readable without JS) built from the same game/skill data so they never drift from the product.

## Implementation checklist
Unique `<title>`/description per page (milestone 1 sets titles client-side for app routes) · canonical URLs · `Organization`, `WebSite`, `LearningResource`/`VideoGame` structured data where accurate · breadcrumb links · alt text from `a11yDescription` · Core Web Vitals within budget · consistent entity naming ("BrainZippy", game and character names).

## Status
Milestone 1: `robots.txt`, canonical, meta description on the shell, readable grown-ups page. Sitemap and prerendered content pages are Phase 7.
