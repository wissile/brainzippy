import data from "./dialogues.json";
import type { Dialogue, DialogueBeat } from "./types";

/** Every authored dialogue by id (data: dialogues.json). */
export const DIALOGUES: Readonly<Record<string, Dialogue>> = Object.fromEntries(
  Object.entries(data.dialogues as Record<string, { beats: DialogueBeat[] }>).map(([id, d]) => [id, { id, beats: d.beats }]),
);

export const getDialogue = (id: string): Dialogue | undefined => DIALOGUES[id];

/** Speakers in order of first appearance: the default left-to-right stage order. */
export function dialogueSpeakers(d: Dialogue): string[] {
  return [...new Set(d.beats.map((b) => b.speaker))];
}
