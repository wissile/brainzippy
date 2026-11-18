/**
 * Editorial copy for each game page (/games/<id>). Facts that come from game data (ages, skills,
 * levels, example puzzles, exercise counts) are NOT repeated here; the page reads them from
 * src/site/catalog.ts. Keep the story and helper descriptions in sync with each game's voice.json.
 */
import type { RefKey } from "./references";

export interface GameCopy {
  id: string;
  subject: string;
  critter: "bobbo" | "gloop" | "puff" | "rumble" | "zuzu" | "hoot";
  helper: string;
  updated: string;
  title: string;
  description: string;
  oneLine: string;
  story: string;
  howToPlay: readonly string[];
  /** Plain-language name for each difficulty level, index 0 = level 1. */
  levelNames: readonly string[];
  mistakes: string;
  tips: readonly string[];
  offScreen: string;
  why: { text: string; refs: readonly RefKey[] };
  guides: readonly string[];
  screenshotAlt: string;
}

export const GAME_COPY: Record<string, GameCopy> = {
  "counting-adventure": {
    id: "counting-adventure",
    subject: "math",
    critter: "bobbo",
    helper: "Hoot",
    updated: "2026-11-17",
    title: "Bobbo's Breakfast: a counting game for ages 4–6",
    description: "A free-to-try counting game for ages 4–6. Children count Bobbo's scattered snacks one by one, learn that the last number tells how many, and count out sets.",
    oneLine: "Help Bobbo gather his breakfast snacks by counting them carefully, one by one.",
    story: "The wind has blown Bobbo's breakfast all over the meadow. Your child helps him gather the snacks, counting them carefully. Hoot the owl appears to show the counting trick, and every finished round brings back one of Monster Island's lost Brain Sparks.",
    howToPlay: [
      "Tap each snack once. It lights up and the number is said aloud, so every object gets exactly one number.",
      "Answer “How many?” by choosing a number. Each number button also shows a dot pattern, so a child who doesn't know numerals yet can still match.",
      "Some puzzles show a small group or a ten frame: say how many without counting one by one.",
      "“Give me 4!” puzzles ask your child to put exactly the right number of snacks in Bobbo's basket, then press the check button.",
    ],
    levelNames: ["Up to 3", "4 and 5", "6 and 7", "8 to 10"],
    mistakes: "A wrong answer is never punished. The first miss brings a hint (“The last number we said tells how many”). A second miss starts a count-along where Hoot counts each snack with your child, and then your child makes the final tap themselves.",
    tips: [
      "After the game, ask your child to count something real, like spoons or steps, and then ask “So how many?”",
      "If your child counts the same snack twice, slow down together and touch each one.",
      "Try “Give me five grapes” at snack time. Stopping at the right number is a separate skill from counting.",
    ],
    offScreen: "Line up toys and count them, then mix them up and count again. Your child sees that the number stays the same, however they are arranged.",
    why: {
      text: "Children usually learn what “one”, “two” and “three” mean before they understand that counting tells you the total, so the game asks “How many?” after counting and includes “give me N” puzzles, not just counting along.",
      refs: ["lecorre2007", "gelman1978", "clements1999"],
    },
    guides: ["teaching-counting-to-preschoolers", "what-is-subitizing"],
    screenshotAlt: "Bobbo's Breakfast: snacks scattered on a picnic blanket, number buttons with dot patterns below, Bobbo the orange monster beside his basket.",
  },
  "glow-cave-hops": {
    id: "glow-cave-hops",
    subject: "math",
    critter: "gloop",
    helper: "Zuzu",
    updated: "2026-11-17",
    title: "Glow Cave Hops: a number line addition game for ages 5–7",
    description: "A number line game for ages 5–7. Children move a mine cart along an evenly spaced, numbered track to add by counting on. Hints, worked examples, no ads.",
    oneLine: "Relight Gloop's crystal cave by hopping a mine cart the right number of spaces along a number line.",
    story: "Gloop's crystal cave has gone dark, and the crystals only glow when someone hops the right number of spaces. Zuzu arrives with her lantern to help. Each correct hop lights up more of the cave.",
    howToPlay: [
      "Read or listen to the puzzle: “Hop 3 spaces from 4!”",
      "Slide the cart along the track, or press Hop to move one space at a time. Every stop on the line is numbered and evenly spaced.",
      "Press Go when the cart is on the answer.",
      "Keyboard players can move the cart with the arrow keys.",
    ],
    levelNames: ["Track to 5, 1–2 hops", "Track to 10, 2–4 hops", "Track to 10, 3–6 hops", "Track to 20, 4–9 hops"],
    mistakes: "After a miss, Zuzu counts the hops along with your child (“plus one, plus one”). After a second miss she shows the whole move as a worked example, and your child then moves the cart and presses Go.",
    tips: [
      "Ask your child to say the next number out loud on every hop, starting from the number after the start.",
      "A common slip is counting the starting number as a hop. If the answer is one short, check that together.",
      "Draw a number line on paper or with chalk and let your child hop along it with a toy.",
    ],
    offScreen: "Play a board game with a straight, numbered track, such as Snakes and Ladders, and have your child count each space aloud as they move.",
    why: {
      text: "The track is always straight, evenly spaced and numbered at every stop because playing linear numbered board games improved young children's number knowledge in experiments, while a colour-only version did not.",
      refs: ["siegler2008", "siegler2004"],
    },
    guides: ["number-lines-for-kids"],
    screenshotAlt: "Glow Cave Hops: a mine cart on a numbered track inside a crystal cave, with Hop and Go buttons.",
  },
  "sky-balloon-race": {
    id: "sky-balloon-race",
    subject: "math",
    critter: "puff",
    helper: "Puff",
    updated: "2026-11-17",
    title: "Sky Balloon Race: an addition game for ages 6–8",
    description: "An addition game for ages 6–8. Children solve sums to 20 to lift Bobbo's balloon, practising counting on from the bigger number and crossing ten.",
    oneLine: "Solve sums to lift Bobbo's balloon past his friends in the Great Sky Balloon Race.",
    story: "It's the Great Sky Balloon Race, but Bobbo's balloon is too heavy to lift off. Puff floats in with magic number balloons: every correct sum lifts Bobbo higher, past Zuzu and Gloop, toward the rainbow finish line.",
    howToPlay: [
      "A sum appears, such as 8 + 5, and is read aloud.",
      "Three number balloons float in the sky. Drag the right one to Bobbo's basket, or simply tap it.",
      "The game also works with a keyboard: move between balloons and press Enter.",
    ],
    levelNames: ["Sums to 5", "Sums from 6 to 10", "Crossing ten", "Teen numbers to 20"],
    mistakes: "A miss brings Puff's tip: start with the bigger number and count on the rest. A second miss shows a worked example in two ten frames: the bigger number fills in first, then the rest are counted on one by one, so your child sees the first ten fill up before the count continues.",
    tips: [
      "Ask “Which number is bigger? Start there.” Counting on from 8 is much faster than counting all 13.",
      "For sums like 8 + 5, ask how many more 8 needs to make 10 (2), then how many are left (3).",
      "Practise pairs that make ten with fingers or a ten frame drawn on paper.",
    ],
    offScreen: "Play “make ten”: you show some fingers, your child shows how many more make ten. Then try it with eggs in a ten-cup egg box.",
    why: {
      text: "Puzzles are ordered from counting on with small numbers to sums that cross ten, matching the strategies children are expected to use for addition within 20 (counting on, then making ten).",
      refs: ["ccss", "sweller2019"],
    },
    guides: ["making-ten-addition-strategy"],
    screenshotAlt: "Sky Balloon Race: a sum at the top, three number balloons floating in the sky and Bobbo in a balloon basket.",
  },
  "cookie-kitchen": {
    id: "cookie-kitchen",
    subject: "math",
    critter: "rumble",
    helper: "Hoot",
    updated: "2026-11-17",
    title: "Cookie Kitchen: a fair sharing (early division) game for ages 7–9",
    description: "A fair sharing game for ages 7–9. Children deal cookies onto plates so every friend gets the same, then say how many each: the first step toward division.",
    oneLine: "Share Rumble's cookies fairly between party plates, so every friend gets the same.",
    story: "Rumble is baking cookies for a party, and everyone wants some. Each friend must get the same so it's fair. Hoot shows how to deal them out, plate by plate.",
    howToPlay: [
      "Rumble's tray holds some cookies, and there are empty plates on the party table.",
      "Drag cookies onto the plates (or tap a cookie, then tap a plate), dealing one to each plate and going round again.",
      "When every plate has the same, choose how many each plate gets.",
    ],
    levelNames: ["2 plates, up to 8 cookies", "2–3 plates, up to 12", "3–4 plates, up to 16", "4–5 plates, up to 20"],
    mistakes: "If the plates aren't fair yet, the game says so and invites your child to move a cookie. A wrong answer brings Hoot's hint to deal one at a time; a second miss walks through the sharing together before your child makes the final tap.",
    tips: [
      "Ask “How do you know it's fair?” Counting one plate and checking the others is real mathematical reasoning.",
      "Try a total that doesn't share evenly, such as 7 cookies on 2 plates, and talk about the one left over.",
      "Later, connect it to division: “12 shared between 3 is 4 each.”",
    ],
    offScreen: "Share real snacks or toy blocks between teddies. Ask your child to predict how many each will get before dealing them out.",
    why: {
      text: "Young children often share by dealing one at a time well before they learn division, but realising that fair shares always hold the same number develops gradually. The game asks children to check the plates and say how many each.",
      refs: ["frydman1988", "ccss"],
    },
    guides: ["fair-sharing-introduction-to-division"],
    screenshotAlt: "Cookie Kitchen: Rumble's tray of cookies above a row of party plates.",
  },
};
