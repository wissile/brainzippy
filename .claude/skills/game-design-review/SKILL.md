---
name: game-design-review
description: Review a BrainZippy game or exercise change for learning value, child usability, feedback quality and engine separation. Use after implementing or changing a game, interaction type, or progression rule.
---
# Game design review

1. Read the game definition (`src/games/<game>/definition.ts`) and docs/CURRICULUM.md entry. Confirm one explicit learning objective per exercise.
2. Play it: `npm run dev`, open `/play/<game>`; or run `npx playwright test e2e/full-round.spec.ts --project=desktop` and open `test-results/screens/`.
3. Check, marking each **verified / not verified**:
   - ≤3 taps from home to first interactive object; instruction is spoken, captioned, replayable.
   - Immediate (<100 ms) response to every input; correct feedback ≤1.8 s then advance.
   - Wrong answer → gentle retry → strategy hint → modelled answer. No punishment, no lost stars.
   - Idle ≥9 s → replays instruction and shows the hand pointer.
   - Praise is about process, never ability. No timers or speed scoring for young children.
   - Engine separation: no game logic in boards; no React in `src/engine`; new rules unit-tested.
   - Difficulty curve: each level can fill a full round for a struggling child.
4. Report findings by severity with file:line, and the exact steps you executed.
