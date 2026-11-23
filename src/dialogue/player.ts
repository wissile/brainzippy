/**
 * Dialogue player: plays the beats of a conversation in order. Pure logic (no React, no DOM, no AudioEngine
 * import); the voice is injected so it is unit-testable with fake timers.
 *
 * Rules (docs/ANIMATION_AUDIO.md > Dialogue):
 * - Every beat is captioned with the speaker's name (onBeat) whether or not sound is on.
 * - Sound on: wait for the line to finish, capped by speechCapMs (a missing or stuck clip never stalls).
 * - Muted: the caption stays up for readingTimeMs, then the next beat starts.
 * - A beat lasts at least MIN_BEAT_MS so a caption never flashes by.
 * - next() jumps to the next beat at once; skip()/cancel() stop the voice and end the dialogue.
 * - pause() holds auto-advance (WCAG 2.2.1/2.2.2: the child is reading, hovering or focused on the caption): reading
 *   and pause timers stop and keep their remaining time; a spoken line plays to its end, then the beat waits.
 *   resume() carries on. next()/skip() still work while paused.
 * - Starting a new dialogue cancels the one playing (only one conversation at a time).
 */
import type { Dialogue, DialogueBeat, DialogueCaption, DialogueEnd, DialogueVoice } from "./types";

export const DEFAULT_PAUSE_MS = 350;
export const MIN_BEAT_MS = 1000;

/** How long a muted caption stays up: comfortable for a grown-up reading aloud or an early reader. */
export function readingTimeMs(text: string): number {
  return Math.min(8000, Math.max(1800, 900 + text.length * 55));
}

/** Longest we wait for a spoken line before moving on (matches AudioEngine's own cap, plus slack). */
export function speechCapMs(text: string): number {
  return Math.min(9500, 1400 + text.length * 70);
}

export interface PlayOptions {
  voice: DialogueVoice;
  /** Caption text for a line (renderLine). */
  render: (line: string, vars?: Record<string, string | number>) => string;
  /** Name/colour for a speaker id (getSpeaker). */
  speakerInfo: (id: string) => { id: string; name: string; color: string };
  /** A beat starts: show its caption; its speaker is talking. */
  onBeat?: (c: DialogueCaption) => void;
  /** The beat's line finished (pause before the next one): the speaker stops talking, caption stays. */
  onLineEnd?: (c: DialogueCaption) => void;
  onEnd?: (reason: DialogueEnd) => void;
}

export interface DialogueHandle {
  /** Jump to the next beat now (ends the dialogue after the last beat). */
  next(): void;
  /** The child pressed Skip. */
  skip(): void;
  /** Stop silently (unmount, navigation). */
  cancel(): void;
  /** Hold auto-advance until resume(). */
  pause(): void;
  resume(): void;
  readonly done: Promise<DialogueEnd>;
  readonly ended: boolean;
  readonly paused: boolean;
}

let current: { cancel(): void } | null = null;

export function playDialogue(dialogue: Dialogue, opts: PlayOptions): DialogueHandle {
  current?.cancel();

  const timers = new Set<ReturnType<typeof setTimeout>>();
  let ended = false;
  let audioActive = false;
  let interruptBeat: (() => void) | null = null;
  let paused = false;
  interface HoldTimer { remaining: number; started: number; t: ReturnType<typeof setTimeout> | null; resolve: () => void }
  const holdTimers = new Set<HoldTimer>();
  let resolveDone!: (r: DialogueEnd) => void;
  const done = new Promise<DialogueEnd>((r) => (resolveDone = r));

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  const startHold = (h: HoldTimer) => {
    h.started = Date.now();
    h.t = setTimeout(() => {
      if (h.t) timers.delete(h.t);
      h.t = null;
      holdTimers.delete(h);
      h.resolve();
    }, h.remaining);
    timers.add(h.t);
  };
  /** A timer that stops while paused and keeps its remaining time. */
  const holdableSleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const h: HoldTimer = { remaining: ms, started: 0, t: null, resolve };
      holdTimers.add(h);
      if (!paused) startHold(h);
    });

  const pause = () => {
    if (paused || ended) return;
    paused = true;
    for (const h of holdTimers) {
      if (!h.t) continue;
      clearTimeout(h.t);
      timers.delete(h.t);
      h.t = null;
      h.remaining = Math.max(0, h.remaining - (Date.now() - h.started));
    }
  };
  const resume = () => {
    if (!paused) return;
    paused = false;
    for (const h of holdTimers) if (!h.t) startHold(h);
  };

  const finish = (reason: DialogueEnd) => {
    if (ended) return;
    ended = true;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    holdTimers.clear();
    if (audioActive && reason !== "completed") {
      try {
        opts.voice.stop();
      } catch {
        /* fail-soft */
      }
    }
    audioActive = false;
    interruptBeat?.();
    if (current === handle) current = null;
    try {
      opts.onEnd?.(reason);
    } finally {
      resolveDone(reason);
    }
  };

  const playBeat = async (index: number, beat: DialogueBeat) => {
    let skipped = false;
    const interrupted = new Promise<void>((r) => {
      interruptBeat = () => {
        skipped = true;
        r();
      };
    });
    const caption: DialogueCaption = { index, beat, speaker: opts.speakerInfo(beat.speaker), text: opts.render(beat.line, beat.vars) };
    opts.onBeat?.(caption);

    let muted = true;
    try {
      muted = opts.voice.isMuted();
    } catch {
      /* treat as muted */
    }
    if (muted) {
      await Promise.race([holdableSleep(readingTimeMs(caption.text)), interrupted]);
    } else {
      audioActive = true;
      let spoken: Promise<void>;
      try {
        spoken = Promise.resolve(opts.voice.speak(beat.line, beat.vars)).catch(() => undefined);
      } catch {
        spoken = Promise.resolve();
      }
      await Promise.race([Promise.all([Promise.race([spoken, sleep(speechCapMs(caption.text))]), sleep(MIN_BEAT_MS)]), interrupted]);
      if (skipped && audioActive && !ended) {
        try {
          opts.voice.stop(); // next(): cut the line short
        } catch {
          /* fail-soft */
        }
      }
      audioActive = false;
    }
    if (ended) return;
    opts.onLineEnd?.(caption);
    // holdable: if paused (even during the spoken line) this pause only starts on resume, so the beat waits
    if (!skipped) await Promise.race([holdableSleep(beat.pauseAfterMs ?? DEFAULT_PAUSE_MS), interrupted]);
  };

  const handle: DialogueHandle = {
    next: () => interruptBeat?.(),
    skip: () => finish("skipped"),
    cancel: () => finish("cancelled"),
    pause,
    resume,
    done,
    get ended() {
      return ended;
    },
    get paused() {
      return paused;
    },
  };
  current = handle;

  void (async () => {
    // let the caller attach listeners / commit state before the first caption
    await Promise.resolve();
    for (let i = 0; i < dialogue.beats.length && !ended; i++) await playBeat(i, dialogue.beats[i]!);
    finish("completed");
  })();

  return handle;
}
