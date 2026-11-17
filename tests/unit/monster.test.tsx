import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ARMS, BODIES, COLORS, EYES, MOUTHS, Monster, TOPS, isMonsterConfig, randomMonster } from "../../src/characters/Monster";
import { parseProfile } from "../../src/services/storage";

describe("monster builder model", () => {
  it("random monsters are always valid", () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) expect(isMonsterConfig(randomMonster(rand))).toBe(true);
  });
  it("every part renders for every body without crashing", () => {
    for (const body of BODIES)
      for (const [eyes, mouth, arms, top, color] of EYES.map((e, i) => [e, MOUTHS[i % MOUTHS.length], ARMS[i % ARMS.length], TOPS[i % TOPS.length], COLORS[i]] as const)) {
        const html = renderToStaticMarkup(<Monster config={{ body, eyes, mouth, arms, top, color: color! }} />);
        expect(html).toContain("<svg");
        expect(html).not.toContain("NaN");
      }
  });
  it("rejects tampered configs", () => {
    expect(isMonsterConfig({ body: "egg", color: "teal", eyes: "two", mouth: "smile", arms: "tiny", top: "<img>" })).toBe(false);
  });
});

describe("device-only profile", () => {
  it("sanitises names and falls back safely", () => {
    const p = parseProfile({ kidName: "Sam<b>1", monsterName: "Zig-gy O'Neil!", step: "nope", monster: { body: "x" } });
    expect(p.kidName).toBe("Samb");
    expect(p.monsterName).toBe("Zig-gy O'Neil");
    expect(p.step).toBe("intro");
    expect(p.monster).toBeNull();
  });
});
