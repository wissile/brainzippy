import { describe, expect, it } from "vitest";
import { NARRATOR, SPEAKERS, contrastRatio, getSpeaker, nameChipStyle, synthVoiceFor } from "../../src/audio/cast";
import { VOICE_LINES, lineSpeaker } from "../../src/audio/voiceLines";
import { LIBRARY_HOSTS } from "../../src/characters/library";
import { DIALOGUES, dialogueSpeakers } from "../../src/dialogue/dialogues";
import type { MascotState } from "../../src/engine/types";

const STATES: MascotState[] = ["idle", "greeting", "talking", "thinking", "encouraging", "celebrating", "retry", "sleeping"];
const CREW = ["bobbo", "zuzu", "gloop", "hoot", "rumble", "puff"];

describe("voice cast", () => {
  it("casts the narrator, the Critter Crew, every library host and the two new hosts", () => {
    for (const id of [NARRATOR, ...CREW, ...LIBRARY_HOSTS.map((h) => h.id), "ziggy", "sarah"]) expect(SPEAKERS[id], id).toBeDefined();
    expect(SPEAKERS.ziggy!.provisional).toBe(true);
    expect(SPEAKERS.sarah!.provisional).toBe(true);
  });

  it("keeps the owner's narrator voice unprocessed", () => {
    const n = SPEAKERS[NARRATOR]!;
    expect(n.kokoroVoice).toBe("af_bella");
    expect(n.pitchSemitones ?? 0).toBe(0);
    expect(n.formantSemitones ?? 0).toBe(0);
  });

  it("gives every character its own base voice, different from the narrator's", () => {
    const chars = Object.values(SPEAKERS).filter((s) => s.id !== NARRATOR);
    const specs = chars.map((s) => s.kokoroVoice);
    expect(new Set(specs).size).toBe(specs.length);
    for (const s of chars) expect(s.kokoroVoice.split("+").map((p) => p.split(":")[0])).not.toContain("af_bella");
  });

  it("keeps processing within intelligible limits for young children", () => {
    for (const s of Object.values(SPEAKERS)) {
      const p = s.pitchSemitones ?? 0;
      const f = s.formantSemitones ?? 0;
      expect(p, s.id).toBeLessThanOrEqual(11);
      expect(f, s.id).toBeLessThanOrEqual(4);
      expect(f, s.id).toBeLessThanOrEqual(p);
      expect(s.speed * (s.tempo ?? 1), s.id).toBeGreaterThanOrEqual(0.8);
      expect(s.speed * (s.tempo ?? 1), s.id).toBeLessThanOrEqual(1.1);
      expect(s.description.trim(), s.id).toBeTruthy();
    }
  });

  it("name chips are readable on every character colour (contrast >= 4.5:1)", () => {
    for (const s of Object.values(SPEAKERS)) {
      expect(s.color, s.id).toMatch(/^#[0-9A-Fa-f]{6}$/);
      const chip = nameChipStyle(s.color);
      expect(contrastRatio(chip.background, chip.color), s.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("unknown speakers fall back to the narrator; synth fallback differs per character", () => {
    expect(getSpeaker("nobody").id).toBe(NARRATOR);
    expect(synthVoiceFor(undefined)).toEqual({ pitch: 1.2, rate: 0.92 });
    expect(synthVoiceFor("gloop")).not.toEqual(synthVoiceFor("rumble"));
    for (const s of Object.values(SPEAKERS)) {
      const v = synthVoiceFor(s.id);
      expect(v.pitch).toBeLessThanOrEqual(2);
      expect(v.rate).toBeGreaterThanOrEqual(0.7);
    }
  });

  it("every line's speaker is in the cast", () => {
    const missing = Object.entries(VOICE_LINES).filter(([, l]) => l.speaker && !SPEAKERS[l.speaker]).map(([id]) => id);
    expect(missing).toEqual([]);
    expect(lineSpeaker("home.welcome")).toBe(NARRATOR);
    expect(lineSpeaker("dlg.welcome.1")).toBe("bobbo");
  });
});

describe("dialogues", () => {
  it("has the three sample dialogues with the requested casts", () => {
    expect(dialogueSpeakers(DIALOGUES.welcome!)).toEqual(["bobbo", "zuzu", "gloop"]);
    expect(dialogueSpeakers(DIALOGUES["pilot-intro"]!)).toContain("ziggy");
    expect(dialogueSpeakers(DIALOGUES["pilot-intro"]!).some((s) => CREW.includes(s))).toBe(true);
    expect(dialogueSpeakers(DIALOGUES["english-intro"]!).sort()).toEqual(["hoot", "sarah"]);
  });

  for (const d of Object.values(DIALOGUES)) {
    it(`${d.id}: 4-8 beats, 2-3 speakers, lines exist and are voiced by the beat's speaker`, () => {
      expect(d.beats.length).toBeGreaterThanOrEqual(4);
      expect(d.beats.length).toBeLessThanOrEqual(8);
      const speakers = dialogueSpeakers(d);
      expect(speakers.length).toBeGreaterThanOrEqual(2);
      expect(speakers.length).toBeLessThanOrEqual(3);
      for (const b of d.beats) {
        const line = VOICE_LINES[b.line];
        expect(line, b.line).toBeDefined();
        expect(line!.speaker, b.line).toBe(b.speaker);
        expect(SPEAKERS[b.speaker], b.speaker).toBeDefined();
        if (b.emote) expect(STATES).toContain(b.emote);
        if (b.pauseAfterMs !== undefined) expect(b.pauseAfterMs).toBeLessThanOrEqual(2000);
      }
    });

    it(`${d.id}: short, kind lines that praise effort, never ability`, () => {
      for (const b of d.beats) {
        const text = VOICE_LINES[b.line]!.text;
        expect(text.length, b.line).toBeLessThanOrEqual(72);
        expect(text, b.line).not.toMatch(/\{/); // no typed names or variables: every line is pre-recorded
        expect(text.toLowerCase(), b.line).not.toMatch(/smart|genius|clever|brilliant|proud of you|wrong|bad|stupid|dumb/);
      }
    });
  }
});
