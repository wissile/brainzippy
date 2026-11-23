import type { MascotState } from "../engine/types";

/** One line of a conversation between characters. */
export interface DialogueBeat {
  /** Speaker id from src/audio/cast.json (must match the voice line's own `speaker`). */
  speaker: string;
  /** Voice-line id in src/audio/voiceLines.json. */
  line: string;
  /** Template variables for the line (only values pre-rendered via `vary` have audio). */
  vars?: Record<string, string | number>;
  /** Silence after the line before the next speaker starts. Default DEFAULT_PAUSE_MS. */
  pauseAfterMs?: number;
  /** Pose for the speaking character during this beat. Default "encouraging" (while talking). */
  emote?: MascotState;
}

export interface Dialogue {
  id: string;
  beats: DialogueBeat[];
}

/** Why a dialogue stopped. "skipped" = the child pressed Skip; "cancelled" = unmount, new dialogue or code. */
export type DialogueEnd = "completed" | "skipped" | "cancelled";

/** What the scene shows for the current beat. */
export interface DialogueCaption {
  index: number;
  beat: DialogueBeat;
  speaker: { id: string; name: string; color: string };
  text: string;
}

/** The audio side of a dialogue. The real one wraps AudioEngine (audioVoice.ts); tests pass a fake. */
export interface DialogueVoice {
  isMuted(): boolean;
  /** Speak one line. Must never reject for long; the player caps the wait anyway. */
  speak(line: string, vars?: Record<string, string | number>): Promise<void>;
  /** Stop the line currently being spoken. */
  stop(): void;
}
