import { type Browser, type Page, expect, test } from "@playwright/test";
import { ONBOARDED, collectErrors, press, seed, solve, waitForNext } from "./helpers";

/**
 * Parent accounts end to end (desktop): dev magic link, child profiles, sync after login, dashboard,
 * friend invite/accept across two browser contexts, and a challenge link played by the friend's child.
 * Synthetic data only. Requires `npm run db:migrate:local` (0003_accounts) in this checkout.
 */
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "account flows run on desktop"));

const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const roundRec = (gameId: string, firstTry = 6) => {
  const ts = Date.now() - 60_000;
  const d = new Date(ts);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { id: `${ts}-${gameId}`, ts, day, gameId, level: 0, exercises: 8, firstTry, stars: firstTry >= 7 ? 3 : firstTry >= 4 ? 2 : 1, seconds: 180, skills: ["math.count.cardinality"] };
};
const deviceWithProgress = (gameId = "counting-adventure") => ({
  muted: true,
  progress: { v: 1, stickers: ["counting-champ"], roundsCompleted: 1, skills: { "math.count.cardinality": { attempts: 9, firstTry: 6, completed: 8 } }, levels: { [gameId]: 1 } },
  history: [roundRec(gameId)],
});

async function passGate(page: Page) {
  const label = await page.locator('label[for="pa-gate-answer"]').innerText();
  const [a, b] = label.match(/(\d+)\s*×\s*(\d+)/)!.slice(1).map(Number);
  await page.getByTestId("pa-gate-answer").fill(String(a! * b!));
  await page.getByTestId("pa-gate-ok").click();
}

/** Sign up through the UI and follow the dev magic link (logged to the console server-side, shown on screen in dev). */
async function signUp(page: Page, email: string) {
  await page.goto("/parents");
  await passGate(page);
  await page.getByTestId("pa-email").fill(email);
  await page.getByTestId("pa-send-link").click();
  await expect(page.getByRole("alert")).toContainText("tick the box"); // consent is required
  await page.getByTestId("pa-consent").check();
  await page.getByTestId("pa-send-link").click();
  const link = page.getByTestId("dev-magic-link");
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  expect(href).toMatch(/\/api\/auth\/verify\?token=[0-9a-f]{64}$/);
  await link.click();
  // confirmation page: GET never signs in; the button does
  await page.getByTestId("verify-continue").click();
  await expect(page).toHaveURL(/\/parents$/);
  await expect(page.getByTestId("pa-signed-in")).toContainText(email);
  // the link is single-use
  const again = await page.request.get(href);
  expect(again.status()).toBe(410);
}

async function newParent(browser: Browser, state: Record<string, unknown>) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await seed(page, state);
  return { ctx, page };
}

