import type { ContentPack } from "../../types";

/**
 * Ziggy's Busy Airport (ages 3–5): the first stop of the Pilot journey ("Learn to fly with Ziggy", Sky School).
 * Adds the `pilot.airport` topic with two skills (sorting bags, following marshalling signals) and reuses the
 * counting skills from core-math and `math.pattern.repeat` from math-pattern-parade. Host: Ziggy (packs/library-hosts),
 * helper: Hoot. Educational only, like the rest of the pilot library: playful airport jobs, not flight training.
 * Metadata only — game code and data load lazily. Pedagogy: docs/worlds/busy-airport.md.
 */
const pack: ContentPack = {
  id: "busy-airport",
  title: "Pilot: Ziggy's Busy Airport (ages 3–5)",
  topics: [
    {
      id: "pilot.airport",
      subject: "pilot",
      title: "At the airport",
      description: "Early-years airport jobs: sorting bags, boarding passengers, runway light patterns and following a marshaller's signals.",
    },
  ],
  skills: [
    {
      id: "pilot.airport.sort",
      title: "Sorting bags",
      topic: "pilot.airport",
      ages: [3, 5],
      prerequisites: [],
      objective: "Sort things by one attribute (colour, or shape while colour changes), then by two attributes at once.",
    },
    {
      id: "pilot.airport.signals",
      title: "Following signals",
      topic: "pilot.airport",
      ages: [3, 5],
      prerequisites: [],
      objective: "Follow simple direction signals (turn left, turn right, go ahead, stop, slow down), then two signals in order.",
    },
  ],
  worlds: [
    {
      id: "busy-airport",
      subject: "pilot",
      topic: "pilot.airport",
      skills: ["pilot.airport.sort", "math.count.one-to-one", "math.count.cardinality", "math.count.make-set", "math.pattern.repeat", "pilot.airport.signals"],
      ages: [3, 5],
      maxLevel: 8,
      title: "Ziggy's Busy Airport",
      gameType: "airport game",
      blurb: "Help Ziggy sort the bags, board the passengers, light the runway and guide a little plane!",
      parentDescription:
        "Four small games in one airport. Children sort suitcases onto planes by colour, then by shape while colours change, then by colour and shape together; board passengers one at a time and say how many got on (up to 10), or count out exactly the number Ziggy needs; continue repeating runway-light patterns (AB, AAB, ABB, ABC) and find a missing light; and follow a marshaller's signals to steer a taxiing plane left, right, ahead, stop or slow down. Everything is spoken and picture-based, there is no time pressure, and hints show the strategy before a modelled answer. Educational play only: not flight training.",
      characters: ["ziggy", "hoot"],
      load: () => import("../../../games/busy-airport/BusyAirport"),
      loadDefinition: () => import("../../../games/busy-airport/definition").then((m) => m.busyAirport),
      voice: "src/games/busy-airport/voice.json",
    },
  ],
};

export default pack;
