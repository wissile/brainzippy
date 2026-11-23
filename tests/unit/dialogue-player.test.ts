import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSpeaker } from "../../src/audio/cast";
import { renderLine } from "../../src/audio/voiceLines";
import { DEFAULT_PAUSE_MS, MIN_BEAT_MS, playDialogue, readingTimeMs, speechCapMs, type PlayOptions } from "../../src/dialogue/player";
import type { Dialogue, DialogueCaption, DialogueEnd, DialogueVoice } from "../../src/dialogue/types";

const DLG: Dialogue = {
  id: "test",
  beats: [
    { speaker: "bobbo", line: "dlg.welcome.1", pauseAfterMs: 500, emote: "greeting" },
    { speaker: "zuzu", line: "dlg.welcome.2" },
    { speaker: "bobbo", line: "dlg.welcome.4" },
  ],
};

type Mode = "ok" | "never" | "reject";
function fakeVoice(opts: { muted?: boolean; lineMs?: number; mode?: Mode } = {}) {
  const { lineMs = 1500, mode = "ok" } = opts;
  let muted = opts.muted ?? false;
  const v = {
    spoken: [] as string[],
    stop: vi.fn(),
    setMuted: (m: boolean) => (muted = m),
    isMuted: () => muted,
    speak: vi.fn((line: string) => {
      v.spoken.push(line);
      if (mode === "never") return new Promise<void>(() => undefined);
      if (mode === "reject") return Promise.reject(new Error("clip failed"));
      return new Promise<void>((r) => setTimeout(r, lineMs));
    }),
  };
  return v satisfies DialogueVoice;
}

function run(d: Dialogue, voice: DialogueVoice, extra: Partial<PlayOptions> = {}) {
  const log: string[] = [];
  const captions: DialogueCaption[] = [];
  let end: DialogueEnd | null = null;
  const h = playDialogue(d, {
    voice,
    render: renderLine,
    speakerInfo: (id) => ({ id, name: getSpeaker(id).name, color: getSpeaker(id).color }),
    onBeat: (c) => {
      captions.push(c);
      log.push(`beat:${c.index}`);
    },
    onLineEnd: (c) => log.push(`end:${c.index}`),
    onEnd: (r) => {
      end = r;
      log.push(`done:${r}`);
    },
    ...extra,
  });
  return { h, log, captions, end: () => end };
}

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
});

describe("dialogue player: sequencing", () => {
  it("plays beats in order with speaker captions, line ends and pauses", async () => {
    const voice = fakeVoice({ lineMs: 1500 });
    const r = run(DLG, voice);
    await tick(0);
    expect(r.log).toEqual(["beat:0"]);
    expect(r.captions[0]).toMatchObject({ index: 0, speaker: { id: "bobbo", name: "Bobbo", color: "#FF9F43" }, text: renderLine("dlg.welcome.1") });
    expect(voice.spoken).toEqual(["dlg.welcome.1"]);

    await tick(1499);
    expect(r.log).toEqual(["beat:0"]);
    await tick(1); // line finished at 1500 ms
    expect(r.log).toEqual(["beat:0", "end:0"]);
    await tick(499);
    expect(r.log).toEqual(["beat:0", "end:0"]);
    await tick(1); // custom 500 ms pause
    expect(r.log).toEqual(["beat:0", "end:0", "beat:1"]);
    expect(r.captions[1]!.speaker.name).toBe("Zuzu");

    await tick(1500 + DEFAULT_PAUSE_MS);
    expect(r.log.at(-1)).toBe("beat:2");
    await tick(1500 + DEFAULT_PAUSE_MS);
    expect(r.end()).toBe("completed");
    expect(voice.spoken).toEqual(["dlg.welcome.1", "dlg.welcome.2", "dlg.welcome.4"]);
    expect(voice.stop).not.toHaveBeenCalled(); // nothing to cut off
    await expect(r.h.done).resolves.toBe("completed");
  });

  it("keeps each caption up for at least MIN_BEAT_MS even if a clip is very short", async () => {
    const r = run(DLG, fakeVoice({ lineMs: 100 }));
    await tick(0);
    await tick(MIN_BEAT_MS - 1);
    expect(r.log).toEqual(["beat:0"]);
    await tick(1);
    expect(r.log).toEqual(["beat:0", "end:0"]);
  });
});

describe("dialogue player: muted and failing audio never block", () => {
  it("muted: no audio is requested and captions advance on a reading timer", async () => {
    const voice = fakeVoice({ muted: true });
    const r = run(DLG, voice);
    await tick(0);
    const read0 = readingTimeMs(r.captions[0]!.text);
    await tick(read0 - 1);
    expect(r.log).toEqual(["beat:0"]);
    await tick(1 + 500);
    expect(r.log).toEqual(["beat:0", "end:0", "beat:1"]);
    await tick(20000);
    expect(r.end()).toBe("completed");
    expect(voice.speak).not.toHaveBeenCalled();
  });

  it("muting mid-dialogue switches the next beats to reading time", async () => {
    const voice = fakeVoice({ lineMs: 1500 });
    const r = run(DLG, voice);
    await tick(0);
    voice.setMuted(true);
    await tick(1500 + 500);
    expect(r.log.at(-1)).toBe("beat:1");
    await tick(20000);
    expect(voice.spoken).toEqual(["dlg.welcome.1"]);
    expect(r.end()).toBe("completed");
  });

  it("a clip that never finishes is capped by speechCapMs", async () => {
    const r = run(DLG, fakeVoice({ mode: "never" }));
    await tick(0);
    const cap = speechCapMs(r.captions[0]!.text);
    await tick(cap - 1);
    expect(r.log).toEqual(["beat:0"]);
    await tick(1);
    expect(r.log).toEqual(["beat:0", "end:0"]);
    await tick(60000);
    expect(r.end()).toBe("completed");
  });

  it("a failing clip still shows the caption and moves on", async () => {
    const r = run(DLG, fakeVoice({ mode: "reject" }));
    await tick(0);
    await tick(MIN_BEAT_MS);
    expect(r.log).toEqual(["beat:0", "end:0"]);
    await tick(20000);
    expect(r.end()).toBe("completed");
  });

  it("a voice that throws synchronously does not break the dialogue", async () => {
    const voice: DialogueVoice = {
      isMuted: () => {
        throw new Error("no audio");
      },
      speak: () => Promise.resolve(),
      stop: () => undefined,
    };
    const r = run(DLG, voice);
    await tick(30000);
    expect(r.captions).toHaveLength(3);
    expect(r.end()).toBe("completed");
  });
});

