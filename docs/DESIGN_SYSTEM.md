# Design System — "Critter Crew"

Chosen direction (see CREATIVE_DIRECTION in DECISIONS.md D-004 and `docs/concepts/index.html` for the three evaluated concepts). Tokens live in `src/styles/tokens.css`.

## Principles
1. **Picture first, words second.** Every instruction is spoken + captioned; icons carry meaning, labels support it.
2. **Chunky and tactile.** Rounded shapes, thick ink outlines, 3D "press-down" buttons that visibly sink on tap.
3. **Calm play area.** Motion and colour concentrate on feedback, not decoration.
4. **One family.** Characters, objects, scenes and UI share the same outline weight, shine highlight and palette.

## Colour
| Token | Hex | Use |
|---|---|---|
| `--ink` | #2B2140 | outlines, text, icon buttons |
| `--cream` | #FFF6DA | button/pill borders |
| `--bobbo` | #FF9F43 | counting / math accent |
| `--zuzu` | #8E6CEF | spelling, focus ring |
| `--gloop` | #2EC4B6 | shapes |
| `--hoot` | #6BCB77 | reading |
| `--rumble` | #4D96FF | measuring |
| `--puff` | #FF8FB1 | times tables |
| `--sparkle` | #FFD43B | stars, badges, rewards |
| prompt pill | #8FD0FF → #3B8EEA, shadow #2468C4 | instruction pill (white text with blue stroke) |
| go button | #8AE86F → #45B83A, shadow #2D8A27 | primary actions, answer choices |
| gold | #FFE27A → #FFC21A | correct state |

Contrast: large text on pills/buttons uses a 2–2.5 px dark stroke + drop shadow so white numerals stay readable on mid-tone fills (to be re-measured by the a11y review).

## Typography
- Display: **Baloo 2** 600/800 (rounded, friendly numerals). Body: **Nunito** 400/700. Self-hosted, Latin subset only.
- Child UI minimum 18 px; prompts 22–42 px fluid; numerals on choices 42–58 px.

## Shape & elevation
Radii 14/22/32/pill. Buttons: 5–6 px cream border, gradient fill, 6–10 px solid bottom shadow; on press translate down by the shadow height.

## Components
| Component | Spec |
|---|---|
| Icon button | 64 px circle (48 px on short landscape), ink 82 % fill, white glyph |
| Big play | ≥104 px tall pill, breathing scale 1.04 / 2.4 s |
| Prompt pill | object icon + text + replay button (60 px) |
| Choice button | 92–150 px wide, numeral + dot pattern (dual representation) |
| Speech bubble | white, 4 px ink border, tail toward speaker; mirrors spoken line, lingers 1.8 s |
| Star track | 8 slots, fills with pop on each completed exercise |
| Blanket (play surface) | gingham, white border; container-query sized objects (no overlap) |
| Hand pointer | tutorial/idle helper; tap or drag motion; static in reduced motion |

## Layout
Grid areas: `top / prompt / mascot+board / mascot+tray` in landscape; `top / prompt / board / mascot+tray` in portrait; compressed variant ≤520 px tall. Verified at 390×844, 915×412, 1024×1366, 1280×800.

## Don'ts
No emoji as art, no stock illustrations, no gradients without purpose, no red error flashes, no text-only instructions for under-7s.
