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
  /** The framework the code comes from (CCSS, CSTA, NGSS, NSPFE, National Geography Standards, CASEL, FAA, CISA/FTC). */
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
  "RF.K.2.E": "Add or substitute individual sounds (phonemes) in simple, one-syllable words to make new words.",
  "RF.1.3.B": "Decode regularly spelled one-syllable words.",
  "RF.1.3.A": "Know the spelling-sound correspondences for common consonant digraphs.",
  "RF.1.2.B": "Orally produce single-syllable words by blending sounds (phonemes), including consonant blends.",
  "RF.1.3.C": "Know final -e and common vowel team conventions for representing long vowel sounds.",
  "RF.2.3.B": "Know spelling-sound correspondences for additional common vowel teams.",
  "RF.1.3.E": "Decode two-syllable words following basic patterns by breaking the words into syllables.",
  "RF.1.4.A": "Read grade-level text with purpose and understanding.",
  "RF.1.1.A": "Recognize the distinguishing features of a sentence (e.g., first word, capitalization, ending punctuation).",
  "2.MD.C.8": "Solve word problems involving dollar bills, quarters, dimes, nickels, and pennies, using $ and ¢ symbols appropriately.",
} as const;

/**
 * Codes and named areas from the other libraries' frameworks (docs/curriculum/README.md §5 and each docs/worlds/<id>.md).
 * Where a framework has published wording (CSTA 2017, NGSS, National Geography Standards) the text is that wording; where it
 * has no codes (NSPFE benchmarks not yet checked by an educator, CASEL, FAA handbook chapters, CISA/FTC guidance) the text says
 * what the label refers to. Our own mapping: "aligned with", never certified or endorsed.
 */
const OTHER = {
  "1A-AP-08": { ref: "csta2017", text: "Model daily processes by creating and following algorithms (sets of step-by-step instructions) to complete tasks." },
  "1A-AP-10": { ref: "csta2017", text: "Develop programs with sequences and simple loops, to express ideas or address a problem." },
  "1A-AP-11": { ref: "csta2017", text: "Decompose (break down) the steps needed to solve a problem into a precise sequence of instructions." },
  "1A-AP-14": { ref: "csta2017", text: "Debug (identify and fix) errors in an algorithm or program that includes sequences and simple loops." },
  "1B-AP-15": { ref: "csta2017", text: "Test and debug (identify and fix) errors in a program or algorithm to ensure it runs as intended." },
  "2-NI-05": { ref: "csta2017", text: "Explain how physical and digital security measures protect electronic information." },
  "K-ESS3-1": { ref: "ngss2013", text: "Use a model to represent the relationship between the needs of different plants or animals (including humans) and the places they live." },
  "3-PS2-1": { ref: "ngss2013", text: "Plan and conduct an investigation to provide evidence of the effects of balanced and unbalanced forces on the motion of an object." },
  "5-PS2-1": { ref: "ngss2013", text: "Support an argument that the gravitational force exerted by Earth on objects is directed down." },
  "5-LS2-1": { ref: "ngss2013", text: "Develop a model to describe the movement of matter among plants, animals, decomposers, and the environment." },
  "MS-PS2-2": { ref: "ngss2013", text: "Plan an investigation to provide evidence that the change in an object's motion depends on the sum of the forces on the object and the mass of the object." },
  "MS-LS2-1": { ref: "ngss2013", text: "Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations of organisms in an ecosystem." },
  "MS-LS2-2": { ref: "ngss2013", text: "Construct an explanation that predicts patterns of interactions among organisms across multiple ecosystems." },
  "MS-LS2-4": { ref: "ngss2013", text: "Construct an argument supported by empirical evidence that changes to physical or biological components of an ecosystem affect populations." },
  "MS-LS2-5": { ref: "ngss2013", text: "Evaluate competing design solutions for maintaining biodiversity and ecosystem services." },
  "MS-ESS3-3": { ref: "ngss2013", text: "Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment." },
  "MS-ESS3-5": { ref: "ngss2013", text: "Ask questions to clarify evidence of the factors that have caused the rise in global temperatures over the past century." },
  "3-5-ETS1-1": { ref: "ngss2013", text: "Define a simple design problem reflecting a need or a want that includes specified criteria for success and constraints on materials, time, or cost." },
  "3-5-ETS1-2": { ref: "ngss2013", text: "Generate and compare multiple possible solutions to a problem based on how well each is likely to meet the criteria and constraints of the problem." },
  "3-5-ETS1-3": { ref: "ngss2013", text: "Plan and carry out fair tests in which variables are controlled and failure points are considered to identify aspects of a model or prototype that can be improved." },
  "MS-ETS1-1": { ref: "ngss2013", text: "Define the criteria and constraints of a design problem with sufficient precision to ensure a successful solution, taking into account relevant scientific principles and potential impacts on people and the natural environment that may limit possible solutions." },
  "MS-ETS1-3": { ref: "ngss2013", text: "Analyze data from tests to determine similarities and differences among several design solutions to identify the best characteristics of each that can be combined into a new solution to better meet the criteria for success." },
  "MS-ETS1-4": { ref: "ngss2013", text: "Develop a model to generate data for iterative testing and modification of a proposed object, tool, or process such that an optimal design can be achieved." },
  "NSPFE Spending, gr. 4": { ref: "nspfe2021", text: "National Standards for Personal Financial Education, Spending standard, grade 4 benchmarks (benchmark numbers are added after an educator check)." },
  "NSPFE Earning Income, gr. 4–8": { ref: "nspfe2021", text: "National Standards for Personal Financial Education, Earning Income standard, grade 4 and grade 8 benchmarks." },
  "NSPFE Earning Income, gr. 8": { ref: "nspfe2021", text: "National Standards for Personal Financial Education, Earning Income standard, grade 8 benchmarks (a stretch for the oldest players)." },
  "NGS 1": { ref: "ncge2012", text: "How to use maps and other geographic representations, geospatial technologies, and spatial thinking to understand and communicate information." },
  "NGS 4": { ref: "ncge2012", text: "The physical and human characteristics of places." },
  "NGS 7": { ref: "ncge2012", text: "The physical processes that shape the patterns of Earth's surface." },
  "CASEL self-awareness": { ref: "casel", text: "CASEL competency: understanding your own emotions and how they influence what you do. CASEL is a framework, not a coded standard." },
  "CASEL social awareness": { ref: "casel", text: "CASEL competency: understanding the perspectives of others and empathising with them. CASEL is a framework, not a coded standard." },
  "CASEL self-management": { ref: "casel", text: "CASEL competency: managing your emotions and behaviour in different situations. CASEL is a framework, not a coded standard." },
  "PHAK Flight Controls": { ref: "faa2023", text: "The Flight Controls chapter of the FAA Pilot's Handbook of Aeronautical Knowledge. Educational only: not flight training." },
  "PHAK Aerodynamics of Flight": { ref: "faa2023", text: "The Aerodynamics of Flight chapter of the FAA Pilot's Handbook of Aeronautical Knowledge (forces in flight and in turns). Educational only: not flight training." },
  "CISA phishing": { ref: "cisa2024", text: "CISA Secure Our World guidance: recognize and report phishing." },
  "FTC phishing": { ref: "ftc2025", text: "FTC consumer guidance on spotting and avoiding phishing scams." },
} as const satisfies Record<string, { ref: RefKey; text: string }>;

