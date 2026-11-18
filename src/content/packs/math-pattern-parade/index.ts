import type { ContentPack } from "../../types";

/**
 * Puff's Pattern Parade (maths library, patterns topic). Metadata only — game code/data load lazily.
 * Spec: docs/curriculum/maths.md §3 item 3 · pedagogy: docs/worlds/pattern-parade.md.
 * `math.pattern.grow-simple` is the ages 5–6 "+1" growing pattern; `math.pattern.grow` (ages 8–10, rule finding)
 * stays free for a later world.
 */
const pack: ContentPack = {
  id: "math-pattern-parade",
  title: "Patterns (ages 4–6)",
  topics: [{ id: "math.pattern", subject: "math", title: "Patterns", description: "Repeating and growing patterns." }],
  skills: [
    { id: "math.pattern.repeat", title: "Repeating patterns", topic: "math.pattern", ages: [4, 6], prerequisites: [], objective: "Continue and complete AB, AAB, ABB and ABC patterns, including a missing middle item." },
    { id: "math.pattern.translate", title: "Copying a pattern another way", topic: "math.pattern", ages: [5, 6], prerequisites: ["math.pattern.repeat"], objective: "Show the same repeating pattern with different things (animals, instruments, sounds)." },
    { id: "math.pattern.grow-simple", title: "Growing patterns (+1)", topic: "math.pattern", ages: [5, 6], prerequisites: ["math.pattern.repeat", "math.count.cardinality"], objective: "Continue a pattern that grows by one each step, and find a missing step." },
  ],
  worlds: [
    {
      id: "pattern-parade",
      subject: "math",
      topic: "math.pattern",
      skills: ["math.pattern.repeat", "math.pattern.translate", "math.pattern.grow-simple"],
      ages: [4, 6],
      maxLevel: 8,
      title: "Puff's Pattern Parade",
      gameType: "patterns game",
      blurb: "Fill the gaps in Puff's parade so everyone marches in a pattern!",
      parentDescription:
        "Children continue repeating patterns (AB, AAB, ABB, ABC) by dragging floats, animals and instruments into a parade line, find a missing middle item, copy a pattern with a different set of things, and continue simple growing patterns of block towers. Hints box the part that repeats, then model the answer.",
      characters: ["puff", "gloop"],
      load: () => import("../../../games/pattern-parade/PatternParade"),
      loadDefinition: () => import("../../../games/pattern-parade/definition").then((m) => m.patternParade),
      voice: "src/games/pattern-parade/voice.json",
      map: { x: 52, y: 54 },
    },
  ],
};

export default pack;
