import type { RefKey } from "./references";

/**
 * Editorial descriptions of skills, subjects and age bands. Facts mirror docs/CURRICULUM.md.
 * A subject or age page is generated only when it has games in the catalog AND an entry here
 * (see src/site/routes.ts), so new pages appear automatically once their content exists.
 */

export interface Standard {
  code: string;
  text: string;
  /** "direct" = the skill practises this standard; "foundation" = builds toward it. */
  fit: "direct" | "foundation";
  /** The framework the code comes from (CCSS Mathematics or CCSS English Language Arts). */
  ref: RefKey;
}

export interface SkillInfo {
  name: string;
  /** Plain-language objective a parent understands. */
  plain: string;
  standards: readonly Standard[];
}

const CC = {
  "K.CC.B.4a": "When counting objects, say the number names in the standard order, pairing each object with one and only one number name and each number name with one and only one object.",
  "K.CC.B.4b": "Understand that the last number name said tells the number of objects counted.",
  "K.CC.B.5": "Count to answer “how many?” questions about as many as 20 things arranged in a line, a rectangular array, or a circle, or as many as 10 things in a scattered configuration; given a number from 1–20, count out that many objects.",
  "1.OA.C.5": "Relate counting to addition and subtraction (e.g., by counting on 2 to add 2).",
  "1.OA.C.6": "Add and subtract within 20, demonstrating fluency for addition and subtraction within 10. Use strategies such as counting on; making ten.",
  "2.OA.B.2": "Fluently add and subtract within 20 using mental strategies.",
  "2.MD.B.6": "Represent whole numbers as lengths from 0 on a number line diagram with equally spaced points, and represent whole-number sums and differences within 100 on a number line diagram.",
  "3.OA.A.2": "Interpret whole-number quotients of whole numbers, e.g., interpret 56 ÷ 8 as the number of objects in each share when 56 objects are partitioned equally into 8 shares.",
  "K.G.A.2": "Correctly name shapes regardless of their orientations or overall size.",
  "K.G.B.6": "Compose simple shapes to form larger shapes. For example, “Can you join these two triangles with full sides touching to make a rectangle?”",
  "1.G.A.1": "Distinguish between defining attributes (e.g., triangles are closed and three-sided) versus non-defining attributes (e.g., color, orientation, overall size); build and draw shapes to possess defining attributes.",
  MP7: "Look for and make use of structure.",
  "4.OA.C.5": "Generate a number or shape pattern that follows a given rule. Identify apparent features of the pattern that were not explicit in the rule itself.",
  "3.NF.A.2a": "Represent a fraction 1/b on a number line diagram by defining the interval from 0 to 1 as the whole and partitioning it into b equal parts. Recognize that each part has size 1/b and that the endpoint of the part based at 0 locates the number 1/b on the number line.",
  "3.NF.A.2b": "Represent a fraction a/b on a number line diagram by marking off a lengths 1/b from 0. Recognize that the resulting interval has size a/b and that its endpoint locates the number a/b on the number line.",
  "3.NF.A.3a": "Understand two fractions as equivalent (equal) if they are the same size, or the same point on a number line.",
  "3.NF.A.3b": "Recognize and generate simple equivalent fractions, e.g., 1/2 = 2/4, 4/6 = 2/3. Explain why the fractions are equivalent, e.g., by using a visual fraction model.",
  "3.NF.A.3d": "Compare two fractions with the same numerator or the same denominator by reasoning about their size. Recognize that comparisons are valid only when the two fractions refer to the same whole.",
  "3.NF.A.2": "Understand a fraction as a number on the number line; represent fractions on a number line diagram.",
  "6.EE.B.7": "Solve real-world and mathematical problems by writing and solving equations of the form x + p = q and px = q for cases in which p, q and x are all nonnegative rational numbers.",
  "7.EE.B.4a": "Solve word problems leading to equations of the form px + q = r and p(x + q) = r, where p, q, and r are specific rational numbers. Solve equations of these forms fluently.",
  "8.EE.C.7b": "Solve linear equations with rational number coefficients, including equations whose solutions require expanding expressions using the distributive property and collecting like terms.",
  "RF.K.2.A": "Recognize and produce rhyming words.",
} as const;
const std = (code: keyof typeof CC, fit: Standard["fit"] = "direct"): Standard => ({ code, text: CC[code], fit, ref: code.startsWith("RF.") ? "ccssela" : "ccss" });

