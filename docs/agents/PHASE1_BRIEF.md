# Phase 1 — shared brief for every agent

You are one of several agents building BrainZippy in parallel. The main agent (architect) integrates your work. Read `CLAUDE.md` first, then the docs relevant to your task.

## Product decisions (owner-approved 2026-11-17)
- Email provider: **Resend** (REST API from the Worker, `RESEND_API_KEY` secret; never in code).
- Payments: **Stripe** (Checkout + Billing + Customer Portal + webhooks; `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` secrets). Model: 14 days free play (device or account) → a grown-up adds a card → 14 more free days (Stripe trial) → **$6.99/month**. Free-access codes (bypass payment entirely) + Stripe promotion codes (discounts).
- Daily pace: default **5 games/day**, parent-adjustable 3–10; then "come back tomorrow". Each day mixes new material with review.
- Accounts are **parent-owned** (email magic link via Resend). Children are profiles under a parent: monster + monster name + nickname + age band; no child email/password. Child's real name never leaves the device unless a logged-in parent explicitly chooses to sync a nickname (default: monster name only).
- Leaderboards/challenges: **friends-only** via invite codes; show monster name + monster art only. No public child profiles, no chat, no free text between users.
- Framing: "built on research", never "proven". Legal docs are drafts pending a lawyer.
- Database: Cloudflare D1 (existing binding `DB`, database `brainzippy-db`). Migrations are append-only in `migrations/`.
- GitHub repo: `wissile/brainzippy` (main). Do NOT push; the main agent pushes.

## Non-negotiables (from CLAUDE.md, repeated because they matter)
- Original work only. No external CDNs, fonts, trackers or analytics on child pages.
- Children see no purchase prompts: anything about money/accounts sits behind the parent gate (2-digit × 1-digit multiplication, see `src/onboarding/Onboarding.tsx`).
- Game must work muted, by keyboard, without drag; tap targets ≥44px (64px for under-7s); no overflow at 390×844, 915×412, 1024×1366, 1280×800; reduced-motion path for every animation.
- Never claim a test passed without running it. Report exactly what you ran and the result.

## Working rules for parallel agents
- You work in your own git worktree. If `node_modules` is missing, run `ln -s /home/claude/brainzippy/node_modules node_modules` (add packages with `npm install <pkg>` only if truly needed and say so in your report).
- Use your assigned port for Playwright: `PW_PORT=<port> npx playwright test <your specs> --project=desktop` (and `--project=phone` for layout work). Don't run the whole suite — the main agent does that after merging. Keep runs targeted; other agents share the CPU.
- Only edit files you own (listed in your task). If you need a change in a shared file (e.g. `src/app/App.tsx`, `worker/index.ts`, `wrangler.jsonc`, `src/engine/*`), make the smallest possible edit and list it explicitly in your report.
- Commit your work in your worktree with clear messages (end each message with the `Co-Authored-By` / `Claude-Session` lines below). Don't rebase or merge main.
- Voice: add new spoken lines to your feature's `voice.json` (or `src/audio/voiceLines.json` for shared lines). The main agent renders clips with Kokoro af_bella afterwards; the clip-coverage unit test will fail until then — that's expected, say so.
- Report back in **≤250 words**: what you built, files touched (shared files called out), tests run + results, open issues, anything the main agent must do (secrets, bindings, cron, migrations, voice lines).

Commit trailer:
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BFkHUCBf4mW8F3hpui3mxn
```
