# BrainZippy Privacy Policy — DRAFT

> **DRAFT — NOT LEGAL ADVICE — NOT PUBLISHED.** Written by the engineering team to describe what the software actually does (see `docs/PRIVACY_SECURITY.md`). A qualified lawyer must review and finalise it before any real parent account is enabled. Items marked **[LAWYER]** need a legal decision. Company name, address and contact details are placeholders.

_Last updated: [DATE]. Version: draft-2026-11-18._

## 1. Who we are
BrainZippy ("we", "us") makes learning games for children aged 3–14 at brainzippy.com. Contact: [privacy@brainzippy.com] · [Company legal name, address]. **[LAWYER]** EU/UK representative if required.

## 2. The short version
- Children can play **without an account**. Guest play stores progress only in the browser on your device.
- Only a **parent or guardian** can create an account, using **their own email**. We never ask for a child's email, password, photo, voice or location.
- Your child's **first name stays on your device**. Child profiles use a monster name the family chooses. A nickname is stored only if you turn that on.
- No ads, no tracking or analytics scripts on children's pages, no chat, no public profiles.
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
| For each child profile: monster design, monster name, age group (e.g. "ages 6–8"), optional nickname (off by default) | Show progress to you; friends see the monster | Contract / consent (nickname) |
| Settings (games per day, sound, music) | Apply your choices | Contract |
| Game progress: levels, stars, stickers, skills practised, the last 200 games (date, game, level, number of first-try answers, minutes) | Dashboard, points, streaks, daily summary | Contract |
| Friend connections and challenge scores | Friends-only leaderboard and challenges you approve | Consent of both parents |
| Rate-limit counters (keyed hashes of IP addresses or emails, not the raw values) | Prevent abuse | Legitimate interest (security) |

## 4. Friends and challenges
Friends are added only by an invite that one parent sends and the other parent accepts; **both parents approve**. Friends can see only your child's **monster name, monster picture, weekly points and challenge scores**. They never see the nickname, your email, age group or detailed progress. There is no messaging and no free text between families. You can remove a friend at any time. **[LAWYER]** whether this sharing is a "disclosure" under COPPA requiring a stronger consent method (see `COPPA_CHECKLIST.md`).

## 5. Emails
We send sign-in links when you ask for them. If you turn it on, we send a short daily summary on days your child played. Every summary has a one-click unsubscribe link. We never email children.

## 6. Who processes data for us
- **Cloudflare, Inc.** — hosting and database (Workers, D1). **[LAWYER]** DPA, sub-processors, international transfers.
- **Resend** — sending emails (your email address and the email content). **[LAWYER]** DPA, transfers.
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
| Database recovery history | Deleted data can remain in our database provider's point-in-time recovery history for **up to 30 days**, then it is gone |

## 8. Your choices and rights
From the parent area (behind a grown-up check) you can: see and change your children's profiles and settings; turn the nickname and daily summary on or off; **download all your data (JSON)**; **delete a child profile** or **delete your account**, which removes it from our live database immediately. You can also clear everything stored on a device. Under COPPA you can review, delete and refuse further collection of your child's information; under GDPR/UK GDPR you also have rights of access, rectification, erasure, restriction, portability and objection, and to complain to your supervisory authority. Contact [privacy@brainzippy.com]. **[LAWYER]** response timelines and identity verification for requests made outside the parent area.

## 9. Security
Sign-in links and session identifiers are stored only as one-way hashes. Cookies are HttpOnly, Secure and SameSite. Requests that change data must come from our own site. Access is rate-limited. Our team never uses real children's data for development or testing.

## 10. Children's privacy
BrainZippy is designed for children, and we follow a data-minimising design: children cannot create accounts, enter contact details, chat, or publish anything. **[LAWYER]** confirm the verifiable parental consent method (Section 4 and `COPPA_CHECKLIST.md`), UK Age Appropriate Design Code assessment, and the age of digital consent for each EU country we serve.

## 11. Changes
If we change this policy in a way that affects children's data, we will ask parents for consent again before the change applies. **[LAWYER]** notice mechanism.
