import type { ContentPack } from "../../types";

/**
 * Nature and oceans library (Wild Shore). Plan: docs/curriculum/nature.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-nature",
  title: "Nature and oceans library",
  libraries: [
    {
      id: "nature",
      title: "Nature and oceans",
      kidTitle: "Wild Shore",
      host: "ripple",
      theme: { main: "#8EE3C8", soft: "#E6F9F2", deep: "#1C6B53" },
      ages: [5, 14],
      pitch: "Meet animals and their homes with Ripple.",
      description: "Habitats, food webs, oceans and caring for the environment, aligned with NGSS life and earth science. Facts first, always with what people are doing to help.",
      status: "coming-soon",
      order: 5,
    },
  ],
};

export default pack;
