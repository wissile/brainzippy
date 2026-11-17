# BrainZippy — Reference Research (Phase 0)

Status: DRAFT. Compiled 2026-11-17 using text-only WebFetch/WebSearch. No logins, paywalls, or access controls were bypassed. No AdaptedMind assets, text, or code are reproduced; quotes are kept under 15 words.

> **Scope and limits (read first).** This research used text fetches of public pages, official store listings, independent reviews and peer-reviewed sources. AdaptedMind's games sit behind enrollment, so **we did not observe its gameplay, voices, animation or sound directly**, and we did not try to get past any login or paywall. Any statement about those qualities is tagged *Reported* or *Assumed*. Recommended follow-up: one permitted manual session (free trial or public demo) logged as "Observed (manual)".

## Observed (manual browser session, 2026-11-17): AdaptedMind first-run flow

Walked through in a real browser (built-in browser pane), declining non-essential cookies, without entering any personal or payment details. Audio could not be heard in this session; observations are visual.

| # | Screen | Observed |
|---|---|---|
| 1 | Homepage | Monster-pattern hero, "Learn K-6 Math and Reading", one orange **Get Started Now** button |
| 2 | Grade picker | Large rounded list "Pick your math grade", grades 1–5+ with lesson counts and a one-line skill summary |
| 3 | Skill list preview | "Loading 205 skills" grid of skill groups with star counters (0/n) |
| 4 | Tapping any skill | Goes straight to enrollment: a "Get 30 days free of AdaptedMind" splash with monsters and a green **Next** button |
| 5 | Animated story (~60 s, auto-plays) | Full-screen animated monster scenes: a pet reward ("Great work! You got the pet!"), a curriculum/teaching scene, a monster parade with "First 30 Days Free! / No Commitment!" banners |
| 6 | Payment form | "Start Your FREE Trial": parent email, first/last name, card number; recurring price stated; "Includes up to 5 children" — **stopped here** |

**Finding:** a child never gets to play before an adult pays; the animated story sells rewards to the child, then hands off to a payment form. **BrainZippy's response (implemented):** play first (story → bubble-pop → build your own monster → adventure), no payment wall, and the only adult step is an optional, parent-gated email with consent.

## How this research shaped Counting Adventure (implemented in milestone 1)

| Research finding | Implemented as | Where |
|---|---|---|
| Fast, account-free start beats pretests/forms | 3 taps from home to first object; anonymous guest play | `src/app/screens.tsx` |
| Long/unskippable intros frustrate kids (reported) | Intro has a play button available immediately; prompts ≤ ~8 words; replay button always visible | `GameRunner.tsx`, `voiceLines.ts` |
| Ask "how many?" after counting (Le Corre & Carey 2007; cardinality) | tap-count → explicit cardinality question; hint "the last number we said tells how many" | `feedback.ts` |
| "Give me N" tasks show a child's real number knowledge | make-set interaction with too-many / too-few hints | `session.ts`, `boards.tsx` |
| Escalating hints beat a single "try again" | gentle retry → strategy hint (count-along / cardinality / ten-frame slots) → modelled answer the child still taps | `feedback.ts` |
| Praise effort/process, not ability (Cimpian et al. 2007) | All praise lines refer to counting carefully; unit test bans "smart/genius" | `voiceLines.test.ts` |
| Expected rewards can lower intrinsic interest (Deci et al. 1999) | Stars show progress only; one sticker per round; no shop, currency, streak pressure or purchase prompts | `GameRunner.tsx` |
| Calm screens help young learners (Fisher et al. 2014) | Scene motion is subtle; mascot returns to idle while the child answers | `characters.css` |
| Spaced/multi-session mastery (Vlach & Sandhofer 2012) | **Not yet**: planned for Phase 4 (mastery across ≥2 sessions, review items) | `docs/ROADMAP.md` |
| Error-specific counting feedback (skipped / double-counted) | Partly: double taps are ignored with a wiggle so a child can't double-count; skip detection is N/A because every object must be tapped | `boards.tsx` |

