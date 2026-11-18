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
}

export interface SkillInfo {
  id: string;
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
} as const;
const std = (code: keyof typeof CC, fit: Standard["fit"] = "direct"): Standard => ({ code, text: CC[code], fit });

export const SKILLS: Record<string, SkillInfo> = {
  "math.count.one-to-one": {
    id: "math.count.one-to-one",
    name: "One-to-one counting",
    plain: "Touch each object exactly once while saying one number for each.",
    standards: [std("K.CC.B.4a")],
  },
  "math.count.cardinality": {
    id: "math.count.cardinality",
    name: "Knowing “how many”",
    plain: "Understand that the last number said when counting tells how many there are.",
    standards: [std("K.CC.B.4b"), std("K.CC.B.5")],
  },
  "math.count.subitize": {
    id: "math.count.subitize",
    name: "Seeing amounts at a glance",
    plain: "Recognise 1 to 5 objects without counting, and use a ten frame to see 6 to 9.",
    standards: [std("K.CC.B.5", "foundation")],
  },
  "math.count.make-set": {
    id: "math.count.make-set",
    name: "Counting out a set",
    plain: "Count out an asked-for number of objects from a bigger group, and stop at the right number.",
    standards: [std("K.CC.B.5")],
  },
  "math.add.number-line": {
    id: "math.add.number-line",
    name: "Adding on a number line",
    plain: "See adding as moving forward on an evenly spaced number line: each hop is one more.",
    standards: [std("1.OA.C.5"), std("2.MD.B.6", "foundation")],
  },
  "math.add.within-20": {
    id: "math.add.within-20",
    name: "Adding within 20",
    plain: "Add two numbers up to 20 by counting on from the bigger number and by making ten.",
    standards: [std("1.OA.C.5"), std("1.OA.C.6"), std("2.OA.B.2", "foundation")],
  },
  "math.div.share-equally": {
    id: "math.div.share-equally",
    name: "Fair sharing (early division)",
    plain: "Share a number of things equally into groups by dealing one at a time, then say how many each group gets.",
    standards: [std("3.OA.A.2", "foundation")],
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
  /** What the subject area covers now and next (honest roadmap, no dates promised). */
  now: string;
  next: string;
  strands: readonly { name: string; body: string }[];
}

export const SUBJECTS: readonly SubjectInfo[] = [
  {
    slug: "math",
    name: "Maths",
    skillPrefix: "math.",
    updated: "2026-11-17",
    title: "Maths games for kids: counting, addition and sharing",
    description: "Story-based maths games for ages 4–9: counting objects, seeing amounts at a glance, adding on a number line, making ten and fair sharing. No ads.",
    intro:
      "Maths is where BrainZippy starts, because early number sense is one of the strongest foundations a young child can build. Every maths game asks the child to do something with numbers (count, move, add or share) rather than just pick an answer from a list.",
    now: "Four games today, covering counting to 10, addition within 20 and the beginnings of division. Each has four levels and adjusts to your child round by round.",
    next: "Planned next: comparing amounts (more and fewer), matching numerals to quantities, and subtraction. We add a game only when it is finished and tested.",
    strands: [
      { name: "Counting and number sense", body: "Saying one number for each object, knowing the last number tells how many, recognising small amounts instantly, and counting out a set on request. These are the ideas researchers describe as the core counting principles." },
      { name: "Addition", body: "First as movement on a number line (each hop is one more), then as counting on from the bigger number, then making ten to cross from single digits into the teens." },
      { name: "Early division", body: "Sharing a pile fairly between plates by dealing one at a time, then checking that every plate has the same. Fair sharing is how many children first meet the idea behind division." },
    ],
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

/** Bands from the product brief. 9–11 and 12–14 have no entry yet, so no page is generated for them. */
export const AGE_BANDS: readonly AgeBandInfo[] = [
  {
    slug: "3-5",
    label: "3–5",
    min: 3,
    max: 5,
    stage: "Preschool",
    updated: "2026-11-17",
    title: "Learning games for 3 to 5 year olds: early counting",
    description: "Counting games for preschoolers aged 3–5, with spoken instructions, big buttons and no reading required. What children this age are learning and how to help.",
    intro: "Between three and five, most children move from reciting numbers to really understanding what counting means. BrainZippy's games for this age need no reading: every instruction is spoken and captioned, buttons are large, and a character shows what to do first.",
    development: [
      "Many three-year-olds can recite “one, two, three…” but cannot yet use it to find how many. Children typically learn the meaning of one, two and three in turn before the idea that counting tells you the total clicks, often around age four, with a wide normal range (Le Corre & Carey, 2007).",
      "Recognising very small amounts without counting (subitizing) grows alongside counting and helps children check their counting (Clements, 1999).",
      "Being able to give someone exactly five things is harder than counting five things that are already there, so it is worth practising both.",
    ],
    howToHelp: [
      "After your child counts, ask “So how many are there?” If they count again from the start, they may not yet know that the last number is the answer. That is normal; model it: “One, two, three. Three apples!”",
      "Ask for a set: “Can you give me four spoons?” and watch whether they stop at four.",
      "Use dice, dominoes and fingers so small amounts become familiar patterns.",
    ],
    designNotes: "For this age every game opens with a demonstration, uses one instruction at a time and accepts touch anywhere on large objects. Mistakes lead to a count-along, never a buzzer.",
    refs: ["lecorre2007", "clements1999"],
  },
  {
    slug: "6-8",
    label: "6–8",
    min: 6,
    max: 8,
    stage: "Early elementary",
    updated: "2026-11-17",
    title: "Maths games for 6 to 8 year olds: addition, number lines and sharing",
    description: "Maths games for ages 6–8: adding on a number line, counting on, making ten to add within 20, and fair sharing as the start of division. Ad-free, with hints.",
    intro: "From six to eight, children usually move from counting everything one by one to using strategies: counting on from the bigger number, making ten, and seeing division as fair sharing. BrainZippy's games for this age practise those strategies inside short stories.",
    development: [
      "Children who picture numbers on an evenly spaced line tend to have better number knowledge, and playing a straight, numbered board game improved young children's number skills in experiments (Siegler & Booth, 2004; Siegler & Ramani, 2008).",
      "Counting on (8… 9, 10, 11) replaces counting all, then derived strategies such as making ten take over for sums that cross 10. US standards expect addition within 20 using these strategies in first grade (Common Core 1.OA.C.6).",
      "Many children can share fairly by dealing out one at a time long before they learn division facts. Understanding that fair shares always contain the same number develops gradually (Frydman & Bryant, 1988).",
    ],
    howToHelp: [
      "When your child adds 3 + 8, ask “Which number could you start from?” Starting from 8 is a big step.",
      "Play board games with a straight, numbered track and have your child count the spaces as they move.",
      "At snack time, ask them to share crackers fairly between plates, then ask how they know it is fair.",
    ],
    designNotes: "For this age the games use a visible number line, a make-ten step for sums that cross 10, and a worked example after two misses. Text appears with every spoken line for children who are starting to read.",
    refs: ["siegler2004", "siegler2008", "ccss", "frydman1988"],
  },
];
