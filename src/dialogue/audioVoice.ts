import { audio } from "../audio/AudioEngine";
import type { DialogueVoice } from "./types";

/**
 * The real dialogue voice: AudioEngine clips (human > generated per-speaker voice > browser speech).
 * Lines are kept out of the shared caption (emitCaption: false) because DialogueScene captions each line itself
 * with the speaker's name; this avoids the line being shown or announced twice.
 */
export const audioVoice: DialogueVoice = {
  isMuted: () => audio.isMuted(),
  speak: (line, vars) => audio.speak(line, vars ?? {}, { emitCaption: false }),
  stop: () => audio.stopVoice(),
};
