# Testing Strategy

## Layers
| Layer | Tool | Scope | Location |
|---|---|---|---|
| Unit (deterministic) | Vitest | validation, session reducer, feedback, progression (simulated learners), layout no-overlap property test, progress schema, voice-line catalogue, Worker API (fake D1) | `tests/unit/` |
| Browser E2E | Playwright 1.63 against the production build in workerd (`vite preview`) | full round, wrong-answer ladder, make-set, drag & drop, keyboard-only, muted, reduced motion, refresh resume, audio failure, slow network, API, tap-target/overflow checks, screenshots | `e2e/` |
| Visual | Playwright screenshots → human/agent inspection (`visual-qa` skill) | 4 viewports per state | `test-results/screens/` |
| Performance | CDP throttling script (Playwright) + build sizes | budgets below | see §Budgets |
| Reviews | independent agents (QA/a11y, security/privacy, code) | per milestone | DECISIONS.md |

## Device matrix (Playwright projects)
desktop 1280×800 mouse · phone (Pixel 7, 412×915 touch) · tablet 1024×1366 touch · phone-landscape (Pixel 7 landscape, touch). Behaviour tests run on desktop + phone; full-round and layout tests on all four.

## Conventions
- Tests act like a child: they count objects on screen and read the prompt; they never read the answer from internal state.
- `force` taps are used because breathing/drop-in animations never satisfy Playwright's stability check; layout checks wait for animations to settle before measuring.
- Most runs are muted (captions identical, waits shorter); the desktop full round runs with sound on.
- No real child data anywhere; seeded state contains only settings/progress.
- Never mark an unexecuted test as passed.

## Budgets (milestone 1, measured 2026-11-17)
| Metric | Budget | Measured | How |
|---|---|---|---|
| Initial JS (gzip) | ≤ 100 KB | 78 KB | `gzip -c dist/client/assets/index-*.js` |
| Game chunk (gzip) | ≤ 60 KB | 10.9 KB | same |
| CSS (gzip) | ≤ 15 KB | 7.0 KB | same |
| SFX total | ≤ 300 KB | 168 KB | `du public/audio/sfx` |
| LCP, slow 4G (1.6 Mbps/150 ms, 4× CPU, cold cache) | < 2.5 s | 2.0 s | CDP script, home page, 412×915 |
| LCP, fast 4G | < 1.5 s | 0.69 s | same |
| CLS | < 0.1 | 0.003 | PerformanceObserver |
| Tap → next frame (INP proxy, 4× CPU) | < 200 ms | 115–160 ms | rAF timing on Play |
Not yet measured: real-device Core Web Vitals (needs a deployed URL + field data), animation frame rate on low-end Android hardware.

## Results log
See ROADMAP.md milestone status for the latest run counts.
