# Snug's Feelings Garden (`feelings-garden`)

Ages 4–7 · Social and emotional skills library (`sel`, "Calm Cove"), topic `sel.feel` · host **Snug**, helper **Rumble** · music `meadow`.
Spec: `docs/curriculum/social-emotional.md` §4. Code: `src/games/feelings-garden/`. Registry: `src/content/packs/library-sel/` (library now `live`).

## Objective
"Child can name how a character might feel using face, body and situation clues, and choose a kind action." A Critter Crew friend stands by their flower bed in Snug's garden. A picture bubble shows what happened. The child brings a **feeling flower** (a simple flower face with a word label) or an **idea card** to the friend. When it fits, the friend's bed blooms and the garden row at the top grows by one flower.

| Skill | CASEL competency | Levels | Child can… |
|---|---|---|---|
| `sel.feel.basic` | Self-awareness, social awareness | 0–3 | name happy, sad, angry, scared and surprised from a clear face and what happened, then from what happened alone (several answers fit) |
| `sel.feel.body` | Self-awareness | 4 | read body clues (tight fists, hugging knees, jumping, hiding eyes, crossed arms) |
| `sel.kind.notice` | Social awareness | 5 | choose a kind idea that could help a sad or scared friend |
| `sel.calm.strategy` | Self-management | 6 | choose a calm, safe idea for a big angry feeling |
| `sel.feel.more` | Self-awareness | 7 | name frustrated, proud, nervous, excited, disappointed and lonely, including mixed feelings |
| `sel.persp.two-sides` | Social awareness | 8 | show that two friends can feel differently about the same event |

CASEL is a framework, not a coded standard, so skills name the competency they practise (https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/).

## Levels (generator.ts: `FG_LEVELS`; time pressure: none)
| Lv | Shown | Options | Fits | Skill |
|---|---|---|---|---|
| 0 (+ tutorial) | clear face + what happened | 2 flowers: happy, sad | 1 | feel.basic |
| 1 | clear face + what happened | 2 flowers from happy/sad/angry/scared/surprised | 1 | feel.basic |
| 2 | clear face + what happened | 4 flowers: happy, sad, angry, scared | 1 | feel.basic |
| 3 | what happened only (friend turned away) | 4 flowers | 1–3 | feel.basic |
| 4 | body only (turned away, no bubble) | 4 flowers | 1–2 | feel.body |
| 5 | feeling given: "What could help?" | 3 idea cards | 1–2 | kind.notice |
| 6 | angry/cross: "What can they do?" | 3 idea cards | 1–2 | calm.strategy |
| 7 | finer feelings, face + what happened | 6 flowers | 1–3 | feel.more |
| 8 | one event, two friends: a flower each | 6 flowers | 1–3 per friend | persp.two-sides |

Content: 87 authored scenarios plus the tutorial (8–11 per level, 6 friends) in `bank.ts`. Each round slot draws from a fixed bucket of the level's list, so a round never repeats a scenario. Unit tests check every band across 60 seeds: at least 2 friends, at least 3 feelings, and never the same feeling 3 times in a row.

## Why this interaction
- **Bringing a flower to a friend** makes naming a feeling an act of understanding someone ("when a friend feels understood, their flowers bloom"). It is not a quiz.
- **Faces, then situations, then bodies** move children from the most visible clue to inference. Situation-only and body-only items deliberately accept several feelings. Facial expression is a clue, not proof, and children should not learn one "correct" emotion per face (spec §5).
- **Distractors are authored per scenario.** A feeling that could reasonably fit is either accepted or not offered. For example, "spider → scared" leaves out "surprised", and "tower falls" accepts sad and angry. A child is never told a reasonable feeling is wrong. Each distractor targets a misconception:
  - a happy flower for a sad situation targets "some feelings are bad";
  - laugh, walk away or look away targets "kindness doesn't matter";
  - throw, shout, push or knock it down targets "anger must come out as hitting";
  - level-8 pairs target "everyone feels the same".

## Hints and feedback (spec §4.3–4.7)
- **Correct:** the bed blooms, a heart pops up, and there is a soft chime. Praise names the process: "You noticed the clues!", "You read the body clues!", "That's a kind idea." After a help or calm idea, the friend's face softens.
- **First "not yet":** there is no wrong sound. `skin.missSfx` plays a single soft marimba note. The friend stays as they are. The flower floats back and dims. Rumble names the clue: face, body or what happened. Special cases:
  - "All feelings are OK…" when a happy flower is chosen for a hard situation;
  - **"Hmm. How might Gloop feel if we did that? What else could help?"** for a less kind idea;
  - "Big angry feelings are OK. What could Bobbo do that's safe?" for an unsafe idea;
  - "Friends can feel different…" on two-friend items.
