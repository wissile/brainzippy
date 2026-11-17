# Product Requirements

## Vision
A child opens BrainZippy, understands how to begin, enjoys playing, gets encouraging feedback, and learns something meaningful with little or no adult help. Joyful for children, trustworthy for parents.

## Users
| User | Needs |
|---|---|
| Child 3–5 / 6–8 (primary for milestone 1) | No reading required, spoken + captioned guidance, big targets, immediate feedback, no failure states |
| Child 9–14 (later phases) | Richer challenges, more text, deeper progression |
| Parent / carer | Safety, no ads, no data harvesting, visible learning value, control over sound and data |
| Teacher (later) | Clear objectives, curriculum mapping |

## Milestone 1 scope — Counting Adventure vertical slice (ages 4–6)
Learning objective: count up to 10 objects with one-to-one correspondence, know the last number counted tells how many, recognise small amounts at a glance, and count out a requested amount.

### Functional requirements and acceptance criteria
Each criterion is covered by an automated test (file in brackets) unless marked *manual*.

| # | Requirement | Acceptance criterion |
|---|---|---|
| F1 | Open BrainZippy | Home shows logo, crew, one large Play button; first interactive object reachable in ≤3 taps after Play [full-round.spec] |
| F2 | Age-appropriate selection | Age picker with 4 picture tiles; 3–5 and 6–8 show Counting Adventure; 9–14 show a friendly "coming soon" with a way back [full-round.spec, *manual* for 9–14] |
| F3 | Meet the mascot | Intro shows animated Bobbo greeting with captioned speech [full-round.spec] |
| F4 | Spoken instruction | Each exercise speaks its prompt; caption mirrors it; replay button repeats it [behaviour.spec "muted"] |
| F5 | Visual counting challenge | Objects never overlap, ≥44 px, within the play area at all 4 viewports [layout.test, full-round.spec "tap targets"] |
| F6 | Touch/mouse interaction | Tap-to-count, choose-a-number, make-a-set via tap **and** drag [behaviour.spec "drag"] |
| F7 | Immediate feedback | Every accepted input plays a sound and visual change in the same frame (count note + number badge; drop plop) [*manual*; code: audioEvents.ts] |
| F8 | Supportive hint | 1st miss: gentle retry + strategy hint, wrong choice greyed; 2nd miss: modelled answer (count-along + highlighted correct choice) [session.test, behaviour.spec "wrong answers"] |
| F9 | Celebrate correct | Confetti (unless reduced motion), chime, praise naming the number, star fills [full-round.spec, behaviour.spec "reduced motion"] |
| F10 | Progressive challenge | 8 exercises per round; difficulty rises after 2 first-try successes, drops after needing 3 attempts [progression.test] |
| F11 | Visual achievement | "Counting Champ" sticker reveal at round end; saved locally [full-round.spec] |
| F12 | Continue or exit | "Again" restarts; "Games" returns to game selection [full-round.spec] |
| A1 | No drag needed | Every drag has tap and keyboard equivalents [behaviour.spec "keyboard"] |
| A2 | No audio needed | Fully playable muted or with audio files failing; captions always shown [behaviour.spec "muted", "audio files failing"] |
| A3 | Reduced motion | No looping body motion or confetti; play unchanged [behaviour.spec "reduced motion"] |
| P1 | Guest session, no identity | No account; local storage holds only settings, coarse age band, stickers and skill tallies; server gets a random UUID + progress only [progressSchema.test, worker.test, full-round.spec storage check] |
| R1 | Refresh-safe | Reload mid-round resumes at the same exercise with stars kept [behaviour.spec "refresh"] |
| R2 | Slow network | Playable on 400 kbps / 400 ms RTT [behaviour.spec "slow network"] |

### Non-functional requirements
- Performance budgets: see TESTING_STRATEGY.md §Budgets.
- Accessibility: WCAG 2.2 AA where applicable + child rules in CLAUDE.md.
- Privacy: PRIVACY_SECURITY.md. Original assets only.

## Out of scope for milestone 1
Accounts, parent dashboard, payments, other subjects, multi-session mastery, recorded voice actor, Rive animation, SEO landing pages (see ROADMAP.md).
