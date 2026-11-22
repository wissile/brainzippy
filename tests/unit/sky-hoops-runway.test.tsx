import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Runway } from "../../src/games/sky-hoops/art";

describe("sky-hoops runway art", () => {
  it("every ground, runway and marking shape projects for both runway cameras (none silently dropped)", () => {
    for (const cam of ["runway", "ground"] as const) {
      const html = renderToStaticMarkup(<svg><Runway cam={cam} /></svg>);
      expect(html, cam).not.toContain('d=""');
      expect(html, cam).toContain('data-testid="sh-centreline"');
    }
  });
});
