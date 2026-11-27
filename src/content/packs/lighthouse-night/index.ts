import type { ContentPack } from "../../types";

/**
 * Lighthouse Night (ages 12–14), the last stop of the Maths journey (Number Hill, host Bobbo). Spec:
 * docs/curriculum/maths.md §3 ("Lighthouse Angles"), widened for 12–14. World doc: docs/worlds/lighthouse-night.md.
 * The sea chart is fictional and labelled "not for navigation".
 *
 * Adds five skills under EXISTING maths topics (no new topic): angle facts, bearings and Pythagoras under `math.shape`
 * (the only geometry topic registered so far; a `math.geom` topic would fit better, see the world doc's review
 * flags), scale and ratio under `math.division` ("Sharing and division"), straight-line graphs under `math.algebra`.
 * `math.geom.angles` and `math.geom.pythagoras` are the ids planned in maths.md §2.
 * Prerequisites point only at skills some world teaches and whose age range ends by 12, so the daily planner treats
 * them as known by age for this world's band and never locks it: shape.attributes (Shape Squish), div.share-equally
 * (Bobbo's Breakfast pack), alg.one-step (Balance Scale Island); the rest chain inside this world.
 */
const pack: ContentPack = {
  id: "lighthouse-night",
  title: "Lighthouse Night (maths, ages 12–14)",
  topics: [],
  skills: [
    {
      id: "math.geom.angles",
      title: "Angle facts",
      topic: "math.shape",
      ages: [11, 14],
      prerequisites: ["math.shape.attributes"],
      objective: "Find missing angles with angle facts: angles on a straight line (180°) and around a point (360°), vertically opposite angles, the angle sum of a triangle (including isosceles triangles), and corresponding, alternate and co-interior angles on parallel lines.",
    },
    {
      id: "math.geom.bearings",
      title: "Three-figure bearings",
      topic: "math.shape",
      ages: [12, 14],
      prerequisites: ["math.geom.angles"],
      objective: "Measure and write bearings clockwise from north as three figures, and find a back bearing by turning 180°.",
    },
    {
      id: "math.geom.pythagoras",
      title: "Pythagoras' theorem",
      topic: "math.shape",
      ages: [13, 14],
      prerequisites: ["math.geom.angles"],
      objective: "Use a² + b² = c² to find the hypotenuse or a shorter side of a right-angled triangle, round lengths to 1 decimal place, and use the converse to test for a right angle.",
    },
    {
      id: "math.solve.scale-ratio",
      title: "Scale and ratio",
      topic: "math.division",
      ages: [11, 14],
      prerequisites: ["math.div.share-equally"],
      objective: "Use a map scale (1 cm : n km) to convert between map and real distances, write a scale as a ratio 1 : n in the same units, and share an amount in a given ratio.",
    },
    {
      id: "math.alg.linear-graphs",
      title: "Coordinates and straight-line graphs",
      topic: "math.algebra",
      ages: [12, 14],
      prerequisites: ["math.alg.one-step"],
      objective: "Plot points in all four quadrants, find the gradient and y-intercept of a straight line, match a line to y = mx + c, find where two lines cross, and recognise parallel lines by equal gradients.",
    },
  ],
  worlds: [
    {
      id: "lighthouse-night",
      subject: "math",
      topic: "math.shape",
      skills: ["math.geom.angles", "math.geom.bearings", "math.geom.pythagoras", "math.solve.scale-ratio", "math.alg.linear-graphs"],
      ages: [12, 14],
      maxLevel: 8,
      title: "Lighthouse Night",
      gameType: "geometry and graphs game",
      blurb: "Help Hoot guide every ship home through the storm with angles, bearings, Pythagoras, scale and graphs.",
      parentDescription:
        "A stormy night at the lighthouse with four inner games. Children use angle facts as the beams cross the harbour wall, each other and two parallel shipping lanes, then read three-figure bearings and turn the beam to a back bearing. They use Pythagoras' theorem for ladders and ropes on the tower, convert distances on a fictional sea chart (not for navigation) and share supplies in a ratio, and plot points, read gradients and intercepts and choose the line y = mx + c that a ship follows. Every round ends by guiding the last boat home with a two-step problem. Wrong answers get a hint that names the likely mix-up, then a worked example.",
      characters: ["hoot", "ripple", "bobbo"],
      load: () => import("../../../games/lighthouse-night/LighthouseNight"),
      loadDefinition: () => import("../../../games/lighthouse-night/definition").then((m) => m.lighthouseNight),
      voice: "src/games/lighthouse-night/voice.json",
    },
  ],
};

export default pack;
