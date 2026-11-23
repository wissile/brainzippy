# BrainZippy Privacy Policy — DRAFT

> **DRAFT — NOT LEGAL ADVICE — NOT PUBLISHED.** Written by the engineering team to describe what the software actually does (see `docs/PRIVACY_SECURITY.md`). A qualified lawyer must review and finalise it before any real parent account is enabled. Items marked **[LAWYER]** need a legal decision. Company name and address are placeholders; the contact address is hello@brainzippy.com (owner decision 2026-11-22).

_Last updated: [DATE]. Version: draft-2026-11-18._

## 0. Two modes: guest-only (live now) and account mode (future) **[LAWYER]**

The product runs in one of two modes, chosen by feature flags in `wrangler.jsonc` (decision D-030). This draft covers **account mode**; the guest-only mode has its own short notice, published now.

| | Guest-only mode (production today) | Account mode (future, after legal review) |
|---|---|---|
| Flags | `ACCOUNTS_ENABLED`, `BILLING_ENABLED`, `FRIENDS_ENABLED` all `"false"`; no VAPID keys | One or more flags `"true"` |
| Public notice | `/privacy`, the **early-access privacy notice**, generated from the build's flags (`src/site/pages/privacy.tsx`) so it never describes a feature that is off. It is labelled: "Early-access privacy notice. A full policy will be published before accounts or payments are switched on." | This document, once a lawyer has finalised it. It must replace `/privacy` **before** any flag is switched on in production |
| Personal data we receive | None. The Worker writes no database rows for guest players (unit test: `tests/unit/launch-flags.test.ts`, "guest-only production writes nothing to D1"); rate limiting is not active, so not even keyed IP hashes are stored | As described in sections 3–7 below |
| On the device | Progress, monster, monster name, optional first name, age group, settings (`localStorage`); offline game files. "Delete all progress" removes the profile and progress, the reminder device id and the service worker's prefs cache | Same, plus a session cookie when a parent signs in |
| Server logs | Workers invocation logs are off; error lines carry no IP address and are kept by Cloudflare Workers Logs for up to 3 days (Free) or 7 days (Paid). Cloudflare processes IP addresses to deliver and protect the site under its own policy | Same |
| Email to hello@brainzippy.com | Used only to reply. If a child emails us, we reply to a grown-up, not to the child, and delete the child's message. **[LAWYER]** confirm this handling and any retention period | Same |
| Payments | None | Stripe (section 6) |

Still for a lawyer, even in guest-only mode: whether the early-access notice is sufficient on its own for COPPA (no personal information is collected from children) and for GDPR/UK GDPR transparency (the controller's identity and address are still placeholders; Cloudflare's processing of IP addresses), and whether the handling of children's emails is adequate.

## 1. Who we are
BrainZippy ("we", "us") makes learning games for children aged 3–14 at brainzippy.com. Contact: hello@brainzippy.com · [Company legal name, address]. **[LAWYER]** EU/UK representative if required.

## 2. The short version
- Children can play **without an account**. Guest play stores progress only in the browser on your device.
- Only a **parent or guardian** can create an account, using **their own email**. We never ask for a child's email, password, photo, voice or location.
- Your child's **first name stays on your device**. The name your child gives their monster also stays on your device. On our servers, each child profile has a made-up **public name** built from fixed word lists (for example "Sunny Bobblefin"), which you can change. A nickname is stored only if you turn that on.
- No ads, no third-party tracking or analytics scripts on children's pages, no chat, no public profiles.
- Anonymous play statistics (D-033): daily aggregate counters of game events (e.g. round finished, question answered wrongly with 7, onboarding step reached, device class, age band), with no name, account, device or browser id, cookie, IP address or exact time. Kept 400 days. **Lawyer to confirm** this needs no parental consent (COPPA "support for internal operations"; GDPR anonymous data; ePrivacy for the short-lived local queue).
- You can download or delete your data at any time from the parent area.

## 3. What we collect

### Guest play (no account)
Stored **only in your browser**: monster design and name, your child's first name if entered, age group, settings, progress. We do not receive it. Cloudflare, our host, processes your IP address to deliver the website; we do not store it.

