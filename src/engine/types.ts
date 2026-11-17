/**
 * BrainZippy game engine — core types.
 * The engine is renderer-agnostic: nothing in src/engine imports React or touches the DOM.
 */

/** "choose" = generic pick-the-answer exercise rendered by a game-specific board (balloons, number line, plates...). */
export type InteractionType = "tap-count" | "choose-count" | "make-set" | "choose";
export type Difficulty = 1 | 2 | 3 | 4;
export type MascotState = "idle" | "greeting" | "talking" | "thinking" | "encouraging" | "celebrating" | "retry" | "sleeping";
export type SfxId =
  | "tap" | "count" | "pickup" | "drop" | "correct" | "retry" | "hint"
  | "whoosh" | "complete" | "achievement" | "star";

/** A spoken + captioned line. `id` keys into the voice-line catalogue; `vars` fill its template. */
export interface VoiceCue {
  id: string;
  vars?: Record<string, string | number>;
}

export interface Exercise {
  id: string;
  skillId: string;
  objective: string;
  ages: readonly [number, number];
  difficulty: Difficulty;
  interaction: InteractionType;
  /** The quantity the child must count or build. */
  target: number;
  /** Art key for the countable objects (renderer decides how it looks). */
  objectKind: string;
  /** Answer options for tap-count / choose-count. Must include `target`. */
  choices?: readonly number[];
  /** make-set: how many objects are available in the pile. Must be > target. */
  poolSize?: number;
  /** Layout hint for renderers. */
  layout?: "scatter" | "row" | "ten-frame";
  /** Seed for deterministic object placement. */
  seed: number;
  /** True for the guided first exercise (pointer tutorial). */
  tutorial?: boolean;
  /** Plain-language description for screen readers. */
  a11yDescription: string;
  /** Game-specific numbers the board needs (e.g. { a: 7, b: 6 } or { start: 3, hops: 4 }). */
  params?: Readonly<Record<string, number>>;
  /** Spoken prompt (voice-line id + vars) and on-screen prompt text, overriding the interaction default. */
  prompt?: { line: string; vars?: Readonly<Record<string, string | number>>; text: string };
}

export type ValidationReason = "correct" | "wrong-number" | "too-many" | "too-few" | "incomplete";
export interface ValidationResult {
  correct: boolean;
  reason: ValidationReason;
}

/** What a hint does to the board; renderers interpret these. */
export type HintAction =
  | "none"
  | "eliminate-choice"       // grey out the wrong option the child picked
  | "highlight-last-count"   // pulse the last counted object's number badge (cardinality)
  | "count-along"            // animate counting the objects one by one, with voice
  | "show-slots"             // make-set: show outlined slots equal to the target in the basket
  | "model-answer";          // pulse the correct choice; others disabled

export interface Feedback {
  mascot: MascotState;
  sfx: SfxId;
  voice: VoiceCue;
  hints: HintAction[];
}

export interface ExerciseResult {
  exerciseId: string;
  skillId: string;
  difficulty: Difficulty;
  attempts: number;     // number of submitted answers, including the final correct one
  firstTry: boolean;
  hintsShown: number;
}

export interface ProgressionConfig {
  roundLength: number;
  minDifficulty: Difficulty;
  maxDifficulty: Difficulty;
  /** Consecutive first-try successes needed to step difficulty up. */
  stepUpAfter: number;
  /** Attempts at or above which difficulty steps down. */
  stepDownAtAttempts: number;
}

export interface ProgressionState {
  difficulty: Difficulty;
  streak: number;
  /** Exercise ids already played this round, in order. */
  played: string[];
  results: ExerciseResult[];
}

export interface GameDefinition {
  id: string;
  title: string;
  mascot: string;
  ages: readonly [number, number];
  skillIds: readonly string[];
  learningObjective: string;
  progression: ProgressionConfig;
  exercises: readonly Exercise[];
  achievement: { id: string; title: string };
}