export const SKILLS: Record<string, SkillInfo> = {
  "math.count.one-to-one": {
    name: "One-to-one counting",
    plain: "Touch each object exactly once while saying one number for each.",
    standards: [std("K.CC.B.4a")],
  },
  "math.count.cardinality": {
    name: "Knowing “how many”",
    plain: "Understand that the last number said when counting tells how many there are.",
    standards: [std("K.CC.B.4b"), std("K.CC.B.5")],
  },
  "math.count.subitize": {
    name: "Seeing amounts at a glance",
    plain: "Recognise 1 to 5 objects without counting, and use a ten frame to see 6 to 9.",
    standards: [std("K.CC.B.5", "foundation")],
  },
  "math.count.make-set": {
    name: "Counting out a set",
    plain: "Count out an asked-for number of objects from a bigger group, and stop at the right number.",
    standards: [std("K.CC.B.5")],
  },
  "math.add.number-line": {
    name: "Adding on a number line",
    plain: "See adding as moving forward on an evenly spaced number line: each hop is one more.",
    standards: [std("1.OA.C.5"), std("2.MD.B.6", "foundation")],
  },
  "math.add.within-20": {
    name: "Adding within 20",
    plain: "Add two numbers up to 20 by counting on from the bigger number and by making ten.",
    standards: [std("1.OA.C.5"), std("1.OA.C.6"), std("2.OA.B.2", "foundation")],
  },
  "math.div.share-equally": {
    name: "Fair sharing (early division)",
    plain: "Share a number of things equally into groups by dealing one at a time, then say how many each group gets.",
    standards: [std("3.OA.A.2", "foundation")],
  },
  "math.pattern.repeat": {
    name: "Repeating patterns",
    plain: "Find the part of a pattern that repeats (AB, AAB, ABB, ABC) and use it to say what comes next or what is missing.",
    standards: [std("MP7", "foundation")],
  },
  "math.pattern.translate": {
    name: "Copying a pattern another way",
    plain: "Show the same repeating pattern with different things, such as animals instead of parade floats.",
    standards: [std("MP7", "foundation")],
  },
  "math.pattern.grow-simple": {
    name: "Growing patterns",
    plain: "Continue a pattern that grows by one each step, and find a missing step.",
    standards: [std("4.OA.C.5", "foundation")],
  },
  "math.shape.name": {
    name: "Naming shapes",
    plain: "Name circles, triangles, squares, rectangles and hexagons in any size or turn.",
    standards: [std("K.G.A.2")],
  },
  "math.shape.attributes": {
    name: "Sides and corners",
    plain: "Sort shapes by how many sides and corners they have, not by colour or size.",
    standards: [std("1.G.A.1", "foundation")],
  },
  "math.shape.compose": {
    name: "Putting shapes together",
    plain: "Make a bigger shape from smaller ones, turning pieces to fit, and find more than one way.",
    standards: [std("K.G.B.6")],
  },
  "math.frac.unit-on-line": {
    name: "Unit fractions on a number line",
    plain: "Place a fraction such as 1/4 on a 0 to 1 number line split into equal parts.",
    standards: [std("3.NF.A.2a")],
  },
  "math.frac.on-line": {
    name: "Fractions on a number line",
    plain: "Place and name fractions such as 3/4 or 5/4 by counting equal jumps from zero, including fractions greater than one.",
    standards: [std("3.NF.A.2b")],
  },
  "math.frac.equivalent": {
    name: "Equivalent fractions",
    plain: "See that fractions such as 1/2 and 4/8 are the same point on the number line.",
    standards: [std("3.NF.A.3a"), std("3.NF.A.3b", "foundation")],
  },
  "math.frac.compare": {
    name: "Comparing fractions",
    plain: "Compare two fractions with the same top or bottom number by where they sit on the line.",
    standards: [std("3.NF.A.3d")],
  },
  "math.frac.estimate": {
    name: "Estimating fractions",
    plain: "Place a fraction on a number line with no marks, close to the right spot.",
    standards: [std("3.NF.A.2")],
  },
  "math.alg.one-step": {
    name: "One-step equations",
    plain: "Solve equations such as x + 3 = 7 and 4x = 20 by doing the same to both sides.",
    standards: [std("6.EE.B.7")],
  },
  "math.alg.two-step": {
    name: "Two-step equations",
    plain: "Solve equations such as 2x + 3 = 11 by undoing in the right order, including equations written from word stories.",
    standards: [std("7.EE.B.4a")],
  },
  "math.alg.both-sides": {
    name: "Unknowns on both sides",
    plain: "Solve equations such as 3x + 2 = x + 14 by first taking the same number of unknowns off both sides.",
    standards: [std("8.EE.C.7b", "foundation")],
  },
  "english.phon.rhyme": {
    name: "Hearing rhymes",
    plain: "Tell whether two spoken words rhyme, pick a word that rhymes, spot the one that doesn't, and build a chain of rhymes.",
    standards: [std("RF.K.2.A", "foundation")],
  },
};

