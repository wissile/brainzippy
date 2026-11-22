import type { ContentPack } from "../../types";

/**
 * Computer science library (Code Garden). Plan: docs/curriculum/computer-science.md.
 * Live with its first world, Toggle's Garden Path (docs/worlds/garden-path.md). Metadata only.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * Skill prerequisites stay inside this world for now (cs.seq.follow is practised inside Garden Path's run trace
 * and gets its own skill id when a world teaches it on its own), so the daily planner can unlock the world.
 */
const pack: ContentPack = {
  id: "library-cs",
  title: "Computer science library",
  libraries: [
    {
      id: "cs",
      title: "Computer science",
      kidTitle: "Code Garden",
      host: "toggle",
      theme: { main: "#A8D83F", soft: "#F1F9DD", deep: "#46650E" },
      ages: [5, 14],
      pitch: "Give Toggle step-by-step instructions.",
      description: "Unplugged-style puzzles about sequences, loops, conditions, debugging and data, aligned with the CSTA computer science standards. No typing or real devices needed.",
      status: "live",
      order: 4,
    },
  ],
  topics: [
    { id: "cs.seq", subject: "cs", title: "Sequences and logical instructions", description: "Algorithms as precise, ordered steps; building and decomposing step-by-step programs." },
    { id: "cs.debug", subject: "cs", title: "Testing and debugging", description: "Run a program, find the first step that goes wrong, and fix it." },
    { id: "cs.loop", subject: "cs", title: "Loops", description: "Repeat a step or a group of steps a set number of times." },
  ],
  skills: [
    { id: "cs.seq.build", title: "Build a sequence of moves", topic: "cs.seq", ages: [5, 7], prerequisites: [], objective: "Build a sequence of moves that reaches a goal." },
    { id: "cs.seq.decompose", title: "Break a goal into parts", topic: "cs.seq", ages: [6, 8], prerequisites: ["cs.seq.build"], objective: "Break a goal into sub-goals and plan each part in order." },
    { id: "cs.debug.sequence", title: "Fix the first wrong step", topic: "cs.debug", ages: [6, 8], prerequisites: ["cs.seq.build"], objective: "Find and fix the first wrong step in a sequence." },
    { id: "cs.loop.repeat", title: "Repeat to shorten a program", topic: "cs.loop", ages: [7, 9], prerequisites: ["cs.seq.build"], objective: "Use repeat N to shorten a program, including a repeated two-step pattern." },
    { id: "cs.loop.debug", title: "Fix a repeat", topic: "cs.loop", ages: [8, 10], prerequisites: ["cs.loop.repeat", "cs.debug.sequence"], objective: "Fix a wrong repeat count or a wrong step inside a repeat." },
  ],
  worlds: [
    {
      id: "garden-path",
      subject: "cs",
      topic: "cs.seq",
      skills: ["cs.seq.build", "cs.seq.decompose", "cs.debug.sequence", "cs.loop.repeat", "cs.loop.debug"],
      // playable from 5 (levels 0–3); decomposing/debugging are rated 6–8, loops 7–9 and fixing loops 8–10
      ages: [5, 10],
      maxLevel: 8,
      title: "Toggle's Garden Path",
      gameType: "coding game",
      blurb: "Plan Toggle's path to the berries with arrow cards!",
      parentDescription:
        "Children build a short program from arrow cards, press Go and watch Toggle follow it step by step on a garden grid. Later levels add rocks to plan around, a berry to visit first, programs with one wrong step to find and fix, and repeat cards. Any program that works is accepted; a miss replays the run and stops at the first wrong step, then shows a worked example.",
      characters: ["toggle", "puff"],
      load: () => import("../../../games/garden-path/GardenPath"),
      loadDefinition: () => import("../../../games/garden-path/definition").then((m) => m.gardenPath),
      voice: "src/games/garden-path/voice.json",
    },
  ],
};

export default pack;
