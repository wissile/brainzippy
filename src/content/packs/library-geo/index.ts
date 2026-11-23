import type { ContentPack } from "../../types";

/**
 * Geography and cultures library (Postcard Port). Plan: docs/curriculum/geography.md.
 * Live with its first world, Yonder's Postcard Trip (docs/worlds/postcard-trip.md). Metadata only.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * Skills and prerequisites follow geography.md §2 for the first six skills; the rest arrive with later worlds.
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
      status: "live",
      order: 6,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Explore the world with {host}", line: "path.geo.title", live: false },
    },
  ],
  topics: [
    { id: "geo.map", subject: "geo", title: "Map basics", description: "Compass directions, map keys, grid references and mental maps." },
    { id: "geo.world", subject: "geo", title: "Continents and oceans", description: "The seven continents, the five oceans, the equator and the hemispheres." },
  ],
  skills: [
    {
      id: "geo.map.directions",
      title: "Compass directions",
      topic: "geo.map",
      ages: [5, 8],
      prerequisites: [],
      objective: "Use north, south, east and west on a map with a compass rose, from one step to a route between continents.",
    },
    {
      id: "geo.map.key",
      title: "Map keys",
      topic: "geo.map",
      ages: [5, 8],
      prerequisites: [],
      objective: "Read the symbols on a map with a map key.",
    },
    {
      id: "geo.map.grid",
      title: "Grid references",
      topic: "geo.map",
      ages: [6, 9],
      prerequisites: ["geo.map.directions"],
      objective: "Find places with grid references: the column letter, then the row number.",
    },
    {
      id: "geo.world.continents",
      title: "The seven continents",
      topic: "geo.world",
      ages: [6, 9],
      prerequisites: ["geo.map.key"],
      objective: "Name and locate the seven continents on a world map, and know that a country sits inside a continent.",
    },
    {
      id: "geo.world.oceans",
      title: "The five oceans",
      topic: "geo.world",
      ages: [6, 9],
      prerequisites: ["geo.world.continents"],
      objective: "Name and locate the five oceans, including the Arctic and Southern oceans.",
    },
    {
      id: "geo.world.equator",
      title: "The equator and hemispheres",
      topic: "geo.world",
      ages: [7, 10],
      prerequisites: ["geo.world.continents"],
      objective: "Tell the northern from the southern hemisphere and know that their seasons are opposite.",
    },
  ],
  worlds: [
    {
      id: "postcard-trip",
      subject: "geo",
      topic: "geo.map",
      skills: ["geo.map.directions", "geo.map.key", "geo.map.grid", "geo.world.continents", "geo.world.oceans", "geo.world.equator"],
      ages: [5, 9],
      maxLevel: 9,
      title: "Yonder's Postcard Trip",
      gameType: "map skills game",
      blurb: "Read the map, steer Yonder and deliver postcards around the world!",
      parentDescription:
        "Children steer Yonder the hermit crab around an island map with north, east, south and west buttons, find places with a map key and grid references, then move to a world map to post postcards to the right continent, sail a boat to the right ocean, follow directions from continent to continent, and decide whether a place is north or south of the equator. Directions are spoken, every drag also works by tapping, and hints show where to look before showing the answer. The world map uses an equal-area projection and teaches the seven-continent model used in US schools (some countries teach five or six). Maps are simplified for learning and show no country borders.",
      characters: ["yonder", "zephy"],
      load: () => import("../../../games/postcard-trip/PostcardTrip"),
      loadDefinition: () => import("../../../games/postcard-trip/definition").then((m) => m.postcardTrip),
      voice: "src/games/postcard-trip/voice.json",
    },
  ],
};

export default pack;
