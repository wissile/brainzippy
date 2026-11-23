/** Character dialogues: data, player and scene. See docs/ANIMATION_AUDIO.md > Dialogue. */
export { DialogueScene, type ActorRenderProps, type DialogueSceneProps } from "./DialogueScene";
export { DIALOGUES, dialogueSpeakers, getDialogue } from "./dialogues";
export { DEFAULT_PAUSE_MS, MIN_BEAT_MS, playDialogue, readingTimeMs, speechCapMs, type DialogueHandle, type PlayOptions } from "./player";
export { audioVoice } from "./audioVoice";
export { useDialogue, type DialogueState } from "./useDialogue";
export type { Dialogue, DialogueBeat, DialogueCaption, DialogueEnd, DialogueVoice } from "./types";
