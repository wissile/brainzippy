import type { ContentPack } from "../../types";

/**
 * English library (Word Woods). Plan: docs/curriculum/english.md.
 * Live: its worlds are planned, shown in Explore and published.
 * Host declared in packs/core-math (Critter Crew).
 */
const pack: ContentPack = {
  id: "library-english",
  title: "English library",
  libraries: [
    {
      id: "english",
      title: "English",
      kidTitle: "Word Woods",
      host: "hoot",
      theme: { main: "#6BCB77", soft: "#E8F7EA", deep: "#1F6B2B", token: "--hoot" },
      ages: [3, 14],
      pitch: "Play with sounds and words with Hoot.",
      description: "Listening, phonics, reading, spelling and vocabulary through story games, starting with rhymes and sounds for children who can't read yet.",
      status: "live",
      order: 2,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Learn English with {host}", line: "path.english.title", live: false },
      art: "island-word-woods",
    },
  ],
};

export default pack;
