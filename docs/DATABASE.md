# Database decision: Cloudflare D1 (stay on the free tiers until there are paying customers)

Status: **recommended and implemented** (migrations `0001`–`0003`). Researched 2026-11-17/18 against vendor pricing and limits pages (links below). Prices change; re-check before relying on a number.

## Recommendation
Keep **Cloudflare D1** on the **Workers Free** plan. It is the cheapest option ($0), adds no vendor, keeps data in the same platform that already serves the app, and its limits are far above what BrainZippy needs before launch. Move to **Workers Paid ($5/month)** only when one of the triggers in "What forces Workers Paid" happens. Revisit the choice of database itself at the points under "When to revisit".

## What the app needs
- Small relational data: parents, children (≤4 per parent), friendships, challenges, tokens, sessions. Progress is one JSON column per child (≤64 KB, typically 5–40 KB).
- Low write volume: about 1 write per finished game (sync), a few per sign-in.
- Hard deletes on request (COPPA/GDPR), with a short, statable backup window.
- Runs inside the Worker: no connection pooling, no extra network hop, no extra secrets.

## Options compared

| | **D1 (chosen)** | Hyperdrive + Postgres (Neon) | Turso | Supabase |
|---|---|---|---|---|
| Free tier | Workers Free: 5 M rows read/day, 100 k rows written/day, 5 GB total storage, 500 MB per DB, 10 DBs | Hyperdrive Free: 100 k queries/day. Neon Free: 100 CU-hours/project/month, 1 GB storage/project, scales to zero after 5 min | 100 DBs, 5 GB, 500 M rows read/month, 10 M rows written/month | 500 MB DB; **projects pause after 1 week of inactivity**; no automatic backups |
| First paid step | Workers Paid **$5/month** (includes 25 bn rows read, 50 M rows written/month, 5 GB) | Neon Launch: usage-based, $0.106/CU-hour + $0.35/GB-month | Developer $5.99/month ($4.99 yearly) | Pro from **$25/month** |
| Point-in-time recovery | Time Travel: **7 days Free, 30 days Paid**, included | Neon Free: 6 hours (≤1 GB history) | 1 day Free, 10 days Developer | Pro: daily backups kept 7 days; PITR add-on $100/month per 7 days |
| Latency from the Worker | Binding, no TCP/TLS handshake; single primary (read replicas optional) | Extra hop to the Postgres region; Hyperdrive pools/caches | HTTP to Turso region | HTTP/Postgres to Supabase region |
| Operational extras | None (binding in `wrangler.jsonc`) | Second vendor, connection string secret, region choice | Second vendor + token | Second vendor; Auth/Storage we don't need |
| Lock-in | SQLite dialect; `wrangler d1 export` gives a SQL dump; portable to any SQLite/libSQL (Turso) | Standard Postgres (least lock-in) | libSQL/SQLite (easy to move to/from D1) | Postgres, but app code drifts into Supabase APIs |
| COPPA deletion | `DELETE` is immediate in the live DB; copies remain in Time Travel up to 7/30 days | Immediate; history window per plan | Immediate; PITR window per plan | Immediate; backups 7 days on Pro |

Notes: Neon Free storage is 1 GB per project, 20 GB total. Turso's site announced (Nov 2026) that Turso is joining Supabase; treat its long-term pricing as uncertain. Supabase's free-tier pausing makes it unsuitable for a production app even at low traffic.

## D1 limits that matter (verified)
- Per database: **500 MB (Free) / 10 GB (Paid)**. Our worst case is ~4 children × 64 KB + small rows ≈ 0.3 MB per family → ~1,500 families per 500 MB at the worst case, realistically 5,000–15,000 families (typical progress is far smaller than the cap). When we approach 400 MB, move to Paid (10 GB) or trim history (`HISTORY_CAP`).
- **50 queries per Worker invocation (Free)**, 1,000 on Paid; a `batch()` counts as one. Every route uses ≤ 6; account deletion uses one batch. The digest job uses 3 per run.
- 100 bound parameters per query (we cap `IN (...)` lists at 90), 2 MB per row, 30 s per query.
- Single-threaded per database: ~1,000 queries/s at 1 ms each. Far above our needs.
- Rows read are counted by rows **scanned**: every `WHERE` column we filter on has an index (see `0003_accounts.sql`).

