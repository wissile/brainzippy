# BrainZippy — Cloudflare Architecture Notes (validated 2026-11-17)

Sources: developers.cloudflare.com, read on 2026-11-17. "UNVERIFIED" marks claims the docs I read do not state outright.

## 0. Versions (npm registry, 2026-11-17)
- `@cloudflare/vite-plugin` **1.69.1** (published 2026-11-16). `wrangler` **4.163.0** (published 2026-11-16).
- The repo already pins `^1.69.1` / `^4.163.0` and `vite ^8.3.8`. **Verified** against the plugin 1.69.1 peer dependencies: `vite ^6.1.0 || ^7.0.0 || ^8.0.0` and `wrangler ^4.160.0`, so the current repo combination is compatible.
- **Stay on plugin v1 + Wrangler.** v1 is "the current stable version". v2 is beta, reads `cloudflare.config.ts`, ignores Wrangler config, writes output to `.cloudflare/output`, and deploys only with the new `cf` CLI ("Wrangler cannot deploy applications built with Vite plugin v2"). — https://developers.cloudflare.com/workers/vite-plugin/ , https://developers.cloudflare.com/workers/vite-plugin/v2-beta/
- The `cf` CLI is in beta and "does not yet cover every Wrangler task" (no `tail`, no single-secret commands). Wrangler is not deprecated. — https://developers.cloudflare.com/cf/wrangler/

## 1. React + Vite on Workers (plugin v1)
- Install: `npm i -D @cloudflare/vite-plugin wrangler`. Add `cloudflare()` after `react()` in `vite.config.ts`. The plugin reads `wrangler.jsonc|json|toml` from the project root, or `configPath`. — https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- **`vite dev`** runs the Worker inside a local `workerd` process that closely matches production. Asset routing (`assets` config) replaces Vite's defaults, so dev routing matches prod. — https://developers.cloudflare.com/workers/vite-plugin/
- **`vite build`** outputs the client and the Worker, plus a **generated `dist/.../wrangler.json`**. `vite preview` and `wrangler deploy` use that generated file automatically, not the input config. `assets.directory` is ignored in input config under Vite. — React guide above. https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
- Scripts: `"dev": "vite dev"`, `"build": "vite build"`, `"preview": "npm run build && vite preview"`, `"deploy": "npm run build && wrangler deploy"`. — https://developers.cloudflare.com/workers/vite-plugin/get-started/
- Source maps: set `environments.worker.build.sourcemap = true`. The plugin then adds `upload_source_maps` to the output config. Setting `upload_source_maps` alone generates nothing. — https://developers.cloudflare.com/workers/vite-plugin/reference/migrating-from-wrangler-dev/
- Security note from the docs: local workerd/Miniflare "is not a hardened sandbox". Never run untrusted Worker code locally.

### `assets` keys — https://developers.cloudflare.com/workers/static-assets/binding/
- `not_found_handling: "single-page-application"` serves `/index.html` with **200** for unmatched paths. — https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- `run_worker_first`: `false` (default), `true`, or an array of patterns (`*` deep match, `!` negation, negation wins, max 100 entries). The array form needs Wrangler ≥4.20 / plugin ≥1.7. It also turns off automatic navigation detection.
- With a compatibility date ≥ 2025-04-01 and no `run_worker_first` array, navigation requests (`Sec-Fetch-Mode: navigate`) skip the Worker and are not billed.
- `binding: "ASSETS"` exposes `env.ASSETS.fetch(req)`. It is only needed if the Worker must serve assets itself.
- `.assetsignore` (gitignore syntax) excludes files from upload.

### compatibility_date — https://developers.cloudflare.com/workers/configuration/compatibility-dates/
- Set it to the current date at project start. Bump it deliberately after reviewing the flags changelog and running tests. Old dates stay supported. **Recommendation:** move from `2026-10-01` to `2026-11-17` in the next config change, then run the e2e tests. `nodejs_compat` (already set) is fine. Its exact semantics were not re-verified on this pass.

## 2. D1
- Binding: `d1_databases: [{ binding, database_name, database_id, migrations_dir?, migrations_table?, preview_database_id?, remote? }]`. The default migrations folder is `migrations/` and the default table is `d1_migrations`. — https://developers.cloudflare.com/d1/reference/migrations/
- Commands (`--env` is global): `wrangler d1 create <NAME>` (remote), `wrangler d1 migrations create <DB> <MESSAGE>`, `wrangler d1 migrations list|apply <DB> --local|--remote [--preview] [--persist-to]`, `wrangler d1 execute <DB> --local|--remote --file x.sql`. The docs page does not state whether apply defaults to local or remote. **Always pass `--local` or `--remote` explicitly in scripts.** — https://developers.cloudflare.com/workers/wrangler/commands/d1/
- Local persistence: the Vite plugin persists state to **`.wrangler/state`** by default (`persistState: false | {path}`). Wrangler local D1 also persists between runs. — https://developers.cloudflare.com/workers/vite-plugin/reference/api/ , https://developers.cloudflare.com/d1/best-practices/local-development/
  - UNVERIFIED (inferred from the matching default path): `wrangler d1 migrations apply brainzippy-db --local` writes to the same `.wrangler/state` that `vite dev` reads. Check this once in the repo (apply, then query through `/api`).
