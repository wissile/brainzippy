/**
 * BrainZippy game engine — core types.
 * The engine is renderer-agnostic: nothing in src/engine imports React or touches the DOM.
 */
import type { Rng } from "./rng";

/**
 * How the exercise is played (which built-in flow the runner uses):
 *  - "tap-count"    count objects by tapping each one, then pick how many (number answer)
 *  - "choose-count" look at objects, pick how many (number answer)
 *  - "make-set"     move objects into a basket, then check (number answer)
 *  - "choose"       any answer kind; a game board (or the default tray) submits `{ type: "SUBMIT", value }`
 */
export type InteractionType = "tap-count" | "choose-count" | "make-set" | "choose";
/** Difficulty band of an exercise: `level + 1` (1 = a game's first level). Integer ≥ 1. */
export type Difficulty = number;
export type MascotState = "idle" | "greeting" | "talking" | "thinking" | "encouraging" | "celebrating" | "retry" | "sleeping";
export type SfxId =
  | "tap" | "count" | "pickup" | "drop" | "correct" | "retry" | "hint"
  | "whoosh" | "complete" | "achievement" | "star";

/** A spoken + captioned line. `id` keys into the voice-line catalogue; `vars` fill its template. */
export interface VoiceCue {
  id: string;
  vars?: Record<string, string | number>;
}

// ---------------------------------------------------------------- answers

/** An option, tile, item or bin the child can pick. `id` is unique within its list. */
export interface AnswerOption {
  id: string;
  /** On-screen label (word, letter, number, code block...). Sequence pieces with the same text are interchangeable. */
  text?: string;
  /** Art key for a picture (the skin's ObjectArt renders it). */
  art?: string;
  /** Voice-line id read aloud for pre-readers. */
  say?: string;
}

/**
 * What counts as correct — DATA in the exercise; validated by `validateAnswer` (src/engine/validation.ts).
 *  number   — a whole number; with `choices` the child picks one of them, without it any number may be entered
 *  choice   — exactly one labelled option (text and/or picture) is correct
 *  sequence — put pieces in order (sequencing, word building, code blocks); `pieces` may include distractors
 *  set      — select every correct option and no others (order does not matter)
 *  match    — assign every item to a target (matching pairs, or sorting when several items share a target)
 *  numeric  — a measured/calculated value accepted within ± tolerance (pilot, physics, money)
 */
export type Answer =
  | { kind: "number"; value: number; choices?: readonly number[] }
  | { kind: "choice"; correct: string; options: readonly AnswerOption[] }
  | { kind: "sequence"; order: readonly string[]; pieces: readonly AnswerOption[] }
  | { kind: "set"; correct: readonly string[]; options: readonly AnswerOption[] }
  | { kind: "match"; pairs: Readonly<Record<string, string>>; items: readonly AnswerOption[]; targets: readonly AnswerOption[] }
  | { kind: "numeric"; value: number; tolerance: number; unit?: string; min?: number; max?: number; step?: number };
export type AnswerKind = Answer["kind"];

/** The value a board submits for each answer kind. */
export interface AnswerValues {
  number: number;
  choice: string;
  sequence: readonly string[];
  set: readonly string[];
  match: Readonly<Record<string, string>>;
  numeric: number;
}
export type AnswerValue = AnswerValues[AnswerKind];
/** A single pickable thing that hints can grey out: a number choice, or an option / piece id. */
export type AnswerKey = number | string;

// ---------------------------------------------------------------- exercises

export interface Exercise {
  id: string;
  skillId: string;
  objective: string;
  ages: readonly [number, number];
  difficulty: Difficulty;
  interaction: InteractionType;
  /** The correct answer and its options. Counting interactions (tap-count, choose-count, make-set) use kind "number". */
  answer: Answer;
  /** Art key for the countable objects / prompt icon (renderer decides how it looks). */
  objectKind: string;
  /** make-set: how many objects are available in the pile. Must be > the answer. */
  poolSize?: number;
  /** Layout hint for renderers. */
  layout?: "scatter" | "row" | "ten-frame";
  /** Seed for deterministic object placement. */
  seed: number;
  /** True for the guided first exercise (pointer tutorial). Tutorials play on level 0 only. */
  tutorial?: boolean;
  /** Plain-language description for screen readers. */
  a11yDescription: string;
  /** Game-specific numbers the board needs (e.g. { a: 7, b: 6 } or { start: 3, hops: 4 }). */
  params?: Readonly<Record<string, number>>;
  /** Spoken prompt (voice-line id + vars) and on-screen prompt text, overriding the interaction default. */
  prompt?: { line: string; vars?: Readonly<Record<string, string | number>>; text: string };
}

/**
 * Optional procedural content: a PURE, deterministic function of (level, rng, index).
 * `level` is 0-based; the engine stamps `difficulty = level + 1`. Same inputs → same exercise.
 * Ids must be unique per (level, index) — include both, e.g. `ca-tap-5-berry-l2n3`.
 */
export type ExerciseGenerator = (level: number, rng: Rng, index: number) => Omit<Exercise, "difficulty">;

export type ValidationReason =
  | "correct"
  | "wrong-number" | "too-many" | "too-few" | "incomplete"   // number / make-set (too-many/too-few also for sets)
  | "wrong-choice" | "wrong-order" | "wrong-match"            // choice / sequence / match
  | "too-high" | "too-low";                                   // numeric, or number without choices
export interface ValidationResult {
  correct: boolean;
  reason: ValidationReason;
  /**
   * Per-part correctness for multi-part answers, so boards can tick/lock right parts after a miss:
   * sequence → slot index ("0", "1"...) · set → each selected option id · match → each item id.
   */
  parts?: Readonly<Record<string, boolean>>;
}

/** What a hint does to the board; renderers interpret these. */
export type HintAction =
  | "none"
  | "eliminate-choice"       // grey out the wrong option the child picked (state.eliminated)
  | "highlight-last-count"   // pulse the last counted object's number badge (cardinality)
  | "count-along"            // animate the worked example step by step (runner drives alongIndex)
  | "show-slots"             // make-set: show outlined slots equal to the target in the basket
  | "mark-parts"             // sequence/set/match: show which parts were right (state.check.parts)
  | "direction"              // numeric / free number entry: too high or too low (state.check.reason)
  | "model-answer";          // show the correct answer (state.model); others disabled; the child still submits it

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
  /** Highest 0-based level. Levels run 0..maxLevel; exercise difficulty runs 1..maxLevel + 1. */
  maxLevel: number;
  /** Consecutive first-try successes needed to step difficulty up within a round. */
  stepUpAfter: number;
  /** Attempts at or above which difficulty steps down within a round. */
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
  /** Authored exercises. With a generator these are usually just the tutorial(s). */
  exercises: readonly Exercise[];
  /** Optional procedural content (src/games/<id>/generator.ts). */
  generate?: ExerciseGenerator;
  achievement: { id: string; title: string };
}

/** The exercises available for one round (built by `buildRound`). */
export interface Round {
  gameId: string;
  level: number;
  seed: number;
  exercises: readonly Exercise[];
}
