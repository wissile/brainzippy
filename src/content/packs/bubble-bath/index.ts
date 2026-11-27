import type { ContentPack } from "../../types";

/**
 * Gloop's Bubble Bath (ages 3–4): the first stop of the Maths journey (Number Hill, journey host Bobbo; world host
 * Gloop). Reuses `math.shape.name` (math-shape-squish), `math.count.subitize` and `math.count.one-to-one` (core-math).
 * Adds `math.count.compare` and `math.count.sequence` (numerals in counting order, K.CC.A.1–A.3) under the existing
 * Counting topic (CCSS K.CC.C.6 sits in Counting & Cardinality) and a new
 * `math.measure` topic for `math.measure.order-size` (no measuring topic existed; Rumble is the library's measuring
 * buddy for later worlds). Prerequisites stay inside this world so the daily planner never locks the journey's
 * first stop. Metadata only — game code and data load lazily. Pedagogy: docs/worlds/bubble-bath.md.
 */
const pack: ContentPack = {
  id: "bubble-bath",
  title: "Maths: Gloop's Bubble Bath (ages 3–4)",
  topics: [
    {
      id: "math.measure",
      subject: "math",
      title: "Measuring and comparing",
      description: "Comparing and ordering things by size, length and weight, and later measuring with units.",
    },
  ],
  skills: [
    {
      id: "math.count.compare",
      title: "More, fewer, the same",
      topic: "math.counting",
      ages: [3, 5],
      prerequisites: ["math.count.one-to-one"],
      objective: "Tell whether one group has more, fewer or the same as another, by matching each object with a partner (and later by counting).",
    },
    {
      id: "math.count.sequence",
      title: "Numbers in counting order",
      topic: "math.counting",
      ages: [3, 5],
      prerequisites: [],
      objective: "Find the numerals 1 to 5 in counting order (know which number comes next).",
    },
    {
      id: "math.measure.order-size",
      title: "Ordering by size",
      topic: "math.measure",
      ages: [3, 5],
      prerequisites: [],
      objective: "Put three, then four, things in order from smallest to biggest by comparing each one with its neighbours.",
    },
  ],
  worlds: [
    {
      id: "bubble-bath",
      subject: "math",
      topic: "math.counting",
      skills: ["math.shape.name", "math.count.subitize", "math.count.compare", "math.measure.order-size", "math.count.one-to-one", "math.count.sequence"],
      ages: [3, 4],
      maxLevel: 7,
      title: "Gloop's Bubble Bath",
      gameType: "early maths game",
      blurb: "Help Gloop tidy the bath: sort shapes, spot bubbles, compare ducks and pop the bubble parade!",
      parentDescription:
        "Five small games in one bubble bath for 3- and 4-year-olds. Children post foam toys into circle, square and triangle holes and find shapes in a picture (also turned or stretched); say how many bubbles they saw at a glance (1 to 5), choosing from numerals shown with dot pictures; compare two tubs of ducks by pairing them up (more, fewer or the same, including rows spread out to look longer); line up three or four boats or sponges from smallest to biggest; and finish with a bubble parade: popping each bubble once while counting, then saying how many, and later popping numbered bubbles in counting order. Everything is spoken and picture-based, answers are never timed, and hints show a strategy before a modelled answer.",
      characters: ["gloop", "bobbo"],
      load: () => import("../../../games/bubble-bath/BubbleBath"),
      loadDefinition: () => import("../../../games/bubble-bath/definition").then((m) => m.bubbleBath),
      voice: "src/games/bubble-bath/voice.json",
    },
  ],
};

export default pack;
