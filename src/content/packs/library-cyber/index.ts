import type { ContentPack } from "../../types";

/**
 * Digital safety library (Safety Lookout). Plan: docs/curriculum/cyber.md.
 * Live with its first world, Fenn's Message Mystery (docs/worlds/message-mystery.md). Metadata only.
 * Host declared in packs/library-hosts (art: src/characters/library); referenced here by id only.
 * `cyber.scam.clues` has no prerequisite yet: the spec's `cyber.privacy.personal-info` gets its id when a world
 * teaches it (Secret Keeper Sort), so the daily planner can unlock this world now.
 */
const pack: ContentPack = {
  id: "library-cyber",
  title: "Digital safety library",
  libraries: [
    {
      id: "cyber",
      title: "Digital safety",
      kidTitle: "Safety Lookout",
      host: "fenn",
      theme: { main: "#4F5BD5", soft: "#E8EAFA", deep: "#2E379A" },
      ages: [7, 14],
      pitch: "Spot tricks and stay safe online with Fenn.",
      description: "Recognising tricky messages, keeping personal information private, strong passwords and kind online habits, aligned with CISA and FTC guidance. Every name, message and web address is fictional.",
      status: "live",
      order: 10,
      // D-034: the library as a path for every age; live once ages 3–14 all have a world (docs/PATHS.md)
      path: { title: "Stay safe online with {host}", line: "path.cyber.title", live: false },
    },
  ],
  topics: [
    { id: "cyber.scam", subject: "cyber", title: "Phishing and scam clues", description: "Spot the clues that a message is a trick, choose a safe action, and check surprising messages another way." },
  ],
  skills: [
    { id: "cyber.scam.clues", title: "Spot trick-message clues", topic: "cyber.scam", ages: [7, 11], prerequisites: [], objective: "Spot clues that a message is a trick: it asks for a secret, offers a prize too good to be true, rushes you, says don't tell, wants a gift card, or its sender, link or file doesn't match." },
    { id: "cyber.scam.action", title: "Choose a safe action", topic: "cyber.scam", ages: [7, 11], prerequisites: ["cyber.scam.clues"], objective: "Choose safe actions for a trick message: don't tap or reply, and show a trusted grown-up." },
    { id: "cyber.scam.verify", title: "Check another way", topic: "cyber.scam", ages: [8, 14], prerequisites: ["cyber.scam.action"], objective: "Check a surprising message another way, with a grown-up, instead of replying to it." },
  ],
  worlds: [
    {
      id: "message-mystery",
      subject: "cyber",
      topic: "cyber.scam",
      skills: ["cyber.scam.clues", "cyber.scam.action", "cyber.scam.verify"],
      ages: [7, 11],
      maxLevel: 9,
      title: "Fenn's Message Mystery",
      gameType: "digital safety game",
      blurb: "Help Fenn spot trick messages and keep Byteberry Town safe!",
      parentDescription:
        "Children inspect short, fictional messages in a pretend town's mailbox and sort them into Safe or Ask a grown-up, using a magnifier to check who really sent a message and where a link really goes. Later levels ask them to circle every clue, choose the safest thing to do, check a surprising message another way, and sort a whole inbox. Every message can be read aloud. Clues follow CISA and FTC consumer guidance on phishing; all names and web addresses are made up and nothing can be clicked. Asking a grown-up is always treated as a good choice.",
      characters: ["fenn", "hoot"],
      load: () => import("../../../games/message-mystery/MessageMystery"),
      loadDefinition: () => import("../../../games/message-mystery/definition").then((m) => m.messageMystery),
      voice: "src/games/message-mystery/voice.json",
    },
  ],
};

export default pack;
