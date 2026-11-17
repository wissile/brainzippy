import { describe, expect, it } from "vitest";
import { emptyProgress, parseGuestProgress } from "../../src/engine/progressSchema";

describe("guest progress schema", () => {
  const valid = { v: 1, stickers: ["counting-champ"], roundsCompleted: 2, skills: { "math.count.subitize": { attempts: 4, firstTry: 3, completed: 3 } } };
  it("accepts valid progress", () => {
    expect(parseGuestProgress(valid)).toEqual(valid);
    expect(parseGuestProgress(emptyProgress())).toEqual(emptyProgress());
  });
  it("rejects unknown keys (no smuggling personal data)", () => {
    expect(parseGuestProgress({ ...valid, name: "Ada" })).toBeNull();
    expect(parseGuestProgress({ ...valid, skills: { s: { attempts: 1, firstTry: 1, completed: 1, email: "x" } } })).toBeNull();
  });
  it("rejects bad types and sizes", () => {
    expect(parseGuestProgress(null)).toBeNull();
    expect(parseGuestProgress({ ...valid, v: 2 })).toBeNull();
    expect(parseGuestProgress({ ...valid, roundsCompleted: -1 })).toBeNull();
    expect(parseGuestProgress({ ...valid, stickers: ["<script>"] })).toBeNull();
    expect(parseGuestProgress({ ...valid, stickers: Array.from({ length: 201 }, (_, i) => `s${i}`) })).toBeNull();
  });
});

import { parseRoundSnapshot } from "../../src/services/storage";
describe("round snapshot validation", () => {
  const good = { v: 1, gameId: "counting-adventure", currentId: "ca-tap-3-apple", savedAt: 1, progression: { difficulty: 1, streak: 0, played: ["ca-tap-3-apple"], results: [] } };
  it("accepts a valid snapshot", () => expect(parseRoundSnapshot(good)).not.toBeNull());
  it("drops old-shape or corrupted snapshots instead of crashing", () => {
    expect(parseRoundSnapshot({ ...good, v: undefined })).toBeNull();
    expect(parseRoundSnapshot({ ...good, progression: { difficulty: 1 } })).toBeNull();
    expect(parseRoundSnapshot({ ...good, progression: { ...good.progression, results: [{ exerciseId: 1 }] } })).toBeNull();
    expect(parseRoundSnapshot("garbage")).toBeNull();
  });
});
