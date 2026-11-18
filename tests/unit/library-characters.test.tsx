import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { LIBRARY_HOSTS } from "../../src/characters/library";
import { getCharacter, registry } from "../../src/content/registry";
import type { MascotState } from "../../src/engine/types";

const STATES: MascotState[] = ["idle", "greeting", "talking", "thinking", "encouraging", "celebrating", "retry", "sleeping"];
const EXISTING = ["bobbo", "zuzu", "gloop", "hoot", "rumble", "puff"];

afterEach(cleanup);

describe("library host characters", () => {
  it("are nine distinct hosts with unique ids that do not clash with the Critter Crew", () => {
    const ids = LIBRARY_HOSTS.map((h) => h.id);
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(9);
    for (const id of ids) expect(EXISTING).not.toContain(id);
  });

  it("are registered in the content registry under the same id and name", () => {
    for (const h of LIBRARY_HOSTS) {
      const c = getCharacter(h.id);
      expect(c, h.id).toBeDefined();
      expect(c!.name).toBe(h.name);
      expect(c!.blurb?.trim(), `${h.id} blurb`).toBeTruthy();
    }
    expect(registry.characters.filter((c) => LIBRARY_HOSTS.some((h) => h.id === c.id))).toHaveLength(9);
  });

  for (const { id, name, Component } of LIBRARY_HOSTS) {
    it(`${name} renders every state (and talking) with an accessible name`, () => {
      for (const state of STATES) {
        for (const talking of [false, true]) {
          const { unmount } = render(<Component state={state} talking={talking} size={64} />);
          const img = screen.getByRole("img");
          const label = img.getAttribute("aria-label") ?? "";
          expect(label.startsWith(`${name}, `), `${id} ${state} label "${label}"`).toBe(true);
          expect(img.getAttribute("class")).toContain(`state-${state}`);
          expect(img.getAttribute("data-character")).toBe(id);
          unmount();
        }
      }
    });

    it(`${name} keeps the Crew footprint at 48 px and 300 px (viewBox, aspect, no NaN)`, () => {
      for (const size of [48, 300]) {
        const html = renderToStaticMarkup(<Component state="celebrating" size={size} />);
        expect(html).toContain('viewBox="0 0 200 230"');
        expect(html).toContain(`width="${size}"`);
        expect(html).toContain(`height="${size * 1.15}"`);
        expect(html).not.toMatch(/NaN|undefined/);
      }
      expect(renderToStaticMarkup(<Component state="idle" size="100%" />)).toContain('width="100%"');
    });
  }
});
