import type { ContentPack } from "../../types";

/**
 * Maths library (Number Hill). Plan: docs/curriculum/maths.md.
 * Live: its worlds are planned, shown in Explore and published.
 * Host declared in packs/core-math (Critter Crew).
 */
const pack: ContentPack = {
  id: "library-math",
  title: "Maths library",
  libraries: [
    {
      id: "math",
      title: "Maths",
      kidTitle: "Number Hill",
      host: "bobbo",
      theme: { main: "#FF9F43", soft: "#FFF0E0", deep: "#8A4500", token: "--bobbo" },
      ages: [4, 14],
      pitch: "Count, add and share with Bobbo.",
      description: "Story games for number sense, counting, shapes, patterns, addition, fair sharing, fractions and equations, from preschool to middle school.",
      status: "live",
      order: 1,
      art: "island-number-hill",
    },
  ],
};

export default pack;
