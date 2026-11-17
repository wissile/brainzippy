# Character System — the Critter Crew

Source: the owner's character sketch sheet and cards (project files: Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff, pose roughs). Implemented as SVG components in `src/characters/`.

## Shared shape kit
- **Round and chunky**: pears, beans, blobs, eggs. No sharp corners or skinny limbs.
- **Big friendly eyes** sit high and wide with a white shine; pink cheeks below.
- **One signature thing** readable at thumbnail size.
- 5–5.5 px ink outline (#2B2140) at 200-unit viewBox; soft white highlight stroke on the upper-left.

## Cast
| # | Name | Type | Subject buddy | Colour | Signature | Personality / voice direction |
|---|---|---|---|---|---|---|
| 01 | **Bobbo** | monster | Counting | #FF9F43 | wings too tiny to fly, 3 horns, freckles, fang grin | pear-shaped worrier who counts everything twice; warm, eager, slightly breathless; flaps wings hard when excited |
| 02 | Zuzu | monster | Spelling | #8E6CEF | three eyes ("typo eye") + pencil | tall, floppy, a little dramatic; ears droop at a misspelling |
| 03 | Gloop | monster | Shapes | #2EC4B6 | one giant curious eye; idea bubbles | wobbly jelly that squishes into shapes; curious, playful |
| 04 | Hoot | animal | Reading | #6BCB77 | big reading specs, leaf tufts | mossy owl storyteller; funny voices |
| 05 | Rumble | animal | Measuring | #4D96FF | soft yellow star horn, sleepy lids | gentle, slow, sleepy; measures in naps |
| 06 | Puff | monster | Times tables | #FF8FB1 | cloud head, 5 wiggly arms | drifts in when sums get tricky; counts in fives; leaves sparkles |

Milestone 1 animates **Bobbo** fully; the others appear on menus with idle motion (Puff's arms wiggle).

## Bobbo state set (implemented)
| State | When | Body | Face |
|---|---|---|---|
| idle | waiting for the child | slow breathe 2.8 s, wing flick every ~6 s, random blink 2.4–5 s | fang grin |
| greeting | intro, home | hop + right-arm wave, wings flap | big laugh |
| talking | while any line is spoken/captioned | state pose + mouth alternates every 150 ms | o / grin |
| encouraging | prompt, after a hint | gentle nod, arm raised | grin |
| thinking | "How many?" question | tilt −4°, pupils up-left, hand to chin | little o |
| celebrating | correct answer, round end | squash-and-stretch jump 0.75 s, wings flap 0.09 s (never takes off), arms up | big laugh |
| retry | wrong answer | soft sway, pupils down, wings droop — never shakes | wobble mouth |
| reduced motion | `prefers-reduced-motion` | no loops; pose + face only | per state |

## Rules for new characters
Same outline weight and eye construction; silhouette test at 48 px; each needs the 7 states above; voice identity brief before recording; no resemblance to existing commercial characters (creative-director sign-off).

## Rive migration (planned)
Keep the `MascotState` contract (`src/engine/types.ts`). Replace `Bobbo.tsx` internals with a Rive state machine whose inputs match the states; keep the SVG as the reduced-motion/fallback.
