---
name: cloudflare-deployment
description: Prepare and run a BrainZippy deployment to Cloudflare (preview or staging). Production requires explicit owner approval. Use when asked to deploy, create resources, or run remote migrations.
---
# Cloudflare deployment

**Production (brainzippy.com) requires the owner's explicit written approval in the current conversation. Never infer it.**

Preconditions: `release-checklist` passed; `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit, D1:Edit, scoped to one account) available as an env var or CI secret — never in files.

1. First time only: `npx wrangler d1 create brainzippy-db` (and `brainzippy-db-staging`); paste the IDs into wrangler.jsonc.
2. `npm ci && npm run typecheck && npm test && npm run build`.
3. Migrations: `npx wrangler d1 migrations apply brainzippy-db-staging --remote --env staging` (explicit `--remote`).
4. Staging: `CLOUDFLARE_ENV=staging npm run build && npx wrangler deploy` (the Vite plugin selects the environment at build time).
5. Preview version without promoting: `npx wrangler versions upload --preview-alias <branch>`.
6. Smoke test: `curl https://<host>/api/health`, then `BASE_URL=https://<host> npx playwright test --project=desktop -g "complete round"`.
7. Record version id, URL and test results in docs/ROADMAP.md status.