- `"remote": true` on a binding makes dev hit the real DB. Remote changes are irreversible, so **never use it with production**. `remoteBindings` defaults to true in the plugin, but it only affects bindings marked `remote`.
- Staging: use a separate D1 database per environment (`env.staging.d1_databases`). Apply migrations with `wrangler d1 migrations apply brainzippy-db-staging --remote --env staging`.
- Limits: Free gives 500 MB per DB, 10 DBs, 50 queries per invocation (a `batch()` counts as 1), and 7-day Time Travel. Paid gives 10 GB per DB and 30 days. — https://developers.cloudflare.com/d1/platform/limits/
- Rows read count **scanned** rows, so index every `WHERE` column. — https://developers.cloudflare.com/d1/platform/pricing/

## 3. R2 vs static assets
- Binding: `r2_buckets: [{ binding: "MEDIA", bucket_name: "brainzippy-media" }]`. Create the bucket with `wrangler r2 bucket create`. Serve objects with `get(key, { range, onlyIf })`, then `writeHttpMetadata`, then `etag`. — https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
- **Recommendation:** ship versioned, build-time media (UI art, SFX, core voice lines, Rive files ≤25 MiB each) as **static assets**. They are free, unlimited, and hashed by Vite. Free plans allow up to 20,000 files per version (Paid 100,000), and each file can be at most 25 MiB. — https://developers.cloudflare.com/workers/platform/limits/
- Use **R2** for large or growing catalogs that change without a deploy (voice packs per locale, future content), and for anything over 25 MiB. R2 egress is free. Serve it through a **custom domain** (Cloudflare cache, WAF), not `r2.dev`, which is rate-limited and dev-only. — https://developers.cloudflare.com/r2/buckets/public-buckets/
- Serving R2 through the Worker counts as a billed Worker request plus a Class B op. A custom-domain public bucket with cache avoids the Worker (UNVERIFIED: exact cache-hit billing for R2 custom domains).

## 4. Caching and `_headers`
- `_headers` and `_redirects` are supported. Put them in Vite's **`public/`** directory, using paths relative to the client build output (`/assets/*`). They apply at build, preview, and deploy. Dev support is not documented. — https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/
- Default asset headers are `Cache-Control: public, max-age=0, must-revalidate` plus an `ETag`. **There is no automatic immutable caching for hashed files**, so opt in. — https://developers.cloudflare.com/workers/static-assets/headers/
- `_headers` allows at most 100 rules, each line ≤2,000 chars. Duplicate headers are joined with commas, so detach with `! Header`. **`_headers` does NOT apply to Worker-generated responses** (`/api/*`). Set headers in the Worker for those.

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```
(The CSP is a proposal. `wasm-unsafe-eval` is for the Rive WASM runtime. Validate it in browsers before shipping.) Header set reference: https://developers.cloudflare.com/workers/examples/security-headers/

## 5. Secrets
- Local secrets go in `.dev.vars` **or** `.env`, not both (`.dev.vars` wins). Per-env files are `.dev.vars.staging` (which replaces the base file entirely) or the `.env.<env>[.local]` chain. Gitignore `.dev.vars*`, `.env*`, and `.wrangler`. — https://developers.cloudflare.com/workers/configuration/secrets/
- Remote: `wrangler secret put KEY [--env staging]` deploys immediately. `wrangler versions secret put KEY` creates a version only. A top-level `secrets` list of required names makes deploys fail if one is missing. Store API tokens only in the CI secret store.

## 6. Environments, previews, CI
- `env.staging` in wrangler.jsonc. **With the Vite plugin, choose the env at build time:** `CLOUDFLARE_ENV=staging vite build`, then a plain `wrangler deploy`. `--env` on deploy "is not applicable", and `CLOUDFLARE_ENV` at deploy has no effect. — https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/
- **Version URLs:** `wrangler versions upload [--preview-alias pr-12]` gives `<alias>-<worker>.<subdomain>.workers.dev`. These URLs are public unless Cloudflare Access is added, use production bindings, and are controlled by `preview_urls`. — https://developers.cloudflare.com/workers/configuration/previews/
- **Worker Previews** (new, changelog 2026-09-22): `wrangler preview` (≥4.135.0) creates a per-branch environment from a `previews` config block. Settings are not inherited. D1 and R2 are isolated only if you bind separate resources. Free allows 100 previews per Worker. — https://developers.cloudflare.com/workers/previews/ . This is attractive for PR QA, but new. Evaluate it in Phase 7.
- **Workers Builds** (Git integration): pushes to the production branch deploy. Other branches create Previews; set the deploy command to `npx wrangler versions upload` for version-only. Free tier: 3,000 build minutes/month, 1 concurrent build, 20-minute timeout. — https://developers.cloudflare.com/workers/ci-cd/builds/ , https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- **GitHub Actions:** use `cloudflare/wrangler-action@v4` with `apiToken` and `accountId` from repo secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Make the token a custom token with "Edit Cloudflare Workers" permission, scoped to the one account. — https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/ . UNVERIFIED: whether that template includes D1 Edit. If CI runs `d1 migrations apply --remote`, add Account › D1 › Edit.
- **Recommendation:** run tests in GitHub Actions, then build with `CLOUDFLARE_ENV`, then deploy with wrangler-action. Keep one deploy path, not Workers Builds plus Actions together.

## 7. Recommended wrangler.jsonc
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "brainzippy",
  "main": "./worker/index.ts",
  "compatibility_date": "2026-11-17",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "workers_dev": true,          // set false for production once custom domain is live
  "preview_urls": false,        // public by default; enable only behind Access
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]   // only API invokes (billable) Worker
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "brainzippy-db",
      "database_id": "<from wrangler d1 create>", "migrations_dir": "migrations" }
  ],
  "r2_buckets": [ { "binding": "MEDIA", "bucket_name": "brainzippy-media" } ],
  "ratelimits": [
    { "name": "API_LIMITER", "namespace_id": "1001", "simple": { "limit": 60, "period": 60 } }
  ],
  "vars": { "APP_ENV": "production" },
  "env": {
    "staging": {
      "vars": { "APP_ENV": "staging" },
      "d1_databases": [
        { "binding": "DB", "database_name": "brainzippy-db-staging",
          "database_id": "<staging id>", "migrations_dir": "migrations" }
      ],
      "r2_buckets": [ { "binding": "MEDIA", "bucket_name": "brainzippy-media-staging" } ],
      "ratelimits": [
        { "name": "API_LIMITER", "namespace_id": "1002", "simple": { "limit": 60, "period": 60 } }
      ]
    }
  }
}
```
Bindings (d1/r2/ratelimits/vars) are **not inherited** into `env.*`, so repeat them. UNVERIFIED on this pass; based on long-standing Wrangler behaviour. Add R2 only when the first R2-hosted asset exists.

