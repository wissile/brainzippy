/**
 * Snug's Feelings Garden — the authored content bank (DATA only, pure). Spec: docs/curriculum/social-emotional.md §4.
 * Pedagogy, CASEL alignment and the items flagged for educator review: docs/worlds/feelings-garden.md.
 *
 * Every scenario is everyday and low-stakes (a melted ice lolly, a fallen tower, waiting for a turn). Feelings are
 * "might feel": the face is a clue, never proof, so situation-only and body-only items accept several feelings.
 * Options are AUTHORED per scenario: a feeling that could reasonably fit is either accepted or not offered, so a
 * "not yet" answer is never a reasonable feeling marked wrong.
 */

export const FEELINGS = ["happy", "sad", "angry", "scared", "surprised", "frustrated", "proud", "nervous", "excited", "disappointed", "lonely"] as const;
export type FeelingId = (typeof FEELINGS)[number];
/** Faces the critters can make: the feelings plus two quiet faces (after help, and a plain look). */
export type FaceId = FeelingId | "content" | "plain";

export const FRIENDS = ["bobbo", "zuzu", "gloop", "hoot", "rumble", "puff"] as const;
export type FriendId = (typeof FRIENDS)[number];
export const FRIEND_NAME: Record<FriendId, string> = { bobbo: "Bobbo", zuzu: "Zuzu", gloop: "Gloop", hoot: "Hoot", rumble: "Rumble", puff: "Puff" };
export const FRIEND_PRONOUN: Record<FriendId, { he: string; his: string }> = {
  bobbo: { he: "he", his: "his" },
  zuzu: { he: "she", his: "her" },
  gloop: { he: "he", his: "his" },
  hoot: { he: "he", his: "his" },
  rumble: { he: "he", his: "his" },
  puff: { he: "she", his: "her" },
};

/** Arm and body poses (body language). */
export type Pose = "relaxed" | "droop" | "up" | "fists" | "face" | "head" | "hips" | "hug" | "fidget" | "cross" | "knees";

/** Idea cards: things a friend could do or say. `kind: false` = an idea that would not help (shown kindly, never shamed). */
export const ACTIONS = {
  sit: { text: "Sit together", kind: true },
  fix: { text: "Help fix it", kind: true },
  share: { text: "Share", kind: true },
  play: { text: "Ask to play", kind: true },
  pickup: { text: "Help pick up", kind: true },
  grownup: { text: "Get a grown-up", kind: true },
  askok: { text: "Ask: are you OK?", kind: true },
  kindwords: { text: "Say something kind", kind: true },
  build: { text: "Build it again", kind: true },
  breathe: { text: "Take slow breaths", kind: true },
  pause: { text: "Ask for a break", kind: true },
  tell: { text: "Tell a grown-up", kind: true },
  count: { text: "Count to five", kind: true },
  stone: { text: "Squeeze a calm stone", kind: true },
  sayfeel: { text: "Say: I feel cross", kind: true },
  askhelp: { text: "Ask for help", kind: true },
  laugh: { text: "Laugh", kind: false },
  walk: { text: "Walk away", kind: false },
  ignore: { text: "Look away", kind: false },
  throw: { text: "Throw things", kind: false },
  shout: { text: "Shout at a friend", kind: false },
  knock: { text: "Knock it all down", kind: false },
  push: { text: "Push in", kind: false },
} as const satisfies Record<string, { text: string; kind: boolean }>;
export type ActionId = keyof typeof ACTIONS;
export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];

/** Pictures in the scene bubble ("what happened"), drawn in art.tsx. */
export const PROPS = [
  "gift", "icecream", "bubbles", "balloon", "swing", "crayon", "rainbow", "sandcastle", "book", "boat", "music",
  "thunder", "popup", "footprint", "shell", "kite", "dog", "confetti", "truck", "dark", "letter",
  "spider", "cake", "sandwich", "blocks", "bee", "invite", "lolly", "ball", "wave", "puzzle",
  "tower", "party", "teddy", "home", "fireworks", "seat", "drawing", "wind", "van", "beach",
  "crayons", "alone", "knee", "snack", "game", "shoelace", "slide", "scribble", "swingline", "paint",
  "school", "medal", "rain", "fair", "bike", "stage", "tag", "suitcase", "helper", "cupcake", "pool", "picnic", "puppy",
] as const;
export type PropId = (typeof PROPS)[number];

/** What the board shows and asks (spec §4.4). */
export type Cue = "face" | "situation" | "body" | "help" | "calm" | "more" | "two";

export interface FriendSpot {
  friend: FriendId;
  face: FaceId;
  pose: Pose;
  /** feelings accepted for this friend (two-friend items); first = the modelled one */
  accepted?: readonly FeelingId[];
}

export interface Scenario {
  /** short unique id (voice lines fg.s.<id> and fg.m.<id>) */
  id: string;
  level: number;
  cue: Cue;
  friend: FriendId;
  face: FaceId;
  pose: Pose;
  /** "back": the friend is turned away, so the face is hidden (situation-only and body-only items) */
  view: "front" | "back";
  /** scene bubble picture; null = no bubble (body-only items) */
  prop: PropId | null;
  /** spoken story + question (≤ 14 words) */
  say: string;
  /** short on-screen question */
  text: string;
  /** spoken modelled answer after a second miss: names the clue and a fitting feeling (≤ 14 words) */
  model: string;
  /** accepted answers, first = the canonical one */
  accepted: readonly string[];
  /** every option shown (accepted + authored distractors) */
  options: readonly string[];
  /** two-friend items: the second friend */
  second?: FriendSpot;
  /** screen-reader description of the scene */
  a11y: string;
}

