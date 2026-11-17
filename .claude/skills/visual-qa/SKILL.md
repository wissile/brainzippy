---
name: visual-qa
description: Capture and inspect screenshots of BrainZippy at standard viewports to catch layout overflow, overlap, unreadable text and off-brand visuals. Use after any UI, art or CSS change and before milestone sign-off.
---
# Visual QA

1. `npx playwright test e2e/full-round.spec.ts` (all four projects). Screens land in `test-results/screens/<project>-*.png`.
2. Open every screenshot (Read tool) and check:
   - Nothing clipped or off-screen (buttons, stars, sticker, speech bubbles); no horizontal scroll.
   - Countable objects never overlap and are ≥44 px; speech bubble never hides an object the child must tap.
   - Text ≥18 px for children's UI, high contrast on the scene; numerals readable at arm's length.
   - Characters match docs/CHARACTER_SYSTEM.md (ink outline, eye shine, palette hex values).
   - One style system only: no emoji art, stock images, or stray fonts.
3. Viewports: 390×844, 915×412, 1024×1366, 1280×800. Also emulate `reducedMotion: "reduce"`.
4. Report each defect with screenshot path, viewport, and suggested fix. Never claim a viewport was checked if its screenshot was not opened.
