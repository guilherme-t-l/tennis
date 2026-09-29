import { expect, test } from "@playwright/test";
import { dateInputValue, formatLongWhen, timeInputValue } from "../../src/lib/format";
import { atSaoPaulo, nextSaturday10, nextSundayAt } from "../../src/lib/dates";
import { SEED_TOKENS } from "../../src/lib/seed-ids";
import { asUser, loginAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

let saturdayUrl = "";
let sundayUrl = "";

test("2. Add connection", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network");
  await page.getByLabel("Search players").fill("André");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByText("Requested")).toBeVisible();

  const andre = await asUser(browser, "andre");
  await andre.page.goto("/inbox");
  await andre.page.getByRole("button", { name: "Guilherme wants to connect" }).click();
  await andre.page.getByRole("button", { name: "Accept" }).click();
  await expect(andre.page.getByRole("region", { name: "People you know" })).toContainText("Guilherme");
  await andre.context.close();

  await loginAs(page, "guilherme");
  await page.goto("/network");
  await expect(page.getByRole("region", { name: "People you know" })).toContainText("André");
  await page.goto("/inbox");
  await expect(page.getByRole("button", { name: "André accepted your connection" })).toBeVisible();
});

test("3. Create match list", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network/lists");
  await page.getByLabel("New list").fill("Belvedere crew");
  await page.getByRole("button", { name: "Create list" }).click();
  await page.waitForURL(/\/network\/lists\/.+/);
  await page.getByLabel("Add a player").selectOption({ label: "Lucas" });
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByLabel("Add a player").selectOption({ label: "Pedro" });
  await page.getByRole("button", { name: "Add" }).click();
  const members = page.getByRole("region", { name: "Members" });
  await expect(members).toContainText("Lucas");
  await expect(members).toContainText("Pedro");
  await expect(members).not.toContainText("André");
  await page.goto("/network/lists");
  await expect(page.getByRole("link", { name: "Belvedere crew (2)" })).toBeVisible();
});