---

Evidence levels used throughout:
- **Observed**: seen directly in fetched page text (official site or official store listing).
- **Reported**: stated by a third party (review site, journalist, advocacy group, competitor blog).
- **Assumed**: inference or industry convention, not verified.

---

## 1. Access log

| URL | Reachable? | What it contained |
|---|---|---|
| https://www.adaptedmind.com/ | Yes, body text rendered | Headline "Learn K-6 Math and Reading"; tagline about real learning being fun; meta description "Learning can be monsterific!"; claims of 2M+ parents, ~200 countries, 400M+ problems solved; quick pretest sets starting point; difficulty auto-adjusts; "Points, badges, cute monsters"; 10,000+ teacher explanation videos; parent/teacher reports incl. email delivery. No prices. Links to enrollment, login, about, testimonials, guarantee, scholarships, privacy, and an explainer MP4. |
| https://www.adaptedmind.com/loggedout/lp-main | Metadata only | Title references free math worksheets/practice; keywords grades 1–6. No body (client-rendered). |
| https://www.adaptedmind.com/Begin-Enrollment.html | Metadata + nav only | Nav lists Math, Reading, Science, Social Studies, "Super Skills", all pointing to enrollment. Embedded video stream URL. No enrollment fields or prices visible. |
| /info/about, /info/guarantee, /info/privacy, /info/testimonials, /info/scholarships, /gradeLevel.php?grade=1 | Metadata only | Each returned only the "monsterific" meta description and a Google Tag Manager reference. Body is JavaScript-rendered and not visible to a text fetch. |
| https://www.adaptedmind.com/robots.txt | Yes | Allows all crawlers (empty Disallow). |
| https://apps.apple.com/app/id6473857440 | Yes | Official iOS listing "AdaptedMind Math: Learning App": PreK–8, age rating 4+, pretest, adaptive path, games/puzzles, instructional videos, parent progress reports, 30-day free trial then auto-renew, 4.7/5 (~8K ratings). Privacy labels (developer-declared): Identifiers, Usage Data, Diagnostics "used to track you"; Contact Info linked to user; "may vary" by age. Accessibility features not declared. |
| https://nz.trustpilot.com/review/adaptedmind.com | Yes | 4.5/5 from ~1,120 reviews; themes summarized in §2. Trustpilot notes the company has not recently invited reviews. |
| https://brighterly.com/blog/adapted-mind-reviews/ | Yes | Competitor (tutoring company) blog; summarizes pricing ($9.95/subject/month after 30-day trial, per that blog), app glitches, unskippable instruction complaints. Treated as low-reliability. |
| Khan Academy Kids (khanacademy.org/kids) | Yes (after redirect) | Ages 2–8, five characters incl. narrator Kodi Bear, free/no ads/no subscriptions, personalized path, Head Start ELOF + Common Core alignment, 4,000+ activities, nonprofit privacy claims. |
| Common Sense Media: Prodigy, Endless Numbers, ABCmouse | Yes | Independent editorial reviews; see §3. |
| Axios & Fairplay (Prodigy FTC complaint) | Yes | 22-group complaint to FTC; Fairplay post dated Feb 23, 2021. |
| Kidscreen + Toca Boca help center | Yes | Toca Boca's "digital toys" philosophy. |
| Research sources (PubMed, PMC, CMU, APS, Vanderbilt, Purdue/Case) | Mostly yes | PMC once returned a CAPTCHA (Le Corre & Carey read from an alternate PDF host instead). PubMed abstract for Deci et al. returned no body; full PDF read from a university host. |

---

## 2. Pattern table (AdaptedMind as primary reference)

