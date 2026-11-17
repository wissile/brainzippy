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

## Review findings (milestone 1)
_To be filled from the independent QA/accessibility and security/code reviews._