test("4. Create opportunity and invite a list", async ({ page }) => {
  await loginAs(page, "guilherme");
  await page.goto("/fix");
  const when = nextSaturday10();
  await page.getByLabel("Date").fill(dateInputValue(when));
  await page.getByLabel("Time").fill(timeInputValue(when));
  await page.getByLabel("Duration").selectOption("90");
  await page.getByLabel("Where").selectOption({ label: "Belvedere" });
  await page.getByLabel("Format").selectOption({ label: "Singles" });
  await page.getByRole("checkbox", { name: "Saturday players" }).check();
  await page.getByRole("button", { name: "Send invitation" }).click();
  await page.waitForURL(/\/opportunities\//);
  saturdayUrl = page.url();
  await expect(page.getByText("Saturday · 10:00 · Belvedere · Singles")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Looking for an opponent" })).toBeVisible();
  for (const name of ["João", "Pedro", "Lucas"]) {
    await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText("Awaiting");
  }
});

test("5. Invitee sees it in inbox", async ({ page }) => {
  await loginAs(page, "joao");
  await expect(page.getByLabel(/unread/)).toBeVisible();
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Guilherme invited you to play Saturday 10:00 at Belvedere" }).click();
  await expect(page).toHaveURL(/\/opportunities\//);
  await expect(page.getByRole("button", { name: "I'm in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Maybe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Can't play" })).toBeVisible();
});

test("6. wa.me link with correct prefilled text", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto(saturdayUrl);
  const href = await page
    .getByRole("listitem")
    .filter({ hasText: "João" })
    .getByRole("link", { name: "Share on WhatsApp" })
    .getAttribute("href");
  expect(href?.startsWith("https://wa.me/?text=")).toBe(true);
  const text = decodeURIComponent(href!.slice("https://wa.me/?text=".length));
  expect(text).toContain("João");
  expect(text).toContain("Singles");
  expect(text).toContain("Belvedere");
  expect(text).toContain(formatLongWhen(nextSaturday10()));
  expect(text).toContain("http://localhost:3000/i/");
  const token = text.split("/i/")[1]?.trim();
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`/i/${token}`);
  await expect(anonPage.getByText("Saturday · 10:00 · Belvedere · Singles")).toBeVisible();
  await expect(anonPage.getByRole("link", { name: "Sign in to respond" })).toBeVisible();
  await anon.close();
});

test("7. First I'm in confirms; host sees Match fixed", async ({ page, browser }) => {
  const joao = await asUser(browser, "joao");
  await joao.page.goto(saturdayUrl);
  await joao.page.getByRole("button", { name: "I'm in" }).click();
  await expect(joao.page.getByText("Match fixed: Guilherme × João")).toBeVisible();
  await expect(joao.page.getByRole("link", { name: "Open match" })).toHaveAttribute("href", /\/matches\//);
  await joao.context.close();

  await loginAs(page, "guilherme");
  await page.goto(saturdayUrl);
  await expect(page.getByText("Match fixed: Guilherme × João")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "João" })).toContainText("In");
  await page.goto("/inbox");
  await expect(page.getByRole("button", { name: "Match confirmed" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Upcoming matches" })).toContainText("João");
});

test("8. Other invitees see it closed", async ({ page }) => {
  await loginAs(page, "pedro");
  await page.goto(saturdayUrl);
  await expect(page.getByRole("button", { name: "I'm in" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Closed — Guilherme fixed this match with someone else" })).toBeVisible();
  await expect(page.getByText("This match has already been fixed")).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByRole("button", { name: "Opportunity closed" })).toBeVisible();
});

test("9. Maybe / Can't play do not confirm", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto("/fix");
  const when = nextSundayAt(16);
  await page.getByLabel("Date").fill(dateInputValue(when));
  await page.getByLabel("Time").fill(timeInputValue(when));
  await page.getByLabel("Where").selectOption({ label: "Pampulha" });
  await page.getByLabel("Format").selectOption({ label: "Singles" });
  await page.getByRole("checkbox", { name: "Pedro" }).check();
  await page.getByRole("checkbox", { name: "Lucas" }).check();
  await page.getByRole("button", { name: "Send invitation" }).click();
  await page.waitForURL(/\/opportunities\//);
  sundayUrl = page.url();

  const pedro = await asUser(browser, "pedro");
  await pedro.page.goto(sundayUrl);
  await pedro.page.getByRole("button", { name: "Maybe" }).click();
  await expect(pedro.page.getByText("You said Maybe")).toBeVisible();
  await pedro.context.close();
  const lucas = await asUser(browser, "lucas");
  await lucas.page.goto(sundayUrl);
  await lucas.page.getByRole("button", { name: "Can't play" }).click();
  await expect(lucas.page.getByText("You said Can't play")).toBeVisible();
  await lucas.context.close();

  await page.goto(sundayUrl);
  await expect(page.getByRole("listitem").filter({ hasText: "Pedro" })).toContainText("Maybe");
  await expect(page.getByRole("listitem").filter({ hasText: "Lucas" })).toContainText("Can't play");
  await expect(page.getByRole("heading", { name: "Looking for an opponent" })).toBeVisible();

  const pedroAgain = await asUser(browser, "pedro");
  await pedroAgain.page.goto(sundayUrl);
  await pedroAgain.page.getByRole("button", { name: "I'm in" }).click();
  await expect(pedroAgain.page.getByText("Match fixed: Guilherme × Pedro")).toBeVisible();
  await pedroAgain.context.close();
});

test("10. Tokenized link → sign in → respond", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/i/${SEED_TOKENS.pedroGuilherme}`);
  await expect(page.getByRole("link", { name: "Sign in to respond" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in to respond" }).click();
  await page.getByLabel("Email").fill("guilherme@test.local");
  await page.getByLabel("Password").fill("Password123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/i\//);
  await page.getByRole("button", { name: "I'm in" }).click();
  await expect(page.getByText("Match fixed: Pedro × Guilherme")).toBeVisible();
  await context.close();

  const joao = await asUser(browser, "joao");
  await joao.page.goto(`/i/${SEED_TOKENS.pedroJoao}`);
  await expect(joao.page.getByText("Closed — Pedro fixed this match with someone else")).toBeVisible();
  await joao.context.close();

  const andre = await asUser(browser, "andre");
  await andre.page.goto(`/i/${SEED_TOKENS.pedroGuilherme}`);
  await expect(andre.page.getByText("This invite was sent to Guilherme")).toBeVisible();
  await andre.context.close();
});

test("11. Host cancels an open opportunity", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto("/fix");
  const when = atSaoPaulo(12, 11, 0);
  await page.getByLabel("Date").fill(dateInputValue(when));
  await page.getByLabel("Time").fill(timeInputValue(when));
  await page.getByLabel("Where").selectOption({ label: "Minas Tênis Clube" });
  await page.getByLabel("Format").selectOption({ label: "Singles" });
  await page.getByRole("checkbox", { name: "Lucas" }).check();
  await page.getByRole("button", { name: "Send invitation" }).click();
  await page.waitForURL(/\/opportunities\//);
  const url = page.url();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Cancelled" })).toBeVisible();

  const lucas = await asUser(browser, "lucas");
  await lucas.page.goto(url);
  await expect(lucas.page.getByText("Closed — Guilherme cancelled this match")).toBeVisible();
  await expect(lucas.page.getByRole("button", { name: "I'm in" })).toHaveCount(0);
  await lucas.page.goto("/inbox");
  await expect(lucas.page.getByRole("button", { name: "Guilherme cancelled the match" })).toBeVisible();
  await lucas.context.close();
});