| Pattern | Observed / reported (source) | Evidence | Why it helps children | Educational benefit | Original BrainZippy equivalent | How BrainZippy improves on it |
|---|---|---|---|---|---|---|
| **Onboarding / steps to first play** | Homepage: a quick pretest sets the starting point. Enrollment flow body not visible. App Store: 30-day trial at signup. Brighterly: trial is automatic and paid. | Observed (pretest exists); Reported (trial mechanics); step count **not inspectable** | A placement step avoids content that is too easy or too hard | Starts the child near their zone of proximal development | Guest play: one tap on a big play button, then the first counting round. No account, email, or payment before play. Placement happens silently by playing the first 3–5 easy items, not as a "test." | Zero-form start; placement disguised as warm-up play; no credit card for a child to see. Target: ≤2 taps from landing to the first interactive object. |
| **Instruction delivery** | Homepage: teachers explain missed problems in video (10k+ videos). Trustpilot/Brighterly: some long intros and verbal instructions can't be skipped. | Observed (videos exist); Reported (unskippable) | Spoken/visual explanation suits pre-readers | Explicit modeling after an error | Short (≤6 s) voiced prompt from a mascot, with an animated demo ("watch me count") the first time a mechanic appears. A replay-voice button is always visible. | Micro-explanations in context instead of long videos. Always skippable/replayable. Text shown alongside audio for 6+. |
| **Characters** | Homepage: "cute monsters"; meta "monsterific". Trustpilot: monsters, eggs, pets motivate kids. App Store listing describes none. | Observed (monsters mentioned); Reported (eggs/pets) | Characters build emotional attachment and give a social partner | Responsive characters support the "social interaction" pillar (Hirsh-Pasek et al., 2015) | Original BrainZippy cast (Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff; art in progress) with defined states: idle, greet, think, encourage, celebrate, gentle retry. | Characters are part of the teaching (e.g., a mascot points at each item while counting) rather than only collectibles. Reduced-motion variants. |
| **Correct feedback** | Homepage: points and badges. Specific animation/sound **not inspectable**. | Observed (points/badges); Assumed (celebration animations) | Immediate confirmation reduces uncertainty | Verification feedback helps novices (Fyfe & Rittle-Johnson, 2015) | Brief (<1 s) celebration, then the mascot restates the math: "Five! You counted five stars." | Feedback names the concept, not just "correct." Praise targets process ("you touched each one"), never ability. |
| **Incorrect feedback** | Homepage: video explanation of missed problems. Specific wrong-answer UX **not inspectable**. | Observed (explanation videos exist) | Avoids dead ends | Elaboration after errors | No buzzer, no lost lives. Gentle-retry mascot state, then the objects re-animate one at a time with a count-along. | Error-specific responses: e.g., if the child skipped an object, highlight the uncounted one; if they double-counted, show the tagging. |
| **Hints** | No hint system described on fetched pages. Common Sense notes Prodigy hints are limited. | Not observed for AdaptedMind | Reduces frustration | Scaffolding fades as competence grows | 3-level hint ladder: (1) re-voice the prompt, (2) mascot points at the first object and counts it, (3) worked demo of the whole count, then a fresh similar item. | Hint use is logged as a learning signal (not a penalty) and drives mastery rules. |
| **Rewards / progression** | Homepage: points, badges, monsters. Trustpilot: eggs, pets, tokens motivate. App Store: achievements unlock levels. | Observed + Reported | Visible progress sustains motivation | Mixed; expected tangible rewards can undermine intrinsic interest (Deci et al., 1999) | A world map where completing a skill grows the scene (e.g., the balloon rises, the cave lights up). Occasional unexpected cosmetic surprises. | Rewards tied to mastery and the narrative, not a currency shop. No streak pressure, no loss aversion. |
| **Adaptive / grade structure** | Homepage: algorithm builds a custom plan; difficulty auto-adjusts; formative checks on old and new skills. Grades K-6 (site) vs PreK–8 (App Store). Reviews: difficulty sometimes mismatched. | Observed (claims); Reported (mismatch) | Right-sized challenge | Formative review supports retention | Deterministic, documented rules: e.g., advance after 4 of the last 5 correct with ≤1 hint across ≥2 sessions; step back after 2 consecutive misses with hint 3. | Transparent rules a parent can read; parent override of level; spaced review items mixed in. |
| **Parent features** | Homepage: simple, actionable reports; real-time data; email reports; classroom reporting. Trustpilot: progress alerts, daily time limits. | Observed + Reported | Adults can support learning | Home-school connection | Phase 5: parent dashboard behind a parent gate; skill-level progress in plain language. | No email or PII needed for guest play. Data export/deletion. Avoid tracking SDKs (contrast: AdaptedMind's App Store labels declare tracking identifiers and usage data). |
| **Mobile** | Native iOS app exists (iOS 15.1+, 49.5 MB). Brighterly/Trustpilot: freezing, videos not loading, iPad problems. | Observed (app exists); Reported (stability) | Children mostly use tablets | Reliability protects engagement | Responsive web app (PWA later), touch-first, large hit targets, offline-tolerant assets. | Explicit performance budgets plus Playwright tests on tablet viewports. Small first load. |
| **Billing / trust** | Brighterly and Trustpilot report cancellation and recurring-charge complaints. | Reported | n/a | n/a | No purchase prompts in child mode; any future billing lives only behind the parent gate. | Easy cancellation; never upsell to children (see Prodigy complaint, §3). |

---

## 3. Other references

**Khan Academy Kids** (official page, Observed)
- Ages 2–8. Free, no ads, no subscriptions. A nonprofit privacy stance: does not sell data or allow cross-app tracking.
- A cast of five characters with a narrator bear. Shows that one narrator figure can anchor a cast.
- Personalized path plus free exploration. Aligned with Head Start ELOF and Common Core; says it was developed with Stanford experts.
- Takeaway: free and ad-free with child privacy is the trust bar BrainZippy competes against.

**Prodigy Math** (Common Sense Media, Axios, Fairplay: Reported)
- Answering math earns spells for battles. Common Sense says a lot of time passes between math questions and math can seem an afterthought.
- Hints are limited and wrong-answer feedback is thin.
- Repeated pressure to buy membership. A 22-group FTC complaint (Fairplay post dated Feb 2021) alleged membership-only rewards were marketed to children. A school district cited "manipulative marketing targeted at children."
- Takeaway: keep learning density high and keep monetization away from children entirely.

**Endless Numbers / Originator** (Common Sense Media, Reported)
- Each number is a monster with that many eyes. Kids tap the eyes to wake it, so the quantity becomes physical and countable. Numerals and counting are spoken repeatedly.
- No pressure or fail state; self-paced.
- Limitations: the addition section lacks manipulatives; locked numbers sit behind an in-app-purchase gate.
- Takeaway: embodying a quantity in a character is a strong original-able principle. BrainZippy should keep manipulatives through the operations too.

**ABCmouse** (Common Sense Media, Reported)
- Ages 2–8. Step-by-step learning paths. Tickets are earned and spent on avatar, room, and pet items.
- Reviewers flag that shopping-as-reward undercuts its no-ads stance, that the busy interface can overwhelm, and that some activities are basic point-and-click.
- Takeaway: avoid a currency shop and keep navigation sparse for young kids.

**Toca Boca** (Kidscreen, Toca help center: company statements)
- Describes its products as "digital toys" with no imposed goals, time limits, or points.
- Distinguishes toys (open play) from games (rules, right/wrong, winning).
- Takeaway: give BrainZippy a no-stakes "sandbox" corner (free counting play) and borrow the toy-like tactile feel of objects, while the core game keeps clear learning goals.

---

## 4. Learning-science evidence and design rules

1. **Counting principles and cardinality develop in stages.** Under the Give-a-Number task, children learn "one," "two," "three" (sometimes "four") in order before grasping the cardinal principle, on average around age 4 (range ~3;2–5;7 in one sample). Source: Le Corre & Carey, 2007, *Cognition* 105, 395–438 (https://semantics.uchicago.edu/kennedy/classes/s09/experimentalsemantics/lecorre-carey07.pdf), building on Wynn (1990) and Gelman & Gallistel (1978). *Strength: strong, replicated developmental finding.*
   **Rule:** Include "give me N" items (child drags exactly N objects to a basket), not just "how many?" items. Treat set sizes 1–4 and 5–10 as separate skills. Ask "how many?" after counting to probe cardinality, instead of accepting the counting sequence alone.

2. **Subitizing supports number sense.** Clements argues that instantly recognizing small quantities (perceptual subitizing) and composing them (conceptual subitizing) should be taught. Source: Clements, 1999, *Teaching Children Mathematics* (reprinted 2021, https://doi.org/10.5951/MTLT.2021.0220). *Strength: practitioner synthesis from a leading researcher. The article body was not accessible to me; the claims are from my background knowledge and the title.*
   **Rule:** Add short "flash" rounds (1–5 dots in canonical dice/finger patterns, then grouped patterns like 2+3). Use stable arrangements before random ones.

3. **Linear number board games improve number magnitude knowledge.** Four 15-minute sessions with a numbered linear board game closed low-income preschoolers' estimation gap; a color version did not. Source: Siegler & Ramani, 2008, *Developmental Science* 11(5) (https://pubmed.ncbi.nlm.nih.gov/18801120/). *Strength: moderate–strong, randomized, replicated by the same group.*
   **Rule:** Movement through game worlds (e.g., balloon race lanes, cave hops) should use equally spaced, numbered steps with count-aloud. Numbers must matter in the mechanic, not decorate it.

4. **Four pillars of educational apps.** Apps teach better when they are active (minds-on), engaged (not distracted), meaningful, and socially interactive. Unrelated noise, motion, or side games disrupt learning. Source: Hirsh-Pasek et al., 2015, *Psychological Science in the Public Interest* 16(1) (https://www.psychologicalscience.org/publications/educational-apps.html). *Strength: expert review/framework, not a single trial.*
   **Rule:** Every animation and sound must serve the learning goal or the feedback. Mascots respond contingently to the child's actions. Interactions require a decision, not just tapping.

5. **Visual clutter hurts young children's attention and learning.** Kindergartners were off-task 38.6% of the time in a decorated room vs 28.4% in a sparse one, and scored 42% vs 55%. Source: Fisher, Godwin & Seltman, 2014, *Psychological Science* (https://www.cmu.edu/news/stories/archives/2014/may/may27_decoratedclassrooms.html). *Strength: moderate (n=24, within-subjects, physical classroom; transfer to screens is assumed).*
   **Rule:** Keep game scenes calm. Backgrounds should be low-contrast and static during the question; ambient animation pauses while the child is answering.

6. **Feedback helps novices but can hinder partially knowledgeable learners.** Verification feedback raised procedural scores for children with no strategy (50% vs 18%) but lowered them for children who already had one (62% vs 81%). Source: Fyfe & Rittle-Johnson, 2015, *Journal of Educational Psychology* 107(2) (https://news.vanderbilt.edu/files/FyfeRittleJohnson2015_JEP.pdf). *Strength: moderate; grades 2–3, math equivalence, one-on-one. Generalizing to ages 4–6 counting is an assumption.*
   **Rule:** Give rich feedback on early items in a skill and fade elaborated feedback as accuracy rises (keep a light correctness cue). Do not interrupt a child mid-count.

7. **Worked examples reduce load for novices; the effect reverses with expertise.** Source: Sweller, van Merriënboer & Paas, 2019, *Educational Psychology Review* 31(2), 261–292 (https://doi.org/10.1007/s10648-019-09465-5). *Strength: strong for older students; little direct evidence in 4–6-year-olds (assumption).*
   **Rule:** Introduce each mechanic with a mascot demonstration ("watch me"), then a shared item ("let's do it together"), then independent items. Hint level 3 is a full worked demo followed by a new isomorphic item.

8. **Retrieval practice benefits children.** The benefit is largest when retrieval is effortful but successful; research on young children is still limited. Source: Fazio & Marsh, 2019, *Current Directions in Psychological Science* (https://www.psychologicalscience.org/journals/current-directions/0963721418806673/). *Strength: moderate; the authors themselves note the evidence base is emerging.*
   **Rule:** Each session opens with 1–2 quick items from earlier-mastered skills, pitched at a level the child is likely to get right.

9. **Spacing improves generalization in young children.** Children aged 5–7 who got four science lessons spread across four days generalized better than massed or clumped groups, one week later. Source: Vlach & Sandhofer, 2012, *Child Development* 83(4), 1137–1144 (https://pmc.ncbi.nlm.nih.gov/articles/PMC3399982). *Strength: moderate (n=36), consistent with a large adult literature.*
   **Rule:** The mastery criterion needs success across ≥2 separate sessions/days. Mix review items into later sessions. Vary objects and contexts (stars, cookies, gems) so counting is not tied to one picture.

10. **Praise the process, not the person.** "You did a good job drawing" vs "You are a good drawer" affected young children's motivation after setbacks. Source: Cimpian, Arce, Markman & Dweck, 2007, *Psychological Science* 18, 314–316 (cited via https://www.learningscientists.org/blog/2017/11/15-1). Related: action ("let's do science") vs identity ("be scientists") framing increased 4–6-year-old girls' persistence (Rhodes et al., 2019, *Psychological Science* 30(3)). *Strength: small experimental studies. Broader growth-mindset interventions show little to no achievement effect in a 2023 meta-analysis (Macnamara & Burgoyne, *Psychological Bulletin*; https://case.edu/news/researchers-education-intervention-doesnt-live-promise).*
    **Rule:** Voice-line library uses action/process praise ("You counted every one!") and bans trait praise ("You're so smart!"). Do not claim BrainZippy builds a "growth mindset."

11. **Expected tangible rewards can undermine intrinsic motivation, especially in children.** Expected tangible rewards reduced free-choice behavior (d = −0.36); unexpected ones had no effect. Effects were larger for children. Verbal praise helped college students but not significantly for children. Source: Deci, Koestner & Ryan, 1999, *Psychological Bulletin* (https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf). *Strength: strong meta-analysis (128 studies); the size of the effect is debated in the literature.*
    **Rule:** No "do X to earn Y" offers. Progress visuals grow from mastery itself. Surprise cosmetic moments are occasional and unannounced. No currency shop.

12. **Kids' apps are saturated with manipulative advertising.** 95% of 135 apps used by children ≤5 contained ads, including characters pushing in-app purchases. Source: Meyer, Radesky et al., 2019, *Journal of Developmental & Behavioral Pediatrics* (https://michiganmedicine.org/health-lab/advertising-kids-apps-more-prevalent-parents-may-realize). *Strength: descriptive content analysis.*
    **Rule:** No ads and no purchase prompts in child mode. Mascots never ask for purchases. External links only behind a parent gate.

---

## 5. Could not inspect

- **AdaptedMind gameplay itself.** All game screens are behind enrollment/login, and I did not attempt to bypass this. No game interactions, question formats, or screens were observed.
- **Audio of any kind.** Text fetch cannot hear voice-over, sound effects, music, or voice timing for any product.
- **Animation and motion.** Character animation, transitions, celebration effects, and timing cannot be seen via text fetch.
- **The AdaptedMind explainer videos** (MP4/HLS URLs found but not watched).
- **Most AdaptedMind body text** (about, privacy policy, guarantee, testimonials, scholarships, grade pages). These rendered as metadata only because they are client-side JavaScript.
- **Enrollment flow steps, required fields, and current pricing.** The price cited comes only from a competitor blog.
- **The exact number of taps to first play** for any reference product.
- **Mobile/tablet behavior first-hand.** Stability claims come from reviews only.
- **Visual design** (illustration style, color, layout) of any reference product.
- **Full text of Clements (1999) and the Deci et al. PubMed abstract.** The latter was read from a university-hosted PDF instead.
- **Independent efficacy evidence** for any reference product. Company claims such as "95% report increased confidence" are unverified marketing.

Recommended next step: a human-run, permitted manual session (free trial or public demo where available) to record observations of the gameplay, audio, and animation that text fetches cannot capture, logged separately as "Observed (manual)".
