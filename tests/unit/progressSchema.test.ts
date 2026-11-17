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
