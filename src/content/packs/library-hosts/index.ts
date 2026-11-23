import type { ContentPack } from "../../types";

/**
 * Library hosts: one recurring host character per planned subject library (docs/curriculum/CHARACTERS.md).
 * Characters only; libraries add their own subjects, skills and worlds in their own packs and list these
 * ids in `World.characters`. Art: src/characters/library (ids must match LIBRARY_HOSTS; a unit test checks).
 */
const pack: ContentPack = {
  id: "library-hosts",
  title: "Library hosts (characters only)",
  characters: [
    { id: "toggle", name: "Toggle", blurb: "Cheerful, literal-minded caterpillar made of command blocks who finds bugs funny (computer science host)." },
    { id: "zephy", name: "Zephy", blurb: "Brave, careful albatross chick with pilot goggles and a red scarf who loves checklists (pilot host)." },
    { id: "budge", name: "Budge", blurb: "Practical, encouraging badger with a satchel and a list, saving up for a telescope (money host)." },
    { id: "fenn", name: "Fenn", blurb: "Calm, kind fennec fox with huge listening ears and a magnifier monocle (digital safety host)." },
    { id: "dabble", name: "Dabble", blurb: "Curious, slightly messy newt in safety goggles who always asks 'what if we test it?' (science host)." },
    { id: "yonder", name: "Yonder", blurb: "Friendly hermit crab with a sticker-covered globe for a shell who loves pen pals (geography host)." },
    { id: "snug", name: "Snug", blurb: "Gentle, patient wombat with a pouch of calm stones; a good listener (social and emotional skills host)." },
    { id: "brix", name: "Brix", blurb: "Hearty beaver builder in a hard hat who tests things, then makes them better (engineering host)." },
    { id: "ripple", name: "Ripple", blurb: "Caring, observant sea otter in a kelp hat who notices tiny things (nature host)." },
    { id: "ziggy", name: "Ziggy", blurb: "Unflappable capybara pilot with a sky-blue headset, a tiny windsock and a checklist on his knee; curious about weather and maps (Pilot path host)." },
    { id: "sarah", name: "Sarah", blurb: "Story-loving porcupine who writes with a quill from her own back, collects favourite words and can't resist a pun (English path host)." },
  ],
};

export default pack;