function std(code: keyof typeof CC | keyof typeof OTHER, fit: Standard["fit"] = "direct"): Standard {
  if (code in OTHER) {
    const o = OTHER[code as keyof typeof OTHER];
    return { code, text: o.text, fit, ref: o.ref };
  }
  return { code, text: CC[code as keyof typeof CC], fit, ref: code.startsWith("RF.") ? "ccssela" : "ccss" };
}

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
  // Paper Boat Post (English path, ages 6–8)
  "english.phonics.onset-rime": { name: "Word families", plain: "Change the first letter of a word-family word to make a new word, such as cat to hat.", standards: [std("RF.K.2.E", "foundation")] },
  "english.phonics.cvc": { name: "Short-vowel words", plain: "Read and spell three-letter words such as cap and bug, and tell them apart from words one letter away.", standards: [std("RF.1.3.B")] },
  "english.phonics.digraph": { name: "Digraphs (sh, ch, th, ck)", plain: "Read and spell words where two letters make one sound, such as ship, chin and duck.", standards: [std("RF.1.3.A")] },
  "english.phonics.blend": { name: "Consonant blends", plain: "Read and spell words that start or end with two consonant sounds, such as frog and nest.", standards: [std("RF.1.3.B"), std("RF.1.2.B", "foundation")] },
  "english.phonics.magic-e": { name: "Final -e", plain: "Read words with a quiet e at the end and tell them from their short-vowel partner, such as cap and cape.", standards: [std("RF.1.3.C")] },
  "english.phonics.vowel-team": { name: "Vowel teams", plain: "Read and sort words spelled with ai, ay, ee, ea and oa, such as rain, tray, sheep, leaf and boat.", standards: [std("RF.1.3.C"), std("RF.2.3.B")] },
  "english.phonics.multisyllable": { name: "Longer words", plain: "Read two-syllable words and plurals, and build compound words such as raincoat from two smaller words.", standards: [std("RF.1.3.E")] },
  "english.read.sentence": { name: "Reading a sentence", plain: "Read a short sentence such as “The hen is in the box.” and choose the picture it describes.", standards: [std("RF.1.4.A")] },
  "english.sentence.build": { name: "Building a sentence", plain: "Put word cards in order to make a sentence with a capital letter at the start and an end mark.", standards: [std("RF.1.1.A")] },

  // Computer science (Toggle's Garden Path)
  "cs.seq.build": { name: "Building a sequence", plain: "Put step-by-step move instructions in order so a character reaches a goal.", standards: [std("1A-AP-10"), std("1A-AP-08", "foundation")] },
  "cs.seq.decompose": { name: "Breaking a goal into parts", plain: "Split a bigger goal into smaller parts (reach the berry first, then go home) and plan each part in order.", standards: [std("1A-AP-11")] },
  "cs.debug.sequence": { name: "Finding the first wrong step", plain: "Run a program, find the first step that goes wrong and fix just that step.", standards: [std("1A-AP-14")] },
  "cs.loop.repeat": { name: "Using a repeat (loop)", plain: "Use a repeat card to run a step, or a pair of steps, several times instead of writing them out again.", standards: [std("1A-AP-10")] },
  "cs.loop.debug": { name: "Fixing a repeat", plain: "Fix a repeat that runs the wrong number of times or repeats the wrong step.", standards: [std("1A-AP-14"), std("1B-AP-15", "foundation")] },

  // Money (Budge's Lemonade Stand)
  "money.coins.pay": { name: "Paying with coins", plain: "Pay an exact amount with US pennies, nickels, dimes, quarters and a dollar, by counting the value, not the number of coins.", standards: [std("2.MD.C.8"), std("NSPFE Spending, gr. 4", "foundation")] },
  "money.coins.change": { name: "Making change", plain: "Give change from a dollar by counting up from the price.", standards: [std("2.MD.C.8"), std("NSPFE Spending, gr. 4", "foundation")] },
  "money.biz.profit": { name: "Cost, revenue and profit", plain: "Add up what supplies cost, work out the money that came in, and find the profit (or loss) by taking one from the other.", standards: [std("NSPFE Earning Income, gr. 4–8")] },
  "money.biz.pricing": { name: "Choosing a price", plain: "Use a simple survey to see that a higher price sells fewer cups, and pick the price that makes the most profit.", standards: [std("NSPFE Earning Income, gr. 8", "foundation")] },

  // Science (Dabble's Rocket Lab)
  "sci.force.balanced": { name: "Balanced and unbalanced forces", plain: "Predict that a rocket lifts off only when the push up is bigger than the pull down, and that equal forces mean no change in motion.", standards: [std("3-PS2-1")] },
  "sci.force.weight-mass": { name: "Weight and mass", plain: "Work out weight as mass × gravity strength, and know that mass stays the same on the Moon while weight changes.", standards: [std("5-PS2-1", "foundation"), std("MS-PS2-2", "foundation")] },
  "sci.force.net": { name: "Net force and acceleration", plain: "Find the net force (thrust minus weight) and compare how quickly rockets speed up when force or mass changes.", standards: [std("MS-PS2-2")] },

  // Digital safety (Fenn's Message Mystery)
  "cyber.scam.clues": { name: "Spotting trick-message clues", plain: "Spot clues that a message is a trick: it asks for a secret, offers a prize that's too good to be true, rushes you, says don't tell, wants a gift card, or its sender or link doesn't match.", standards: [std("CISA phishing"), std("FTC phishing")] },
  "cyber.scam.action": { name: "Choosing a safe action", plain: "Choose a safe response to a trick message: don't tap or reply, and show a trusted grown-up.", standards: [std("CISA phishing"), std("FTC phishing")] },
  "cyber.scam.verify": { name: "Checking another way", plain: "Check a surprising message another way, with a grown-up, instead of replying to it.", standards: [std("FTC phishing"), std("2-NI-05", "foundation")] },

  // Engineering (Brix's Budget Bridge)
  "engr.struct.span-load": { name: "Spans, supports and loads", plain: "Trade off span length, material, supports and cost so a bridge carries its load: shorter spans carry more.", standards: [std("3-5-ETS1-1"), std("MS-ETS1-1", "foundation")] },
  "engr.struct.triangle": { name: "Triangles make it strong", plain: "Use triangle braces across a whole span to make it stronger for less money.", standards: [std("3-5-ETS1-2")] },
  "engr.design.criteria": { name: "Criteria and constraints", plain: "Meet a goal (hold the bus) inside the limits (the budget, and pillars only on solid ground), and see that more than one design can work.", standards: [std("3-5-ETS1-1"), std("3-5-ETS1-2")] },
  "engr.design.iterate": { name: "Test and improve", plain: "Use a test result to find the weak part of a design and improve only that part.", standards: [std("3-5-ETS1-3"), std("MS-ETS1-3", "foundation"), std("MS-ETS1-4", "foundation")] },

  // Pilot ground school (Zephy's Sky Hoops)
  "pilot.controls.axes": { name: "Pitch, roll and yaw", plain: "Move the stick or a rudder pedal to pitch the nose, roll the wings or yaw the nose, and name the part that moves (elevator, ailerons, rudder).", standards: [std("PHAK Flight Controls")] },
  "pilot.controls.turn": { name: "Turning by banking", plain: "Know that a plane turns by tipping (banking) its wings, not with the rudder alone, and plan a short course of moves.", standards: [std("PHAK Flight Controls"), std("PHAK Aerodynamics of Flight")] },
  "pilot.flight.four-forces": { name: "The four forces", plain: "Name lift, weight, thrust and drag and their directions, and know they balance in steady, level flight.", standards: [std("PHAK Aerodynamics of Flight"), std("3-PS2-1", "foundation")] },

  // Nature and oceans (Ripple's Reef Rescue)
  "nature.habitat.needs": { name: "What living things need", plain: "Match reef animals and plants to the food and places that meet their needs, such as light and the right ground.", standards: [std("K-ESS3-1", "foundation")] },
  "nature.web.chain": { name: "Food chains", plain: "Build a food chain that starts with the sun, with arrows that mean “gives energy to”.", standards: [std("5-LS2-1")] },
  "nature.reef.coral": { name: "Corals and their partners", plain: "Explain that coral is an animal, that tiny algae living inside it make food and give it colour, and that the coral gives them a home.", standards: [std("MS-LS2-2", "foundation"), std("5-LS2-1", "foundation")] },
  "nature.reef.bleaching": { name: "Coral bleaching", plain: "Explain that water that stays too warm makes corals push out their algae and turn white, that bleached coral is weak but can recover, and read a simple temperature chart.", standards: [std("MS-LS2-4", "foundation"), std("MS-ESS3-5", "foundation")] },
  "nature.reef.restore": { name: "Helping reefs recover", plain: "Sort actions that help or harm a reef, and choose where new coral can grow (light, clean water, a steady base).", standards: [std("MS-LS2-5", "foundation"), std("MS-ESS3-3", "foundation")] },
  "nature.web.change": { name: "Changes ripple through a food web", plain: "Predict that losing algae-eating fish lets algae smother coral, and that bringing them back helps.", standards: [std("MS-LS2-1", "foundation"), std("MS-LS2-4", "foundation")] },

  // Geography (Yonder's Postcard Trip)
  "geo.map.directions": { name: "Compass directions", plain: "Use north, east, south and west with a compass rose, from one step on a map to directions between continents.", standards: [std("NGS 1")] },
  "geo.map.key": { name: "Map keys", plain: "Use a map key to find a symbol on a map, even when another symbol looks similar.", standards: [std("NGS 1")] },
  "geo.map.grid": { name: "Grid references", plain: "Give the grid reference of a place on a map: column letter first, then row number.", standards: [std("NGS 1")] },
  "geo.world.continents": { name: "The seven continents", plain: "Find the seven continents on a world map, and know that a country sits inside a continent (Kenya, in Africa).", standards: [std("NGS 1"), std("NGS 4")] },
  "geo.world.oceans": { name: "The five oceans", plain: "Find the five oceans on a world map, including the Arctic and Southern oceans, and name the ocean beside a continent.", standards: [std("NGS 1"), std("NGS 7", "foundation")] },
  "geo.world.equator": { name: "The equator and hemispheres", plain: "Tell whether a place is north or south of the equator, and know that seasons are opposite in the two halves of the world.", standards: [std("NGS 1"), std("NGS 7", "foundation")] },

  // Social and emotional skills (Snug's Feelings Garden)
  "sel.feel.basic": { name: "Naming feelings", plain: "Name happy, sad, angry, scared and surprised from a face and what happened, then from what happened alone, where several feelings can fit.", standards: [std("CASEL self-awareness"), std("CASEL social awareness")] },
  "sel.feel.body": { name: "Body clues", plain: "Notice how bodies show feelings, such as tight fists, hugged knees, jumping or hidden eyes.", standards: [std("CASEL self-awareness")] },
  "sel.kind.notice": { name: "Kind ideas", plain: "Choose a kind idea that could help a friend who feels sad or scared.", standards: [std("CASEL social awareness")] },
  "sel.calm.strategy": { name: "Calm ideas", plain: "Choose a calm, safe idea for a big angry feeling, such as slow breaths, counting to five or asking for a break.", standards: [std("CASEL self-management")] },
  "sel.feel.more": { name: "More feeling words", plain: "Name finer feelings such as frustrated, proud, nervous, excited, disappointed and lonely, including two feelings at once.", standards: [std("CASEL self-awareness")] },
  "sel.persp.two-sides": { name: "Seeing two sides", plain: "Notice that two friends can feel differently about the same thing.", standards: [std("CASEL social awareness")] },
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
  /** What children learn at each age: what the published games cover ("now") and what the library plans ("planned"). */
  byAge?: readonly { ages: string; status: "now" | "planned"; body: string }[];
}

