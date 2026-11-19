import type { ContentPack } from "../../types";

/**
 * Computer science library (Code Garden). Plan: docs/curriculum/computer-science.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-cs",
  title: "Computer science library",
  libraries: [
    {
      id: "cs",
      title: "Computer science",
      kidTitle: "Code Garden",
      host: "toggle",
      theme: { main: "#A8D83F", soft: "#F1F9DD", deep: "#46650E" },
      ages: [5, 14],
      pitch: "Give Toggle step-by-step instructions.",
      description: "Unplugged-style puzzles about sequences, loops, conditions, debugging and data, aligned with the CSTA computer science standards. No typing or real devices needed.",
      status: "coming-soon",
      order: 4,
    },
  ],
};

export default pack;
