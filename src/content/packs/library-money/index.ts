import type { ContentPack } from "../../types";

/**
 * Money library (Market Square). Plan: docs/curriculum/money.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-money",
  title: "Money library",
  libraries: [
    {
      id: "money",
      title: "Money",
      kidTitle: "Market Square",
      host: "budge",
      theme: { main: "#E9A93B", soft: "#FCF1DC", deep: "#7A5310" },
      ages: [7, 14],
      pitch: "Count coins and make plans with Budge.",
      description: "US coins and bills, needs and wants, saving goals and smart choices, aligned with the National Standards for Personal Financial Education. No real money, purchases or product recommendations.",
      status: "coming-soon",
      order: 7,
    },
  ],
};

export default pack;