## Cost: staying on the free tiers
Everything runs on **Workers Free + D1 Free + Resend Free** today. Static assets (the game) are free and unlimited and never invoke the Worker; only `/api/*` counts.

Estimated usage per active child per day (5 games, parent opens the dashboard once): ~5 sync requests + ~6 dashboard requests ≈ **11 Worker requests**, ~**10 D1 rows written** (sync update + rate-limit counter), ~**60 rows read**.

| Free-plan limit | Limit | Rough capacity at the estimate above |
|---|---|---|
| Worker requests | 100,000/day (resets 00:00 UTC; over-limit requests fail) | ~9,000 active children/day |
| D1 rows written | 100,000/day | ~10,000 active children/day |
| D1 rows read | 5,000,000/day | ~80,000 active children/day |
| D1 storage | 500 MB per DB / 5 GB total | ~5,000–15,000 families (see above) |
| CPU per request / per cron run | 10 ms | Sync merges ≤64 KB JSON (expected 1–4 ms; **measure** with `wrangler tail` before launch). Digest runs are capped at 25 parents (`DIGEST_BATCH`) to stay inside 10 ms |
| Subrequests per invocation | 50 | Digest sends one Resend **batch** call per run (≤100 emails) |
| Cron Triggers | 5 per account | We use 2 |
| Resend (email) | Free plan quota (check resend.com/pricing) | Magic links + digests; the digest only goes to opted-in parents on days a child played |

### What forces the $5 Workers Paid plan
Move to Paid when **any** of these is true (whichever comes first):
1. **Worker requests regularly above ~70,000/day** (70% of the free 100k, which hard-fails beyond the limit and would break sign-in and sync for everyone until midnight UTC).
2. **D1 rows written above ~70,000/day** or **database size above ~400 MB**.
3. **CPU time errors** (`exceededCpu`) on `/api/children/:id/sync` or on the digest cron (larger histories, more children).
4. **More than ~150 opted-in digest parents** (6 runs × 25 per evening on Free); on Paid raise `DIGEST_BATCH` to 90.
5. We need **Time Travel beyond 7 days** for our stated deletion/backup window (privacy policy currently says "up to 30 days", which is the Paid window; on Free it is 7 days, which is also within that promise).
6. **Billing goes live** (Stripe webhooks + more traffic): the $5 is trivial against revenue at $6.99/month per family; one paying family covers it.

Watch these in the Cloudflare dashboard (Workers & Pages → Metrics; D1 → Metrics). Set a usage notification at 70% of each daily limit.

## When to revisit the database choice
- A single D1 database approaches **8 GB** on Paid (the 10 GB cap): split by data type (e.g. move round history to R2 or a second D1) or consider Postgres.
- We need **cross-table analytics or full-text search** that SQLite handles poorly, or many concurrent writers per family (not expected).
- **International expansion with data-residency requirements** (EU-only storage): check D1 location hints/jurisdiction options at that time, or a regional Postgres.
- Cloudflare D1 pricing or limits change materially (re-run this comparison).

## Backups, deletion and retention
- D1 **Time Travel** gives point-in-time restore for 7 days (Free) / 30 days (Paid). It is also the only place deleted rows survive, for that window. The privacy draft states "up to 30 days".
- Before any risky migration: `wrangler d1 export brainzippy-db --remote --output backup.sql` (store encrypted, delete within 30 days).
- Deletion paths delete rows explicitly (not only via `ON DELETE CASCADE`). Retention table: `docs/PRIVACY_SECURITY.md`.

## Sources (read 2026-11-17/18)
- D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- D1 + Workers pricing: https://developers.cloudflare.com/workers/about/pricing
- Workers limits (CPU, subrequests, crons): https://developers.cloudflare.com/workers/platform/limits/
- Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Rate limiting binding (considered, not used: per-location and approximate): https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Hyperdrive pricing: https://developers.cloudflare.com/hyperdrive/platform/pricing/
- Neon Free plan: https://neon.com/faqs/free-plan-limits-and-quotas
- Turso pricing: https://turso.tech/pricing
- Supabase pricing: https://supabase.com/pricing
- Resend send / batch / unsubscribe: https://resend.com/docs/api-reference/emails/send-email , https://resend.com/docs/api-reference/emails/send-batch-emails , https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails
