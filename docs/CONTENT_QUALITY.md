# Content quality checklist (public pages and guides)

Run this checklist on every new or changed page. **Auto** items are enforced by `tests/unit/site.test.ts`.

## Original and useful
- [ ] Written for BrainZippy. Nothing copied or lightly reworded from another site. Our own characters and art only; no stock images.
- [ ] Answers a real parent or teacher question with something they can *do* (an activity, a question to ask, a sign to watch for).
- [ ] Adds something a search result doesn't already say: our published rules, our screenshots, or concrete examples.
- [ ] No page exists just to target a keyword. Subject and age pages appear only when they have games and real content. **Auto:** they are data-gated, and guides must have more than 450 words.
- [ ] One clear topic per page. No keyword stuffing; write the way you would explain it to a parent.

## Accurate
- [ ] Every fact about a game matches the game. Ages, skills, levels and example puzzles come from `src/site/catalog.ts`; descriptions of hints and helpers match the game's `voice.json`.
- [ ] Entity facts (name, ages now vs planned, subjects, privacy, price) come from `src/site/entity.ts`. **Auto:** llms.txt is checked against them.
- [ ] Never describe a feature that hasn't shipped as available. Say "planned" or "on the way", and don't give dates.
- [ ] Update `updated` (and the sitemap `lastmod`) only when the content meaningfully changes.

## Cited
- [ ] Every research claim has an in-text citation linking to a reference in `src/site/content/references.ts`, with a working publisher, DOI or author-copy URL. **Auto:** every citation resolves, and every listed reference is cited.
- [ ] State the evidence strength honestly: sample, age group, and whether the finding is correlational. Say when a finding is extrapolated (adult or older-child research applied to young children).
- [ ] Separate what research found from what we do because of it.
- [ ] A reference not already logged in `docs/REFERENCE_RESEARCH.md` must have its authors, year and venue checked before publishing.

## No unsupported efficacy claims
- [ ] Say "built on research", never "proven", "guaranteed", "clinically", "scientifically validated", or "boosts grades or IQ". **Auto:** these words fail the test unless the sentence negates them or asks a question.
- [ ] BrainZippy itself has not been studied. Any page that discusses research says so.
- [ ] No invented statistics, testimonials, ratings, user counts or awards.

## Age-appropriate and safe
- [ ] Anything a child sees, such as the landing hero, uses simple words and big targets (Play ≥ 64 px; the landing uses 104 px).
- [ ] No purchase prompts, prices or account offers aimed at children. Pricing appears on parent-facing pages only once it is live.
- [ ] Praise and examples model process language ("you counted carefully"), never trait praise.
- [ ] No external scripts, fonts, trackers or embeds on any page. Outbound links go only to sources and use `rel="noopener"`.

## Technical
- [ ] Unique title (about 60 characters or less where possible) and description (70–170 characters). Canonical, Open Graph and Twitter tags, exactly one h1, no skipped heading levels. **Auto.**
- [ ] Images have meaningful alt text, width and height, and exist in `public/`. **Auto.**
- [ ] Renders and reads fully without JavaScript, with no horizontal overflow at 390×844. **Auto:** e2e.
