import type { SfxId } from "../engine/types";
import { synthVoiceFor } from "./cast";
import { lineSpeaker, renderLine, voiceKey } from "./voiceLines";

/**
 * Audio engine: Web Audio for SFX (decoded buffers, pitch via playbackRate) and for voice clips
 * (human recordings > generated neural voice > browser speech synthesis as a last resort). Every method fails soft — missing files, blocked autoplay, or absent
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
  private currentClip: AudioBufferSourceNode | null = null;
  private manifest: Record<string, string> | null = null;
  private manifestLoading: Promise<void> | null = null;
  private clips = new Map<string, Promise<AudioBuffer | null>>();
  // background music: one looping track per world, crossfaded, ducked under speech
  private musicOn = true;
  private wantedTrack: string | null = null;
  private track: { id: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private tracks = new Map<string, Promise<AudioBuffer | null>>();
  private static MUSIC_LEVEL = 0.22;
  private static MUSIC_DUCKED = 0.07;
  private speakToken = 0;
  readonly failed: string[] = [];

  setMuted(m: boolean) {
    this.muted = m;
    if (m) {
      this.stopVoice();
      this.fadeOutMusic();
    } else if (this.wantedTrack) void this.playMusic(this.wantedTrack);
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    if (!on) this.fadeOutMusic();
    else if (this.wantedTrack) void this.playMusic(this.wantedTrack);
  }

  /** Request a world's music. Safe to call before unlock: it starts once audio is allowed. */
  async playMusic(id: string): Promise<void> {
    this.wantedTrack = id;
    if (!this.ctx || this.muted || !this.musicOn) return;
    if (this.track?.id === id) return;
    let p = this.tracks.get(id);
    if (!p) {
      const ctx = this.ctx;
      p = fetch(`/audio/music/${id}.mp3`)
        .then((r) => {
          if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("audio")) throw new Error("missing");
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.tracks.set(id, p);
    }
    const buf = await p;
    if (!buf || !this.ctx || this.wantedTrack !== id || this.muted || !this.musicOn || this.track?.id === id) return;
    this.fadeOutMusic();
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(this.speakingNow ? AudioEngine.MUSIC_DUCKED : AudioEngine.MUSIC_LEVEL, this.ctx.currentTime + 1.2);
      src.connect(gain).connect(this.ctx.destination);
      src.start();
      this.track = { id, src, gain };
    } catch {
      /* music is optional */
    }
  }

  private fadeOutMusic() {
    const t = this.track;
    if (!t || !this.ctx) return;
    this.track = null;
    try {
      const now = this.ctx.currentTime;
      t.gain.gain.cancelScheduledValues(now);
      t.gain.gain.setValueAtTime(t.gain.gain.value, now);
      t.gain.gain.linearRampToValueAtTime(0, now + 0.8);
      t.src.stop(now + 0.85);
    } catch {
      /* ignore */
    }
  }

  private speakingNow = false;
  private duck(on: boolean) {
    this.speakingNow = on;
    const t = this.track;
    if (!t || !this.ctx) return;
    const now = this.ctx.currentTime;
    t.gain.gain.cancelScheduledValues(now);
    t.gain.gain.setValueAtTime(t.gain.gain.value, now);
    t.gain.gain.linearRampToValueAtTime(on ? AudioEngine.MUSIC_DUCKED : AudioEngine.MUSIC_LEVEL, now + (on ? 0.15 : 0.6));
  }
  isMuted() {
    return this.muted;
  }

  onSpeech(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /**
   * True only when the browser already allows sound without a new gesture on this page (e.g. the player tapped on
   * the site recently). Never creates an AudioContext when the browser says autoplay is disallowed. Never throws.
   */
  async canAutoUnlock(): Promise<boolean> {
    try {
      const nav = navigator as Navigator & { getAutoplayPolicy?: (type: "audiocontext") => string };
      if (typeof nav.getAutoplayPolicy === "function") return nav.getAutoplayPolicy("audiocontext") === "allowed";
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      const probe = new Ctor();
      const running = probe.state === "running";
      void probe.close();
      return running;
    } catch {
      return false;
    }
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
    void this.loadManifest();
    this.pickVoice();
    if (this.wantedTrack) void this.playMusic(this.wantedTrack);
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

  private loadManifest(): Promise<void> {
    if (this.manifestLoading) return this.manifestLoading;
    this.manifestLoading = fetch("/audio/voice/manifest.json")
      .then((r) => (r.ok ? (r.json() as Promise<{ clips?: Record<string, string> }>) : null))
      .then((m) => {
        this.manifest = m?.clips ?? {};
        // warm the clips needed with zero latency while counting
        for (let n = 1; n <= 20; n++) void this.clip(`number.${n}`);
      })
      .catch(() => {
        this.manifest = {};
      });
    return this.manifestLoading;
  }

  private clip(key: string): Promise<AudioBuffer | null> {
    const file = this.manifest?.[key];
    const ctx = this.ctx;
    if (!file || !ctx) return Promise.resolve(null);
    let p = this.clips.get(key);
    if (!p) {
      p = fetch(`/audio/voice/${file}`)
        .then((r) => {
          if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("audio")) throw new Error("missing");
          return r.arrayBuffer();
        })
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.clips.set(key, p);
    }
    return p;
  }

  /** Is a recorded/generated clip available for this line? (Used by the studio + tests.) */
  hasClip(id: string, vars: Record<string, string | number> = {}): boolean {
    return Boolean(this.manifest?.[voiceKey(id, vars)]);
  }

  private playBuffer(buf: AudioBuffer, onEnd: () => void, gain = 1): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(this.ctx.destination);
      src.onended = onEnd;
      src.start();
      return src;
    } catch {
      return null;
    }
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

  private emit(speaking: boolean, caption: string, notify = true) {
    this.duck(speaking);
    if (notify) for (const l of this.listeners) l(speaking, caption);
  }

  stopVoice() {
    this.speakToken++;
    // clear the interrupted line's caption (e.g. a skipped story line must not linger over the game)
    this.emit(false, "");
    try {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    if (this.currentClip) {
      try {
        this.currentClip.onended = null;
        this.currentClip.stop();
      } catch {
        /* already stopped */
      }
      this.currentClip = null;
    }
  }

  /**
   * Speak a catalogue line. Resolves when speech ends, or after a length-based cap (so a missing
   * voice never stalls the game). Captions are emitted even when muted.
   * `emitCaption: false` keeps the line out of the shared caption (speech bubbles + app live region): used by
   * dialogue scenes, which caption each line themselves with the speaker's name. Music still ducks.
   */
  speak(id: string, vars: Record<string, string | number> = {}, opts: { interrupt?: boolean; emitCaption?: boolean } = {}): Promise<void> {
    const text = renderLine(id, vars);
    if (!text) return Promise.resolve();
    if (opts.interrupt !== false) this.stopVoice();
    const token = ++this.speakToken;
    const capMs = Math.min(9000, 900 + text.length * 70);
    const notify = opts.emitCaption !== false;
    this.emit(true, text, notify);

    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (token === this.speakToken) this.emit(false, text, notify);
        resolve();
      };
      window.setTimeout(done, this.muted ? Math.min(capMs, Math.max(1800, text.length * 45)) : capMs);
      if (this.muted) return;

      void (async () => {
        if (this.ctx && !this.manifest) await Promise.race([this.loadManifest(), new Promise((r) => window.setTimeout(r, 800))]);
        const buf = await this.clip(voiceKey(id, vars));
        if (token !== this.speakToken || settled) return;
        if (buf) {
          const src = this.playBuffer(buf, done);
          if (src) {
            this.currentClip = src;
            return;
          }
        }
        this.synth(text, token, done, lineSpeaker(id));
      })();
      return;
    });
  }

  private synth(text: string, token: number, done: () => void, speaker?: string) {
    if (!("speechSynthesis" in window) || token !== this.speakToken) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang ?? "en-US";
      // each character keeps a recognisably different pitch/rate even in the last-resort browser voice
      const { pitch, rate } = synthVoiceFor(speaker);
      u.rate = rate;
      u.pitch = pitch;
      u.onend = done;
      // onerror: leave resolution to the cap timer so the caption stays readable when no voice is available
      window.speechSynthesis.speak(u);
    } catch {
      /* captions still shown; cap timer resolves */
    }
  }

  /** Quick number word during counting; doesn't emit caption changes. */
  sayNumber(n: number) {
    if (this.muted) return;
    const cached = this.clips.get(`number.${n}`);
    if (cached) {
      void cached.then((buf) => {
        if (!buf || this.muted) return this.synthNumber(n);
        this.playBuffer(buf, () => undefined, 0.95);
      });
      return;
    }
    this.synthNumber(n);
  }

  private synthNumber(n: number) {
    if (!("speechSynthesis" in window)) return;
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
