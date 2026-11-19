import type { ContentPack } from "../../types";

/**
 * Digital safety library (Safety Lookout). Plan: docs/curriculum/cyber.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-cyber",
  title: "Digital safety library",
  libraries: [
    {
      id: "cyber",
      title: "Digital safety",
      kidTitle: "Safety Lookout",
      host: "fenn",
      theme: { main: "#4F5BD5", soft: "#E8EAFA", deep: "#2E379A" },
      ages: [7, 14],
      pitch: "Spot tricks and stay safe online with Fenn.",
      description: "Recognising tricky messages, keeping personal information private, strong passwords and kind online habits, aligned with CISA and FTC guidance. Every name, message and web address is fictional.",
      status: "coming-soon",
      order: 10,
    },
  ],
};

export default pack;
