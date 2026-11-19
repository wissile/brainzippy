import type { ContentPack } from "../../types";

/**
 * Geography and cultures library (Postcard Port). Plan: docs/curriculum/geography.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-geo",
  title: "Geography and cultures library",
  libraries: [
    {
      id: "geo",
      title: "Geography and cultures",
      kidTitle: "Postcard Port",
      host: "yonder",
      theme: { main: "#A8714A", soft: "#F5EAE2", deep: "#6B4024" },
      ages: [5, 14],
      pitch: "Travel the world with Yonder.",
      description: "Maps, continents, places and the ways people live around the world, aligned with the National Geography Standards. Maps in the games are for learning, not navigation.",
      status: "coming-soon",
      order: 6,
    },
  ],
};

export default pack;