- **Second:** Snug models the answer. She says "Let's look at the clues together", then a scenario line that names the clue and a fitting feeling, for example "Gloop worked hard on that tower. He might feel sad, or even angry." Every fitting flower glows and the rest dim. The child brings any glowing one (errorless).
- **Breathing flower** (corner button, always available, never required): hold to breathe in and let go to breathe out, or tap and tap again, or press Enter. The child sets the pace, with no timer and no score. After three breaths the flower is "wide open". Under reduced motion the petals brighten instead of growing.

## Accessibility
Every flower has a face, a word label and a spoken name (on tap, on keyboard focus, and auto-named for pre-readers on levels 0–6). Petal colours follow position, never feeling. A critter's colour never changes. Feelings show through eyes, brows, mouth, arms and posture, plus shape marks (a tear, a sweat drop, shake or stomp lines). Every drag also works by tap-tap and by keyboard; focus jumps to the friend. Tap targets are at least 64 px (checked at four viewports). The screen-reader text describes each scene. Under reduced motion, critters, buds and flowers hold still.

## Changes from the spec, and why
1. **No separate "That's it" button.** Tap-tap (flower, then friend) is the confirm step. A first tap only lifts the flower and says its name, so pre-readers can explore every name without submitting. This is one fewer control, and it matches the planting metaphor.
2. **Engine: several right answers.** `choice.also` and `match.accept` (src/engine) let any fitting feeling count, and the modelled answer keeps all of them. The spec's "accepted set" could not otherwise be expressed without board-side tricks.
3. **Surprised is added** to the basic set at levels 1, 3 and 4 (the task brief lists it). Level 2 keeps the spec's four.
4. **Snug voices the modelled answer** (she is on screen in the mascot slot). Rumble gives the first-miss clue, as in the spec.
5. A planned "spooky story" two-friend item was swapped for a fairground ride, to keep everything non-frightening.
6. The critter stands **in front of** its bed, because the bed was covering fists and hugged knees (the body clues) in play-testing screenshots.

## Grown-up note
This world practises naming feelings and choosing kind actions through stories. It is **not therapy, counselling, assessment or diagnosis**. It never asks a child how they feel in real life, never scores emotions, and stores only skill-practice counts (as for every world). Every feeling is OK. Choices can be kinder or less kind, and a less kind choice is met with a gentle question, never a "wrong" sound or a shamed character. Calm-down ideas (slow breaths, counting to five, a break, a calm stone, telling a grown-up) are general coping skills commonly taught in SEL programmes. We make no claims about outcomes. Scenarios are everyday and low-stakes (sharing, waiting a turn, a fallen tower, being left out of a game, rain on a picnic). There is nothing about abuse, self-harm, serious bullying, family conflict, illness, death or anything frightening.

## Flagged for early-childhood educator / SEL specialist review (before launch)
- **Accepted sets** on situation and body items, for example: lost teddy → sad or scared; hiding eyes while shaking → scared or sad; first day at school → nervous, excited or scared; fireworks → surprised, scared or happy.
- **Wording of less kind ideas** ("Laugh", "Look away", "Cut in line", "Throw things"), and whether 4–5-year-olds read "Laugh" as laughing *at* the friend. The card shows Snug laughing at a sad friend. US English wording (popsicle, cut in line, mad, favorite) since 2026-11-22. "Walk away" is marked less kind only on level 5 "help a friend" items, though it is a commonly taught calming strategy: please confirm.
- **Calm ideas for 4–5-year-olds:** whether "Say: I feel mad" and "Squeeze a calm stone" are clear without an adult.
- **Mild worry content:** thunder, a barking dog, a spider, the lights going out, a big wave, a bumped knee (the answer is "get a grown-up" or "ask are you OK"), and Bobbo holding tight on a fair ride.
- **Being left out** (`alone`, `tag`, `holiday`): kept gentle, with the kind answer "ask to play".
- **Faces:** whether the frustrated face (squeezed eyes, gritted teeth) and the angry face read as different at this age, and whether the proud face (closed happy eyes, hands on hips) is read as proud.

## Tests
- `tests/unit/feelings-garden.test.ts` covers:
  - the engine's `also`/`accept` (validation, model, lint);
  - the bank (unique ids, accepted ⊂ options, at least one option that does not fit, the spec shape of each level, the face matching an accepted feeling, every feeling taught);
  - the generator (determinism; 9 levels × 60 seeds × 8 lint, with every accepted answer validating and every other option not);
  - round variety; hint routing; process praise; lines ≤ 14 words; blocked clinical and shaming words.
- `e2e/feelings-garden.spec.ts` covers:
  - the tutorial hand and a first miss → Rumble;
  - a whole round by tap-tap, then the badge and level up;
  - the level-5 model with every fitting flower glowing, and a round by drag (tap-tap on touch);
  - levels 6–9 by keyboard, with a less kind idea → "How might … feel";
  - two friends keeping the right flower after a miss;
  - the breathing flower by keyboard, hold and tap-tap;
  - reduced motion;
  - layout at four viewports, with screenshots in `/home/claude/review/feelings-garden/`.
