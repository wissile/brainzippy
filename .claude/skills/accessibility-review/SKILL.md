---
name: accessibility-review
description: Accessibility audit for BrainZippy screens and games (keyboard, screen reader, captions, drag alternatives, reduced motion, contrast, tap targets). Use after UI changes and before releases.
---
# Accessibility review

Run and record results (pass / fail / not tested):
1. `npx playwright test e2e/behaviour.spec.ts -g "keyboard|muted|reduced"`.
2. Keyboard: every interactive element reachable by Tab in a sensible order, visible focus ring, Enter/Space activate, number keys answer choices.
3. Screen reader semantics: buttons have aria-labels describing the action ("apple, not counted yet"); live region `data-testid="live-caption"` mirrors speech; play area lists objects so counting is possible non-visually.
4. Audio: every spoken line is captioned; game is fully playable muted and when audio files fail.
5. Drag-and-drop always has a tap/keyboard alternative.
6. Reduced motion: no looping body motion, no confetti; states still distinguishable by pose/face.
7. Contrast: text ≥4.5:1 (≥3:1 for ≥24 px bold); check prompt pill and choice numerals.
8. Targets: ≥44 px measured (e2e "tap targets" test); ≥64 px recommended for under-7s.
Report failures with WCAG reference, file:line and fix.
