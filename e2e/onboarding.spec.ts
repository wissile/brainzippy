import { type Page, expect, test } from "@playwright/test";
import { collectErrors, openFromMap, press, seed, beginIfAsked } from "./helpers";

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "tablet", "onboarding runs on desktop, phone and phone-landscape");
});

const step = (page: Page) => page.getByTestId("onboarding");

async function popBubbles(page: Page) {
  // bubbles drift; pop them the keyboard way (focus + Enter), a real input path for children too
  for (let i = 0; i < 8; i++) {
    await page.getByTestId("bubble").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
  }
}

/** The grown-up email step exists only with parent accounts on (development flags); launch.spec.ts covers it off. */
async function skipUnlessAccounts(page: Page) {
  test.skip(!(await (await page.request.get("/api/config")).json()).accounts, "parent accounts are switched off on this server");
}

async function answerGate(page: Page, labelFor: string, input: string, ok: string) {
  const q = await page.locator(`label[for="${labelFor}"]`).innerText();
  const [a, b] = q.match(/(\d+) × (\d+)/)!.slice(1).map(Number);
  await page.getByTestId(input).fill(String(a! * b!));
  await press(page, `[data-testid="${ok}"]`);
}

test("first-time child: story → bubbles → build monster → names → age → parent email → map → game", async ({ page }, info) => {
  await skipUnlessAccounts(page);
  const errors = collectErrors(page);
  const bodies: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") bodies.push(`${r.url()} ${r.postData() ?? ""}`);
  });
  await seed(page, { muted: true }, { fresh: true });
  const shot = (n: string) => page.screenshot({ path: `test-results/screens/${info.project.name}-onb-${n}.png` });

  await page.goto("/");
  await press(page, '[data-testid="site-play"]');
  await beginIfAsked(page);
  await expect(step(page)).toHaveAttribute("data-step", "intro");
  await expect(page.getByTestId("opening")).toBeVisible();
  await page.waitForTimeout(1300);
  await shot("1-story");
  await press(page, '[data-testid="opening-skip"]');

  await expect(step(page)).toHaveAttribute("data-step", "pop");
  await popBubbles(page);
  await expect(step(page)).toHaveAttribute("data-step", "build", { timeout: 15_000 });

  // build: every category changes the live monster
  const before = await page.getByTestId("monster").first().innerHTML();
  await press(page, '[data-testid="opt-body-jelly"]');
  await press(page, '[data-testid="cat-color"]');
  await press(page, '[data-testid="opt-color-pink"]');
  await press(page, '[data-testid="cat-eyes"]');
  await press(page, '[data-testid="opt-eyes-one"]');
  await press(page, '[data-testid="cat-mouth"]');
  await press(page, '[data-testid="opt-mouth-tongue"]');
  await press(page, '[data-testid="cat-arms"]');
  await press(page, '[data-testid="opt-arms-noodle"]');
  await press(page, '[data-testid="cat-top"]');
  await press(page, '[data-testid="opt-top-ears"]');
  await expect(page.locator('[data-testid="opt-top-ears"]')).toHaveAttribute("aria-pressed", "true");
  expect(await page.getByTestId("monster").first().innerHTML()).not.toBe(before);
  await shot("2-builder");
  await press(page, '[data-testid="build-done"]');

  await expect(step(page)).toHaveAttribute("data-step", "name");
  await press(page, '[data-testid="name-done"]'); // disabled until a name is chosen
  await expect(step(page)).toHaveAttribute("data-step", "name");
  await press(page, '[data-testid="name-Nova"]');
  await expect(page.getByTestId("nameplate")).toHaveText("Nova");
  await press(page, '[data-testid="name-done"]');

  await expect(step(page)).toHaveAttribute("data-step", "kid");
  await page.getByTestId("kid-name-input").fill("Sam<script>");
  await expect(page.getByTestId("kid-name-input")).toHaveValue("Samscript");
  await page.getByTestId("kid-name-input").fill("Sam");
  await press(page, '[data-testid="kid-done"]');

  await expect(step(page)).toHaveAttribute("data-step", "age");
  await press(page, '[data-testid="age-ages-3-5"]');

  await expect(step(page)).toHaveAttribute("data-step", "grownup");
  await answerGate(page, "onb-gate", "onb-gate-answer", "onb-gate-ok");
  const parentEmail = `parent+${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.getByTestId("parent-email").fill(parentEmail);
  await press(page, '[data-testid="parent-submit"]');
  await expect(page.getByRole("alert")).toContainText("tick the box"); // consent required
  await press(page, '[data-testid="parent-consent"]');
  await shot("3-parent");
  await press(page, '[data-testid="parent-submit"]');
  const link = page.getByTestId("dev-verify-link");
  await expect(link).toBeVisible();

  // verification link: GET shows the address and changes nothing; the button confirms, exactly once
  const href = (await link.getAttribute("href"))!;
  const v = await page.context().newPage();
  await v.goto(href);
  await expect(v.getByTestId("signup-email")).toHaveText(parentEmail);
  await v.getByTestId("signup-confirm").click();
  await expect(v.locator("h1")).toHaveText("Thank you!");
  await v.goto(href);
  await expect(v.locator("h1")).not.toHaveText("Thank you!");
  await v.close();

  await press(page, '[data-testid="grownup-done"]');
  await expect(page.getByTestId("map")).toBeVisible();
  // the greeting text is visually hidden on small phones (the monster says it), so check content, not visibility
  await expect(page.getByTestId("map")).toContainText("Sam");
  await expect(page.getByTestId("map")).toContainText("Nova");
  // today's trail is planned from every world for the child's age (src/daily/planner.ts), so don't assume which
  await expect(page.locator(".trail-stop").first()).toBeVisible();
  await shot("4-map");

  // the next glowing stop opens its world's story
  await press(page, '.trail-stop[data-state="next"] [data-testid^="stop-"]');
  await expect(page).toHaveURL(/\/play\/[a-z-]+$/);
  await expect(page.getByTestId("story")).toBeVisible();

  // privacy: the child's name and monster never leave the device; only the parent's email was sent
  const sent = bodies.join("\n");
  expect(sent).not.toContain("Sam");
  expect(sent).not.toContain("Nova");
  expect(sent).toContain(parentEmail);
  expect(errors).toEqual([]);
});

test("grown-up step can be skipped, and onboarding resumes after refresh", async ({ page }) => {
  await skipUnlessAccounts(page);
  await seed(page, { muted: true }, { fresh: true });
  await page.goto("/");
  await press(page, '[data-testid="site-play"]');
  await beginIfAsked(page);
  await press(page, '[data-testid="opening-skip"]');
  await popBubbles(page);
  await expect(step(page)).toHaveAttribute("data-step", "build", { timeout: 15_000 });
  await press(page, '[data-testid="build-random"]');
  await page.reload();
  await beginIfAsked(page); // audio unlock after a reload, when the browser asks for one
  await expect(step(page)).toHaveAttribute("data-step", "build");
  await press(page, '[data-testid="build-done"]');
  await page.getByTestId("monster-name-input").fill("Bob1!");
  await expect(page.getByTestId("monster-name-input")).toHaveValue("Bob");
  await press(page, '[data-testid="name-done"]');
  await press(page, '[data-testid="kid-skip"]');
  await press(page, '[data-testid="age-ages-6-8"]');
  await press(page, '[data-testid="grownup-skip"]');
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.getByTestId("map")).toBeVisible(); // no kid name given
  // returning child goes straight to the map
  await page.goto("/");
  await press(page, '[data-testid="site-play"]');
  await expect(page.getByTestId("map")).toBeVisible();
});

test("voice clips: the game plays recorded audio files, not only speech synthesis", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const clips: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/audio/voice/") && r.url().endsWith(".mp3") && r.ok()) clips.push(r.url().split("/").pop()!);
  });
  await seed(page, { muted: false });
  await page.goto("/");
  await press(page, '[data-testid="site-play"]');
  await expect(page.getByTestId("map")).toBeVisible();
  // (arriving by full page load: the map's greeting waits for the first tap — covered by the daily-learning specs)
  await openFromMap(page);
  await expect.poll(() => clips.includes("ca.story.1.mp3"), { timeout: 10_000 }).toBe(true);
  await press(page, '[data-testid="story-skip"]');
  await expect.poll(() => clips.includes("prompt.tap-count__kind-apple.mp3"), { timeout: 10_000 }).toBe(true);
  expect(clips).toContain("number.3.mp3");
});