describe("dialogue player: skip, next, cancel", () => {
  it("skip stops the voice, ends with 'skipped' and shows no more beats", async () => {
    const voice = fakeVoice();
    const r = run(DLG, voice);
    await tick(500);
    r.h.skip();
    expect(voice.stop).toHaveBeenCalledTimes(1);
    expect(r.end()).toBe("skipped");
    expect(r.h.ended).toBe(true);
    await tick(30000);
    expect(r.log).toEqual(["beat:0", "done:skipped"]);
    await expect(r.h.done).resolves.toBe("skipped");
  });

  it("skip during the pause does not stop someone else's speech", async () => {
    const voice = fakeVoice({ lineMs: 1500 });
    const r = run(DLG, voice);
    await tick(1600); // in beat 0's 500 ms pause
    r.h.skip();
    expect(voice.stop).not.toHaveBeenCalled();
    expect(r.end()).toBe("skipped");
  });

  it("cancel while muted ends silently with 'cancelled'", async () => {
    const voice = fakeVoice({ muted: true });
    const r = run(DLG, voice);
    await tick(100);
    r.h.cancel();
    expect(r.end()).toBe("cancelled");
    expect(voice.stop).not.toHaveBeenCalled();
    r.h.skip(); // ending twice is a no-op
    expect(r.log.filter((l) => l.startsWith("done"))).toEqual(["done:cancelled"]);
  });

  it("next() cuts the line short and starts the next beat at once", async () => {
    const voice = fakeVoice({ lineMs: 3000 });
    const r = run(DLG, voice);
    await tick(400);
    r.h.next();
    await tick(0);
    expect(voice.stop).toHaveBeenCalledTimes(1);
    expect(r.log).toEqual(["beat:0", "end:0", "beat:1"]);
    r.h.next();
    await tick(0);
    r.h.next();
    await tick(0);
    expect(r.end()).toBe("completed");
  });

  it("starting a new dialogue cancels the one playing", async () => {
    const first = run(DLG, fakeVoice());
    await tick(200);
    const second = run({ id: "other", beats: [{ speaker: "hoot", line: "dlg.english.1" }] }, fakeVoice());
    expect(first.end()).toBe("cancelled");
    await tick(0);
    expect(second.captions[0]!.speaker.name).toBe("Hoot");
    await tick(30000);
    expect(second.end()).toBe("completed");
    expect(first.captions).toHaveLength(1);
  });
});

describe("dialogue player: pause holds auto-advance (WCAG 2.2.1)", () => {
  it("muted: pausing stops the reading timer and resume continues with the remaining time", async () => {
    const r = run(DLG, fakeVoice({ muted: true }));
    await tick(0);
    const read0 = readingTimeMs(r.captions[0]!.text);
    await tick(1000);
    r.h.pause();
    expect(r.h.paused).toBe(true);
    await tick(60000);
    expect(r.log).toEqual(["beat:0"]); // held as long as needed
    r.h.resume();
    await tick(read0 - 1000 - 1);
    expect(r.log).toEqual(["beat:0"]);
    await tick(1);
    expect(r.log).toEqual(["beat:0", "end:0"]);
  });

  it("sound on: the line plays to its end, then the beat waits until resumed", async () => {
    const voice = fakeVoice({ lineMs: 1500 });
    const r = run(DLG, voice);
    await tick(200);
    r.h.pause();
    await tick(1300);
    expect(r.log).toEqual(["beat:0", "end:0"]); // the speaker finished talking
    expect(voice.stop).not.toHaveBeenCalled();
    await tick(30000);
    expect(r.log).toEqual(["beat:0", "end:0"]);
    r.h.resume();
    await tick(500); // the 500 ms pause runs after resume
    expect(r.log.at(-1)).toBe("beat:1");
  });

  it("next() and skip() still work while paused", async () => {
    const r = run(DLG, fakeVoice({ muted: true }));
    await tick(0);
    r.h.pause();
    r.h.next();
    await tick(0);
    expect(r.log).toEqual(["beat:0", "end:0", "beat:1"]);
    await tick(60000);
    expect(r.log.at(-1)).toBe("beat:1"); // still held on the new beat
    r.h.skip();
    expect(r.end()).toBe("skipped");
    r.h.resume(); // no-op after the end
    await tick(60000);
    expect(r.captions).toHaveLength(2);
  });
});

describe("dialogue timing helpers", () => {
  it("reading time is bounded and grows with length", () => {
    expect(readingTimeMs("Hi!")).toBe(1800);
    expect(readingTimeMs("x".repeat(60))).toBeGreaterThan(readingTimeMs("x".repeat(30)));
    expect(readingTimeMs("x".repeat(1000))).toBe(8000);
    expect(speechCapMs("x".repeat(1000))).toBe(9500);
  });
});