## 8. Costs (current list prices)
| Item | Free | Paid ($5/mo min) | Source |
|---|---|---|---|
| Worker requests | 100k/day; Error 1027 after (fail open/closed) | 10M/mo incl., +$0.30/M | [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [limits](https://developers.cloudflare.com/workers/platform/limits/) |
| Worker CPU | 10 ms/invocation | 30M CPU-ms/mo incl., +$0.02/M ms; 30 s default, 5 min max | same |
| Static asset requests | **Free, unlimited** | Free, unlimited | [billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| Assets files / size | 20k files/version, 25 MiB each | 100k files, 25 MiB | limits |
| Worker bundle | 64 MiB uncompressed, 128 MB memory | same | limits |
| D1 rows read | 5M/day | 25B/mo incl., +$0.001/M | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| D1 rows written | 100k/day | 50M/mo incl., +$1.00/M | same |
| D1 storage | 5 GB total (500 MB/DB) | 5 GB incl., +$0.75/GB-mo | same |
| D1 egress | free | free | same |
| R2 storage (Standard) | 10 GB-mo | $0.015/GB-mo | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| R2 Class A (Put/List) | 1M/mo | $4.50/M | same |
| R2 Class B (Get/Head) | 10M/mo | $0.36/M | same |
| R2 egress | **free** | free | same |
| Workers Builds | 3,000 min/mo, 1 concurrent | 6,000 min, +$0.005/min | builds pricing |

Free D1 limits reset at 00:00 UTC. Static asset navigations and files never touch these quotas. Only `/api/*` does.

## 9. Rate limiting (free tier)
- **Workers Rate Limiting binding** (`ratelimits`): per-location and approximate. `period` must be 10 or 60. Key it on a hashed guest ID or route, never raw PII. Needs Wrangler ≥4.36. Free-plan availability and pricing are **not stated** on the page (UNVERIFIED). — https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- **WAF rate-limiting rules** on the Free plan: 1 rule, IP only, 10 s period, 10 s mitigation. Use it as a coarse `/api/*` flood guard. — https://developers.cloudflare.com/waf/rate-limiting-rules/
- Strict global limits need Durable Objects. That is unnecessary for guest play.

## Open items / flags
1. (Resolved) Plugin 1.69.1 supports Vite 8.
2. Verify that `--local` migrations and `vite dev` share `.wrangler/state`.
3. Confirm the API token permission set for D1 migrations in CI.
4. Free-plan availability of the Rate Limiting binding is undocumented. Test it with a deploy.
5. Plan for plugin v2 / `cf` CLI GA. Do not migrate while it is in beta.
