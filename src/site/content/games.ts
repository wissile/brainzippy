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
  /** Plain-language name for each difficulty level, index 0 = level 1. Must have one entry per real level (tested). */
  levelNames: readonly string[];
  /**
   * How to label a level's smallest–largest numeric answer in the difficulty table ("answers 2–3"), or null to
   * hide it when the stored answer is not a number a parent would recognise (e.g. a post index on a fraction trail).
   */
  answerLabel?: string | null;
  /** True only when every level can be played without reading words (all prompts spoken, pictures or numerals). */
  noReading: boolean;
  /** Common mix-ups the game is built to surface, and what it does about each (from the world's pedagogy doc). */
  misconceptions: readonly { idea: string; how: string }[];
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
    levelNames: ["1 to 3", "2 to 4", "3 to 5", "4 to 6, ten frames begin", "5 to 7", "6 to 8", "7 to 9", "8 to 10"],
    noReading: true,
    misconceptions: [
      { idea: "Counting a snack twice, or skipping one", how: "Each snack lights up and says its number when touched, and a counted snack can't be counted again." },
      { idea: "Not yet knowing that the last number counted is the total", how: "After counting, the game asks “How many?”, and the first hint is “The last number we said tells how many.”" },
      { idea: "Being one out", how: "The number choices are the answer and its neighbours, the slips children most often make." },
      { idea: "Not stopping when counting out a set", how: "“Give me N” puzzles always have more snacks in the pile than asked for, so your child has to stop at the right number." },
    ],
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
    answerLabel: "lands on",
    noReading: true,
    misconceptions: [
      { idea: "Counting the starting number as the first hop", how: "Each hop moves exactly one numbered stop, and the hint counts the hops one at a time (“plus one, plus one”), so an extra or missing hop shows." },
      { idea: "Picturing numbers bunched together", how: "The track is always straight and evenly spaced, with every stop numbered." },
    ],
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
    noReading: true,
    misconceptions: [
      { idea: "Counting everything from one", how: "The first hint is to start with the bigger number and count on the rest." },
      { idea: "Starting from the smaller number", how: "Some sums put the smaller number first (such as 3 + 8), and the hint always says to start from the bigger one." },
      { idea: "Counting the start number again when counting on", how: "One wrong balloon is always one less than the answer, which is exactly what that slip gives." },
      { idea: "Losing track when a sum crosses ten", how: "The worked example uses two ten frames, so your child sees the first ten fill before the count goes on." },
    ],
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
    answerLabel: "each plate gets",
    noReading: true,
    misconceptions: [
      { idea: "Thinking shares are fair if they look about even", how: "The game checks that every plate has the same before it asks how many each, and says so if they don't." },
      { idea: "Counting all the cookies again to say how many each", how: "The question is about one plate (“How many on each plate?”), the link between sharing and division." },
      { idea: "Answering with the number of plates, or taking away instead of sharing", how: "The number choices include those answers, so a child who makes that slip gets a hint and a walk-through rather than a lucky pass." },
    ],
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

  "rhyme-lanterns": {
    id: "rhyme-lanterns",
    subject: "english",
    critter: "hoot",
    helper: "Zuzu",
    updated: "2026-11-18",
    title: "Hoot's Rhyme Lanterns: a rhyming game for ages 3–5",
    description: "A rhyming game for ages 3–5 with no reading needed. Children listen to picture words and light Hoot's lanterns by matching words that sound the same at the end.",
    oneLine: "Light Hoot's forest lanterns by finding picture words that rhyme, like cat and hat.",
    story: "It's Hoot's lantern party in the forest, but every lantern is dark, and they only glow when rhyming words meet. Zuzu helps explain the trick. As your child finds rhymes, the forest path lights up and the fireflies come to watch. A finished round earns the Lantern Keeper sticker and brings back a Brain Spark.",
    howToPlay: [
      "Listen first. Hoot names the word on his lantern, then each picture lantern in turn. Tap any lantern to hear its word again.",
      "Move the lantern that rhymes over to Hoot's lantern: drag it, or tap it and then tap the hook.",
      "Early puzzles ask “Do they rhyme?”. A bright lantern means yes and a sleepy lantern means no.",
      "Later puzzles ask for the one word that doesn't rhyme, or for every picture that rhymes, hung on a rhyme chain.",
      "Keyboard players can Tab to a lantern, press Enter, then press Enter again on the hook.",
    ],
    levelNames: [
      "Do these two rhyme? Yes or no",
      "Pick the rhyme from 2 pictures",
      "Pick from 3: one decoy starts with the same sound",
      "Pick from 3: close decoys with the same middle sound",
      "Odd one out: which word doesn't rhyme?",
      "Pick from 4, with blends such as frog and log",
      "Rhyme chain of 3",
      "Rhyme chain of 4",
    ],
    answerLabel: null,
    noReading: true,
    misconceptions: [
      { idea: "Thinking words rhyme because they start the same (cat and cake)", how: "From level 3, pick-the-rhyme puzzles include a decoy that shares the first sound but not the ending." },
      { idea: "Thinking words rhyme because they sound a bit alike (cat and can)", how: "Level 4 adds decoys with the same middle sound but a different ending." },
      { idea: "Stopping at the first word that seems right", how: "Odd-one-out puzzles and rhyme chains ask your child to listen to and compare every word." },
    ],
    mistakes: "A wrong answer is never punished. After a first miss, Zuzu gives the strategy (“Say them slowly, and listen to the very end of each word”), the wrong lantern goes grey, and Hoot says the remaining words slowly. After a second miss, Hoot says the words slowly again and each rhyming lantern lights up as it's spoken. The right lantern shines, and your child moves it themselves.",
    tips: [
      "Play “I spy a rhyme”: “I spy something that rhymes with log.” (A dog!)",
      "If your child picks a word that starts the same, such as cake for cat, say both slowly and ask: do the ends sound the same?",
      "Read rhyming picture books and pause before the rhyming word, so your child can say it.",
    ],
    offScreen: "Make silly rhymes with names and toys: “Teddy, Beddy, Freddy.” Made-up words count, because rhyming is about the sound at the end, not the meaning.",
    why: {
      text: "In a long-term study, preschoolers' skill at hearing which words rhyme or start alike predicted their reading and spelling years later, and practice in sorting words by sound helped most when it was combined with letters. Rhyme is an early listening step rather than reading itself, so this game uses only pictures and spoken words and asks children to listen to the end of each word.",
      refs: ["bradley1983"],
    },
    guides: [],
    screenshotAlt: "Hoot's Rhyme Lanterns: a cat lantern and a hat lantern hang in a night-time forest, with a bright pair of lanterns for yes and a sleepy lantern for no, and Hoot the owl asking whether they rhyme.",
  },
  "pattern-parade": {
    id: "pattern-parade",
    subject: "math",
    critter: "puff",
    helper: "Gloop",
    updated: "2026-11-18",
    title: "Puff's Pattern Parade: a patterns game for ages 4–6",
    description: "A patterns game for ages 4–6. Children fill the gaps in Puff's parade by finding the part that repeats, copy patterns with new things, and continue growing towers.",
    oneLine: "Fill the gaps in Puff's parade so every marcher is back in the pattern.",
    story: "Puff's big parade is about to start, but a gust of wind knocks the marchers out of line. Your child fills every gap so the parade can march. Each solved gap moves Puff's pennant closer to the big stage, and a finished round earns the Parade Star sticker.",
    howToPlay: [
      "The parade stands in a row, with dashed boxes where marchers are missing. The spoken prompt reads the pattern aloud.",
      "Drag a marcher from Puff's cart into a gap, or tap a marcher to fill the next gap. Tap a filled gap to send its marcher back.",
      "With one gap, the answer is checked straight away. With several gaps, press the check button when you're ready.",
      "Later puzzles ask your child to show the same pattern with different things, such as animals or instruments, and to continue towers that grow by one block.",
      "Every marcher also has its own sound, but the game works just as well muted. Keyboard players can Tab to a marcher and press Enter.",
    ],
    levelNames: [
      "AB patterns: what comes next?",
      "AB patterns: the next two",
      "AAB and ABB patterns",
      "ABC patterns",
      "Find the missing middle",
      "Copy an AB pattern with new things",
      "Copy AAB, ABB and ABC patterns",
      "Growing towers (+1): the next one",
      "Growing towers: the next two, or a missing step",
    ],
    answerLabel: null,
    noReading: true,
    misconceptions: [
      { idea: "Copying the last item instead of continuing the pattern", how: "In AB patterns the answer is never the same as the last marcher, and at level 1 the only wrong choice is exactly that copy." },
      { idea: "Reading an AAB pattern as AB", how: "AAB and ABB puzzles put both pattern marchers in the cart, so repeating only the last two items gives a wrong answer." },
      { idea: "Thinking something new comes next", how: "The cart includes a marcher from the same set that isn't in the pattern." },
      { idea: "Judging a pattern by how it looks, not its structure", how: "Copy puzzles use only the new set of things, so your child has to match the structure (A to A, B to B)." },
      { idea: "Not growing a growing pattern", how: "The tower choices are a copy of the last tower, one block more (right) and two blocks more." },
    ],
    mistakes: "A wrong answer is never punished. After a first miss, the wrong marcher greys out, Gloop pops in, and coloured boxes appear around each repeat of the pattern while Puff sings the first part. Tower puzzles show count badges instead (1, 2, 3, ?). After a second miss, the game walks along the whole row marcher by marcher, faint “ghost” marchers show what belongs in each gap, and your child puts them in place.",
    tips: [
      "Ask your child to say the pattern out loud from the start: “duck, frog, duck, frog…”. Hearing it makes the repeating part easier to spot.",
      "If your child copies the last item, point back to the start and ask “What comes again and again?”",
      "Try sound patterns: clap, clap, stomp. Then ask your child to show the same pattern with different sounds or toys.",
    ],
    offScreen: "Make patterns with things at home, such as spoon, fork, spoon, fork, or red and blue blocks. Then make a mistake on purpose and see if your child can find it and fix it.",
    why: {
      text: "In a study that followed 517 children from low-income families from age 4 to age 11, pattern knowledge in the last year of preschool was one of the stronger predictors of maths achievement in fifth grade. That is a link, not proof that pattern games raise later scores. The game asks children to find the part that repeats, because spotting that unit is what lets them continue, fix and copy a pattern.",
      refs: ["rittlejohnson2017"],
    },
    guides: ["when-your-child-gets-it-wrong"],
    screenshotAlt: "Puff's Pattern Parade: parade floats in a star, heart, star, heart, star pattern with a dashed gap at the end, and a cart holding a star and a heart to choose from.",
  },
  "shape-squish": {
    id: "shape-squish",
    subject: "math",
    critter: "gloop",
    helper: "Zuzu",
    updated: "2026-11-18",
    title: "Gloop's Shape Squish: a 2D shapes game for ages 4–6",
    description: "A shapes game for ages 4–6. Children squish Gloop through shaped gates, find and sort shapes by their sides and corners, and fill outlines with smaller pieces.",
    oneLine: "Help Gloop squish into the right shape to get through every garden gate to the Jelly Party.",
    story: "The Jelly Party is on the other side of Shape Garden, but every gate has a shaped hole and Gloop keeps going bonk. Luckily Gloop can squish into any shape. Zuzu helps by tracing sides with her pencil. A finished round gets Gloop to the party and earns the Shape Squisher sticker.",
    howToPlay: [
      "Gloop changes into a shape. Drag Gloop to the gate with the matching hole, or simply tap the gate.",
      "“Find every triangle!” puzzles ask your child to put every matching shape in the jelly jar.",
      "Sorting puzzles have two jars labelled with a number and tally marks, “3 sides” and “4 sides”.",
      "Outline puzzles ask your child to fill a shape, such as a hexagon, with smaller pieces that snap in only when they really fit.",
      "Everything can be done by tapping (pick up, then choose where it goes) or with the keyboard (Enter to pick up, Tab and Enter to put down).",
    ],
    levelNames: [
      "Circle or square: 2 gates",
      "Circle, square or triangle",
      "Turned, stretched and resized gates",
      "Find every triangle (or every square)",
      "Sort by 3 sides or 4 sides",
      "Which two triangles make a square?",
      "Fill a hexagon outline",
      "Fill two outlines, each a different way",
    ],
    answerLabel: null,
    noReading: true,
    misconceptions: [
      { idea: "A turned square is a “diamond”, not a square", how: "From level 3 the gates are turned, stretched and resized while Gloop stays upright, so your child has to look past the turn." },
      { idea: "Only a pointy-up triangle with equal sides is a triangle", how: "“Find every triangle” mixes thin, wide, right-angled, uneven and turned triangles with near misses such as kites and pentagons." },
      { idea: "Colour or size decides what a shape is", how: "Sorting jars share the same colours and are labelled by number of sides, so colour can never be the rule." },
      { idea: "Puzzle pieces must stay facing the same way", how: "Pieces in the tray are shown turned, so your child turns them to fit." },
    ],
    mistakes: "A wrong answer is never punished. After a first miss, Zuzu says “Let's trace the sides with my pencil and count them”, the wrong pick greys out, and the board adds help: numbered sides and corner dots, or a glowing gap in an outline. After a second miss, the game shows the answer step by step (tracing and counting the sides, or placing the pieces one by one), and your child presses the glowing control to finish.",
    tips: [
      "Go on a shape hunt and count sides together: “The clock has no corners. The window has 4 sides.”",
      "Turn a square cracker or a book and ask “Is it still a square?” Turning a shape doesn't change it.",
      "Show triangles that are long and thin or upside down, not just the usual one, and ask how you know they're triangles.",
    ],
    offScreen: "Fold or cut a paper square into two triangles, then put them back together a different way. Ask what new shapes you can make.",
    why: {
      text: "Young children often judge a shape by how much it looks like the typical picture they know, so they may reject a long, thin triangle or call a turned square a diamond. The game shows shapes in many sizes and turns, includes near misses, and describes every shape by its sides and corners, so children learn what really makes a shape.",
      refs: ["clements1999shape", "ccss"],
    },
    guides: ["when-your-child-gets-it-wrong"],
    screenshotAlt: "Gloop's Shape Squish: Gloop, squished into a circle, beside a square gate and a circle gate in Shape Garden, with a pointing hand showing how to drag Gloop.",
  },
  "sleepy-trail": {
    id: "sleepy-trail",
    subject: "math",
    critter: "rumble",
    helper: "Gloop",
    updated: "2026-11-18",
    title: "Rumble's Sleepy Trail: a fractions on a number line game for ages 7–9",
    description: "A fractions game for ages 7–9. Children place fractions as points on a number line by counting equal jumps from zero, then compare, find equivalents and estimate.",
    oneLine: "Help sleepy Rumble put a pillow on every nap spot, each one a fraction of the way along the trail.",
    story: "Rumble loves naps. His map marks his favourite nap spots as fractions of the Sleepy Trail, from Mossy Rock (0) to Big Tree (1), and later on to Far Hill (2) and Cloud Peak (3). Your child puts a pillow on each spot before bedtime. The sky turns from golden afternoon to starry night as the pillows go down, and a finished round earns the Trail Marker sticker.",
    howToPlay: [
      "Rumble's map gives a spot, such as three fourths of the way from Mossy Rock to Big Tree. The trail is split into equal parts, and only the whole numbers are labelled.",
      "Move Rumble by tapping a post, dragging him or using the step buttons, then press Nap here. Dotted arcs show each equal jump he walked from zero.",
      "Some puzzles show Rumble already standing on a post: tap the card with the right fraction.",
      "Later puzzles compare how far Rumble and Bobbo walk on two trails, and ask for estimates on trails with no posts at all.",
      "Keyboard players can use the arrow keys to move one post at a time and press Enter on Rumble for Nap here.",
    ],
    levelNames: [
      "Unit fractions from 1/2 to 1/8",
      "Fractions below one, such as 3/4",
      "Thirds to eighths, including 0 and 1 whole",
      "Name the fraction where Rumble stands",
      "Past one: a 0–2 trail, such as 5/4",
      "Equivalent fractions: find 1/2 on a trail in eighths",
      "Compare two fractions on matching trails",
      "Estimate on an unmarked 0–1 trail",
      "Estimate on unmarked 0–2 and 0–3 trails",
    ],
    answerLabel: null,
    noReading: false,
    misconceptions: [
      { idea: "Counting the posts instead of the jumps", how: "Name-the-fraction cards include the fraction you get by counting posts, and a miss that is one jump off brings the hint “Count the jumps, not the posts.”" },
      { idea: "Reading 3/4 as the whole number 3", how: "If Rumble stops on the whole number, the hint explains that the bottom number tells how many equal parts make one whole." },
      { idea: "Swapping the top and bottom numbers", how: "The flipped fraction appears as a choice when it fits on the trail, with its own hint." },
      { idea: "Thinking a bigger bottom number means a bigger fraction", how: "Compare puzzles pair fractions like 3/8 and 3/6, and the hint says “More parts means each part is smaller.”" },
      { idea: "Thinking bigger numbers always mean a bigger fraction", how: "Equivalence puzzles never split the trail to match the fraction, so 1/2 has to be found among eighths or sixths." },
    ],
    mistakes: "A wrong answer is never punished. After a first miss, Rumble walks back to Mossy Rock, the equal parts flash one by one, and Gloop gives a hint matched to the likely mistake, such as “Count the jumps, not the posts.” After a second miss, Rumble walks the jumps from zero while they are counted and labelled (1/4, 2/4, 3/4), and your child taps the glowing button to finish.",
    tips: [
      "Talk about fractions as numbers: “Is three fourths more or less than one? Where would it go between 0 and 1?”",
      "On a ruler or a line you draw, start at zero and count the spaces, not the marks.",
      "Ask which is bigger, one third or one sixth, and why. More parts in the same whole means each part is smaller.",
    ],
    offScreen: "Fold a strip of paper in half, then in half again, and mark where 1/2, 1/4 and 3/4 land. Notice that 2/4 lands on exactly the same spot as 1/2.",
    why: {
      text: "A practice guide on teaching fractions from the US Institute of Education Sciences recommends number lines as a central representation, because they show that fractions are numbers with a size and a place among other numbers. So fractions here are always spots on an evenly split trail, not slices of pizza, and only whole numbers are labelled so children count the equal jumps.",
      refs: ["siegler2010", "ccss"],
    },
    guides: ["number-lines-for-kids", "when-your-child-gets-it-wrong"],
    screenshotAlt: "Rumble's Sleepy Trail: Rumble at 0 on a trail to Big Tree at 1, split into two equal parts, with the puzzle “Find 1/2 of the trail!” and a Nap here button.",
  },
  "balance-island": {
    id: "balance-island",
    subject: "math",
    critter: "bobbo",
    helper: "Rumble",
    updated: "2026-11-18",
    title: "Balance Scale Island: an equations (pre-algebra) game for ages 11–13",
    description: "A pre-algebra game for ages 11–13. Students solve equations on a balance scale by doing the same to both sides, from x + 3 = 7 to unknowns on both sides.",
    oneLine: "Work out what Bobbo's sealed mystery bags weigh by keeping the market scale balanced.",
    story: "Rain has washed the labels off the sealed bags at Bobbo's night-market weighing stall, and nobody may open them. Rumble, the careful measurer, knows that a level scale never lies. Each bag your child weighs gets its label back, and a finished round earns the Balance Keeper badge.",
    howToPlay: [
      "Mystery bags stand for x. The scale shows the equation, for example two bags and 3 kg on one pan and 11 kg on the other.",
      "Take weights or bags off a pan, by dragging, tapping or with the keyboard. The beam tips if the pans no longer match.",
      "“Both sides” buttons take 1 kg or one bag off both pans at once, or split both pans into equal groups. A slate beside the scale writes each balanced step as algebra.",
      "Choose the value of x from four answers whenever you're ready. The scale is a thinking tool, not a gate.",
      "At the top level, a short written word story comes first: pick the equation that matches it, then solve.",
    ],
    levelNames: [
      "x + 3 = 7: small numbers",
      "x + q = r up to 20, bag on either side",
      "2x = r",
      "3x, 4x or 5x = r",
      "2x + q = r",
      "px + q = r, up to 40 kg",
      "Unknowns on both sides",
      "Word stories: match the equation, then solve",
    ],
    answerLabel: "x =",
    noReading: false,
    misconceptions: [
      { idea: "Doing the operation shown instead of undoing it (x + 3 = 7, so x = 10)", how: "That answer can appear among the choices, and a wrong guess is tested on the scale, so the student sees it doesn't balance." },
      { idea: "Taking the weights away but forgetting to split", how: "In two-step equations, the answer you get by stopping halfway can appear among the choices." },
      { idea: "Ignoring the bags on the other pan", how: "With unknowns on both sides, the answer that comes from forgetting them can appear among the choices." },
      { idea: "Reading 3x as 3 + x", how: "Word-story levels offer x + 3 as a wrong equation for “three bags”." },
    ],
    mistakes: "A wrong answer is never punished. After a first miss, the wrong choice greys out and the guess is tested on the scale: every bag is tagged with the guessed weight, the beam tips, and the slate shows, for example, 13 ≠ 11 if x = 5. Rumble suggests taking the same off both pans. After a second miss, the scale solves itself one balanced step at a time while the slate writes each step, and the student taps the right answer.",
    tips: [
      "Ask “What did you do to both sides?” Saying each step out loud is how equation solving becomes reliable.",
      "Encourage checking: put the answer back into the original equation. Does it balance?",
      "If your child adds instead of taking away, ask what would undo the + 3, rather than giving the rule.",
    ],
    offScreen: "Use a kitchen scale or a coat-hanger balance with paper cups. Hide some identical objects in an envelope, balance it against known weights, and work out what each hidden object weighs.",
    why: {
      text: "A study of middle school students found that those who understood the equals sign as “both sides are the same amount”, rather than “the answer comes next”, were more successful at solving equations, even after taking their maths scores into account. It was a correlational study. A balance scale makes that meaning visible: the beam stays level only when both sides are equal, and the matching equation is written beside it after every step.",
      refs: ["knuth2006", "ccss"],
    },
    guides: [],
    screenshotAlt: "Balance Scale Island: a balance scale with a mystery bag and 3 kg on one pan and 7 kg on the other, the equation x + 3 = 7 on a slate, and four answer choices.",
  },
};
