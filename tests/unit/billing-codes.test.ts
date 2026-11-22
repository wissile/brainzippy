// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hashAccessCode, normaliseAccessCode } from "../../src/billing/codes";
// @ts-expect-error plain .mjs owner script without type declarations
import * as cli from "../../scripts/access-code.mjs";
import { createD1 } from "./helpers/d1";
import { PRICE } from "../../src/billing/model";
import { importSite } from "./helpers/site";

describe("access code normalisation + hashing", () => {
  it("normalises case, spaces and dashes; rejects too short/long or non-strings", () => {
    expect(normaliseAccessCode(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
    expect(normaliseAccessCode("abc")).toBeNull();
    expect(normaliseAccessCode("A".repeat(25))).toBeNull();
    expect(normaliseAccessCode(42)).toBeNull();
    expect(cli.normaliseAccessCode(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
  });

  it("the Worker and the owner CLI produce the same hash, and it isn't the code", async () => {
    const h = await hashAccessCode("ABCDEFGHJKMN");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(cli.hashAccessCode("ABCDEFGHJKMN")).toBe(h);
    expect(h).not.toContain("ABCD");
  });

  it("generated codes are 12 unambiguous characters", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const c = cli.generateCode() as string;
      expect(c).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
      seen.add(c);
    }
    expect(seen.size).toBe(200);
  });
});

describe("owner CLI (scripts/access-code.mjs)", () => {
  it("builds a valid INSERT that the migration accepts, storing only the hash", () => {
    const c = cli.buildCreate({ kind: "free_days", days: "30", max: "5", expires: "2099-01-31", note: "O'Brien school" }, 1000);
    const { raw } = createD1();
    raw.exec(c.sql);
    const row = raw.prepare("SELECT * FROM access_codes").get() as Record<string, unknown>;
    expect(row).toMatchObject({ kind: "free_days", days: 30, max_redemptions: 5, redemptions: 0, note: "O'Brien school", expires_at: Date.parse("2099-01-31T23:59:59Z") });
    expect(row.code_hash).toBe(cli.hashAccessCode(cli.normaliseAccessCode(c.code)));
    expect(JSON.stringify(row)).not.toContain(c.code.replace(/-/g, ""));
  });

  it("validates options", () => {
    expect(() => cli.buildCreate({ kind: "lifetime" })).toThrow(/--kind/);
    expect(() => cli.buildCreate({ kind: "free_days" })).toThrow(/--days/);
    expect(() => cli.buildCreate({ kind: "free_forever", days: "3" })).toThrow(/--days/);
    expect(() => cli.buildCreate({ kind: "free_forever", max: "0" })).toThrow(/--max/);
    expect(() => cli.buildCreate({ kind: "free_forever", expires: "2001-01-01" })).toThrow(/future/);
    // custom (human-chosen) codes are refused: every code is generated with ≈59 bits
    expect(() => cli.buildCreate({ kind: "free_forever", code: "ab" })).toThrow(/--code/);
    expect(() => cli.buildCreate({ kind: "free_forever", code: "TEACHERS2027-LONG-ENOUGH" })).toThrow(/--code/);
    const g = cli.buildCreate({ kind: "free_forever" }).code;
    expect(g).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(12 * Math.log2(31)).toBeGreaterThanOrEqual(59);
  });

  it("targets exactly one database with the right wrangler flags", () => {
    expect(cli.wranglerArgs({ local: true }, "SELECT 1")).toEqual(["wrangler", "d1", "execute", "brainzippy-db", "--local", "--command", "SELECT 1", "--json"]);
    expect(cli.wranglerArgs({ staging: true }, "UPDATE x")).toEqual(["wrangler", "d1", "execute", "brainzippy-db-staging", "--remote", "--env", "staging", "--command", "UPDATE x"]);
    expect(cli.wranglerArgs({ prod: true }, "UPDATE x").slice(3, 5)).toEqual(["brainzippy-db", "--remote"]);
    expect(() => cli.wranglerArgs({}, "x")).toThrow(/exactly one/);
    expect(() => cli.wranglerArgs({ local: true, prod: true }, "x")).toThrow(/exactly one/);
  });
});

describe("published price stays consistent", () => {
  it("site entity, llms.txt and the billing model agree (build with billing on)", async () => {
    const { SITE, renderLlms, buildRoutes } = await importSite({ billing: true });
    expect(SITE.pricing?.amount).toBe((PRICE.cents / 100).toFixed(2));
    expect(SITE.pricing?.trialDays).toBe(14);
    const llms = renderLlms(buildRoutes()); // generated at build time (no static public/llms.txt)
    expect(llms).toContain(PRICE.display);
    expect(llms).toContain("https://brainzippy.com/pricing");
  });
});