const BASIC4: FeelingId[] = ["happy", "sad", "angry", "scared"];

type Draft = Omit<Scenario, "level" | "cue" | "view" | "text"> & Partial<Pick<Scenario, "view" | "text">>;
const P = FRIEND_PRONOUN;
const N = FRIEND_NAME;
const feelText = (f: FriendId) => `How might ${N[f]} feel?`;

function level(lv: number, cue: Cue, view: Scenario["view"], items: Draft[]): Scenario[] {
  return items.map((d) => ({
    ...d,
    level: lv,
    cue,
    view: d.view ?? view,
    text:
      d.text ??
      (cue === "body" ? `Look at ${N[d.friend]}'s body. How might ${P[d.friend].he} feel?` : cue === "help" ? `What could help ${N[d.friend]}?` : cue === "calm" ? `What can ${N[d.friend]} do?` : cue === "two" ? "How might each friend feel?" : feelText(d.friend)),
  }));
}

/** The guided first exercise (level 0 only): a big smile and a present. */
export const TUTORIAL: Scenario = level(0, "face", "front", [
  {
    id: "gift", friend: "puff", face: "happy", pose: "up", prop: "gift",
    say: "Puff got a present! Look at her big smile. How might Puff feel?",
    model: "Puff is smiling with her present. She might feel happy.",
    accepted: ["happy"], options: ["happy", "sad"],
    a11y: "Puff holds up a present. She has a big smile and her arms are up.",
  },
])[0]!;

