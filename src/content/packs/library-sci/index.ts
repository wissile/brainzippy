import type { ContentPack } from "../../types";

/**
 * Science library (Fizz Lab). Plan: docs/curriculum/science.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-sci",
  title: "Science library",
  libraries: [
    {
      id: "sci",
      title: "Science",
      kidTitle: "Fizz Lab",
      host: "dabble",
      theme: { main: "#FF6B6B", soft: "#FFE9E9", deep: "#A32020" },
      ages: [5, 14],
      pitch: "Test big ideas with Dabble.",
      description: "Virtual science experiments about forces, materials, living things, light, sound and energy, aligned with the Next Generation Science Standards. Children never handle heat, flames or chemicals.",
      status: "coming-soon",
      order: 3,
    },
  ],
};

export default pack;
