import type { SfxId } from "../engine/types";
import { VOICE_LINES, renderLine } from "./voiceLines";

/**
 * Audio engine: Web Audio for SFX (decoded buffers, pitch via playbackRate), recorded clips or
 * speech synthesis for voice. Every method fails soft — missing files, blocked autoplay, or absent
 * speech voices never throw or block gameplay; callers always get a resolved promise within a cap.
 */
const SFX: SfxId[] = ["tap", "count", "pickup", "drop", "correct", "retry", "hint", "whoosh", "complete", "achievement", "star"];
/** Major-pentatonic ratios so successive counts climb musically: count 1 → C, 2 → D, 3 → E ... */
const COUNT_RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3, 4, 9 / 2];

/** Preferred English voices, warm/natural first. Matching is case-insensitive substring. */
const VOICE_PREFS = ["samantha", "aria", "jenny", "ava", "google us english", "karen", "moira", "serena", "zira", "female", "english"];

type Listener = (speaking: boolean, caption: string) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SfxId, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private muted = false;
  private voice: SpeechSynthesisVoice | null = null;
  private listeners = new Set<Listener>();
  private currentClip: HTMLAudioElement | null = null;
  private speakToken = 0;
  readonly failed: string[] = [];

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopVoice();
  }
  isMuted() {
    return this.muted;
  }

  onSpeech(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Must be called from a user gesture (first tap). Creates/resumes the context and preloads SFX. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
    } catch {
      this.ctx = null;
    }
    void this.preload();
    this.pickVoice();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = () => this.pickVoice();
    }
  }

  preload(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    this.loading = Promise.all(
      SFX.map(async (id) => {
        try {
          const res = await fetch(`/audio/sfx/${id}.mp3`);
          if (!res.ok) throw new Error(String(res.status));
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(id, buf);
        } catch {
          this.failed.push(id);
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  play(id: SfxId, opts: { rate?: number; gain?: number } = {}): void {
    if (this.muted || !this.ctx) return;
    const buf = this.buffers.get(id);
    if (!buf) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const g = this.ctx.createGain();
      g.gain.value = opts.gain ?? 0.8;
      src.connect(g).connect(this.ctx.destination);
      src.start();
    } catch {
      /* ignore */
    }
  }

  playCount(n: number): void {
    this.play("count", { rate: COUNT_RATIOS[(n - 1) % COUNT_RATIOS.length] ?? 1, gain: 0.7 });
  }

  private pickVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    for (const pref of VOICE_PREFS) {
      const v = voices.find((x) => x.name.toLowerCase().includes(pref));
      if (v) {
        this.voice = v;
        return;
      }
    }
    this.voice = voices[0] ?? null;
  }

  private emit(speaking: boolean, caption: string) {
    for (const l of this.listeners) l(speaking, caption);
  }

  stopVoice() {
    this.speakToken++;
    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    if (this.currentClip) {
      this.currentClip.pause();
      this.currentClip = null;
    }
  }

  /**
   * Speak a catalogue line. Resolves when speech ends, or after a length-based cap (so a missing
   * voice never stalls the game). Captions are emitted even when muted.
   */
  speak(id: string, vars: Record<string, string | number> = {}, opts: { interrupt?: boolean } = {}): Promise<void> {
    const text = renderLine(id, vars);
    if (!text) return Promise.resolve();
    if (opts.interrupt !== false) this.stopVoice();
    const token = ++this.speakToken;
    const capMs = Math.min(9000, 900 + text.length * 70);
    this.emit(true, text);

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (token === this.speakToken) this.emit(false, text);
        resolve();
      };
      window.setTimeout(done, this.muted ? Math.min(capMs, 1400) : capMs);
      if (this.muted) return;

      const file = VOICE_LINES[id]?.file;
      if (file) {
        try {
          const clip = new Audio(`/audio/voice/${file}`);
          this.currentClip = clip;
          let fellBack = false;
          const fallback = () => {
            if (fellBack) return;
            fellBack = true;
            this.synth(text, token, done);
          };
          clip.onended = done;
          clip.onerror = fallback;
          void clip.play().catch(fallback);
          return;
        } catch {
          /* fall through to synthesis */
        }
      }
      this.synth(text, token, done);
    });
  }

  private synth(text: string, token: number, done: () => void) {
    if (!("speechSynthesis" in window) || token !== this.speakToken) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang ?? "en-US";
      u.rate = 0.92;
      u.pitch = 1.2;
      u.onend = done;
      // onerror: leave resolution to the cap timer so the caption stays readable when no voice is available
      window.speechSynthesis.speak(u);
    } catch {
      /* captions still shown; cap timer resolves */
    }
  }

  /** Quick number word during counting; doesn't emit caption changes. */
  sayNumber(n: number) {
    if (this.muted || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(renderLine(`number.${n}`));
      if (this.voice) u.voice = this.voice;
      u.rate = 1.0;
      u.pitch = 1.25;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }
}

export const audio = new AudioEngine();
