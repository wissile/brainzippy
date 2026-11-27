import type { ContentPack } from "../../types";

/**
 * Bobbo's Bakery (ages 9–11): the age-10 stop of the Maths journey (Number Hill, host Bobbo), between Cookie Kitchen /
 * Sleepy Trail (7–9) and Balance Island (11–13). World doc: docs/worlds/bakery.md. Spec roots: docs/curriculum/maths.md
 * §3 (Puff's Array Garden, Gloop's Room Builder, Bar-Model Bakery), merged into one world with five inner games.
 *
 * Adds five skills under EXISTING maths topics (no new topic): multiplication and missing-factor division under
 * `math.division` (sharing and division), area and perimeter under `math.shape`, fraction of an amount under
 * `math.frac`, bar-model problem solving under `math.algebra` (pre-algebra modelling). Reuses `math.frac.equivalent`
 * and `math.frac.compare` (taught first by Sleepy Trail). Every prerequisite is a skill some world teaches.
 */
const pack: ContentPack = {
  id: "bakery",
  title: "Bobbo's Bakery (maths, ages 9–11)",
  skills: [
    {
      id: "math.mult.arrays",
      title: "Multiplication with arrays",
      topic: "math.division",
      ages: [7, 10],
      prerequisites: ["math.div.share-equally"],
      objective: "Read a × b as a rows of b, build and count arrays, and recall multiplication facts to 12 × 12 by splitting an array into facts you know.",
    },
    {
      id: "math.div.missing-factor",
      title: "Division as a missing factor",
      topic: "math.division",
      ages: [8, 11],
      prerequisites: ["math.mult.arrays"],
      objective: "Divide by finding the unknown factor of an array: how many in each of n equal rows, or how many rows of n.",
    },
    {
      id: "math.geom.area-perimeter",
      title: "Area and perimeter",
      topic: "math.shape",
      ages: [8, 11],
      prerequisites: ["math.mult.arrays"],
      objective: "Find the area of a rectangle as rows × columns of square tiles and its perimeter as the sum of its sides, find a missing side from the area, and find the area of an L-shape by splitting it.",
    },
    {
      id: "math.frac.of-amount",
      title: "A fraction of an amount",
      topic: "math.frac",
      ages: [9, 11],
      prerequisites: ["math.mult.arrays", "math.frac.unit-on-line"],
      objective: "Find a fraction of a whole-number amount by splitting it into equal groups (÷ denominator) and taking some of them (× numerator).",
    },
    {
      id: "math.solve.bar-model",
      title: "Word problems with bar models",
      topic: "math.algebra",
      ages: [9, 12],
      prerequisites: ["math.mult.arrays"],
      objective: "Draw a two-step word problem as a bar model (part–whole, comparison, equal parts, times as many, fraction of a whole) and use it to choose the operations.",
    },
  ],
  worlds: [
    {
      id: "bakery",
      subject: "math",
      topic: "math.division",
      skills: ["math.mult.arrays", "math.div.missing-factor", "math.geom.area-perimeter", "math.frac.of-amount", "math.frac.equivalent", "math.frac.compare", "math.solve.bar-model"],
      ages: [9, 11],
      maxLevel: 8,
      title: "Bobbo's Bakery",
      gameType: "multiplication, area, fractions and word-problem game",
      blurb: "The island festival ordered everything! Be Bobbo's head baker: fill trays, cut fair slices and plan the order.",
      parentDescription:
        "Children help Bobbo bake a big festival order in five linked activities: they fill cookie trays as arrays (multiplication facts to 12 × 12 and division as a missing factor), build trays on a grid (area, perimeter and L-shapes), share batches into fractions (a fraction of an amount, equivalent fractions and comparing fractions), draw two-step word problems as bar models, and finish each round with an order sheet that combines them. Wrong answers get a hint matched to the likely mistake (for example perimeter given for area, or adding instead of multiplying) and then a worked example.",
      characters: ["bobbo", "puff"],
      load: () => import("../../../games/bakery/Bakery"),
      loadDefinition: () => import("../../../games/bakery/definition").then((m) => m.bakery),
      voice: "src/games/bakery/voice.json",
    },
  ],
};

export default pack;