### Parent account
| What | Why | Legal basis (EU/UK) **[LAWYER]** |
|---|---|---|
| Your email address | Sign-in links, account notices, optional daily summary | Contract; consent for the daily summary |
| Your consent (wording version and time) | Record that a parent agreed | Legal obligation |
| Sign-in and session records (stored as one-way hashes) | Keep you signed in securely | Contract / legitimate interest (security) |
| For each child profile: monster design, public name (from fixed word lists), age group (e.g. "ages 6–8"), optional nickname (off by default) | Show progress to you; friends see the monster | Contract / consent (nickname) |
| Settings (games per day, sound, music) | Apply your choices | Contract |
| Game progress: levels, stars, stickers, skills practised, the last 200 games (date, game, level, number of first-try answers, minutes) | Dashboard, points, streaks, daily summary | Contract |
| Friend connections and challenge scores | Friends-only leaderboard and challenges you approve | Consent of both parents |
| Rate-limit counters (keyed hashes of IP addresses or emails, not the raw values) | Prevent abuse | Legitimate interest (security) |
| If you subscribe: your Stripe customer and subscription ids, plan status and dates, and when you agreed to the renewal terms. Your card and billing address are collected by **Stripe**, not us | Provide the paid plan, prove consent to auto-renewal | Contract; legal obligation (renewal consent) |

### Daily reminders (optional, per device)
If you turn on daily reminders on a device (behind the grown-up check), we store, for that device only: a random device id, the push address and keys your browser gives us, the hour you chose and your device's timezone, and the date of the last reminder. This is not linked to your account or your child and contains no names or emails. The reminder text we send is generic; your child's monster name is added on the device itself and never sent to us. **[LAWYER]** whether the push address is a "persistent identifier" and the notice/consent needed.

## 4. Friends and challenges
Friends are added only by an invite that one parent sends and the other parent accepts; **both parents approve**. Friends can see only your child's **public name, monster picture, weekly points and challenge scores**. They never see the nickname, your email, age group or detailed progress. There is no messaging and no free text between families. You can remove a friend at any time. **[LAWYER]** whether this sharing is a "disclosure" under COPPA requiring a stronger consent method (see `COPPA_CHECKLIST.md`).

## 5. Emails
We send sign-in links when you ask for them. If you turn it on, we send a short daily summary on days your child played. Every summary has a one-click unsubscribe link. We never email children.

## 6. Who processes data for us
- **Cloudflare, Inc.** — hosting and database (Workers, D1). **[LAWYER]** DPA, sub-processors, international transfers.
- **Resend** — sending emails (your email address and the email content). **[LAWYER]** DPA, transfers.
- **Stripe** — payments, only if you subscribe (your email, card, billing address; our internal account id). Stripe is the one who sees your card. When you delete your account we delete your Stripe customer record, but **Stripe keeps records of past payments as the law requires** under its own privacy policy. **[LAWYER]** DPA, Stripe's controller/processor role, transfers.
- **Browser push services** (Google, Mozilla, Apple or Microsoft, depending on the browser) — only if you turn on reminders: they receive the encrypted reminder and deliver it to your device. **[LAWYER]** whether these are processors or independent controllers.
We do not sell or rent personal information and do not share it for advertising.

## 7. How long we keep data
| Data | Kept |
|---|---|
| Account and child profiles | Until you delete them. **[LAWYER]** inactive accounts: proposed deletion after 24 months without sign-in, with a warning email 30 days before |
| Sign-in links | Expire after 15 minutes; records removed within 1 day of expiry |
| Sessions | 30 days after last use, or until you sign out |
| Friend invites | Until used or 7 days |
| Challenges | 14 days |
| Abuse-prevention counters | 2 days |
| Billing records (our copy) | Until you delete your account (renewal-consent records: **[LAWYER]** may need longer). Stripe's own payment records: per Stripe's policy and the law |
| Daily-reminder subscription | Until you turn reminders off, or 180 days after the app last refreshed it |
| Database recovery history | Deleted data can remain in our database provider's point-in-time recovery history for **up to 30 days**, then it is gone |

## 8. Your choices and rights
From the parent area (behind a grown-up check) you can: see and change your children's profiles and settings; turn the nickname and daily summary on or off; **download all your data (JSON)**; **delete a child profile** or **delete your account**, which removes it from our live database immediately. You can also clear everything stored on a device. Under COPPA you can review, delete and refuse further collection of your child's information; under GDPR/UK GDPR you also have rights of access, rectification, erasure, restriction, portability and objection, and to complain to your supervisory authority. Contact hello@brainzippy.com. **[LAWYER]** response timelines and identity verification for requests made outside the parent area.

## 9. Security
Sign-in links and session identifiers are stored only as one-way hashes. Cookies are HttpOnly, Secure and SameSite. Requests that change data must come from our own site. Access is rate-limited. Our team never uses real children's data for development or testing.

## 10. Children's privacy
BrainZippy is designed for children, and we follow a data-minimising design: children cannot create accounts, enter contact details, chat, or publish anything. **[LAWYER]** confirm the verifiable parental consent method (Section 4 and `COPPA_CHECKLIST.md`), UK Age Appropriate Design Code assessment, and the age of digital consent for each EU country we serve.

## 11. Changes
If we change this policy in a way that affects children's data, we will ask parents for consent again before the change applies. **[LAWYER]** notice mechanism.
