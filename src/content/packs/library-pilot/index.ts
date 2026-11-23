import type { ContentPack } from "../../types";

/**
 * Pilot ground school library (Sky School). Plan: docs/curriculum/pilot.md. Live since its first world, Zephy's
 * Sky Hoops (docs/worlds/sky-hoops.md). Host declared in packs/library-hosts (art: src/characters/library).
 * Educational only: not FAA-approved training, not flight instruction, and never for navigation. Every pilot item
 * is flagged for review by an FAA-certificated flight or ground instructor before it is promoted beyond this world.
 * `pilot.flight.parts` (the spec's prerequisite for the axes and forces skills) gets an id with Hangar Builder: a
 * prerequisite that no world teaches yet would lock this world in the daily planner.
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
      status: "live",
      order: 11,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Learn to fly with {host}", line: "path.pilot.title", live: false },
    },
  ],
  topics: [
    { id: "pilot.controls", subject: "pilot", title: "Flight controls", description: "Pitch, roll and yaw: the stick moves the elevator and ailerons, the pedals move the rudder, and a plane turns by banking." },
    { id: "pilot.flight", subject: "pilot", title: "How planes fly", description: "The parts of a plane and the four forces: lift, weight, thrust and drag." },
  ],
  skills: [
    {
      id: "pilot.controls.axes",
      title: "Pitch, roll and yaw",
      topic: "pilot.controls",
      ages: [6, 9],
      prerequisites: [],
      objective: "Move the right control to pitch, roll or yaw the plane and name the movement: stick back = nose up, stick left = roll left, left pedal = nose left.",
    },
    {
      id: "pilot.controls.turn",
      title: "Turning by banking",
      topic: "pilot.controls",
      ages: [7, 9],
      prerequisites: ["pilot.controls.axes"],
      objective: "Explain that a plane turns by banking (tipping its wings), not by the rudder alone, and plan a short course of stick moves.",
    },
    {
      id: "pilot.flight.four-forces",
      title: "The four forces",
      topic: "pilot.flight",
      ages: [6, 9],
      prerequisites: [],
      objective: "Name lift, weight, thrust and drag and their directions, and know that in steady level flight lift equals weight and thrust equals drag.",
    },
  ],
  worlds: [
    {
      id: "sky-hoops",
      subject: "pilot",
      topic: "pilot.controls",
      skills: ["pilot.controls.axes", "pilot.controls.turn", "pilot.flight.four-forces"],
      ages: [6, 9],
      maxLevel: 9,
      title: "Zephy's Sky Hoops",
      gameType: "flying game",
      blurb: "Steer Zephy's little red plane through the sky hoops with the stick and pedals!",
      parentDescription:
        "Children steer a small plane through hoops with an on-screen control stick and rudder pedals and watch it respond: stick back pitches the nose up, stick left rolls the wings left, a pedal yaws the nose. Levels move from one hoop above or below, to naming pitch, roll and yaw and the part that moved (elevator, ailerons, rudder), to turning by tipping the wings, the four forces (lift, weight, thrust, drag) and planning a three-hoop course. Lift is explained as the wings pushing air down. The flight is simplified for play. Educational only: this is not flight training.",
      characters: ["zephy", "bobbo"],
      load: () => import("../../../games/sky-hoops/SkyHoops"),
      loadDefinition: () => import("../../../games/sky-hoops/definition").then((m) => m.skyHoops),
      voice: "src/games/sky-hoops/voice.json",
    },
  ],
};

export default pack;
