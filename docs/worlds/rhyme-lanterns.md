# Hoot's Rhyme Lanterns (`rhyme-lanterns`)

English library, first world · ages 3–5 · skill `english.phon.rhyme` · host Hoot, helper Zuzu · music `sky`.
Spec source: `docs/curriculum/english.md` §2 (`ela.phon.rhyme`) and §3 item 2. Status: implemented 2026-11-18;
not yet reviewed by an external educator. "Aligned with" CCSS RF.K.2.A (ages 3–4 are a precursor).

## What it teaches
**Objective.** The child can tell whether two spoken words rhyme, pick the word that rhymes with a given word,
spot the word that does not rhyme, and build a chain of rhyming words.

Rhyme awareness is an early, listening-only part of phonological awareness: it needs no letters, so it suits
pre-readers. The world teaches the idea that **rhyming words sound the same at the end**, and asks the child to
attend to the *end* of a word, not its start (the commonest confusion at this age).

## Why this interaction
- **Pictures, never text.** Every word is a picture; it is spoken when tapped or keyboard-focused, and each
  exercise starts by naming Hoot's word and then every picture in turn (each lantern swells and ripples while it
  is named). A child can play with no reading at all; captions carry every word for muted play.
- **Moving a lantern to meet Hoot's lantern** makes the rhyme relation physical: two words "meet" and the
  lanterns light together. Tapping a lantern lifts it *and* says its word, so a child can listen to every option
  before committing (a one-tap-answers design would force guessing). Then tap Hoot's lantern / the hook.
- **Three equal ways to move:** drag; tap the lantern, then the hook; keyboard (Tab to a lantern, Enter, focus
  jumps to the hook, Enter). Yes/no answers can also be tapped directly, or the second lantern dragged onto them.
- Whole-word audio only (Kokoro TTS), no isolated phonemes.

## Levels (generator.ts `RHYME_LEVELS`; level n on screen = n − 1)
| Level | Mode | Options | Distractors (misconception targeted) |
|---|---|---|---|
| 1 | yes/no: do these two rhyme? | yes · no | "no" pairs share nothing (far) — first contrast |
| 2 | pick the rhyme | 2 | far |
| 3 | pick the rhyme | 3 | same first sound, e.g. cat → cake (*rhyme = starts the same*) · far |
| 4 | pick the rhyme | 3 | same vowel, different ending, same first sound preferred, e.g. cat → can, wig → wing (*sounds a bit alike*) · same first sound |
| 5 | odd one out | 4 (3 rhyme + 1) | the odd word shares the vowel (cat hat bat \| can) |
| 6 | pick with blends | 4 | target or answer starts with a blend (frog → log): same first sound · same vowel · far |
| 7 | rhyme chain of 3 | 4 (pick 2) | same first sound · same vowel |
| 8 | rhyme chain of 4 | 6 (pick 3) | same first sound · same vowel · far |

No time pressure at any level. The progression removes help step by step: fewer obvious contrasts, closer near
misses, more items to compare, then producing several rhymes (chains) rather than recognising one.
Engine rules apply: R0 levels up after a round with ≥ 50 % first-try; in a round difficulty steps up after 2
first-try answers and down after 3+ attempts. Level 1 opens with a tutorial (cat/hat, pointing hand on "yes").

## Word bank (`words.ts`, 53 words, 21 rhyme families)
Picturable, common for ages 3–5, one syllable, one US spelling, no confusable homophones (no pear/pair,
night/knight, mail/male); every family shares its spelled rime (cat/hat, not bear/chair) so later reading worlds
can reuse it. Each word has `first` sound (phoneme, so cat and king both start /k/, knee starts /n/), vowel group
and blend flag. Each word has an original SVG picture (`pictures.tsx`). Targets are only used at a level when every
required distractor kind exists strictly (no silent fallbacks); a round spreads families so a band of 8 never
repeats a family when 8+ are eligible.

## Hints (never punishing)
- **Round start:** Zuzu explains: "Rhyming words sound the same at the end, like moon and spoon!"
- **First miss:** Zuzu gives the strategy ("Say them slowly, and listen to the very end of each word"), the
  wrong lantern greys out, then Hoot names the remaining words **slowly** (slowed whole-word clips).
- **Second miss (model):** "Let's listen slowly, all the way to the end." Hoot says Hoot's word and its rhyme(s)
  slowly; each rhyming lantern lights as it is spoken (in yes/no "no" and odd-one-out, the non-rhyme stays dark
  and sleepy). The right lantern shines; the child still moves it (errorless).
- Spec asked for "c-**at**, h-**at**" (stressing the ending). Whole-word TTS cannot stress a part of a word, so the
  slowed clip plus the visual ripple stands in for it; recorded human takes in `/studio` could add real stress later.

## Voice
136 lines in `voice.json`: one whole-word clip per picture (`rl.w.*`, 53), one slowed clip per picture
(`rl.slow.*`, 53, `"speed": 0.6`, read by `scripts/gen_voice.py`), and 30 prompts, hints, praise and story lines.
Praise is about listening (process), never ability.

## Story
Hoot's lantern party starts at dark, but the lanterns only glow when rhyming words meet (4 intro beats, between
beats after 2/4/6 answers, 3 outro beats). Reward: the **Lantern Keeper** sticker.

## Known limits / next steps
- No phoneme stress in hints (see above). Rhyme chains are judged as a set (order does not matter).
- Some families have only two members, so chains use the larger families (at, an, ock, ug, ing, ake for 4-chains).
- Educator review of the word bank and distractor rules is still needed before any standards page.
