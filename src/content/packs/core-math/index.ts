import type { ContentPack } from "../../types";

/**
 * Core maths pack: the Critter Crew and the first four Monster Island worlds.
 * Metadata only — game code/data load lazily. Skills mirror docs/CURRICULUM.md; characters docs/CHARACTER_SYSTEM.md.
 */
const pack: ContentPack = {
  id: "core-math",
  title: "Core maths (ages 4–9)",
  subjects: [{ id: "math", title: "Maths", description: "Number sense, counting, addition and early division through story games." }],
  topics: [
    { id: "math.counting", subject: "math", title: "Counting" },
    { id: "math.addition", subject: "math", title: "Addition" },
    { id: "math.division", subject: "math", title: "Sharing and division" },
  ],
  skills: [
    { id: "math.count.one-to-one", title: "One-to-one counting", topic: "math.counting", ages: [3, 6], prerequisites: [], objective: "Touch each object exactly once while saying one number per object." },
    { id: "math.count.cardinality", title: "How many? (cardinality)", topic: "math.counting", ages: [4, 6], prerequisites: ["math.count.one-to-one"], objective: "Know that the last number counted tells how many." },
    { id: "math.count.subitize", title: "Seeing small numbers at a glance", topic: "math.counting", ages: [4, 6], prerequisites: ["math.count.one-to-one"], objective: "Recognise 1–5 at a glance and use ten-frame structure for 6–9." },
    { id: "math.count.make-set", title: "Counting out a set", topic: "math.counting", ages: [4, 6], prerequisites: ["math.count.cardinality"], objective: "Count out a requested number from a larger group, and stop." },
    { id: "math.add.number-line", title: "Adding on a number line", topic: "math.addition", ages: [5, 7], prerequisites: ["math.count.cardinality"], objective: "Add by moving forward on an evenly spaced number line, counting on from the start." },
    { id: "math.add.within-20", title: "Adding within 20", topic: "math.addition", ages: [6, 8], prerequisites: ["math.add.number-line"], objective: "Add two numbers within 20 by counting on from the larger number and by making ten." },
    { id: "math.div.share-equally", title: "Sharing equally", topic: "math.division", ages: [7, 9], prerequisites: ["math.count.make-set", "math.add.within-20"], objective: "Share a quantity equally into groups by dealing one at a time, and say how many each group gets." },
  ],
  characters: [
    { id: "bobbo", name: "Bobbo", blurb: "Pear-shaped, warm and eager worrier with tiny wings (counting buddy)." },
    { id: "zuzu", name: "Zuzu", blurb: "Tall, floppy, a little dramatic three-eyed monster (spelling buddy)." },
    { id: "gloop", name: "Gloop", blurb: "Wobbly, curious jelly with one giant eye (shapes buddy)." },
    { id: "hoot", name: "Hoot", blurb: "Mossy owl storyteller in reading specs (reading buddy)." },
    { id: "rumble", name: "Rumble", blurb: "Gentle, slow, sleepy creature with a star horn (measuring buddy)." },
    { id: "puff", name: "Puff", blurb: "Cloud-headed monster who drifts in when sums get tricky (times-tables buddy)." },
  ],
  worlds: [
    {
      id: "counting-adventure",
      subject: "math",
      topic: "math.counting",
      skills: ["math.count.one-to-one", "math.count.cardinality", "math.count.subitize", "math.count.make-set"],
      ages: [4, 6],
      maxLevel: 7,
      title: "Bobbo's Breakfast",
      gameType: "counting game",
      blurb: "Help Bobbo find and count his breakfast snacks!",
      parentDescription:
        "Children count up to 10 objects by touching each one, say how many there are, recognise small amounts at a glance, and count out a requested number into a basket. Quantities grow level by level, with spoken hints and a modelled answer after two tries.",
      characters: ["bobbo", "hoot"],
      load: () => import("../../../games/counting-adventure/CountingAdventure"),
      loadDefinition: () => import("../../../games/counting-adventure/definition").then((m) => m.countingAdventure),
      voice: "src/games/counting-adventure/voice.json",
      map: { x: 20, y: 72 },
    },
    {
      id: "glow-cave-hops",
      subject: "math",
      topic: "math.addition",
      skills: ["math.add.number-line"],
      ages: [5, 7],
      maxLevel: 3,
      title: "Glow Cave Hops",
      gameType: "number line game",
      blurb: "Hop the mine cart along the number line to light up the cave!",
      parentDescription:
        "Children add by moving a cart forward along an evenly spaced, labelled number line, counting on one hop at a time. Lines grow from 0–5 to 0–20.",
      characters: ["gloop", "zuzu"],
      load: () => import("../../../games/glow-cave-hops/GlowCaveHops"),
      loadDefinition: () => import("../../../games/glow-cave-hops/definition").then((m) => m.glowCaveHops),
      voice: "src/games/glow-cave-hops/voice.json",
      map: { x: 26, y: 38 },
    },
    {
      id: "sky-balloon-race",
      subject: "math",
      topic: "math.addition",
      skills: ["math.add.within-20"],
      ages: [6, 8],
      maxLevel: 3,
      title: "Sky Balloon Race",
      gameType: "addition game",
      blurb: "Add the numbers and fly Bobbo's balloon to the finish!",
      parentDescription:
        "Children add two numbers within 20 by counting on from the larger number and by making ten, with a ten-frame worked example when they need help.",
      characters: ["puff", "bobbo"],
      load: () => import("../../../games/sky-balloon-race/SkyBalloonRace"),
      loadDefinition: () => import("../../../games/sky-balloon-race/definition").then((m) => m.skyBalloonRace),
      voice: "src/games/sky-balloon-race/voice.json",
      map: { x: 76, y: 30 },
    },
    {
      id: "cookie-kitchen",
      subject: "math",
      topic: "math.division",
      skills: ["math.div.share-equally"],
      ages: [7, 9],
      maxLevel: 3,
      title: "Cookie Kitchen",
      gameType: "sharing game",
      blurb: "Share Rumble's cookies fairly so every plate gets the same!",
      parentDescription:
        "Children share up to 20 cookies equally between 2–5 plates by dealing one at a time, check that every plate has the same, and say how many each plate gets — an early model of division.",
      characters: ["rumble", "hoot"],
      load: () => import("../../../games/cookie-kitchen/CookieKitchen"),
      loadDefinition: () => import("../../../games/cookie-kitchen/definition").then((m) => m.cookieKitchen),
      voice: "src/games/cookie-kitchen/voice.json",
      map: { x: 80, y: 70 },
    },
  ],
};

export default pack;
