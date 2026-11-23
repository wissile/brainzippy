import type { ContentPack } from "../../types";

/**
 * Social and emotional skills library (Calm Cove). Plan: docs/curriculum/social-emotional.md.
 * Live with its first world, Snug's Feelings Garden (docs/worlds/feelings-garden.md). Metadata only.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * CASEL is a framework, not a coded standard: skills name the competency they practise. Skill practice, not therapy.
 */
const pack: ContentPack = {
  id: "library-sel",
  title: "Social and emotional skills library",
  libraries: [
    {
      id: "sel",
      title: "Social and emotional skills",
      kidTitle: "Calm Cove",
      host: "snug",
      theme: { main: "#FFBE98", soft: "#FFF1E8", deep: "#7A3E6B" },
      ages: [4, 12],
      pitch: "Name feelings and find kind choices with Snug.",
      description: "Practises naming feelings, calm-down strategies and kind choices through stories, aligned with the CASEL 5 competencies. It is skill practice, not therapy or assessment.",
      status: "live",
      order: 8,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Understand feelings with {host}", line: "path.sel.title", live: false },
    },
  ],
  topics: [
    { id: "sel.feel", subject: "sel", title: "Naming feelings", description: "Naming feelings from faces, bodies and what happened (CASEL: self-awareness, social awareness)." },
    { id: "sel.calm", subject: "sel", title: "Calm-down strategies", description: "Breathing, pausing, asking for a break or for help (CASEL: self-management)." },
    { id: "sel.kind", subject: "sel", title: "Kind actions", description: "Noticing what a friend needs and choosing a kind, helpful action (CASEL: social awareness)." },
    { id: "sel.persp", subject: "sel", title: "Perspective-taking", description: "The same thing can make two friends feel different things (CASEL: social awareness)." },
  ],
  skills: [
    {
      id: "sel.feel.basic",
      title: "Name feelings",
      topic: "sel.feel",
      ages: [4, 6],
      prerequisites: [],
      objective: "Name how a character might feel (happy, sad, angry, scared, surprised) from a clear face and what happened, and know that several feelings can fit.",
    },
    {
      id: "sel.feel.body",
      title: "Body clues",
      topic: "sel.feel",
      ages: [5, 7],
      prerequisites: ["sel.feel.basic"],
      objective: "Notice body clues of feelings (tight fists, hugging knees, jumping, hiding eyes) and name a feeling that fits.",
    },
    {
      id: "sel.kind.notice",
      title: "Kind ideas",
      topic: "sel.kind",
      ages: [5, 9],
      prerequisites: ["sel.feel.basic"],
      objective: "Notice that a friend feels sad or scared and choose a kind action that could help (sit together, help fix it, ask to play).",
    },
    {
      id: "sel.calm.strategy",
      title: "Calm ideas",
      topic: "sel.calm",
      ages: [4, 8],
      prerequisites: ["sel.feel.basic"],
      objective: "Choose a calm, safe strategy for a big angry feeling (slow breaths, counting, a break, telling a grown-up).",
    },
    {
      id: "sel.feel.more",
      title: "More feeling words",
      topic: "sel.feel",
      ages: [6, 8],
      prerequisites: ["sel.feel.body"],
      objective: "Name finer feelings (frustrated, proud, nervous, excited, disappointed, lonely) from what happened, including mixed feelings.",
    },
    {
      id: "sel.persp.two-sides",
      title: "Two friends, two feelings",
      topic: "sel.persp",
      ages: [6, 10],
      prerequisites: ["sel.feel.more"],
      objective: "Show that two characters can feel differently about the same event, and name a feeling for each.",
    },
  ],
  worlds: [
    {
      id: "feelings-garden",
      subject: "sel",
      topic: "sel.feel",
      skills: ["sel.feel.basic", "sel.feel.body", "sel.kind.notice", "sel.calm.strategy", "sel.feel.more", "sel.persp.two-sides"],
      ages: [4, 7],
      maxLevel: 8,
      title: "Snug's Feelings Garden",
      gameType: "feelings game",
      blurb: "Help Snug's friends feel understood, and watch their flower beds bloom!",
      parentDescription:
        "Children meet the Critter Crew in short, everyday stories (a melted ice lolly, a fallen tower, waiting for a turn) and bring a feeling flower to the friend: happy, sad, angry, scared or surprised, and later frustrated, proud, nervous, excited, disappointed or lonely. Clues move from clear faces to what happened, then to body language alone. Later levels ask what kind or calm thing a friend could do, and show two friends feeling differently about the same event. Several feelings are accepted where they fit, a less kind idea gets a gentle question instead of a wrong sound, and an optional breathing flower offers calm-down practice. It practises naming feelings and choosing kind actions through stories; it is not therapy or assessment.",
      characters: ["snug", "rumble", "bobbo", "zuzu", "gloop", "hoot", "puff"],
      load: () => import("../../../games/feelings-garden/FeelingsGarden"),
      loadDefinition: () => import("../../../games/feelings-garden/definition").then((m) => m.feelingsGarden),
      voice: "src/games/feelings-garden/voice.json",
    },
  ],
};

export default pack;
