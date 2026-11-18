import type { ContentPack } from "../../types";

/**
 * Rumble's Sleepy Trail: fractions as positions on a number line (docs/curriculum/maths.md §4, docs/worlds/sleepy-trail.md).
 * Uses the existing `math` subject (core-math) and adds the fractions topic and its five skills. Metadata only.
 */
const pack: ContentPack = {
  id: "math-sleepy-trail",
  title: "Fractions on a number line (ages 7–9)",
  topics: [{ id: "math.frac", subject: "math", title: "Fractions", description: "Fractions as numbers: points on a number line, equivalence and comparison." }],
  skills: [
    { id: "math.frac.unit-on-line", title: "Unit fractions on a number line", topic: "math.frac", ages: [7, 9], prerequisites: ["math.add.number-line"], objective: "Place a unit fraction 1/d on a 0–1 number line split into d equal parts." },
    { id: "math.frac.on-line", title: "Fractions on a number line", topic: "math.frac", ages: [7, 9], prerequisites: ["math.frac.unit-on-line"], objective: "Place and name a fraction a/d on a number line, including fractions greater than one." },
    { id: "math.frac.equivalent", title: "Equivalent fractions", topic: "math.frac", ages: [8, 10], prerequisites: ["math.frac.on-line"], objective: "Recognise equivalent fractions as the same point on the number line." },
    { id: "math.frac.compare", title: "Comparing fractions", topic: "math.frac", ages: [8, 10], prerequisites: ["math.frac.on-line"], objective: "Compare two fractions with the same numerator or the same denominator by where they sit on the line." },
    { id: "math.frac.estimate", title: "Estimating fractions on a line", topic: "math.frac", ages: [9, 11], prerequisites: ["math.frac.equivalent"], objective: "Place a fraction on an unmarked number line within a small tolerance." },
  ],
  worlds: [
    {
      id: "sleepy-trail",
      subject: "math",
      topic: "math.frac",
      skills: ["math.frac.unit-on-line", "math.frac.on-line", "math.frac.equivalent", "math.frac.compare", "math.frac.estimate"],
      ages: [7, 9],
      maxLevel: 8,
      title: "Rumble's Sleepy Trail",
      gameType: "fractions game",
      blurb: "Help sleepy Rumble find his nap spots on the fraction trail!",
      parentDescription:
        "Children place fractions as points on a number line by counting equal jumps from zero, then name fractions, go past one, find equivalent fractions on differently split lines, compare fractions with the same numerator or denominator, and estimate on unmarked lines. Wrong answers get a hint matched to the likely mistake and then a worked example.",
      characters: ["rumble", "gloop", "bobbo"],
      load: () => import("../../../games/sleepy-trail/SleepyTrail"),
      loadDefinition: () => import("../../../games/sleepy-trail/definition").then((m) => m.sleepyTrail),
      voice: "src/games/sleepy-trail/voice.json",
      map: { x: 56, y: 74 },
    },
  ],
};

export default pack;
