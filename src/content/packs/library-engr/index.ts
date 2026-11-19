import type { ContentPack } from "../../types";

/**
 * Engineering library (Build Yard). Plan: docs/curriculum/engineering.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-engr",
  title: "Engineering library",
  libraries: [
    {
      id: "engr",
      title: "Engineering",
      kidTitle: "Build Yard",
      host: "brix",
      theme: { main: "#34557A", soft: "#E4EBF3", deep: "#22384F" },
      ages: [7, 14],
      pitch: "Build, test and improve with Brix.",
      description: "Virtual design challenges: define a problem, build, test and improve, aligned with the NGSS engineering design standards. Strengths in the games are teaching values, not real engineering data.",
      status: "coming-soon",
      order: 9,
    },
  ],
};

export default pack;
