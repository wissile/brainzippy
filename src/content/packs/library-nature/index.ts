import type { ContentPack } from "../../types";

/**
 * Nature and oceans library (Wild Shore). Plan: docs/curriculum/nature.md. Live since its first world,
 * Ripple's Reef Rescue (docs/worlds/reef-rescue.md). Host declared in packs/library-hosts (art:
 * src/characters/library); referenced here by id only.
 * Prerequisites are registered only inside skills a world teaches (the spec's sci.life.needs and
 * nature.web.decomposers have no world yet; registering them would lock this world in the daily planner).
 */
const pack: ContentPack = {
  id: "library-nature",
  title: "Nature and oceans library",
  libraries: [
    {
      id: "nature",
      title: "Nature and oceans",
      kidTitle: "Wild Shore",
      host: "ripple",
      theme: { main: "#8EE3C8", soft: "#E6F9F2", deep: "#1C6B53" },
      ages: [5, 14],
      pitch: "Meet animals and their homes with Ripple.",
      description: "Habitats, food webs, oceans and caring for the environment, aligned with NGSS life and earth science. Facts first, always with what people are doing to help.",
      status: "live",
      order: 5,
    },
  ],
  topics: [
    { id: "nature.habitat", subject: "nature", title: "Habitats and needs", description: "What living things need (food, light, the right ground, shelter) and where they live." },
    { id: "nature.web", subject: "nature", title: "Food chains and food webs", description: "Producers and consumers, energy flowing from the sun through food chains, and how changes ripple through a web." },
    { id: "nature.reef", subject: "nature", title: "Coral reefs", description: "Corals and their algae partners, bleaching, and the actions that help reefs recover." },
  ],
  skills: [
    {
      id: "nature.habitat.needs",
      title: "What living things need",
      topic: "nature.habitat",
      ages: [5, 8],
      prerequisites: [],
      objective: "Match animals and plants to the food and habitat that meet their needs (food, light, the right ground, shelter).",
    },
    {
      id: "nature.web.chain",
      title: "Food chains",
      topic: "nature.web",
      ages: [7, 10],
      prerequisites: ["nature.habitat.needs"],
      objective: "Build a food chain from the sun to a top predator, with arrows showing energy moving from food to eater.",
    },
    {
      id: "nature.web.change",
      title: "Changes ripple through a food web",
      topic: "nature.web",
      ages: [9, 13],
      prerequisites: ["nature.web.chain"],
      objective: "Predict how removing or returning a species (such as algae-eating grazers) changes the rest of the ecosystem.",
    },
    {
      id: "nature.reef.coral",
      title: "Corals and their partners",
      topic: "nature.reef",
      ages: [8, 12],
      prerequisites: ["nature.web.chain"],
      objective: "Explain that corals are animals with tiny algae partners that make food and give them colour.",
    },
    {
      id: "nature.reef.bleaching",
      title: "Coral bleaching",
      topic: "nature.reef",
      ages: [9, 12],
      prerequisites: ["nature.reef.coral"],
      objective: "Explain bleaching (water that stays too warm makes corals push out their algae and turn white and weak) and read a temperature chart to find the riskiest weeks.",
    },
    {
      id: "nature.reef.restore",
      title: "Helping reefs recover",
      topic: "nature.reef",
      ages: [9, 12],
      prerequisites: ["nature.reef.bleaching"],
      objective: "Choose actions that help reefs recover and plan where new coral can grow.",
    },
  ],
  worlds: [
    {
      id: "reef-rescue",
      subject: "nature",
      topic: "nature.reef",
      skills: ["nature.habitat.needs", "nature.web.chain", "nature.reef.coral", "nature.reef.bleaching", "nature.reef.restore", "nature.web.change"],
      ages: [8, 12],
      maxLevel: 9,
      title: "Ripple's Reef Rescue",
      gameType: "ecosystem restoration game",
      blurb: "Help Ripple bring a pale coral reef back to colour!",
      parentDescription:
        "Children restore a coral reef by placing real reef species where their needs are met: each animal to the food it eats, coral and seagrass where they get light and the right ground, and cards into food chains that start with the sun. Later levels cover how corals and their algae partners help each other, why reefs bleach in water that stays too warm and how they can recover, sorting actions that help or harm a reef, bringing back algae-eating fish, planting coral on a restoration frame, and reading an example sea-temperature chart. Facts follow NOAA; problems are always shown alongside what people do to help.",
      characters: ["ripple", "dabble"],
      load: () => import("../../../games/reef-rescue/ReefRescue"),
      loadDefinition: () => import("../../../games/reef-rescue/definition").then((m) => m.reefRescue),
      voice: "src/games/reef-rescue/voice.json",
    },
  ],
};

export default pack;
