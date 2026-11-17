---
name: release-checklist
description: Milestone and release gate for BrainZippy. Use before declaring any milestone complete or requesting deployment approval.
---
# Release checklist

Each gate must be **evidenced** (command output, screenshot path, or review report). Unexecuted = not passed.

1. Working implementation — the milestone's acceptance criteria in docs/ROADMAP.md, each verified.
2. Code review — independent agent review (game-engineer change reviewed by another agent).
3. Functional tests — `npm run typecheck`, `npm test`, `npx playwright test` all green; paste counts.
4. Visual inspection — `visual-qa` skill at 4 viewports.
5. Accessibility review — `accessibility-review` skill.
6. Security/privacy review — security-privacy-reviewer report; no BLOCKING items.
7. Performance — `npm run build` sizes within budget; slow-network e2e passes.
8. Documentation — DECISIONS.md, ROADMAP.md status, and changed docs updated.
9. Production only — final review + explicit owner authorisation. Do not publish to brainzippy.com without it.

Report: files changed, features, tests run + outcomes, screenshots, known limitations, next milestone.
