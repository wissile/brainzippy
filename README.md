# BrainZippy

Friendly, ad-free learning games for children ages 3–14. First playable game: **Counting Adventure** (ages 4–6) with Bobbo.

## Run it locally
Requirements: Node.js 22+.
```bash
npm install
cp .dev.vars.example .dev.vars   # first time only: local development settings (gitignored)
npm run db:migrate:local   # first time only
npm run dev                # open http://localhost:5173
```
Tap **Play → 3–5 → Counting Adventure → ▶**. Sound starts after your first tap (browser rule); the speaker button toggles it.

## Test
```bash
npm run typecheck
npm test                   # unit tests (engine, progression, layout, schema, API)
npx playwright install chromium   # first time only
npx playwright test        # browser tests on desktop, phone, tablet, phone-landscape
```

## Docs
See `docs/` (product requirements, architecture, design system, characters, curriculum, privacy, testing, roadmap, decisions) and `CLAUDE.md` for contributor rules.
