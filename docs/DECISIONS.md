# Architecture & Product Decision Log

| ID | Date | Decision | Why | Alternatives considered |
|---|---|---|---|---|
| D-001 | 2026-11-17 | React 19 + TS strict + Vite 8 on Workers Static Assets with `@cloudflare/vite-plugin` v1 | Official current path; one deployable; `vite dev` runs the real Worker + D1 locally | Pages (legacy path); plugin v2 + `cf` CLI (beta, Wrangler can't deploy it) |
| D-002 | 2026-11-17 | TypeScript 5.9 rather than 7.0 | TS 7 (native) just shipped; tool compatibility risk not worth it for this milestone | TS 7 |
| D-003 | 2026-11-17 | `run_worker_first: ["/api/*"]` + SPA fallback | Static requests stay free and fast; only API calls bill | Worker in front of everything |
| D-004 | 2026-11-17 | Creative direction: **Critter Crew** (owner's character sheet) | Scores 33/35 vs 24 and 21 (docs/concepts); spans ages 3–14; SVG/Rive-friendly | Paper Garden, Star Arcade |
| D-005 | 2026-11-17 | Characters as hand-built SVG + CSS state animation for milestone 1 | Rive needs an artist-authored .riv; SVG gives real, testable states now with tiny payload; `MascotState` contract keeps Rive swap cheap | Rive placeholder, sprite sheets |
| D-006 | 2026-11-17 | SFX synthesized in-repo (`scripts/gen_sfx.py`) | Fully original, licence-free, reproducible, 168 KB | Stock libraries (licence tracking), generated-audio services (not available) |
| D-007 | 2026-11-17 | Voice: browser speech synthesis now, recorded actor before launch; engine prefers files | No voice-generation tool/actor available in this session; flagged explicitly rather than silently substituting | Ship silent; third-party TTS API (cost, child-data concerns) |
| D-008 | 2026-11-17 | Deterministic progression R1–R6; 8 exercises/round; ≥8 items at level 1 | Testable, explainable to parents; test exposed that 4 easy items forced strugglers upward | Probabilistic/BKT models (premature) |
| D-009 | 2026-11-17 | Anonymous guest: localStorage first, D1 backup keyed by server-minted UUID; no cookies; 180-day purge | Data minimisation; works offline; nothing identifies a child | Accounts now (needs consent flow + legal review) |
| D-010 | 2026-11-17 | Independent reviews for milestone 1 | See "Review findings" below | — |
| D-011 | 2026-11-17 | Turn **off** client→D1 progress sync until a parent-controlled restore path exists | Review H1: the backup was write-only (no restore), so it retained pseudonymous data with no benefit to the child | Keep syncing (rejected: data minimisation) |
| D-012 | 2026-11-17 | Captions overlay the prompt row on portrait/short-landscape screens | Review: bubble covered objects on phones; prompt row is free while speech plays | Shrink bubble into mascot column (unreadable at 86 px) |
| D-013 | 2026-11-17 | Bobbo's in-game lines never say "count twice" | Review: contradicts the one-to-one lesson; the trait stays in his bio only | — |
| D-014 | 2026-11-17 | Voice = pre-rendered Kokoro neural clips (voice: af_bella, owner choice) now; human takes via /studio override them | Owner wants a smooth human-sounding voice; no voice actor or TTS account available in-session; Kokoro is Apache-2.0, offline, consistent | Browser TTS (robotic, device-dependent); paid TTS API (account + cost) |
| D-015 | 2026-11-17 | First-run flow: story → bubble-pop → monster builder → names → age → grown-up → map | Owner request; AdaptedMind observed to gate play behind payment — hook with play and creation first | Straight to age picker (previous) |
| D-016 | 2026-11-17 | Ask for the **parent's** email (parent gate, consent, skippable), not the child's; child's name stays on device | COPPA restricts collecting a child's contact info without verifiable parental consent; master instructions require parent-controlled collection | Child email field (rejected) |
| D-017 | 2026-11-17 | Parent-signup endpoint returns 503 outside development until an email provider is chosen | Don't store addresses that can't be verified | Store and send later |

## Review findings (milestone 1)
Two independent agents reviewed the code they did not write. All findings below were triaged; fixes were re-verified by the full test suite (36 unit, 41 Playwright passing) and screenshots.

| Sev | Finding (reviewer) | Resolution |
|---|---|---|
| Critical | Tutorial/idle **hand pointer never visible**; becomes a grid row and squashes the board (CSS specificity) (QA) | Fixed: zero-specificity `:where()` selector; e2e "hand appears inside viewport and does not shift layout" on all 4 devices |
| High | Server backup write-only; grown-ups text promised it survives reset (Security H1) | Sync disabled (D-011); text corrected |
| High | Corrupt/old resume snapshot could blank the game permanently (Security H2) | `parseRoundSnapshot` + version field + ErrorBoundary; unit + e2e tests |
| High | Idle help pointed at a (wrong) number choice (QA) | Now replays "How many?" and points at the objects |
| High | Age tiles exposed as `listitem`, not buttons (QA, WCAG 4.1.2) | Roles removed; e2e asserts role=button |
| High | Speech bubble covered objects on phones (QA) | D-012; e2e "captions never cover objects" on all devices |
| Medium | Body size cap bypassable without Content-Length (Security M2) | Streaming byte-counted reader; unit test with chunked body |
| Medium | Parent delete failed silently; no parent gate (Security M3) | Checks `res.ok`, keeps id + retry message; arithmetic parent gate; e2e |
| Medium | Invocation logs would retain URLs incl. guest ids (Security M4) | `invocation_logs: false` |
| Medium | Make-set never reached a modelled answer (Security M5, QA 7) | 3rd miss sets basket to target, counts it aloud, child taps check; running count badges on basket items; unit test |
| Medium | Focus lost after Start/each exercise (QA 5) | Focus moves to first actionable element; to first choice after counting |
| Medium | Live captions only during play (QA 6) | Single live region in AppProvider for all screens |
| Medium | Low-contrast labels on Play/Again/Games; weak focus ring (QA 8–9) | Text stroke on labels; white + ink double focus ring |
| Medium | Age picker relied on reading "3–5" (QA 11) | Each age shown as its own numeral chip |
| Medium | No API rate limiting (Security M1) | **Open** — mitigated by sync being off; required before enabling sync/launch |
| Low | API lacked CSP/HSTS; double speech fallback; side effect in state updater; `resume` recomputed each render; unguarded star timer; `workers_dev`, `nodejs_compat`, compat date; robots→missing sitemap (Security) | All fixed |
| Low | Intro had no idle help; greeting contradicted lesson; objective text mismatch (QA 12–14) | Fixed (intro nudge + pointer after 8 s; D-013; text corrected) |
| Low | Short-landscape targets 44–48 px (QA 10) | Raised to 52–54 px (≥44 everywhere; 64 px aim not yet met on short landscape) |
| Open | Missing `/audio/voice/*` paths return index.html (SPA fallback) | Harmless (decode fails soft); revisit when voice files land |
Not verified by either reviewer: real screen readers (NVDA/VoiceOver), real devices, speech quality.