export const SUBJECTS: readonly SubjectInfo[] = [
  {
    slug: "math",
    name: "Maths",
    skillPrefix: "math.",
    updated: "2026-11-22",
    title: "Maths games for kids: from counting to fractions and equations",
    description: "Story-based maths games, from counting and patterns to adding, fair sharing, fractions on a number line and solving equations. Spoken instructions, hints, no ads.",
    intro:
      "Maths is where BrainZippy started, because early number sense is one of the strongest foundations a young child can build. Every maths game asks the child to do something (count, build, move, share or balance) rather than just pick an answer from a list.",
    now: "Each one adjusts to your child round by round, and a wrong answer always leads to a hint and then a worked example.",
    next: "Planned next: comparing amounts, subtraction, telling the time, multiplication as arrays, and area and perimeter. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "4–6", status: "now", body: "Counting and knowing how many, seeing small amounts at a glance, repeating and growing patterns, and naming and sorting shapes." },
      { ages: "5–8", status: "now", body: "Adding by hopping along a number line, then adding within 20 by counting on and making ten." },
      { ages: "7–9", status: "now", body: "Fair sharing as the first step toward division, and fractions as numbers on a number line." },
      { ages: "11–13", status: "now", body: "Solving equations by keeping both sides balanced, from x + 3 = 7 to unknowns on both sides." },
      { ages: "5–11", status: "planned", body: "Comparing amounts, subtraction, telling the time, multiplication as arrays, and area and perimeter." },
    ],
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
    updated: "2026-11-22",
    title: "English games for kids: rhyming and early listening skills",
    description: "Story-based English games that start before reading, with rhyme: listening games where every word is spoken. What's covered today, what's planned and how to help.",
    intro:
      "English at BrainZippy starts before reading, with the sounds of spoken words. Hearing that words rhyme, that they split into beats and that they start with a sound is called phonological awareness. It is a listening skill, so even children who don't know any letters yet can play.",
    now: "Every word is spoken and shown as a picture, so no reading is needed, and each game adjusts to your child round by round.",
    next: "Planned next: hearing syllables and first sounds, matching letters, and then phonics games for building and spelling simple words. We add a game only when it is finished and tested, and games that need individual letter sounds wait for recordings checked by a literacy specialist.",
    byAge: [
      { ages: "3–5", status: "now", body: "Hearing rhymes: whether two words rhyme, picking a rhyme, spotting the odd one out and building rhyme chains." },
      { ages: "3–6", status: "planned", body: "Hearing syllables and first sounds, and matching letters." },
      { ages: "5–8", status: "planned", body: "Phonics: building, reading and spelling simple words." },
    ],
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
  {
    slug: "cs",
    name: "Computer science",
    skillPrefix: "cs.",
    updated: "2026-11-22",
    title: "Computer science games for kids: sequences, debugging and loops",
    description: "Coding games with no typing: children build step-by-step programs from arrow cards, find and fix the first wrong step, and shorten programs with repeat loops.",
    intro:
      "Computer science at BrainZippy starts unplugged-style: no typing, no real devices and nothing online. Children give Toggle, a caterpillar made of command blocks, precise step-by-step instructions, watch them run one step at a time, and fix what goes wrong. That is the heart of programming: an algorithm is an ordered list of steps, and a program is that list written so a machine can follow it.",
    now: "Any program that works is accepted, not just one answer, and a miss replays the run and stops at the first step that went wrong.",
    next: "Planned next: ordering everyday algorithms for younger children, conditions (if this, then that), how numbers and symbols can stand for pictures, and later visual programming and the basic ideas behind AI. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "5–7", status: "now", body: "Building a sequence of moves, breaking a goal into two parts, and finding and fixing the first wrong step." },
      { ages: "8–10", status: "now", body: "Repeat loops, including a repeated pair of moves, and fixing a repeat that runs the wrong number of times. These are the top levels of the same game, so younger players reach them as they progress." },
      { ages: "8–10", status: "planned", body: "Conditions and events, testing programs, and representing pictures as data, in new games." },
      { ages: "11–14", status: "planned", body: "Variables, visual programming and game making, and how AI learns patterns from examples and why it can be wrong." },
    ],
    strands: [
      { name: "Sequences", skills: "cs.seq.", body: "Building a program from arrow cards that gets Toggle to a goal, then breaking a bigger goal into parts: reach the berry first, then plan the way home. Children trace every run by watching the numbered footprints Toggle leaves." },
      { name: "Debugging", skills: "cs.debug.", body: "Running a program that doesn't work, finding the first step that goes wrong and fixing just that step, instead of starting again from scratch." },
      { name: "Loops", skills: "cs.loop.", body: "Using a repeat card to run a move, or a pair of moves, several times, and fixing a repeat with the wrong count or the wrong step inside it." },
    ],
    atHome: [
      "Play “robot”: your child gives you one instruction at a time (two steps forward, turn right) to reach the kitchen, and you follow them exactly, even when they're wrong.",
      "When something goes wrong, ask “Which step went wrong first?” rather than starting over.",
      "Spot repeats in everyday routines: “stir, stir, stir” is “stir 3 times”.",
    ],
    evidence: {
      text: "In a study of kindergarten classrooms using a robotics curriculum, children aged about five and six learned to build and fix simple programs of ordered instructions (Bers et al., 2014). It was a small classroom study, not a controlled trial. Our skills are aligned with the CSTA K-12 Computer Science Standards (CSTA, 2017). The design is built on this work, but BrainZippy itself has not been tested in a study.",
      refs: ["bers2014", "csta2017"],
    },
  },
  {
    slug: "money",
    name: "Money",
    skillPrefix: "money.",
    updated: "2026-11-22",
    title: "Money games for kids: coins, change and running a lemonade stand",
    description: "Money games with play coins only: pay exact amounts, give change by counting up, and work out cost, revenue and profit at Budge's lemonade stand.",
    intro:
      "The money library teaches how money works, using US coins and a pretend business. Children count coins by value, give change, and run Budge's beach lemonade stand: what the supplies cost, the money that comes in, and what is left to save. Everything is play money. There are no real purchases, brands, banks, apps or product recommendations, and game coins can't be spent on anything.",
    now: "Coins can be paid in any combination that adds up, and a miss shows how far off the total is before a worked example.",
    next: "Planned next: needs and wants, saving goals, budgets and comparing prices, then simple interest, borrowing, and risk and insurance as ideas for older children. Investing will be taught as concepts only, never with real companies, funds or apps. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "7–9", status: "now", body: "US coins and the dollar by value, paying exact amounts, and giving change from a dollar by counting up." },
      { ages: "8–11", status: "now", body: "Cost, revenue and profit, including a rainy day that ends in a loss. Choosing a price from a survey is a stretch level for 10-year-olds." },
      { ages: "7–10", status: "planned", body: "Needs and wants, and saving towards a goal." },
      { ages: "9–14", status: "planned", body: "Budgets and comparing prices, then interest, borrowing, and risk and insurance as concepts." },
    ],
    strands: [
      { name: "Coins, paying and change", skills: "money.coins.", body: "Recognising pennies, nickels, dimes, quarters and a dollar by value, paying exact amounts, and giving change from a dollar by counting up from the price." },
      { name: "Running a small business", skills: "money.biz.", body: "Adding up the cost of supplies, working out the money that came in as cups × price, finding the profit or loss, and seeing that a higher price usually sells fewer cups, so the highest price isn't always the best." },
    ],
    atHome: [
      "Let your child pay at a shop with a few coins, then count the change together, counting up from the price.",
      "Ask “Is more coins always more money?” Three pennies are worth less than one dime.",
      "If your child runs a real stand or bake sale, write down what the supplies cost before you start, then work out the profit together. Real stands may need local permission.",
    ],
    evidence: {
      text: "A report from the US Consumer Financial Protection Bureau describes three building blocks of financial capability that develop through childhood and the teenage years: executive function, money habits and norms, and financial knowledge and decision-making (CFPB, 2016). The lemonade stand practises knowledge and decision-making (cost, revenue, profit) and one habit, saving towards a goal. Skills are aligned with the National Standards for Personal Financial Education (Council for Economic Education & Jump$tart, 2021). BrainZippy itself has not been tested in a study, and it gives no financial or product advice.",
      refs: ["cfpb2016", "nspfe2021"],
    },
  },
  {
    slug: "sci",
    name: "Science",
    skillPrefix: "sci.",
    updated: "2026-11-22",
    title: "Science games for kids: forces, gravity and rocket experiments",
    description: "Virtual science experiments: predict whether Dabble's rocket will lift off, launch it to test, and learn about balanced forces, weight, mass and acceleration.",
    intro:
      "Science at BrainZippy is about experiments: predict what will happen, test it, watch closely, then explain. Every experiment is virtual, so children never handle heat, flames or chemicals. In Dabble's Rocket Lab, children build rockets, predict whether they will lift off and launch them, with force arrows drawn to scale so the push up and the pull down can be compared.",
    now: "Simplifications are labelled on screen, such as gravity rounded to 10 newtons per kilogram and no air resistance.",
    next: "Planned next: pushes and pulls for younger children, materials and melting, plant and animal needs, light and sound, simple circuits and magnets, energy, and particles. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "8–10", status: "now", body: "Balanced and unbalanced forces: a rocket lifts off only when the push up beats the pull down." },
      { ages: "9–12", status: "now", body: "Weight and mass on Earth and the Moon, then net force and acceleration at the top levels." },
      { ages: "5–8", status: "planned", body: "Pushes and pulls, materials, plant and animal needs, light and sound." },
      { ages: "8–14", status: "planned", body: "Energy, circuits and magnets, then kinetic and potential energy, particles and chemical change." },
    ],
    strands: [
      { name: "Forces and motion", skills: "sci.force.", body: "Comparing a push up with a pull down to predict lift-off, learning that equal forces mean no change in motion (not slow motion), working out weight from mass on Earth and the Moon, and comparing how quickly rockets speed up when the force or the mass changes." },
    ],
    atHome: [
      "Before any experiment, ask “What do you think will happen, and why?” Then test it and compare.",
      "Push a toy car gently, then harder. What changed? A bigger push makes a bigger change in motion.",
      "Talk about the Moon: a rocket's mass is the same there, but it weighs much less because the Moon's pull is weaker.",
    ],
    evidence: {
      text: "Skills are aligned with the Next Generation Science Standards (NGSS Lead States, 2013), which ask children to plan investigations and argue from evidence rather than only remember facts. The game follows that approach: every prediction is tested by launching the rocket, and the result is explained with numbers. The design is built on these standards, but BrainZippy itself has not been tested in a study.",
      refs: ["ngss2013"],
    },
  },
  {
    slug: "cyber",
    name: "Digital safety",
    skillPrefix: "cyber.",
    updated: "2026-11-22",
    title: "Digital safety games for kids: spotting trick messages and phishing",
    description: "A digital safety game: children spot clues that a message is a trick, choose a safe response and check surprising messages with a grown-up. All messages are made up.",
    intro:
      "The digital safety library helps children recognise tricky messages and respond safely. Everything happens in a pretend town with made-up names, messages and web addresses, and nothing can be clicked. The games teach recognising and responding only, never how tricks are made, and they keep coming back to one habit: if something feels off, don't tap or reply, and show a trusted grown-up. Asking a grown-up is always treated as a good choice.",
    now: "Every message can be read aloud, and a magnifier shows who really sent a message and where a link really goes.",
    next: "Planned next: keeping personal information private, strong passwords, unkind messages and asking for help, digital footprints, and checking whether something online is true. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "7–11", status: "now", body: "Clues that a message is a trick, choosing a safe response, and checking a surprising message another way, with a grown-up." },
      { ages: "7–10", status: "planned", body: "Personal information, passwords, unkind messages, and what to do if someone online asks for secrets." },
      { ages: "9–13", status: "planned", body: "Digital footprints, and checking sources and edited images." },
    ],
    strands: [
      { name: "Trick messages", skills: "cyber.scam.", body: "Spotting the clues that a message is a trick (it asks for a secret, offers a prize that's too good to be true, rushes you, says don't tell, asks for a gift card, or its sender or link doesn't match), choosing a safe response, and checking a surprising message another way, with a grown-up. Safe messages appear as often as tricks, so children learn to tell the two apart rather than fear every message." },
    ],
    atHome: [
      "Look at real messages together, such as texts or emails you've received, and ask “Who is this really from? What does it want?”",
      "Agree a family rule: if a message asks for a password, a code, a gift card or a secret, show a grown-up before doing anything, and nobody will be in trouble.",
      "Explain that tricks can look neat and polite, and can even seem to come from a friend whose account someone else is using.",
    ],
    evidence: {
      text: "The clues and safe responses follow consumer guidance on recognising and reporting phishing from the US Cybersecurity and Infrastructure Security Agency and the Federal Trade Commission (CISA, 2024; FTC, 2025), adapted for children: “report it” becomes “show a trusted grown-up”. We plan to re-check the guidance every year. No game can guarantee a child's safety online, and BrainZippy itself has not been tested in a study.",
      refs: ["cisa2024", "ftc2025"],
    },
  },
  {
    slug: "engr",
    name: "Engineering",
    skillPrefix: "engr.",
    updated: "2026-11-22",
    title: "Engineering games for kids: design, test and improve a bridge",
    description: "An engineering design game: children build a bridge that holds the load within a budget, test it with a vehicle, and improve the weak part. Strengths are game numbers.",
    intro:
      "Engineering at BrainZippy is about the design loop: understand the problem, build, test and improve. In Brix's Budget Bridge, children design a bridge from wooden planks, steel beams, pillars and triangle braces, each with a price, then watch a vehicle test it. Any design that holds the load within the budget is accepted, because real engineering problems usually have more than one good answer. The strengths and prices are simple game numbers chosen to teach trade-offs, not real engineering data.",
    now: "A span that is too weak bends and is highlighted, and the vehicle backs off safely: there are no crashes.",
    next: "Planned next: simple machines such as levers, ramps and pulleys, towers, circuits for inventions, robots and gears. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "8–12", status: "now", body: "Spans, supports, materials and triangles; meeting a goal within a budget; and improving a design after a test." },
      { ages: "7–10", status: "planned", body: "Simple machines, and defining a problem and comparing designs." },
      { ages: "9–14", status: "planned", body: "Circuits for inventions, robots with sensors, gears, and fair tests with data." },
    ],
    strands: [
      { name: "Structures", skills: "engr.struct.", body: "Shorter spans carry more, supports split a long span into shorter ones, stronger materials usually cost more, and triangle braces across a whole span make it stiffer. A span is only as strong as its weakest piece." },
      { name: "The design process", skills: "engr.design.", body: "Meeting a goal (hold the school bus) inside the limits (the budget, and pillars only on solid ground), seeing that several designs can work, and using a test result to improve only the part that failed." },
    ],
    atHome: [
      "Build a paper bridge between two books and test it with coins. Then fold the paper into a zigzag and test again.",
      "When something your child builds fails, ask “Which part gave way first?” and improve just that part.",
      "Set a limit: “Build the tallest tower you can with ten straws.” Limits are what make engineering interesting.",
    ],
    evidence: {
      text: "Skills are aligned with the engineering design standards in the Next Generation Science Standards (NGSS Lead States, 2013), which ask children to define problems with criteria and constraints, compare possible solutions and plan fair tests that show where a design fails. The game follows that loop on every puzzle. BrainZippy itself has not been tested in a study.",
      refs: ["ngss2013"],
    },
  },
  {
    slug: "pilot",
    name: "Pilot ground school",
    skillPrefix: "pilot.",
    updated: "2026-11-22",
    title: "Pilot ground school for kids: how planes fly, steer and turn",
    description: "An aviation game for kids: steer a plane with the stick and pedals, learn pitch, roll and yaw, turning and the four forces. Educational only, not flight training.",
    intro:
      "The pilot ground school library teaches how planes fly. In Zephy's Sky Hoops, children steer a little red plane through hoops with an on-screen control stick and rudder pedals and see exactly which part of the plane each control moves. The content follows the FAA's Pilot's Handbook of Aeronautical Knowledge, simplified for children. It is educational only: it is not flight training, not FAA-approved ground training, and does not count toward any pilot certificate. Maps are not for navigation.",
    now: "The flying is simplified for play (the plane keeps the same speed and there is no wind), and the game page says so for grown-ups.",
    next: "Planned next: the parts of a plane, wind and weather, then runway numbers, maps and airspace for older children. Every pilot topic is meant to be checked by a certificated flight or ground instructor. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "6–9", status: "now", body: "Pitch, roll and yaw, the elevator, ailerons and rudder, turning by banking, and the four forces." },
      { ages: "6–9", status: "planned", body: "The parts of a plane, wind and clouds, and why pilots check the weather." },
      { ages: "10–13", status: "planned", body: "Runway numbers, maps, angle of attack and airspace." },
    ],
    strands: [
      { name: "Flight controls", skills: "pilot.controls.", body: "Pulling the stick back pitches the nose up, moving it sideways rolls the wings, and a rudder pedal yaws the nose. Children name pitch, roll and yaw and the part that moves (elevator, ailerons, rudder), then learn that a plane turns by banking its wings, not by steering like a car." },
      { name: "How planes fly", skills: "pilot.flight.", body: "Lift, weight, thrust and drag: which way each one acts, and that they balance when a plane flies steady and level. Lift is explained as the wings pushing air down and the air pushing the wings up." },
    ],
    atHome: [
      "Make a paper plane, bend the back edges of both wings up a little and throw it again. What changed? You've made elevators.",
      "Act out the three movements together: nod for pitch, tip your arms for roll, shake your head for yaw.",
      "Ask why a plane tips its wings to turn instead of steering like a car or a boat.",
    ],
    evidence: {
      text: "The explanations follow the FAA's Pilot's Handbook of Aeronautical Knowledge (FAA, 2023): for example, pulling the control back raises the elevator and pitches the nose up, a plane turns by banking, and in steady level flight lift equals weight and thrust equals drag. The game avoids the common “equal transit time” myth about lift. It is general education only and is not flight training. BrainZippy itself has not been tested in a study.",
      refs: ["faa2023"],
    },
  },
  {
    slug: "nature",
    name: "Nature and oceans",
    skillPrefix: "nature.",
    updated: "2026-11-22",
    title: "Nature and ocean games for kids: coral reefs and food chains",
    description: "A coral reef game: children match reef species to their needs, build food chains from the sun, and learn why corals bleach and how people help reefs recover.",
    intro:
      "The nature and oceans library is about living things and the places they live: facts first, always alongside what people are doing to help. In Ripple's Reef Rescue, children bring a pale coral reef back to colour by putting real reef species where their needs are met, building food chains and learning why corals bleach and how they can recover. There are no frightening images, and white coral is shown as weak, not dead.",
    now: "Each solved puzzle brings one patch of the reef back to colour, and reef health is shown by an icon as well as by colour.",
    next: "Planned next: animal homes for younger children, tide pools, the water cycle, ocean zones, adaptations, and weather and climate for older children. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "8–10", status: "now", body: "What reef species need, and food chains that start with the sun." },
      { ages: "9–12", status: "now", body: "Corals and their algae partners, bleaching and recovery, how a food web changes when grazers disappear, helping reefs, and reading a simple temperature chart." },
      { ages: "5–8", status: "planned", body: "Animal homes, what living things need, and tide pools." },
      { ages: "7–14", status: "planned", body: "The water cycle, ocean zones and adaptations, then weather versus climate and reading temperature data." },
    ],
    strands: [
      { name: "Habitats and needs", skills: "nature.habitat.", body: "What living things need (food, light, the right ground, shelter) and where on a reef each species can live." },
      { name: "Food chains and food webs", skills: "nature.web.", body: "Food chains that start with the sun, with arrows that mean “gives energy to”, and what happens to coral when algae-eating fish disappear or come back." },
      { name: "Coral reefs", skills: "nature.reef.", body: "Corals are animals with tiny algae partners that give them food and colour. Water that stays too warm makes corals bleach; bleached coral is weak but can recover. Children sort actions that help or harm a reef, plant coral where it can grow, and read a simple example temperature chart." },
    ],
    atHome: [
      "Draw a food chain from something your child ate today, starting with the sun.",
      "Ask “What does it need?” about a pet, a house plant or a garden bird: food, water, light and shelter.",
      "Watch a nature film about coral reefs together and look for parrotfish, the reef's algae grazers.",
    ],
    evidence: {
      text: "Reef facts follow the US National Oceanic and Atmospheric Administration (NOAA Ocean Service, n.d.): corals are animals, tiny algae living in their tissue give them food and colour, water that stays too warm makes corals push the algae out and turn white, and bleached corals are stressed but can recover if conditions improve. Skills are aligned with NGSS life and earth science (NGSS Lead States, 2013). BrainZippy itself has not been tested in a study.",
      refs: ["noaa", "ngss2013"],
    },
  },
  {
    slug: "geo",
    name: "Geography",
    skillPrefix: "geo.",
    updated: "2026-11-22",
    title: "Geography games for kids: maps, compass directions and continents",
    description: "A map skills game: compass directions, map keys and grid references, then the seven continents, five oceans and the equator on an equal-area world map.",
    intro:
      "The geography library starts with maps. In Yonder's Postcard Trip, children steer Yonder the hermit crab around an island using north, east, south and west, find places with a map key and grid references, then post postcards around the world. The world map uses an equal-area projection, so continents aren't drawn bigger or smaller than they really are. Maps are simplified for learning, show no country borders and are not for navigation.",
    now: "Directions are spoken, so younger children can play, and hints show where to look before they show the answer.",
    next: "Planned next: landmarks, flags, greetings and languages, festivals and daily life around the world (reviewed by people from those cultures), biomes, and latitude and longitude for older children. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "5–8", status: "now", body: "Compass directions, map keys and grid references on an island map." },
      { ages: "6–9", status: "now", body: "The seven continents, five oceans, the equator and the two hemispheres on a world map." },
      { ages: "7–12", status: "planned", body: "Landmarks, languages, cultures, countries and flags." },
      { ages: "10–14", status: "planned", body: "Latitude, longitude, time zones and map projections." },
    ],
    strands: [
      { name: "Map basics", skills: "geo.map.", body: "Compass directions from a single step to a two-part route, reading symbols with a map key, and giving grid references: column letter first, then row number." },
      { name: "Continents and oceans", skills: "geo.world.", body: "The seven continents as taught in US schools (some countries teach five or six), the five oceans including the Southern Ocean, the equator, and why seasons are opposite in the northern and southern hemispheres." },
    ],
    atHome: [
      "Find which way is north at home or in the park, then play “two steps east, one step north”.",
      "Draw a map of your child's bedroom with a key: a square for the bed, a circle for the rug.",
      "Look at a globe or world map together and find where a relative lives, or where a favourite animal comes from.",
    ],
    evidence: {
      text: "Skills are aligned with the National Geography Standards (NCGE, 2012), especially using maps and spatial thinking and describing the physical characteristics of places. The game teaches the seven-continent model used in US schools and tells grown-ups that other models exist. BrainZippy itself has not been tested in a study.",
      refs: ["ncge2012"],
    },
  },
  {
    slug: "sel",
    name: "Social and emotional skills",
    skillPrefix: "sel.",
    updated: "2026-11-22",
    title: "Feelings games for kids: naming feelings and choosing kind actions",
    description: "Social and emotional learning through stories: children name feelings from faces, bodies and what happened, and choose kind and calm ideas. Not therapy.",
    intro:
      "The social and emotional skills library practises naming feelings and choosing kind actions through stories. In Snug's Feelings Garden, children read the clues in short, everyday stories (a melted ice lolly, a fallen tower, waiting for a turn) and bring a feeling flower to a Critter Crew friend. It is skill practice, not therapy, counselling or assessment: it never asks how your child feels in real life and never scores feelings.",
    now: "Every feeling is OK, several feelings are accepted where they fit, and a less kind idea gets a gentle question instead of a wrong sound.",
    next: "Planned next: calm-down strategies in more depth, joining in and taking turns, talking things through, solving disagreements fairly, and knowing when and whom to ask for help. We add a game only when it is finished and tested.",
    byAge: [
      { ages: "4–6", status: "now", body: "Naming happy, sad, angry, scared and surprised from faces and what happened, and choosing calm ideas." },
      { ages: "5–7", status: "now", body: "Body clues, kind ideas, finer feelings such as proud or nervous, and seeing that two friends can feel differently." },
      { ages: "4–8", status: "planned", body: "Friendship skills such as joining in, sharing and taking turns." },
      { ages: "7–12", status: "planned", body: "Talking things through, solving disagreements fairly, thinking about consequences, and knowing when and whom to ask for help." },
    ],
    strands: [
      { name: "Naming feelings", skills: "sel.feel.", body: "Happy, sad, angry, scared and surprised, then frustrated, proud, nervous, excited, disappointed and lonely, read from faces, from what happened and from body clues alone. Faces are treated as clues, not proof, so story and body puzzles accept more than one feeling." },
      { name: "Calm-down ideas", skills: "sel.calm.", body: "Calm, safe things to do with a big angry feeling: slow breaths, counting to five, asking for a break, squeezing a calm stone or telling a grown-up. An optional breathing flower lets children practise at their own pace, with no timer or score." },
      { name: "Kind actions", skills: "sel.kind.", body: "Noticing what a sad or scared friend might need and choosing a kind idea that could help." },
      { name: "Seeing two sides", skills: "sel.persp.", body: "The same thing can make two friends feel differently, like a fairground ride one friend loves and another finds a bit scary." },
    ],
    atHome: [
      "Name feelings when you read stories together: “How might she feel? What makes you think so?”",
      "Name your own feelings out loud sometimes: “I feel frustrated, so I'm going to take three slow breaths.”",
      "When two children feel differently about the same thing, say so kindly: both feelings are OK.",
    ],
    evidence: {
      text: "A major review of research on facial expressions concluded that people don't reliably make one particular face for each emotion, so a face is a clue rather than proof of how someone feels (Barrett et al., 2019). That is why the game moves from faces to what happened and to body clues, and accepts more than one feeling where several could fit. Skills are organised around the CASEL framework's competencies (CASEL, n.d.). The game makes no claims about mental health, and BrainZippy itself has not been tested in a study.",
      refs: ["barrett2019", "casel"],
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
    updated: "2026-11-22",
    title: "Learning games for 3 to 5 year olds: counting, rhymes, shapes and feelings",
    description: "Games for preschoolers aged 3–5 with spoken instructions and big buttons: counting, rhymes, patterns, shapes and naming feelings. What children learn and how to help.",
    intro: "Between three and five, most children move from reciting numbers to really understanding what counting means, start to hear that words rhyme, begin to spot patterns, and learn words for their feelings. BrainZippy's games for this age are built for children who can't read yet: every instruction is spoken and captioned, buttons are large, and a character shows what to do first.",
    development: [
      "Many three-year-olds can recite “one, two, three…” but cannot yet use it to find how many. Children typically learn the meaning of one, two and three in turn before the idea that counting tells you the total clicks, often around age four, with a wide normal range (Le Corre & Carey, 2007).",
      "Recognising very small amounts without counting (subitizing) grows alongside counting and helps children check their counting (Clements, 1999).",
      "Being able to give someone exactly five things is harder than counting five things that are already there, so it is worth practising both.",
      "Hearing rhyme is an early listening skill that needs no letters. In a long-term study, preschoolers' skill at hearing rhyme and first sounds predicted their reading and spelling years later (Bradley & Bryant, 1983).",
      "Pattern knowledge in the last year of preschool was one of the stronger predictors of later maths achievement in a study that followed children to age 11 (Rittle-Johnson et al., 2017). That is a link, not proof of cause.",
      "Young children often judge shapes by how much they look like a typical example, so a thin or upside-down triangle may not count as a triangle to them yet (Clements et al., 1999).",
      "Children learn words for feelings by reading many clues, not faces alone. A major review found that people don't reliably make one particular face for each emotion, so what happened and how someone's body looks matter too (Barrett et al., 2019).",
    ],
    howToHelp: [
      "After your child counts, ask “So how many are there?” If they count again from the start, they may not yet know that the last number is the answer. That is normal; model it: “One, two, three. Three apples!”",
      "Ask for a set: “Can you give me four spoons?” and watch whether they stop at four.",
      "Use dice, dominoes and fingers so small amounts become familiar patterns.",
      "Play rhyming games in the car or the bath: “What rhymes with cat?” Silly made-up words count.",
      "Make patterns with toys or claps (clap, clap, stomp) and ask what comes next.",
      "Name feelings in picture books: “How might the bear feel? What makes you think so?” More than one answer can be right.",
    ],
    designNotes: "For this age every game opens with a demonstration, uses one instruction at a time and has large objects that are easy to touch. Every word and number is spoken, and mistakes lead to a hint and then a modelled answer, never a buzzer.",
    refs: ["lecorre2007", "clements1999", "bradley1983", "rittlejohnson2017", "clements1999shape", "barrett2019"],
  },
  {
    slug: "6-8",
    label: "6–8",
    min: 6,
    max: 8,
    stage: "Early elementary",
    updated: "2026-11-22",
    title: "Learning games for 6 to 8 year olds: maths, coding, maps and more",
    description: "Games for ages 6–8: adding, sharing and fractions, plus first coding, map skills, US coins, how planes steer, spotting trick messages and naming feelings.",
    intro: "From six to eight, children usually move from counting everything one by one to using strategies: counting on from the bigger number, making ten, seeing division as fair sharing, and starting to treat fractions as numbers. It is also a good age for first steps in other subjects: giving precise step-by-step instructions, reading a simple map, counting coins and noticing how others feel. BrainZippy's games for this age practise these inside short stories.",
    development: [
      "Children who picture numbers on an evenly spaced line tend to have better number knowledge, and playing a straight, numbered board game improved young children's number skills in experiments (Siegler & Booth, 2004; Siegler & Ramani, 2008).",
      "Counting on (8… 9, 10, 11) replaces counting all, then derived strategies such as making ten take over for sums that cross 10. US standards expect addition within 20 using these strategies in first grade (Common Core 1.OA.C.6).",
      "Many children can share fairly by dealing out one at a time long before they learn division facts. Understanding that fair shares always contain the same number develops gradually (Frydman & Bryant, 1988).",
      "Fractions are often first met as slices of a shape. A practice guide from the US Institute of Education Sciences recommends also using number lines, which show that a fraction is a number with a size (Siegler et al., 2010). US standards place fractions on the number line in third grade.",
      "Young children can learn to build and fix simple programs of ordered instructions: in a study of kindergarten classrooms, children aged about five and six did so with a robotics curriculum (Bers et al., 2014). It was a small study without a comparison group.",
      "Counting coins is counting by value, not by number of coins. US standards expect second graders to solve problems with dollar bills, quarters, dimes, nickels and pennies (Common Core 2.MD.C.8).",
    ],
    howToHelp: [
      "When your child adds 3 + 8, ask “Which number could you start from?” Starting from 8 is a big step.",
      "Play board games with a straight, numbered track and have your child count the spaces as they move.",
      "At snack time, ask them to share crackers fairly between plates, then ask how they know it is fair.",
      "Fold paper strips into halves and quarters and ask where one half and three quarters would go on a line from 0 to 1.",
      "Play “robot”: your child gives you step-by-step directions across the room, and you follow them exactly.",
      "Let your child pay with a few coins and count the change with you, counting up from the price.",
    ],
    designNotes: "For this age the maths games use a visible number line, a make-ten step for sums that cross 10 and fractions as spots on an evenly split trail. In the other subjects, children run their own programs and see the first wrong step, steer around a real compass rose, and pay with coins in any combination that adds up. Every game shows a worked example after two misses, and text appears with every spoken line for children who are starting to read.",
    refs: ["siegler2004", "siegler2008", "ccss", "frydman1988", "siegler2010", "bers2014"],
  },
  {
    slug: "9-11",
    label: "9–11",
    min: 9,
    max: 11,
    stage: "Upper elementary",
    updated: "2026-11-22",
    title: "Learning games for 9 to 11 year olds: forces, reefs, bridges and money",
    description: "Games for ages 9–11: rocket forces, coral reef food chains, bridge design on a budget, profit at a lemonade stand and spotting trick messages. Hints, no ads.",
    intro: "From nine to eleven, children can test ideas, compare designs and work with more than one step at a time. BrainZippy's games for this age ask them to predict and test (will this rocket lift off?), design within limits (a bridge that holds the bus on a budget), reason about systems (what happens to a reef when algae-eating fish disappear) and make decisions (which price makes the most profit). They keep the same story style, with more challenging puzzles and less hand-holding.",
    development: [
      "US science standards ask children in grades 3–5 to investigate balanced and unbalanced forces, and to define design problems with criteria and constraints, compare solutions and plan fair tests. In middle school the same ideas become quantitative: how a change in motion depends on the forces and the mass (NGSS Lead States, 2013).",
      "The US Consumer Financial Protection Bureau describes three building blocks of financial capability: executive function, money habits and norms, and financial knowledge and decision-making (CFPB, 2016). Working out cost, revenue and profit practises the third, and saving towards a goal practises a habit.",
      "The warning signs of a trick message are the same for children and adults: requests for passwords or codes, rushing, prizes that seem too good to be true, unexpected links or files, and gift-card payments (CISA, 2024; FTC, 2025).",
      "Fractions are hard partly because whole-number habits get in the way: children may think 1/8 is bigger than 1/6 because 8 is bigger than 6. Number lines help children see fractions as sizes (Siegler et al., 2010).",
      "Equivalent fractions such as 1/2 and 4/8 are easier to understand as the same point on a number line than as a rule about multiplying top and bottom.",
      "Students who understand the equals sign as “both sides are the same amount” do better at solving equations, in a correlational study with middle school students (Knuth et al., 2006). Questions like 8 + 4 = ? + 5 help build that meaning early.",
    ],
    howToHelp: [
      "Before your child tests anything, ask for a prediction and a reason. Afterwards, ask what the result showed.",
      "When something they build fails, ask which part gave way first, and improve only that part.",
      "Look at real messages together and ask who they are really from and what they want. Agree that anything asking for a password, code or gift card comes to you first.",
      "Ask which is bigger, 3/8 or 3/6, and how they know. “More parts means smaller parts” is the key idea.",
      "Try missing-number puzzles with the gap on either side: 7 + ? = 12, or 15 = ? + 9.",
      "When your child explains a strategy, ask them to check it a second way.",
    ],
    designNotes: "For this age the games use more text, numbers and diagrams: force arrows drawn to scale, budgets and test results, a simple temperature chart and a ledger of costs. Any design or program that meets the goal is accepted, hints are matched to the likely mistake, and every spoken line is captioned. Simplifications (game numbers for bridge strengths, gravity rounded to 10) are labelled.",
    refs: ["ngss2013", "cfpb2016", "cisa2024", "ftc2025", "siegler2010", "knuth2006"],
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