test("parent signs up with a dev magic link, saves this device's progress to a new child profile, and sees the dashboard", async ({ page }, info) => {
  const errors = collectErrors(page);
  const sent: string[] = [];
  page.on("request", (r) => r.method() !== "GET" && sent.push(r.postData() ?? ""));
  await seed(page, deviceWithProgress());
  const email = `parent+${uniq()}@example.com`;
  await signUp(page, email);

  // device link: create a profile from this device (merges guest progress)
  await expect(page.getByTestId("device-link")).toContainText("Ziggy"); // local name, shown from this device only
  await page.getByTestId("create-from-device").click();
  const card = page.getByTestId("child-card");
  await expect(card).toBeVisible();
  const publicName = await card.getByTestId("child-public-name").innerText();
  expect(publicName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z-]+$/);
  expect(publicName).not.toContain("Ziggy");
  await expect(page.getByTestId("device-linked")).toContainText(publicName);
  await expect(card.getByTestId("child-local-name")).toContainText("Ziggy");
  await expect(card.getByTestId("world-counting-adventure")).toContainText("2 of 4");
  await expect(card.getByTestId("stat-rounds")).toHaveText("1");
  await expect(card.getByTestId("stat-minutes")).toHaveText("3");
  await expect(card.getByTestId("stat-streak")).toHaveText("1");
  await expect(card.getByTestId("stat-points")).toHaveText(String(10 * 2 + 2 * 6 + 5));
  await expect(card.getByTestId("skills")).toContainText("Knowing the last number tells how many");
  await expect(card.getByTestId("daily-limit")).toHaveValue("5");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-parents-dashboard.png`, fullPage: true });

  // progress is on the server, and the child's real name never left the device
  const childId = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).account.childId as string);
  const server = await page.evaluate(async (id) => (await (await fetch(`/api/children/${id}/progress`)).json()) as { progress: { roundsCompleted: number; worlds: Record<string, { level: number }>; history: unknown[] } }, childId);
  expect(server.progress.roundsCompleted).toBe(1);
  expect(server.progress.worlds["counting-adventure"]!.level).toBe(1);
  expect(server.progress.history).toHaveLength(1);
  expect(sent.join("\n")).not.toContain(ONBOARDED.kidName);
  expect(sent.join("\n")).not.toContain(ONBOARDED.monsterName); // the typed monster name never leaves the device

  // the parent picks another public name from the word lists
  await card.getByTestId("public-name-adj").selectOption("Brave");
  await card.getByTestId("public-name-creature").selectOption("Zoomkin");
  await card.getByTestId("public-name-save").click();
  await expect(card.getByTestId("child-public-name")).toHaveText("Brave Zoomkin");

  // settings round-trip and apply to this device
  await card.getByTestId("daily-limit").selectOption("7");
  await card.getByTestId("setting-music").uncheck();
  await expect(card.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).account.settings?.dailyLimit)).toBe(7);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).music)).toBe(false);

  // sign out → back to the sign-in form; session gone
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("pa-email")).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
  expect(errors).toEqual([]);
});

test("a second device's progress merges into an existing child profile (best of both)", async ({ page, browser }) => {
  const email = `merge+${uniq()}@example.com`;
  await seed(page, deviceWithProgress("counting-adventure"));
  await signUp(page, email);
  await page.getByTestId("create-from-device").click();
  await expect(page.getByTestId("device-linked")).toBeVisible();
  // second device (fresh context) signs in to the same account and saves its own progress to Ziggy
  const second = await newParent(browser, deviceWithProgress("glow-cave-hops"));
  await second.page.goto("/parents");
  await passGate(second.page);
  await second.page.getByTestId("pa-mode-signin").click();
  await second.page.getByTestId("pa-email").fill(email);
  await second.page.getByTestId("pa-send-link").click();
  await second.page.getByTestId("dev-magic-link").click();
  await second.page.getByTestId("verify-continue").click();
  await second.page.getByTestId("link-child").click();
  const card = second.page.getByTestId("child-card");
  await expect(card.getByTestId("world-glow-cave-hops")).toContainText("2 of 4");
  await expect(card.getByTestId("world-counting-adventure")).toContainText("2 of 4");
  await expect(card.getByTestId("stat-rounds")).toHaveText("2");
  // the merged levels came back to the second device too
  const levels = await second.page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).progress.levels);
  expect(levels).toEqual({ "counting-adventure": 1, "glow-cave-hops": 1 });
  await second.ctx.close();
});

test("friends: invite in one browser, accept in another, both parents approve, leaderboard shows monster names only", async ({ browser }) => {
  const a = await newParent(browser, deviceWithProgress());
  const b = await newParent(browser, { ...deviceWithProgress(), profile: { ...ONBOARDED, monsterName: "Nova" } });
  await signUp(a.page, `fa+${uniq()}@example.com`);
  await a.page.getByTestId("create-from-device").click();
  await signUp(b.page, `fb+${uniq()}@example.com`);
  await b.page.getByTestId("create-from-device").click();
  await expect(b.page.getByTestId("child-card")).toBeVisible();

  const ziggy = a.page.getByTestId("child-card");
  const pubA = await ziggy.getByTestId("child-public-name").innerText();
  const pubB = await b.page.getByTestId("child-card").getByTestId("child-public-name").innerText();
  await ziggy.getByTestId("create-invite").click();
  const link = await ziggy.getByTestId("invite-link").inputValue();
  expect(link).toMatch(/\/parents\/invite\/[2-9A-Z]{5}-[2-9A-Z]{5}$/);

  await b.page.goto(link);
  await expect(b.page.getByTestId("invite-accept")).toContainText(`Friend invite from ${pubA}`);
  await expect(b.page.getByTestId("invite-accept")).not.toContainText("Ziggy");
  await b.page.getByTestId("invite-accept-btn").click();
  await expect(b.page.getByTestId("invite-accepted")).toBeVisible();

  await a.page.reload();
  const friendRow = a.page.getByTestId("child-card").getByTestId("friend-row");
  await expect(friendRow).toHaveAttribute("data-name", pubB);
  await expect(friendRow).toHaveAttribute("data-status", "needs-your-approval");
  await expect(a.page.getByTestId("child-card").getByTestId("leaderboard-row")).toHaveCount(1); // not friends until both approve
  await friendRow.getByTestId("approve-friend").click();
  await expect(friendRow).toHaveAttribute("data-status", "active");
  await expect(a.page.getByTestId("child-card").getByTestId("leaderboard-row")).toHaveCount(2);

  await b.page.goto("/parents");
  const board = b.page.getByTestId("child-card").getByTestId("leaderboard");
  await expect(board.getByTestId("leaderboard-row")).toHaveCount(2);
  await expect(board).toContainText(pubA);
  await expect(board).not.toContainText("Ziggy"); // the other child's typed monster name is never shown
  await expect(board).not.toContainText(ONBOARDED.kidName);
  // invite codes are single-use
  await b.page.goto(link);
  await expect(b.page.getByText("This invite has expired")).toBeVisible();
  await a.ctx.close();
  await b.ctx.close();
});

test("challenge link: the friend's child plays the round and both parents see the result", async ({ browser }) => {
  test.setTimeout(300_000);
  const a = await newParent(browser, deviceWithProgress("counting-adventure"));
  const b = await newParent(browser, { ...deviceWithProgress("glow-cave-hops"), profile: { ...ONBOARDED, monsterName: "Nova" } });
  await signUp(a.page, `ca+${uniq()}@example.com`);
  await a.page.getByTestId("create-from-device").click();
  await signUp(b.page, `cb+${uniq()}@example.com`);
  await b.page.getByTestId("create-from-device").click();
  await expect(b.page.getByTestId("device-linked")).toBeVisible();
  const pubA = await a.page.getByTestId("child-public-name").innerText();
  const pubB = await b.page.getByTestId("child-public-name").innerText();
  // become friends
  await a.page.getByTestId("child-card").getByTestId("create-invite").click();
  const invite = await a.page.getByTestId("child-card").getByTestId("invite-link").inputValue();
  await b.page.goto(invite);
  await b.page.getByTestId("invite-accept-btn").click();
  await expect(b.page.getByTestId("invite-accepted")).toBeVisible();
  await a.page.reload();
  await a.page.getByTestId("child-card").getByTestId("approve-friend").click();
  await expect(a.page.getByTestId("child-card").getByTestId("friend-row")).toHaveAttribute("data-status", "active");

  // Ziggy challenges: best counting round = 10×2 + 2×6 = 32
  const chA = a.page.getByTestId("child-card").getByTestId("challenges");
  await chA.getByTestId("challenge-world").selectOption("counting-adventure");
  await chA.getByTestId("create-challenge").click();
  const challengeLink = await chA.getByTestId("challenge-link").inputValue();
  expect(challengeLink).toMatch(/\/challenge\/[0-9a-f]{32}$/);

  // a family that is not a friend cannot open it
  const stranger = await newParent(browser, deviceWithProgress());
  await stranger.page.goto(challengeLink);
  await expect(stranger.page.getByText("Ask a grown-up")).toBeVisible();
  await stranger.ctx.close();

  // Nova plays it
  await b.page.goto(challengeLink);
  await expect(b.page.getByTestId("challenge-target")).toHaveText("32");
  await press(b.page, '[data-testid="challenge-play"]');
  await expect(b.page).toHaveURL(/\/play\/counting-adventure$/);
  const start = b.page.locator('[data-testid="story-skip"], [data-testid="start-game"]').first();
  await start.waitFor({ state: "visible", timeout: 20_000 });
  await start.click({ force: true });
  for (let i = 0; i < 8; i++) {
    const id = await solve(b.page);
    await waitForNext(b.page, id);
  }
  await expect
    .poll(() => b.page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).challenge?.result?.posted ?? false), { timeout: 30_000 })
    .toBe(true);
  const result = await b.page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).challenge.result as { score: number; beat: boolean });
  expect(result.score).toBe(10 * 3 + 2 * 8); // all first try
  expect(result.beat).toBe(true);

  await b.page.goto(challengeLink);
  await expect(b.page.getByTestId("challenge-result")).toContainText("You beat it!");
  // and the round synced to Nova's profile
  await b.page.goto("/parents");
  await expect(b.page.getByTestId("child-card").getByTestId("challenge-played")).toContainText(`${pubA}'s challenge in Bobbo's Breakfast`);
  await expect(b.page.getByTestId("child-card").getByTestId("stat-rounds")).toHaveText("2");

  await a.page.reload();
  await expect(a.page.getByTestId("child-card").getByTestId("challenge-list")).toContainText(`${pubB} 46 (beat it!)`);
  await a.ctx.close();
  await b.ctx.close();
});
