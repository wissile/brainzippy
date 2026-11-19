import type { ContentPack } from "../../types";

/**
 * Science library (Fizz Lab). Plan: docs/curriculum/science.md. Live since its first world, Dabble's Rocket Lab
 * (docs/worlds/rocket-lab.md). Host declared in packs/library-hosts (art: src/characters/library); referenced by id.
 * Skill prerequisites outside this library's worlds (sci.force.push-pull, sci.force.gravity, multiplication)
 * are not registered yet: a prerequisite no world teaches would lock the world in the daily planner.
 */
const pack: ContentPack = {
  id: "library-sci",
  title: "Science library",
  libraries: [
    {
      id: "sci",
      title: "Science",
      kidTitle: "Fizz Lab",
      host: "dabble",
      theme: { main: "#FF6B6B", soft: "#FFE9E9", deep: "#A32020" },
      ages: [5, 14],
      pitch: "Test big ideas with Dabble.",
      description: "Virtual science experiments about forces, materials, living things, light, sound and energy, aligned with the Next Generation Science Standards. Children never handle heat, flames or chemicals.",
      status: "live",
      order: 3,
    },
  ],
  topics: [{ id: "sci.force", subject: "sci", title: "Forces and motion", description: "Pushes and pulls, balanced and unbalanced forces, gravity, weight and mass, net force and acceleration." }],
  skills: [
    {
      id: "sci.force.balanced",
      title: "Balanced and unbalanced forces",
      topic: "sci.force",
      ages: [8, 10],
      prerequisites: [],
      objective: "Predict motion from balanced or unbalanced forces: a rocket lifts off only when the push up is bigger than the pull down.",
    },
    {
      id: "sci.force.weight-mass",
      title: "Weight and mass",
      topic: "sci.force",
      ages: [9, 12],
      prerequisites: ["sci.force.balanced"],
      objective: "Tell mass from weight: weight = mass × gravity strength, and mass stays the same on the Moon.",
    },
    {
      id: "sci.force.net",
      title: "Net force and acceleration",
      topic: "sci.force",
      ages: [11, 14],
      prerequisites: ["sci.force.weight-mass"],
      objective: "Predict acceleration from net force and mass (a = F ÷ m), and how burning fuel or adding cargo changes it.",
    },
  ],
  worlds: [
    {
      id: "rocket-lab",
      subject: "sci",
      topic: "sci.force",
      skills: ["sci.force.balanced", "sci.force.weight-mass", "sci.force.net"],
      ages: [8, 12],
      maxLevel: 8,
      title: "Dabble's Rocket Lab",
      gameType: "physics experiment game",
      blurb: "Build rockets with Dabble and launch a moon-flower seed to the Moon!",
      parentDescription:
        "Children build a rocket from parts (engines, seed crates, fuel tanks), predict whether it will lift off, and launch it to test the prediction. Force arrows are drawn to scale. Levels move from comparing a push up with a pull down, to weight = mass × gravity on Earth and the Moon, to ranking rockets by acceleration (net force ÷ mass) and planning a mission within a budget. The physics is simplified and labelled: gravity rounded to 10 N/kg and no air resistance.",
      characters: ["dabble", "rumble"],
      load: () => import("../../../games/rocket-lab/RocketLab"),
      loadDefinition: () => import("../../../games/rocket-lab/definition").then((m) => m.rocketLab),
      voice: "src/games/rocket-lab/voice.json",
    },
  ],
};

export default pack;
