import { expect, test } from "@playwright/test";
import { nextSaturday10 } from "../../src/lib/dates";
import { availabilitySuggestionText, availabilityWindowLabel, dateInputValue, timeInputValue } from "../../src/lib/format";
import { asUser, loginAs } from "./helpers/auth";

test.describe.configure({ mode: "serial" });

const start = nextSaturday10();
const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

test("15. Publish availability → mutual-availability suggestion", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto("/available/new");
  await page.getByLabel("Date").fill(dateInputValue(start));
  await page.getByLabel("Start").fill(timeInputValue(start));
  await page.getByLabel("End").fill("12:00");
  await page.getByLabel("Where").selectOption({ label: "Belvedere" });
  await page.getByLabel("Format").selectOption({ label: "Singles" });
  await page.getByRole("button", { name: "Make available" }).click();
  await page.waitForURL("**/available");
  const sentence = availabilitySuggestionText("João", "Belvedere", start);
  const card = page.getByRole("article").filter({ hasText: sentence });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Fix a match" }).click();
  await expect(page).toHaveURL(/\/fix\?/);
  await expect(page.getByLabel("Date")).toHaveValue(dateInputValue(start));
  await expect(page.getByLabel("Time")).toHaveValue("10:00");
  await expect(page.getByLabel("Where")).toHaveValue("belvedere");
  await expect(page.getByLabel("Format")).toHaveValue("singles");
  await expect(page.getByRole("checkbox", { name: "João" })).toBeChecked();

  await page.goto("/inbox");
  await expect(page.locator('[data-type="availability_match"]')).toHaveCount(1);
  const joao = await asUser(browser, "joao");
  await joao.page.goto("/inbox");
  await expect(joao.page.locator('[data-type="availability_match"]')).toHaveCount(1);
  await joao.context.close();
});

test("16. Availability visible only to connections", async ({ page, browser }) => {
  await loginAs(page, "guilherme");
  await page.goto("/network");
  const href = await page.getByRole("link", { name: "João" }).first().getAttribute("href");
  expect(href).toContain("/players/");
  const sentence = availabilityWindowLabel(start, end, "Belvedere");

  const andre = await asUser(browser, "andre");
  await andre.page.goto(href!);
  await expect(andre.page.getByText(sentence)).toHaveCount(0);
  await andre.context.close();

  await page.goto(href!);
  await expect(page.getByText(sentence)).toBeVisible();
});
