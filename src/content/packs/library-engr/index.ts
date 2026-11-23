import type { ContentPack } from "../../types";

/**
 * Engineering library (Build Yard). Plan: docs/curriculum/engineering.md.
 * Live with its first world, Brix's Budget Bridge (docs/worlds/budget-bridge.md). Metadata only.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * Skill prerequisites stay inside this world for now (the spec's soft links to maths shapes and money budgets get
 * added when those skills exist), so the daily planner can unlock the world.
 */
const pack: ContentPack = {
  id: "library-engr",
  title: "Engineering library",
  libraries: [
    {
      id: "engr",
      title: "Engineering",
      kidTitle: "Build Yard",
      host: "brix",
      theme: { main: "#34557A", soft: "#E4EBF3", deep: "#22384F" },
      ages: [7, 14],
      pitch: "Build, test and improve with Brix.",
      description: "Virtual design challenges: define a problem, build, test and improve, aligned with the NGSS engineering design standards. Strengths in the games are teaching values, not real engineering data.",
      status: "live",
      order: 9,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Build like an engineer with {host}", line: "path.engr.title", live: false },
    },
  ],
  topics: [
    { id: "engr.struct", subject: "engr", title: "Structures", description: "Spans, supports, materials, triangles, loads and cost." },
    { id: "engr.design", subject: "engr", title: "The design process", description: "Criteria and constraints, comparing designs, and improving a design after a test." },
  ],
  skills: [
    {
      id: "engr.struct.span-load",
      title: "Span, supports and load",
      topic: "engr.struct",
      ages: [8, 12],
      prerequisites: [],
      objective: "Trade span, material, supports and cost to carry a load: shorter spans carry more, supports split a span, stronger materials cost more.",
    },
    {
      id: "engr.struct.triangle",
      title: "Triangles make it strong",
      topic: "engr.struct",
      ages: [8, 12],
      prerequisites: ["engr.struct.span-load"],
      objective: "Explain that triangles keep their shape, and use triangle braces across a whole span to make it stronger.",
    },
    {
      id: "engr.design.criteria",
      title: "Criteria and constraints",
      topic: "engr.design",
      ages: [7, 10],
      prerequisites: ["engr.struct.span-load"],
      objective: "Tell what a design must do (criteria: carry the bus) from its limits (constraints: the budget, where pillars can stand) and meet both.",
    },
    {
      id: "engr.design.iterate",
      title: "Test and improve",
      topic: "engr.design",
      ages: [8, 12],
      prerequisites: ["engr.design.criteria", "engr.struct.triangle"],
      objective: "Use a test result to find the weak part of a design and improve only that part, within a constraint.",
    },
  ],
  worlds: [
    {
      id: "budget-bridge",
      subject: "engr",
      topic: "engr.struct",
      skills: ["engr.struct.span-load", "engr.struct.triangle", "engr.design.criteria", "engr.design.iterate"],
      ages: [8, 12],
      maxLevel: 8,
      title: "Brix's Budget Bridge",
      gameType: "engineering game",
      blurb: "Build a bridge strong enough for the school bus, without blowing Budge's budget!",
      parentDescription:
        "Children design a bridge across a river gap from wood planks, steel beams, pillars and triangle braces, each with a price, then press Test and watch a vehicle drive across. Each span bends a little under the load; a span that is too weak sags and is highlighted, and the vehicle backs off safely. Later levels add heavier vehicles, deep water where pillars can't stand, tight budgets, and a ready-made bridge with one weak span to improve. Any design that holds the vehicle within the budget is accepted. The strengths and prices are simplified game numbers, not real engineering data.",
      characters: ["brix", "budge"],
      load: () => import("../../../games/budget-bridge/BudgetBridge"),
      loadDefinition: () => import("../../../games/budget-bridge/definition").then((m) => m.budgetBridge),
      voice: "src/games/budget-bridge/voice.json",
    },
  ],
};

export default pack;