export const SCENARIOS: readonly Scenario[] = [
  // ---------------- level 0: happy or sad, clear face + what happened (2 flowers)
  ...level(0, "face", "front", [
    { id: "icecream", friend: "bobbo", face: "sad", pose: "droop", prop: "icecream", say: "Oh no! Bobbo's ice cream fell on the ground. How might he feel?", model: "Bobbo's ice cream fell, and his mouth turns down. He might feel sad.", accepted: ["sad"], options: ["sad", "happy"], a11y: "An ice cream cone lies on the ground. Bobbo's mouth turns down and a tear rolls from his eye." },
    { id: "bubbles", friend: "zuzu", face: "happy", pose: "up", prop: "bubbles", say: "Zuzu is blowing big bubbles in the sun. How might she feel?", model: "Zuzu is smiling at her bubbles. She might feel happy.", accepted: ["happy"], options: ["happy", "sad"], a11y: "Bubbles float in the sunshine. Zuzu has a big open smile and her arms are up." },
    { id: "balloon", friend: "gloop", face: "sad", pose: "droop", prop: "balloon", say: "Gloop's balloon floated up and away. How might Gloop feel?", model: "Gloop's balloon flew away, and he has a tear. He might feel sad.", accepted: ["sad"], options: ["happy", "sad"], a11y: "A balloon floats away into the sky. Gloop looks down with a tear on his cheek." },
    { id: "swing", friend: "rumble", face: "happy", pose: "up", prop: "swing", say: "Rumble is swinging up high on the swing. How might he feel?", model: "Rumble is laughing on the swing. He might feel happy.", accepted: ["happy"], options: ["sad", "happy"], a11y: "A swing goes up high. Rumble is laughing with his arms up." },
    { id: "crayon", friend: "hoot", face: "sad", pose: "droop", prop: "crayon", say: "Hoot's favourite crayon snapped in two. How might Hoot feel?", model: "Hoot's crayon broke, and his eyes look down. He might feel sad.", accepted: ["sad"], options: ["sad", "happy"], a11y: "A crayon is broken in two pieces. Hoot's eyes look down and his mouth turns down." },
    { id: "rainbow", friend: "puff", face: "happy", pose: "up", prop: "rainbow", say: "Puff sees a big rainbow in the sky! How might Puff feel?", model: "Puff is smiling at the rainbow. She might feel happy.", accepted: ["happy"], options: ["happy", "sad"], a11y: "A rainbow shines in the sky. Puff is smiling with her arms up." },
    { id: "sandcastle", friend: "zuzu", face: "sad", pose: "droop", prop: "sandcastle", say: "A wave washed Zuzu's sandcastle away. How might she feel?", model: "Zuzu's sandcastle is gone, and she has a tear. She might feel sad.", accepted: ["sad"], options: ["happy", "sad"], a11y: "A wave washes over a sandcastle. Zuzu looks down with a tear." },
    { id: "book", friend: "gloop", face: "happy", pose: "up", prop: "book", say: "Gloop found his lost book under the bed! How might he feel?", model: "Gloop found his book, and he is smiling. He might feel happy.", accepted: ["happy"], options: ["sad", "happy"], a11y: "A book with a star on it. Gloop is smiling widely." },
    { id: "boat", friend: "puff", face: "sad", pose: "droop", prop: "boat", say: "Puff's paper boat sank in the puddle. How might Puff feel?", model: "Puff's boat sank, and her mouth turns down. She might feel sad.", accepted: ["sad"], options: ["sad", "happy"], a11y: "A paper boat sinks in a puddle. Puff's mouth turns down and a tear falls." },
    { id: "music", friend: "hoot", face: "happy", pose: "up", prop: "music", say: "Hoot is dancing to his favourite song. How might Hoot feel?", model: "Hoot is dancing and smiling. He might feel happy.", accepted: ["happy"], options: ["happy", "sad"], a11y: "Music notes float in the air. Hoot is smiling and dancing with his wings up." },
  ]),
  // ---------------- level 1: two flowers from happy, sad, angry, scared, surprised (clear face + what happened)
  ...level(1, "face", "front", [
    { id: "thunder", friend: "bobbo", face: "scared", pose: "face", prop: "thunder", say: "Boom! Bobbo hears loud thunder outside. How might he feel?", model: "Bobbo's eyes are wide, and his hands are up. He might feel scared.", accepted: ["scared"], options: ["scared", "happy"], a11y: "A storm cloud with a lightning bolt. Bobbo has wide eyes and his hands are up by his face." },
    { id: "popup", friend: "rumble", face: "surprised", pose: "up", prop: "popup", say: "Rumble opens a box, and a toy pops out! How might he feel?", model: "Rumble's eyes and mouth are big and round. He might feel surprised.", accepted: ["surprised"], options: ["sad", "surprised"], a11y: "A toy on a spring pops out of a box. Rumble's eyes are wide and his mouth makes a round O." },
    { id: "footprint", friend: "zuzu", face: "angry", pose: "fists", prop: "footprint", say: "Someone walked on Zuzu's drawing with muddy feet. How might she feel?", model: "Zuzu's eyebrows point down, and her hands are fists. She might feel angry.", accepted: ["angry"], options: ["angry", "happy"], a11y: "A drawing with muddy footprints on it. Zuzu's eyebrows point down and her hands are tight fists." },
    { id: "shell", friend: "gloop", face: "happy", pose: "up", prop: "shell", say: "Gloop found a shiny shell on the beach. How might he feel?", model: "Gloop is smiling at his shell. He might feel happy.", accepted: ["happy"], options: ["angry", "happy"], a11y: "A shiny shell on the sand. Gloop has a big smile." },
    { id: "kite", friend: "hoot", face: "sad", pose: "droop", prop: "kite", say: "Hoot's kite got stuck high up in a tree. How might he feel?", model: "Hoot's kite is stuck, and his eyes look down. He might feel sad.", accepted: ["sad"], options: ["sad", "surprised"], a11y: "A kite stuck in the branches of a tree. Hoot looks down, with a tear." },
    { id: "dog", friend: "puff", face: "scared", pose: "face", prop: "dog", say: "A big dog barks very loudly at Puff. How might she feel?", model: "Puff is leaning back with wide eyes. She might feel scared.", accepted: ["scared"], options: ["happy", "scared"], a11y: "A big dog barking. Puff leans back with wide eyes and her arms up." },
    { id: "confetti", friend: "zuzu", face: "surprised", pose: "up", prop: "confetti", say: "Whoosh! Confetti falls all over Zuzu! How might she feel?", model: "Zuzu's mouth makes a big round O. She might feel surprised.", accepted: ["surprised"], options: ["surprised", "sad"], a11y: "Confetti falls from above. Zuzu's eyebrows go up high and her mouth is a round O." },
    { id: "truck", friend: "bobbo", face: "angry", pose: "fists", prop: "truck", say: "Someone grabbed Bobbo's toy truck without asking. How might he feel?", model: "Bobbo's eyebrows point down, and his hands are fists. He might feel angry.", accepted: ["angry"], options: ["happy", "angry"], a11y: "A toy truck being taken away. Bobbo's eyebrows point down and his hands are fists." },
    { id: "dark", friend: "rumble", face: "scared", pose: "face", prop: "dark", say: "The lights go out, and it is very dark. How might Rumble feel?", model: "Rumble's eyes are wide, and he is shaking. He might feel scared.", accepted: ["scared"], options: ["scared", "happy"], a11y: "A dark room with only the moon at the window. Rumble has wide eyes and is shaking." },
    { id: "letter", friend: "puff", face: "happy", pose: "up", prop: "letter", say: "Puff gets a letter with a big heart on it. How might she feel?", model: "Puff is smiling at her letter. She might feel happy.", accepted: ["happy"], options: ["happy", "scared"], a11y: "A letter with a heart on it. Puff has a big smile." },
  ]),
  // ---------------- level 2: four flowers (happy, sad, angry, scared), clear face + what happened, one fits
  ...level(2, "face", "front", [
    { id: "spider", friend: "zuzu", face: "scared", pose: "face", prop: "spider", say: "A spider drops down right in front of Zuzu! How might she feel?", model: "Zuzu jumped back, and her eyes are wide. She might feel scared.", accepted: ["scared"], options: BASIC4, a11y: "A spider hangs from a thread. Zuzu leans back with wide eyes and her hands up." },
    { id: "cake", friend: "gloop", face: "happy", pose: "up", prop: "cake", say: "Gloop's friends made him a big birthday cake! How might he feel?", model: "Gloop is smiling a big smile. He might feel happy.", accepted: ["happy"], options: BASIC4, a11y: "A birthday cake with candles. Gloop has a big open smile and his arms up." },
    { id: "sandwich", friend: "rumble", face: "sad", pose: "droop", prop: "sandwich", say: "Rumble dropped his sandwich in the mud. How might he feel?", model: "Rumble's mouth turns down, and he has a tear. He might feel sad.", accepted: ["sad"], options: ["happy", "sad", "scared", "angry"], a11y: "A sandwich lying in mud. Rumble's mouth turns down and a tear rolls down." },
    { id: "blocks", friend: "bobbo", face: "angry", pose: "fists", prop: "blocks", say: "Someone keeps knocking down Bobbo's blocks on purpose. How might he feel?", model: "Bobbo's eyebrows point down, and his hands are fists. He might feel angry.", accepted: ["angry"], options: BASIC4, a11y: "Blocks tumbling down. Bobbo's eyebrows point down and his hands are tight fists." },
    { id: "bee", friend: "puff", face: "scared", pose: "face", prop: "bee", say: "A buzzy bee flies close to Puff's nose. How might she feel?", model: "Puff's eyes are wide, and her hands are up. She might feel scared.", accepted: ["scared"], options: ["scared", "sad", "happy", "angry"], a11y: "A bee buzzing close. Puff has wide eyes and her arms up by her face." },
    { id: "invite", friend: "hoot", face: "happy", pose: "up", prop: "invite", say: "A friend asks Hoot to come and play. How might he feel?", model: "Hoot is smiling with his wings up. He might feel happy.", accepted: ["happy"], options: BASIC4, a11y: "A ball and a waving hand, asking to play. Hoot has a big smile." },
    { id: "lolly", friend: "zuzu", face: "sad", pose: "droop", prop: "lolly", say: "Zuzu's ice lolly melted before she could eat it. How might she feel?", model: "Zuzu's mouth turns down, and she has a tear. She might feel sad.", accepted: ["sad"], options: ["angry", "happy", "sad", "scared"], a11y: "A melted ice lolly in a puddle. Zuzu looks down with a tear." },
    { id: "ball", friend: "gloop", face: "angry", pose: "fists", prop: "ball", say: "Someone grabbed Gloop's ball and won't give it back. How might he feel?", model: "Gloop's eyebrow points down, and his hands are fists. He might feel angry.", accepted: ["angry"], options: BASIC4, a11y: "A ball being held away. Gloop's eyebrow points down and his hands are fists." },
    { id: "wave", friend: "bobbo", face: "scared", pose: "face", prop: "wave", say: "A huge wave rushes up the beach toward Bobbo. How might he feel?", model: "Bobbo's eyes are wide, and he is leaning back. He might feel scared.", accepted: ["scared"], options: ["sad", "scared", "angry", "happy"], a11y: "A big wave rushing up the sand. Bobbo leans back with wide eyes." },
    { id: "puzzle", friend: "rumble", face: "happy", pose: "up", prop: "puzzle", say: "Rumble finished his big puzzle! How might he feel?", model: "Rumble is smiling with his arms up. He might feel happy.", accepted: ["happy"], options: BASIC4, a11y: "A finished puzzle. Rumble has a big smile and his arms up." },
  ]),
  // ---------------- level 3: what happened only (the friend is turned away); several feelings can fit
  ...level(3, "situation", "back", [
    { id: "tower", friend: "gloop", face: "plain", pose: "relaxed", prop: "tower", say: "Gloop built a tall tower. Then it fell down! How might he feel?", model: "Gloop worked hard on that tower. He might feel sad, or even angry.", accepted: ["sad", "angry"], options: ["sad", "angry", "happy", "scared"], a11y: "A tall block tower falling down. Gloop is turned away, so we can't see his face." },
    { id: "party", friend: "bobbo", face: "plain", pose: "relaxed", prop: "party", say: "Bobbo opens the door, and his friends shout, 'Surprise!' How might he feel?", model: "A surprise party for Bobbo! He might feel surprised, and happy too.", accepted: ["surprised", "happy"], options: ["surprised", "happy", "sad", "angry"], a11y: "Party streamers and balloons by an open door. Bobbo is turned away, so we can't see his face." },
    { id: "teddy", friend: "hoot", face: "plain", pose: "relaxed", prop: "teddy", say: "Hoot can't find his teddy anywhere. How might he feel?", model: "Hoot can't find his teddy. He might feel sad, or a bit scared.", accepted: ["sad", "scared"], options: ["sad", "scared", "happy", "surprised"], a11y: "An empty bed where a teddy should be. Hoot is turned away, so we can't see his face." },
    { id: "home", friend: "zuzu", face: "plain", pose: "relaxed", prop: "home", say: "Time to go home, but Zuzu wants to keep playing. How might she feel?", model: "Zuzu has to stop playing. She might feel sad, or angry.", accepted: ["sad", "angry"], options: ["sad", "angry", "happy", "scared"], a11y: "A clock and a sandpit with toys. Zuzu is turned away, so we can't see her face." },
    { id: "fireworks", friend: "rumble", face: "plain", pose: "relaxed", prop: "fireworks", say: "Bang! Big fireworks light up the sky. How might Rumble feel?", model: "Fireworks are loud and bright. Rumble might feel surprised, scared, or happy!", accepted: ["surprised", "scared", "happy"], options: ["surprised", "scared", "happy", "sad"], a11y: "Bright fireworks burst in the night sky. Rumble is turned away, so we can't see his face." },
    { id: "seat", friend: "puff", face: "plain", pose: "relaxed", prop: "seat", say: "Puff got up, and someone took her seat. How might she feel?", model: "Puff's seat was taken. She might feel angry, or sad.", accepted: ["angry", "sad"], options: ["angry", "sad", "happy", "scared"], a11y: "A chair with someone else's bag on it. Puff is turned away, so we can't see her face." },
    { id: "drawing", friend: "gloop", face: "plain", pose: "relaxed", prop: "drawing", say: "Gloop's friend drew a picture just for him! How might he feel?", model: "A picture just for Gloop! He might feel happy, or surprised.", accepted: ["happy", "surprised"], options: ["happy", "surprised", "angry", "scared"], a11y: "A drawing with a heart, made as a gift. Gloop is turned away, so we can't see his face." },
    { id: "wind", friend: "bobbo", face: "plain", pose: "relaxed", prop: "wind", say: "Whoosh! The wind blew Bobbo's drawing away. How might he feel?", model: "Bobbo's drawing blew away. He might feel surprised, sad, or angry.", accepted: ["surprised", "sad", "angry"], options: ["surprised", "sad", "angry", "happy"], a11y: "A drawing blowing away in the wind. Bobbo is turned away, so we can't see his face." },
    { id: "van", friend: "hoot", face: "plain", pose: "relaxed", prop: "van", say: "The ice cream van drove away before Hoot got there. How might he feel?", model: "Hoot missed the ice cream van. He might feel sad, or angry.", accepted: ["sad", "angry"], options: ["sad", "angry", "happy", "scared"], a11y: "An ice cream van driving away down the road. Hoot is turned away, so we can't see his face." },
    { id: "beach", friend: "zuzu", face: "plain", pose: "relaxed", prop: "beach", say: "Zuzu hears, 'We're going to the beach today!' How might she feel?", model: "A beach day! Zuzu might feel happy, or surprised.", accepted: ["happy", "surprised"], options: ["happy", "surprised", "sad", "scared"], a11y: "A bucket and spade by the sea. Zuzu is turned away, so we can't see her face." },
  ]),
  // ---------------- level 4: body clues only (turned away, no scene bubble)
  ...level(4, "body", "back", [
    { id: "knees", friend: "rumble", face: "plain", pose: "knees", prop: null, say: "Rumble is hugging his knees, with his head down. How might he feel?", model: "Hugging knees with a low head can mean sad, or scared.", accepted: ["sad", "scared"], options: ["sad", "scared", "happy", "angry"], a11y: "Rumble sits curled up, hugging his knees, with his head down." },
    { id: "stomp", friend: "bobbo", face: "plain", pose: "fists", prop: null, say: "Bobbo is stomping, with his hands in tight fists. How might he feel?", model: "Tight fists and stomping feet can mean angry.", accepted: ["angry"], options: BASIC4, a11y: "Bobbo stomps his feet. His hands are tight fists." },
    { id: "jump", friend: "zuzu", face: "plain", pose: "up", prop: null, say: "Zuzu is jumping, with her arms up high. How might she feel?", model: "Jumping with arms up high can mean happy.", accepted: ["happy"], options: BASIC4, a11y: "Zuzu jumps in the air with her arms up high." },
    { id: "hide", friend: "gloop", face: "plain", pose: "face", prop: null, say: "Gloop is shaking, with his hands over his eyes. How might he feel?", model: "Shaking and hiding your eyes can mean scared, or sad.", accepted: ["scared", "sad"], options: ["scared", "sad", "happy", "angry"], a11y: "Gloop is shaking, with his hands up over his eyes." },
    { id: "slump", friend: "hoot", face: "plain", pose: "droop", prop: null, say: "Hoot's head hangs low, and his shoulders droop. How might he feel?", model: "A low head and droopy shoulders can mean sad.", accepted: ["sad"], options: BASIC4, a11y: "Hoot stands with his head hanging low and his wings drooping down." },
    { id: "crossed", friend: "zuzu", face: "plain", pose: "cross", prop: null, say: "Zuzu crosses her arms tight and stamps her foot. How might she feel?", model: "Tight crossed arms and a stamping foot can mean angry.", accepted: ["angry"], options: ["angry", "happy", "scared", "surprised"], a11y: "Zuzu has her arms crossed tight and stamps one foot." },
    { id: "leanback", friend: "bobbo", face: "plain", pose: "face", prop: null, say: "Bobbo leans back fast, with his hands up. How might he feel?", model: "Leaning back with hands up can mean scared, or surprised.", accepted: ["scared", "surprised"], options: ["scared", "surprised", "sad", "happy"], a11y: "Bobbo leans back quickly with both hands up by his face." },
    { id: "hugself", friend: "gloop", face: "plain", pose: "hug", prop: null, say: "Gloop sits all alone, hugging himself. How might he feel?", model: "Sitting alone, hugging yourself, can mean sad.", accepted: ["sad"], options: ["sad", "happy", "angry", "surprised"], a11y: "Gloop sits by himself with his arms wrapped around his body." },
    { id: "dance", friend: "rumble", face: "plain", pose: "up", prop: null, say: "Rumble is dancing around and waving his arms. How might he feel?", model: "Dancing and waving arms can mean happy.", accepted: ["happy"], options: BASIC4, a11y: "Rumble dances, waving his arms in the air." },
    { id: "wings", friend: "hoot", face: "plain", pose: "up", prop: null, say: "Hoot jumps, and his wings fly up wide! How might he feel?", model: "A jump with wings up wide can mean surprised, or happy.", accepted: ["surprised", "happy"], options: ["surprised", "happy", "sad", "angry"], a11y: "Hoot jumps up with his wings flung up wide." },
  ]),
  // ---------------- level 5: the friend's feeling is given; what could help? (3 idea cards)
  ...level(5, "help", "front", [
    { id: "kitebroke", friend: "hoot", face: "sad", pose: "droop", prop: "kite", say: "Hoot is sad. His kite broke. What could help?", model: "Sitting with Hoot, or helping fix his kite, could help.", accepted: ["sit", "fix"], options: ["sit", "fix", "laugh"], a11y: "A broken kite. Hoot looks sad. Idea cards: sit together, help fix it, or laugh." },
    { id: "crayons", friend: "zuzu", face: "sad", pose: "droop", prop: "crayons", say: "Zuzu dropped all her crayons. She feels sad. What could help?", model: "Helping Zuzu pick up her crayons could help.", accepted: ["pickup"], options: ["pickup", "laugh", "walk"], a11y: "Crayons spilled all over the floor. Zuzu looks sad. Idea cards: help pick up, laugh, or walk away." },
    { id: "alone", friend: "puff", face: "lonely", pose: "hug", prop: "alone", say: "Puff is sad. Nobody is playing with her. What could help?", model: "Asking Puff to play could help her feel included.", accepted: ["play"], options: ["play", "ignore", "walk"], a11y: "Friends playing far away. Puff stands alone and looks sad. Idea cards: ask to play, look away, or walk away." },
    { id: "storm", friend: "gloop", face: "scared", pose: "face", prop: "thunder", say: "Gloop is scared of the thunder. What could help?", model: "Sitting with Gloop, or getting a grown-up, could help.", accepted: ["sit", "grownup"], options: ["sit", "grownup", "laugh"], a11y: "A storm cloud with lightning. Gloop looks scared. Idea cards: sit together, get a grown-up, or laugh." },
    { id: "dropped", friend: "bobbo", face: "sad", pose: "droop", prop: "icecream", say: "Bobbo is sad. His ice cream fell. What could help?", model: "Sharing with Bobbo, or saying something kind, could help.", accepted: ["share", "kindwords"], options: ["share", "kindwords", "laugh"], a11y: "An ice cream on the ground. Bobbo looks sad. Idea cards: share, say something kind, or laugh." },
    { id: "fell", friend: "rumble", face: "sad", pose: "droop", prop: "tower", say: "Rumble is sad. His tower fell down. What could help?", model: "Building the tower again together could help Rumble.", accepted: ["build"], options: ["build", "laugh", "walk"], a11y: "A fallen block tower. Rumble looks sad. Idea cards: build it again, laugh, or walk away." },
    { id: "newkid", friend: "zuzu", face: "nervous", pose: "fidget", prop: "slide", say: "Zuzu is new at the park. She looks worried. What could help?", model: "Asking Zuzu to play could help her feel welcome.", accepted: ["play"], options: ["play", "ignore", "laugh"], a11y: "A park with a slide. Zuzu looks worried and holds her hands together. Idea cards: ask to play, look away, or laugh." },
    { id: "knee", friend: "hoot", face: "sad", pose: "droop", prop: "knee", say: "Hoot tripped and bumped his knee. What could help?", model: "Asking Hoot if he's OK, or getting a grown-up, could help.", accepted: ["askok", "grownup"], options: ["askok", "grownup", "laugh"], a11y: "A small bump with a plaster. Hoot looks sad. Idea cards: ask are you OK, get a grown-up, or laugh." },
    { id: "nosnack", friend: "puff", face: "sad", pose: "droop", prop: "snack", say: "Puff forgot her snack. She feels sad. What could help?", model: "Sharing a snack with Puff could help.", accepted: ["share"], options: ["share", "ignore", "laugh"], a11y: "An empty lunch box. Puff looks sad. Idea cards: share, look away, or laugh." },
  ]),
  // ---------------- level 6: big angry feelings are OK; what can the friend do that's safe? (3 idea cards)
  ...level(6, "calm", "front", [
    { id: "knocked", friend: "bobbo", face: "angry", pose: "fists", prop: "blocks", say: "Bobbo feels angry. Someone knocked his tower over. What can he do?", model: "Taking slow breaths, or telling a grown-up, are safe ideas.", accepted: ["breathe", "tell"], options: ["breathe", "tell", "throw"], a11y: "Knocked-over blocks. Bobbo looks angry. Idea cards: take slow breaths, tell a grown-up, or throw things." },
    { id: "lostgame", friend: "zuzu", face: "angry", pose: "fists", prop: "game", say: "Zuzu feels angry. She lost the game. What can she do?", model: "Counting to five, or asking for a break, are calm ideas.", accepted: ["count", "pause"], options: ["count", "pause", "shout"], a11y: "A board game. Zuzu looks angry. Idea cards: count to five, ask for a break, or shout at a friend." },
    { id: "laces", friend: "gloop", face: "angry", pose: "fists", prop: "shoelace", say: "Gloop feels cross. His shoelaces keep coming undone. What can he do?", model: "Taking slow breaths, or asking for help, are calm ideas.", accepted: ["breathe", "askhelp"], options: ["breathe", "askhelp", "throw"], a11y: "A shoe with an untied lace. Gloop looks cross. Idea cards: take slow breaths, ask for help, or throw things." },
    { id: "turn", friend: "puff", face: "angry", pose: "fists", prop: "slide", say: "Puff feels angry. Someone took her turn on the slide. What can she do?", model: "Saying 'I feel cross', or telling a grown-up, are safe ideas.", accepted: ["sayfeel", "tell"], options: ["sayfeel", "tell", "push"], a11y: "A slide with a line of friends. Puff looks angry. Idea cards: say I feel cross, tell a grown-up, or push in." },
    { id: "scribble", friend: "hoot", face: "angry", pose: "fists", prop: "scribble", say: "Hoot feels angry. Someone scribbled on his picture. What can he do?", model: "Taking slow breaths, or saying 'I feel cross', are calm ideas.", accepted: ["breathe", "sayfeel"], options: ["breathe", "sayfeel", "shout"], a11y: "A picture with scribbles on it. Hoot looks angry. Idea cards: take slow breaths, say I feel cross, or shout at a friend." },
    { id: "tricky", friend: "bobbo", face: "angry", pose: "fists", prop: "puzzle", say: "Bobbo feels cross. His puzzle is very tricky. What can he do?", model: "Asking for a break, or asking for help, are calm ideas.", accepted: ["pause", "askhelp"], options: ["pause", "askhelp", "throw"], a11y: "A puzzle with missing pieces. Bobbo looks cross. Idea cards: ask for a break, ask for help, or throw things." },
    { id: "queue", friend: "zuzu", face: "angry", pose: "fists", prop: "swingline", say: "Zuzu feels cross. The line for the swing is long. What can she do?", model: "Counting to five, or squeezing a calm stone, are calm ideas.", accepted: ["count", "stone"], options: ["count", "stone", "push"], a11y: "A long line for the swing. Zuzu looks cross. Idea cards: count to five, squeeze a calm stone, or push in." },
    { id: "wobbly", friend: "rumble", face: "angry", pose: "fists", prop: "blocks", say: "Rumble feels cross. His blocks keep falling over. What can he do?", model: "Taking slow breaths, or asking for help, are calm ideas.", accepted: ["breathe", "askhelp"], options: ["breathe", "askhelp", "knock"], a11y: "Wobbly blocks falling over. Rumble looks cross. Idea cards: take slow breaths, ask for help, or knock it all down." },
    { id: "spill", friend: "puff", face: "angry", pose: "fists", prop: "paint", say: "Puff feels angry. Her paint spilled everywhere. What can she do?", model: "Squeezing a calm stone, or telling a grown-up, are calm ideas.", accepted: ["stone", "tell"], options: ["stone", "tell", "throw"], a11y: "A paint pot spilled on the table. Puff looks angry. Idea cards: squeeze a calm stone, tell a grown-up, or throw things." },
  ]),
  // ---------------- level 7: more feeling words (frustrated, proud, nervous, excited, disappointed, lonely); 6 flowers
  ...level(7, "more", "front", [
    { id: "firstday", friend: "hoot", face: "nervous", pose: "fidget", prop: "school", say: "It's Hoot's first day at a new school. How might he feel?", model: "A first day can feel nervous, and excited too. Both are OK.", accepted: ["nervous", "excited", "scared"], options: ["nervous", "excited", "scared", "angry", "proud", "frustrated"], a11y: "A school with a backpack. Hoot holds his wings together and looks to the side." },
    { id: "bigdrawing", friend: "zuzu", face: "proud", pose: "hips", prop: "drawing", say: "Zuzu finished a big drawing, all by herself. How might she feel?", model: "Zuzu worked hard and finished. She might feel proud, and happy.", accepted: ["proud", "happy"], options: ["proud", "happy", "scared", "lonely", "frustrated", "angry"], a11y: "A finished drawing. Zuzu stands tall with her hands on her hips and a big smile." },
    { id: "nofit", friend: "bobbo", face: "frustrated", pose: "head", prop: "puzzle", say: "Bobbo's puzzle piece won't fit, again and again. How might he feel?", model: "When something won't work, we might feel frustrated, or angry.", accepted: ["frustrated", "angry"], options: ["frustrated", "angry", "proud", "excited", "surprised", "happy"], a11y: "A puzzle piece that doesn't fit. Bobbo holds his head with gritted teeth." },
    { id: "picnic", friend: "puff", face: "disappointed", pose: "droop", prop: "rain", say: "Puff waited all week for a picnic. Then it rained. How might she feel?", model: "Puff waited so long. She might feel disappointed, or sad.", accepted: ["disappointed", "sad"], options: ["disappointed", "sad", "proud", "excited", "scared", "happy"], a11y: "Rain falling on a picnic blanket. Puff's eyes are half closed and her shoulders droop." },
    { id: "tag", friend: "gloop", face: "lonely", pose: "hug", prop: "tag", say: "Friends are playing tag, and nobody asks Gloop. How might he feel?", model: "Being left out can feel lonely, or sad.", accepted: ["lonely", "sad"], options: ["lonely", "sad", "proud", "excited", "surprised", "happy"], a11y: "Friends running in a game of tag far away. Gloop stands alone, hugging himself." },
    { id: "fair", friend: "rumble", face: "excited", pose: "up", prop: "fair", say: "Rumble is going to the fair tomorrow! How might he feel?", model: "Something fun is coming! Rumble might feel excited, and happy.", accepted: ["excited", "happy"], options: ["excited", "happy", "lonely", "frustrated", "angry", "disappointed"], a11y: "A big wheel at the fair. Rumble is bouncing with his arms up and sparkly eyes." },
    { id: "bike", friend: "hoot", face: "proud", pose: "hips", prop: "bike", say: "Hoot rode his bike, after trying and trying! How might he feel?", model: "Hoot kept trying, and he did it! He might feel proud.", accepted: ["proud", "happy", "excited"], options: ["proud", "happy", "excited", "lonely", "angry", "disappointed"], a11y: "A little bike. Hoot stands tall with his wings on his hips, smiling." },
    { id: "show", friend: "zuzu", face: "nervous", pose: "fidget", prop: "stage", say: "Zuzu waits behind the curtain to sing in the show. How might she feel?", model: "Before a show we might feel nervous, and excited too.", accepted: ["nervous", "excited", "scared"], options: ["nervous", "excited", "scared", "angry", "lonely", "disappointed"], a11y: "A stage with a curtain. Zuzu holds her hands together and looks to the side." },
    { id: "knot", friend: "bobbo", face: "frustrated", pose: "head", prop: "shoelace", say: "Bobbo tries and tries, but the knot won't come undone. How might he feel?", model: "When something is tricky, we might feel frustrated, or angry.", accepted: ["frustrated", "angry"], options: ["frustrated", "angry", "proud", "excited", "lonely", "happy"], a11y: "A tangled shoelace knot. Bobbo holds his head with gritted teeth." },
    { id: "holiday", friend: "puff", face: "lonely", pose: "hug", prop: "suitcase", say: "Puff's best friend is away all week. How might Puff feel?", model: "Missing a friend can feel lonely, or sad.", accepted: ["lonely", "sad"], options: ["lonely", "sad", "proud", "excited", "surprised", "frustrated"], a11y: "A suitcase, packed for a trip. Puff stands alone, hugging herself." },
    { id: "helper", friend: "gloop", face: "disappointed", pose: "droop", prop: "helper", say: "Gloop wanted to be today's helper, but he wasn't picked. How might he feel?", model: "Gloop hoped to help. He might feel disappointed, or sad.", accepted: ["disappointed", "sad"], options: ["disappointed", "sad", "proud", "excited", "scared", "happy"], a11y: "A helper badge going to someone else. Gloop's eyes are half closed and he looks down." },
  ]),
  // ---------------- level 8: one thing happens, two friends feel different things
  ...level(8, "two", "front", [
    { id: "rainday", friend: "rumble", face: "happy", pose: "relaxed", prop: "picnic", say: "Rain! No picnic today. Rumble wanted a nap anyway. How might each feel?", model: "Rumble might feel happy. Puff might feel disappointed. Different feelings!", accepted: ["happy"], options: ["happy", "disappointed", "sad", "angry", "scared", "lonely"], second: { friend: "puff", face: "disappointed", pose: "droop", accepted: ["disappointed", "sad"] }, a11y: "Rain on a picnic. Rumble smiles sleepily. Puff's eyes are half closed and her shoulders droop." },
    { id: "race", friend: "puff", face: "excited", pose: "up", prop: "medal", say: "Puff won the race, and Bobbo came last. How might each friend feel?", model: "Puff might feel proud. Bobbo might feel disappointed. Both are OK.", accepted: ["proud", "happy", "excited"], options: ["proud", "happy", "excited", "disappointed", "sad", "scared"], second: { friend: "bobbo", face: "disappointed", pose: "droop", accepted: ["disappointed", "sad"] }, a11y: "A finish line and a medal. Puff jumps with her arms up. Bobbo looks down with drooping shoulders." },
    { id: "bang", friend: "zuzu", face: "excited", pose: "up", prop: "fireworks", say: "The fireworks start! Zuzu cheers. Rumble covers his ears. How might each friend feel?", model: "Zuzu might feel excited. Rumble might feel scared. Different feelings!", accepted: ["excited", "happy"], options: ["excited", "happy", "scared", "nervous", "sad", "lonely"], second: { friend: "rumble", face: "scared", pose: "face", accepted: ["scared", "nervous"] }, a11y: "Fireworks in the sky. Zuzu cheers with her arms up. Rumble covers his ears with wide eyes." },
    { id: "puppy", friend: "gloop", face: "excited", pose: "up", prop: "puppy", say: "A puppy runs up. Gloop loves dogs. Hoot steps back. How might each feel?", model: "Gloop might feel excited. Hoot might feel nervous. Both are OK.", accepted: ["excited", "happy"], options: ["excited", "happy", "nervous", "scared", "angry", "lonely"], second: { friend: "hoot", face: "nervous", pose: "fidget", accepted: ["nervous", "scared"] }, a11y: "A bouncy puppy. Gloop smiles with his arms up. Hoot steps back, holding his wings together." },
    { id: "cupcake", friend: "bobbo", face: "happy", pose: "up", prop: "cupcake", say: "Bobbo got the last cupcake. Zuzu didn't get one. How might each friend feel?", model: "Bobbo might feel happy. Zuzu might feel disappointed. Different feelings!", accepted: ["happy", "excited"], options: ["happy", "excited", "disappointed", "sad", "scared", "proud"], second: { friend: "zuzu", face: "disappointed", pose: "droop", accepted: ["disappointed", "sad"] }, a11y: "One cupcake on a plate. Bobbo smiles. Zuzu's eyes are half closed and she looks down." },
    { id: "pool", friend: "puff", face: "excited", pose: "up", prop: "pool", say: "Swim time! Puff jumps in. Gloop holds the side. How might each feel?", model: "Puff might feel excited. Gloop might feel nervous. Both are OK.", accepted: ["excited", "happy"], options: ["excited", "happy", "nervous", "scared", "angry", "lonely"], second: { friend: "gloop", face: "nervous", pose: "fidget", accepted: ["nervous", "scared"] }, a11y: "A swimming pool. Puff splashes with her arms up. Gloop holds the side and looks worried." },
    { id: "ride", friend: "hoot", face: "excited", pose: "up", prop: "fair", say: "The big ride starts! Hoot loves it. Bobbo holds tight. How might each feel?", model: "Hoot might feel excited. Bobbo might feel scared. Different feelings!", accepted: ["excited", "happy"], options: ["excited", "happy", "scared", "nervous", "sad", "angry"], second: { friend: "bobbo", face: "scared", pose: "face", accepted: ["scared", "nervous"] }, a11y: "A big wheel ride at the fair. Hoot smiles with his wings up. Bobbo holds on with wide eyes." },
    { id: "crash", friend: "rumble", face: "happy", pose: "relaxed", prop: "tower", say: "Their tower falls! Rumble laughs. Zuzu stomps. How might each friend feel?", model: "Rumble might feel happy. Zuzu might feel frustrated. Both are OK.", accepted: ["happy", "surprised"], options: ["happy", "surprised", "frustrated", "angry", "lonely", "proud"], second: { friend: "zuzu", face: "frustrated", pose: "head", accepted: ["frustrated", "angry"] }, a11y: "A fallen tower. Rumble laughs. Zuzu holds her head with gritted teeth." },
  ]),
];

export const scenarioById = (id: string) => (id === TUTORIAL.id ? TUTORIAL : SCENARIOS.find((s) => s.id === id));
export const isFeeling = (id: string): id is FeelingId => (FEELINGS as readonly string[]).includes(id);
export const isAction = (id: string): id is ActionId => id in ACTIONS;
export const optionText = (id: string) => (isAction(id) ? ACTIONS[id].text : id.charAt(0).toUpperCase() + id.slice(1));