export interface SubjectInfo {
  slug: string;
  name: string;
  /** Prefix of skill ids belonging to this subject. */
  skillPrefix: string;
  updated: string;
  title: string;
  description: string;
  intro: string;
  /** Said after the generated "N games today, for ages X–Y." sentence. No counts here: they come from data. */
  now: string;
  /** Honest roadmap, no dates promised. */
  next: string;
  /** A strand is shown only when a published game practises a skill starting with its `skills` prefix. */
  strands: readonly { name: string; skills: string; body: string }[];
  atHome: readonly string[];
  evidence: { text: string; refs: readonly RefKey[] };
}

export const SUBJECTS: readonly SubjectInfo[] = [
  {
    slug: "math",
    name: "Maths",
    skillPrefix: "math.",
    updated: "2026-11-18",
    title: "Maths games for kids: from counting to fractions and equations",
    description: "Story-based maths games, from counting and patterns to adding, fair sharing, fractions on a number line and solving equations. Spoken instructions, hints, no ads.",
    intro:
      "Maths is where BrainZippy started, because early number sense is one of the strongest foundations a young child can build. Every maths game asks the child to do something (count, build, move, share or balance) rather than just pick an answer from a list.",
    now: "Each one adjusts to your child round by round, and a wrong answer always leads to a hint and then a worked example.",
    next: "Planned next: comparing amounts, subtraction, telling the time, multiplication as arrays, and area and perimeter. We add a game only when it is finished and tested.",
    strands: [
      { name: "Counting and number sense", skills: "math.count.", body: "Saying one number for each object, knowing the last number tells how many, recognising small amounts instantly, and counting out a set on request. These are the ideas researchers describe as the core counting principles." },
      { name: "Shapes", skills: "math.shape.", body: "Naming shapes whatever their size or turn, sorting them by sides and corners rather than colour, and putting small shapes together to make bigger ones." },
      { name: "Patterns", skills: "math.pattern.", body: "Finding the part of a pattern that repeats, using it to say what comes next or what is missing, showing the same pattern with different things, and continuing patterns that grow." },
      { name: "Addition", skills: "math.add.", body: "First as movement on a number line (each hop is one more), then as counting on from the bigger number, then making ten to cross from single digits into the teens." },
      { name: "Early division", skills: "math.div.", body: "Sharing a pile fairly between plates by dealing one at a time, then checking that every plate has the same. Fair sharing is how many children first meet the idea behind division." },
      { name: "Fractions", skills: "math.frac.", body: "Fractions as numbers with a place on the number line: counting equal jumps from zero, going past one, seeing that 1/2 and 4/8 are the same point, comparing, and estimating on a line with no marks." },
      { name: "Equations", skills: "math.alg.", body: "Solving equations by keeping both sides balanced: from x + 3 = 7 to two-step equations, unknowns on both sides and equations written from word stories." },
    ],
    atHome: [
      "Count, share and measure real things: stairs, snacks, ingredients. A game is one way to practise, not the only one.",
      "Ask “How did you work it out?” Explaining a strategy is as valuable as getting the answer.",
      "Play board games with a straight, numbered track, and card games that involve dealing and adding.",
    ],
    evidence: {
      text: "Straight, numbered board games improved young children's number knowledge in experiments (Siegler & Ramani, 2008), and pattern knowledge in preschool was one of the stronger predictors of later maths achievement in a long-term study (Rittle-Johnson et al., 2017). BrainZippy's games follow these and other findings, but BrainZippy itself has not been tested in a study.",
      refs: ["siegler2008", "rittlejohnson2017"],
    },
  },
  {
    slug: "english",
    name: "English",
    skillPrefix: "english.",
    updated: "2026-11-18",
    title: "English games for kids: rhyming and early listening skills",
    description: "Story-based English games that start before reading, with rhyme: listening games where every word is spoken. What's covered today, what's planned and how to help.",
    intro:
      "English at BrainZippy starts before reading, with the sounds of spoken words. Hearing that words rhyme, that they split into beats and that they start with a sound is called phonological awareness. It is a listening skill, so even children who don't know any letters yet can play.",
    now: "Every word is spoken and shown as a picture, so no reading is needed, and each game adjusts to your child round by round.",
    next: "Planned next: hearing syllables and first sounds, matching letters, and then phonics games for building and spelling simple words. We add a game only when it is finished and tested, and games that need individual letter sounds wait for recordings checked by a literacy specialist.",
    strands: [
      { name: "Sounds in words", skills: "english.phon.", body: "Hearing whether two words rhyme, picking a rhyme among words that sound a bit alike, spotting the word that doesn't rhyme, and building a chain of rhymes. Rhyme comes first because children can hear it before they know any letters." },
    ],
    atHome: [
      "Read rhyming books aloud and pause before the rhyming word so your child can say it.",
      "Play with sounds at odd moments: “What rhymes with bus?” Made-up words count.",
      "Clap the beats in names and words: “Ba-na-na” has three claps.",
    ],
    evidence: {
      text: "In a long-term study, preschoolers' skill at hearing rhyme and first sounds predicted their reading and spelling years later, and practice in sorting words by sound helped most when it was combined with letters (Bradley & Bryant, 1983). Rhyme is a first step. Reading itself needs children to work with the individual sounds in words and link them to letters, which is where our planned games go next.",
      refs: ["bradley1983"],
    },
  },
];

