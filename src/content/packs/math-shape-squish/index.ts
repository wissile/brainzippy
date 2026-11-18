import type { ContentPack } from "../../types";

/**
 * Shapes world pack: Gloop's Shape Squish (ages 4–6). Uses the existing `math` subject (core-math pack) and the
 * existing Critter Crew characters (gloop, zuzu). Skills mirror docs/curriculum/maths.md §2 (math.shape.*).
 * Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "math-shape-squish",
  title: "Maths: shapes (ages 4–6)",
  topics: [{ id: "math.shape", subject: "math", title: "Shapes", description: "Naming 2D shapes, their sides and corners, and putting shapes together." }],
  skills: [
    {
      id: "math.shape.name",
      title: "Naming shapes",
      topic: "math.shape",
      ages: [4, 6],
      prerequisites: [],
      objective: "Name circles, triangles, squares, rectangles and hexagons in any size or orientation.",
    },
    {
      id: "math.shape.attributes",
      title: "Sides and corners",
      topic: "math.shape",
      ages: [5, 7],
      prerequisites: ["math.shape.name"],
      objective: "Sort shapes by how many sides and corners they have, not by colour or size.",
    },
    {
      id: "math.shape.compose",
      title: "Putting shapes together",
      topic: "math.shape",
      ages: [5, 7],
      prerequisites: ["math.shape.name"],
      objective: "Make a larger shape from smaller ones, turning pieces to fit, and find more than one way.",
    },
  ],
  worlds: [
    {
      id: "shape-squish",
      subject: "math",
      topic: "math.shape",
      skills: ["math.shape.name", "math.shape.attributes", "math.shape.compose"],
      ages: [4, 6],
      maxLevel: 7,
      title: "Gloop's Shape Squish",
      gameType: "shapes game",
      blurb: "Help Gloop squish into the right shape to get through every garden gate!",
      parentDescription:
        "Children match circles, squares, triangles, rectangles and hexagons shown in different sizes and turns, find every triangle in a group, sort shapes by their number of sides, and fill outlines with smaller pieces in more than one way. Shapes are described by sides and corners, and hints trace and count the sides.",
      characters: ["gloop", "zuzu"],
      load: () => import("../../../games/shape-squish/ShapeSquish"),
      loadDefinition: () => import("../../../games/shape-squish/definition").then((m) => m.shapeSquish),
      voice: "src/games/shape-squish/voice.json",
      map: { x: 52, y: 80 },
    },
  ],
};

export default pack;
