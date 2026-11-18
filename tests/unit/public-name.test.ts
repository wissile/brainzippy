import { describe, expect, it } from "vitest";
import { PUBLIC_ADJECTIVES, PUBLIC_CREATURES, defaultPublicName, parsePublicName, publicNameFor, splitPublicName } from "../../src/account/publicName";

/** Substrings that must never appear in any public name, even across the adjective/creature boundary. */
const BLOCKED = [
  "ass", "arse", "butt", "bum", "poo", "pee", "wee", "piss", "fart", "turd", "crap", "shit", "fuk", "fuck", "fck", "dick", "cock", "tit", "boob",
  "cum", "sex", "nud", "porn", "fag", "nig", "nazi", "rape", "kill", "dead", "die", "murder", "gun", "blood", "hate", "dumb", "stupid", "idiot",
  "ugly", "fat", "loser", "weird", "freak", "smelly", "stink", "hell", "damn", "god", "slut", "whore", "hoe", "pimp", "drug", "beer", "wine",
  "tinkle", "puke", "vomit", "snot", "bully", "nerd", "geek", "fool", "moron", "twat", "wank", "knob", "nob", "prick", "spaz", "retard",
];
/** Two-letter initials that read as something hateful, rude or toilet-related. */
const BLOCKED_INITIALS = ["SS", "KK", "BS", "FU", "WC"];
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

describe("public names", () => {
  it("pick lists: about 40 × 40, unique, short, letters (and hyphens) only", () => {
    expect(PUBLIC_ADJECTIVES.length).toBe(40);
    expect(PUBLIC_CREATURES.length).toBe(40);
    expect(new Set(PUBLIC_ADJECTIVES).size).toBe(40);
    expect(new Set(PUBLIC_CREATURES).size).toBe(40);
    for (const w of [...PUBLIC_ADJECTIVES, ...PUBLIC_CREATURES]) expect(w).toMatch(/^[A-Z][a-z]+(-[a-z]+)*$/);
    for (const a of PUBLIC_ADJECTIVES) for (const c of PUBLIC_CREATURES) expect(`${a} ${c}`.length).toBeLessThanOrEqual(30);
  });

  it("no combination contains a blocked word (across the boundary too) or rude initials", () => {
    const bad: string[] = [];
    for (const a of PUBLIC_ADJECTIVES)
      for (const c of PUBLIC_CREATURES) {
        const joined = letters(a + c);
        for (const w of BLOCKED) if (joined.includes(w)) bad.push(`${a} ${c} (${w})`);
        if (BLOCKED_INITIALS.includes(`${a[0]}${c[0]}`)) bad.push(`${a} ${c} (initials)`);
      }
    expect(bad).toEqual([]);
  });

  it("default name is deterministic per child id and from the lists", () => {
    const id = "6f1c2a9e-3b4d-4e5f-8a7b-1c2d3e4f5a6b";
    expect(defaultPublicName(id)).toBe(defaultPublicName(id));
    expect(parsePublicName(defaultPublicName(id))).toBe(defaultPublicName(id));
    // snapshot one value so a list reorder (which would rename every child) is caught
    expect(defaultPublicName(id)).toMatchInlineSnapshot(`"Sunny Bobblefin"`);
    const names = new Set(Array.from({ length: 500 }, (_, i) => defaultPublicName(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`)));
    expect(names.size).toBeGreaterThan(400); // spread over the 1600 combinations
  });

  it("parse accepts only exact list combinations; publicNameFor falls back to the default", () => {
    expect(parsePublicName("Sparkly Gloop-a-saur")).toBe("Sparkly Gloop-a-saur");
    expect(splitPublicName("Sparkly Gloop-a-saur")).toEqual({ adjective: "Sparkly", creature: "Gloop-a-saur" });
    for (const x of ["sparkly Gloop-a-saur", "Sparkly  Gloop-a-saur", "Ziggy", "Sparkly Ziggy", "Sam Gloop-a-saur", "", null, 42, "Sparkly Gloop-a-saur "]) expect(parsePublicName(x)).toBeNull();
    expect(publicNameFor("abc", "Brave Zoomkin")).toBe("Brave Zoomkin");
    expect(publicNameFor("abc", "Ziggy")).toBe(defaultPublicName("abc"));
    expect(publicNameFor("abc", null)).toBe(defaultPublicName("abc"));
  });
});