export interface AgeBandInfo {
  slug: string;
  label: string;
  min: number;
  max: number;
  stage: string;
  updated: string;
  title: string;
  description: string;
  intro: string;
  development: readonly string[];
  howToHelp: readonly string[];
  designNotes: string;
  /** References cited in `development` (rendered as a list under the page). */
  refs: readonly RefKey[];
}

/** Bands from the product brief. A band gets a page only when a game shares ≥2 years with it (src/site/routes.ts). */
export const AGE_BANDS: readonly AgeBandInfo[] = [
  {
    slug: "3-5",
    label: "3–5",
    min: 3,
    max: 5,
    stage: "Preschool",
    updated: "2026-11-18",
    title: "Learning games for 3 to 5 year olds: counting, rhymes and patterns",
    description: "Games for preschoolers aged 3–5 with spoken instructions, big buttons and no reading: counting, rhymes, patterns and more. What children learn and how to help.",
    intro: "Between three and five, most children move from reciting numbers to really understanding what counting means, start to hear that words rhyme, and begin to spot patterns. BrainZippy's games for this age need no reading: every instruction is spoken and captioned, buttons are large, and a character shows what to do first.",
    development: [
      "Many three-year-olds can recite “one, two, three…” but cannot yet use it to find how many. Children typically learn the meaning of one, two and three in turn before the idea that counting tells you the total clicks, often around age four, with a wide normal range (Le Corre & Carey, 2007).",
      "Recognising very small amounts without counting (subitizing) grows alongside counting and helps children check their counting (Clements, 1999).",
      "Being able to give someone exactly five things is harder than counting five things that are already there, so it is worth practising both.",
      "Hearing rhyme is an early listening skill that needs no letters. In a long-term study, preschoolers' skill at hearing rhyme and first sounds predicted their reading and spelling years later (Bradley & Bryant, 1983).",
      "Pattern knowledge in the last year of preschool was one of the stronger predictors of later maths achievement in a study that followed children to age 11 (Rittle-Johnson et al., 2017). That is a link, not proof of cause.",
      "Young children often judge shapes by how much they look like a typical example, so a thin or upside-down triangle may not count as a triangle to them yet (Clements et al., 1999).",
    ],
    howToHelp: [
      "After your child counts, ask “So how many are there?” If they count again from the start, they may not yet know that the last number is the answer. That is normal; model it: “One, two, three. Three apples!”",
      "Ask for a set: “Can you give me four spoons?” and watch whether they stop at four.",
      "Use dice, dominoes and fingers so small amounts become familiar patterns.",
      "Play rhyming games in the car or the bath: “What rhymes with cat?” Silly made-up words count.",
      "Make patterns with toys or claps (clap, clap, stomp) and ask what comes next.",
    ],
    designNotes: "For this age every game opens with a demonstration, uses one instruction at a time and has large objects that are easy to touch. Every word and number is spoken, and mistakes lead to a hint and then a modelled answer, never a buzzer.",
    refs: ["lecorre2007", "clements1999", "bradley1983", "rittlejohnson2017", "clements1999shape"],
  },
  {
    slug: "6-8",
    label: "6–8",
    min: 6,
    max: 8,
    stage: "Early elementary",
    updated: "2026-11-18",
    title: "Maths games for 6 to 8 year olds: addition, sharing and fractions",
    description: "Maths games for ages 6–8: adding on a number line, making ten to add within 20, fair sharing as early division, and fractions on a number line. Ad-free, with hints.",
    intro: "From six to eight, children usually move from counting everything one by one to using strategies: counting on from the bigger number, making ten, seeing division as fair sharing, and starting to treat fractions as numbers. BrainZippy's games for this age practise those strategies inside short stories.",
    development: [
      "Children who picture numbers on an evenly spaced line tend to have better number knowledge, and playing a straight, numbered board game improved young children's number skills in experiments (Siegler & Booth, 2004; Siegler & Ramani, 2008).",
      "Counting on (8… 9, 10, 11) replaces counting all, then derived strategies such as making ten take over for sums that cross 10. US standards expect addition within 20 using these strategies in first grade (Common Core 1.OA.C.6).",
      "Many children can share fairly by dealing out one at a time long before they learn division facts. Understanding that fair shares always contain the same number develops gradually (Frydman & Bryant, 1988).",
      "Fractions are often first met as slices of a shape. A practice guide from the US Institute of Education Sciences recommends also using number lines, which show that a fraction is a number with a size (Siegler et al., 2010). US standards place fractions on the number line in third grade.",
    ],
    howToHelp: [
      "When your child adds 3 + 8, ask “Which number could you start from?” Starting from 8 is a big step.",
      "Play board games with a straight, numbered track and have your child count the spaces as they move.",
      "At snack time, ask them to share crackers fairly between plates, then ask how they know it is fair.",
      "Fold paper strips into halves and quarters and ask where one half and three quarters would go on a line from 0 to 1.",
    ],
    designNotes: "For this age the games use a visible number line, a make-ten step for sums that cross 10, fractions as spots on an evenly split trail, and a worked example after two misses. Text appears with every spoken line for children who are starting to read.",
    refs: ["siegler2004", "siegler2008", "ccss", "frydman1988", "siegler2010"],
  },
  {
    slug: "9-11",
    label: "9–11",
    min: 9,
    max: 11,
    stage: "Upper elementary",
    updated: "2026-11-18",
    title: "Maths games for 9 to 11 year olds: fractions and first equations",
    description: "Maths for ages 9–11: fractions as numbers on a number line, equivalent fractions, comparing and estimating, and first steps toward solving equations.",
    intro: "From nine to eleven, children are expected to treat fractions as numbers in their own right and to start thinking algebraically: seeing an equation as a balance rather than a sum to finish. BrainZippy's games for this age keep the same story style with more challenging puzzles and less hand-holding.",
    development: [
      "Fractions are hard partly because whole-number habits get in the way: children may think 1/8 is bigger than 1/6 because 8 is bigger than 6. Number lines help children see fractions as sizes (Siegler et al., 2010).",
      "Equivalent fractions such as 1/2 and 4/8 are easier to understand as the same point on a number line than as a rule about multiplying top and bottom.",
      "Students who understand the equals sign as “both sides are the same amount” do better at solving equations, in a correlational study with middle school students (Knuth et al., 2006). Questions like 8 + 4 = ? + 5 help build that meaning early.",
    ],
    howToHelp: [
      "Ask which is bigger, 3/8 or 3/6, and how they know. “More parts means smaller parts” is the key idea.",
      "Try missing-number puzzles with the gap on either side: 7 + ? = 12, or 15 = ? + 9.",
      "When your child explains a strategy, ask them to check it a second way.",
    ],
    designNotes: "For this age puzzles include estimation on unmarked number lines and step-by-step written equations beside the visuals. Hints are matched to the likely mistake, and every spoken line is captioned.",
    refs: ["siegler2010", "knuth2006"],
  },
  {
    slug: "12-14",
    label: "12–14",
    min: 12,
    max: 14,
    stage: "Middle school",
    updated: "2026-11-18",
    title: "Maths games for 12 to 14 year olds: solving equations",
    description: "Pre-algebra for ages 12–14: solving one- and two-step equations and unknowns on both sides by keeping both sides balanced, with hints and worked steps.",
    intro: "From twelve to fourteen, students move from arithmetic to algebra. The big idea is that an equation is a balance: whatever you do to one side, you must do to the other. BrainZippy's game for this age makes that rule something students can see, then writes every step as algebra.",
    development: [
      "Students who understand the equals sign as meaning “both sides are the same amount”, rather than “the answer comes next”, were more successful at solving equations, even after taking their maths scores into account. It was a correlational study with middle school students (Knuth et al., 2006).",
      "Common slips include doing the operation shown instead of its inverse (adding 3 to solve x + 3 = 7), undoing steps in the wrong order, and reading 3x as 3 + x.",
      "Worked examples help learners who are new to a type of problem, and the benefit fades as they gain expertise, so support should step back as skill grows (Sweller, van Merriënboer & Paas, 2019).",
      "US standards expect one-step equations in grade 6, two-step equations from word problems in grade 7, and unknowns on both sides in grade 8 (Common Core 6.EE.B.7, 7.EE.B.4a, 8.EE.C.7).",
    ],
    howToHelp: [
      "Ask “What did you do to both sides?” Saying each step out loud makes equation solving reliable.",
      "Encourage checking by putting the answer back into the original equation.",
      "Turn everyday situations into equations: “Three equal bags and 2 kg weigh 14 kg. What's in one bag?”",
    ],
    designNotes: "For this age the game pairs a balance scale with the written equation, tests a wrong guess on the scale instead of just marking it wrong, and shows a full balanced solution after a second miss. There are no timers.",
    refs: ["knuth2006", "sweller2019", "ccss"],
  },
];
