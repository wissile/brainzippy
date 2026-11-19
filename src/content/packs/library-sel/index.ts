import type { ContentPack } from "../../types";

/**
 * Social and emotional skills library (Calm Cove). Plan: docs/curriculum/social-emotional.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-sel",
  title: "Social and emotional skills library",
  libraries: [
    {
      id: "sel",
      title: "Social and emotional skills",
      kidTitle: "Calm Cove",
      host: "snug",
      theme: { main: "#FFBE98", soft: "#FFF1E8", deep: "#7A3E6B" },
      ages: [4, 12],
      pitch: "Name feelings and find kind choices with Snug.",
      description: "Practises naming feelings, calm-down strategies and kind choices through stories, aligned with the CASEL 5 competencies. It is skill practice, not therapy or assessment.",
      status: "coming-soon",
      order: 8,
    },
  ],
};

export default pack;
