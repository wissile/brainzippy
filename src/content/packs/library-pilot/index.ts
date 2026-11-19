import type { ContentPack } from "../../types";

/**
 * Pilot ground school library (Sky School). Plan: docs/curriculum/pilot.md.
 * Coming soon: shown as a teaser shelf in Explore; no play, no public page. Flip `status` to "live" with its first world.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 */
const pack: ContentPack = {
  id: "library-pilot",
  title: "Pilot ground school library",
  libraries: [
    {
      id: "pilot",
      title: "Pilot ground school",
      kidTitle: "Sky School",
      host: "zephy",
      theme: { main: "#E5484D", soft: "#FDE8E9", deep: "#A1181D" },
      ages: [6, 14],
      pitch: "Learn how planes fly with Zephy.",
      description: "How planes fly, weather, maps and checklists, aligned with the FAA Private Pilot knowledge areas. Educational only: not FAA-approved training and not for navigation.",
      status: "coming-soon",
      order: 11,
    },
  ],
};

export default pack;
