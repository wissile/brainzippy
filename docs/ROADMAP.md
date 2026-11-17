# Roadmap & Backlog

Phases follow the master instructions. A phase is complete only when its acceptance criteria are verified.

## Milestone 1 — Phase 0–3 vertical slice: Counting Adventure  ✅ complete locally (pending owner review)
| Gate | Evidence |
|---|---|
| Working implementation | Full 12-step flow playable at `npm run dev`; PRODUCT_REQUIREMENTS F1–F12, A1–A3, P1, R1–R2 |
| Code review | Independent security/code reviewer agent — findings fixed except API rate limiting (DECISIONS.md) |
| Functional tests | `npm test`: 36 unit tests pass · `npx playwright test`: 41 pass, 27 skipped by design (behaviour suite runs on desktop + phone; a few desktop-only) |
| Visual inspection | Screenshots at 390×844, 915×412, 1024×1366, 1280×800 inspected; defects found and fixed (portrait intro overlap, reward offset, phone-landscape collapse/overlap) |
| Accessibility review | Independent QA/a11y reviewer: 1 critical + 4 high found and fixed (DECISIONS.md) |
| Security/privacy review | Independent reviewer: 2 high + 5 medium; all fixed except rate limiting (mitigated: sync off) |
| Performance | Budgets met (TESTING_STRATEGY.md) |
| Docs | 13 docs + concepts board |
| Production deploy | **Not done** — requires Cloudflare credentials and your explicit approval |

Known limitations: voice is browser speech synthesis (device-dependent quality) until a voice actor is recorded; characters are hand-built SVG/CSS (Rive needs an artist-authored file); AdaptedMind gameplay could not be inspected (behind enrollment); remote D1/preview/CI deploy unverified (no account access); no rate limiting yet (server sync is switched off until it and a restore path exist); not yet tested with a real screen reader or on physical devices.

## Next milestone (proposed) — M2: Production-quality voice & polish + staging deploy
1. Voice: cast/record Bobbo (≈60 lines); wire `file` entries; loudness-normalise. *Decision needed: budget and casting route.*
2. Staging on Cloudflare: create D1 DBs, API token in CI, staging deploy + smoke e2e on the deployed URL. *Needs: Cloudflare account access.*
3. Rate limiting on `/api/*`; parent gate on grown-ups actions.
4. Rive pilot for Bobbo (if an animator is available) keeping SVG fallback.
5. Address remaining review findings (DECISIONS.md D-010).

## Later phases
| Phase | Goal | Key acceptance criteria |
|---|---|---|
| 4 Curriculum & adaptive | multi-session mastery, review items, fade feedback | mastery rules unit-tested; parent-readable rule page |
| 5 Parent accounts | consent, dashboard, export/delete | legal review signed off; COPPA VPC flow tested |
| 6 More content | Zuzu letters, Gloop shapes, Puff/Rumble math; new interaction types (number line, matching, sorting) | each game passes release checklist |
| 7 Hardening & SEO | prerendered content pages, sitemap, structured data, field CWV | Lighthouse/field metrics within budget |
| 8 Launch | production on brainzippy.com | owner approval + final review |

## Backlog (unscheduled)
- Background music loop (original) with separate volume.
- Error-specific counting feedback (e.g. pointing at an object the child skipped in free-count mode).
- Free-play "sandbox" corner (no scoring).
- Localisation framework for voice lines.
