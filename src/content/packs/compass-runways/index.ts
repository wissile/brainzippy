import type { ContentPack } from "../../types";

/**
 * Compass Rose Runways (ages 10–12), a stop on the Pilot journey (Sky School) between Sky Hoops and Ziggy's Flight
 * Plan. Plan: docs/curriculum/pilot.md §3 world 5 (+ world 3, Windsock Weather Station, for the wind skill).
 * World doc: docs/worlds/compass-runways.md. Educational only: not flight training and not for navigation; every item
 * is flagged for review by a certificated flight or ground instructor.
 *
 * Adds the `pilot.nav` and `pilot.wx` topics and the two skills this world teaches. `pilot.wx.wind` is shared with the
 * planned Windsock Weather Station (ages 7–9), hence its wider age range. `math.geom.angles` stays a soft
 * prerequisite (docs only): a prerequisite no world teaches would lock this world in the daily planner.
 */
const pack: ContentPack = {
  id: "compass-runways",
  title: "Compass Rose Runways (pilot, ages 10–12)",
  topics: [
    { id: "pilot.nav", subject: "pilot", title: "Navigation", description: "Headings from 1 to 360, runway numbers, turning by degrees, and later map reading and time-speed-distance." },
    { id: "pilot.wx", subject: "pilot", title: "Weather", description: "Reading the wind with a windsock, landing into the wind, clouds, fronts and why pilots check the weather." },
  ],
  skills: [
    {
      id: "pilot.wx.wind",
      title: "Reading the wind",
      topic: "pilot.wx",
      ages: [7, 12],
      prerequisites: [],
      objective: "Read a windsock (limp or full, which way it streams), name the wind by where it comes FROM, choose the runway end that faces into the wind, and tell a headwind from a crosswind.",
    },
    {
      id: "pilot.nav.headings",
      title: "Headings and runway numbers",
      topic: "pilot.nav",
      ages: [10, 12],
      prerequisites: ["pilot.wx.wind"],
      objective: "Use headings from 1 to 360 (north is 360) and runway numbers (heading ÷ 10, rounded; the two ends differ by 18), and work out a new heading after turning right or left by degrees, including past 360.",
    },
  ],
  worlds: [
    {
      id: "compass-runways",
      subject: "pilot",
      topic: "pilot.nav",
      skills: ["pilot.wx.wind", "pilot.nav.headings"],
      ages: [10, 12],
      maxLevel: 8,
      title: "Compass Rose Runways",
      gameType: "navigation game",
      blurb: "A storm blew the runway numbers away! Read the wind and paint the runways before the planes land.",
      parentDescription:
        "Children help Ziggy in a fictional airport's control tower: they read a windsock and name the wind by where it comes from, paint runway numbers (the heading divided by ten, rounded; opposite ends differ by 18), rotate a runway on a compass rose, work out new headings after turns (including past 360), choose the runway end that faces into the wind, tell a headwind from a crosswind, and answer short tower calls that combine these. Educational only: this is not flight training and the airport is not for navigation.",
      characters: ["ziggy", "gloop"],
      load: () => import("../../../games/compass-runways/CompassRunways"),
      loadDefinition: () => import("../../../games/compass-runways/definition").then((m) => m.compassRunways),
      voice: "src/games/compass-runways/voice.json",
    },
  ],
};

export default pack;
