import type { ContentPack } from "../../types";

/**
 * Balance Scale Island pack: pre-algebra for ages 11–13 (docs/curriculum/maths.md §3 item 7).
 * Uses the existing `math` subject and Critter Crew; adds the algebra topic and three equation skills.
 * Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "math-balance-island",
  title: "Pre-algebra: balancing equations (ages 11–13)",
  topics: [{ id: "math.algebra", subject: "math", title: "Algebra", description: "Expressions and equations, solved by keeping both sides balanced." }],
  skills: [
    {
      id: "math.alg.one-step",
      title: "One-step equations",
      topic: "math.algebra",
      ages: [11, 12],
      prerequisites: ["math.add.within-20", "math.div.share-equally"],
      objective: "Solve x + p = q and px = q by doing the same to both sides (take away equal amounts, split into equal groups).",
    },
    {
      id: "math.alg.two-step",
      title: "Two-step equations",
      topic: "math.algebra",
      ages: [12, 13],
      prerequisites: ["math.alg.one-step"],
      objective: "Solve px + q = r by undoing in the right order (take away, then split), including equations written from word stories.",
    },
    {
      id: "math.alg.both-sides",
      title: "Unknowns on both sides",
      topic: "math.algebra",
      ages: [12, 13],
      prerequisites: ["math.alg.two-step"],
      objective: "Solve px + q = sx + r by first taking the same number of unknowns off both sides.",
    },
  ],
  worlds: [
    {
      id: "balance-island",
      subject: "math",
      topic: "math.algebra",
      skills: ["math.alg.one-step", "math.alg.two-step", "math.alg.both-sides"],
      ages: [11, 13],
      maxLevel: 7,
      title: "Balance Scale Island",
      gameType: "equation game",
      blurb: "Weigh Bobbo's sealed mystery bags by keeping the market scale balanced!",
      parentDescription:
        "Children solve equations on a balance scale: mystery bags stand for x, and they take equal weights off both pans or split both pans into equal groups while the matching equation updates beside the scale. Levels move from x + 3 = 7 to two-step equations, unknowns on both sides, and turning word stories into equations.",
      characters: ["bobbo", "rumble"],
      load: () => import("../../../games/balance-island/BalanceIsland"),
      loadDefinition: () => import("../../../games/balance-island/definition").then((m) => m.balanceIsland),
      voice: "src/games/balance-island/voice.json",
      map: { x: 56, y: 84 },
    },
  ],
};

export default pack;
