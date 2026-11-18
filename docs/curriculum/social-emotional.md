# Social and emotional skills library (`sel`)

Ages 4–12. **Host:** Snug (new; a round, peach-coloured wombat-like critter with big listening ears and a pouch of smooth "calm stones", see `CHARACTERS.md`). Cameos: Bobbo (worrier), Zuzu (dramatic feelings), Rumble (calm and slow), Puff (excited).
**Aligned with:** the **CASEL 5** competencies (https://casel.org/fundamentals-of-sel/what-is-the-casel-framework/): self-awareness, self-management, social awareness, relationship skills, responsible decision-making. CASEL is a framework, not a coded standard, so skills cite the competency name.

> **What this library is not.** It is skill practice through stories. It is **not therapy, counselling, mental-health treatment or assessment**. It never diagnoses, labels or scores a child's emotional state, never asks children to disclose personal problems, and makes no claims about improving mental health. Parent page wording: "practises naming feelings and choosing kind actions through stories".

## 1. Topics by age band

| Ages | Topic id | Topic | CASEL competency |
|---|---|---|---|
| 4–7 | `sel.feel` | Naming feelings from faces, bodies and situations | Self-awareness, social awareness |
| 4–8 | `sel.calm` | Calm-down strategies (breathing, pausing, asking for a break) | Self-management |
| 4–8 | `sel.friend` | Friendship skills: joining in, sharing, taking turns | Relationship skills |
| 5–9 | `sel.kind` | Noticing needs; kind and helpful actions | Social awareness |
| 6–10 | `sel.persp` | Perspective-taking: same event, different feelings | Social awareness |
| 7–11 | `sel.talk` | Communication: listening, "I" statements, apologising | Relationship skills |
| 7–12 | `sel.conflict` | Solving disagreements fairly | Relationship skills, responsible decision-making |
| 6–12 | `sel.help` | Knowing when and whom to ask for help | Self-management, relationship skills |
| 9–12 | `sel.decide` | Thinking through consequences; fairness | Responsible decision-making |
| 8–12 | `sel.persist` | Keeping going with strategies when something is hard | Self-management |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `sel.feel.basic` | name happy, sad, angry and scared from clear faces and situations | 4–6 | — | some feelings are "bad"; everyone feels the same about everything | happy vs sad face | situation only, no face shown (several answers accepted) | Self-awareness |
| `sel.feel.body` | notice body clues of feelings (fists, tears, jumping, hiding) | 5–7 | feel.basic | feelings only show on faces | clenched fists → ? | match 3 body clues to feelings | Self-awareness |
| `sel.feel.more` | name finer feelings: frustrated, proud, nervous, excited, disappointed, lonely | 6–8 | feel.body | excited and nervous can't happen together | proud after finishing a puzzle | mixed feelings on a first school day | Self-awareness |
| `sel.calm.strategy` | choose a calming strategy for a big feeling | 4–8 | feel.basic | calming down means feelings must disappear; hitting a pillow is the only option | balloon breathing | choose a strategy that fits the place (classroom vs home) | Self-management |
| `sel.friend.join` | choose a friendly way to join a game and to include others | 4–7 | — | grabbing is how you join; saying no is always mean | ask "Can I play?" | invite someone who is alone | Relationship skills |
| `sel.friend.share` | take turns and share fairly | 4–7 | — | fair always means the same; sharing means giving everything away | swing turns | sharing when there's one special thing | Relationship skills |
| `sel.kind.notice` | notice when someone needs help and choose a kind action | 5–9 | feel.basic | kindness only means giving things | friend drops crayons | new kid at lunch | Social awareness |
| `sel.persp.two-sides` | explain how two characters can feel differently about the same event | 6–10 | feel.more | if I'm happy, everyone is | rain: one sad, one happy | team picks: winner and left-out friend | Social awareness |
| `sel.talk.listen` | show listening (eyes, waiting, asking) | 7–10 | — | listening = being quiet only | pick the listening picture | ask a follow-up question | Relationship skills |
| `sel.talk.i-statement` | build "I feel… when… I need…" sentences | 7–11 | feel.more | blaming sentences solve problems | pick the I-statement of 2 | build one from parts | Relationship skills |
| `sel.talk.apology` | give a real apology (say sorry, name it, make it right) | 6–10 | kind.notice | "sorry" alone fixes everything | which apology is better? | order the 3 apology parts and add a fix | Relationship skills |
| `sel.conflict.steps` | use steps to solve a disagreement: calm, tell, listen, ideas, choose | 7–12 | talk.i-statement, calm.strategy | someone must win; the loudest is right | order 3 steps | choose a fair solution with 4 ideas | Relationship skills, decision-making |
| `sel.help.ask` | recognise when to ask a trusted adult for help and how | 6–12 | — | asking for help is babyish; telling is tattling | spilled paint → ask | someone is being hurt or unsafe → tell an adult right away | Self-management |
| `sel.decide.consequence` | predict consequences of choices for self and others | 9–12 | persp.two-sides | only consequences for me count | copy homework? what happens? | weigh 3 choices for a group project | Responsible decision-making |
| `sel.persist.strategy` | pick a strategy when stuck (break it up, try another way, ask) | 8–12 | calm.strategy | if it's hard, I'm bad at it; trying harder the same way works | puzzle too hard → ? | plan steps for a big project | Self-management |

## 3. World concepts (prioritised)

### 1. Snug's Feelings Garden — **first world** (ages 4–7)
- **Host:** Snug · **Helper:** Rumble (calm, slow explainer) · **Scene:** a garden where each friend's flower bed blooms when they feel understood.
- **Hook:** Snug's friends keep visiting the garden with big feelings, and each bed blooms only when someone understands and helps.
- **Interaction:** tap or drag a feeling face onto a friend; choose a helpful action card. **Answer kind:** choice / set-matching (several feelings can be right).
- **Levels:** see §4 (8 levels).
- **Hints:** Rumble points to clues (face, body, what happened). **A11y:** feelings spoken and labelled; no reading needed.

### 2. Calm Cove (ages 4–8)
- **Host:** Snug · **Cameo:** Bobbo · **Scene:** a quiet cove with a lighthouse and waves.
- **Hook:** Bobbo's worries make waves in the cove, and he needs calming tricks to smooth the water.
- **Interaction:** follow a breathing balloon (tap to inhale/exhale, at the child's own pace); choose strategies for scenarios. **Answer kind:** choice.
- **Levels:**
  1. balloon breathing
  2. count to five
  3. ask for a break
  4. pick a strategy for a feeling
  5. strategy for the place
  6. help a friend calm down
- Breathing has **no timer**; the child controls the pace. Labelled "calm-down practice", not treatment.

### 3. Friendship Picnic (ages 4–8)
- **Host:** Snug · **Cameo:** Puff · **Scene:** a picnic with games and one swing.
- **Hook:** Everyone wants to play at the picnic, but there's only one swing and one ball.
- **Interaction:** choose actions for characters; order turn-taking. **Answer kind:** choice / sequence.
- **Levels:**
  1. ask to join
  2. take turns
  3. share the snack
  4. include someone alone
  5. say no kindly
  6. one special thing (take turns or play together)
  7. a game with rules everyone agrees

### 4. Two Sides Bridge (ages 6–10)
- **Host:** Snug · **Cameo:** Zuzu and Gloop · **Scene:** a bridge with two friends on either side.
- **Hook:** The same thing happened to two friends, but they feel completely different about it.
- **Interaction:** drag feelings to each side, then pick what each one might need. **Answer kind:** set-matching (accepted sets).
- **Levels:**
  1. rain day: two feelings
  2. winning and losing
  3. surprise party
  4. moving house (gentle)
  5. a joke that hurt
  6. three characters
  7. what would help each

### 5. Talk-It-Out Treehouse (ages 7–12)
- **Host:** Snug · **Cameo:** Bobbo and Zuzu · **Scene:** a treehouse meeting table.
- **Hook:** Bobbo and Zuzu both want the treehouse for different games, and they're getting loud.
- **Interaction:** build I-statements from tiles; order conflict-solving steps; choose a fair solution. **Answer kind:** sequence / choice.
- **Levels:**
  1. calm first
  2. I-statement vs blame
  3. build an I-statement
  4. listen and repeat back
  5. brainstorm ideas
  6. choose a fair idea
  7. real apology
  8. full conflict

### 6. Kindness Quest (ages 5–9)
- **Host:** Snug · **Scene:** village where small kind acts light lanterns.
- **Hook:** The village lanterns have gone dim, and each kind act lights one.
- **Interaction:** spot who needs help in a scene (tap); choose an action. **Answer kind:** set-matching / choice.
- **Levels:**
  1. obvious need
  2. two needs
  3. quiet need (alone, left out)
  4. ask before helping
  5. kindness to yourself
  6. thank someone

### 7. Decision Crossroads (ages 9–12)
- **Host:** Snug · **Cameo:** Fenn · **Scene:** a forest crossroads with signposts.
- **Hook:** Every path is a choice, and each signpost shows who it affects.
- **Interaction:** sort consequences by who they affect; pick and justify a path. **Answer kind:** set-matching / choice.
- **Levels:**
  1. now vs later
  2. me vs others
  3. honesty dilemma (low-stakes)
  4. group project
  5. peer pressure (mild, e.g. skipping a turn)
  6. fix a wrong choice

### 8. Help Signals (ages 6–12)
- **Host:** Snug · **Cameo:** Hoot · **Scene:** a lighthouse that shines a help signal.
- **Hook:** Hoot's lighthouse teaches the island when to shine for help.
- **Interaction:** sort situations: "I can try", "ask a friend", "tell a trusted adult now". **Answer kind:** set-matching.
- **Levels:**
  1. small problems
  2. who are trusted adults (child chooses from generic roles: family grown-up, teacher, coach)
  3. how to ask
  4. telling is not tattling
  5. unsafe situations → adult now
  6. keep asking if the first adult doesn't help
- Scenarios are non-graphic; reviewed by a child-safety specialist.

## 4. First world to build: **Snug's Feelings Garden**

**Why first:** naming feelings is the base of every CASEL competency, fits the 4–7 core audience with no reading, and the owner's "friendship scenarios with constructive choices" is built in from level 5.

### 4.1 Objective and skills
"Child can name how a character might feel using face, body and situation clues, and choose a kind action." L0–L2 `sel.feel.basic` (Lm 2); L3 `sel.feel.basic` situation-only (Lm 3); L4 `sel.feel.body` (Lm 4); L5–L6 `sel.kind.notice` (Lm 5) and `sel.calm.strategy` (Lm 6); L7 `sel.feel.more` (Lm 7); L8 `sel.persp.two-sides` (Lm 8).

### 4.2 Story
| Beat | Line (`fg.`) |
|---|---|
| intro1 | "This is Snug's garden. Every friend has their own flower bed." |
| intro2 | "When a friend feels understood, their flowers bloom." |
| intro3 | "Today lots of friends are visiting, with lots of feelings." |
| intro4 | "Let's help Snug understand them!" |
| between2 | "Look, two beds are blooming!" |
| between4 | "Feelings show on faces, and in bodies too." |
| between6 | "Sometimes we can do something kind to help." |
| outro1 | "The whole garden is blooming!" |
| outro2 | "You noticed clues and thought about how friends feel." |
| outro3 | "All feelings are OK. Here's your Bloom Badge!" |

### 4.3 Board
- A friend (Critter Crew member) stands by their flower bed with a speech-free scene bubble showing what happened (e.g. a tower falling).
- A row of feeling faces (Snug-style simple faces with word labels): 2 at L1, 4 at L2–L6 (happy, sad, angry, scared), 6–8 at L7–L8 (+ frustrated, proud, nervous, excited, disappointed, lonely).
- Action cards (L5–L6): 3 picture cards with spoken labels.
- Tap a face (or drag it onto the friend); press "That's it". Several faces may be accepted (see §4.4).
- **Feedback tone:** correct → flowers bloom, soft chime. A choice outside the accepted set → **no "wrong" sound**: a neutral "hmm" chime, the friend stays as they are, and the helper asks a gentle question. The engine's standard wrong-answer SFX is replaced for this world.

### 4.4 Scenario bank and generator
Scenarios are **authored** (≈60), each tagged `{ level, character, cue: face|body|situation, accepted: [feelings], best?: action }`. A child's choice is correct if it is in `accepted`.

| Level | Cue shown | Faces offered | Accepted set | Example |
|---|---|---|---|---|
| 0 tutorial | big smile + gift | happy, sad | happy | Puff gets a present |
| 1 | clear face + situation | 2 | 1 feeling | Bobbo's ice cream falls → sad (vs happy) |
| 2 | clear face + situation | 4 | 1 | Zuzu jumps back from a spider → scared |
| 3 | situation only (face turned away) | 4 | 1–3 (e.g. tower falls: sad, angry) | Gloop's tower falls |
| 4 | body clues only (fists, hugging knees, bouncing) | 4 | 1–2 | Rumble hugging knees → sad or scared |
| 5 | friend + feeling given; "What could help?" | 3 action cards | 1–2 helpful actions | Hoot is sad that his kite broke → sit with him / help fix it (vs laugh, walk away) |
| 6 | "Bobbo feels angry. What can he do?" | 3 strategy cards | 1–2 (breathe, ask for a break, tell a grown-up) | vs throwing blocks |
| 7 | situation, finer feelings | 6 | 1–3 (first day at school: nervous, excited) | proud, frustrated, disappointed |
| 8 | one event, two friends | assign a face to each friend | per-friend sets | rain cancels the picnic: Rumble happy (nap), Puff disappointed |

Selection: seeded, no repeats in a round, each round includes ≥2 different characters and ≥3 different feelings; never the same accepted feeling 3 times in a row.

### 4.5 Misconceptions → responses
| Misconception | Response (helper Rumble) |
|---|---|
| "Some feelings are bad" | `fg.help.okay` "All feelings are OK. It's what we do with them that matters." |
| "Everyone feels the same" | `fg.help.different` "Friends can feel different about the same thing." |
| Unhelpful action chosen (laugh, ignore) | `fg.hint.action` "Hmm, would that help Hoot feel better? What else could we do?" |
| Angry action (throwing) chosen | `fg.hint.calm` "Big angry feelings are OK. What could Bobbo do that's safe?" |

### 4.6 Hint ladder
- **First "not yet":** the helper points to the clue (face, body, or the scene bubble) and asks a question; the chosen card dims.
- **Second (model):** Rumble describes the clue and names a fitting feeling ("Gloop worked hard on that tower. When it falls, you might feel sad, or even mad."); the accepted faces glow; the child taps one (errorless).

### 4.7 Helper explanations (Rumble)
- `fg.help.start` "Look for clues: the face, the body, and what just happened."
- `fg.help.face` "Eyes and mouths tell us a lot. Look closely."
- `fg.help.body` "Bodies show feelings too. Tight fists can mean angry."
- `fg.help.situation` "What happened to them? How would you feel?"
- `fg.help.okay` and `fg.help.different` (§4.5)
- `fg.help.kind` "When a friend feels sad, being with them can help."

### 4.8 Voice lines (prefix `fg.`; ≈48 ids)
Prompts: `fg.prompt.feel` "How might {friend} feel?" · `fg.prompt.body` "Look at {friend}'s body. How might they feel?" · `fg.prompt.help` "{friend} feels {feeling}. What could help?" · `fg.prompt.calm` "{friend} feels {feeling}. What can they do?" · `fg.prompt.two` "How might each friend feel?"
Praise: `fg.praise.1` "You noticed the clues!" · `fg.praise.2` "That's a kind idea." · `fg.praise.3` "You saw that they feel different things." · `fg.praise.4` "Yes, {feeling} makes sense."
Gentle: `fg.gentle.1` "Hmm, let's look again." · Idle: `fg.idle` "Tap a face."
Story 10, helper 7, misconception 4. Scenario narrations ≈ 60. Variables: friend (6), feeling (10). **Estimate ≈ 48 ids, ≈ 150 clips.** Voice direction: warm, calm, never sing-song about sad feelings.

### 4.9 Reward
Sticker **"Bloom Badge"**: a round flower with Snug's ears as two petals.

### 4.10 Accessibility
Faces have text labels and spoken names; colour never encodes a feeling; reduced motion: flowers appear without growing animation; screen-reader text describes scene bubbles.

## 5. Accuracy notes
- Feelings are taught as "might feel": facial expression is a clue, not proof; cultural norms for showing feelings vary. Situation-only and multi-answer items prevent teaching one "correct" emotion per face.
- Calm-down strategies are general coping skills commonly taught in SEL programmes; we make no claims about clinical outcomes. A school counsellor or SEL specialist reviews all scenarios.
- Nothing about growth mindset is claimed as proven; `sel.persist` teaches concrete strategies, not beliefs about ability.

## 6. Age-appropriateness and safety
- **No therapy claims, no diagnosing, no scoring of emotions.** Results report skill practice only ("named feelings in 8 stories").
- The child is never asked how they feel in real life or to describe personal events. If a future feature adds an optional mood check-in, it must stay on the device, never be shown as a score, and pass security-privacy review first.
- Scenarios avoid trauma topics (death, abuse, divorce, illness, violence). Mild everyday disappointments only.
- Unsafe-situation content (Help Signals) is non-graphic, always routes to "tell a trusted adult", and is reviewed by a child-safety specialist.
- No character is shamed for a feeling; unhelpful actions are shown as choices that don't help yet, never as "bad kids".
