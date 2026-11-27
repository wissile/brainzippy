import type { ContentPack } from "../../types";

/**
 * Maths library (Number Hill). Plan: docs/curriculum/maths.md.
 * Live: its worlds are planned, shown in Explore and published.
 * Host declared in packs/core-math (Critter Crew).
 */
const pack: ContentPack = {
  id: "library-math",
  title: "Maths library",
  // Planned topics from docs/curriculum/maths.md §1, first used by Bobbo's Bakery and Lighthouse Night.
  topics: [
    { id: "math.geom", subject: "math", title: "Geometry and measure", description: "Area, perimeter, angles, bearings and Pythagoras." },
    { id: "math.solve", subject: "math", title: "Problem solving", description: "Bar models, scale and ratio for multi-step problems." },
  ],
  libraries: [
    {
      id: "math",
      title: "Maths",
      kidTitle: "Number Hill",
      host: "bobbo",
      theme: { main: "#FF9F43", soft: "#FFF0E0", deep: "#8A4500", token: "--bobbo" },
      ages: [3, 14],
      pitch: "Count, add and share with Bobbo.",
      description: "Story games for number sense, counting, shapes, patterns, addition, fair sharing, fractions and equations, from preschool to middle school.",
      status: "live",
      order: 1,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Count and build with {host}", line: "path.math.title", live: true },
      art: "island-number-hill",
    },
  ],
};

export default pack;
