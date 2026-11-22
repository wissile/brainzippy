import type { Exercise, GameDefinition } from "../../engine/types";
import { PC_AGES, PC_MAX_LEVEL, SKILL, TUTORIAL_MISSION, exerciseFor, generatePostcardTrip } from "./generator";

/**
 * Yonder's Postcard Trip — DATA only. Missions are generated per round (./generator.ts); the guided tutorial is
 * authored. Spec: docs/curriculum/geography.md §4 ("Pico's Postcard Trip"; the host is Yonder).
 * Pedagogy, accuracy policy and standards alignment: docs/worlds/postcard-trip.md.
 * Skills (packs/library-geo):
 *   geo.map.directions     compass moves on the island, directions between continents, trip order   levels 0–2, 7, 9
 *   geo.map.key            read symbols with a map key                                                level 3
 *   geo.map.grid           grid references, letter then number                                       level 4
 *   geo.world.continents   find the 7 continents                                                     levels 5, 9
 *   geo.world.oceans       find the 5 oceans                                                         levels 6–7, 9
 *   geo.world.equator      north/south of the equator; opposite seasons                              levels 8–9
 */
export const tripTutorial: Exercise = {
  ...exerciseFor(TUTORIAL_MISSION, { id: "pc-tutorial-north", seed: 61, tutorial: true }),
  difficulty: 1,
};

export const postcardTrip: GameDefinition = {
  id: "postcard-trip",
  title: "Yonder's Postcard Trip",
  mascot: "yonder",
  ages: PC_AGES,
  skillIds: [SKILL.directions, SKILL.key, SKILL.gridRef, SKILL.continents, SKILL.oceans, SKILL.equator],
  learningObjective:
    "Use compass directions, a map key and grid references on an island map, then find continents and oceans, read directions between continents, and tell north from south of the equator on a world map.",
  progression: { roundLength: 8, maxLevel: PC_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [tripTutorial],
  generate: generatePostcardTrip,
  achievement: { id: "explorer-sticker", title: "Explorer Sticker" },
};
