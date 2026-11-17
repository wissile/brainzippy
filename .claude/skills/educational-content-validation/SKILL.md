---
name: educational-content-validation
description: Validate exercise data and curriculum mapping for correctness, age fit and progression. Use when exercises, skills, voice-line wording or progression rules change.
---
# Educational content validation

1. `npm test` — includes `lintExercise` over all definitions, progression and voice-line tests.
2. For each changed exercise check: target within the skill's range; choices contain the target, distractors are ±1 (plausible) and unique; poolSize > target for make-set; objective matches skillId; a11yDescription accurate.
3. Simulate learners with `tests/unit/progression.test.ts` patterns: all-first-try, all-second-try, all-struggling. Each must produce a full round without repeats and with sensible difficulty.
4. Wording: short (≤12 words for ages 4–6), concrete, no idioms; praise process.
5. Cross-check skills against docs/CURRICULUM.md and record any new skill with prerequisites and mastery criteria.
6. Never describe outcomes as proven; label hypotheses.
