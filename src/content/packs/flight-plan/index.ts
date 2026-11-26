import type { ContentPack } from "../../types";

/**
 * Ziggy's Flight Plan (ages 12–14), the last stop of the Pilot journey ("Learn to fly with Ziggy", Sky School).
 * Pedagogy and instructor-review flags: docs/worlds/flight-plan.md. Spec: docs/curriculum/pilot.md §2–3.
 * Educational only: not FAA-approved training, not flight instruction, never for navigation; the model wing, chart,
 * weather stations, METARs and minimums card are fictional. Every item needs review by an FAA-certificated flight
 * or ground instructor before release.
 *
 * Topics and skills are new ids (none existed in library-pilot). Prerequisites stay inside this world or point at
 * a registered skill whose age range ends below 12 (pilot.flight.four-forces, taught by Sky Hoops, so it is assumed
 * by age and never locks the world). Soft prerequisites, documented only: pilot.nav.pilotage / nav.headings for
 * time-speed-distance, pilot.wx.fronts / wx.wind for METARs (not registered yet; registering them here would lock
 * the world in the daily planner).
 */
const pack: ContentPack = {
  id: "flight-plan",
  title: "Ziggy's Flight Plan (pilot, ages 12–14)",
  // pilot.nav and pilot.wx are registered by compass-runways (one copy per topic id)
  topics: [
    { id: "pilot.aero", subject: "pilot", title: "Aerodynamics", description: "Angle of attack, lift and the stall: a wing stalls past its critical angle of attack, at any speed." },
    { id: "pilot.reg", subject: "pilot", title: "Pre-flight action", description: "What a pilot checks before a flight, and in what order." },
    { id: "pilot.adm", subject: "pilot", title: "Decision-making", description: "Is the pilot fit to fly (IMSAFE), and is it a go or a no-go?" },
  ],
  skills: [
    {
      id: "pilot.aero.aoa",
      title: "Angle of attack and the stall",
      topic: "pilot.aero",
      ages: [11, 14],
      prerequisites: ["pilot.flight.four-forces"],
      objective: "Explain that lift grows with angle of attack and airspeed, that a wing stalls past its critical angle of attack at any speed (not because the engine stops), and that lowering the nose recovers from a stall.",
    },
    {
      id: "pilot.nav.tsd",
      title: "Time, speed and distance",
      topic: "pilot.nav",
      ages: [10, 14],
      prerequisites: [],
      objective: "Use time = distance ÷ groundspeed (in minutes) for a leg, find groundspeed from airspeed and a head- or tailwind, round to the nearest minute and add legs.",
    },
    {
      id: "pilot.wx.metar",
      title: "Reading a METAR",
      topic: "pilot.wx",
      ages: [12, 14],
      prerequisites: [],
      objective: "Decode simplified METAR groups (time in Zulu, wind from a direction, visibility in statute miles, cloud cover and base in hundreds of feet, temperature and dew point) and compare them with a minimums card.",
    },
    {
      id: "pilot.reg.preflight",
      title: "Pre-flight planning and checks",
      topic: "pilot.reg",
      ages: [12, 14],
      prerequisites: [],
      objective: "Put pre-flight steps in a sensible order and spot a missing planning item (weather, fuel and reserve, runway lengths, take-off and landing distances, a plan B).",
    },
    {
      id: "pilot.adm.risk",
      title: "Go / no-go decisions",
      topic: "pilot.adm",
      ages: [12, 14],
      prerequisites: ["pilot.reg.preflight"],
      objective: "Use IMSAFE to judge whether a pilot is fit to fly and combine route, weather, pilot and plane into a go, wait or no-go decision, without giving in to pressure to get there.",
    },
  ],
  worlds: [
    {
      id: "flight-plan",
      subject: "pilot",
      topic: "pilot.adm",
      skills: ["pilot.aero.aoa", "pilot.nav.tsd", "pilot.wx.metar", "pilot.reg.preflight", "pilot.adm.risk"],
      ages: [12, 14],
      maxLevel: 7,
      title: "Ziggy's Flight Plan",
      gameType: "flight-planning game",
      blurb: "Plan Ziggy's flight to the island festival: the wing, the route, the weather, the checklist and the final call.",
      parentDescription:
        "A flight-planning room with four inner games. In a wind tunnel, children tilt a fictional model wing and watch smoke streams, a lift meter and a graph to find the angle where it stalls, and learn that a stall is about the wing's angle, not the engine or the speed. On a fictional chart they time each leg with time = distance ÷ groundspeed, later with head- and tailwinds. They decode simplified weather reports (METARs) and compare them with a practice minimums card, order a pre-flight checklist and use the IMSAFE check. Every round ends with a go / no-go briefing. Charts, weather and minimums are made up. Educational only: this is not flight training or FAA-approved ground training, and nothing here is for navigation.",
      characters: ["ziggy", "dabble", "bobbo"],
      load: () => import("../../../games/flight-plan/FlightPlan"),
      loadDefinition: () => import("../../../games/flight-plan/definition").then((m) => m.flightPlan),
      voice: "src/games/flight-plan/voice.json",
    },
  ],
};

export default pack;
